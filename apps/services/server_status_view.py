from django.views.generic import TemplateView
from django.http import JsonResponse
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator
from django.views import View
from django.utils.decorators import method_decorator
from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from .system_metrics import get_system_metrics # Fixed import path

@method_decorator(staff_member_required, name='dispatch')
class ServerStatusView(TemplateView):
    """
    Renders the real-time server status dashboard.
    Only accessible to staff members.
    """
    template_name = "admin/services/server_status.html"
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Initial metrics for server-side rendering
        metrics = get_system_metrics()
        context['metrics'] = metrics
        
        # Add sidebar context for Unfold if needed (usually automatic via tag)
        context['title'] = "Real-Time Server Health"
        return context


@staff_member_required
def get_metrics_api(request):
    """
    API endpoint for polling real-time metrics.
    """
    metrics = get_system_metrics()
    return JsonResponse(metrics)
