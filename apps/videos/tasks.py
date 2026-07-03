import os
import shutil
import tempfile
from yt_dlp import YoutubeDL
from django.conf import settings
from .models import VideoDownload
from django.core.files import File
from django.core.files.storage import default_storage


def download_video_task(download_id, url, format_id, convert_to=None):
    d = VideoDownload.objects.get(pk=download_id)
    d.status = VideoDownload.STATUS_RUNNING
    d.save()
    
    # Create a temp directory for the download
    temp_dir = tempfile.mkdtemp()
    try:
        # Configure yt-dlp to download to temp dir
        ydl_opts = {
            'format': format_id,
            'outtmpl': os.path.join(temp_dir, f'{download_id}.%(ext)s'),
            'noplaylist': True,
            'quiet': True,
        }
        
        # Audio conversion options
        if convert_to in ['mp3', 'm4a']:
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': convert_to,
                'preferredquality': '192',
            }]
        elif convert_to in ['mp4', 'webm']:
            ydl_opts['merge_output_format'] = convert_to
        
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            
        # Determine the final file extension
        if convert_to:
            ext = convert_to
        else:
            ext = info.get('ext') or 'mp4'
            
        temp_filename = f"{download_id}.{ext}"
        temp_filepath = os.path.join(temp_dir, temp_filename)
        
        # Verify file exists (handle cases where filename might differ slightly)
        if not os.path.exists(temp_filepath):
            files = os.listdir(temp_dir)
            if files:
                # Find the most likely file (matching ID and extension)
                for f in files:
                    if f.startswith(str(download_id)) and f.endswith(ext):
                        temp_filename = f
                        break
                else:
                    temp_filename = files[0]
                
                temp_filepath = os.path.join(temp_dir, temp_filename)
                ext = temp_filename.split('.')[-1]
            else:
                raise Exception("Downloaded file not found")

        # Destination path in storage
        final_filename = f"{download_id}.{ext}"
        relpath = os.path.join('videos', final_filename)
        
        # Save to default storage
        with open(temp_filepath, 'rb') as fh:
            saved_name = default_storage.save(relpath, File(fh))
            
        d.file_path = saved_name
        # Ensure filename includes extension
        title = info.get('title') or f"download_{download_id}"
        # Sanitize title to be safe for filenames if needed, but important part is extension
        if not title.lower().endswith(f".{ext}"):
            d.filename = f"{title}.{ext}"
        else:
            d.filename = title
        
        try:
            d.file_size = default_storage.size(saved_name)
        except Exception:
            d.file_size = os.path.getsize(temp_filepath)
        
        # Sanitize info to ensure it's JSON serializable
        info = ydl.sanitize_info(info)
        
        d.status = VideoDownload.STATUS_DONE
        d.extra = info
        d.save()
        
    except Exception as e:
        d.status = VideoDownload.STATUS_FAILED
        d.error = str(e)
        d.save()
    finally:
        # Clean up temp dir
        shutil.rmtree(temp_dir, ignore_errors=True)


# Celery integration: expose a task that calls the synchronous worker function.
try:
    from celery import shared_task

    @shared_task(name='apps.videos.tasks.download_video_async')
    def download_video_async(download_id, url, format_id, convert_to=None):
        return download_video_task(download_id, url, format_id, convert_to)
except Exception:
    # If Celery is not available, provide a fallback function that calls sync task
    def download_video_async(download_id, url, format_id, convert_to=None):
        return download_video_task(download_id, url, format_id, convert_to)
