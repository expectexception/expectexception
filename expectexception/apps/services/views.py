import os
import io
import uuid
import time
import logging
import psutil
import datetime
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
from PIL import Image
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
from .models import Service, DownloadableResource, UserActivity, FavoriteTool, DownloadHistory
from .serializers import ServiceSerializer, DownloadableResourceSerializer, UserActivitySerializer, FavoriteToolSerializer, DownloadHistorySerializer
from apps.videos.models import VideoDownload
from apps.videos.tasks import download_video_async
from apps.blog.models import Post
from .log_analyzer import get_log_analysis

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


def log_activity(user, action, details=None, request=None):
    """Enhanced activity logging with request metadata"""
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



class TextToSpeechView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        text = request.data.get('text')
        lang = request.data.get('lang', 'en')
        gender = request.data.get('gender', 'Female') # Male or Female
        
        if not text:
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

            return Response({
                'audio_url': file_url,
                'filename': filename
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ImageCompressorView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        image_file = request.FILES.get('image')
        quality = int(request.data.get('quality', 80))
        format_type = request.data.get('format', 'WEBP').upper()
        
        if not image_file:
            return Response({'error': 'Image file is required'}, status=status.HTTP_400_BAD_REQUEST)

        valid_formats = ['JPEG', 'PNG', 'WEBP']
        if format_type not in valid_formats:
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

            return Response({
                'image_url': file_url,
                'filename': filename,
                'original_size': image_file.size,
                'compressed_size': buffer.getbuffer().nbytes
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class QrGeneratorView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        data = request.data.get('data')
        fg_color = request.data.get('fg_color', '#000000')
        bg_color = request.data.get('bg_color', '#ffffff')

        if not data:
            return Response({'error': 'Data is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)

        img = qr.make_image(fill_color=fg_color, back_color=bg_color)
        
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        
        filename = f"qr_{uuid.uuid4()}.png"
        file_path = os.path.join(settings.MEDIA_ROOT, 'qr')
        os.makedirs(file_path, exist_ok=True)
        
        with open(os.path.join(file_path, filename), 'wb') as f:
            f.write(buffer.getvalue())
            
        log_activity(request.user, "generate_qr", f"Data: {data[:50]}...")

        return Response({
            'qr_url': f"{settings.MEDIA_URL}qr/{filename}"
        })

class JsonFormatterView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        raw_json = request.data.get('json_data')
        if not raw_json:
            return Response({'error': 'JSON data is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            if isinstance(raw_json, str):
                parsed = json.loads(raw_json)
            else:
                parsed = raw_json
            formatted = json.dumps(parsed, indent=4)
            
            log_activity(request.user, "format_json", "JSON Formatted")
            
            return Response({'formatted_json': formatted})
        except json.JSONDecodeError:
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
    queryset = Service.objects.filter(is_active=True).order_by('id')
    serializer_class = ServiceSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None  # Show all tools (no pagination)

class DownloadableResourceViewSet(viewsets.ModelViewSet):
    queryset = DownloadableResource.objects.all().order_by('-downloads')
    serializer_class = DownloadableResourceSerializer
    permission_classes = [IsAdminOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        resource = self.get_object()
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


class PdfToDocView(APIView):
    """Convert PDF files to DOCX format using LibreOffice"""
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]
    
    # Supported output formats
    SUPPORTED_FORMATS = ['docx', 'doc', 'odt', 'rtf', 'txt']
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    
    def post(self, request):
        pdf_file = request.FILES.get('pdf')
        output_format = request.data.get('format', 'docx').lower()
        
        if not pdf_file:
            return Response(
                {'error': 'PDF file is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file size
        if pdf_file.size > self.MAX_FILE_SIZE:
            return Response(
                {'error': f'File too large. Maximum size is {self.MAX_FILE_SIZE // (1024*1024)}MB'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate output format
        if output_format not in self.SUPPORTED_FORMATS:
            return Response(
                {'error': f'Unsupported format. Supported: {", ".join(self.SUPPORTED_FORMATS)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate it's actually a PDF
        pdf_file.seek(0)
        header = pdf_file.read(5)
        pdf_file.seek(0)
        if header != b'%PDF-':
            return Response(
                {'error': 'Invalid file. Please upload a valid PDF file.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        import subprocess
        import tempfile
        import shutil
        
        temp_dir = None
        try:
            # Create temp directory
            temp_dir = tempfile.mkdtemp(prefix='pdf_convert_')
            
            # Save uploaded PDF to temp file
            input_filename = f"input_{uuid.uuid4()}.pdf"
            input_path = os.path.join(temp_dir, input_filename)
            
            with open(input_path, 'wb') as f:
                for chunk in pdf_file.chunks():
                    f.write(chunk)
            
            # Determine conversion method based on output format
            if output_format == 'docx':
                # Use pdf2docx for robust PDF -> DOCX conversion
                from pdf2docx import Converter
                
                output_filename = input_filename.replace('.pdf', '.docx')
                output_path = os.path.join(temp_dir, output_filename)
                
                try:
                    cv = Converter(input_path)
                    cv.convert(output_path)
                    cv.close()
                except Exception as e:
                    logger.error(f"pdf2docx conversion failed: {e}")
                    # If python lib fails, we have no fallback since soffice is broken for this
                    raise e

            else:
                 # Original soffice path for legacy formats (rtf, txt) if ever needed
                 # ensuring we carry over the ENV fixes just in case it works for TXT
                 filter_map = {
                    'doc': 'MS Word 97',
                    'odt': 'writer8',
                    'rtf': 'Rich Text Format',
                    'txt': 'Text'
                }
                 
                 cmd = [
                    '/usr/bin/soffice',
                    '--headless',
                    '--invisible',
                    '--nologo',
                    '--nofirststartwizard',
                    f'--convert-to',
                    f'{output_format}:{filter_map.get(output_format, output_format)}',
                    '--outdir',
                    temp_dir,
                    input_path
                ]
                 
                 custom_env = {
                    'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
                    'HOME': temp_dir,
                }
                 if 'LANG' in os.environ: custom_env['LANG'] = os.environ['LANG']
                 if 'LC_ALL' in os.environ: custom_env['LC_ALL'] = os.environ['LC_ALL']

                 result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=120,
                    env=custom_env
                )
                 
                 if result.returncode != 0:
                     logger.error(f"LibreOffice conversion failed: {result.stderr}")
                     raise Exception("Conversion failed using system tools.")

            # Find the output file
            # If docx, we already defined output_path above
            if output_format != 'docx':
                 output_filename = input_filename.replace('.pdf', f'.{output_format}')
                 output_path = os.path.join(temp_dir, output_filename)
                 
                 if not os.path.exists(output_path):
                    base_name = os.path.splitext(input_filename)[0]
                    output_path = os.path.join(temp_dir, f"{base_name}.{output_format}")
            
            if not os.path.exists(output_path):
                logger.error(f"Output file not found. Files in temp: {os.listdir(temp_dir)}")
                return Response(
                    {'error': 'Conversion completed but output file not found.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Save to media folder
            converted_dir = os.path.join(settings.MEDIA_ROOT, 'converted')
            os.makedirs(converted_dir, exist_ok=True)
            
            # Generate unique filename for the output
            original_name = os.path.splitext(pdf_file.name)[0]
            final_filename = f"{original_name}_{uuid.uuid4().hex[:8]}.{output_format}"
            final_path = os.path.join(converted_dir, final_filename)
            
            # Move output to final location
            shutil.copy2(output_path, final_path)
            
            file_url = f"{settings.MEDIA_URL}converted/{final_filename}"
            # Prepend API_BASE_URL logic if needed? 
            # Actually frontend handles strict URLs now, or backend should return full URL?
            # User dashboard wants relative usually unless configured.
            # But the 'fix' earlier was to make frontend handle it. 
            # However, looking at other views, I should ensure consistency.
            # Let's keep file_url as relative path string built here, consistent with others.

            file_size = os.path.getsize(final_path)
            
            # Log activity
            log_activity(
                request.user, 
                "pdf_to_doc", 
                f"Converted {pdf_file.name} to {output_format.upper()}", 
                request
            )
            
            logger.info(f"PDF conversion successful: {pdf_file.name} -> {final_filename}")
            
            return Response({
                'success': True,
                'file_url': file_url,
                'filename': final_filename,
                'original_name': pdf_file.name,
                'format': output_format.upper(),
                'original_size': pdf_file.size,
                'converted_size': file_size,
            })
            
        except subprocess.TimeoutExpired:
            logger.error("LibreOffice conversion timed out")
            return Response(
                {'error': 'Conversion timed out. The file may be too large or complex.'},
                status=status.HTTP_408_REQUEST_TIMEOUT
            )
        except FileNotFoundError:
            logger.error("LibreOffice (soffice) not found")
            return Response(
                {'error': 'PDF conversion service is not available. Please contact support.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            logger.exception(f"PDF conversion error: {e}")
            return Response(
                {'error': f'An error occurred: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        finally:
            # Clean up temp directory
            if temp_dir and os.path.exists(temp_dir):
                try:
                    shutil.rmtree(temp_dir)
                except Exception as e:
                    logger.warning(f"Failed to clean up temp dir: {e}")


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
    """Remove background from images using rembg"""
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        image_file = request.FILES.get('image')
        
        if not image_file:
            return Response({'error': 'Image file is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from rembg import remove
            input_data = image_file.read()

            # Optimize: Downscale if image is too large (prevents OOM and Timeouts)
            try:
                img = Image.open(io.BytesIO(input_data))
                max_dimension = 2048
                if img.width > max_dimension or img.height > max_dimension:
                    img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
                    buffer = io.BytesIO()
                    # Save as PNG to preserve transparency if it exists, or just to have a standard input format
                    img.save(buffer, format="PNG") 
                    input_data = buffer.getvalue()
            except Exception as e:
                logger.warning(f"Failed to optimize image before background removal: {e}")
                # Continue with original data if optimization fails
                pass
            
            output_data = remove(input_data)
            
            output_dir = os.path.join(settings.MEDIA_ROOT, 'nobg')
            os.makedirs(output_dir, exist_ok=True)
            
            filename = f"nobg_{uuid.uuid4().hex[:8]}.png"
            output_path = os.path.join(output_dir, filename)
            
            with open(output_path, 'wb') as f:
                f.write(output_data)
            
            log_activity(request.user, "background_remove", image_file.name, request)
            
            return Response({
                'success': True,
                'file_url': f"{settings.MEDIA_URL}nobg/{filename}",
                'filename': filename,
            })
        except ImportError:
            return Response({'error': 'Background removal service not available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            logger.exception(f"Background removal error: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ImageToTextView(APIView):
    """Extract text from images using OCR (Tesseract)"""
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        image_file = request.FILES.get('image')
        language = request.data.get('language', 'eng')  # eng, spa, fra, deu, etc.
        
        if not image_file:
            return Response({'error': 'Image file is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            import pytesseract
            
            # 1. Force add /usr/bin to PATH for subprocess
            if '/usr/bin' not in os.environ['PATH']:
                os.environ['PATH'] += ':/usr/bin'
            
            # 2. Explicitly set tesseract command
            # Access the inner module where the variable lives
            if hasattr(pytesseract, 'pytesseract'):
                pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'
            else:
                # Fallback if structure is flat (unlikely but safe)
                pytesseract.tesseract_cmd = '/usr/bin/tesseract'

            img = Image.open(image_file)
            text = pytesseract.image_to_string(img, lang=language)
            
            log_activity(request.user, "ocr", f"Extracted text from {image_file.name}", request)
            
            return Response({
                'success': True,
                'text': text.strip(),
                'language': language,
                'characters': len(text),
            })
        except ImportError:
            return Response({'error': 'OCR service not available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            logger.exception(f"OCR error: {e}")
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
            # Fallback: basic conversion
            import re
            html = markdown_text
            html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
            html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
            html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
            html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
            html = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html)
            html = re.sub(r'\n', r'<br>', html)
            return Response({'html': html})

