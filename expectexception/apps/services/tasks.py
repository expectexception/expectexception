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
    Convert PDF to Doc/Docx asynchronously using pdf_utils.
    Handles DOCX via pdf2docx (faster, layout-preserving),
    other formats via soffice (LibreOffice).
    """
    import logging
    from .pdf_utils import (
        convert_pdf_with_pdf2docx,
        convert_pdf_with_soffice,
        perform_ocr_on_pdf,
        PDFConversionError,
    )
    
    logger = logging.getLogger(__name__)
    unique_id = self.request.id
    cache_key = f"pdf_convert_result:{unique_id}"
    
    try:
        logger.info(f"Starting PDF conversion: {original_name} → {output_format}")
        
        # Prepare output directory
        converted_dir = os.path.join(settings.MEDIA_ROOT, 'converted')
        os.makedirs(converted_dir, exist_ok=True)
        
        # Generate output filename
        base_name = os.path.splitext(original_name)[0]
        final_filename = f"{base_name}_{uuid.uuid4().hex[:8]}.{output_format.lower()}"
        final_path = os.path.join(converted_dir, final_filename)
        
        # Step 1: Perform OCR if requested (creates intermediate searchable PDF)
        working_pdf = input_path
        if ocr_enabled:
            try:
                logger.info(f"Performing OCR with language: {ocr_lang}")
                ocr_pdf = os.path.join(converted_dir, f"{base_name}_ocr_temp.pdf")
                working_pdf = perform_ocr_on_pdf(input_path, ocr_pdf, ocr_lang)
            except PDFConversionError as e:
                logger.warning(f"OCR failed, continuing without OCR: {e}")
                # Continue with original PDF if OCR fails
                working_pdf = input_path
        
        # Step 2: Convert to target format
        if output_format.lower() == 'docx':
            # Use pdf2docx for DOCX (faster and layout-preserving)
            final_path = convert_pdf_with_pdf2docx(working_pdf, final_path)
        else:
            # Use soffice for other formats
            final_path = convert_pdf_with_soffice(working_pdf, output_format, final_path)
        
        # Step 3: Prepare result
        file_size = os.path.getsize(final_path)
        file_url = f"{settings.MEDIA_URL}converted/{final_filename}"
        
        result = {
            'status': 'success',
            'file_url': file_url,
            'filename': final_filename,
            'original_name': original_name,
            'format': output_format.upper(),
            'converted_size': file_size,
            'ocr_used': ocr_enabled,
        }
        
        logger.info(f"PDF conversion successful: {final_filename} ({file_size} bytes)")
        cache.set(cache_key, result, timeout=3600)
        return result
        
    except PDFConversionError as exc:
        logger.error(f"PDF conversion failed: {exc}")
        error_result = {
            'status': 'failed',
            'error': str(exc),
            'error_type': 'conversion_error',
        }
        cache.set(cache_key, error_result, timeout=3600)
        raise
    except Exception as exc:
        logger.exception(f"Unexpected error during PDF conversion: {exc}")
        error_result = {
            'status': 'failed',
            'error': str(exc),
            'error_type': 'unexpected_error',
        }
        cache.set(cache_key, error_result, timeout=3600)
        raise
    finally:
        # Clean up temporary files
        try:
            if os.path.exists(input_path) and input_path.startswith(settings.MEDIA_ROOT):
                os.remove(input_path)
                logger.debug(f"Cleaned up input file: {input_path}")
        except Exception as e:
            logger.warning(f"Failed to clean up input file: {e}")
