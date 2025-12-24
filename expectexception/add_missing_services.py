import os
import django
import sys

sys.path.append('/home/rjt/expexcV2/expectexception')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expectexception.settings')
django.setup()

from apps.services.models import Service

# Define missing services
missing_services = [
    {
        'title': 'Markdown Preview',
        'description': 'Convert Markdown text to HTML with real-time preview.',
        'icon': 'Code',
        'path': '/services/markdown-preview',
        'category': 'Developer Tools',
        'tags': ['developer', 'markdown', 'html', 'preview'],
        'color': 'info',
        'is_active': True,
        'popularity': 10
    }
]

for service_data in missing_services:
    s, created = Service.objects.get_or_create(
        path=service_data['path'],
        defaults=service_data
    )
    if created:
        print(f"Created service: {s.title}")
    else:
        print(f"Service already exists: {s.title}")
