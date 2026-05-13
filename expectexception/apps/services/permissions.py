"""Custom DRF permissions for service tool access control."""
import logging
from rest_framework.permissions import BasePermission
from .models import Service

logger = logging.getLogger(__name__)


class ToolAccessPermission(BasePermission):
    """Check if a tool requires authentication based on the Service model.

    Usage on any tool view::

        class MyToolView(APIView):
            permission_classes = [ToolAccessPermission]
            tool_name = 'my-tool'  # matches the url name or Service.path

    The permission looks up the Service by matching the request path against
    Service.path.  If ``requires_login`` is True the user must be
    authenticated; otherwise the request is allowed for everyone.
    """

    message = "This tool requires you to be logged in. Please sign in to continue."

    def has_permission(self, request, view):
        # Staff bypass
        if getattr(request.user, 'is_staff', False):
            return True

        # Try to find the tool name from the view
        tool_name = getattr(view, 'tool_name', None)

        service = None

        if tool_name:
            # Look up by path fragment
            service = Service.objects.filter(
                path__icontains=tool_name,
                is_active=True,
            ).first()
        else:
            # Match by request path: strip trailing slash and try to find
            # a Service whose path is contained in the request path.
            request_path = request.path.rstrip('/')

            # Try direct match first (most Service.path values look like /services/qr-generator)
            service = Service.objects.filter(
                path=request_path,
                is_active=True,
            ).first()

            if service is None:
                # Try icontains match on the last segment of the request path
                # e.g. /api/services/qr-generator/ → qr-generator
                segments = [s for s in request_path.split('/') if s]
                if segments:
                    last_segment = segments[-1]
                    service = Service.objects.filter(
                        path__icontains=last_segment,
                        is_active=True,
                    ).first()

            # Fallback: check by URL name
            if service is None and hasattr(request, 'resolver_match') and request.resolver_match:
                url_name = request.resolver_match.url_name or ''
                if url_name:
                    service = Service.objects.filter(
                        path__icontains=url_name.replace('-', '/'),
                        is_active=True,
                    ).first()

        if service is None:
            # Tool not in DB → allow access (no restrictions configured)
            return True

        if not service.requires_login:
            return True

        # Tool requires login
        return request.user and request.user.is_authenticated
