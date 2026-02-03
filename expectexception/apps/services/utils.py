from django.conf import settings
from django.utils.translation import gettext_lazy as _

def environment_callback(request):
    """
    Callback for Unfold admin to display environment badge.
    """
    if settings.DEBUG:
        return ["Development", "info"]
    
    return ["Production", "danger"]
