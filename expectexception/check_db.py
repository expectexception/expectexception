import os
import django
import sys

sys.path.append('/home/rjt/expexcV2/expectexception')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expectexception.settings')
django.setup()

from apps.services.models import Service

s = Service.objects.filter(title__icontains='Markdown').first()
if s:
    print(f"FOUND: {s.title} (Active: {s.is_active})")
else:
    print("NOT FOUND in DB")
