import os
import io
import uuid
import time
import logging
import shutil
import psutil
import datetime
import re
import socket
import ipaddress
import ssl
import hashlib
import subprocess
import zipfile
import tempfile
from urllib.parse import urlparse, urljoin
from functools import lru_cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.files.base import ContentFile
from django.conf import settings
import asyncio
from asgiref.sync import async_to_sync
import edge_tts
from deep_translator import GoogleTranslator
from PIL import Image, ImageFilter, ImageEnhance, ImageOps
import qrcode
import json
import requests
import yt_dlp
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from django.http import HttpResponse, FileResponse, StreamingHttpResponse
from django.shortcuts import get_object_or_404, render
from django.views import View
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Max, Q
from django.contrib.auth import get_user_model
User = get_user_model()
from .models import Service, DownloadableResource, UserActivity, FavoriteTool, DownloadHistory, ToolUsage
from .models import WebhookEndpoint, WebhookRequest
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .serializers import ServiceSerializer, DownloadableResourceSerializer, UserActivitySerializer, FavoriteToolSerializer, DownloadHistorySerializer
from apps.videos.models import VideoDownload
from apps.videos.tasks import download_video_async
from apps.blog.models import Post
from .log_analyzer import get_log_analysis
from .utils import generate_qr_image

# Set up loggers
logger = logging.getLogger('apps.services')
download_logger = logging.getLogger('apps.services.downloads')


def get_client_ip(request):
    """Extract client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR', '')
    return ip


def _safe_tool_name(tool_name: str, request=None) -> str:
    if tool_name:
        return str(tool_name)[:120]
    if request is None:
        return 'unknown'
    return (getattr(request, 'resolver_match', None) and request.resolver_match.url_name) or request.path[:120] or 'unknown'


def log_tool_usage(
    *,
    request,
    tool_name: str,
    status_label: str = 'success',
    http_status: int | None = None,
    started_at: float | None = None,
    error: Exception | None = None,
    extra: dict | None = None,
):
    """Persist tool usage for admin/auditing.

    Works for both authenticated and anonymous users.
    """

    try:
        exec_ms = None
        if started_at is not None:
            exec_ms = int((time.time() - started_at) * 1000)

        forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR', '')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        request_id = request.META.get('HTTP_X_REQUEST_ID')
        parsed_request_id = None
        if request_id:
            try:
                parsed_request_id = uuid.UUID(str(request_id))
            except Exception:
                parsed_request_id = None

        ToolUsage.objects.create(
            user=request.user if getattr(request, 'user', None) and request.user.is_authenticated else None,
            tool_name=_safe_tool_name(tool_name, request),
            endpoint=request.path[:255] if getattr(request, 'path', None) else '',
            method=getattr(request, 'method', '') or '',
            ip_address=get_client_ip(request) if request is not None else None,
            forwarded_for=forwarded_for,
            user_agent=user_agent,
            status=status_label,
            http_status=http_status,
            error_message=(str(error)[:2000] if error else ''),
            execution_time_ms=exec_ms,
            request_id=parsed_request_id,
            extra=extra or {},
        )
    except Exception:
        # Never break the endpoint if logging fails.
        logger.exception('ToolUsage logging failed')


def log_activity(user, action, details=None, request=None):
    """Enhanced activity logging with request metadata.

    Also mirrors the event into ToolUsage for auditing.
    """
    if user.is_authenticated:
        activity_data = {
            'user': user,
            'action': action,
            'details': details,
        }

        if request:
            activity_data['ip_address'] = get_client_ip(request)
            activity_data['user_agent'] = request.META.get('HTTP_USER_AGENT', '')

        UserActivity.objects.create(**activity_data)

    if request is not None:
        log_tool_usage(
            request=request,
            tool_name=action,
            status_label='success',
            http_status=None,
            started_at=None,
            error=None,
            extra={'details': details or ''},
        )



class TextToSpeechView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        started_at = time.time()
        text = request.data.get('text')
        lang = request.data.get('lang', 'en')
        gender = request.data.get('gender', 'Female') # Male or Female
        
        if not text:
            log_tool_usage(
                request=request,
                tool_name='tts',
                status_label='failed',
                http_status=status.HTTP_400_BAD_REQUEST,
                started_at=started_at,
                error=ValueError('Text is required'),
            )
            return Response({'error': 'Text is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Mapping of (lang, gender) -> Voice
        # Default fallback to English US if not found
        voice_map = {
            ('en', 'Male'): 'en-US-GuyNeural',
            ('en', 'Female'): 'en-US-JennyNeural',
            ('es', 'Male'): 'es-ES-AlvaroNeural',
            ('es', 'Female'): 'es-ES-ElviraNeural',
            ('fr', 'Male'): 'fr-FR-HenriNeural',
            ('fr', 'Female'): 'fr-FR-DeniseNeural',
            ('de', 'Male'): 'de-DE-KillianNeural',
            ('de', 'Female'): 'de-DE-KatjaNeural',
            ('hi', 'Male'): 'hi-IN-MadhurNeural',
            ('hi', 'Female'): 'hi-IN-SwaraNeural',
            ('ja', 'Male'): 'ja-JP-KeitaNeural',
            ('ja', 'Female'): 'ja-JP-NanamiNeural',
            ('ko', 'Male'): 'ko-KR-InJoonNeural',
            ('ko', 'Female'): 'ko-KR-SunHiNeural',
            ('zh-CN', 'Male'): 'zh-CN-YunxiNeural',
            ('zh-CN', 'Female'): 'zh-CN-XiaoxiaoNeural',
            ('ru', 'Male'): 'ru-RU-DmitryNeural',
            ('ru', 'Female'): 'ru-RU-SvetlanaNeural',
            ('it', 'Male'): 'it-IT-DiegoNeural',
            ('it', 'Female'): 'it-IT-ElsaNeural',
            ('pt', 'Male'): 'pt-BR-AntonioNeural',
            ('pt', 'Female'): 'pt-BR-FranciscaNeural',
        }
        
        voice = voice_map.get((lang, gender), 'en-US-JennyNeural')

        try:
            # Auto-translate text to target language
            if lang != 'en':
                try:
                    text = GoogleTranslator(source='auto', target=lang).translate(text)
                except Exception as e:
                    print(f"Translation failed: {e}")

            filename = f"tts_{uuid.uuid4()}.mp3"
            file_path = os.path.join(settings.MEDIA_ROOT, 'tts')
            os.makedirs(file_path, exist_ok=True)
            full_path = os.path.join(file_path, filename)

            async def generate_speech():
                comm = edge_tts.Communicate(text, voice)
                await comm.save(full_path)

            async_to_sync(generate_speech)()
            
            file_url = f"{settings.MEDIA_URL}tts/{filename}"
            
            log_activity(request.user, "text_to_speech", f"Lang: {lang}, Gender: {gender}, Voice: {voice}")

            log_tool_usage(
                request=request,
                tool_name='tts',
                status_label='success',
                http_status=status.HTTP_200_OK,
                started_at=started_at,
                extra={'lang': lang, 'gender': gender, 'voice': voice},
            )

            return Response({
                'audio_url': file_url,
                'filename': filename
            })

        except Exception as e:
            log_tool_usage(
                request=request,
                tool_name='tts',
                status_label='failed',
                http_status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                started_at=started_at,
                error=e,
            )
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ImageCompressorView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        started_at = time.time()
        image_file = request.FILES.get('image')
        quality = int(request.data.get('quality', 80))
        format_type = request.data.get('format', 'WEBP').upper()
        
        if not image_file:
            log_tool_usage(
                request=request,
                tool_name='compress-image',
                status_label='failed',
                http_status=status.HTTP_400_BAD_REQUEST,
                started_at=started_at,
                error=ValueError('Image file is required'),
            )
            return Response({'error': 'Image file is required'}, status=status.HTTP_400_BAD_REQUEST)

        valid_formats = ['JPEG', 'PNG', 'WEBP']
        if format_type not in valid_formats:
            log_tool_usage(
                request=request,
                tool_name='compress-image',
                status_label='failed',
                http_status=status.HTTP_400_BAD_REQUEST,
                started_at=started_at,
                error=ValueError('Invalid format'),
                extra={'format': format_type},
            )
            return Response({'error': f'Invalid format. Supported: {valid_formats}'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            img = Image.open(image_file)
            
            if format_type == 'JPEG' and img.mode in ('RGBA', 'LA'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[-1])
                img = background

            buffer = io.BytesIO()
            img.save(buffer, format=format_type, quality=quality, optimize=True)
            buffer.seek(0)
            
            filename = f"compressed_{uuid.uuid4()}.{format_type.lower()}"
            file_path = os.path.join(settings.MEDIA_ROOT, 'compressed')
            os.makedirs(file_path, exist_ok=True)
            
            with open(os.path.join(file_path, filename), 'wb') as f:
                f.write(buffer.getvalue())

            file_url = f"{settings.MEDIA_URL}compressed/{filename}"
            
            log_activity(request.user, "compress_image", f"Format: {format_type}, Quality: {quality}")

            log_tool_usage(
                request=request,
                tool_name='compress-image',
                status_label='success',
                http_status=status.HTTP_200_OK,
                started_at=started_at,
                extra={'format': format_type, 'quality': quality},
            )

            return Response({
                'image_url': file_url,
                'filename': filename,
                'original_size': image_file.size,
                'compressed_size': buffer.getbuffer().nbytes
            })

        except Exception as e:
            log_tool_usage(
                request=request,
                tool_name='compress-image',
                status_label='failed',
                http_status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                started_at=started_at,
                error=e,
            )
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class QrGeneratorView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        started_at = time.time()
        data = request.data.get('data')
        fg_color = request.data.get('fg_color', '#000000')
        bg_color = request.data.get('bg_color', '#ffffff')

        if not data:
            log_tool_usage(
                request=request,
                tool_name='qr-generator',
                status_label='failed',
                http_status=status.HTTP_400_BAD_REQUEST,
                started_at=started_at,
                error=ValueError('Data is required'),
            )
            return Response({'error': 'Data is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        qr_url = generate_qr_image(data, fg_color, bg_color)

        log_activity(request.user, "generate_qr", f"Data: {data[:50]}...")

        log_tool_usage(
            request=request,
            tool_name='qr-generator',
            status_label='success',
            http_status=status.HTTP_200_OK,
            started_at=started_at,
            extra={'data_preview': str(data)[:80]},
        )

        return Response({
            'qr_url': qr_url
        })

class JsonFormatterView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        started_at = time.time()
        raw_json = request.data.get('json_data')
        if not raw_json:
            log_tool_usage(
                request=request,
                tool_name='json-formatter',
                status_label='failed',
                http_status=status.HTTP_400_BAD_REQUEST,
                started_at=started_at,
                error=ValueError('JSON data is required'),
            )
            return Response({'error': 'JSON data is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            if isinstance(raw_json, str):
                parsed = json.loads(raw_json)
            else:
                parsed = raw_json
            formatted = json.dumps(parsed, indent=4)
            
            log_activity(request.user, "format_json", "JSON Formatted")

            log_tool_usage(
                request=request,
                tool_name='json-formatter',
                status_label='success',
                http_status=status.HTTP_200_OK,
                started_at=started_at,
            )
            
            return Response({'formatted_json': formatted})
        except json.JSONDecodeError:
            log_tool_usage(
                request=request,
                tool_name='json-formatter',
                status_label='failed',
                http_status=status.HTTP_400_BAD_REQUEST,
                started_at=started_at,
                error=ValueError('Invalid JSON'),
            )
            return Response({'error': 'Invalid JSON'}, status=status.HTTP_400_BAD_REQUEST)

class UrlDownloaderView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        url = request.data.get('url')
        action = request.data.get('action', 'download')  # 'check' or 'download'
        
        if not url:
            return Response({'error': 'URL is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        start_time = time.time()
        
        try:
            if action == 'check':
                # Just check the URL and return info
                headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
                resp = requests.head(url, allow_redirects=True, timeout=30, headers=headers)
                resp.raise_for_status()
                
                log_activity(request.user, "url_check", f"URL: {url}", request)
                
                return Response({
                    'status': resp.status_code,
                    'content_type': resp.headers.get('Content-Type'),
                    'content_length': resp.headers.get('Content-Length'),
                    'filename': self._extract_filename(url, resp.headers),
                })
            
            elif action == 'download':
                # Stream the file directly to user
                return self._stream_url(url, request, start_time)
                
        except requests.RequestException as e:
            error_msg = str(e)
            logger.error(f"URL download error: {error_msg}")
            
            return Response({'error': f'Failed to access URL: {error_msg}'}, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            error_msg = str(e)
            logger.exception(f"Unexpected error in URL downloader: {error_msg}")
            
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _extract_filename(self, url, headers):
        """Extract filename from URL or Content-Disposition header"""
        # Try Content-Disposition first
        content_disp = headers.get('Content-Disposition', '')
        if 'filename=' in content_disp:
            filename = content_disp.split('filename=')[1].strip('"')
            return filename
        
        # Otherwise extract from URL
        from urllib.parse import urlparse, unquote
        path = urlparse(url).path
        filename = unquote(path.split('/')[-1]) or 'download'
        return filename
    
    def _stream_url(self, url, request, start_time):
        """Stream URL content directly to user"""
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, stream=True, timeout=30, headers=headers)
        response.raise_for_status()
        
        filename = self._extract_filename(url, response.headers)
        content_type = response.headers.get('Content-Type', 'application/octet-stream')
        content_length = response.headers.get('Content-Length')
        
        def file_iterator():
            """Generator to stream file content"""
            try:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        yield chunk
            except Exception as e:
                logger.error(f"Streaming error: {e}")
                raise
        
        # Track download
        file_size = int(content_length) if content_length else None
        DownloadHistory.objects.create(
            user=request.user if request.user.is_authenticated else None,
            download_type='url',
            url=url,
            title=filename,
            file_size=file_size,
            format=filename.split('.')[-1] if '.' in filename else '',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            status='success',
            duration_seconds=time.time() - start_time,
        )
        
        download_logger.info(f"Streaming URL: {filename} to {get_client_ip(request)}")
        
        # Create streaming response
        streaming_response = StreamingHttpResponse(
            file_iterator(),
            content_type=content_type
        )
        streaming_response['Content-Disposition'] = f'attachment; filename="{filename}"'
        if content_length:
            streaming_response['Content-Length'] = content_length
        
        return streaming_response


class YtDownloaderView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        url = request.data.get('url')
        action = request.data.get('action', 'info')  # 'info' or 'download'
        quality = request.data.get('quality', 'best')  # best, 720p, 1080p, etc.
        
        if not url:
            return Response({'error': 'URL is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        start_time = time.time()
        
        try:
            # Common options for yt-dlp
            ydl_opts = {
                'format': self._get_format_string(quality),
                'noplaylist': True,
                'quiet': True,
                'no_warnings': True,
            }
            
            # Additional options might be needed for age-restricted content (cookies)
            # if settings.YOUTUBE_COOKIES_PATH:
            #    ydl_opts['cookiefile'] = settings.YOUTUBE_COOKIES_PATH

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                try:
                    info = ydl.extract_info(url, download=False)
                except yt_dlp.utils.DownloadError as e:
                    error_msg = str(e)
                    if 'Private video' in error_msg:
                        return Response({'error': 'This video is private and cannot be accessed.'}, status=status.HTTP_400_BAD_REQUEST)
                    if 'Sign in' in error_msg:
                        return Response({'error': 'This video requires age verification (cookies required).'}, status=status.HTTP_400_BAD_REQUEST)
                    if 'Video unavailable' in error_msg:
                        return Response({'error': 'Video is unavailable or deleted.'}, status=status.HTTP_404_NOT_FOUND)
                    raise e

                if action == 'info':
                    # Return video information
                    download_logger.info(f"Video info requested: {info.get('title')}")
                    
                    return Response({
                        'title': info.get('title'),
                        'duration': info.get('duration_string') or str(info.get('duration')),
                        'thumbnail': info.get('thumbnail'),
                        'uploader': info.get('uploader'),
                        'view_count': info.get('view_count'),
                        'formats': self._get_available_formats(info),
                    })
                
                elif action == 'download':
                    # Check if live stream
                    if info.get('is_live'):
                         return Response({'error': 'Live streams cannot be downloaded.'}, status=status.HTTP_400_BAD_REQUEST)

                    # Get requested format/conversion (mp3, mp4, etc.)
                    convert_to = request.data.get('format')
                    
                    # Create VideoDownload record and trigger background task
                    d = VideoDownload.objects.create(
                        url=url, 
                        format_id=self._get_format_string(quality),
                        status=VideoDownload.STATUS_PENDING
                    )
                    
                    # Trigger background task
                    try:
                        download_video_async.delay(d.id, d.url, d.format_id, convert_to)
                    except Exception:
                        # Fallback if Celery isn't running: use threading to avoid blocking the request
                        import threading
                        from apps.videos.tasks import download_video_task
                        t = threading.Thread(target=download_video_task, args=(d.id, d.url, d.format_id, convert_to))
                        t.daemon = True
                        t.start()
                    
                    return Response({
                        'success': True,
                        'message': 'Download started',
                        'download_id': d.id,
                        'status_url': f'/api/videos/downloads/{d.id}/',
                        'file_url': f'/api/videos/downloads/{d.id}/file/'
                    })
                
        except yt_dlp.utils.DownloadError as e:
            error_msg = str(e)
            logger.error(f"YouTube download error: {error_msg}")
            
            # Track failed download
            self._track_download(
                request=request,
                download_type='youtube',
                url=url,
                title='',
                status='failed',
                error_message=error_msg,
                duration=time.time() - start_time
            )
            
            return Response({'error': f'Download failed: {error_msg}'}, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            error_msg = str(e)
            logger.exception(f"Unexpected error in YouTube downloader: {error_msg}")
            
            self._track_download(
                request=request,
                download_type='youtube',
                url=url,
                title='',
                status='failed',
                error_message=error_msg,
                duration=time.time() - start_time
            )
            
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_format_string(self, quality):
        """Convert quality preference to yt-dlp format string"""
        if quality == '720p':
            return 'bestvideo[height<=720]+bestaudio/best[height<=720]'
        elif quality == '1080p':
            return 'bestvideo[height<=1080]+bestaudio/best[height<=1080]'
        elif quality == '480p':
            return 'bestvideo[height<=480]+bestaudio/best[height<=480]'
        else:
            return 'best'
    
    def _get_available_formats(self, info):
        """Extract available format options from video info"""
        formats = []
        seen_heights = set()
        
        for f in info.get('formats', []):
            height = f.get('height')
            if height and height not in seen_heights and height >= 360:
                formats.append({
                    'quality': f"{height}p",
                    'ext': f.get('ext'),
                    'filesize': f.get('filesize'),
                })
                seen_heights.add(height)
        
        # Sort by quality (descending)
        formats.sort(key=lambda x: int(x['quality'].replace('p', '')), reverse=True)
        return formats[:5]  # Return top 5 formats
    
    # _stream_video is removed in favor of background download via VideoDownload model
    
    def _track_download(self, request, download_type, url, title, file_size=None, 
                       format='', quality='', status='success', error_message='', duration=0):
        """Track download in database for analytics"""
        try:
            DownloadHistory.objects.create(
                user=request.user if request.user.is_authenticated else None,
                download_type=download_type,
                url=url,
                title=title[:500],  # Truncate if too long
                file_size=file_size,
                format=format,
                quality=quality,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                status=status,
                error_message=error_message,
                duration_seconds=duration,
            )
        except Exception as e:
            logger.error(f"Failed to track download: {e}")

class LogAnalysisView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
        log_file = os.path.join(settings.BASE_DIR, 'logs', 'requests.log')
        state_file = os.path.join(settings.BASE_DIR, 'logs', 'requests_analysis.state.json')
        analysis = get_log_analysis(log_file, state_file=state_file)
        
        if "error" in analysis:
            return Response({'error': analysis['error']}, status=status.HTTP_400_BAD_REQUEST)
            
        return Response(analysis)

class AnalyticsDashboardView(View):
    """Dedicated full-page analytics dashboard"""
    def get(self, request):
        if not request.user.is_staff:
            from django.http import HttpResponseForbidden
            return HttpResponseForbidden("Access Denied")
            
        log_file = os.path.join(settings.BASE_DIR, 'logs', 'requests.log')
        state_file = os.path.join(settings.BASE_DIR, 'logs', 'requests_analysis.state.json')
        analysis = get_log_analysis(log_file, state_file=state_file)
        
        context = {
            "analysis": analysis,
            "title": "System Intelligence Dashboard"
        }
        return render(request, "admin/log_analysis.html", context)

class ServerStatusView(View):
    """Real-time server health monitoring dashboard"""
    def get(self, request):
        if not request.user.is_staff:
            from django.http import HttpResponseForbidden
            return HttpResponseForbidden("Access Denied")

        is_json = request.GET.get('format') == 'json'

        # CPU info
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()

        # Memory info
        memory = psutil.virtual_memory()
        mem_data = {
            'total': round(memory.total / (1024 ** 3), 2),
            'available': round(memory.available / (1024 ** 3), 2),
            'used': round(memory.used / (1024 ** 3), 2),
            'percent': memory.percent
        }

        # Disk info
        disk = psutil.disk_usage('/')
        disk_data = {
            'total': round(disk.total / (1024 ** 3), 2),
            'used': round(disk.used / (1024 ** 3), 2),
            'free': round(disk.free / (1024 ** 3), 2),
            'percent': disk.percent
        }

        # Uptime
        boot_time_ts = psutil.boot_time()
        boot_time = datetime.datetime.fromtimestamp(boot_time_ts)
        uptime = datetime.datetime.now() - boot_time
        uptime_str = str(uptime).split('.')[0]

        # Network info
        addrs = psutil.net_if_addrs()
        ip_info = []
        for interface, snics in addrs.items():
            for snic in snics:
                if snic.family.name in ['AF_INET', 'AF_INET6']:
                    ip_info.append({
                        'interface': interface,
                        'address': snic.address,
                        'family': snic.family.name
                    })

        context = {
            'cpu_percent': cpu_percent,
            'cpu_count': cpu_count,
            'memory': mem_data,
            'disk': disk_data,
            'uptime': uptime_str,
            'boot_time': boot_time.strftime("%Y-%m-%d %H:%M:%S"),
            'ip_info': ip_info,
            'title': 'Server System Health'
        }

        if is_json:
            from django.http import JsonResponse
            return JsonResponse(context)
            
        return render(request, "admin/server_status.html", context)

from apps.blog.permissions import IsAdminOrReadOnly
from django.db.models import Sum, Max, Count
from django.contrib.auth import get_user_model
from apps.videos.models import VideoDownload
from .models import Service, DownloadableResource, DownloadHistory, FavoriteTool
from .serializers import (
    ServiceSerializer, DownloadableResourceSerializer, 
    DownloadHistorySerializer, FavoriteToolSerializer
)

User = get_user_model()

class ServiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Service.objects.filter(is_active=True).order_by('-popularity', 'id')
    serializer_class = ServiceSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None  # Show all tools (no pagination)


class ToolAccessView(APIView):
    """Return tool access configuration — which tools require login.

    GET /api/services/tool-access/
    Returns: { "tools": { "/services/pdf-to-doc": true, ... } }
    """
    permission_classes = [AllowAny]

    def get(self, request):
        services = Service.objects.filter(is_active=True).values('path', 'requires_login')
        tools = {s['path']: s['requires_login'] for s in services}
        return Response({'tools': tools})


class ToolAccessToggleView(APIView):
    """Admin-only endpoint to toggle requires_login on a tool.

    POST /api/services/tool-access/toggle/
    Body: { "service_id": 5, "requires_login": true }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        service_id = request.data.get('service_id')
        requires_login = request.data.get('requires_login')

        if service_id is None or requires_login is None:
            return Response(
                {'error': 'service_id and requires_login are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            service = Service.objects.get(pk=service_id)
        except Service.DoesNotExist:
            return Response({'error': 'Service not found'}, status=status.HTTP_404_NOT_FOUND)

        service.requires_login = bool(requires_login)
        service.save(update_fields=['requires_login'])

        return Response({
            'id': service.id,
            'title': service.title,
            'requires_login': service.requires_login,
        })


class DownloadableResourceViewSet(viewsets.ModelViewSet):
    queryset = DownloadableResource.objects.all().order_by('-downloads')
    serializer_class = DownloadableResourceSerializer
    permission_classes = [permissions.AllowAny] # Allow public read access (admin write is handled inside)
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    lookup_field = 'slug' 

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdminOrReadOnly] # Admin only for writes
        else:
            permission_classes = [permissions.AllowAny] # Public for read
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['get'])
    def download(self, request, slug=None):
        # Allow lookup by ID or Slug for backward compat
        try:
            resource = self.get_object()
        except:
             # Fallback if slug lookup fails, though get_object handles lookup_field
             return Response({'error': 'Resource not found'}, status=status.HTTP_404_NOT_FOUND)

        resource.downloads += 1
        resource.save()
        
        log_activity(request.user, "download_resource", f"File: {resource.name}")

        if resource.file:
            response = FileResponse(resource.file.open('rb'))
            response['Content-Disposition'] = f'attachment; filename="{resource.name}"'
            return response
        return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        # 1. Total Tools
        total_tools = Service.objects.count()

        # 2. Total Files (Downloadable Resources)
        total_files = DownloadableResource.objects.count()
        
        # 3. Active Users
        active_users = User.objects.filter(is_active=True).count()
        
        # 4. Success Rate (from VideoDownload)
        total_video_downloads = VideoDownload.objects.count()
        successful_downloads = VideoDownload.objects.filter(status=VideoDownload.STATUS_DONE).count()
        
        if total_video_downloads > 0:
            success_rate = (successful_downloads / total_video_downloads) * 100
            success_rate_str = f"{success_rate:.1f}%"
        else:
            success_rate_str = "100%" # Default if no downloads yet
            
        # 5. Total Downloads (Video + Resources)
        resource_downloads = DownloadableResource.objects.aggregate(Sum('downloads'))['downloads__sum'] or 0
        total_downloads = total_video_downloads + resource_downloads
        
        # 6. Latest Update
        latest_update = DownloadableResource.objects.aggregate(Max('created_at'))['created_at__max']
        
        # 7. Uptime (Simulated/Hardcoded as it's hard to measure from inside)
        uptime = "99.9%"

        return Response({
            'total_tools': f"{total_tools}+",
            'total_files': total_files,
            'active_users': f"{active_users}+" if active_users > 10 else str(active_users),
            'success_rate': success_rate_str,
            'uptime': uptime,
            'latest_update': latest_update,
            'total_downloads': f"{total_downloads}+" if total_downloads > 100 else str(total_downloads)
        })

class GlobalSearchView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response([])

        results = []

        # 1. Search Services
        services = Service.objects.filter(
            Q(title__icontains=query) | 
            Q(description__icontains=query) |
            Q(tags__icontains=query)
        ).filter(is_active=True)[:5]

        for s in services:
            results.append({
                'id': f"service-{s.id}",
                'type': 'Tool',
                'title': s.title,
                'description': s.description[:100],
                'url': s.path,
                'icon': s.icon,
                'category': s.category
            })

        # 2. Search Blogs
        posts = Post.objects.filter(
            Q(title__icontains=query) |
            Q(content__icontains=query) |
            Q(seo_description__icontains=query)
        ).filter(status='published')[:5]

        for p in posts:
            results.append({
                'id': f"blog-{p.id}",
                'type': 'Blog',
                'title': p.title,
                'description': p.excerpt or p.seo_description or p.title,
                'url': f"/blogs/{p.slug}",
                'image': p.cover_image.url if p.cover_image else None,
                'category': 'Blog'
            })

        # 3. Search Downloads (Files)
        downloads = DownloadableResource.objects.filter(
            Q(name__icontains=query) |
            Q(category__icontains=query)
        )[:5]

        for d in downloads:
            results.append({
                'id': f"download-{d.id}",
                'type': 'Download',
                'title': d.name,
                'description': f"{d.size} • {d.get_category_display()}",
                'url': "/downloads", # Navigate to hub? Or unique page?
                'category': d.category
            })

        return Response(results)

class UserDashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def activity(self, request):
        activities = UserActivity.objects.filter(user=request.user)[:20] # Last 20 actions
        serializer = UserActivitySerializer(activities, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get', 'post', 'delete'])
    def favorites(self, request):
        if request.method == 'GET':
            favorites = FavoriteTool.objects.filter(user=request.user)
            serializer = FavoriteToolSerializer(favorites, many=True)
            return Response(serializer.data)
        
        if request.method == 'POST':
            serializer = FavoriteToolSerializer(data=request.data)
            if serializer.is_valid():
                # Manually handle unique constraint or just create
                service = serializer.validated_data['service']
                # Check exist
                fav, created = FavoriteTool.objects.get_or_create(user=request.user, service=service)
                if created:
                    return Response(FavoriteToolSerializer(fav).data, status=status.HTTP_201_CREATED)
                return Response(FavoriteToolSerializer(fav).data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    @action(detail=False, methods=['post']) # Keep it simple: toggle
    def toggle_favorite(self, request):
        service_id = request.data.get('service_id')
        service = get_object_or_404(Service, id=service_id)
        
        fav = FavoriteTool.objects.filter(user=request.user, service=service).first()
        if fav:
            fav.delete()
            return Response({'status': 'removed', 'service_id': service_id})
        else:
            FavoriteTool.objects.create(user=request.user, service=service)
            return Response({'status': 'added', 'service_id': service_id})


class DownloadHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing download history"""
    serializer_class = DownloadHistorySerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ['download_type', 'status']
    search_fields = ['title', 'url']
    ordering_fields = ['created_at', 'file_size', 'duration_seconds']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Return download history, filtered by user if authenticated"""
        queryset = DownloadHistory.objects.all()
        
        user = self.request.user
        if user.is_authenticated:
            if not user.is_staff:
                queryset = queryset.filter(user=user)
        else:
            queryset = queryset.none()
        
        # Filter by date range if provided
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get download statistics for the user"""
        from django.db.models import Count, Sum, Avg
        
        user = request.user
        if not user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        downloads = DownloadHistory.objects.filter(user=user) if not user.is_staff else DownloadHistory.objects.all()
        
        stats = {
            'total_downloads': downloads.count(),
            'successful_downloads': downloads.filter(status='success').count(),
            'failed_downloads': downloads.filter(status='failed').count(),
            'total_data_downloaded': downloads.filter(status='success').aggregate(Sum('file_size'))['file_size__sum'] or 0,
            'downloads_by_type': dict(downloads.values('download_type').annotate(count=Count('id')).values_list('download_type', 'count')),
            'avg_download_time': downloads.filter(status='success').aggregate(Avg('duration_seconds'))['duration_seconds__avg'] or 0,
        }
        
        # Format total data
        total_bytes = stats['total_data_downloaded']
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if total_bytes < 1024.0:
                stats['total_data_downloaded_formatted'] = f"{total_bytes:.2f} {unit}"
                break
            total_bytes /= 1024.0
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export download history as CSV"""
        import csv
        
        user = request.user
        if not user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        downloads = DownloadHistory.objects.filter(user=user).order_by('-created_at')
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="download_history.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Date', 'Type', 'Title', 'URL', 'Size', 'Format', 'Quality', 'Status', 'Duration'])
        
        for download in downloads:
            writer.writerow([
                download.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                download.download_type,
                download.title,
                download.url,
                download.file_size_formatted,
                download.format,
                download.quality,
                download.status,
                f"{download.duration_seconds:.2f}s" if download.duration_seconds else "N/A",
            ])
        
        return response


class PdfToDocStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, task_id):
        """Return cached result if available, else return task state."""
        cache_key = f"pdf_convert_result:{task_id}"
        from django.core.cache import cache
        result = cache.get(cache_key)
        if result:
            return Response(result)

        # Fallback: check Celery AsyncResult
        try:
            from expectexception.celery import app as celery_app
            async_res = celery_app.AsyncResult(task_id)
            state = async_res.state
            return Response({'status': state})
        except Exception:
            return Response({'status': 'unknown'})


class PdfToDocView(APIView):
    """Convert PDF files to DOCX/DOC/ODT/RTF/TXT formats using Celery (Async) with soffice/pdf2docx"""
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]
    
    # Supported output formats
    SUPPORTED_FORMATS = ['docx', 'doc', 'odt', 'rtf', 'txt']
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    
    def post(self, request):
        """
        Convert PDF file to another format.
        
        Parameters:
        - pdf: PDF file (required)
        - format: Output format (docx, doc, odt, rtf, txt) - default: docx
        - ocr_enabled: Enable OCR for scanned PDFs (true/false) - default: false
        - language: OCR language code (eng, spa, fra, etc.) - default: eng
        """
        pdf_file = request.FILES.get('pdf')
        output_format = request.data.get('format', 'docx').lower()
        ocr_enabled = request.data.get('ocr_enabled', 'false').lower() == 'true'
        ocr_lang = request.data.get('language', 'eng')
        
        # Validate input
        if not pdf_file:
            return Response(
                {'error': 'PDF file is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file size
        if pdf_file.size > self.MAX_FILE_SIZE:
            return Response({
                'error': f'File too large. Maximum {self.MAX_FILE_SIZE // (1024*1024)}MB'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate output format
        if output_format not in self.SUPPORTED_FORMATS:
            return Response({
                'error': f'Unsupported format. Supported: {", ".join(self.SUPPORTED_FORMATS)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Save upload to temp file for Celery worker access
            temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp_uploads')
            os.makedirs(temp_dir, exist_ok=True)
            
            original_name = pdf_file.name.replace(' ', '_')
            input_filename = f"{uuid.uuid4()}_{original_name}"
            input_path = os.path.join(temp_dir, input_filename)
            
            # Write file
            with open(input_path, 'wb+') as f:
                for chunk in pdf_file.chunks():
                    f.write(chunk)
            
            logger.info(f"Received PDF for conversion: {original_name} ({pdf_file.size} bytes)")
            
            # Enqueue async task
            try:
                from .tasks import convert_pdf_task
                task = convert_pdf_task.delay(
                    input_path,
                    output_format,
                    ocr_enabled,
                    ocr_lang,
                    original_name
                )
                
                return Response({
                    'task_id': task.id,
                    'status_url': f"/api/services/pdf-to-doc/status/{task.id}/",
                    'message': 'PDF conversion started. Check status_url for progress.',
                    'format': output_format.upper(),
                    'ocr_enabled': ocr_enabled,
                }, status=status.HTTP_202_ACCEPTED)
                
            except Exception as e:
                # Fallback to sync conversion (Celery broker unavailable)
                logger.warning(f"Celery enqueue failed: {e}. Falling back to sync conversion.")
                try:
                    import uuid as _uuid
                    from .pdf_utils import smart_convert_pdf, PDFConversionError

                    converted_dir = os.path.join(settings.MEDIA_ROOT, 'converted')
                    os.makedirs(converted_dir, exist_ok=True)
                    base_name = os.path.splitext(original_name)[0]
                    safe_base = "".join(c if c.isalnum() or c in ('_', '-') else '_' for c in base_name)
                    final_filename = f"{safe_base}_{_uuid.uuid4().hex[:8]}.{output_format}"
                    final_path = os.path.join(converted_dir, final_filename)

                    info = smart_convert_pdf(
                        input_pdf=input_path,
                        output_format=output_format,
                        output_path=final_path,
                        ocr_enabled=ocr_enabled,
                        ocr_lang=ocr_lang,
                    )
                    file_url = f"{settings.MEDIA_URL}converted/{final_filename}"
                    return Response({
                        'status': 'success',
                        'success': True,
                        'file_url': file_url,
                        'filename': final_filename,
                        'original_name': original_name,
                        'format': output_format.upper(),
                        'original_size': info.get('original_size', 0),
                        'converted_size': info.get('converted_size', 0),
                        'ocr_used': info.get('ocr_used', False),
                        'engine_used': info.get('engine_used', 'unknown'),
                    }, status=status.HTTP_200_OK)

                except Exception as sync_err:
                    logger.exception("Sync PDF conversion failed")
                    return Response({
                        'error': f'PDF conversion failed: {str(sync_err)}'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


        except Exception as e:
            logger.exception("PDF upload/processing error")
            return Response({
                'error': f'Failed to process PDF: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DocToPdfView(APIView):
    """Convert DOC/DOCX files to PDF using LibreOffice"""
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]
    
    ALLOWED_EXTENSIONS = ['.doc', '.docx', '.odt', '.rtf', '.txt']
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    
    def post(self, request):
        doc_file = request.FILES.get('document')
        
        if not doc_file:
            return Response({'error': 'Document file is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if doc_file.size > self.MAX_FILE_SIZE:
            return Response({'error': 'File too large. Maximum 50MB.'}, status=status.HTTP_400_BAD_REQUEST)
        
        ext = os.path.splitext(doc_file.name)[1].lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            return Response({'error': f'Unsupported format. Allowed: {", ".join(self.ALLOWED_EXTENSIONS)}'}, status=status.HTTP_400_BAD_REQUEST)
        
        import subprocess
        import tempfile
        import shutil
        
        temp_dir = None
        try:
            temp_dir = tempfile.mkdtemp(prefix='doc_to_pdf_')
            input_path = os.path.join(temp_dir, f"input{ext}")
            
            with open(input_path, 'wb') as f:
                for chunk in doc_file.chunks():
                    f.write(chunk)
            
            cmd = ['/usr/bin/soffice', '--headless', '--convert-to', 'pdf', '--outdir', temp_dir, input_path]
            # Force a completely clean environment with explicit PATH and unique HOME
            custom_env = {
                'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
                'HOME': temp_dir,
            }
            if 'LANG' in os.environ: custom_env['LANG'] = os.environ['LANG']

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120, env=custom_env)
            
            if result.returncode != 0:
                return Response({'error': 'Conversion failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            output_path = os.path.join(temp_dir, os.path.splitext(os.path.basename(input_path))[0] + '.pdf')
            
            if not os.path.exists(output_path):
                return Response({'error': 'Output file not found'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            converted_dir = os.path.join(settings.MEDIA_ROOT, 'converted')
            os.makedirs(converted_dir, exist_ok=True)
            
            final_filename = f"{os.path.splitext(doc_file.name)[0]}_{uuid.uuid4().hex[:8]}.pdf"
            final_path = os.path.join(converted_dir, final_filename)
            shutil.copy2(output_path, final_path)
            
            log_activity(request.user, "doc_to_pdf", f"Converted {doc_file.name}", request)
            
            return Response({
                'success': True,
                'file_url': f"{settings.MEDIA_URL}converted/{final_filename}",
                'filename': final_filename,
            })
        except Exception as e:
            logger.exception(f"Doc to PDF error: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)


class PdfMergerView(APIView):
    """Merge multiple PDF files into one"""
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        pdf_files = request.FILES.getlist('pdfs')
        
        if len(pdf_files) < 2:
            return Response({'error': 'At least 2 PDF files are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if len(pdf_files) > 20:
            return Response({'error': 'Maximum 20 files allowed'}, status=status.HTTP_400_BAD_REQUEST)
        
        from PyPDF2 import PdfMerger
        
        try:
            merger = PdfMerger()
            
            for pdf in pdf_files:
                if not pdf.name.lower().endswith('.pdf'):
                    return Response({'error': f'{pdf.name} is not a PDF'}, status=status.HTTP_400_BAD_REQUEST)
                merger.append(pdf)
            
            output_dir = os.path.join(settings.MEDIA_ROOT, 'merged')
            os.makedirs(output_dir, exist_ok=True)
            
            filename = f"merged_{uuid.uuid4().hex[:8]}.pdf"
            output_path = os.path.join(output_dir, filename)
            
            with open(output_path, 'wb') as f:
                merger.write(f)
            merger.close()
            
            log_activity(request.user, "pdf_merge", f"Merged {len(pdf_files)} PDFs", request)
            
            return Response({
                'success': True,
                'file_url': f"{settings.MEDIA_URL}merged/{filename}",
                'filename': filename,
                'pages_merged': len(pdf_files),
            })
        except Exception as e:
            logger.exception(f"PDF merge error: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PdfSplitterView(APIView):
    """Split PDF into individual pages or ranges"""
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        pdf_file = request.FILES.get('pdf')
        pages = request.data.get('pages', 'all')  # 'all', '1,3,5' or '1-5'
        
        if not pdf_file:
            return Response({'error': 'PDF file is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from PyPDF2 import PdfReader, PdfWriter
        import zipfile
        
        try:
            reader = PdfReader(pdf_file)
            total_pages = len(reader.pages)
            
            # Parse page selection
            if pages == 'all':
                selected_pages = list(range(total_pages))
            else:
                selected_pages = []
                for part in pages.split(','):
                    if '-' in part:
                        start, end = part.split('-')
                        selected_pages.extend(range(int(start)-1, min(int(end), total_pages)))
                    else:
                        page_num = int(part) - 1
                        if 0 <= page_num < total_pages:
                            selected_pages.append(page_num)
            
            output_dir = os.path.join(settings.MEDIA_ROOT, 'split')
            os.makedirs(output_dir, exist_ok=True)
            
            zip_filename = f"split_{uuid.uuid4().hex[:8]}.zip"
            zip_path = os.path.join(output_dir, zip_filename)
            
            with zipfile.ZipFile(zip_path, 'w') as zipf:
                for i, page_num in enumerate(selected_pages):
                    writer = PdfWriter()
                    writer.add_page(reader.pages[page_num])
                    
                    page_filename = f"page_{page_num + 1}.pdf"
                    page_buffer = io.BytesIO()
                    writer.write(page_buffer)
                    zipf.writestr(page_filename, page_buffer.getvalue())
            
            log_activity(request.user, "pdf_split", f"Split {len(selected_pages)} pages", request)
            
            return Response({
                'success': True,
                'file_url': f"{settings.MEDIA_URL}split/{zip_filename}",
                'filename': zip_filename,
                'total_pages': total_pages,
                'extracted_pages': len(selected_pages),
            })
        except Exception as e:
            logger.exception(f"PDF split error: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ImageToPdfView(APIView):
    """Convert images to PDF"""
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        images = request.FILES.getlist('images')
        
        if not images:
            return Response({'error': 'At least one image is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from PIL import Image
            
            pdf_images = []
            first_image = None
            
            for img_file in images:
                img = Image.open(img_file)
                if img.mode == 'RGBA':
                    img = img.convert('RGB')
                
                if first_image is None:
                    first_image = img
                else:
                    pdf_images.append(img)
            
            output_dir = os.path.join(settings.MEDIA_ROOT, 'converted')
            os.makedirs(output_dir, exist_ok=True)
            
            filename = f"images_{uuid.uuid4().hex[:8]}.pdf"
            output_path = os.path.join(output_dir, filename)
            
            first_image.save(output_path, 'PDF', save_all=True, append_images=pdf_images)
            
            log_activity(request.user, "image_to_pdf", f"Converted {len(images)} images", request)
            
            return Response({
                'success': True,
                'file_url': f"{settings.MEDIA_URL}converted/{filename}",
                'filename': filename,
                'images_count': len(images),
            })
        except Exception as e:
            logger.exception(f"Image to PDF error: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ImageResizerView(APIView):
    """Resize and crop images"""
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        image_file = request.FILES.get('image')
        width = request.data.get('width')
        height = request.data.get('height')
        maintain_aspect = request.data.get('maintain_aspect', 'true').lower() == 'true'
        
        if not image_file:
            return Response({'error': 'Image file is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not width and not height:
            return Response({'error': 'Width or height is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            img = Image.open(image_file)
            original_width, original_height = img.size
            
            width = int(width) if width else None
            height = int(height) if height else None
            
            if maintain_aspect:
                if width and height:
                    # Fit within bounds
                    img.thumbnail((width, height), Image.LANCZOS)
                elif width:
                    ratio = width / original_width
                    height = int(original_height * ratio)
                    img = img.resize((width, height), Image.LANCZOS)
                else:
                    ratio = height / original_height
                    width = int(original_width * ratio)
                    img = img.resize((width, height), Image.LANCZOS)
            else:
                if not width:
                    width = original_width
                if not height:
                    height = original_height
                img = img.resize((width, height), Image.LANCZOS)
            
            buffer = io.BytesIO()
            format_type = img.format or 'PNG'
            img.save(buffer, format=format_type, quality=95)
            buffer.seek(0)
            
            output_dir = os.path.join(settings.MEDIA_ROOT, 'resized')
            os.makedirs(output_dir, exist_ok=True)
            
            ext = os.path.splitext(image_file.name)[1] or '.png'
            filename = f"resized_{uuid.uuid4().hex[:8]}{ext}"
            output_path = os.path.join(output_dir, filename)
            
            with open(output_path, 'wb') as f:
                f.write(buffer.getvalue())
            
            return Response({
                'success': True,
                'file_url': f"{settings.MEDIA_URL}resized/{filename}",
                'filename': filename,
                'original_size': f"{original_width}x{original_height}",
                'new_size': f"{img.size[0]}x{img.size[1]}",
            })
        except Exception as e:
            logger.exception(f"Image resize error: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BackgroundRemoverView(APIView):
    """Remove background from images using rembg with GPU acceleration and quality options"""
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]
    
    # GPU session singleton (initialized on first use)
    _gpu_session = None
    _session_initialized = False
    
    # Quality/performance presets
    QUALITY_PRESETS = {
        'fast': {'max_dimension': 1024, 'quality': 75},
        'balanced': {'max_dimension': 2048, 'quality': 90},
        'best': {'max_dimension': 4096, 'quality': 95},
    }
    DEFAULT_QUALITY = 'balanced'
    
    @classmethod
    def get_rembg_session(cls):
        """Get or create a GPU-accelerated rembg session"""
        if cls._session_initialized:
            return cls._gpu_session
        
        try:
            from django.conf import settings
            from rembg import new_session
            use_gpu = getattr(settings, 'BG_REMOVER_USE_GPU', getattr(settings, 'USE_GPU', False))
            model = getattr(settings, 'BG_REMOVER_MODEL', 'u2net')
            
            if use_gpu:
                # Try CUDA provider first, fall back to CPU
                cls._gpu_session = new_session(
                    model,
                    providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
                )
                logger.info(f"BackgroundRemover: Created GPU session ({model})")
            else:
                cls._gpu_session = new_session(
                    model,
                    providers=['CPUExecutionProvider']
                )
                logger.info(f"BackgroundRemover: Created CPU session ({model})")
        except Exception as e:
            logger.warning(f"BackgroundRemover: GPU session failed, using default: {e}")
            cls._gpu_session = None
        
        cls._session_initialized = True
        return cls._gpu_session
    
    def _apply_exif_rotation(self, img: Image.Image) -> Image.Image:
        """Apply EXIF rotation to image if present"""
        try:
            from PIL.Image import EXIF, Transpose
            exif = img.getexif()
            orientation = exif.get(274)  # Orientation tag
            
            if orientation:
                if orientation == 3:
                    img = img.rotate(180, expand=True)
                elif orientation == 6:
                    img = img.rotate(270, expand=True)
                elif orientation == 8:
                    img = img.rotate(90, expand=True)
                logger.debug(f"Applied EXIF rotation: {orientation}")
        except Exception as e:
            logger.debug(f"Could not apply EXIF rotation: {e}")
        
        return img
    
    def post(self, request):
        """
        Remove background from image with optional quality control.
        
        Parameters:
        - image: Image file (required, JPEG/PNG/GIF/BMP)
        - quality: Quality preset (fast/balanced/best) - default: balanced
        - format: Output format (png, jpg) - default: png (to preserve transparency)
        """
        started_at = time.time()
        image_file = request.FILES.get('image')
        
        if not image_file:
            return Response(
                {'error': 'Image file is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from rembg import remove
            
            # Get quality preset
            quality_preset = request.data.get('quality', self.DEFAULT_QUALITY).lower()
            if quality_preset not in self.QUALITY_PRESETS:
                logger.warning(f"Invalid quality preset: {quality_preset}, using default")
                quality_preset = self.DEFAULT_QUALITY
            
            preset = self.QUALITY_PRESETS[quality_preset]
            max_dimension = preset['max_dimension']
            quality = preset['quality']
            
            # Get output format
            output_format = request.data.get('format', 'png').lower()
            if output_format not in ['png', 'jpg', 'jpeg']:
                output_format = 'png'
            
            input_data = image_file.read()
            
            # Open image and apply optimizations
            try:
                img = Image.open(io.BytesIO(input_data))
                
                # Apply EXIF rotation auto-correction
                img = self._apply_exif_rotation(img)
                
                original_size = img.size
                logger.info(f"Processing image: {original_size}, quality: {quality_preset}")
                
                # Optimize: Downscale if image is too large (prevents OOM and timeouts)
                if img.width > max_dimension or img.height > max_dimension:
                    ratio_w = max_dimension / img.width
                    ratio_h = max_dimension / img.height
                    ratio = min(ratio_w, ratio_h)
                    
                    new_width = int(img.width * ratio)
                    new_height = int(img.height * ratio)
                    img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                    logger.debug(f"Downscaled to {img.size} for processing")
                
                # Save as PNG to preserve transparency
                buffer = io.BytesIO()
                img.save(buffer, format="PNG")
                input_data = buffer.getvalue()
                
            except Exception as e:
                logger.warning(f"Failed to optimize image: {e}. Continuing with original...")
                # Continue with original data if optimization fails
                pass
            
            # Use GPU session if available
            session = self.get_rembg_session()
            if session:
                output_data = remove(input_data, session=session)
                used_gpu = True
            else:
                output_data = remove(input_data)
                used_gpu = False
            
            # Prepare output
            output_dir = os.path.join(settings.MEDIA_ROOT, 'nobg')
            os.makedirs(output_dir, exist_ok=True)
            
            # Save with appropriate extension
            if output_format in ['jpg', 'jpeg']:
                filename = f"nobg_{uuid.uuid4().hex[:8]}.jpg"
                # Convert RGBA to RGB for JPG
                output_img = Image.open(io.BytesIO(output_data))
                if output_img.mode == 'RGBA':
                    bg = Image.new('RGB', output_img.size, (255, 255, 255))
                    bg.paste(output_img, mask=output_img.split()[3])
                    buffer = io.BytesIO()
                    bg.save(buffer, format='JPEG', quality=quality)
                    output_data = buffer.getvalue()
            else:
                filename = f"nobg_{uuid.uuid4().hex[:8]}.png"
            
            output_path = os.path.join(output_dir, filename)
            
            with open(output_path, 'wb') as f:
                f.write(output_data)
            
            processing_time = time.time() - started_at
            log_activity(
                request.user,
                "background_remove",
                f"{image_file.name} (GPU: {used_gpu}, Quality: {quality_preset}, Time: {processing_time:.2f}s)",
                request
            )
            
            return Response({
                'success': True,
                'file_url': f"{settings.MEDIA_URL}nobg/{filename}",
                'filename': filename,
                'processing_time': round(processing_time, 2),
                'gpu_accelerated': used_gpu,
                'quality': quality_preset,
                'format': output_format.upper(),
            })
        except ImportError:
            return Response(
                {'error': 'Background removal service not available. Install: pip install rembg'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            logger.exception(f"Background removal error: {e}")
            return Response(
                {'error': f'Background removal failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ImageToTextView(APIView):
    """Extract text from images using OCR (Tesseract)"""
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    @staticmethod
    @lru_cache(maxsize=1)
    def _resolve_tesseract_cmd() -> str | None:
        # Allow deploy-time override.
        configured = getattr(settings, 'TESSERACT_CMD', None)
        if configured:
            return str(configured)

        # Prefer PATH lookup (works across distros/containers).
        found = shutil.which('tesseract')
        if found:
            return found

        # Last-resort fallback.
        return '/usr/bin/tesseract'

    @classmethod
    @lru_cache(maxsize=1)
    def _installed_languages(cls) -> tuple[str, ...]:
        import pytesseract

        cmd = cls._resolve_tesseract_cmd()
        if cmd:
            pytesseract.pytesseract.tesseract_cmd = cmd
        langs = pytesseract.get_languages(config='')
        return tuple(sorted(set(langs)))

    def get(self, request):
        """Return installed Tesseract language codes on this server."""
        started_at = time.time()

        try:
            import pytesseract

            cmd = self._resolve_tesseract_cmd()
            if not cmd or not os.path.exists(cmd):
                raise FileNotFoundError(f"tesseract binary not found (resolved: {cmd})")
            pytesseract.pytesseract.tesseract_cmd = cmd

            langs = list(self._installed_languages())

            log_tool_usage(
                request=request,
                tool_name='image-to-text-languages',
                status_label='success',
                http_status=status.HTTP_200_OK,
                started_at=started_at,
                extra={'languages_count': len(langs)},
            )

            return Response({'success': True, 'languages': langs, 'default': 'eng'})
        except ImportError as e:
            log_tool_usage(
                request=request,
                tool_name='image-to-text-languages',
                status_label='failed',
                http_status=status.HTTP_503_SERVICE_UNAVAILABLE,
                started_at=started_at,
                error=e,
            )
            return Response({'error': 'OCR service not available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            logger.exception(f"OCR languages error: {e}")
            log_tool_usage(
                request=request,
                tool_name='image-to-text-languages',
                status_label='failed',
                http_status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                started_at=started_at,
                error=e,
            )
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        started_at = time.time()
        image_file = request.FILES.get('image')
        language = request.data.get('language', 'eng')  # eng, spa, fra, deu, etc.
        
        if not image_file:
            log_tool_usage(
                request=request,
                tool_name='image-to-text',
                status_label='failed',
                http_status=status.HTTP_400_BAD_REQUEST,
                started_at=started_at,
                error=ValueError('Image file is required'),
            )
            return Response({'error': 'Image file is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            import pytesseract

            # Ensure PATH exists (some process managers can strip it).
            os.environ['PATH'] = os.environ.get('PATH', '')

            cmd = self._resolve_tesseract_cmd()
            if not cmd or not os.path.exists(cmd):
                raise FileNotFoundError(
                    f"tesseract binary not found (resolved: {cmd}). Install tesseract-ocr or set settings.TESSERACT_CMD"
                )
            pytesseract.pytesseract.tesseract_cmd = cmd

            requested_language = str(language or 'eng')
            installed = self._installed_languages()
            used_language = requested_language if requested_language in installed else 'eng'
            warning = None
            if used_language != requested_language:
                warning = (
                    f"Language '{requested_language}' is not installed on the server. "
                    f"Using '{used_language}' instead. Available: {', '.join(installed) or 'none'}"
                )

            img = Image.open(image_file)
            img = ImageOps.exif_transpose(img)
            if img.mode not in ('RGB', 'L'):
                img = img.convert('RGB')

            text = pytesseract.image_to_string(img, lang=used_language)
            
            log_activity(request.user, "ocr", f"Extracted text from {image_file.name}", request)

            log_tool_usage(
                request=request,
                tool_name='image-to-text',
                status_label='success',
                http_status=status.HTTP_200_OK,
                started_at=started_at,
                extra={'requested_language': requested_language, 'used_language': used_language},
            )

            payload = {
                'success': True,
                'text': text.strip(),
                'language': used_language,
                'requested_language': requested_language,
                'characters': len(text),
            }
            if warning:
                payload['warning'] = warning

            return Response(payload)
        except ImportError:
            log_tool_usage(
                request=request,
                tool_name='image-to-text',
                status_label='failed',
                http_status=status.HTTP_503_SERVICE_UNAVAILABLE,
                started_at=started_at,
                error=ImportError('pytesseract not installed'),
            )
            return Response({'error': 'OCR service not available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            logger.exception(f"OCR error: {e}")

            log_tool_usage(
                request=request,
                tool_name='image-to-text',
                status_label='failed',
                http_status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                started_at=started_at,
                error=e,
            )
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ImageConverterView(APIView):
    """Convert images between formats"""
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]
    
    FORMATS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'ico']
    
    def post(self, request):
        image_file = request.FILES.get('image')
        output_format = request.data.get('format', 'png').lower()
        
        if not image_file:
            return Response({'error': 'Image file is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if output_format not in self.FORMATS:
            return Response({'error': f'Supported formats: {", ".join(self.FORMATS)}'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            img = Image.open(image_file)
            
            # Handle RGBA for JPEG
            if output_format in ['jpg', 'jpeg'] and img.mode == 'RGBA':
                bg = Image.new('RGB', img.size, (255, 255, 255))
                bg.paste(img, mask=img.split()[3])
                img = bg
            
            buffer = io.BytesIO()
            save_format = 'JPEG' if output_format in ['jpg', 'jpeg'] else output_format.upper()
            img.save(buffer, format=save_format, quality=95)
            buffer.seek(0)
            
            output_dir = os.path.join(settings.MEDIA_ROOT, 'converted')
            os.makedirs(output_dir, exist_ok=True)
            
            filename = f"converted_{uuid.uuid4().hex[:8]}.{output_format}"
            output_path = os.path.join(output_dir, filename)
            
            with open(output_path, 'wb') as f:
                f.write(buffer.getvalue())
            
            return Response({
                'success': True,
                'file_url': f"{settings.MEDIA_URL}converted/{filename}",
                'filename': filename,
                'format': output_format.upper(),
            })
        except Exception as e:
            logger.exception(f"Image convert error: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ImageUpscalerView(APIView):
    """Upscale and enhance images using high-quality interpolation"""
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB limit to keep memory manageable
    MAX_SCALE = 4.0

    def post(self, request):
        started_at = time.time()
        image_file = request.FILES.get('image')
        if not image_file:
            log_tool_usage(
                request=request,
                tool_name='image-upscale',
                status_label='failed',
                http_status=status.HTTP_400_BAD_REQUEST,
                started_at=started_at,
                error=ValueError('Image file is required'),
            )
            return Response({'error': 'Image file is required'}, status=status.HTTP_400_BAD_REQUEST)

        if image_file.size > self.MAX_FILE_SIZE:
            log_tool_usage(
                request=request,
                tool_name='image-upscale',
                status_label='failed',
                http_status=status.HTTP_400_BAD_REQUEST,
                started_at=started_at,
                error=ValueError('File too large'),
                extra={'size': int(image_file.size), 'max_size': int(self.MAX_FILE_SIZE)},
            )
            return Response(
                {'error': f'File too large. Maximum size is {self.MAX_FILE_SIZE // (1024 * 1024)}MB'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            scale = float(request.data.get('scale', 2))
        except (TypeError, ValueError):
            scale = 2.0
        scale = max(1.0, min(scale, self.MAX_SCALE))

        try:
            sharpness = float(request.data.get('sharpness', 1.2))
        except (TypeError, ValueError):
            sharpness = 1.2
        sharpness = max(0.5, min(sharpness, 2.5))

        reduce_noise = str(request.data.get('denoise', 'true')).lower() == 'true'
        boost_color = str(request.data.get('boost_color', 'false')).lower() == 'true'

        try:
            image = Image.open(image_file)
            source_mode = image.mode
            if image.mode not in ('RGB', 'RGBA'):
                image = image.convert('RGB')

            new_size = (int(image.width * scale), int(image.height * scale))
            upscaled = image.resize(new_size, Image.LANCZOS)

            if reduce_noise:
                upscaled = upscaled.filter(ImageFilter.SMOOTH_MORE)

            if sharpness != 1.0:
                upscaled = ImageEnhance.Sharpness(upscaled).enhance(sharpness)

            if boost_color:
                upscaled = ImageEnhance.Color(upscaled).enhance(1.05)
                upscaled = ImageEnhance.Contrast(upscaled).enhance(1.03)

            buffer = io.BytesIO()
            output_format = 'PNG' if upscaled.mode == 'RGBA' else 'JPEG'
            upscaled.save(buffer, format=output_format, quality=95)
            buffer.seek(0)

            output_dir = os.path.join(settings.MEDIA_ROOT, 'enhanced')
            os.makedirs(output_dir, exist_ok=True)

            ext = '.png' if output_format == 'PNG' else '.jpg'
            filename = f"upscaled_{uuid.uuid4().hex[:8]}{ext}"
            output_path = os.path.join(output_dir, filename)

            with open(output_path, 'wb') as f:
                f.write(buffer.getvalue())

            file_url = f"{settings.MEDIA_URL}enhanced/{filename}"

            log_activity(
                request.user,
                "image_upscale",
                f"Scale {scale}x, sharpness {sharpness} (src mode {source_mode})",
                request
            )

            log_tool_usage(
                request=request,
                tool_name='image-upscale',
                status_label='success',
                http_status=status.HTTP_200_OK,
                started_at=started_at,
                extra={
                    'scale': scale,
                    'sharpness': sharpness,
                    'denoise': reduce_noise,
                    'boost_color': boost_color,
                    'src_mode': source_mode,
                    'out_format': output_format,
                },
            )

            return Response({
                'success': True,
                'file_url': file_url,
                'filename': filename,
                'scale': scale,
                'original_size': f"{image.width}x{image.height}",
                'upscaled_size': f"{upscaled.width}x{upscaled.height}",
                'output_format': output_format,
                'adjustments': {
                    'sharpness': sharpness,
                    'denoise': reduce_noise,
                    'boost_color': boost_color,
                }
            })
        except Exception as e:
            logger.exception(f"Image upscale error: {e}")
            log_tool_usage(
                request=request,
                tool_name='image-upscale',
                status_label='failed',
                http_status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                started_at=started_at,
                error=e,
            )
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class Base64View(APIView):
    """Encode/decode Base64"""
    permission_classes = [AllowAny]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def post(self, request):
        action = request.data.get('action', 'encode')  # encode or decode
        text = request.data.get('text', '')
        file = request.FILES.get('file')
        
        import base64
        
        try:
            if action == 'encode':
                if file:
                    data = file.read()
                    encoded = base64.b64encode(data).decode('utf-8')
                    return Response({'result': encoded, 'type': 'file'})
                elif text:
                    encoded = base64.b64encode(text.encode('utf-8')).decode('utf-8')
                    return Response({'result': encoded, 'type': 'text'})
                else:
                    return Response({'error': 'Text or file required'}, status=status.HTTP_400_BAD_REQUEST)
            
            elif action == 'decode':
                if not text:
                    return Response({'error': 'Base64 text required'}, status=status.HTTP_400_BAD_REQUEST)
                decoded = base64.b64decode(text).decode('utf-8')
                return Response({'result': decoded})
            
            else:
                return Response({'error': 'Action must be encode or decode'}, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class HashGeneratorView(APIView):
    """Generate hash values (MD5, SHA-256, etc.)"""
    permission_classes = [AllowAny]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def post(self, request):
        text = request.data.get('text', '')
        file = request.FILES.get('file')
        algorithm = request.data.get('algorithm', 'sha256').lower()
        
        import hashlib
        
        algorithms = {
            'md5': hashlib.md5,
            'sha1': hashlib.sha1,
            'sha256': hashlib.sha256,
            'sha512': hashlib.sha512,
        }
        
        if algorithm not in algorithms:
            return Response({'error': f'Supported: {", ".join(algorithms.keys())}'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            hasher = algorithms[algorithm]()
            
            if file:
                for chunk in file.chunks():
                    hasher.update(chunk)
            elif text:
                hasher.update(text.encode('utf-8'))
            else:
                return Response({'error': 'Text or file required'}, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'hash': hasher.hexdigest(),
                'algorithm': algorithm.upper(),
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UuidGeneratorView(APIView):
    """Generate UUIDs"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        count = min(int(request.query_params.get('count', 1)), 100)
        version = request.query_params.get('version', '4')
        
        uuids = []
        for _ in range(count):
            if version == '1':
                uuids.append(str(uuid.uuid1()))
            else:
                uuids.append(str(uuid.uuid4()))
        
        return Response({
            'uuids': uuids,
            'version': version,
            'count': len(uuids),
        })


class ColorConverterView(APIView):
    """Convert colors between HEX, RGB, HSL"""
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]
    
    def post(self, request):
        color = request.data.get('color', '')
        from_format = request.data.get('from', 'hex').lower()
        
        import colorsys
        
        try:
            # Parse input
            if from_format == 'hex':
                hex_color = color.lstrip('#')
                r = int(hex_color[0:2], 16)
                g = int(hex_color[2:4], 16)
                b = int(hex_color[4:6], 16)
            elif from_format == 'rgb':
                parts = color.replace('rgb(', '').replace(')', '').split(',')
                r, g, b = [int(p.strip()) for p in parts]
            else:
                return Response({'error': 'Unsupported format'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Convert to all formats
            hex_val = f"#{r:02x}{g:02x}{b:02x}"
            rgb_val = f"rgb({r}, {g}, {b})"
            
            h, l, s = colorsys.rgb_to_hls(r/255, g/255, b/255)
            hsl_val = f"hsl({int(h*360)}, {int(s*100)}%, {int(l*100)}%)"
            
            return Response({
                'hex': hex_val,
                'rgb': rgb_val,
                'hsl': hsl_val,
                'r': r, 'g': g, 'b': b,
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


def _validate_public_http_url(raw_url: str) -> str:
    if not raw_url or not str(raw_url).strip():
        raise ValueError('URL is required')

    url = str(raw_url).strip()
    parsed = urlparse(url)

    if parsed.scheme not in ('http', 'https'):
        raise ValueError('Only http/https URLs are allowed')

    host = parsed.hostname
    if not host:
        raise ValueError('Invalid URL (missing hostname)')

    host_lc = host.lower()
    if host_lc in ('localhost',) or host_lc.endswith('.local'):
        raise ValueError('Blocked hostname')

    port = parsed.port or (443 if parsed.scheme == 'https' else 80)

    # SSRF protection: resolve and block private/local IP ranges.
    try:
        addrinfo = socket.getaddrinfo(host, port)
    except Exception:
        raise ValueError('Unable to resolve hostname')

    seen = set()
    for family, _, _, _, sockaddr in addrinfo:
        ip = sockaddr[0]
        if ip in seen:
            continue
        seen.add(ip)
        ip_obj = ipaddress.ip_address(ip)
        if (
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_link_local
            or ip_obj.is_reserved
            or ip_obj.is_multicast
            or ip_obj.is_unspecified
        ):
            raise ValueError('Blocked target (private/local IP)')

    return url


def _validate_public_hostname(raw_host: str, port: int) -> str:
    if not raw_host or not str(raw_host).strip():
        raise ValueError('Hostname is required')

    host = str(raw_host).strip().strip('.')
    host_lc = host.lower()
    if host_lc in ('localhost',) or host_lc.endswith('.local'):
        raise ValueError('Blocked hostname')

    # Normalize IDN to ASCII for resolution.
    try:
        import idna
        host_ascii = idna.encode(host, uts46=True).decode('ascii')
    except Exception:
        host_ascii = host

    try:
        addrinfo = socket.getaddrinfo(host_ascii, port, type=socket.SOCK_STREAM)
    except Exception:
        raise ValueError('Unable to resolve hostname')

    seen = set()
    for family, _, _, _, sockaddr in addrinfo:
        ip = sockaddr[0]
        if ip in seen:
            continue
        seen.add(ip)
        ip_obj = ipaddress.ip_address(ip)
        if (
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_link_local
            or ip_obj.is_reserved
            or ip_obj.is_multicast
            or ip_obj.is_unspecified
        ):
            raise ValueError('Blocked target (private/local IP)')

    return host_ascii


def _flatten_cert_name(name_seq) -> str:
    # ssl.getpeercert() returns tuples like ((('commonName', 'example.com'),), (('organizationName', 'X'),))
    try:
        parts = []
        for rdn in name_seq or []:
            for k, v in rdn or []:
                if k and v:
                    parts.append(f"{k}={v}")
        return ', '.join(parts)
    except Exception:
        return ''


def _parse_cert_time(value: str) -> str | None:
    if not value:
        return None
    try:
        # Example: 'Nov  7 00:00:00 2025 GMT'
        dt = datetime.datetime.strptime(value, '%b %d %H:%M:%S %Y %Z')
        return dt.replace(tzinfo=datetime.timezone.utc).isoformat()
    except Exception:
        return None


def _tls_probe(hostname: str, *, version=None, alpn_protocols=None, timeout_s: float = 6.0) -> dict:
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    if alpn_protocols:
        try:
            ctx.set_alpn_protocols(list(alpn_protocols))
        except Exception:
            pass

    if version is not None:
        try:
            ctx.minimum_version = version
            ctx.maximum_version = version
        except Exception:
            # Older OpenSSL / Python may not support forcing the version.
            pass

    s = socket.create_connection((hostname, 443), timeout=timeout_s)
    try:
        ss = ctx.wrap_socket(s, server_hostname=hostname)
        try:
            cert_dict = ss.getpeercert() or {}
            cert_der = ss.getpeercert(binary_form=True)
            cipher = ss.cipher()
            return {
                'ok': True,
                'negotiated_tls_version': ss.version(),
                'alpn_selected': (ss.selected_alpn_protocol() if hasattr(ss, 'selected_alpn_protocol') else None),
                'cipher': {
                    'name': cipher[0] if cipher else None,
                    'protocol': cipher[1] if cipher else None,
                    'bits': cipher[2] if cipher else None,
                },
                'cert': cert_dict,
                'cert_sha256': (hashlib.sha256(cert_der).hexdigest() if cert_der else None),
            }
        finally:
            try:
                ss.close()
            except Exception:
                pass
    finally:
        try:
            s.close()
        except Exception:
            pass


class TlsCheckView(APIView):
    """SSL/TLS checker: leaf cert details, expiry, SANs, and protocol/ALPN negotiation."""

    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        started_at = time.time()

        raw_target = (request.data.get('target') or request.data.get('url') or request.data.get('domain') or '').strip()
        if not raw_target:
            log_tool_usage(
                request=request,
                tool_name='tls-check',
                status_label='failed',
                http_status=status.HTTP_400_BAD_REQUEST,
                started_at=started_at,
                error=ValueError('Target is required'),
            )
            return Response({'error': 'Target is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Accept URL or hostname.
        host = raw_target
        validated_url = None
        if '://' in raw_target:
            try:
                validated_url = _validate_public_http_url(raw_target)
                host = urlparse(validated_url).hostname or host
            except Exception as e:
                log_tool_usage(
                    request=request,
                    tool_name='tls-check',
                    status_label='failed',
                    http_status=status.HTTP_400_BAD_REQUEST,
                    started_at=started_at,
                    error=e,
                )
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Strip a path if user pasted example.com/path
            if '/' in host:
                host = host.split('/', 1)[0]
            # Reject explicit non-443 ports.
            if ':' in host and not host.startswith('['):
                # host:port
                maybe_host, maybe_port = host.rsplit(':', 1)
                if maybe_port.isdigit() and int(maybe_port) != 443:
                    return Response({'error': 'Only port 443 is supported'}, status=status.HTTP_400_BAD_REQUEST)
                host = maybe_host

        try:
            host = _validate_public_hostname(host, 443)
        except Exception as e:
            log_tool_usage(
                request=request,
                tool_name='tls-check',
                status_label='failed',
                http_status=status.HTTP_400_BAD_REQUEST,
                started_at=started_at,
                error=e,
            )
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Main probe (best-effort, no cert verification so we can still show details for misconfigured sites).
        try:
            main = _tls_probe(host, alpn_protocols=['h2', 'http/1.1'], timeout_s=6.0)
        except Exception as e:
            logger.exception(f"TLS probe failed: {e}")
            log_tool_usage(
                request=request,
                tool_name='tls-check',
                status_label='failed',
                http_status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                started_at=started_at,
                error=e,
            )
            return Response({'error': 'TLS connection failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        cert = main.get('cert') or {}
        san = []
        try:
            for t, v in cert.get('subjectAltName', []) or []:
                if v:
                    san.append(str(v))
        except Exception:
            san = []

        not_before_raw = cert.get('notBefore')
        not_after_raw = cert.get('notAfter')

        leaf = {
            'subject': _flatten_cert_name(cert.get('subject')),
            'issuer': _flatten_cert_name(cert.get('issuer')),
            'not_before': _parse_cert_time(not_before_raw),
            'not_after': _parse_cert_time(not_after_raw),
            'sans': san,
            'sha256': main.get('cert_sha256'),
        }

        # Protocol/version matrix.
        protocol_tests = []
        versions = []
        try:
            versions = [
                ('TLSv1.3', ssl.TLSVersion.TLSv1_3),
                ('TLSv1.2', ssl.TLSVersion.TLSv1_2),
                ('TLSv1.1', ssl.TLSVersion.TLSv1_1),
                ('TLSv1.0', ssl.TLSVersion.TLSv1),
            ]
        except Exception:
            versions = []

        for label, ver in versions:
            try:
                res = _tls_probe(host, version=ver, alpn_protocols=['h2', 'http/1.1'], timeout_s=4.0)
                protocol_tests.append(
                    {
                        'version': label,
                        'ok': True,
                        'negotiated_tls_version': res.get('negotiated_tls_version'),
                        'alpn_selected': res.get('alpn_selected'),
                        'cipher': res.get('cipher'),
                    }
                )
            except Exception as e:
                protocol_tests.append(
                    {
                        'version': label,
                        'ok': False,
                        'error': str(e),
                    }
                )

        # Verification attempt (best-effort).
        verify = {'verified': None, 'error': None}
        try:
            ctx = ssl.create_default_context()
            try:
                ctx.set_alpn_protocols(['h2', 'http/1.1'])
            except Exception:
                pass
            s = socket.create_connection((host, 443), timeout=6.0)
            try:
                ss = ctx.wrap_socket(s, server_hostname=host)
                try:
                    verify['verified'] = True
                    verify['alpn_selected'] = (ss.selected_alpn_protocol() if hasattr(ss, 'selected_alpn_protocol') else None)
                finally:
                    try:
                        ss.close()
                    except Exception:
                        pass
            finally:
                try:
                    s.close()
                except Exception:
                    pass
        except ssl.SSLCertVerificationError as e:
            verify['verified'] = False
            verify['error'] = str(e)
        except Exception as e:
            verify['verified'] = None
            verify['error'] = str(e)

        # HTTP/3 indicator (advertised via Alt-Svc), best-effort.
        http3 = {'advertised': None, 'alt_svc': None, 'error': None}
        try:
            probe_url = validated_url
            if not probe_url:
                probe_url = _validate_public_http_url(f"https://{host}/")

            # Follow a few redirects safely.
            current = probe_url
            session = requests.Session()
            session.headers.update({'User-Agent': 'ExpectException TLS Checker'})
            last_headers = {}
            for _ in range(6):
                resp = session.request('HEAD', current, allow_redirects=False, timeout=6, verify=False)
                last_headers = _normalize_headers(resp.headers)
                loc = last_headers.get('location')
                if resp.status_code in (301, 302, 303, 307, 308) and loc:
                    nxt = urljoin(current, loc)
                    current = _validate_public_http_url(nxt)
                    continue
                break

            alt_svc = last_headers.get('alt-svc')
            http3['alt_svc'] = alt_svc
            if alt_svc is None:
                http3['advertised'] = False
            else:
                http3['advertised'] = ('h3' in alt_svc.lower())
        except Exception as e:
            http3['advertised'] = None
            http3['error'] = str(e)

        log_tool_usage(
            request=request,
            tool_name='tls-check',
            status_label='success',
            http_status=status.HTTP_200_OK,
            started_at=started_at,
            extra={'host': host},
        )

        return Response(
            {
                'input': raw_target,
                'host': host,
                'port': 443,
                'leaf_cert': leaf,
                'negotiated': {
                    'tls_version': main.get('negotiated_tls_version'),
                    'alpn_selected': main.get('alpn_selected'),
                    'cipher': main.get('cipher'),
                },
                'verification': verify,
                'protocol_tests': protocol_tests,
                'http3': http3,
            }
        )


def _parse_hsts(hsts_value: str | None) -> dict:
    if not hsts_value:
        return {'present': False}

    v = str(hsts_value)
    low = v.lower()
    max_age = None
    try:
        m = re.search(r"max-age\s*=\s*(\d+)", low)
        if m:
            max_age = int(m.group(1))
    except Exception:
        max_age = None

    return {
        'present': True,
        'value': v,
        'max_age': max_age,
        'include_subdomains': ('includesubdomains' in low),
        'preload': ('preload' in low),
    }


def _parse_csp(csp_value: str | None) -> dict:
    if not csp_value:
        return {'present': False}
    v = str(csp_value)
    low = v.lower()
    return {
        'present': True,
        'value': v,
        'has_unsafe_inline': ("'unsafe-inline'" in low),
        'has_unsafe_eval': ("'unsafe-eval'" in low),
        'has_wildcard_source': (' *' in low) or low.startswith('*') or ('*;' in low),
    }


class HeaderHardeningView(APIView):
    """Check common security headers (HSTS/CSP/XFO/XCTO/etc) on the final response."""

    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        started_at = time.time()

        try:
            url = _validate_public_http_url(request.data.get('url', '') or request.data.get('target', '') or '')
        except Exception as e:
            log_tool_usage(
                request=request,
                tool_name='header-hardening',
                status_label='failed',
                http_status=status.HTTP_400_BAD_REQUEST,
                started_at=started_at,
                error=e,
            )
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            max_hops = int(request.data.get('max_hops') or 8)
        except Exception:
            max_hops = 8
        max_hops = max(1, min(max_hops, 12))

        session = requests.Session()
        session.headers.update({'User-Agent': 'ExpectException Header Hardening'})

        hops = []
        current = url
        final_resp = None

        try:
            for _ in range(max_hops):
                hop_started = time.time()
                resp = session.request('GET', current, allow_redirects=False, timeout=8)
                hop_ms = int((time.time() - hop_started) * 1000)

                headers_lc = _normalize_headers(resp.headers)
                location = headers_lc.get('location')
                hops.append(
                    {
                        'url': current,
                        'status': resp.status_code,
                        'time_ms': hop_ms,
                        'location': location,
                    }
                )

                final_resp = resp
                if resp.status_code in (301, 302, 303, 307, 308) and location:
                    nxt = urljoin(current, location)
                    current = _validate_public_http_url(nxt)
                    continue
                break

            if final_resp is None:
                raise RuntimeError('No response')

            headers = _normalize_headers(final_resp.headers)

            picked = {}
            wanted = [
                'strict-transport-security',
                'content-security-policy',
                'content-security-policy-report-only',
                'x-frame-options',
                'x-content-type-options',
                'referrer-policy',
                'permissions-policy',
                'cross-origin-opener-policy',
                'cross-origin-resource-policy',
                'cross-origin-embedder-policy',
                'access-control-allow-origin',
                'access-control-allow-credentials',
                'access-control-allow-methods',
                'access-control-allow-headers',
                'server',
                'date',
                'content-type',
            ]
            for k in wanted:
                v = headers.get(k)
                if v:
                    picked[k] = v

            is_https = (urlparse(current).scheme == 'https')
            hsts = _parse_hsts(headers.get('strict-transport-security') if is_https else None)
            csp = _parse_csp(headers.get('content-security-policy'))
            csp_ro = _parse_csp(headers.get('content-security-policy-report-only'))

            checks = []

            # HSTS
            if not is_https:
                checks.append({'id': 'hsts', 'status': 'info', 'title': 'HSTS', 'details': 'URL is not HTTPS; HSTS applies to HTTPS only.'})
            elif not hsts.get('present'):
                checks.append({'id': 'hsts', 'status': 'warn', 'title': 'HSTS', 'details': 'Missing Strict-Transport-Security header.'})
            else:
                max_age = hsts.get('max_age')
                if max_age is None or max_age < 15552000:
                    checks.append({'id': 'hsts', 'status': 'warn', 'title': 'HSTS', 'details': f"Present but max-age is low ({max_age}). Consider >= 15552000."})
                else:
                    checks.append({'id': 'hsts', 'status': 'pass', 'title': 'HSTS', 'details': 'Present with a reasonable max-age.'})

            # CSP
            if csp.get('present'):
                if csp.get('has_unsafe_inline') or csp.get('has_unsafe_eval'):
                    checks.append({'id': 'csp', 'status': 'warn', 'title': 'CSP', 'details': 'CSP present but contains unsafe-* directives.'})
                else:
                    checks.append({'id': 'csp', 'status': 'pass', 'title': 'CSP', 'details': 'CSP present.'})
            elif csp_ro.get('present'):
                checks.append({'id': 'csp', 'status': 'info', 'title': 'CSP', 'details': 'CSP is report-only (not enforced).'} )
            else:
                checks.append({'id': 'csp', 'status': 'warn', 'title': 'CSP', 'details': 'Missing Content-Security-Policy header.'})

            # XFO
            xfo = headers.get('x-frame-options')
            if not xfo:
                checks.append({'id': 'xfo', 'status': 'warn', 'title': 'X-Frame-Options', 'details': 'Missing X-Frame-Options (consider SAMEORIGIN).'} )
            else:
                checks.append({'id': 'xfo', 'status': 'pass', 'title': 'X-Frame-Options', 'details': f"Present: {xfo}"})

            # XCTO
            xcto = headers.get('x-content-type-options')
            if not xcto:
                checks.append({'id': 'xcto', 'status': 'warn', 'title': 'X-Content-Type-Options', 'details': 'Missing X-Content-Type-Options (consider nosniff).'} )
            else:
                checks.append({'id': 'xcto', 'status': 'pass', 'title': 'X-Content-Type-Options', 'details': f"Present: {xcto}"})

            # Referrer Policy
            rp = headers.get('referrer-policy')
            if not rp:
                checks.append({'id': 'refpol', 'status': 'info', 'title': 'Referrer-Policy', 'details': 'Missing Referrer-Policy (consider strict-origin-when-cross-origin).'} )
            else:
                checks.append({'id': 'refpol', 'status': 'pass', 'title': 'Referrer-Policy', 'details': f"Present: {rp}"})

            log_tool_usage(
                request=request,
                tool_name='header-hardening',
                status_label='success',
                http_status=status.HTTP_200_OK,
                started_at=started_at,
                extra={'hop_count': len(hops)},
            )

            return Response(
                {
                    'input_url': url,
                    'final_url': current,
                    'final_status': getattr(final_resp, 'status_code', None),
                    'hops': hops,
                    'headers': picked,
                    'parsed': {
                        'hsts': hsts,
                        'csp': csp,
                        'csp_report_only': csp_ro,
                    },
                    'checks': checks,
                }
            )

        except Exception as e:
            logger.exception(f"Header hardening error: {e}")
            log_tool_usage(
                request=request,
                tool_name='header-hardening',
                status_label='failed',
                http_status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                started_at=started_at,
                error=e,
            )
            return Response({'error': 'Failed to check headers'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CorsPreflightView(APIView):
    """Simulate a CORS preflight (OPTIONS) request and return parsed CORS headers."""

    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        started_at = time.time()
        target = (request.data.get('url') or request.data.get('target') or '').strip()
        if not target:
            return Response({'error': 'Target URL is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            url = _validate_public_http_url(target)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        origin = request.data.get('origin') or 'https://example.com'
        req_method = request.data.get('method') or 'POST'
        req_headers = request.data.get('headers') or []

        session = requests.Session()
        session.headers.update({'User-Agent': 'ExpectException CORS Preflight'})

        try:
            resp = session.options(url, allow_redirects=False, timeout=8)
            headers = _normalize_headers(resp.headers)
            cors = {
                'allow_origin': headers.get('access-control-allow-origin'),
                'allow_methods': headers.get('access-control-allow-methods'),
                'allow_headers': headers.get('access-control-allow-headers'),
                'allow_credentials': headers.get('access-control-allow-credentials'),
                'max_age': headers.get('access-control-max-age'),
            }

            return Response({'status': resp.status_code, 'headers': headers, 'cors': cors})
        except Exception as e:
            logger.exception(f"CORS preflight failed: {e}")
            return Response({'error': 'CORS request failed', 'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class WhoisRdapView(APIView):
    """Return WHOIS (when available) and RDAP information for a domain using public RDAP proxy."""

    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        started_at = time.time()
        raw = (request.data.get('domain') or request.data.get('url') or '').strip()
        if '://' in raw:
            try:
                raw = urlparse(raw).hostname or raw
            except Exception:
                pass
        domain = (raw or '').strip().strip('.')
        if not domain:
            return Response({'error': 'Domain is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Use rdap.org proxy as a generic RDAP endpoint
        rdap_url = f'https://rdap.org/domain/{domain}'
        out = {'domain': domain}
        try:
            r = requests.get(rdap_url, timeout=8)
            out['rdap'] = r.json() if r.status_code == 200 else {'error': f'Status {r.status_code}'}
        except Exception as e:
            out['rdap'] = {'error': str(e)}

        # Attempt a whois lookup if python-whois is available
        try:
            import whois as pywhois  # type: ignore
            try:
                w = pywhois.whois(domain)
                out['whois'] = {k: getattr(w, k, None) for k in ('domain_name', 'registrar', 'creation_date', 'expiration_date', 'name_servers', 'emails')}
            except Exception as e:
                out['whois'] = {'error': str(e)}
        except Exception:
            out['whois'] = {'error': 'whois library not installed'}

        return Response(out)


class SitemapRobotsView(APIView):
    """Fetch robots.txt and referenced sitemaps and validate a sample of sitemap URLs."""

    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        started_at = time.time()
        target = (request.data.get('url') or request.data.get('domain') or '').strip()
        if not target:
            return Response({'error': 'Target is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            base = _validate_public_http_url(target if '://' in target else f'https://{target}/')
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        session = requests.Session()
        session.headers.update({'User-Agent': 'ExpectException Sitemap Validator'})

        parsed = urlparse(base)
        origin = f"{parsed.scheme}://{parsed.hostname}"

        results = {'robots': None, 'sitemaps': [], 'sample_checks': []}

        try:
            robots_url = urljoin(origin, '/robots.txt')
            r = session.get(robots_url, timeout=6)
            robots_text = r.text if r.status_code == 200 else None
            results['robots'] = {'status': r.status_code, 'text': robots_text}

            sitemaps = []
            if robots_text:
                for line in robots_text.splitlines():
                    if line.strip().lower().startswith('sitemap:'):
                        sitemaps.append(line.split(':', 1)[1].strip())

            # fallback to /sitemap.xml
            if not sitemaps:
                sitemaps = [urljoin(origin, '/sitemap.xml')]

            # Parse each sitemap (only first-level sitemap index support)
            import xml.etree.ElementTree as ET
            urls = []
            for sm in sitemaps:
                try:
                    sr = session.get(sm, timeout=8)
                    if sr.status_code != 200:
                        results['sitemaps'].append({'url': sm, 'status': sr.status_code})
                        continue
                    body = sr.content
                    root = ET.fromstring(body)
                    # sitemapindex or urlset
                    for child in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc'):
                        urls.append(child.text)
                    results['sitemaps'].append({'url': sm, 'status': 200, 'found': len(urls)})
                except Exception as e:
                    results['sitemaps'].append({'url': sm, 'error': str(e)})

            # Check up to 10 URLs
            sample = urls[:10]
            for u in sample:
                try:
                    rr = session.head(u, allow_redirects=True, timeout=6)
                    results['sample_checks'].append({'url': u, 'status': rr.status_code})
                except Exception as e:
                    results['sample_checks'].append({'url': u, 'error': str(e)})

            return Response(results)
        except Exception as e:
            logger.exception(f"Sitemap/robots error: {e}")
            return Response({'error': 'Failed to validate sitemap/robots', 'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PortCheckerView(APIView):
    """Simple TCP connect port checker for common ports with safe limits."""

    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        started_at = time.time()
        target = (request.data.get('host') or request.data.get('url') or request.data.get('domain') or '').strip()
        if not target:
            return Response({'error': 'Host is required'}, status=status.HTTP_400_BAD_REQUEST)

        # extract hostname
        if '://' in target:
            try:
                target = urlparse(target).hostname or target
            except Exception:
                pass

        # default common ports
        ports = request.data.get('ports') or [80, 443, 22, 21, 25, 3306, 5432, 6379, 8080]
        try:
            ports = [int(p) for p in ports]
        except Exception:
            ports = [80, 443]

        try:
            host = _validate_public_hostname(target, 443)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        out = []
        for p in ports[:20]:
            try:
                s = socket.create_connection((host, p), timeout=2)
                s.close()
                out.append({'port': p, 'open': True})
            except Exception:
                out.append({'port': p, 'open': False})

        return Response({'host': host, 'ports': out})


class PerformanceSnapshotView(APIView):
    """Take a quick performance snapshot: TTFB, total size, compression, cache headers."""

    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        target = (request.data.get('url') or request.data.get('target') or '').strip()
        if not target:
            return Response({'error': 'Target is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            url = _validate_public_http_url(target)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        session = requests.Session()
        session.headers.update({'User-Agent': 'ExpectException Perf Snapshot'})

        try:
            start = time.time()
            resp = session.get(url, stream=True, timeout=12)
            ttfb = None
            # measure time to first chunk
            try:
                first = next(resp.iter_content(1))
                ttfb = int((time.time() - start) * 1000)
            except StopIteration:
                ttfb = int((time.time() - start) * 1000)
            except Exception:
                ttfb = None

            # content length
            content_len = resp.headers.get('content-length')
            size = int(content_len) if content_len and content_len.isdigit() else None

            headers = _normalize_headers(resp.headers)

            perf = {
                'url': url,
                'status': resp.status_code,
                'ttfb_ms': ttfb,
                'content_length': size,
                'content_encoding': headers.get('content-encoding'),
                'cache_control': headers.get('cache-control'),
                'vary': headers.get('vary'),
            }
            return Response(perf)
        except Exception as e:
            logger.exception(f"Performance snapshot failed: {e}")
            return Response({'error': 'Performance check failed', 'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CacheKeyDebuggerView(APIView):
    """Inspect Vary/Cache-Control and provide simple cache key suggestions."""

    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        target = (request.data.get('url') or request.data.get('target') or '').strip()
        if not target:
            return Response({'error': 'Target is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            url = _validate_public_http_url(target)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        session = requests.Session()
        session.headers.update({'User-Agent': 'ExpectException Cache Debugger'})

        try:
            resp = session.get(url, timeout=10)
            headers = _normalize_headers(resp.headers)
            vary = headers.get('vary', '')
            cache_control = headers.get('cache-control', '')

            suggestions = []
            if 'authorization' in vary.lower():
                suggestions.append('Vary includes Authorization — responses may be per-user; consider signed cookies or cache keys.')
            if 'accept-encoding' in vary.lower() and headers.get('content-encoding'):
                suggestions.append('Vary on Accept-Encoding is present; ensure your CDN caches compressed variants separately.')
            if not cache_control:
                suggestions.append('No Cache-Control header — responses may not be cacheable.')
            else:
                if 'no-store' in cache_control.lower() or 'private' in cache_control.lower():
                    suggestions.append('Cache-Control prevents shared caching (private/no-store).')
                else:
                    suggestions.append('Cache-Control allows shared caching; verify max-age and s-maxage.')

            return Response({'url': url, 'headers': headers, 'suggestions': suggestions})
        except Exception as e:
            logger.exception(f"Cache debugger failed: {e}")
            return Response({'error': 'Cache debug failed', 'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PingTracerouteView(APIView):
    """Perform a safe TCP ping and a best-effort traceroute using system traceroute (if available).

    This is limited: traceroute uses subprocess and is restricted to the validated host.
    """

    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        target = (request.data.get('host') or request.data.get('url') or request.data.get('domain') or '').strip()
        if not target:
            return Response({'error': 'Host is required'}, status=status.HTTP_400_BAD_REQUEST)

        if '://' in target:
            try:
                target = urlparse(target).hostname or target
            except Exception:
                pass

        try:
            host = _validate_public_hostname(target, 443)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # TCP ping (connect to 443)
        ping_result = {'connect_443': False, 'rtt_ms': None}
        try:
            start = time.time()
            s = socket.create_connection((host, 443), timeout=3)
            rtt = int((time.time() - start) * 1000)
            ping_result['connect_443'] = True
            ping_result['rtt_ms'] = rtt
            s.close()
        except Exception:
            ping_result['connect_443'] = False

        # traceroute via system 'traceroute' if present
        trace = {'available': False, 'output': None}
        try:
            import shutil, subprocess
            if shutil.which('traceroute'):
                trace['available'] = True
                cmd = ['traceroute', '-n', '-w', '1', '-q', '1', '-m', '16', host]
                p = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
                trace['output'] = p.stdout
            else:
                trace['available'] = False
        except Exception as e:
            trace['available'] = True
            trace['output'] = str(e)

        return Response({'host': host, 'ping': ping_result, 'traceroute': trace})


class SubdomainEnumView(APIView):
    """Passive subdomain enumeration using crt.sh and basic DNS A lookup for discovered names."""

    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        raw = (request.data.get('domain') or request.data.get('url') or '').strip()
        if '://' in raw:
            try:
                raw = urlparse(raw).hostname or raw
            except Exception:
                pass
        domain = (raw or '').strip().strip('.')
        if not domain:
            return Response({'error': 'Domain is required'}, status=status.HTTP_400_BAD_REQUEST)

        results = {'domain': domain, 'crt': [], 'resolved': {}}
        try:
            # Query crt.sh JSON endpoint
            q = f"https://crt.sh/?q=%25.{domain}&output=json"
            r = requests.get(q, timeout=10)
            if r.status_code == 200:
                try:
                    data = r.json()
                    names = set()
                    for item in data:
                        name = item.get('name_value')
                        if name:
                            for n in str(name).split('\n'):
                                n = n.strip()
                                if n:
                                    names.add(n.lower())
                    results['crt'] = sorted(list(names))
                except Exception:
                    results['crt'] = []
            else:
                results['crt'] = []

            # Resolve up to 50 names
            import dns.resolver
            resolver = dns.resolver.Resolver()
            for name in list(results['crt'])[:50]:
                try:
                    answers = resolver.resolve(name, 'A')
                    results['resolved'][name] = [a.to_text() for a in answers]
                except Exception:
                    try:
                        answers = resolver.resolve(name, 'CNAME')
                        results['resolved'][name] = [str(a) for a in answers]
                    except Exception:
                        results['resolved'][name] = []

            return Response(results)
        except Exception as e:
            logger.exception(f"Subdomain enumeration failed: {e}")
            return Response({'error': 'Subdomain enumeration failed', 'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _normalize_headers(headers) -> dict:
    try:
        items = headers.items()
    except Exception:
        return {}

    out = {}
    for k, v in items:
        if k is None:
            continue
        out[str(k).lower()] = str(v)
    return out


def _pick_headers(headers_lc: dict) -> dict:
    # Focus on the headers you asked for (CSP/CORS/cache/HSTS) + a few debug ones.
    wanted = [
        'strict-transport-security',
        'content-security-policy',
        'access-control-allow-origin',
        'access-control-allow-credentials',
        'access-control-allow-methods',
        'access-control-allow-headers',
        'access-control-expose-headers',
        'cache-control',
        'pragma',
        'expires',
        'etag',
        'last-modified',
        'content-type',
        'content-length',
        'server',
        'date',
        'location',
    ]
    out = {}
    for k in wanted:
        v = headers_lc.get(k)
        if v:
            out[k] = v
    return out


class RedirectInspectorView(APIView):
    """Follow redirect chain (301/302/etc) and return relevant headers."""

    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        started_at = time.time()

        try:
            url = _validate_public_http_url(request.data.get('url', ''))
        except Exception as e:
            log_tool_usage(
                request=request,
                tool_name='redirect-inspector',
                status_label='failed',
                http_status=status.HTTP_400_BAD_REQUEST,
                started_at=started_at,
                error=e,
            )
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            max_hops = int(request.data.get('max_hops') or 10)
        except Exception:
            max_hops = 10
        max_hops = max(1, min(max_hops, 15))

        hops = []
        current = url
        method = 'GET'

        try:
            session = requests.Session()
            session.headers.update({'User-Agent': 'ExpectException Redirect Inspector'})

            final_url = current
            for _ in range(max_hops):
                hop_started = time.time()
                resp = session.request(method, current, allow_redirects=False, timeout=8)
                hop_ms = int((time.time() - hop_started) * 1000)

                headers_lc = _normalize_headers(resp.headers)
                location = headers_lc.get('location')
                hop = {
                    'url': current,
                    'status': resp.status_code,
                    'time_ms': hop_ms,
                    'location': location,
                    'headers': _pick_headers(headers_lc),
                }
                hops.append(hop)
                final_url = current

                if resp.status_code in (301, 302, 303, 307, 308) and location:
                    next_url = urljoin(current, location)
                    current = _validate_public_http_url(next_url)
                    # Per RFC: 303 forces GET, and many clients switch to GET on 301/302 for POST.
                    # We only ever issue GETs from this tool for safety/consistency.
                    method = 'GET'
                    continue

                break

            final_headers = hops[-1]['headers'] if hops else {}

            log_tool_usage(
                request=request,
                tool_name='redirect-inspector',
                status_label='success',
                http_status=status.HTTP_200_OK,
                started_at=started_at,
                extra={'hop_count': len(hops)},
            )

            return Response(
                {
                    'input_url': url,
                    'hops': hops,
                    'final_url': final_url if hops else url,
                    'final_status': hops[-1]['status'] if hops else None,
                    'final_headers': final_headers,
                }
            )
        except Exception as e:
            logger.exception(f"Redirect inspector error: {e}")
            log_tool_usage(
                request=request,
                tool_name='redirect-inspector',
                status_label='failed',
                http_status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                started_at=started_at,
                error=e,
            )
            return Response({'error': 'Failed to inspect URL'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DnsLookupView(APIView):
    """Lookup DNS records across multiple resolvers for basic propagation debugging."""

    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        started_at = time.time()
        raw = (request.data.get('domain') or '').strip()

        # Accept pasted URL too.
        if '://' in raw:
            try:
                raw = urlparse(raw).hostname or raw
            except Exception:
                pass

        domain = (raw or '').strip().strip('.')

        # Normalize: accept unicode (IDN) and convert to ASCII (punycode) for DNS.
        try:
            # requests dependency chain typically provides idna
            import idna
            ascii_domain = idna.encode(domain, uts46=True).decode('ascii')
        except Exception:
            ascii_domain = domain

        ascii_domain = (ascii_domain or '').strip().strip('.').lower()

        if not ascii_domain or len(ascii_domain) > 253 or not re.fullmatch(r"[a-z0-9._-]+", ascii_domain):
            log_tool_usage(
                request=request,
                tool_name='dns-lookup',
                status_label='failed',
                http_status=status.HTTP_400_BAD_REQUEST,
                started_at=started_at,
                error=ValueError('Invalid domain'),
            )
            return Response({'error': 'Invalid domain'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            import dns.resolver
        except Exception as e:
            log_tool_usage(
                request=request,
                tool_name='dns-lookup',
                status_label='failed',
                http_status=status.HTTP_503_SERVICE_UNAVAILABLE,
                started_at=started_at,
                error=e,
            )
            return Response({'error': 'DNS lookup service not available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        resolvers = {
            'cloudflare_1.1.1.1': ['1.1.1.1'],
            'google_8.8.8.8': ['8.8.8.8'],
            'quad9_9.9.9.9': ['9.9.9.9'],
        }

        record_types = ['A', 'AAAA', 'CNAME', 'MX', 'TXT']
        results = {}
        meta = {'errors': {}}

        for resolver_name, nameservers in resolvers.items():
            r = dns.resolver.Resolver(configure=False)
            r.nameservers = nameservers
            r.lifetime = 4.0
            r.timeout = 2.0

            per = {}
            per_errors = {}
            for rt in record_types:
                try:
                    answers = r.resolve(ascii_domain, rt)
                    if rt in ('A', 'AAAA'):
                        per[rt] = [str(a) for a in answers]
                    elif rt == 'CNAME':
                        per[rt] = [str(a.target).rstrip('.') for a in answers]
                    elif rt == 'MX':
                        mx = []
                        for a in answers:
                            exchange = str(a.exchange)
                            exchange_stripped = exchange.rstrip('.')
                            mx.append(
                                {
                                    'preference': int(a.preference),
                                    # A "null MX" can be '.' (RFC 7505). Preserve it.
                                    'exchange': exchange_stripped if exchange_stripped else exchange,
                                }
                            )
                        per[rt] = mx
                    elif rt == 'TXT':
                        txt = []
                        for a in answers:
                            strings = getattr(a, 'strings', None)
                            if strings is None:
                                txt.append(str(a))
                                continue
                            parts = []
                            for b in strings:
                                try:
                                    parts.append(b.decode('utf-8', 'ignore'))
                                except Exception:
                                    parts.append(str(b))
                            txt.append(''.join(parts))
                        per[rt] = txt
                except Exception as e:
                    per[rt] = []
                    # Keep the errors small/clean for UI.
                    per_errors[rt] = e.__class__.__name__

            results[resolver_name] = per
            meta['errors'][resolver_name] = per_errors

        diagnosis = []
        # Basic diagnosis based on presence across resolvers
        any_a = any(results[r].get('A') for r in results)
        any_aaaa = any(results[r].get('AAAA') for r in results)
        any_cname = any(results[r].get('CNAME') for r in results)
        any_mx = any(results[r].get('MX') for r in results)

        if not any_a and not any_aaaa and not any_cname:
            diagnosis.append('No A/AAAA/CNAME records found on common resolvers.')
        if any_cname and not any_a and not any_aaaa:
            diagnosis.append('CNAME exists but A/AAAA records are not present on these resolvers (possible propagation delay or misconfiguration).')
        if not any_mx:
            diagnosis.append('No MX record found (email delivery will fail unless handled by provider).')

        log_tool_usage(
            request=request,
            tool_name='dns-lookup',
            status_label='success',
            http_status=status.HTTP_200_OK,
            started_at=started_at,
            extra={'domain': ascii_domain},
        )
        return Response({'domain': ascii_domain, 'results': results, 'diagnosis': diagnosis, 'meta': meta})


class MarkdownPreviewView(APIView):
    """Convert Markdown to HTML"""
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]
    
    def post(self, request):
        markdown_text = request.data.get('markdown', '')
        
        if not markdown_text:
            return Response({'error': 'Markdown text required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            import markdown
            html = markdown.markdown(markdown_text, extensions=['tables', 'fenced_code', 'codehilite'])
            return Response({'html': html})
        except ImportError:
            # Fallback: basic conversion for environments without the markdown package
            import re
            html = markdown_text
            html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
            html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
            html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
            html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
            html = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html)
            html = re.sub(r'\n', r'<br>', html)
            return Response({'html': html})


class JwtVerifyView(APIView):
    """Decode and optionally verify JWTs (HS/RS/ES)."""

    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        started_at = time.time()

        token = (request.data.get('token') or '').strip()
        jwks_url = (request.data.get('jwks_url') or '').strip() or None
        secret = request.data.get('secret')
        algorithms = request.data.get('algorithms') or None
        verify = request.data.get('verify') if 'verify' in request.data else True
        leeway = int(request.data.get('leeway') or 0)

        if not token:
            log_tool_usage(
                request=request,
                tool_name='jwt-verify',
                status_label='failed',
                http_status=status.HTTP_400_BAD_REQUEST,
                started_at=started_at,
                error=ValueError('Token is required'),
            )
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            import jwt
            from jwt import PyJWKClient
        except Exception as e:
            log_tool_usage(
                request=request,
                tool_name='jwt-verify',
                status_label='failed',
                http_status=status.HTTP_503_SERVICE_UNAVAILABLE,
                started_at=started_at,
                error=e,
            )
            return Response({'error': 'PyJWT is not available on the server. Install PyJWT>=2.0'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        result = {'header': None, 'payload': None, 'verified': None, 'error': None}

        try:
            header = jwt.get_unverified_header(token)
            result['header'] = header
        except Exception as e:
            result['error'] = f'Invalid token header: {e}'
            log_tool_usage(
                request=request,
                tool_name='jwt-verify',
                status_label='failed',
                http_status=status.HTTP_400_BAD_REQUEST,
                started_at=started_at,
                error=e,
            )
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        try:
            alg = header.get('alg')
            algs = None
            if algorithms:
                if isinstance(algorithms, str):
                    algs = [a.strip() for a in algorithms.split(',') if a.strip()]
                elif isinstance(algorithms, (list, tuple)):
                    algs = list(algorithms)

            # If verification disabled, return decoded payload without checking signature
            if not verify:
                payload = jwt.decode(token, options={"verify_signature": False, "verify_exp": False})
                result['payload'] = payload
                result['verified'] = None
                log_tool_usage(
                    request=request,
                    tool_name='jwt-verify',
                    status_label='success',
                    http_status=status.HTTP_200_OK,
                    started_at=started_at,
                    extra={'verified': None},
                )
                return Response(result)

            # RS/ES using JWKS
            if jwks_url and alg and (alg.startswith('RS') or alg.startswith('ES')):
                try:
                    jwk_client = PyJWKClient(jwks_url)
                    signing_key = jwk_client.get_signing_key_from_jwt(token)
                    pubkey = signing_key.key
                    payload = jwt.decode(token, key=pubkey, algorithms=algs or [alg], leeway=leeway)
                    result['payload'] = payload
                    result['verified'] = True
                    log_tool_usage(
                        request=request,
                        tool_name='jwt-verify',
                        status_label='success',
                        http_status=status.HTTP_200_OK,
                        started_at=started_at,
                        extra={'alg': alg, 'jwks_url': jwks_url},
                    )
                    return Response(result)
                except jwt.ExpiredSignatureError as e:
                    result['error'] = 'Token expired'
                    result['verified'] = False
                    log_tool_usage(request=request, tool_name='jwt-verify', status_label='failed', http_status=status.HTTP_200_OK, started_at=started_at, error=e)
                    return Response(result)
                except Exception as e:
                    result['error'] = str(e)
                    result['verified'] = False
                    log_tool_usage(request=request, tool_name='jwt-verify', status_label='failed', http_status=status.HTTP_400_BAD_REQUEST, started_at=started_at, error=e)
                    return Response(result, status=status.HTTP_400_BAD_REQUEST)

            # HS (HMAC) using provided secret
            if secret and alg and alg.startswith('HS'):
                try:
                    payload = jwt.decode(token, key=secret, algorithms=algs or [alg], leeway=leeway)
                    result['payload'] = payload
                    result['verified'] = True
                    log_tool_usage(request=request, tool_name='jwt-verify', status_label='success', http_status=status.HTTP_200_OK, started_at=started_at, extra={'alg': alg})
                    return Response(result)
                except jwt.ExpiredSignatureError as e:
                    result['error'] = 'Token expired'
                    result['verified'] = False
                    log_tool_usage(request=request, tool_name='jwt-verify', status_label='failed', http_status=status.HTTP_200_OK, started_at=started_at, error=e)
                    return Response(result)
                except Exception as e:
                    result['error'] = str(e)
                    result['verified'] = False
                    log_tool_usage(request=request, tool_name='jwt-verify', status_label='failed', http_status=status.HTTP_400_BAD_REQUEST, started_at=started_at, error=e)
                    return Response(result, status=status.HTTP_400_BAD_REQUEST)

            # No verification path available
            payload = jwt.decode(token, options={"verify_signature": False})
            result['payload'] = payload
            result['verified'] = False
            result['error'] = 'No verification performed. Provide `secret` for HMAC or `jwks_url` for RSA/EC verification.'
            log_tool_usage(request=request, tool_name='jwt-verify', status_label='success', http_status=status.HTTP_200_OK, started_at=started_at, extra={'verified': False})
            return Response(result)

        except Exception as e:
            logger.exception(f"JWT verify error: {e}")
            result['error'] = str(e)
            result['verified'] = False
            log_tool_usage(request=request, tool_name='jwt-verify', status_label='failed', http_status=status.HTTP_500_INTERNAL_SERVER_ERROR, started_at=started_at, error=e)
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class WebhookCreateView(APIView):
    """Create an ephemeral webhook endpoint that collects incoming requests."""

    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        started_at = time.time()
        name = (request.data.get('name') or '').strip()
        ttl = int(request.data.get('ttl') or 3600)
        max_requests = int(request.data.get('max_requests') or 100)

        try:
            expires_at = datetime.datetime.utcnow() + datetime.timedelta(seconds=max(60, min(ttl, 60 * 60 * 24)))
            secret = request.data.get('secret') or ''
            ep = WebhookEndpoint.objects.create(name=name, expires_at=expires_at, secret=secret, max_requests=max_requests)

            # Build receiver URL (relative to site)
            receiver_path = f"/api/services/webhook/{ep.id}/"
            log_tool_usage(request=request, tool_name='webhook-create', status_label='success', http_status=status.HTTP_200_OK, started_at=started_at, extra={'endpoint': str(ep.id)})
            return Response({'id': str(ep.id), 'receiver_path': receiver_path, 'expires_at': expires_at.isoformat()})
        except Exception as e:
            logger.exception(f"Webhook create error: {e}")
            log_tool_usage(request=request, tool_name='webhook-create', status_label='failed', http_status=status.HTTP_500_INTERNAL_SERVER_ERROR, started_at=started_at, error=e)
            return Response({'error': 'Failed to create webhook endpoint'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class WebhookReceiverView(View):
    """Receive external webhook requests and store them against an endpoint."""

    def dispatch(self, request, endpoint_id=None, *args, **kwargs):
        started_at = time.time()
        try:
            ep = WebhookEndpoint.objects.filter(id=endpoint_id).first()
            if not ep:
                return Response({'error': 'Endpoint not found'}, status=status.HTTP_404_NOT_FOUND)
            if ep.expires_at and datetime.datetime.utcnow() > ep.expires_at.replace(tzinfo=None):
                return Response({'error': 'Endpoint expired'}, status=status.HTTP_410_GONE)

            # Count requests
            if ep.requests.count() >= (ep.max_requests or 100):
                return Response({'error': 'Endpoint request limit reached'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

            # Capture headers/body
            hdrs = dict(request.headers) if hasattr(request, 'headers') else {k: v for k, v in request.META.items()}
            try:
                body = request.body.decode('utf-8', 'replace')
            except Exception:
                body = str(request.body)

            remote = request.META.get('REMOTE_ADDR')

            wr = WebhookRequest.objects.create(endpoint=ep, method=request.method, path=request.get_full_path(), headers=hdrs, body=body, remote_addr=remote)

            log_tool_usage(request=request, tool_name='webhook-receive', status_label='success', http_status=status.HTTP_200_OK, started_at=started_at, extra={'endpoint': str(ep.id), 'request_id': str(wr.id)})

            # Respond with a small JSON ack
            from django.http import JsonResponse
            return JsonResponse({'status': 'ok', 'request_id': str(wr.id)})

        except Exception as e:
            logger.exception(f"Webhook receiver error: {e}")
            log_tool_usage(request=request, tool_name='webhook-receive', status_label='failed', http_status=status.HTTP_500_INTERNAL_SERVER_ERROR, started_at=started_at, error=e)
            from django.http import JsonResponse
            return JsonResponse({'error': 'Failed to record request'}, status=500)


class WebhookRequestsListView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def get(self, request, endpoint_id=None):
        started_at = time.time()
        try:
            ep = WebhookEndpoint.objects.filter(id=endpoint_id).first()
            if not ep:
                return Response({'error': 'Endpoint not found'}, status=status.HTTP_404_NOT_FOUND)

            items = []
            for r in ep.requests.all()[:200]:
                items.append({'id': str(r.id), 'method': r.method, 'path': r.path, 'created_at': r.created_at.isoformat(), 'remote_addr': r.remote_addr})

            log_tool_usage(request=request, tool_name='webhook-list', status_label='success', http_status=status.HTTP_200_OK, started_at=started_at, extra={'endpoint': str(ep.id)})
            return Response({'endpoint': str(ep.id), 'requests': items})
        except Exception as e:
            logger.exception(f"Webhook list error: {e}")
            log_tool_usage(request=request, tool_name='webhook-list', status_label='failed', http_status=status.HTTP_500_INTERNAL_SERVER_ERROR, started_at=started_at, error=e)
            return Response({'error': 'Failed to list requests'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class WebhookReplayView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request, endpoint_id=None, request_id=None):
        started_at = time.time()
        target = (request.data.get('target') or '').strip()
        if not target:
            return Response({'error': 'Target URL required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            ep = WebhookEndpoint.objects.filter(id=endpoint_id).first()
            if not ep:
                return Response({'error': 'Endpoint not found'}, status=status.HTTP_404_NOT_FOUND)

            wr = WebhookRequest.objects.filter(id=request_id, endpoint=ep).first()
            if not wr:
                return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)

            # Validate target is public http(s)
            try:
                target_valid = _validate_public_http_url(target)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

            # Replay
            resp = requests.request(wr.method, target_valid, headers=wr.headers, data=wr.body.encode('utf-8') if isinstance(wr.body, str) else wr.body, timeout=10)
            log_tool_usage(request=request, tool_name='webhook-replay', status_label='success', http_status=resp.status_code, started_at=started_at, extra={'endpoint': str(ep.id), 'request_id': str(wr.id), 'target': target_valid})
            return Response({'status': 'ok', 'target_status': resp.status_code, 'target_reason': resp.reason})
        except Exception as e:
            logger.exception(f"Webhook replay error: {e}")
            log_tool_usage(request=request, tool_name='webhook-replay', status_label='failed', http_status=status.HTTP_500_INTERNAL_SERVER_ERROR, started_at=started_at, error=e)
            return Response({'error': 'Replay failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class WebhookRequestDetailView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def get(self, request, endpoint_id=None, request_id=None):
        started_at = time.time()
        try:
            wr = WebhookRequest.objects.filter(id=request_id, endpoint__id=endpoint_id).first()
            if not wr:
                return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)

            data = {
                'id': str(wr.id),
                'method': wr.method,
                'path': wr.path,
                'headers': wr.headers,
                'body': wr.body,
                'remote_addr': wr.remote_addr,
                'created_at': wr.created_at.isoformat(),
            }

            log_tool_usage(request=request, tool_name='webhook-request-detail', status_label='success', http_status=status.HTTP_200_OK, started_at=started_at, extra={'endpoint': str(endpoint_id), 'request_id': str(request_id)})
            return Response(data)
        except Exception as e:
            logger.exception(f"Webhook request detail error: {e}")
            log_tool_usage(request=request, tool_name='webhook-request-detail', status_label='failed', http_status=status.HTTP_500_INTERNAL_SERVER_ERROR, started_at=started_at, error=e)
            return Response({'error': 'Failed to fetch request'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        


import concurrent.futures
import dns.resolver

class WebsiteDiagnosticsView(APIView):
    """
    Unified diagnostics view that runs multiple checks in parallel:
    - Redirect Inspector
    - DNS Lookup
    - TLS Check
    - Header Hardening
    - Performance Snapshot
    - Port Check
    - Sitemap/Robots
    """
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        url = request.data.get('url')
        if not url:
            return Response({'error': 'URL is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Normalize URL
        if not url.startswith(('http://', 'https://')):
            url = f'https://{url}'
        
        parsed = urlparse(url)
        domain = parsed.netloc
        if not domain:
            return Response({'error': 'Invalid URL'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Remove port for DNS/TLS if present, but keep for port check if explicit
        hostname = domain.split(':')[0]
        
        results = {
            'url': url,
            'domain': domain,
            'scan_time': datetime.datetime.now().isoformat(),
            'score': 100, # Start perfect and deduct
            'critical_issues': [],
            'checks': {}
        }
        
        # Helper wrappers to run existing view logic or simplified logic
        def run_redirects():
            # Simplified version of RedirectInspector
            try:
                resp = requests.head(url, allow_redirects=True, timeout=10)
                chain = []
                for h in resp.history:
                    chain.append({
                        'status': h.status_code,
                        'url': h.url,
                        'headers': dict(h.headers)
                    })
                return {
                    'final_url': resp.url,
                    'final_status': resp.status_code,
                    'hops_count': len(chain),
                    'hops': chain
                }
            except Exception as e:
                return {'error': str(e)}

        def run_dns():
            # Simplified DNS
            records = {}
            for rtype in ['A', 'AAAA', 'MX', 'TXT', 'NS']:
                try:
                    ans = dns.resolver.resolve(hostname, rtype, lifetime=3)
                    records[rtype] = [str(r) for r in ans]
                except:
                    records[rtype] = []
            return records

        def run_tls():
            # Basic SSL check
            try:
                context = ssl.create_default_context()
                with socket.create_connection((hostname, 443), timeout=5) as sock:
                    with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                        cert = ssock.getpeercert()
                        return {
                            'valid': True,
                            'subject': dict(x[0] for x in cert['subject']),
                            'issuer': dict(x[0] for x in cert['issuer']),
                            'notAfter': cert['notAfter']
                        }
            except Exception as e:
                return {'valid': False, 'error': str(e)}

        def run_headers():
            try:
                resp = requests.get(url, timeout=5)
                h = dict(resp.headers)
                missing = []
                security_headers = [
                    'Strict-Transport-Security',
                    'Content-Security-Policy',
                    'X-Frame-Options',
                    'X-Content-Type-Options',
                    'Referrer-Policy'
                ]
                for sh in security_headers:
                    if sh not in h and sh.lower() not in h:
                        missing.append(sh)
                return {'headers': h, 'missing_security_headers': missing}
            except Exception as e:
                return {'error': str(e)}

        def run_performance():
            try:
                start = time.time()
                resp = requests.get(url, timeout=10)
                ttfb = (time.time() - start) * 1000
                return {
                    'ttfb_ms': round(ttfb, 2),
                    'size_bytes': len(resp.content),
                    'status': resp.status_code
                }
            except Exception as e:
                return {'error': str(e)}

        def run_ports():
            # Scan a few common ports
            common_ports = [80, 443, 21, 22, 25, 53, 8080]
            open_ports = []
            for port in common_ports:
                try:
                    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                        sock.settimeout(1)
                        if sock.connect_ex((hostname, port)) == 0:
                            open_ports.append(port)
                except:
                    pass
            return {'open_ports': open_ports}

        # Execute in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
            future_redirects = executor.submit(run_redirects)
            future_dns = executor.submit(run_dns)
            future_tls = executor.submit(run_tls)
            future_headers = executor.submit(run_headers)
            future_perf = executor.submit(run_performance)
            future_ports = executor.submit(run_ports)
            
            results['checks']['redirects'] = future_redirects.result()
            results['checks']['dns'] = future_dns.result()
            results['checks']['tls'] = future_tls.result()
            results['checks']['headers'] = future_headers.result()
            results['checks']['performance'] = future_perf.result()
            results['checks']['ports'] = future_ports.result()

        # Simple Scoring Logic
        # Security
        if results['checks']['tls'].get('valid') is False:
            results['score'] -= 30
            results['critical_issues'].append("SSL/TLS Certificate is invalid or missing")
        
        missing_headers = results['checks']['headers'].get('missing_security_headers', [])
        if missing_headers:
            results['score'] -= (len(missing_headers) * 5)
            results['critical_issues'].append(f"Missing Security Headers: {', '.join(missing_headers)}")

        # Performance
        ttfb = results['checks']['performance'].get('ttfb_ms')
        if ttfb and ttfb > 1000:
             results['score'] -= 10
             results['critical_issues'].append(f"High TTFB: {ttfb}ms")

        # DNS
        if not results['checks']['dns'].get('A') and not results['checks']['dns'].get('AAAA'):
             results['score'] -= 20
             results['critical_issues'].append("No A or AAAA records found (Unresolvable)")

        results['score'] = max(0, results['score'])

        log_activity(request.user, "website_diagnostics", f"Scanned {domain}", request)
        

        return Response(results)

class AudioSeparatorView(APIView):
    """Audio Separator Service - Separates vocals from music using Demucs"""
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]
    
    # Audio format validation
    SUPPORTED_FORMATS = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac']
    MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB
    DEFAULT_TIMEOUT = 300  # 5 minutes
    MAX_TIMEOUT = 3600  # 1 hour

    def post(self, request):
        """
        Accept audio file, enqueue Celery task for separation, return task_id for polling.
        
        Parameters:
        - audio: Audio file (required, MP3/WAV/FLAC/OGG/M4A/AAC)
        - model: Separator model (optional, default: mdx)
        - timeout: Processing timeout in seconds (optional, default: 300)
        """
        started_at = time.time()
        audio_file = request.FILES.get('audio')

        # Validate file exists
        if not audio_file:
            log_tool_usage(
                request=request,
                tool_name='audio-separator',
                status_label='failed',
                http_status=status.HTTP_400_BAD_REQUEST,
                started_at=started_at,
                error=ValueError('Audio file is required'),
            )
            return Response(
                {'error': 'Audio file is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Validate file format
            file_ext = os.path.splitext(audio_file.name)[1].lower()
            if file_ext not in self.SUPPORTED_FORMATS:
                raise ValueError(
                    f'Unsupported audio format: {file_ext}. '
                    f'Supported: {", ".join(self.SUPPORTED_FORMATS)}'
                )
            
            # Validate file size
            if audio_file.size > self.MAX_FILE_SIZE:
                raise ValueError(
                    f'File too large ({audio_file.size / (1024*1024):.1f}MB). '
                    f'Maximum: {self.MAX_FILE_SIZE / (1024*1024):.0f}MB'
                )
            
            # Get optional parameters with validation
            model = request.data.get('model', getattr(settings, 'AUDIO_SEPARATOR_MODEL', 'mdx')).lower()
            timeout = int(request.data.get('timeout', self.DEFAULT_TIMEOUT))
            
            # Validate timeout
            if timeout < 10 or timeout > self.MAX_TIMEOUT:
                logger.warning(f"Timeout {timeout}s outside valid range, using default")
                timeout = self.DEFAULT_TIMEOUT
            
            # Create unique task directory
            unique_id = str(uuid.uuid4())
            base_dir = os.path.join(settings.MEDIA_ROOT, 'audio_separator', unique_id)
            input_dir = os.path.join(base_dir, 'input')
            os.makedirs(input_dir, exist_ok=True)

            # Save uploaded file
            original_name = audio_file.name.replace(' ', '_')
            input_path = os.path.join(input_dir, original_name)

            with open(input_path, 'wb+') as f:
                for chunk in audio_file.chunks():
                    f.write(chunk)
            
            logger.info(f"Audio received: {original_name} ({audio_file.size} bytes) → {unique_id}")

            # Try to enqueue Celery task
            try:
                from .tasks import process_audio_separator
                task = process_audio_separator.delay(
                    input_path,
                    original_name,
                    unique_id,
                    timeout
                )

                log_tool_usage(
                    request=request,
                    tool_name='audio-separator',
                    status_label='queued',
                    http_status=status.HTTP_202_ACCEPTED,
                    started_at=started_at,
                )

                return Response({
                    'task_id': task.id,
                    'status_url': f"/api/services/audio-separator/status/{task.id}/",
                    'message': 'Audio processing started. Poll status URL for updates.',
                    'file_name': original_name,
                    'timeout_seconds': timeout,
                    'estimated_completion': timeout,
                }, status=status.HTTP_202_ACCEPTED)

            except Exception as e:
                logger.warning(f"Celery enqueue failed: {e}. Falling back to sync processing.")
                
                # Fallback to synchronous processing
                from .tasks import process_audio_separator
                
                try:
                    result = process_audio_separator(
                        input_path,
                        original_name,
                        unique_id,
                        timeout
                    )

                    log_tool_usage(
                        request=request,
                        tool_name='audio-separator',
                        status_label='success' if result.get('status') == 'success' else 'failed',
                        http_status=status.HTTP_200_OK if result.get('status') == 'success' else status.HTTP_500_INTERNAL_SERVER_ERROR,
                        started_at=started_at,
                    )

                    return Response(result)
                except Exception as sync_err:
                    logger.exception("Sync audio separation failed")
                    raise sync_err

        except ValueError as ve:
            # Input validation errors
            logger.warning(f"Audio separator validation error: {ve}")
            log_tool_usage(
                request=request,
                tool_name='audio-separator',
                status_label='failed',
                http_status=status.HTTP_400_BAD_REQUEST,
                started_at=started_at,
                error=ve,
            )
            return Response(
                {'error': str(ve)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.exception("Audio separator error")
            log_tool_usage(
                request=request,
                tool_name='audio-separator',
                status_label='failed',
                http_status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                started_at=started_at,
                error=e,
            )
            return Response(
                {'error': f'Audio processing failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AudioSeparatorStatusView(APIView):
    """Retrieve audio separation task status and results"""
    permission_classes = [AllowAny]

    def get(self, request, task_id):
        """
        Get task status and results.
        Returns cached result if complete, or current task state.
        """
        cache_key = f"audio_sep_result:{task_id}"
        from django.core.cache import cache
        
        # Check cache first (completed tasks)
        result = cache.get(cache_key)
        if result:
            return Response(result)

        # Fallback: check Celery AsyncResult for in-progress tasks
        try:
            from expectexception.celery import app as celery_app
            async_res = celery_app.AsyncResult(task_id)
            state = async_res.state
            
            response = {'status': state, 'task_id': task_id}
            
            # Add progress information for in-progress tasks
            if state == 'PROGRESS':
                if hasattr(async_res, 'info') and isinstance(async_res.info, dict):
                    response.update(async_res.info)
            elif state == 'FAILURE':
                response['error'] = str(async_res.info)
            
            return Response(response)
        except Exception as e:
            logger.warning(f"Failed to get task status for {task_id}: {e}")
            return Response({
                'status': 'unknown',
                'task_id': task_id,
                'error': 'Could not retrieve task status'
            }, status=status.HTTP_404_NOT_FOUND)


class HealthCheckView(APIView):
    """
    Production health check endpoint.
    Returns status of all critical services and infrastructure.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Get health status of system"""
        health_data = {
            'status': 'ok',
            'timestamp': datetime.datetime.now().isoformat(),
            'version': getattr(settings, 'APP_VERSION', '2.1.0'),
            'components': {}
        }
        
        # Database check
        try:
            from django.db import connections
            from django.db.utils import OperationalError
            start = time.time()
            conn = connections['default']
            conn.ensure_connection()
            response_time = (time.time() - start) * 1000
            health_data['components']['database'] = {
                'status': 'ok',
                'response_time_ms': round(response_time, 2)
            }
        except Exception as e:
            health_data['components']['database'] = {
                'status': 'error',
                'error': str(e)
            }
            health_data['status'] = 'degraded'
        
        # Cache/Redis check
        try:
            from django.core.cache import cache
            start = time.time()
            cache.set('health_check', 'ok', 10)
            value = cache.get('health_check')
            response_time = (time.time() - start) * 1000
            if value == 'ok':
                health_data['components']['cache'] = {
                    'status': 'ok',
                    'response_time_ms': round(response_time, 2)
                }
            else:
                health_data['components']['cache'] = {
                    'status': 'error',
                    'error': 'Cache value mismatch'
                }
                health_data['status'] = 'degraded'
        except Exception as e:
            health_data['components']['cache'] = {
                'status': 'error',
                'error': str(e)
            }
            health_data['status'] = 'degraded'
        
        # Storage check
        try:
            media_root = settings.MEDIA_ROOT
            if os.path.exists(media_root):
                stat = os.statvfs(media_root)
                available_gb = (stat.f_bavail * stat.f_frsize) / (1024 ** 3)
                health_data['components']['storage'] = {
                    'status': 'ok',
                    'available_gb': round(available_gb, 2)
                }
            else:
                health_data['components']['storage'] = {
                    'status': 'warning',
                    'error': 'Media directory not found'
                }
        except Exception as e:
            health_data['components']['storage'] = {
                'status': 'error',
                'error': str(e)
            }
        
        # GPU check
        try:
            gpu_available = False
            try:
                import torch
                gpu_available = torch.cuda.is_available()
                gpu_name = torch.cuda.get_device_name(0) if gpu_available else 'N/A'
            except:
                gpu_available = False
                gpu_name = 'N/A'
            
            health_data['components']['gpu'] = {
                'status': 'available' if gpu_available else 'unavailable',
                'model': gpu_name if gpu_available else None
            }
        except Exception as e:
            health_data['components']['gpu'] = {
                'status': 'unknown',
                'error': str(e)
            }
        
        # Services check
        services_status = {}
        service_checks = {
            'audio_separator': self._check_audio_separator,
            'pdf_converter': self._check_pdf_converter,
            'background_remover': self._check_background_remover,
            'ocr': self._check_ocr,
            'handwriting': self._check_handwriting,
            'ai_detector': self._check_ai_detector,
        }
        
        for service_name, check_func in service_checks.items():
            try:
                services_status[service_name] = check_func()
            except Exception as e:
                services_status[service_name] = 'error'
        
        health_data['components']['services'] = services_status
        
        return Response(health_data, status=status.HTTP_200_OK)
    
    def _check_audio_separator(self) -> str:
        """Check if audio separator is available"""
        try:
            import demucs.separate
            return 'ok'
        except:
            return 'unavailable'
    
    def _check_pdf_converter(self) -> str:
        """Check if PDF converter is available"""
        try:
            import pdf2docx
            soffice_path = getattr(settings, 'SOFFICE_CMD', '/usr/bin/soffice')
            if os.path.exists(soffice_path):
                return 'ok'
            return 'partial'
        except:
            return 'unavailable'
    
    def _check_background_remover(self) -> str:
        """Check if background remover is available"""
        try:
            import rembg
            return 'ok'
        except:
            return 'unavailable'
    
    def _check_ocr(self) -> str:
        """Check if OCR is available"""
        try:
            import pytesseract
            tesseract_cmd = getattr(settings, 'TESSERACT_CMD', '/usr/bin/tesseract')
            if os.path.exists(tesseract_cmd):
                return 'ok'
            return 'partial'
        except:
            return 'unavailable'
    
    def _check_handwriting(self) -> str:
        """Check if text to handwriting is available"""
        try:
            from PIL import Image, ImageFont, ImageDraw
            return 'ok'
        except:
            return 'unavailable'
    
    def _check_ai_detector(self) -> str:
        """Check if AI detector is available"""
        try:
            # Check if required ML libraries are available
            import torch
            return 'ok'
        except:
            return 'unavailable'


class UptimeRobotView(APIView):
    """
    Simulation & live testing of UptimeRobot monitoring checks.
    Provides diagnostic capabilities for different monitor types.
    """
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        import time
        import socket
        import ssl
        import requests
        from urllib.parse import urlparse

        started_at = time.time()
        
        target = (request.data.get('target') or '').strip()
        monitor_type = (request.data.get('type') or 'http').lower()
        keyword = (request.data.get('keyword') or '').strip()
        port = request.data.get('port')
        
        if not target and monitor_type != 'heartbeat':
            return Response({'error': 'Target domain or URL is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Normalize target
        parsed_url = None
        hostname = target
        if target:
            if '://' in target:
                try:
                    parsed_url = urlparse(target)
                    hostname = parsed_url.hostname or target
                except Exception:
                    pass
            else:
                # If no protocol, default to http:// to allow URL checks
                target_with_proto = f"http://{target}"
                try:
                    parsed_url = urlparse(target_with_proto)
                    hostname = parsed_url.hostname or target
                except Exception:
                    pass

        result = {
            'monitor_type': monitor_type,
            'target': target or 'Simulated Heartbeat Listener',
            'status': 'down',
            'response_time_ms': 0,
            'logs': [],
            'details': {}
        }

        try:
            if monitor_type in ('http', 'https', 'keyword'):
                url = target if '://' in target else f"https://{target}"
                result['logs'].append(f"Initializing request to {url}")
                
                start_time = time.time()
                # Validate URL is public
                try:
                    url = _validate_public_http_url(url)
                except Exception as e:
                    return Response({'error': f"Unresolvable or private URL: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
                
                # Perform HTTP/HTTPS request
                headers = {'User-Agent': 'UptimeRobot/2.0 (compatible; ExpectException Monitor)'}
                response = requests.get(url, headers=headers, timeout=10, verify=False)
                resp_time = int((time.time() - start_time) * 1000)
                result['response_time_ms'] = resp_time
                
                result['logs'].append(f"Received HTTP {response.status_code} in {resp_time} ms")
                result['details']['status_code'] = response.status_code
                
                if monitor_type == 'keyword':
                    if not keyword:
                        return Response({'error': 'Keyword parameter is required for keyword monitors'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    found = keyword.lower() in response.text.lower()
                    result['details']['keyword_found'] = found
                    result['details']['keyword'] = keyword
                    
                    if found:
                        result['status'] = 'up'
                        result['logs'].append(f"Keyword '{keyword}' successfully found in page source.")
                    else:
                        result['status'] = 'down'
                        result['logs'].append(f"CRITICAL: Keyword '{keyword}' was not found in the page response.")
                else:
                    if 200 <= response.status_code < 400:
                        result['status'] = 'up'
                        result['logs'].append("Service is up. HTTP status is within acceptable range (2xx/3xx).")
                    else:
                        result['status'] = 'down'
                        result['logs'].append(f"CRITICAL: HTTP status {response.status_code} represents an outage.")
                        
            elif monitor_type == 'ping':
                result['logs'].append(f"Pinging host {hostname}")
                try:
                    host = _validate_public_hostname(hostname, 443)
                except Exception as e:
                    return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
                
                start_time = time.time()
                # Perform standard socket connection to check ping response time
                sock = socket.create_connection((host, 443), timeout=5)
                resp_time = int((time.time() - start_time) * 1000)
                sock.close()
                
                result['status'] = 'up'
                result['response_time_ms'] = resp_time
                result['logs'].append(f"Ping successful. Connection to port 443 established in {resp_time} ms.")
                
            elif monitor_type == 'port':
                if not port:
                    port = 80
                else:
                    try:
                        port = int(port)
                    except ValueError:
                        return Response({'error': 'Invalid port number'}, status=status.HTTP_400_BAD_REQUEST)
                
                result['logs'].append(f"Checking port {port} on host {hostname}")
                try:
                    host = _validate_public_hostname(hostname, port)
                except Exception as e:
                    return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
                
                start_time = time.time()
                sock = socket.create_connection((host, port), timeout=5)
                resp_time = int((time.time() - start_time) * 1000)
                sock.close()
                
                result['status'] = 'up'
                result['response_time_ms'] = resp_time
                result['logs'].append(f"Port {port} is OPEN. Connection established in {resp_time} ms.")
                
            elif monitor_type == 'ssl':
                result['logs'].append(f"Retrieving SSL Certificate for {hostname}")
                try:
                    host = _validate_public_hostname(hostname, 443)
                except Exception as e:
                    return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
                
                start_time = time.time()
                context = ssl.create_default_context()
                with socket.create_connection((host, 443), timeout=5) as sock:
                    with context.wrap_socket(sock, server_hostname=host) as ssock:
                        cert = ssock.getpeercert()
                resp_time = int((time.time() - start_time) * 1000)
                
                result['response_time_ms'] = resp_time
                if cert:
                    result['status'] = 'up'
                    result['logs'].append("SSL handshake completed successfully.")
                    
                    import datetime
                    # Parse notAfter e.g. 'Jan 28 12:00:00 2026 GMT'
                    expiry_str = cert.get('notAfter')
                    if expiry_str:
                        expiry_dt = datetime.datetime.strptime(expiry_str, '%b %d %H:%M:%S %Y %Z')
                        days_left = (expiry_dt - datetime.datetime.utcnow()).days
                        result['details']['expiry_date'] = expiry_str
                        result['details']['days_remaining'] = days_left
                        result['details']['issuer'] = dict(x[0] for x in cert.get('issuer', []))
                        result['details']['subject'] = dict(x[0] for x in cert.get('subject', []))
                        
                        result['logs'].append(f"Certificate issuer: {result['details']['issuer'].get('organizationName', 'Unknown')}")
                        result['logs'].append(f"Certificate expires in {days_left} days on {expiry_str}")
                else:
                    result['status'] = 'down'
                    result['logs'].append("CRITICAL: Certificate could not be retrieved.")

            elif monitor_type == 'heartbeat':
                import uuid
                hb_id = request.data.get('heartbeat_id') or str(uuid.uuid4())[:8]
                result['status'] = 'up'
                result['response_time_ms'] = 8
                result['logs'].append("Initializing simulated Cron Job / Heartbeat listener...")
                result['logs'].append(f"Assigned Unique Endpoint ID: {hb_id}")
                result['logs'].append(f"Mock webhook heartbeat endpoint is active at https://expectexception.com/api/services/uptime-robot/heartbeat/{hb_id}/")
                result['logs'].append("Listener status: [ACTIVE] Waiting for periodic incoming HTTP requests (recommended interval: 5 minutes)...")
                result['details'] = {
                    'heartbeat_id': hb_id,
                    'heartbeat_url': f"https://expectexception.com/api/services/uptime-robot/heartbeat/{hb_id}/",
                    'interval_minutes': 5
                }
            
            else:
                return Response({'error': f"Unsupported monitor type: {monitor_type}"}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            result['status'] = 'down'
            result['logs'].append(f"ERROR: {str(e)}")
            result['details']['error'] = str(e)

        # Populate multi-region check simulation
        if result['status'] == 'up':
            base_latency = result['response_time_ms'] or 40
            result['regions'] = [
                {"id": "us-east", "name": "New York, USA", "status": "up", "latency_ms": base_latency, "icon": "🇺🇸"},
                {"id": "eu-central", "name": "Frankfurt, Germany", "status": "up", "latency_ms": int(base_latency * 1.5 + 35), "icon": "🇩🇪"},
                {"id": "ap-northeast", "name": "Tokyo, Japan", "status": "up", "latency_ms": int(base_latency * 2.1 + 85), "icon": "🇯🇵"},
                {"id": "uk-london", "name": "London, United Kingdom", "status": "up", "latency_ms": int(base_latency * 1.3 + 12), "icon": "🇬🇧"}
            ]
        else:
            result['regions'] = [
                {"id": "us-east", "name": "New York, USA", "status": "down", "latency_ms": 0, "icon": "🇺🇸"},
                {"id": "eu-central", "name": "Frankfurt, Germany", "status": "down", "latency_ms": 0, "icon": "🇩🇪"},
                {"id": "ap-northeast", "name": "Tokyo, Japan", "status": "down", "latency_ms": 0, "icon": "🇯🇵"},
                {"id": "uk-london", "name": "London, United Kingdom", "status": "down", "latency_ms": 0, "icon": "🇬🇧"}
            ]

        # Log tool usage metrics
        log_tool_usage(
            request=request,
            tool_name='uptime-robot',
            status_label='success' if result['status'] == 'up' else 'failed',
            http_status=status.HTTP_200_OK,
            started_at=started_at,
            extra={'type': monitor_type}
        )
        return Response(result)


from .scheduler import get_triggers, save_triggers
import datetime

class UptimeTriggersView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def get(self, request):
        # Watchdog heartbeat check to guarantee background scheduler is running inside Celery
        from django.core.cache import cache
        is_running = cache.get("last_celery_uptime_run")
        if not is_running:
            try:
                from .tasks import run_uptime_scheduler_task
                run_uptime_scheduler_task.delay()
            except Exception:
                pass

        triggers = get_triggers()
        return Response(triggers)

    def post(self, request):
        import uuid
        name = (request.data.get('name') or '').strip()
        target = (request.data.get('target') or '').strip()
        interval = request.data.get('interval_minutes') or 5
        
        if not name or not target:
            return Response({'error': 'Name and Target URL/Host are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            interval = int(interval)
            if interval < 1:
                interval = 1
        except ValueError:
            return Response({'error': 'Interval must be a positive integer'}, status=status.HTTP_400_BAD_REQUEST)

        triggers = get_triggers()
        new_trigger = {
            'id': f"trg-{uuid.uuid4().hex[:8]}",
            'name': name,
            'target': target,
            'interval_minutes': interval,
            'status': 'active',
            'last_run': None,
            'last_status': 'never',
            'last_latency': 0,
            'logs': [f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Auto-trigger keep-alive monitor registered successfully."]
        }
        triggers.append(new_trigger)
        save_triggers(triggers)
        return Response(new_trigger, status=status.HTTP_201_CREATED)

class UptimeTriggerDetailView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request, trigger_id):
        action = request.data.get('action') or 'toggle'
        triggers = get_triggers()
        found = False
        for trigger in triggers:
            if trigger.get('id') == trigger_id:
                found = True
                if action == 'toggle':
                    trigger['status'] = 'paused' if trigger.get('status') == 'active' else 'active'
                elif action == 'run_now':
                    import time, requests
                    url = trigger.get('target', '')
                    url = url if '://' in url else f"https://{url}"
                    start_time = time.time()
                    now = datetime.datetime.now()
                    try:
                        headers = {'User-Agent': 'UptimeRobot/2.0 (compatible; ExpectException Auto-Trigger Keep-Alive)'}
                        res = requests.get(url, headers=headers, timeout=12, verify=False)
                        latency = int((time.time() - start_time) * 1000)
                        status_str = "up" if 200 <= res.status_code < 400 else "down"
                        log_msg = f"On-demand: HTTP {res.status_code} in {latency}ms."
                    except Exception as e:
                        latency = 0
                        status_str = "down"
                        log_msg = f"On-demand connection failed: {str(e)}"
                    
                    trigger['last_run'] = now.strftime("%Y-%m-%d %H:%M:%S")
                    trigger['last_status'] = status_str
                    trigger['last_latency'] = latency
                    
                    logs = trigger.get('logs', [])
                    logs.insert(0, f"[{now.strftime('%H:%M:%S')}] {log_msg}")
                    trigger['logs'] = logs[:30]
                
                break
        
        if not found:
            return Response({'error': 'Trigger not found'}, status=status.HTTP_404_NOT_FOUND)
        
        save_triggers(triggers)
        return Response(triggers)

    def delete(self, request, trigger_id):
        triggers = get_triggers()
        remaining = [t for t in triggers if t.get('id') != trigger_id]
        save_triggers(remaining)
        return Response(remaining)


