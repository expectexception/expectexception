from django.utils.translation import gettext_lazy as _
from apps.contact.models import ContactInquiry
from apps.users.models import User

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
    
    # Recent Inquiries
    recent_inquiries = ContactInquiry.objects.order_by('-created_at')[:5]
    
    context.update({
        "navigation": [
            {"title": _("Quick Links"), "link": "/admin/contact/contactinquiry/", "icon": "mail"},
            {"title": _("Users"), "link": "/admin/users/user/", "icon": "people"},
        ],
        "kpi": [
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
