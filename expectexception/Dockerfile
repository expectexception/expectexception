FROM python:3.11-slim
WORKDIR /app

# OCR runtime deps (Tesseract + common language packs)
RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		tesseract-ocr \
		tesseract-ocr-eng \
		tesseract-ocr-osd \
		tesseract-ocr-hin \
		tesseract-ocr-spa \
		tesseract-ocr-fra \
		tesseract-ocr-deu \
		tesseract-ocr-ita \
		tesseract-ocr-por \
		tesseract-ocr-rus \
		tesseract-ocr-jpn \
		tesseract-ocr-kor \
		tesseract-ocr-chi-sim \
		tesseract-ocr-ara \
	&& rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PYTHONUNBUFFERED=1
CMD ["gunicorn", "expectexception.wsgi:application", "-b", "0.0.0.0:8000"]
