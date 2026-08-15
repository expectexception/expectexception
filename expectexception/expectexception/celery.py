import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expectexception.settings')

app = Celery('expectexception')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
