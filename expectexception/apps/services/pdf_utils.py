"""
PDF conversion utilities with soffice (LibreOffice) and pdf2docx support.
Handles format conversion with proper error handling and retries.
"""

import os
import subprocess
import tempfile
import logging
from pathlib import Path
from typing import Optional, Dict, Any
from django.conf import settings

logger = logging.getLogger(__name__)


class PDFConversionError(Exception):
    """Raised when PDF conversion fails."""
    pass


def get_soffice_path() -> str:
    """Get LibreOffice soffice binary path."""
    # Try configured path first
    if hasattr(settings, 'SOFFICE_CMD') and settings.SOFFICE_CMD:
        if os.path.exists(settings.SOFFICE_CMD):
            return settings.SOFFICE_CMD
    
    # Try common paths
    common_paths = [
        '/usr/bin/soffice',
        '/usr/bin/libreoffice',
        '/Applications/LibreOffice.app/Contents/MacOS/soffice',  # macOS
        'C:\\Program Files\\LibreOffice\\program\\soffice.exe',   # Windows
    ]
    
    for path in common_paths:
        if os.path.exists(path):
            return path
    
    raise PDFConversionError(
        "LibreOffice (soffice) not found. Install with: sudo apt-get install libreoffice"
    )


def validate_pdf_file(file_path: str, max_size: Optional[int] = None) -> None:
    """
    Validate PDF file existence and optionally size.
    
    Args:
        file_path: Path to PDF file
        max_size: Maximum file size in bytes (default: 50MB from settings)
    
    Raises:
        PDFConversionError: If file is invalid
    """
    if not os.path.exists(file_path):
        raise PDFConversionError(f"Input file not found: {file_path}")
    
    if not file_path.lower().endswith('.pdf'):
        raise PDFConversionError("Input file must be a PDF")
    
    if max_size is None:
        max_size = getattr(settings, 'PDF_MAX_FILE_SIZE', 50 * 1024 * 1024)
    
    file_size = os.path.getsize(file_path)
    if file_size > max_size:
        raise PDFConversionError(
            f"File too large ({file_size / (1024*1024):.1f}MB). "
            f"Maximum: {max_size / (1024*1024):.0f}MB"
        )


def convert_pdf_with_soffice(
    input_pdf: str,
    output_format: str,
    output_path: Optional[str] = None,
    timeout: int = 120,
    headless: bool = True,
) -> str:
    """
    Convert PDF to another format using LibreOffice soffice.
    
    Args:
        input_pdf: Path to input PDF file
        output_format: Target format (docx, doc, odt, rtf, txt, pdf)
        output_path: Optional output file path (auto-generated if not provided)
        timeout: Command timeout in seconds (default: 120)
        headless: Run in headless mode (default: True)
    
    Returns:
        Path to converted file
    
    Raises:
        PDFConversionError: If conversion fails
    """
    validate_pdf_file(input_pdf)
    
    # Normalize format
    output_format = output_format.lower()
    if output_format == 'docx':
        filter_format = 'MS Word 2007 XML'
        extension = '.docx'
    elif output_format == 'doc':
        filter_format = 'MS Word 97'
        extension = '.doc'
    elif output_format == 'odt':
        filter_format = 'ODF Text Document'
        extension = '.odt'
    elif output_format == 'rtf':
        filter_format = 'Rich Text Format'
        extension = '.rtf'
    elif output_format == 'txt':
        filter_format = 'Text'
        extension = '.txt'
    elif output_format == 'pdf':
        # PDF to PDF (OCR or copy)
        filter_format = 'PDF - Portable Document Format'
        extension = '.pdf'
    else:
        raise PDFConversionError(
            f"Unsupported format: {output_format}. "
            f"Supported: docx, doc, odt, rtf, txt, pdf"
        )
    
    # Prepare output path
    if output_path is None:
        temp_dir = getattr(settings, 'FILE_UPLOAD_TEMP_DIR', '/tmp')
        output_dir = temp_dir
        output_filename = f"{Path(input_pdf).stem}{extension}"
        output_path = os.path.join(output_dir, output_filename)
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Build soffice command
    soffice_path = get_soffice_path()
    cmd = [
        soffice_path,
        '--headless' if headless else '--norestore',
        '--convert-to', f'{output_format}:{filter_format}',
        '--outdir', os.path.dirname(output_path),
        input_pdf,
    ]
    
    logger.info(f"Converting PDF: {input_pdf} → {output_format}")
    logger.debug(f"Command: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        
        if result.returncode != 0:
            error_msg = result.stderr or result.stdout or "Unknown error"
            logger.error(f"soffice conversion failed: {error_msg}")
            raise PDFConversionError(
                f"LibreOffice conversion failed: {error_msg}"
            )
        
        # soffice outputs file with original basename, so we need to find it
        expected_output = os.path.join(
            os.path.dirname(output_path),
            f"{Path(input_pdf).stem}{extension}"
        )
        
        if not os.path.exists(expected_output):
            raise PDFConversionError(
                f"Output file not created at expected path: {expected_output}\n"
                f"soffice output: {result.stdout}"
            )
        
        logger.info(f"PDF conversion successful: {expected_output}")
        return expected_output
        
    except subprocess.TimeoutExpired:
        raise PDFConversionError(
            f"Conversion timed out after {timeout} seconds. "
            "Try a smaller file or increase PDF_CONVERSION_TIMEOUT."
        )
    except Exception as exc:
        raise PDFConversionError(f"Conversion error: {str(exc)}")


def convert_pdf_with_pdf2docx(
    input_pdf: str,
    output_docx: str,
    timeout: int = 120,
) -> str:
    """
    Convert PDF to DOCX using pdf2docx library (faster, preserves layout).
    
    Args:
        input_pdf: Path to input PDF file
        output_docx: Path to output DOCX file
        timeout: Conversion timeout (currently not used, but kept for API consistency)
    
    Returns:
        Path to converted DOCX file
    
    Raises:
        PDFConversionError: If conversion fails
    """
    validate_pdf_file(input_pdf)
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_docx), exist_ok=True)
    
    try:
        from pdf2docx import Converter
        
        logger.info(f"Converting PDF with pdf2docx: {input_pdf} → {output_docx}")
        
        converter = Converter(input_pdf)
        converter.convert(output_docx, start=0, end=None)
        converter.close()
        
        if not os.path.exists(output_docx):
            raise PDFConversionError("DOCX file was not created by pdf2docx")
        
        logger.info(f"PDF conversion successful: {output_docx}")
        return output_docx
        
    except ImportError:
        raise PDFConversionError(
            "pdf2docx library not installed. Install with: pip install pdf2docx"
        )
    except Exception as exc:
        raise PDFConversionError(f"pdf2docx conversion error: {str(exc)}")


def perform_ocr_on_pdf(
    input_pdf: str,
    output_pdf: str,
    language: str = 'eng',
    timeout: int = 120,
) -> str:
    """
    Perform OCR on PDF using soffice with OCR capability.
    Creates a searchable PDF from scanned documents.
    
    Args:
        input_pdf: Path to input PDF file
        output_pdf: Path to output PDF file with OCR
        language: OCR language (e.g., 'eng', 'spa', 'fra')
        timeout: OCR timeout in seconds
    
    Returns:
        Path to OCR'd PDF file
    
    Raises:
        PDFConversionError: If OCR fails
    """
    validate_pdf_file(input_pdf)
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_pdf), exist_ok=True)
    
    soffice_path = get_soffice_path()
    
    cmd = [
        soffice_path,
        '--headless',
        '--convert-to', f'pdf:writer_pdf_Export:{"OCREngine=tesseract" if language else ""}',
        '--outdir', os.path.dirname(output_pdf),
        input_pdf,
    ]
    
    logger.info(f"Performing OCR on PDF: {input_pdf}")
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        
        if result.returncode != 0:
            error_msg = result.stderr or result.stdout or "Unknown error"
            logger.warning(f"soffice OCR had issues: {error_msg}. Trying fallback...")
            # Try without OCR engine specification
            cmd = [
                soffice_path,
                '--headless',
                '--convert-to', 'pdf',
                '--outdir', os.path.dirname(output_pdf),
                input_pdf,
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        
        expected_output = os.path.join(
            os.path.dirname(output_pdf),
            f"{Path(input_pdf).stem}.pdf"
        )
        
        if not os.path.exists(expected_output):
            raise PDFConversionError(f"Output PDF not created: {expected_output}")
        
        logger.info(f"OCR successful: {expected_output}")
        return expected_output
        
    except subprocess.TimeoutExpired:
        raise PDFConversionError(f"OCR timed out after {timeout} seconds")
    except Exception as exc:
        raise PDFConversionError(f"OCR error: {str(exc)}")


def batch_convert_pdf(
    input_pdf: str,
    output_formats: list,
    output_dir: Optional[str] = None,
) -> Dict[str, Dict[str, Any]]:
    """
    Convert PDF to multiple formats in a single operation (more efficient).
    
    Args:
        input_pdf: Path to input PDF file
        output_formats: List of output formats (docx, doc, odt, rtf, txt)
        output_dir: Output directory (uses MEDIA_ROOT/converted if not specified)
    
    Returns:
        Dictionary with results for each format
    """
    validate_pdf_file(input_pdf)
    
    if output_dir is None:
        output_dir = os.path.join(settings.MEDIA_ROOT, 'converted')
    
    results = {}
    
    for fmt in output_formats:
        try:
            output_path = os.path.join(
                output_dir,
                f"{Path(input_pdf).stem}.{fmt.lower()}"
            )
            output_file = convert_pdf_with_soffice(input_pdf, fmt, output_path)
            
            results[fmt] = {
                'status': 'success',
                'path': output_file,
                'size': os.path.getsize(output_file),
                'url': f"{settings.MEDIA_URL}converted/{os.path.basename(output_file)}"
            }
        except PDFConversionError as exc:
            results[fmt] = {
                'status': 'failed',
                'error': str(exc)
            }
    
    return results
