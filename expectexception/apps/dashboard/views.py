from django.utils.translation import gettext_lazy as _
from django.utils.safestring import mark_safe
from apps.contact.models import ContactInquiry
from apps.users.models import User
from apps.services.system_metrics import get_system_metrics

def dashboard_callback(request, context):
    """
    Callback to provide dashboard context.
    Returns a dictionary of data to be displayed on the admin dashboard.
    """
    
    # Statistics
    total_inquiries = ContactInquiry.objects.count()
    new_inquiries = ContactInquiry.objects.filter(status='new').count()
    hire_inquiries = ContactInquiry.objects.filter(inquiry_type='hire').count()
    users_count = User.objects.count()
    
    # System Metrics
    metrics = get_system_metrics()
    
    # Recent Inquiries
    recent_inquiries = ContactInquiry.objects.order_by('-created_at')[:5]
    
    context.update({
        "navigation": [
            {"title": _("Quick Links"), "link": "/admin/contact/contactinquiry/", "icon": "mail"},
            {"title": _("Users"), "link": "/admin/users/user/", "icon": "people"},
        ],
        "kpi": [
            {
                "title": "GPU Usage",
                "metric": mark_safe(f'<span id="gpu-live">{metrics["gpu"].get("utilization_pct", 0)}%</span>'),
                "footer": mark_safe("""
                    DEVICE_NAME
                    <script>
                    (function() {
                        const updateGpu = async () => {
                            try {
                                const res = await fetch('/api/services/server-status-api/', {
                                    headers: { 'Accept': 'application/json' }
                                });
                                const data = await res.json();
                                const el = document.getElementById('gpu-live');
                                if (el && data.gpu && data.gpu.available) {
                                    el.innerText = data.gpu.utilization_pct + '%';
                                    el.title = data.gpu.device + ': ' + data.gpu.allocated_mb + ' / ' + data.gpu.total_memory_mb + ' MB';
                                } else if (el) {
                                    el.innerText = 'OFF';
                                    el.style.color = '#64748b';
                                }
                            } catch(e) { console.error('GPU Poll Error', e); }
                        };
                        setInterval(updateGpu, 2000);
                    })();
                    </script>
                """.replace('DEVICE_NAME', metrics['gpu'].get('device', 'CPU Only'))),
                "chart_scheme": "rose",
            },
            {
                "title": "New Inquiries",
                "metric": new_inquiries,
                "footer": f"{total_inquiries} Total",
                "chart_scheme": "emerald",
            },
            {
                "title": "Hire Requests",
                "metric": hire_inquiries,
                "footer": "Active leads",
                "chart_scheme": "blue",
            },
            {
                "title": "Total Users",
                "metric": users_count,
                "footer": "Registered accounts",
                "chart_scheme": "purple",
            },
        ],
        "recent_inquiries": recent_inquiries,
    })
    
    return context
