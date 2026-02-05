# ExpectException - Production Deployment Guide

## Overview

ExpectException is a comprehensive platform providing 6 advanced AI/processing services:

1. **Audio Separator** - Separate vocals from accompaniment using Demucs
2. **PDF to Document Converter** - Convert PDFs to DOCX, DOC, ODT, RTF, or TXT with OCR support
3. **Background Remover** - Remove image backgrounds with quality options
4. **Image to Text (OCR)** - Extract text from images in 12+ languages
5. **Text to Handwriting** - Generate realistic handwriting from text
6. **AI Detector** - Detect if content is AI-generated

## Quick Start

### Prerequisites

- Python 3.12+
- PostgreSQL 13+
- Redis 6+
- Node.js 18+ (for frontend)
- 20GB disk space (for models and media)

### Development Setup

```bash
# Clone repository
git clone <repo-url>
cd expexcV2

# Backend setup
cd expectexception
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver

# In another terminal, start Celery
celery -A expectexception worker -l info

# Frontend setup (in another terminal)
cd ../frontendExpExc
npm install
npm start
```

## Production Deployment

### 1. System Requirements

```bash
# Install system dependencies
sudo apt-get update
sudo apt-get install -y \
  python3.12 python3.12-venv python3.12-dev \
  postgresql postgresql-contrib \
  redis-server \
  libpq-dev libjpeg-dev zlib1g-dev libfreetype6-dev \
  libreoffice tesseract-ocr tesseract-ocr-eng tesseract-ocr-spa \
  tesseract-ocr-fra tesseract-ocr-deu nginx supervisor

# Optional: NVIDIA CUDA for GPU support
# Instructions at https://developer.nvidia.com/cuda-downloads
```

### 2. Database Setup

```bash
# Create PostgreSQL database and user
sudo -u postgres psql
CREATE DATABASE expectexception;
CREATE USER app_user WITH PASSWORD 'secure-password';
ALTER ROLE app_user SET client_encoding TO 'utf8';
ALTER ROLE app_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE app_user SET default_transaction_deferrable TO on;
ALTER ROLE app_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE expectexception TO app_user;
\q
```

### 3. Application Setup

```bash
# Create application directory
sudo mkdir -p /var/www/expectexception
sudo chown -R www-data:www-data /var/www/expectexception

# Clone and setup
cd /var/www/expectexception
git clone <repo-url> .

# Create Python virtual environment
python3.12 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -U pip wheel setuptools
pip install -r expectexception/requirements.txt

# Collect static files
cd expectexception
python manage.py collectstatic --noinput

# Create media directories
mkdir -p media/{audio_separator,converted,nobg,resized}
chmod -R 755 media
```

### 4. Environment Configuration

Create `/var/www/expectexception/expectexception/.env`:

```env
# Django
SECRET_KEY=your-very-long-random-secret-key-change-this
DEBUG=False
DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,api.yourdomain.com

# Database
DB_ENGINE=django.db.backends.postgresql
DB_NAME=expectexception
DB_USER=app_user
DB_PASSWORD=secure-password
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379/1

# Services
AUDIO_SEPARATOR_TIMEOUT=300
PDF_CONVERSION_TIMEOUT=120
USE_GPU=True

# Tesseract
TESSERACT_CMD=/usr/bin/tesseract

# Security
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 5. Supervisor Configuration

Create `/etc/supervisor/conf.d/expectexception.conf`:

```ini
[program:expectexception-web]
command=/var/www/expectexception/venv/bin/python manage.py runserver 0.0.0.0:8000
directory=/var/www/expectexception/expectexception
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/expectexception/web.log

[program:expectexception-celery]
command=/var/www/expectexception/venv/bin/celery -A expectexception worker -l info --concurrency=4
directory=/var/www/expectexception/expectexception
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/expectexception/celery.log

[program:expectexception-beat]
command=/var/www/expectexception/venv/bin/celery -A expectexception beat -l info
directory=/var/www/expectexception/expectexception
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/expectexception/beat.log
```

### 6. Nginx Configuration

Create `/etc/nginx/sites-available/expectexception`:

```nginx
upstream django {
    server 127.0.0.1:8000;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Limits
    client_max_body_size 500M;
    
    # Logging
    access_log /var/log/nginx/expectexception_access.log;
    error_log /var/log/nginx/expectexception_error.log;

    location / {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /var/www/expectexception/expectexception/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        alias /var/www/expectexception/expectexception/media/;
        expires 7d;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/expectexception /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. SSL Certificate (Let's Encrypt)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
```

### 8. Start Services

```bash
# Supervisor
sudo systemctl restart supervisor

# Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Check status
sudo supervisorctl status
```

### 9. Verify Installation

```bash
# Run validation script
python /var/www/expectexception/validate_production.py

# Run load test
python /var/www/expectexception/load_test.py

# Check health endpoint
curl https://yourdomain.com/api/health/
```

## Testing

### Unit Tests
```bash
cd expectexception
python manage.py test apps.services.tests
```

### API Tests
```bash
# Health check
curl -X GET https://yourdomain.com/api/health/

# Get OCR languages
curl -X GET https://yourdomain.com/api/services/image-to-text/languages/

# Get AI detector models
curl -X GET https://yourdomain.com/api/ai-detector/models/
```

## Monitoring

### View Logs
```bash
# Web logs
tail -f /var/log/expectexception/web.log

# Celery logs
tail -f /var/log/expectexception/celery.log

# Nginx access logs
tail -f /var/log/nginx/expectexception_access.log

# Nginx error logs
tail -f /var/log/nginx/expectexception_error.log
```

### Database Backups
```bash
# Daily backup at 2 AM
0 2 * * * pg_dump expectexception | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz

# Retention: Keep last 30 days
find /backups -name "db_*.sql.gz" -mtime +30 -delete
```

### Health Monitoring
```bash
# Every 5 minutes
*/5 * * * * curl -s https://yourdomain.com/api/health/ || echo "Health check failed"
```

## Troubleshooting

### Services Not Starting
```bash
# Check supervisor status
sudo supervisorctl status

# Restart services
sudo supervisorctl restart expectexception-web
sudo supervisorctl restart expectexception-celery

# Check logs
sudo tail -f /var/log/expectexception/web.log
```

### Database Connection Issues
```bash
# Test PostgreSQL
psql -h localhost -U app_user -d expectexception -c "SELECT 1;"

# Check Django database
cd expectexception && python manage.py dbshell
```

### GPU Not Detected
```bash
# Check CUDA
nvidia-smi

# Test PyTorch
python -c "import torch; print(torch.cuda.is_available())"
```

### Out of Memory
```bash
# Reduce Celery concurrency
# Edit supervisor config: --concurrency=2

# Reduce Tesseract threads
# Add to settings: OCR_THREADS=1
```

## Performance Tuning

### Database
```sql
-- Create indexes
CREATE INDEX idx_imageanalysis_user ON ai_detector_imageanalysis(user_id);
CREATE INDEX idx_imageanalysis_created ON ai_detector_imageanalysis(created_at);
```

### Redis
```bash
# Increase max memory
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Celery
```bash
# Use multiple workers
# Edit supervisor: --concurrency=8

# Or use gevent
# pip install gevent
# Add: -P gevent --concurrency=100
```

## Deployment Checklist

- [ ] System requirements installed
- [ ] PostgreSQL database created
- [ ] Redis running
- [ ] Application code deployed
- [ ] Environment variables configured
- [ ] Static files collected
- [ ] Supervisor services running
- [ ] Nginx configured and running
- [ ] SSL certificate installed
- [ ] Health check passing
- [ ] Load tests passing
- [ ] Logs being written
- [ ] Backups configured
- [ ] Monitoring setup
- [ ] Team trained on operations

## Support & Documentation

- **API Documentation**: See [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Deployment Guide**: See [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)
- **Service Architecture**: See [README.md](README.md)

## License

See LICENSE file for details.
