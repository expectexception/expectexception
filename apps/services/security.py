"""
Production Security Configuration and Middleware
Implements security hardening, rate limiting, audit logging, and monitoring
"""

import logging
import time
from functools import wraps
from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponse, JsonResponse
from django.utils.decorators import decorator_from_middleware
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods
try:
    from django.middleware.base import BaseMiddleware
except Exception:
    # Fallback for Django versions where BaseMiddleware isn't available
    # Use MiddlewareMixin as a compatible base in older Django versions
    from django.utils.deprecation import MiddlewareMixin as BaseMiddleware
from rest_framework.throttling import BaseThrottle
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


# =============================================================================
# Rate Limiting & Throttling
# =============================================================================

class ServiceRateThrottle(BaseThrottle):
    """
    Rate limiter for AI/processing services.
    More restrictive than general API limits due to resource intensity.
    """
    cache_format = 'service_throttle_%(scope)s_%(ident)s'
    scope = 'service'
    timer = time.time

    def __init__(self):
        super().__init__()
        # Override with service-specific limits
        self.rate = getattr(settings, 'SERVICE_RATE_LIMIT', '5/minute')
        self.num_requests, self.duration = self.parse_rate(self.rate)

    def get_cache_key(self, request, view):
        """Get cache key for throttling"""
        if request.user and request.user.is_authenticated:
            ident = str(request.user.id)
        else:
            ident = self.get_ident(request)
        
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }

    def throttle_success(self):
        """Called when request is allowed"""
        self.history = cache.get(self.key, [])
        self.now = self.timer()
        
        # Drop requests outside the current window
        while self.history and self.history[-1] <= self.now - self.duration:
            self.history.pop()
        
        self.history.insert(0, self.now)
        cache.set(self.key, self.history, self.duration)
        return True

    def throttle_failure(self):
        """Called when request is throttled"""
        return False

    def throttle(self, request, view):
        """Check if request should be throttled"""
        self.key = self.get_cache_key(request, view)
        if self.key is None:
            return True
        
        self.history = cache.get(self.key, [])
        self.now = self.timer()
        
        # Drop requests outside current window
        while self.history and self.history[-1] <= self.now - self.duration:
            self.history.pop()
        
        if len(self.history) >= self.num_requests:
            return self.throttle_failure()
        
        return self.throttle_success()


class IPBasedRateThrottle(ServiceRateThrottle):
    """Rate limiter based on IP address"""
    scope = 'ip_based'
    
    def get_ident(self, request):
        """Get IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


# =============================================================================
# Input Validation & Sanitization
# =============================================================================

def validate_file_upload(max_size_mb=100, allowed_extensions=None):
    """
    Decorator to validate file uploads.
    Checks file size and extension.
    """
    if allowed_extensions is None:
        allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx']
    
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Check for file in request
            for field_name in request.FILES:
                uploaded_file = request.FILES[field_name]
                
                # Validate file size
                max_bytes = max_size_mb * 1024 * 1024
                if uploaded_file.size > max_bytes:
                    return JsonResponse({
                        'error': f'File too large. Maximum size: {max_size_mb}MB'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Validate extension
                ext = uploaded_file.name.rsplit('.', 1)[-1].lower()
                if ext not in allowed_extensions:
                    return JsonResponse({
                        'error': f'File type not allowed. Allowed: {", ".join(allowed_extensions)}'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Validate MIME type (additional security)
                if hasattr(uploaded_file, 'content_type'):
                    allowed_mime_types = [
                        'image/jpeg', 'image/png', 'image/gif', 'image/bmp',
                        'application/pdf', 'application/msword',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    ]
                    if uploaded_file.content_type not in allowed_mime_types:
                        logger.warning(f"Suspicious file upload: {uploaded_file.content_type}")
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def sanitize_filename(filename):
    """
    Sanitize filename to prevent directory traversal and other attacks.
    """
    import os
    import re
    
    # Remove path components
    filename = os.path.basename(filename)
    
    # Remove special characters
    filename = re.sub(r'[^\w\-_\.]', '_', filename)
    
    # Limit length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:251] + ext
    
    # Ensure not empty
    if not filename:
        filename = 'unnamed_file'
    
    return filename


# =============================================================================
# Security Headers Middleware
# =============================================================================

class SecurityHeadersMiddleware(BaseMiddleware):
    """
    Add security headers to all responses.
    Implements:
    - Content Security Policy (CSP)
    - X-Frame-Options (Clickjacking protection)
    - X-Content-Type-Options (MIME sniffing prevention)
    - Strict-Transport-Security (HSTS)
    - X-XSS-Protection
    """
    
    def process_response(self, request, response):
        # CSP - Restrict resource loading
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
            "img-src 'self' data: https:; "
            "font-src 'self' https://fonts.gstatic.com; "
            "connect-src 'self' https://api.github.com; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        
        # Prevent clickjacking
        response['X-Frame-Options'] = 'DENY'
        
        # Prevent MIME sniffing
        response['X-Content-Type-Options'] = 'nosniff'
        
        # Enable HSTS (HTTP Strict Transport Security)
        if not settings.DEBUG:
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
        
        # Enable XSS protection
        response['X-XSS-Protection'] = '1; mode=block'
        
        # Referrer Policy
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Permissions Policy
        response['Permissions-Policy'] = (
            'geolocation=(), '
            'microphone=(), '
            'camera=(), '
            'payment=(), '
            'usb=(), '
            'magnetometer=(), '
            'gyroscope=(), '
            'accelerometer=()'
        )
        
        return response


# =============================================================================
# Audit Logging
# =============================================================================

class AuditLogger:
    """Log service usage for auditing and monitoring"""
    
    @staticmethod
    def log_service_access(request, service_name, action, status_code, error=None):
        """
        Log service access for audit trail.
        """
        user_id = request.user.id if request.user.is_authenticated else 'anonymous'
        ip_address = AuditLogger.get_client_ip(request)
        
        audit_data = {
            'timestamp': __import__('datetime').datetime.now().isoformat(),
            'user_id': user_id,
            'service': service_name,
            'action': action,
            'status': status_code,
            'ip_address': ip_address,
            'user_agent': request.META.get('HTTP_USER_AGENT', 'unknown')[:200],
        }
        
        if error:
            audit_data['error'] = str(error)[:500]
        
        # Log to audit logger
        logger.info(f"SERVICE_ACCESS: {audit_data}")
        
        # Could also store in database for later analysis
        # AuditLog.objects.create(**audit_data)
    
    @staticmethod
    def get_client_ip(request):
        """Get client IP address, handling proxies"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


# =============================================================================
# Monitoring & Health Checks
# =============================================================================

class ServiceHealthCheck:
    """Monitor service health and resource usage"""
    
    @staticmethod
    def check_service_health(service_name):
        """
        Check health of a service.
        Returns status and diagnostic info.
        """
        import psutil
        import os
        
        health = {
            'service': service_name,
            'status': 'healthy',
            'checks': {}
        }
        
        # CPU Usage
        cpu_percent = psutil.cpu_percent(interval=1)
        health['checks']['cpu'] = {
            'usage_percent': cpu_percent,
            'status': 'healthy' if cpu_percent < 80 else 'warning' if cpu_percent < 95 else 'critical'
        }
        
        # Memory Usage
        memory = psutil.virtual_memory()
        health['checks']['memory'] = {
            'usage_percent': memory.percent,
            'available_mb': memory.available / (1024 * 1024),
            'status': 'healthy' if memory.percent < 80 else 'warning' if memory.percent < 95 else 'critical'
        }
        
        # Disk Usage
        disk = psutil.disk_usage('/')
        health['checks']['disk'] = {
            'usage_percent': disk.percent,
            'free_gb': disk.free / (1024 * 1024 * 1024),
            'status': 'healthy' if disk.percent < 85 else 'warning' if disk.percent < 95 else 'critical'
        }
        
        # Database Connectivity
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
            health['checks']['database'] = {'status': 'healthy'}
        except Exception as e:
            health['checks']['database'] = {'status': 'critical', 'error': str(e)}
            health['status'] = 'critical'
        
        # Cache Connectivity
        try:
            cache.set('health_check', 'ok', 10)
            cache.get('health_check')
            health['checks']['cache'] = {'status': 'healthy'}
        except Exception as e:
            health['checks']['cache'] = {'status': 'warning', 'error': str(e)}
        
        # Overall status
        statuses = [check.get('status') for check in health['checks'].values()]
        if 'critical' in statuses:
            health['status'] = 'critical'
        elif 'warning' in statuses:
            health['status'] = 'warning'
        
        return health


# =============================================================================
# API Response Sanitization
# =============================================================================

def sanitize_error_response(error_message):
    """
    Sanitize error messages to prevent information disclosure.
    In production, don't expose internal details.
    """
    if settings.DEBUG:
        return error_message
    
    # Generic error message in production
    if isinstance(error_message, str):
        if 'database' in error_message.lower() or 'sql' in error_message.lower():
            return 'Database error occurred. Please try again.'
        elif 'permission' in error_message.lower():
            return 'Permission denied.'
        elif 'not found' in error_message.lower():
            return 'Resource not found.'
    
    return 'An error occurred. Please try again.'
