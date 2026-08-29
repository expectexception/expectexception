"""Contact app configuration."""

from django.apps import AppConfig


class ContactConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.contact"
    verbose_name = "Contact Inquiries"

    def ready(self):
        from . import checks  # noqa: F401 - registers the system check
