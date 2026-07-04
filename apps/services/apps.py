from django.apps import AppConfig

class ServicesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.services'

    def ready(self):
        from . import signals
        signals.connect()
        # Uptime monitor checks run on a normal CELERY_BEAT_SCHEDULE entry
        # (run_uptime_monitors_task, settings.py) — no manual kickoff needed
        # here anymore. The old self-rescheduling task needed this bootstrap
        # since nothing else would ever start its apply_async chain; a real
        # Beat entry fires on its own regardless of what imports this app.

