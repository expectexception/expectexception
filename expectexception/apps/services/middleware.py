import logging
import time
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger('apps.services.requests')


class RequestLoggingMiddleware(MiddlewareMixin):
    """Middleware to log all incoming requests and responses"""
    
    def process_request(self, request):
        request.start_time = time.time()
        return None
    
    def process_response(self, request, response):
        # Skip logging for static files and admin
        if request.path.startswith('/static/') or request.path.startswith('/media/') or request.path.startswith('/admin/'):
            return response
        
        # Calculate request duration
        duration = 0
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
        
        # Get user info
        user = 'Anonymous'
        if hasattr(request, 'user') and request.user.is_authenticated:
            user = request.user.email
        
        # Get IP address
        ip_address = self.get_client_ip(request)
        
        # Get User-Agent
        user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
        
        # Log the request
        logger.info(
            f"[{response.status_code}] {request.method} {request.path} | "
            f"User: {user} | IP: {ip_address} | UA: {user_agent} | Duration: {duration:.3f}s"
        )
        
        # Log slow requests separately
        if duration > 2.0:
            logger.warning(
                f"SLOW REQUEST: {request.method} {request.path} took {duration:.3f}s"
            )
        
        return response
    
    def get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class PerformanceMonitoringMiddleware(MiddlewareMixin):
    """Middleware to monitor performance and track slow requests"""
    
    def process_request(self, request):
        request.perf_start = time.time()
        return None
    
    def process_response(self, request, response):
        if hasattr(request, 'perf_start'):
            duration = time.time() - request.perf_start
            
            # Log extremely slow requests
            if duration > 5.0:
                logger.error(
                    f"CRITICAL SLOW REQUEST: {request.method} {request.path} took {duration:.3f}s"
                )
        
        return response
