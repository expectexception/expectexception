import logging
import time
import uuid
import json
from django.db import connection, reset_queries
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings

logger = logging.getLogger('apps.services.requests')


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
