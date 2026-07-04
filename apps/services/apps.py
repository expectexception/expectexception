from django.apps import AppConfig

class ServicesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.services'

    def ready(self):
        from . import signals
        signals.connect()

        # Prevent starting the scheduler during migration, testing or sitemap generation commands
        import sys
        if 'manage.py' in sys.argv and any(cmd in sys.argv for cmd in ['migrate', 'makemigrations', 'test', 'collectstatic', 'generate-sitemap']):
            return

        try:
            from django.core.cache import cache
            if not cache.get("last_celery_uptime_run"):
                from .tasks import run_uptime_scheduler_task
                run_uptime_scheduler_task.delay()
        except Exception:
            pass

