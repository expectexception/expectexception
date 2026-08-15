import os
import django
import sys

sys.path.append('/home/rjt/expexcV2/expectexception')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expectexception.settings')
django.setup()

from apps.services.models import Service

try:
    s = Service.objects.get(title='Image to Text (OCR)')
    s.is_active = False
    s.save()
    print(f"Service '{s.title}' is now inactive.")
except Service.DoesNotExist:
    print("Service not found.")
