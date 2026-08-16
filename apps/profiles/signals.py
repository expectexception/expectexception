from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Profile


# Single owner of profile auto-creation. apps/users/signals.py used to register
# a second, identical receiver, and a third (`save_user_profile`) re-saved the
# profile on *every* user save — which includes every login now that
# UPDATE_LAST_LOGIN is on — writing a row for no reason on each request.
@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        try:
            Profile.objects.get_or_create(user=instance)
        except Exception:
            pass
