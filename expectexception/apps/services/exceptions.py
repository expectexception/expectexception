from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging
import traceback

logger = logging.getLogger('apps.services.exceptions')

def custom_exception_handler(exc, context):
    """
    Custom exception handler that:
    1. Reformats standard DRF errors into a consistent structure.
    2. Catches unhandled exceptions (500s) and logs stack traces.
    3. Prevents sensitive info leakage in production.
    """
    
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # Get Request ID if available (from our middleware)
    request = context.get('request')
    req_id = getattr(request, 'id', 'unknown')
    
    # If the exception is handled by DRF (validation errors, auth errors, etc.)
    if response is not None:
        custom_response_data = {
            "status": "error",
            "req_id": req_id,
            "error": {
                "code": response.status_code,
                "type": exc.__class__.__name__,
                "details": response.data
            }
        }
        response.data = custom_response_data
        return response

    # If response is None, it's an unhandled exception (500 Server Error)
    # We catch it here to log the stack trace and return a generic JSON response
    
    # Log the full stack trace with context
    logger.error(
        f"UNHANDLED EXCEPTION in {context['view'].__class__.__name__}: {str(exc)}",
        extra={
            'req_id': req_id,
            'path': request.path if request else 'unknown',
            'trace': traceback.format_exc()
        }
    )
    
    # Return generic error to user
    return Response({
        "status": "error",
        "req_id": req_id,
        "error": {
            "code": 500,
            "type": "ServerError",
            "details": "An unexpected error occurred. Please contact support with this Request ID."
        }
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
