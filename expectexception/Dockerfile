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
#
# pypi.nvidia.com / download.pytorch.org serve the CUDA wheels for this and
# have repeatedly dropped mid-download on this host - a different package
# each time, always after real progress, never the same one twice. That
# pattern (not "one bad host", not "too slow") points to a flaky connection
# rather than a config problem, so this retries the whole install in place
# rather than requiring a fresh `docker build` from the operator each time.
# Keeps pip's cache (dropping --no-cache-dir) *during* the retry loop so a
# retry doesn't re-fetch what already downloaded fine, then purges it right
# before the layer is finalized so it doesn't bloat the image.
COPY requirements.txt requirements-gpu.txt ./
RUN pip install --upgrade pip && \
    pip install uv && \
    ( for i in 1 2 3 4 5; do \
        uv pip install --system -r requirements.txt -r requirements-gpu.txt && exit 0; \
        echo "install attempt $i failed, retrying..."; \
        sleep 10; \
    done; exit 1 ) && \
    uv cache clean && \
    rm -rf /root/.cache/pip

# Copy project files
COPY . /app/

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Run entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
