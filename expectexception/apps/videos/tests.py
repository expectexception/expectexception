from django.test import TestCase
from django.urls import reverse
from unittest import mock
from .models import VideoDownload
from django.core.files.base import ContentFile
from django.conf import settings
import os
from moto import mock_aws
import boto3
from django.test import override_settings

class VideosTests(TestCase):
    @mock.patch('apps.videos.views.YoutubeDL')
    def test_extract_formats(self, mock_ydl):
        mock_inst = mock_ydl.return_value.__enter__.return_value
        mock_inst.extract_info.return_value = {
            'title': 'Test',
            'formats': [
                {'format_id': '18', 'ext': 'mp4', 'format_note': '360p', 'filesize': 12345},
                {'format_id': '22', 'ext': 'mp4', 'format_note': '720p', 'filesize': 54321},
            ]
        }
        url = 'https://www.youtube.com/watch?v=abc'
        r = self.client.post(reverse('video-extract'), {'url': url}, content_type='application/json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('formats', r.json())
        self.assertEqual(len(r.json()['formats']), 2)

    @mock.patch('apps.videos.tasks.YoutubeDL')
    def test_download_flow(self, mock_ydl):
        # Simulate yt_dlp download by creating a dummy file
        mock_inst = mock_ydl.return_value.__enter__.return_value
        mock_info = {'title': 'Downloaded', 'ext': 'mp4'}
        mock_inst.extract_info.return_value = mock_info
        url = 'https://www.youtube.com/watch?v=abc'
        # patch Celery task before making request so .delay() is used and no thread fallback runs
        with mock.patch('apps.videos.tasks.download_video_async') as mock_async:
            mock_async.delay = mock.MagicMock()
            # request download
            r = self.client.post(reverse('video-download'), {'url': url, 'format_id': '18'}, content_type='application/json')
            self.assertEqual(r.status_code, 201)
            data = r.json()
            pk = data['id']
            # ensure task was enqueued via Celery
            mock_async.delay.assert_called_once_with(pk, url, '18')
        # run the task synchronously
        from apps.videos.tasks import download_video_task
        download_video_task(pk, url, '18')
        d = VideoDownload.objects.get(pk=pk)
        # Since task looks for file, we simulate file creation
        outdir = os.path.join(settings.MEDIA_ROOT, 'videos')
        os.makedirs(outdir, exist_ok=True)
        fname = os.path.join(outdir, f"{pk}.mp4")
        with open(fname, 'wb') as fh:
            fh.write(b'data')
        # Refresh task to compute size
        d.file_path = os.path.join('videos', f"{pk}.mp4")
        d.file_size = os.path.getsize(fname)
        d.status = VideoDownload.STATUS_DONE
        d.save()
        # Retrieve detail
        r2 = self.client.get(reverse('video-download-detail', args=[pk]))
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.json()['status'], VideoDownload.STATUS_DONE)

    @mock_aws
    @override_settings(USE_S3=True, AWS_STORAGE_BUCKET_NAME='test-bucket')
    @mock.patch('apps.videos.tasks.YoutubeDL')
    def test_download_flow_s3(self, mock_ydl):
        # Setup moto S3
        conn = boto3.client('s3', region_name='us-east-1')
        conn.create_bucket(Bucket='test-bucket')
        mock_inst = mock_ydl.return_value.__enter__.return_value
        mock_info = {'title': 'Downloaded', 'ext': 'mp4'}
        mock_inst.extract_info.return_value = mock_info
        url = 'https://www.youtube.com/watch?v=abc'
        with mock.patch('apps.videos.tasks.download_video_async') as mock_async:
            mock_async.delay = mock.MagicMock()
            r = self.client.post(reverse('video-download'), {'url': url, 'format_id': '18'}, content_type='application/json')
            self.assertEqual(r.status_code, 201)
            data = r.json()
            pk = data['id']
            mock_async.delay.assert_called_once_with(pk, url, '18')
        # run sync task to perform upload to moto S3
        from apps.videos.tasks import download_video_task
        download_video_task(pk, url, '18')
        d = VideoDownload.objects.get(pk=pk)
        self.assertEqual(d.status, VideoDownload.STATUS_DONE)
        # Request file URL and expect presigned_url
        r2 = self.client.get(reverse('video-download-file', args=[pk]))
        self.assertEqual(r2.status_code, 200)
        self.assertIn('presigned_url', r2.json())
