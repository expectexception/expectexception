FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install system dependencies needed for OCR, LibreOffice, and general builds
RUN apt-get update && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-eng tesseract-ocr-osd tesseract-ocr-hin tesseract-ocr-spa \
        tesseract-ocr-fra tesseract-ocr-deu tesseract-ocr-ita tesseract-ocr-por \
        tesseract-ocr-rus tesseract-ocr-jpn tesseract-ocr-kor tesseract-ocr-chi-sim \
    tesseract-ocr-ara \
        libreoffice \
        ffmpeg \
        gcc \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies. requirements.txt is the "light" set shared
# with Render; requirements-gpu.txt adds the heavy AI/ML deps (torch,
# transformers, rembg, demucs, onnxruntime-gpu) that only this local server
# needs to actually run AI Detector / Background Remover / Audio Separator
# instead of silently degrading to "no models installed".
COPY requirements.txt requirements-gpu.txt ./
RUN pip install --upgrade pip && \
    pip install uv && \
    uv pip install --system --no-cache-dir -r requirements.txt -r requirements-gpu.txt

# Copy project files
COPY . /app/

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Run entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
