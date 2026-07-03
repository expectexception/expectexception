import logging
import time
import uuid
import json
from django.core.cache import cache
from django.http import JsonResponse
from django.db import connection, reset_queries
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings

logger = logging.getLogger('apps.services.requests')

# Paths that should be rate-limited (POST only) and their limits (requests, seconds)
RATE_LIMIT_RULES = {
    '/api/services/background-remover/': (5, 60),
    '/api/services/image-upscaler/': (5, 60),
    '/api/services/image-to-text/': (10, 60),
    '/api/services/pdf-to-doc/': (10, 60),
    '/api/services/doc-to-pdf/': (10, 60),
    '/api/services/pdf-merger/': (10, 60),
    '/api/services/pdf-splitter/': (10, 60),
    '/api/services/image-to-pdf/': (10, 60),
    '/api/services/yt-downloader/': (5, 60),
    '/api/services/url-downloader/': (10, 60),
    '/api/services/audio-separator/': (3, 60),
    '/api/ai-detector/': (10, 60),
}


def _get_client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', '0.0.0.0')


def _is_pro_user(request):
    """Check if the authenticated user has a pro tier subscription."""
    user = getattr(request, 'user', None)
    if not user or not user.is_authenticated:
        return False
    # Cache the tier lookup per user for 60s to avoid per-request DB hits
    cache_key = f'user_tier:{user.pk}'
    tier = cache.get(cache_key)
    if tier is None:
        try:
            tier = user.subscription.tier if hasattr(user, 'subscription') else 'free'
        except Exception:
            tier = 'free'
        cache.set(cache_key, tier, timeout=60)
    return tier == 'pro'


class RateLimitMiddleware(MiddlewareMixin):
    """
    Redis-backed rate limiter with tier support.
    Pro users get 10× the free limit on all heavy endpoints.
    """

    def process_request(self, request):
        if request.method != 'POST':
            return None
        path = request.path
        rule = None
        for prefix, limits in RATE_LIMIT_RULES.items():
            if path.startswith(prefix):
                rule = limits
                break
        if rule is None:
            return None

        max_requests, window = rule
        # Pro users get 10x the free quota
        if _is_pro_user(request):
            max_requests *= 10

        ip = _get_client_ip(request)
        cache_key = f'rl:{path}:{ip}'
        count = cache.get(cache_key, 0)
        if count >= max_requests:
            remaining_hint = f'Upgrade to Pro for higher limits.' if not _is_pro_user(request) else ''
            return JsonResponse(
                {'error': f'Rate limit exceeded. Max {max_requests} requests per {window}s. {remaining_hint}'.strip()},
                status=429,
            )
        # Atomically initialize the counter to 1 if it does not exist; increment if it does.
        if not cache.add(cache_key, 1, timeout=window):
            cache.incr(cache_key)
        return None


class ProLevelLoggingMiddleware(MiddlewareMixin):
    """
    Unified Middleware for:
    1. Request ID Generation (Tracing)
    2. Performance Monitoring (Time + SQL Queries)
    3. Structured Logging
    4. Slow Request Detection
    """
    
    def process_request(self, request):
        # 1. Trace ID
        request.id = str(uuid.uuid4())
        
        # 2. Start Time
        request.start_time = time.time()
        
        # 3. Reset queries for accurate count (debug mode only)
        if settings.DEBUG:
            reset_queries()
            
        return None
    
    def process_response(self, request, response):
        # Skip logging for static assets and health checks to avoid noise
        if request.path.startswith(('/static/', '/media/', '/favicon.ico', '/health/')):
            return response

        # Duration
        duration = time.time() - getattr(request, 'start_time', time.time())
        
        # DB Queries (only available in DEBUG mode usually, but useful to track)
        query_count = len(connection.queries) if settings.DEBUG else 0
        
        # Context Info
        user = getattr(request, 'user', None)
        user_identity = user.email if (user and user.is_authenticated) else 'Anonymous'
        ip = self.get_client_ip(request)
        method = request.method
        path = request.path
        status_code = response.status_code
        request_id = getattr(request, 'id', 'unknown')
        
        # Log Message Construction
        log_data = {
            "req_id": request_id,
            "method": method,
            "path": path,
            "status": status_code,
            "duration": round(duration, 3),
            "db_queries": query_count,
            "user": user_identity,
            "ip": ip
        }
        
        # Formatted Log String
        log_msg = (
            f"[{status_code}] {method} {path} | {duration:.3f}s | "
            f"DB: {query_count} | User: {user_identity} | ID: {request_id}"
        )
        
        # Log Level Determination
        if status_code >= 500:
            logger.error(f"SERVER ERROR: {log_msg}", extra=log_data)
        elif status_code >= 400:
            logger.warning(f"CLIENT ERROR: {log_msg}", extra=log_data)
        else:
            logger.info(log_msg, extra=log_data)
            
        # Slow Request Warning (> 1.5s)
        if duration > 1.5:
            logger.warning(
                f"🐢 SLOW REQUEST ({duration:.3f}s > 1.5s): {method} {path} | DB: {query_count}",
                extra={"slow_request": True, **log_data}
            )
            
        # High DB Query Warning (> 50 queries)
        if query_count > 50:
            logger.warning(
                f"🔥 HIGH DB LOAD ({query_count} queries): {method} {path}",
                extra={"high_db": True, **log_data}
            )
            
        return response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
