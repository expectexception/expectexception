import os
import django
import sys

sys.path.append('/home/rjt/expexcV2/expectexception')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expectexception.settings')
django.setup()

from apps.services.models import Service

print(f"{'Name':<30} | {'Slug':<30} | {'Active':<10}")
print("-" * 75)
for s in Service.objects.all():
    print(f"{s.title:<30} | {s.path:<30} | {s.is_active:<10}")
