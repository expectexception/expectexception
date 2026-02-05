# ExpectException API Documentation

## Base URL
```
Production: https://api.yourdomain.com
Staging: http://staging.yourdomain.com
Development: http://localhost:8000
```

## Authentication
API uses Django Session Authentication for browser-based requests and Token Authentication for programmatic access.

### Token Authentication
```bash
curl -H "Authorization: Token YOUR_TOKEN" http://localhost:8000/api/services/
```

## Rate Limiting
- **Limit**: 5 requests per minute per IP address
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Status Code**: 429 Too Many Requests

---

## Services API

### 1. Audio Separator

#### POST `/api/services/audio-separator/`
Separate audio into vocals and accompaniment using Demucs model.

**Request:**
```bash
curl -X POST http://localhost:8000/api/services/audio-separator/ \
  -F "audio=@song.mp3" \
  -F "model=mdx" \
  -F "timeout=300"
```

**Parameters:**
- `audio` (file, required): MP3, WAV, FLAC, OGG, M4A, AAC (max 500MB)
- `model` (string, optional): `mdx`, `htdemucs`, `demucs` (default: `mdx`)
- `timeout` (integer, optional): 10-3600 seconds (default: 300)

**Response:**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "message": "Audio separation started"
}
```

#### GET `/api/services/audio-separator/status/{task_id}/`
Check separation status and download results.

**Response (Pending):**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "progress": 0,
  "message": "Queued for processing"
}
```

**Response (Processing):**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": 45,
  "message": "Separating audio tracks..."
}
```

**Response (Success):**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "progress": 100,
  "vocals_url": "/media/audio_separator/vocals_550e8400.wav",
  "accompaniment_url": "/media/audio_separator/accompaniment_550e8400.wav",
  "zip_url": "/media/audio_separator/separation_550e8400.zip",
  "duration": 180.5,
  "message": "Audio separation completed successfully"
}
```

**Response (Error):**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failure",
  "error": "Unsupported audio format. Use MP3, WAV, FLAC, OGG, M4A, or AAC",
  "message": "Audio separation failed"
}
```

---

### 2. PDF to Document Converter

#### POST `/api/services/pdf-to-doc/`
Convert PDF to DOCX, DOC, ODT, RTF, or TXT format.

**Request:**
```bash
curl -X POST http://localhost:8000/api/services/pdf-to-doc/ \
  -F "pdf=@document.pdf" \
  -F "output_format=docx" \
  -F "enable_ocr=true" \
  -F "ocr_language=eng"
```

**Parameters:**
- `pdf` (file, required): PDF file (max 100MB)
- `output_format` (string, required): `docx`, `doc`, `odt`, `rtf`, `txt`
- `enable_ocr` (boolean, optional): Enable OCR for scanned PDFs (default: false)
- `ocr_language` (string, optional): `eng`, `spa`, `fra`, `deu`, etc. (default: `eng`)

**Response (Success):**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "success",
  "output_format": "docx",
  "file_url": "/media/converted/document_550e8400.docx",
  "file_size_kb": 256,
  "pages": 12,
  "message": "PDF conversion completed successfully"
}
```

**Response (Error):**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "error",
  "error": "Unsupported output format. Use: docx, doc, odt, rtf, txt",
  "message": "PDF conversion failed"
}
```

---

### 3. Background Remover

#### POST `/api/services/background-remover/`
Remove background from image.

**Request:**
```bash
curl -X POST http://localhost:8000/api/services/background-remover/ \
  -F "image=@photo.jpg" \
  -F "quality=balanced" \
  -F "output_format=png"
```

**Parameters:**
- `image` (file, required): JPG, PNG, BMP, GIF, WEBP (max 50MB)
- `quality` (string, optional): `fast` (1024px), `balanced` (2048px), `best` (4096px) (default: `balanced`)
- `output_format` (string, optional): `png`, `jpg` (default: `png`)

**Response (Success):**
```json
{
  "status": "success",
  "image_url": "/media/nobg/photo_processed.png",
  "original_size": "2560x1440",
  "processed_size": "2048x1152",
  "processing_time_ms": 3245,
  "quality_mode": "balanced",
  "message": "Background removed successfully"
}
```

---

### 4. Image to Text (OCR)

#### GET `/api/services/image-to-text/languages/`
Get list of supported OCR languages.

**Response:**
```json
{
  "languages": [
    {"code": "eng", "name": "English"},
    {"code": "spa", "name": "Spanish"},
    {"code": "fra", "name": "French"},
    {"code": "deu", "name": "German"},
    {"code": "chi_sim", "name": "Chinese (Simplified)"},
    {"code": "chi_tra", "name": "Chinese (Traditional)"},
    {"code": "jpn", "name": "Japanese"},
    {"code": "kor", "name": "Korean"},
    {"code": "ara", "name": "Arabic"},
    {"code": "rus", "name": "Russian"},
    {"code": "hin", "name": "Hindi"},
    {"code": "por", "name": "Portuguese"}
  ]
}
```

#### POST `/api/services/image-to-text/`
Extract text from image.

**Request:**
```bash
curl -X POST http://localhost:8000/api/services/image-to-text/ \
  -F "image=@document.png" \
  -F "language=eng"
```

**Parameters:**
- `image` (file, required): JPG, PNG, GIF, TIFF, WEBP (max 50MB)
- `language` (string, optional): Language code (default: `eng`)

**Response (Success):**
```json
{
  "status": "success",
  "text": "This is extracted text from the image...",
  "confidence": 0.92,
  "language": "eng",
  "page_count": 1,
  "processing_time_ms": 2150,
  "message": "Text extracted successfully"
}
```

---

### 5. Text to Handwriting

#### POST `/api/text-to-handwriting/generate/`
Generate handwriting image from text.

**Request:**
```bash
curl -X POST http://localhost:8000/api/text-to-handwriting/generate/ \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, World!",
    "font": "daniel",
    "paper": "white",
    "ink": "blue",
    "font_size": 24
  }'
```

**Parameters:**
- `text` (string, required): 1-5000 characters
- `font` (string, optional): `daniel`, `glegoo`, `kalam`, `indie` (default: `daniel`)
- `paper` (string, optional): `white`, `cream`, `yellow`, `light_blue` (default: `white`)
- `ink` (string, optional): `black`, `blue`, `brown`, `green`, `red` (default: `black`)
- `font_size` (integer, optional): 12-72 (default: 24)

**Response (Success):**
```json
{
  "status": "success",
  "image_url": "/media/tts/handwriting_550e8400.png",
  "image_size": "1024x768",
  "font": "daniel",
  "font_size": 24,
  "processing_time_ms": 445,
  "message": "Handwriting image generated successfully"
}
```

---

### 6. AI Detector

#### GET `/api/ai-detector/models/`
Get available detection models.

**Response:**
```json
{
  "models": [
    {"id": "default", "name": "Default Detector", "accuracy": 0.94},
    {"id": "ensemble", "name": "Ensemble Model", "accuracy": 0.97},
    {"id": "robust", "name": "Robust Detector", "accuracy": 0.91}
  ]
}
```

#### POST `/api/ai-detector/detect/`
Detect if content is AI-generated.

**Request:**
```bash
curl -X POST http://localhost:8000/api/ai-detector/detect/ \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a sample text to analyze...",
    "model": "ensemble",
    "sync": true
  }'
```

**Parameters:**
- `text` (string, required): Text to analyze (max 5000 chars)
- `model` (string, optional): Model to use (default: `default`)
- `sync` (boolean, optional): Wait for result (true) or get task_id (false) (default: false)

**Response (Sync, Success):**
```json
{
  "status": "success",
  "is_ai_generated": false,
  "confidence": 0.87,
  "score": 0.23,
  "details": {
    "perplexity": 45.3,
    "burstiness": 0.65,
    "entropy": 4.2
  },
  "processing_time_ms": 1250,
  "message": "Analysis completed"
}
```

**Response (Async, Task Queued):**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440002",
  "status": "pending",
  "message": "Detection queued for processing"
}
```

---

## Error Handling

### Common HTTP Status Codes
- `200 OK` - Successful request
- `201 Created` - Resource created
- `204 No Content` - Successful, no content to return
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied
- `404 Not Found` - Resource not found
- `413 Payload Too Large` - File size exceeds limit
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service unavailable

### Error Response Format
```json
{
  "status": "error",
  "error": "Detailed error message",
  "error_code": "INVALID_FILE_FORMAT",
  "message": "User-friendly error message"
}
```

---

## Health Check

#### GET `/api/health/`
Check system health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-02-05T10:30:45Z",
  "version": "2.1.0",
  "components": {
    "database": {"status": "ok", "response_time_ms": 5},
    "cache": {"status": "ok", "response_time_ms": 2},
    "storage": {"status": "ok", "available_gb": 245},
    "gpu": {"status": "available", "model": "NVIDIA A40"},
    "services": {
      "audio_separator": "ok",
      "pdf_converter": "ok",
      "background_remover": "ok",
      "ocr": "ok",
      "handwriting": "ok",
      "ai_detector": "ok"
    }
  }
}
```

---

## Code Examples

### Python Client
```python
import requests
import json
from pathlib import Path

BASE_URL = "http://localhost:8000"

# Audio Separator
with open('song.mp3', 'rb') as f:
    response = requests.post(
        f"{BASE_URL}/api/services/audio-separator/",
        files={'audio': f},
        data={'model': 'mdx', 'timeout': 300}
    )
    task = response.json()
    print(f"Task ID: {task['task_id']}")
    
    # Poll for status
    import time
    while True:
        status = requests.get(
            f"{BASE_URL}/api/services/audio-separator/status/{task['task_id']}/"
        ).json()
        print(f"Status: {status['status']}")
        if status['status'] in ['success', 'failure']:
            break
        time.sleep(2)

# PDF Converter
with open('document.pdf', 'rb') as f:
    response = requests.post(
        f"{BASE_URL}/api/services/pdf-to-doc/",
        files={'pdf': f},
        data={
            'output_format': 'docx',
            'enable_ocr': True,
            'ocr_language': 'eng'
        }
    )
    result = response.json()
    print(f"Download: {result['file_url']}")

# Text to Handwriting
response = requests.post(
    f"{BASE_URL}/api/text-to-handwriting/generate/",
    json={
        'text': 'Hello, World!',
        'font': 'daniel',
        'font_size': 24
    }
)
result = response.json()
print(f"Image: {result['image_url']}")

# AI Detector
response = requests.post(
    f"{BASE_URL}/api/ai-detector/detect/",
    json={
        'text': 'Sample text...',
        'model': 'ensemble',
        'sync': True
    }
)
result = response.json()
print(f"AI Generated: {result['is_ai_generated']}")
print(f"Confidence: {result['confidence']}")
```

### JavaScript/TypeScript Client
```typescript
const BASE_URL = 'http://localhost:8000';

// Audio Separator
async function separateAudio(file: File) {
  const formData = new FormData();
  formData.append('audio', file);
  formData.append('model', 'mdx');
  formData.append('timeout', '300');
  
  const response = await fetch(
    `${BASE_URL}/api/services/audio-separator/`,
    { method: 'POST', body: formData }
  );
  
  const { task_id } = await response.json();
  
  // Poll for status
  let status = 'pending';
  while (status === 'pending' || status === 'processing') {
    const statusResponse = await fetch(
      `${BASE_URL}/api/services/audio-separator/status/${task_id}/`
    );
    const statusData = await statusResponse.json();
    status = statusData.status;
    console.log(`Status: ${status}`);
    
    if (status === 'success') {
      return statusData;
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
}

// Text to Handwriting
async function generateHandwriting(text: string, font: string = 'daniel') {
  const response = await fetch(
    `${BASE_URL}/api/text-to-handwriting/generate/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        font,
        font_size: 24
      })
    }
  );
  
  return response.json();
}

// AI Detector
async function detectAI(text: string) {
  const response = await fetch(
    `${BASE_URL}/api/ai-detector/detect/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model: 'ensemble',
        sync: true
      })
    }
  );
  
  const result = await response.json();
  return {
    isAI: result.is_ai_generated,
    confidence: result.confidence,
    score: result.score
  };
}
```

---

## Changelog

### v2.1.0 (2024-02-05)
- ✅ Added rate limiting
- ✅ Enhanced error messages
- ✅ Added security headers
- ✅ Improved PDF OCR support

### v2.0.0 (2024-01-15)
- ✅ Added background remover endpoint
- ✅ Added audio separator endpoint
- ✅ Complete rewrite of service handlers

### v1.0.0 (2023-12-01)
- ✅ Initial release with AI Detector and Image to Text
