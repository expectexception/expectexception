"""Startup checks for the contact app.

Nothing about a misconfigured SMTP setup shows up anywhere a human would
see it: the form still returns 201 (the inquiry itself always saves), and
the failed send only ever reaches the server log. A system check surfaces
it at every `manage.py` invocation instead - `runserver`, `migrate`,
`check`, and (if the deploy pipeline runs it) `check --deploy` - which is a
much better place to catch "nobody configured real SMTP credentials" than
waiting for a customer to notice they never got a reply.
"""

from django.conf import settings
from django.core.checks import Warning, register


@register()
def check_email_notifications_configured(app_configs, **kwargs):
    errors = []

    using_smtp = settings.EMAIL_BACKEND == "django.core.mail.backends.smtp.EmailBackend"
    if using_smtp and not settings.EMAIL_HOST_PASSWORD:
        errors.append(
            Warning(
                "EMAIL_HOST_PASSWORD is empty while EMAIL_BACKEND is the real SMTP "
                "backend - contact form and hire inquiry notification emails will "
                "silently fail to send (the inquiry itself still saves).",
                hint="Set EMAIL_HOST_USER/EMAIL_HOST_PASSWORD in this environment's .env, "
                "or switch EMAIL_BACKEND to the console backend for local dev.",
                id="contact.W001",
            )
        )

    if settings.CONTACT_EMAIL.endswith("@example.com"):
        errors.append(
            Warning(
                f"CONTACT_EMAIL is still set to a placeholder address ({settings.CONTACT_EMAIL}) "
                "- inquiry notifications have nowhere real to be delivered.",
                hint="Set CONTACT_EMAIL to a real inbox in this environment's .env.",
                id="contact.W002",
            )
        )

    return errors
