"""
Settings for Render.com deployment.

Inherits from settings.py and overrides only what is different for Render:
- PostgreSQL via DATABASE_URL
- Redis via REDIS_URL
- Cloudinary for media storage (no local disk)
- Console-only logging (Render captures stdout)
- Heavy AI/ML apps disabled (run on local server instead)
- HTTPS security hardened
"""

import os
import dj_database_url
from .settings import *  # noqa: F401, F403

# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------

DEBUG = False

# Render sets RENDER_EXTERNAL_HOSTNAME automatically for each deploy
_render_host = os.getenv('RENDER_EXTERNAL_HOSTNAME', '')
ALLOWED_HOSTS = [
    'expectexception.com',
    'www.expectexception.com',
    'expectexception-api.onrender.com',
]
if _render_host:
    ALLOWED_HOSTS.append(_render_host)

# Also trust these origins for CSRF
CSRF_TRUSTED_ORIGINS = [
    'https://expectexception.com',
    'https://www.expectexception.com',
]
if _render_host:
    CSRF_TRUSTED_ORIGINS.append(f'https://{_render_host}')

# ---------------------------------------------------------------------------
# CORS — frontend lives on Vercel (set CORS_ALLOWED_ORIGINS in Render env)
# ---------------------------------------------------------------------------

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        'CORS_ALLOWED_ORIGINS',
        'https://expectexception.com,https://www.expectexception.com',
    ).split(',')
    if origin.strip()
]

# ---------------------------------------------------------------------------
# Django requires a SQL database for core tables (auth, sessions, etc.).
# We use SQLite if DATABASE_URL is not set or contains a MongoDB URI.
_db_url = os.getenv('DATABASE_URL')
if _db_url and not _db_url.startswith('mongodb'):
    DATABASES = {
        'default': dj_database_url.config(
            default=_db_url,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    # Use SQLite. If a persistent disk is mounted at /data on Render, use it to persist data.
    _sqlite_dir = '/data' if os.path.exists('/data') else BASE_DIR
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': os.path.join(str(_sqlite_dir), 'db.sqlite3'),
        }
    }

# ---------------------------------------------------------------------------
# Redis — Render Redis or Upstash via REDIS_URL
# ---------------------------------------------------------------------------

_redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': _redis_url,
        'KEY_PREFIX': 'expexc',
        'TIMEOUT': 60 * 60 * 24,  # 24 hours
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
    }
}

CELERY_BROKER_URL = _redis_url
CELERY_RESULT_BACKEND = _redis_url

# On Render free tier there are no background workers.
# Run tasks synchronously so nothing silently drops.
CELERY_TASK_ALWAYS_EAGER = os.getenv('CELERY_TASK_ALWAYS_EAGER', 'True') == 'True'
CELERY_EAGER_PROPAGATES_EXCEPTIONS = True

# No beat scheduler on Render free tier
CELERY_BEAT_SCHEDULE = {}

# ---------------------------------------------------------------------------
# Static files — served by WhiteNoise; frontend build is on Vercel (not here)
# ---------------------------------------------------------------------------

STATICFILES_DIRS = []  # Do NOT include the frontend build directory
STATIC_ROOT = BASE_DIR / 'staticfiles'  # noqa: F405 — BASE_DIR from settings.py
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ---------------------------------------------------------------------------
# Media files — use Cloudinary (free tier) instead of local disk
# Render's filesystem is ephemeral; local media would be wiped on redeploy.
# Set CLOUDINARY_URL in the Render dashboard, e.g.:
#   cloudinary://api_key:api_secret@cloud_name
# ---------------------------------------------------------------------------

_cloudinary_url = os.getenv('CLOUDINARY_URL', '')
if _cloudinary_url:
    import cloudinary  # noqa: F401 — optional dep, install cloudinary + django-cloudinary-storage
    import cloudinary.uploader  # noqa: F401
    import cloudinary.api  # noqa: F401
    import cloudinary_storage  # noqa: F401

    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
    MEDIA_URL = '/media/'
    # Parse credentials from CLOUDINARY_URL automatically via the cloudinary package
else:
    # Fall back to /tmp on Render (acceptable for non-persistent scratch files)
    MEDIA_ROOT = BASE_DIR / 'media'  # noqa: F405

# ---------------------------------------------------------------------------
# Installed apps — disable heavy ML apps on Render
# These are served from the local server instead.
# ---------------------------------------------------------------------------

INSTALLED_APPS = [
    # Unfold Admin (must come before django.contrib.admin)
    'unfold',
    'unfold.contrib.filters',
    'unfold.contrib.forms',
    'unfold.contrib.import_export',

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

    # Core business apps (always on Render)
    'apps.users',
    'apps.blog',
    'apps.services',
    'apps.profiles',
    'apps.notifications',
    'apps.dashboard',
    'apps.contact',
    'apps.community',
    'apps.secret_sharer',
    'apps.text_to_handwriting',

    # videos / yt-dlp endpoint excluded — handled by local server
    # 'apps.videos',

    # Chatbot excluded — requires local Ollama
    # 'apps.chatbot',

    # AI detector excluded — heavy ML models not suitable for Render free tier
    # 'apps.ai_detector',

    'django.contrib.sites',
    'django.contrib.sitemaps',
]

# ---------------------------------------------------------------------------
# Feature flags
# ---------------------------------------------------------------------------

# Feature flags (override via environment variables)
FEATURE_FLAGS = {
    'TWO_FACTOR_AUTH': os.getenv('FEATURE_2FA_ENABLED', 'False').lower() in ('true', '1', 'yes'),
    'OLLAMA_ENABLED': os.getenv('FEATURE_OLLAMA_ENABLED', 'False').lower() in ('true', '1', 'yes'),
    'HEAVY_AI_SERVICES': os.getenv('FEATURE_HEAVY_AI_ENABLED', 'False').lower() in ('true', '1', 'yes'),
    'YT_DOWNLOADER': os.getenv('FEATURE_YT_DOWNLOADER_ENABLED', 'False').lower() in ('true', '1', 'yes'),
    'CELERY_BEAT': os.getenv('FEATURE_CELERY_BEAT_ENABLED', 'False').lower() in ('true', '1', 'yes'),
}

CHATBOT_MODEL = os.getenv('CHATBOT_MODEL', 'qwen3:4b')

# URL of the local heavy-AI server (ngrok / Cloudflare tunnel)
LOCAL_SERVER_URL = os.getenv('LOCAL_SERVER_URL', '')

# ---------------------------------------------------------------------------
# HTTPS / Security
# ---------------------------------------------------------------------------

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# ---------------------------------------------------------------------------
# Logging — console only (Render captures stdout/stderr)
# No RotatingFileHandler — the filesystem is ephemeral and logs go to Render's
# built-in log viewer via stdout.
# ---------------------------------------------------------------------------

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'render': {
            'format': '[{levelname}] {asctime} {name} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'render',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}

# ---------------------------------------------------------------------------
# Cloudflare / CDN cache headers
# ---------------------------------------------------------------------------

# Tell CDNs they can cache safe responses for up to 60 seconds.
# Individual views can override with their own Cache-Control headers.
CACHE_MIDDLEWARE_SECONDS = 60
CACHE_MIDDLEWARE_KEY_PREFIX = 'expexc_render'

# ---------------------------------------------------------------------------
# Disable file-based log dir creation that runs at import time in settings.py
# (The base settings.py does LOG_DIR.mkdir(exist_ok=True) — harmless on Render
# but the directory will be ephemeral. No action needed here.)
# ---------------------------------------------------------------------------
