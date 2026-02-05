# Production Readiness Guide

## System Requirements

### Backend
- Python 3.12+
- PostgreSQL 13+
- Redis 6+
- LibreOffice/soffice
- Tesseract OCR
- NVIDIA CUDA 11.8+ (optional, for GPU acceleration)

### Installation Checklist

```bash
# Install system dependencies
sudo apt-get update
sudo apt-get install -y \
  libpq-dev \
  python3-dev \
  libjpeg-dev \
  zlib1g-dev \
  libfreetype6-dev \
  libreoffice \
  tesseract-ocr \
  tesseract-ocr-eng \
  tesseract-ocr-spa \
  tesseract-ocr-fra \
  tesseract-ocr-deu

# Install Python dependencies
cd /home/rjt/expexcV2/expectexception
pip install -r requirements.txt

# Install additional ML dependencies
pip install torch torchvision transformers rembg pdf2docx demucs
```

## Environment Configuration

### Create .env file

```bash
# Django
SECRET_KEY=your-secret-key-here-change-in-production
DEBUG=False
DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,api.yourdomain.com

# Database
DB_ENGINE=django.db.backends.postgresql
DB_NAME=expectexception
DB_USER=postgres
DB_PASSWORD=secure-password-here
DB_HOST=localhost
DB_PORT=5432

# Redis/Cache
REDIS_URL=redis://localhost:6379/1

# Email (optional)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Service Settings
AUDIO_SEPARATOR_MODEL=mdx
AUDIO_SEPARATOR_TIMEOUT=300
PDF_CONVERSION_TIMEOUT=120
USE_GPU=True
GPU_DEVICE=auto

# Tesseract
TESSERACT_CMD=/usr/bin/tesseract
OCR_DEFAULT_LANGUAGE=eng

# Security
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
SERVICE_RATE_LIMIT=5/minute
MAX_UPLOAD_SIZE_MB=500

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
```

## Database Setup

```bash
# Create PostgreSQL database
sudo -u postgres createdb expectexception
sudo -u postgres createuser postgres

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Create required directories
mkdir -p /var/www/expectexception/media/{audio_separator,converted,nobg,resized,splits,covers}
chmod -R 755 /var/www/expectexception/media
```

## Celery & Redis Setup

### Redis Installation
```bash
sudo apt-get install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### Celery Configuration
```bash
# Start Celery worker
celery -A expectexception worker -l info

# Start Celery beat (scheduler)
celery -A expectexception beat -l info

# Or use supervisor for production
sudo apt-get install supervisor
```

## Systemd Service Files

### Create `/etc/systemd/system/expectexception-backend.service`
```ini
[Unit]
Description=ExpectException Django Backend
After=network.target postgresql.service redis.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/home/rjt/expexcV2/expectexception
ExecStart=/usr/bin/python manage.py runserver 0.0.0.0:8000
Environment="PATH=/home/rjt/expexcV2/venv/bin"
StandardOutput=journal
StandardError=journal
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Create `/etc/systemd/system/expectexception-celery.service`
```ini
[Unit]
Description=ExpectException Celery Worker
After=network.target redis.service

[Service]
Type=forking
User=www-data
Group=www-data
WorkingDirectory=/home/rjt/expexcV2/expectexception
ExecStart=/usr/bin/python -m celery -A expectexception worker -l info
Environment="PATH=/home/rjt/expexcV2/venv/bin"
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## Nginx Configuration

### Create `/etc/nginx/sites-available/expectexception`
```nginx
upstream django {
    server unix:/run/expectexception.sock;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# Main HTTPS server
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
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # File size limits
    client_max_body_size 500M;
    
    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    
    location / {
        uwsgi_pass django;
        include /etc/nginx/uwsgi_params;
    }
    
    location /static/ {
        alias /var/www/expectexception/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /media/ {
        alias /var/www/expectexception/media/;
        expires 7d;
    }
}
```

## Docker Deployment

### Build Docker Image
```bash
docker build -t expectexception-backend -f Dockerfile .
docker build -t expectexception-frontend -f frontendExpExc/Dockerfile .
```

### Docker Compose
```bash
docker-compose up -d
docker-compose exec web python manage.py migrate
docker-compose exec web python manage.py createsuperuser
```

## Health Checks

### API Health Endpoint
```bash
# Check backend health
curl -X GET http://localhost:8000/api/health/

# Check service availability
curl -X GET http://localhost:8000/api/services/health/

# Check database
curl -X GET http://localhost:8000/api/admin/health/
```

### Service-Specific Health
```bash
# OCR Service
curl -X GET http://localhost:8000/api/services/image-to-text/

# Audio Separator
curl -X POST http://localhost:8000/api/services/audio-separator/ \
  -F "audio=@test.wav"

# Background Remover
curl -X POST http://localhost:8000/api/services/background-remover/ \
  -F "image=@test.jpg"
```

## Performance Optimization

### Database
```sql
-- Create indexes for better query performance
CREATE INDEX idx_imageanalysis_user ON ai_detector_imageanalysis(user_id);
CREATE INDEX idx_imageanalysis_created ON ai_detector_imageanalysis(created_at);
CREATE INDEX idx_toolusage_service ON services_toolusage(tool_name);
```

### Caching
- Redis configured for query caching
- Detection results cached for 24 hours
- Language lists cached per instance
- Model status cached for 5 minutes

### Load Balancing
```nginx
upstream django_backend {
    least_conn;
    server backend1.local:8000;
    server backend2.local:8000;
    server backend3.local:8000;
}
```

## Monitoring & Logging

### Django Logging
- All service access logged to `SERVICE_ACCESS` logger
- Error logs to `/var/log/expectexception/error.log`
- Access logs to `/var/log/expectexception/access.log`

### Monitoring Tools
- Prometheus for metrics collection
- Grafana for visualization
- ELK Stack for centralized logging

### Key Metrics
- Request latency (p50, p95, p99)
- Error rates by service
- GPU/CPU/Memory usage
- Database connection pool stats

## Rollback Procedures

```bash
# Database rollback
python manage.py migrate apps 0001

# Docker rollback
docker-compose pull
docker-compose up -d

# Nginx reload (no downtime)
sudo nginx -s reload
```

## Security Checklist

- [ ] Change default SECRET_KEY
- [ ] Set DEBUG=False
- [ ] Configure ALLOWED_HOSTS
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure firewall rules
- [ ] Set up rate limiting
- [ ] Enable audit logging
- [ ] Configure backups
- [ ] Setup monitoring/alerting
- [ ] Review CORS settings
- [ ] Implement WAF rules

## Backup & Recovery

```bash
# Database backup
pg_dump expectexception > backup_$(date +%Y%m%d_%H%M%S).sql

# Media files backup
tar -czf media_$(date +%Y%m%d_%H%M%S).tar.gz /var/www/expectexception/media/

# Automated backup (cron)
0 2 * * * pg_dump expectexception | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz
```

## Deployment Checklist

- [ ] All services tested locally
- [ ] Environment variables configured
- [ ] Database migrated
- [ ] Static files collected
- [ ] Celery workers running
- [ ] Redis cache available
- [ ] SSL certificate installed
- [ ] Nginx configured
- [ ] Health checks passing
- [ ] Error logging working
- [ ] Monitoring setup
- [ ] Backup procedures verified
- [ ] Rollback procedure tested
- [ ] Team trained on deployment

## Troubleshooting

### 503 Service Unavailable
- Check Celery worker status
- Check Redis connection
- Check database connectivity
- Check system resources

### 500 Internal Server Error
- Check Django error logs
- Check Celery worker logs
- Verify environment variables
- Check file permissions

### Slow Requests
- Check database query performance
- Monitor cache hit rates
- Check GPU/CPU usage
- Review Celery task queue

### Out of Memory
- Reduce batch sizes
- Increase swap space
- Limit concurrent tasks
- Implement request timeouts
