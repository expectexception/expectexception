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
    },
    {
        'title': 'AI Image Upscaler',
        'description': 'Enhance and enlarge photos with crisp edges and low noise.',
        'icon': 'AutoFixHigh',
        'path': '/services/image-upscale',
        'category': 'Media',
        'tags': ['image', 'ai', 'upscale', 'enhance'],
        'color': 'info',
        'is_active': True,
        'popularity': 40
    },
    {
        'title': 'Internet Speed Test',
        'description': 'Accurately measure your download, upload, and latency speeds in real-time.',
        'icon': 'Speed',
        'path': '/services/speed-test',
        'category': 'Developer Tools',
        'tags': ['speed', 'network', 'internet', 'test'],
        'color': 'primary',
        'is_active': True,
        'popularity': 99
    },
    {
        'title': 'Audio Source Separator',
        'description': 'Extract vocals and instrumentals from any song using AI.',
        'icon': 'Mic',
        'path': '/services/audio-separator',
        'category': 'Media',
        'tags': ['audio', 'vocal remover', 'karaoke', 'ai'],
        'color': 'secondary',
        'is_active': True,
        'popularity': 96
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
