from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, viewsets
from django.shortcuts import get_object_or_404
from django.conf import settings
from .serializers import ExtractRequestSerializer, FormatSerializer, VideoDownloadSerializer
from .models import VideoDownload

import os
import threading

try:
    from yt_dlp import YoutubeDL
except Exception:
    YoutubeDL = None


class ExtractView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ExtractRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        url = serializer.validated_data['url']
        if not YoutubeDL:
            return Response({'detail': 'yt-dlp not installed'}, status=status.HTTP_501_NOT_IMPLEMENTED)
        ydl_opts = {'skip_download': True}
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
        formats = []
        for f in info.get('formats', []):
            formats.append({
                'format_id': f.get('format_id') or f.get('format'),
                'ext': f.get('ext'),
                'format_note': f.get('format_note') or f.get('format'),
                'filesize': f.get('filesize')
            })
        return Response({'title': info.get('title'), 'formats': formats})


def _download_video_background(download_id, url, format_id):
    """Background downloader that uses yt-dlp to download and updates DB record."""
    from .tasks import download_video_task
    download_video_task(download_id, url, format_id)


def _enqueue_download(download):
    # If Celery is configured, use task; else fall back to background thread
    try:
        from apps.videos.tasks import download_video_async
        # Prefer to enqueue via Celery if `.delay` is available
        if hasattr(download_video_async, 'delay'):
            download_video_async.delay(download.id, download.url, download.format_id)
        else:
            # Call synchronous fallback
            download_video_async(download.id, download.url, download.format_id)
    except Exception:
        t = threading.Thread(target=_download_video_background, args=(download.id, download.url, download.format_id))
        t.daemon = True
        t.start()


class DownloadRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        url = data.get('url')
        format_id = data.get('format_id')
        if not url or not format_id:
            return Response({'detail': 'url and format_id required'}, status=status.HTTP_400_BAD_REQUEST)
        d = VideoDownload.objects.create(url=url, format_id=format_id, status=VideoDownload.STATUS_PENDING)
        _enqueue_download(d)
        return Response(VideoDownloadSerializer(d).data, status=status.HTTP_201_CREATED)


class DownloadDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        d = get_object_or_404(VideoDownload, pk=pk)
        return Response(VideoDownloadSerializer(d).data)


class FileServeView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        d = get_object_or_404(VideoDownload, pk=pk)
        if d.status != VideoDownload.STATUS_DONE:
            return Response({'detail': 'File not ready'}, status=status.HTTP_404_NOT_FOUND)
        # If using S3/default_storage, return a presigned URL when available
        if getattr(settings, 'USE_S3', False):
            if not d.file_path:
                return Response({'detail': 'File missing'}, status=status.HTTP_404_NOT_FOUND)
            try:
                import boto3
                s3 = boto3.client('s3')
                bucket = settings.AWS_STORAGE_BUCKET_NAME
                key = d.file_path
                url = s3.generate_presigned_url(
                    ClientMethod='get_object',
                    Params={'Bucket': bucket, 'Key': key},
                    ExpiresIn=3600,
                )
                return Response({'presigned_url': url})
            except Exception:
                # Fall back to local file streaming if presigned URL generation fails
                path = os.path.join(settings.MEDIA_ROOT, d.file_path)
                if not os.path.exists(path):
                    return Response({'detail': 'File missing'}, status=status.HTTP_404_NOT_FOUND)
                from django.http import FileResponse
                return FileResponse(open(path, 'rb'), as_attachment=True, filename=d.filename)

        # Local storage path
        path = os.path.join(settings.MEDIA_ROOT, d.file_path)
        if not os.path.exists(path):
            return Response({'detail': 'File missing'}, status=status.HTTP_404_NOT_FOUND)
        from django.http import FileResponse
        return FileResponse(open(path, 'rb'), as_attachment=True, filename=d.filename)


class MyDownloadsView(viewsets.ReadOnlyModelViewSet):
    serializer_class = VideoDownloadSerializer

    def get_queryset(self):
        # In this simple implementation we return all downloads; in prod filter by user
        return VideoDownload.objects.all().order_by('-created_at')
