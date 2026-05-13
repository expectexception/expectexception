"""
PDF conversion utilities — multi-engine strategy for maximum accuracy.

Conversion strategy:
  DOCX → pdf2docx (best layout fidelity, supports tables/images)
       → fallback: soffice if pdf2docx fails
  DOC/ODT/RTF/TXT → soffice (LibreOffice), isolated user profile per call
  OCR (scanned) → pytesseract page-by-page → reassemble → convert

Key fixes vs v1:
  • soffice gets unique HOME per call (prevents concurrent-user-profile corruption)
  • pdf2docx used for DOCX by default with soffice fallback
  • pytesseract OCR pipeline instead of broken soffice OCR mode
  • Correct LibreOffice filter names
  • original_size always included in result dict
"""

import os
import shutil
import subprocess
import tempfile
import logging
import uuid
from pathlib import Path
from typing import Optional, Dict, Any

from django.conf import settings

logger = logging.getLogger(__name__)


class PDFConversionError(Exception):
    """Raised when PDF conversion fails."""
    pass


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_soffice_path() -> str:
    """Return path to LibreOffice soffice binary."""
    if hasattr(settings, 'SOFFICE_CMD') and settings.SOFFICE_CMD:
        if os.path.exists(settings.SOFFICE_CMD):
            return settings.SOFFICE_CMD

    for path in ['/usr/bin/soffice', '/usr/bin/libreoffice']:
        if os.path.exists(path):
            return path

    raise PDFConversionError(
        "LibreOffice not found. Install with: sudo apt-get install libreoffice"
    )


def validate_pdf_file(file_path: str, max_size: Optional[int] = None) -> None:
    """Validate PDF file exists, is a PDF, and is within size limits."""
    if not os.path.exists(file_path):
        raise PDFConversionError(f"Input file not found: {file_path}")

    if not file_path.lower().endswith('.pdf'):
        raise PDFConversionError("Input file must have a .pdf extension")

    if max_size is None:
        max_size = getattr(settings, 'PDF_MAX_FILE_SIZE', 50 * 1024 * 1024)

    file_size = os.path.getsize(file_path)
    if file_size > max_size:
        raise PDFConversionError(
            f"File too large ({file_size / (1024*1024):.1f} MB). "
            f"Maximum: {max_size / (1024*1024):.0f} MB"
        )


def _soffice_env(home_dir: str) -> dict:
    """Build a clean environment for soffice with an isolated user profile."""
    env = {
        'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
        # Each call gets its own HOME so LibreOffice profiles never clash
        'HOME': home_dir,
        # Suppress D-Bus / display requirements
        'DISPLAY': '',
        'DBUS_SESSION_BUS_ADDRESS': 'disabled:',
    }
    for key in ('LANG', 'LC_ALL', 'LC_CTYPE', 'TZ'):
        if key in os.environ:
            env[key] = os.environ[key]
    return env


# ---------------------------------------------------------------------------
# soffice conversion
# ---------------------------------------------------------------------------

# Correct LibreOffice export filter names
_SOFFICE_FILTERS = {
    'docx': 'MS Word 2007 XML',
    'doc':  'MS Word 97',
    'odt':  'writer8',
    'rtf':  'Rich Text Format',
    'txt':  'Text (encoded)',
    'pdf':  'writer_pdf_Export',
}

_SOFFICE_EXTENSIONS = {
    'docx': '.docx',
    'doc':  '.doc',
    'odt':  '.odt',
    'rtf':  '.rtf',
    'txt':  '.txt',
    'pdf':  '.pdf',
}


def convert_pdf_with_soffice(
    input_pdf: str,
    output_format: str,
    output_path: Optional[str] = None,
    timeout: int = 180,
) -> str:
    """
    Convert PDF → another format using LibreOffice (soffice).

    Uses an isolated HOME directory per call to avoid LibreOffice
    user-profile corruption when multiple conversions run in parallel.

    Returns: path to the converted file.
    """
    validate_pdf_file(input_pdf)

    output_format = output_format.lower()
    if output_format not in _SOFFICE_FILTERS:
        raise PDFConversionError(
            f"Unsupported format '{output_format}'. "
            f"Supported: {', '.join(_SOFFICE_FILTERS)}"
        )

    extension = _SOFFICE_EXTENSIONS[output_format]
    filter_name = _SOFFICE_FILTERS[output_format]
    soffice_path = get_soffice_path()

    # Create isolated temp dirs for this conversion
    run_dir = tempfile.mkdtemp(prefix='soffice_run_')
    try:
        # soffice writes output as <stem><ext> in --outdir
        out_dir = run_dir
        expected_stem = Path(input_pdf).stem
        expected_output = os.path.join(out_dir, f"{expected_stem}{extension}")

        cmd = [
            soffice_path,
            '--headless',
            '--norestore',
            '--nofirststartwizard',
            '--convert-to', f"{output_format}:{filter_name}",
            '--outdir', out_dir,
            input_pdf,
        ]

        logger.info(f"soffice: {input_pdf} → {output_format}  (filter: {filter_name})")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=_soffice_env(run_dir),
        )

        if result.returncode != 0:
            msg = (result.stderr or result.stdout or 'no output').strip()
            raise PDFConversionError(f"LibreOffice failed (rc={result.returncode}): {msg}")

        if not os.path.exists(expected_output):
            # soffice sometimes keeps input stem 1:1 — do a glob search
            candidates = list(Path(out_dir).glob(f"*{extension}"))
            if not candidates:
                raise PDFConversionError(
                    f"soffice produced no output file in {out_dir}. "
                    f"stdout: {result.stdout}  stderr: {result.stderr}"
                )
            expected_output = str(candidates[0])

        # Move to the caller-specified output path (or MEDIA_ROOT/converted)
        if output_path is None:
            converted_dir = os.path.join(settings.MEDIA_ROOT, 'converted')
            os.makedirs(converted_dir, exist_ok=True)
            output_path = os.path.join(converted_dir, Path(expected_output).name)

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        shutil.move(expected_output, output_path)

        logger.info(f"soffice conversion done: {output_path}")
        return output_path

    except subprocess.TimeoutExpired:
        raise PDFConversionError(
            f"Conversion timed out after {timeout}s. Try a smaller file."
        )
    finally:
        shutil.rmtree(run_dir, ignore_errors=True)


# ---------------------------------------------------------------------------
# pdf2docx conversion
# ---------------------------------------------------------------------------

def convert_pdf_with_pdf2docx(
    input_pdf: str,
    output_docx: str,
    password: Optional[str] = None,
    start_page: int = 0,
    end_page: Optional[int] = None,
) -> str:
    """
    Convert PDF → DOCX using pdf2docx (best layout/table fidelity).

    Falls back details:
      - Preserves text, tables, images, columns, headers/footers
      - Handles multi-column layouts better than soffice

    Returns: path to output DOCX.
    """
    validate_pdf_file(input_pdf)
    os.makedirs(os.path.dirname(output_docx), exist_ok=True)

    try:
        from pdf2docx import Converter
    except ImportError:
        raise PDFConversionError(
            "pdf2docx not installed. Run: pip install pdf2docx"
        )

    logger.info(f"pdf2docx: {input_pdf} → {output_docx}")
    cv = None
    try:
        cv = Converter(input_pdf, password=password)
        cv.convert(output_docx, start=start_page, end=end_page)
        cv.close()
    except Exception as exc:
        if cv:
            try:
                cv.close()
            except Exception:
                pass
        raise PDFConversionError(f"pdf2docx error: {exc}")

    if not os.path.exists(output_docx):
        raise PDFConversionError("pdf2docx did not produce an output file")

    logger.info(f"pdf2docx done: {output_docx}")
    return output_docx


# ---------------------------------------------------------------------------
# OCR pipeline (pytesseract → reconstructed PDF → convert)
# ---------------------------------------------------------------------------

def perform_ocr_on_pdf(
    input_pdf: str,
    output_pdf: str,
    language: str = 'eng',
    timeout: int = 300,
) -> str:
    """
    OCR a scanned PDF using pytesseract + pdf2image.

    Strategy:
      1. Render each PDF page to an image (pdf2image / poppler)
      2. Run tesseract on each image → searchable PDF layer
      3. Merge all page PDFs with PyPDF2 into one searchable PDF

    The resulting PDF has a text layer, so subsequent soffice/pdf2docx
    conversion produces editable text.

    Returns: path to OCR'd PDF.
    """
    validate_pdf_file(input_pdf)
    os.makedirs(os.path.dirname(output_pdf), exist_ok=True)

    ocr_dir = tempfile.mkdtemp(prefix='ocr_run_')
    try:
        # --- Render pages to images ---
        try:
            from pdf2image import convert_from_path
        except ImportError:
            raise PDFConversionError(
                "pdf2image not installed. Run: pip install pdf2image"
            )

        logger.info(f"OCR: rendering pages of {input_pdf} (lang={language})")
        pages = convert_from_path(
            input_pdf,
            dpi=300,
            output_folder=ocr_dir,
            fmt='png',
            thread_count=2,
        )
        logger.info(f"OCR: {len(pages)} pages rendered")

        # --- Run tesseract on each page ---
        try:
            import pytesseract
            from PIL import Image
        except ImportError:
            raise PDFConversionError("pytesseract / Pillow not installed")

        page_pdfs = []
        for i, page_img in enumerate(pages):
            page_pdf_path = os.path.join(ocr_dir, f"page_{i:04d}.pdf")
            pytesseract.image_to_pdf_or_hocr(
                page_img,
                lang=language,
                extension='pdf',
                config='--psm 3',  # Fully automatic page segmentation
            )
            # pytesseract returns bytes
            pdf_bytes = pytesseract.image_to_pdf_or_hocr(
                page_img,
                lang=language,
                extension='pdf',
                config='--psm 3',
            )
            with open(page_pdf_path, 'wb') as f:
                f.write(pdf_bytes)
            page_pdfs.append(page_pdf_path)

        logger.info(f"OCR: {len(page_pdfs)} pages processed")

        # --- Merge page PDFs ---
        try:
            from PyPDF2 import PdfMerger
        except ImportError:
            raise PDFConversionError("PyPDF2 not installed")

        merger = PdfMerger()
        for p in page_pdfs:
            merger.append(p)

        with open(output_pdf, 'wb') as f:
            merger.write(f)
        merger.close()

        if not os.path.exists(output_pdf):
            raise PDFConversionError("OCR: merged PDF not created")

        logger.info(f"OCR complete: {output_pdf}")
        return output_pdf

    except PDFConversionError:
        raise
    except Exception as exc:
        raise PDFConversionError(f"OCR pipeline error: {exc}")
    finally:
        shutil.rmtree(ocr_dir, ignore_errors=True)


# ---------------------------------------------------------------------------
# High-level smart converter (used by the Celery task)
# ---------------------------------------------------------------------------

def smart_convert_pdf(
    input_pdf: str,
    output_format: str,
    output_path: str,
    ocr_enabled: bool = False,
    ocr_lang: str = 'eng',
) -> Dict[str, Any]:
    """
    Smart PDF conversion with multi-engine fallback strategy.

    Strategy:
      1. If ocr_enabled: run pytesseract OCR pipeline first → searchable PDF
      2. For DOCX: try pdf2docx first (best quality), fallback to soffice
      3. For other formats: soffice directly

    Returns dict with: file_path, format, converted_size, ocr_used, engine_used
    """
    validate_pdf_file(input_pdf)
    original_size = os.path.getsize(input_pdf)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    working_pdf = input_pdf
    ocr_actually_used = False

    # Step 1: OCR if requested
    if ocr_enabled:
        ocr_output = output_path.replace(f'.{output_format}', '_ocr_tmp.pdf')
        try:
            working_pdf = perform_ocr_on_pdf(input_pdf, ocr_output, language=ocr_lang)
            ocr_actually_used = True
            logger.info("OCR step completed successfully")
        except PDFConversionError as e:
            logger.warning(f"OCR step failed, converting without OCR: {e}")
            working_pdf = input_pdf  # fallback to original

    # Step 2: Convert to target format
    engine_used = None

    if output_format.lower() == 'docx':
        # Try pdf2docx first (better layout preservation)
        try:
            final_path = convert_pdf_with_pdf2docx(working_pdf, output_path)
            engine_used = 'pdf2docx'
        except PDFConversionError as e:
            logger.warning(f"pdf2docx failed ({e}), falling back to soffice")
            final_path = convert_pdf_with_soffice(working_pdf, 'docx', output_path)
            engine_used = 'soffice-fallback'
    else:
        final_path = convert_pdf_with_soffice(working_pdf, output_format, output_path)
        engine_used = 'soffice'

    # Clean up OCR temp
    if ocr_actually_used and os.path.exists(working_pdf) and working_pdf != input_pdf:
        try:
            os.remove(working_pdf)
        except OSError:
            pass

    converted_size = os.path.getsize(final_path)

    return {
        'file_path': final_path,
        'format': output_format.upper(),
        'original_size': original_size,
        'converted_size': converted_size,
        'ocr_used': ocr_actually_used,
        'engine_used': engine_used,
    }


# ---------------------------------------------------------------------------
# Batch helper (unchanged API)
# ---------------------------------------------------------------------------

def batch_convert_pdf(
    input_pdf: str,
    output_formats: list,
    output_dir: Optional[str] = None,
) -> Dict[str, Dict[str, Any]]:
    """Convert PDF to multiple formats in one call."""
    validate_pdf_file(input_pdf)

    if output_dir is None:
        output_dir = os.path.join(settings.MEDIA_ROOT, 'converted')
    os.makedirs(output_dir, exist_ok=True)

    results = {}
    for fmt in output_formats:
        try:
            output_path = os.path.join(
                output_dir,
                f"{Path(input_pdf).stem}_{uuid.uuid4().hex[:6]}.{fmt.lower()}"
            )
            info = smart_convert_pdf(input_pdf, fmt, output_path)
            results[fmt] = {
                'status': 'success',
                'path': info['file_path'],
                'size': info['converted_size'],
                'url': f"{settings.MEDIA_URL}converted/{os.path.basename(info['file_path'])}",
                'engine': info['engine_used'],
            }
        except PDFConversionError as exc:
            results[fmt] = {'status': 'failed', 'error': str(exc)}

    return results
