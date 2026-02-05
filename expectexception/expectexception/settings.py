import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
from django.utils.translation import gettext_lazy as _
from django.urls import reverse_lazy

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret')
DEBUG = os.getenv('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost').split(',') + ['djangobackend', 'ytd.expectexception.com']
CSRF_TRUSTED_ORIGINS = os.getenv('DJANGO_CSRF_TRUSTED_ORIGINS', 'http://localhost').split(',') + ['https://ytd.expectexception.com']
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Ensure upload directory exists
os.makedirs('/tmp/django_uploads', exist_ok=True)

# Session and CSRF cookies - Secure for HTTPS
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'


INSTALLED_APPS = [
    # Unfold Admin (Must come before django.contrib.admin)
    "unfold",
    "unfold.contrib.filters",
    "unfold.contrib.forms",
    "unfold.contrib.import_export",
    
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'corsheaders',
    'django_filters',
    'drf_spectacular',

    'apps.users',
    'apps.blog',
    'apps.videos',
    'apps.services',

    'apps.profiles',
    'apps.notifications',
    'apps.dashboard',
    'apps.ai_detector',
    'apps.text_to_handwriting',
    'apps.secret_sharer',
    'apps.contact',
    'apps.chatbot',
    'django.contrib.sites',
    'django.contrib.sitemaps',
]

SITE_ID = 1

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.services.middleware.ProLevelLoggingMiddleware',
    'apps.services.security.SecurityHeadersMiddleware',  # Add security headers
]

ROOT_URLCONF = 'expectexception.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {'context_processors': ['django.template.context_processors.debug',
                                           'django.template.context_processors.request',
                                           'django.contrib.auth.context_processors.auth',
                                           'django.contrib.messages.context_processors.messages']},
    }
]

WSGI_APPLICATION = 'expectexception.wsgi.application'

# Database: use sqlite by default for dev
DATABASES = {
    'default': {
        'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.postgresql'),
        'NAME': os.getenv('DB_NAME', 'expectexception'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', '127.0.0.1'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

AUTH_USER_MODEL = 'users.User'

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATICFILES_DIRS = [
    BASE_DIR.parent / "frontendExpExc" / "build",
]
STATIC_ROOT = BASE_DIR / 'staticfiles'
if not DEBUG:
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'PAGE_SIZE': 10,
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'EXCEPTION_HANDLER': 'apps.services.exceptions.custom_exception_handler',
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# =============================================================================
# Email Configuration (SMTP)
# =============================================================================
# For Gmail: use App Password (not regular password)
# Generate at: https://myaccount.google.com/apppasswords
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@expectexception.com')
# Where to send contact form submissions (Cloudflare routes to Gmail)
CONTACT_EMAIL = os.getenv('CONTACT_EMAIL', 'contact@expectexception.com')

# Celery settings
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', CELERY_BROKER_URL)

# S3 / storage settings
USE_S3 = os.getenv('USE_S3', 'False').lower() in ('1', 'true', 'yes')
if USE_S3:
    INSTALLED_APPS += ['storages']
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME = os.getenv('AWS_S3_REGION_NAME', None)
    AWS_S3_SIGNATURE_VERSION = os.getenv('AWS_S3_SIGNATURE_VERSION', 's3v4')
else:
    MEDIA_ROOT = BASE_DIR / 'media'

# Logging Configuration
LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{levelname}] {asctime} {name} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '[{levelname}] {asctime} {message}',
            'style': '{',
        },
        'json_like': {
            'format': '{asctime} | {levelname} | {name} | {message}',
            'style': '{',
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file_all': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOG_DIR / 'app.log',
            'maxBytes': 1024 * 1024 * 10,  # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'file_errors': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOG_DIR / 'errors.log',
            'maxBytes': 1024 * 1024 * 10,  # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'file_downloads': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOG_DIR / 'downloads.log',
            'maxBytes': 1024 * 1024 * 10,  # 10 MB
            'backupCount': 5,
            'formatter': 'json_like',
        },
        'file_requests': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOG_DIR / 'requests.log',
            'maxBytes': 1024 * 1024 * 10,  # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file_all'],
            'level': 'INFO',
            'propagate': True,
        },
        'django.request': {
            'handlers': ['console', 'file_errors'],
            'level': 'ERROR',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console', 'file_all'],
            'level': 'INFO',
            'propagate': True,
        },
        'apps.services.downloads': {
            'handlers': ['file_downloads', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps.services.requests': {
            'handlers': ['file_requests'],
            'level': 'INFO',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console', 'file_all'],
        'level': 'INFO',
    },
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'ExpectException API',
    'DESCRIPTION': 'Django REST API for the ExpectException site',
    'VERSION': '2.0.0',
}

# =============================================================================
# AI Image Detector Settings
# =============================================================================

# Audio separator defaults
# model options depend on installed demucs versions (e.g., 'htdemucs', 'mdx_extra')
AUDIO_SEPARATOR_MODEL = os.getenv('AUDIO_SEPARATOR_MODEL', 'mdx')
# Per-task timeout in seconds
AUDIO_SEPARATOR_TIMEOUT = int(os.getenv('AUDIO_SEPARATOR_TIMEOUT', '300'))
# Cache timeout for task results (seconds)
AUDIO_SEPARATOR_CACHE_TIMEOUT = int(os.getenv('AUDIO_SEPARATOR_CACHE_TIMEOUT', str(24 * 3600)))

# Detection models configuration (ensemble mode)
# Each model contributes to the final prediction with its weight
AI_DETECTOR_MODELS = [
    {
        'name': 'umm-maybe/AI-image-detector',
        'weight': 1.0,
        'priority': 1,
        'enabled': True,
        'max_image_size': 512,
    },
    {
        'name': 'Organika/sdxl-detector',
        'weight': 0.8,
        'priority': 2,
        'enabled': True,
        'max_image_size': 384,
    },
]

# Cache TTL for detection results (in seconds)
# Default: 24 hours
AI_DETECTOR_CACHE_TTL = 60 * 60 * 24

# Celery task routing for AI detection
CELERY_TASK_ROUTES = {
    'ai_detector.*': {'queue': 'ai_detection'},
}

# Celery task settings for AI detection
CELERY_TASK_ANNOTATIONS = {
    'ai_detector.analyze_image': {
        'rate_limit': '10/m',  # Max 10 tasks per minute per worker
    },
}

# Django cache configuration for AI detector
# Using Redis (same as Celery broker)
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://localhost:6379/1'),
        'KEY_PREFIX': 'expexc',
        'TIMEOUT': 60 * 60 * 24,  # 24 hours default
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
    }
}

# =============================================================================
# File Upload Settings
# =============================================================================

# Maximum size of request body (500MB for large images)
DATA_UPLOAD_MAX_MEMORY_SIZE = 524288000  # 500 MB

# Maximum size for multipart uploads (500MB)
FILE_UPLOAD_MAX_MEMORY_SIZE = 524288000  # 500 MB

# Use temporary files for uploads larger than 10MB (saves memory)
FILE_UPLOAD_TEMP_DIR = '/tmp/django_uploads'

# =============================================================================
# Push Notifications Settings (Web Push)
# =============================================================================

# VAPID keys for web push notifications
# Generate with: python generate_vapid.py
# VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY', 'BGcxbIdFOOx06gl9Nt_D0IMsNM1pfe4_nCx2_bB9rSi-fTabOnGvNY1To4WzL6laMTqYcl7ALDQRrbnDoeCBrZk')
# VAPID_PRIVATE_KEY_PEM = os.getenv('VAPID_PRIVATE_KEY_PEM', '''-----BEGIN PRIVATE KEY-----
# MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgzMlUEwcRRAhPj6UO
# zlziQq7uXAKEeLyinMl8p1RHPPWhRANCAARnMWyHRTjsdOoJfTbfw9CDLDTNaX3u
# P5wsdv2wfa0ovn02mzpxrzWNU6OFsy+pWjE6mHJewCw0Ea25w6Hgga2Z
# -----END PRIVATE KEY-----''')
# VAPID_EMAIL = os.getenv('VAPID_EMAIL', 'admin@expectexception.com')

# =============================================================================
# OCR (Optical Character Recognition) Settings
# =============================================================================

# Path to tesseract binary (auto-detected if not set)
TESSERACT_CMD = os.getenv('TESSERACT_CMD', '/usr/bin/tesseract')

# Default OCR language (can be overridden per request)
OCR_DEFAULT_LANGUAGE = os.getenv('OCR_DEFAULT_LANGUAGE', 'eng')

# Supported OCR languages
OCR_SUPPORTED_LANGUAGES = ['eng', 'spa', 'fra', 'deu', 'ita', 'por', 'rus', 'chi_sim', 'jpn']

# Cache timeout for language detection (seconds)
OCR_CACHE_TIMEOUT = int(os.getenv('OCR_CACHE_TIMEOUT', str(24 * 3600)))

# =============================================================================
# PDF to DOC Conversion Settings
# =============================================================================

# LibreOffice/soffice binary path for PDF conversions
SOFFICE_CMD = os.getenv('SOFFICE_CMD', '/usr/bin/soffice')

# Supported output formats for PDF conversion
PDF_CONVERSION_FORMATS = ['docx', 'doc', 'odt', 'rtf', 'txt', 'pdf']

# Maximum PDF file size for conversion (bytes, default 50MB)
PDF_MAX_FILE_SIZE = int(os.getenv('PDF_MAX_FILE_SIZE', 50 * 1024 * 1024))

# PDF conversion timeout (seconds)
PDF_CONVERSION_TIMEOUT = int(os.getenv('PDF_CONVERSION_TIMEOUT', '120'))

# =============================================================================
# Background Remover Settings
# =============================================================================

# Background remover model (rembg uses u2net by default)
BG_REMOVER_MODEL = os.getenv('BG_REMOVER_MODEL', 'u2net')

# Maximum image dimensions for background removal (prevents OOM)
BG_REMOVER_MAX_SIZE = int(os.getenv('BG_REMOVER_MAX_SIZE', 2048))

# Use GPU for background removal if available
BG_REMOVER_USE_GPU = os.getenv('BG_REMOVER_USE_GPU', 'True') == 'True'

# =============================================================================
# Text to Handwriting Settings
# =============================================================================

# Default font for handwriting generation
TEXT_TO_HW_DEFAULT_FONT = os.getenv('TEXT_TO_HW_DEFAULT_FONT', 'caveat')

# Available fonts
TEXT_TO_HW_FONTS = ['caveat', 'indie_flower', 'shadows', 'dancing']

# Default paper type
TEXT_TO_HW_DEFAULT_PAPER = os.getenv('TEXT_TO_HW_DEFAULT_PAPER', 'plain')

# Available paper types
TEXT_TO_HW_PAPERS = ['plain', 'lined', 'dark']

# Default ink color
TEXT_TO_HW_DEFAULT_COLOR = os.getenv('TEXT_TO_HW_DEFAULT_COLOR', 'blue')

# Available ink colors
TEXT_TO_HW_COLORS = ['blue', 'black', 'red']

# Maximum text length for handwriting generation
TEXT_TO_HW_MAX_LENGTH = int(os.getenv('TEXT_TO_HW_MAX_LENGTH', 5000))

# =============================================================================
# GPU Settings
# =============================================================================

# Enable GPU acceleration where available (NVIDIA CUDA)
USE_GPU = os.getenv('USE_GPU', 'True') == 'True'

# Fallback to CPU if GPU unavailable
CPU_FALLBACK = os.getenv('CPU_FALLBACK', 'True') == 'True'

# GPU device to use (0, 1, 2, etc. or 'auto' for first available)
GPU_DEVICE = os.getenv('GPU_DEVICE', 'auto')

# =============================================================================
# AI Chatbot Settings (Ollama + SmolLM2)
# =============================================================================
# Install Ollama: curl -fsSL https://ollama.com/install.sh | sh
# Pull model: ollama pull smollm2:1.7b

OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
CHATBOT_MODEL = os.getenv('CHATBOT_MODEL', 'smollm2:1.7b')
CHATBOT_MAX_TOKENS = int(os.getenv('CHATBOT_MAX_TOKENS', '2048'))

# =============================================================================
# GPU Acceleration Settings
# =============================================================================
USE_GPU = os.getenv('USE_GPU', 'False') == 'True'
GPU_DEVICE = os.getenv('GPU_DEVICE', 'cuda:0')  # Default to first GPU
GPU_MEMORY_FRACTION = float(os.getenv('GPU_MEMORY_FRACTION', '0.8'))  # Reserve 80% VRAM
CPU_FALLBACK = True  # Fallback to CPU if GPU fails/OOM

# =============================================================================
# Unfold Admin Configuration
# =============================================================================
UNFOLD = {
    "SITE_TITLE": "ExpExc Admin",
    "SITE_HEADER": "ExpectException Dashboard",
    "SITE_URL": "/",
    "DASHBOARD_CALLBACK": "apps.dashboard.views.dashboard_callback",
    "ENVIRONMENT": "apps.services.utils.environment_callback",
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": False,
        "navigation": [
            {
                "title": _("General"),
                "separator": True,
                "items": [
                    {
                        "title": _("Dashboard"),
                        "icon": "dashboard",
                        "link": reverse_lazy("admin:index"),
                    },
                    {
                        "title": _("Users"),
                        "icon": "people",
                        "link": reverse_lazy("admin:users_user_changelist"),
                    },
                ],
            },
            {
                "title": _("Apps"),
                "separator": True,
                "items": [
                    {
                        "title": _("Blog"),
                        "icon": "article",
                        "link": reverse_lazy("admin:blog_post_changelist"),
                    },
                    {
                        "title": _("Chatbot"),
                        "icon": "chat",
                        "link": reverse_lazy("admin:chatbot_message_changelist"),
                    },
                    {
                        "title": _("Downloads"),
                        "icon": "download",
                        "link": reverse_lazy("admin:services_downloadableresource_changelist"),
                    },
                ],
            },
            {
                "title": _("System"),
                "separator": True,
                "items": [
                    {
                        "title": _("Server Health"),
                        "icon": "monitor_heart",
                        "link": reverse_lazy("admin:services_serverhealth_changelist"),
                        "badge": "live",
                    },
                    {
                        "title": _("Log Analysis"),
                        "icon": "analytics",
                        "link": reverse_lazy("admin:services_loganalysis_changelist"),
                    },
                    {
                        "title": _("Tool Usage"),
                        "icon": "build",
                        "link": reverse_lazy("admin:services_toolusage_changelist"),
                    },
                ],
            },
        ],
    },
    "COLORS": {
        "primary": {
            "50": "250 245 255",
            "100": "243 232 255",
            "200": "233 213 255",
            "300": "216 180 254",
            "400": "192 132 252",
            "500": "168 85 247",
            "600": "147 51 234",
            "700": "126 34 206",
            "800": "107 33 168",
            "900": "88 28 135",
        },
    },
    "TABS": [
        {
            "models": [
                "chatbot.message",
                "chatbot.conversation",
            ],
            "items": [
                {
                    "title": _("Messages"),
                    "link": reverse_lazy("admin:chatbot_message_changelist"),
                },
                {
                    "title": _("Conversations"),
                    "link": reverse_lazy("admin:chatbot_conversation_changelist"),
                },
            ],
        },
    ],
}

# =============================================================================
# Production Security Settings
# =============================================================================

# Rate limiting for service endpoints
SERVICE_RATE_LIMIT = os.getenv('SERVICE_RATE_LIMIT', '5/minute')

# Input validation settings
MAX_UPLOAD_SIZE_MB = int(os.getenv('MAX_UPLOAD_SIZE_MB', 500))

# Security headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_SECURITY_POLICY = {
    'default-src': ("'self'",),
    'script-src': ("'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"),
    'style-src': ("'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"),
    'img-src': ("'self'", "data:", "https:"),
    'font-src': ("'self'", "https://fonts.gstatic.com"),
    'connect-src': ("'self'", "https://api.github.com"),
    'frame-ancestors': ("'none'",),
    'base-uri': ("'self'",),
    'form-action': ("'self'",),
}

# CORS settings (restrictive for production)
if not DEBUG:
    CORS_ALLOWED_ORIGINS = os.getenv(
        'CORS_ALLOWED_ORIGINS',
        'https://ytd.expectexception.com,https://www.expectexception.com'
    ).split(',')
    ALLOWED_HOSTS = os.getenv(
        'ALLOWED_HOSTS',
        'ytd.expectexception.com,www.expectexception.com,djangobackend'
    ).split(',')

# Session security
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

# Additional security for production
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
