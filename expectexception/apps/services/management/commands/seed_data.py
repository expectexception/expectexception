from django.core.management.base import BaseCommand
from apps.services.models import Service, DownloadableResource

class Command(BaseCommand):
    help = 'Seeds initial data for Services and Downloads'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')

        # Services
        services_data = [
            {
                'title': 'URL Downloader',
                'description': 'Download files from any URL with support for multiple formats and batch processing.',
                'icon': 'Download',
                'category': 'download',
                'popularity': 95,
                'tags': ['file', 'download', 'batch'],
                'path': '/services/url-downloader',
                'color': 'primary',
            },
            {
                'title': 'YT Video Downloader',
                'description': 'Download YouTube videos in various resolutions (HD, 4K) and multiple formats.',
                'icon': 'Movie',
                'category': 'download',
                'popularity': 92,
                'tags': ['video', 'youtube', 'media'],
                'path': '/services/yt-downloader',
                'color': 'secondary',
            },
            {
                'title': 'URL to QR Converter',
                'description': 'Generate QR codes from URLs with custom colors, sizes, and logo integration.',
                'icon': 'QrCode',
                'category': 'converter',
                'popularity': 88,
                'tags': ['qr', 'generator', 'share'],
                'path': '/services/qr-generator',
                'color': 'success',
            },
            {
                'title': 'JSON Formatter',
                'description': 'Format, validate, minify, and beautify JSON data with syntax highlighting.',
                'icon': 'Code',
                'category': 'developer',
                'popularity': 90,
                'tags': ['json', 'developer', 'format'],
                'path': '/services/json-formatter',
                'color': 'warning',
            },
            {
                'title': 'Text to Speech',
                'description': 'Convert text to speech with multiple voice options and languages.',
                'icon': 'VolumeUp',
                'category': 'converter',
                'popularity': 85,
                'tags': ['audio', 'text', 'speech'],
                'path': '/services/text-to-speech',
                'color': 'info',
            },
            {
                'title': 'Image Compressor',
                'description': 'Compress images while maintaining quality with batch processing support.',
                'icon': 'Compress',
                'category': 'media',
                'popularity': 88,
                'tags': ['image', 'compress', 'optimize'],
                'path': '/services/image-compressor',
                'color': 'error',
            },
        ]

        for s_data in services_data:
            Service.objects.get_or_create(title=s_data['title'], defaults=s_data)

        # Downloads (Mock Data)
        downloads_data = [
            {
                'name': 'React Component Library.zip',
                'category': 'archive',
                'size': '45.2 MB',
                'downloads': 1245,
                'version': 'v2.1.0'
            },
            {
                'name': 'UI Design System.sketch',
                'category': 'doc',
                'size': '12.8 MB',
                'downloads': 892,
                'version': 'v1.5.0'
            },
             {
                'name': 'API Documentation.pdf',
                'category': 'doc',
                'size': '3.2 MB',
                'downloads': 2156,
                'version': 'v3.0.1'
            },
             {
                'name': 'Icon Pack.svg',
                'category': 'img',
                'size': '8.9 MB',
                'downloads': 1234,
                'version': 'v2.0.0'
            },
        ]

        for d_data in downloads_data:
            DownloadableResource.objects.get_or_create(name=d_data['name'], defaults=d_data)

        self.stdout.write(self.style.SUCCESS('Successfully seeded data.'))
