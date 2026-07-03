import os
import uuid
import zipfile
import shutil
import subprocess
import time
from celery import shared_task, current_task
from django.conf import settings
from django.core.cache import cache


def _normalize_model_name(name: str) -> str:
    return name or getattr(settings, 'AUDIO_SEPARATOR_MODEL', 'htdemucs')


def _prepare_dirs(unique_id: str):
    base_dir = os.path.join(settings.MEDIA_ROOT, 'audio_separator', unique_id)
    input_dir = os.path.join(base_dir, 'input')
    output_dir = os.path.join(base_dir, 'output')
    os.makedirs(input_dir, exist_ok=True)
    os.makedirs(output_dir, exist_ok=True)
    return base_dir, input_dir, output_dir


def _run_demucs(demucs_cmd, model_name, output_dir, input_path, timeout):
    cmd = [demucs_cmd, '--two-stems=vocals', '-n', model_name, '-o', output_dir, input_path]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False, timeout=timeout)
    return proc


@shared_task(bind=True)
def process_audio_separator(self, input_path: str, original_name: str, unique_id: str, timeout: int = 300):
    """Process audio separation asynchronously using Demucs.

    Stores the result in Django cache under key `audio_sep_result:{task_id}`.
    """
    started_at = time.time()
    model_name = _normalize_model_name(getattr(settings, 'AUDIO_SEPARATOR_MODEL', None))

    # Find demucs binary
    venv_demucs = os.path.join(settings.BASE_DIR, '.venv', 'bin', 'demucs')
    demucs_cmd = venv_demucs if os.path.exists(venv_demucs) else 'demucs'

    try:
        base_dir, input_dir, output_dir = _prepare_dirs(unique_id)

        # Move given file into input_dir (if not already there)
        target_input = os.path.join(input_dir, original_name)
        if os.path.abspath(input_path) != os.path.abspath(target_input):
            shutil.copy(input_path, target_input)
            input_path = target_input

        # Run demucs
        proc = _run_demucs(demucs_cmd, model_name, output_dir, input_path, timeout)

        if proc.returncode != 0:
            raise Exception(f"Demucs failed: {proc.stderr}")

        # Locate outputs
        model_dir = os.path.join(output_dir, model_name)
        if not os.path.exists(model_dir):
            # try htdemucs folder fallback
            model_dir = os.path.join(output_dir, 'htdemucs')

        subdirs = [d for d in os.listdir(model_dir) if os.path.isdir(os.path.join(model_dir, d))]
        if not subdirs:
            raise Exception("No output folder created by Demucs.")

        song_dir = os.path.join(model_dir, subdirs[0])
        vocals_path = os.path.join(song_dir, 'vocals.wav')
        accompaniment_path = os.path.join(song_dir, 'no_vocals.wav')

        if not os.path.exists(vocals_path) or not os.path.exists(accompaniment_path):
            raise Exception(f"Output stems missing in {song_dir}")

        # Copy to base_dir for easy serving
        out_vocals = os.path.join(base_dir, 'vocals.wav')
        out_music = os.path.join(base_dir, 'music.wav')
        shutil.copy(vocals_path, out_vocals)
        shutil.copy(accompaniment_path, out_music)

        # Create zip
        zip_filename = f"stems_{unique_id}.zip"
        zip_path = os.path.join(base_dir, zip_filename)
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            zipf.write(out_vocals, 'vocals.wav')
            zipf.write(out_music, 'music.wav')

        result = {
            'zip_path': zip_path,
            'vocals_path': out_vocals,
            'accompaniment_path': out_music,
            'zip_url': f"{settings.MEDIA_URL}audio_separator/{unique_id}/{zip_filename}",
            'vocals_url': f"{settings.MEDIA_URL}audio_separator/{unique_id}/vocals.wav",
            'accompaniment_url': f"{settings.MEDIA_URL}audio_separator/{unique_id}/music.wav",
            'duration': time.time() - started_at,
            'status': 'success'
        }

        cache_key = f"audio_sep_result:{self.request.id}"
        cache.set(cache_key, result, timeout=getattr(settings, 'AUDIO_SEPARATOR_CACHE_TIMEOUT', 24 * 3600))

        return result

    except Exception as exc:
        cache_key = f"audio_sep_result:{self.request.id}"
        cache.set(cache_key, {'status': 'failed', 'error': str(exc)}, timeout=3600)
        raise


@shared_task(bind=True)
def convert_pdf_task(self, input_path: str, output_format: str, ocr_enabled: bool, ocr_lang: str, original_name: str):
    """
    Convert PDF to Doc/Docx/ODT/RTF/TXT asynchronously.

    Engine strategy (handled by smart_convert_pdf):
      DOCX → pdf2docx (layout-preserving) with soffice fallback
      other formats → soffice with isolated user profile
      OCR → pytesseract pipeline then convert
    """
    import logging
    from .pdf_utils import smart_convert_pdf, PDFConversionError

    logger = logging.getLogger(__name__)
    unique_id = self.request.id
    cache_key = f"pdf_convert_result:{unique_id}"

    try:
        logger.info(f"PDF conversion task started: {original_name} → {output_format} (ocr={ocr_enabled})")

        # Prepare output path
        converted_dir = os.path.join(settings.MEDIA_ROOT, 'converted')
        os.makedirs(converted_dir, exist_ok=True)

        base_name = os.path.splitext(original_name)[0]
        # Replace spaces/special chars for safe filenames
        safe_base = "".join(c if c.isalnum() or c in ('_', '-') else '_' for c in base_name)
        final_filename = f"{safe_base}_{uuid.uuid4().hex[:8]}.{output_format.lower()}"
        final_path = os.path.join(converted_dir, final_filename)

        # Run multi-engine smart conversion
        conversion_info = smart_convert_pdf(
            input_pdf=input_path,
            output_format=output_format,
            output_path=final_path,
            ocr_enabled=ocr_enabled,
            ocr_lang=ocr_lang,
        )

        file_url = f"{settings.MEDIA_URL}converted/{final_filename}"

        result = {
            'status': 'success',
            'file_url': file_url,
            'filename': final_filename,
            'original_name': original_name,
            'format': output_format.upper(),
            'original_size': conversion_info.get('original_size', 0),
            'converted_size': conversion_info.get('converted_size', 0),
            'ocr_used': conversion_info.get('ocr_used', False),
            'engine_used': conversion_info.get('engine_used', 'unknown'),
        }

        logger.info(
            f"PDF conversion done: {final_filename} "
            f"({result['converted_size']} bytes, engine={result['engine_used']})"
        )
        cache.set(cache_key, result, timeout=3600)
        return result

    except PDFConversionError as exc:
        logger.error(f"PDF conversion failed: {exc}")
        error_result = {'status': 'failed', 'error': str(exc), 'error_type': 'conversion_error'}
        cache.set(cache_key, error_result, timeout=3600)
        raise

    except Exception as exc:
        logger.exception(f"Unexpected error during PDF conversion: {exc}")
        error_result = {'status': 'failed', 'error': str(exc), 'error_type': 'unexpected_error'}
        cache.set(cache_key, error_result, timeout=3600)
        raise

    finally:
        # Clean up uploaded temp file
        try:
            if os.path.exists(input_path) and 'temp_uploads' in input_path:
                os.remove(input_path)
                logger.debug(f"Cleaned up temp input: {input_path}")
        except Exception as e:
            logger.warning(f"Failed to clean up input file: {e}")


@shared_task(name='apps.services.tasks.run_uptime_scheduler_task')
def run_uptime_scheduler_task():
    """Recurring Celery background worker loop that runs keep-alive triggers."""
    lock_key = "celery_uptime_scheduler_lock"
    # Atomic cache check
    if cache.get(lock_key):
        return "Skipping: another worker is currently executing."

    cache.set(lock_key, "running", timeout=120)
    # Set watchdog heartbeat
    cache.set("last_celery_uptime_run", "active", timeout=45)

    try:
        from .scheduler import get_triggers, save_triggers
        import datetime
        import requests
        import time

        triggers = get_triggers()
        modified = False
        now = datetime.datetime.now()

        for trigger in triggers:
            if trigger.get('status') != 'active':
                continue

            last_run_str = trigger.get('last_run')
            interval = int(trigger.get('interval_minutes', 5))
            
            should_run = False
            if not last_run_str:
                should_run = True
            else:
                try:
                    last_run_dt = datetime.datetime.strptime(last_run_str, "%Y-%m-%d %H:%M:%S")
                    if now >= last_run_dt + datetime.timedelta(minutes=interval):
                        should_run = True
                except Exception:
                    should_run = True

            if should_run:
                target = trigger.get('target', '')
                if not target:
                    continue
                
                url = target if '://' in target else f"https://{target}"
                
                start_time = time.time()
                try:
                    headers = {
                        'User-Agent': 'UptimeRobot/2.0 (compatible; ExpectException Auto-Trigger Keep-Alive)'
                    }
                    res = requests.get(url, headers=headers, timeout=12, verify=False)
                    latency = int((time.time() - start_time) * 1000)
                    status = "up" if 200 <= res.status_code < 400 else "down"
                    log_msg = f"Auto-trigger: HTTP {res.status_code} received in {latency}ms."
                except Exception as e:
                    latency = 0
                    status = "down"
                    log_msg = f"Auto-trigger connection failed: {str(e)}"

                trigger['last_run'] = now.strftime("%Y-%m-%d %H:%M:%S")
                trigger['last_status'] = status
                trigger['last_latency'] = latency
                
                logs = trigger.get('logs', [])
                logs.insert(0, f"[{now.strftime('%H:%M:%S')}] {log_msg}")
                trigger['logs'] = logs[:30]

                modified = True

        if modified:
            save_triggers(triggers)

    except Exception:
        pass
    finally:
        cache.delete(lock_key)

    # Schedule next run in 15 seconds
    run_uptime_scheduler_task.apply_async(countdown=15)
    return "Keep-alive ping completed. Scheduled next in 15s."


@shared_task(bind=True, time_limit=120, soft_time_limit=100, name='apps.services.tasks.remove_background_task')
def remove_background_task(self, input_path: str, quality_preset: str, output_format: str) -> dict:
    """Async background removal via rembg."""
    import io
    from PIL import Image
    try:
        from rembg import remove, new_session
        session = new_session('u2net', providers=['CPUExecutionProvider'])

        QUALITY_PRESETS = {
            'fast': {'max_dimension': 1024, 'quality': 75},
            'balanced': {'max_dimension': 2048, 'quality': 90},
            'best': {'max_dimension': 4096, 'quality': 95},
        }
        preset = QUALITY_PRESETS.get(quality_preset, QUALITY_PRESETS['balanced'])
        max_dim = preset['max_dimension']
        quality = preset['quality']

        with open(input_path, 'rb') as f:
            input_data = f.read()

        img = Image.open(io.BytesIO(input_data))
        if img.width > max_dim or img.height > max_dim:
            ratio = min(max_dim / img.width, max_dim / img.height)
            img = img.resize((int(img.width * ratio), int(img.height * ratio)), Image.LANCZOS)

        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)

        result = remove(img_bytes.read(), session=session)
        result_img = Image.open(io.BytesIO(result))

        output_dir = os.path.join(settings.MEDIA_ROOT, 'bg_removed')
        os.makedirs(output_dir, exist_ok=True)
        ext = '.png' if output_format == 'png' else '.jpg'
        filename = f"bg_removed_{uuid.uuid4().hex[:8]}{ext}"
        output_path = os.path.join(output_dir, filename)

        if output_format in ('jpg', 'jpeg') and result_img.mode == 'RGBA':
            bg = Image.new('RGB', result_img.size, (255, 255, 255))
            bg.paste(result_img, mask=result_img.split()[3])
            bg.save(output_path, 'JPEG', quality=quality)
        else:
            result_img.save(output_path, 'PNG', optimize=True)

        try:
            os.remove(input_path)
        except Exception:
            pass

        file_url = f"{settings.MEDIA_URL}bg_removed/{filename}"
        return {'success': True, 'file_url': file_url, 'filename': filename}

    except Exception as exc:
        try:
            os.remove(input_path)
        except Exception:
            pass
        raise self.retry(exc=exc, max_retries=0)


@shared_task(bind=True, time_limit=60, soft_time_limit=50, name='apps.services.tasks.upscale_image_task')
def upscale_image_task(self, input_path: str, scale: float, sharpness: float, denoise: bool, boost_color: bool) -> dict:
    """Async image upscaling task."""
    import io
    from PIL import Image, ImageFilter, ImageEnhance
    try:
        with open(input_path, 'rb') as f:
            image = Image.open(io.BytesIO(f.read()))
            image.load()

        source_mode = image.mode
        if image.mode not in ('RGB', 'RGBA'):
            image = image.convert('RGB')

        new_size = (int(image.width * scale), int(image.height * scale))
        upscaled = image.resize(new_size, Image.LANCZOS)

        if denoise:
            upscaled = upscaled.filter(ImageFilter.SMOOTH_MORE)
        if sharpness != 1.0:
            upscaled = ImageEnhance.Sharpness(upscaled).enhance(sharpness)
        if boost_color:
            upscaled = ImageEnhance.Color(upscaled).enhance(1.05)
            upscaled = ImageEnhance.Contrast(upscaled).enhance(1.03)

        output_dir = os.path.join(settings.MEDIA_ROOT, 'enhanced')
        os.makedirs(output_dir, exist_ok=True)
        output_format = 'PNG' if upscaled.mode == 'RGBA' else 'JPEG'
        ext = '.png' if output_format == 'PNG' else '.jpg'
        filename = f"upscaled_{uuid.uuid4().hex[:8]}{ext}"
        output_path = os.path.join(output_dir, filename)
        upscaled.save(output_path, format=output_format, quality=95)

        try:
            os.remove(input_path)
        except Exception:
            pass

        file_url = f"{settings.MEDIA_URL}enhanced/{filename}"
        return {
            'success': True,
            'file_url': file_url,
            'filename': filename,
            'original_size': f"{image.width}x{image.height}",
            'upscaled_size': f"{upscaled.width}x{upscaled.height}",
            'output_format': output_format,
        }

    except Exception as exc:
        try:
            os.remove(input_path)
        except Exception:
            pass
        raise self.retry(exc=exc, max_retries=0)


