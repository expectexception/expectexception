"""
Management command: ping_sitemaps
Submits sitemap.xml to Google and Bing after a new build/deploy.

Usage:
    python manage.py ping_sitemaps
    python manage.py ping_sitemaps --site https://expectexception.com
"""
import urllib.request
import urllib.parse
import logging
from django.core.management.base import BaseCommand
from django.conf import settings

logger = logging.getLogger(__name__)

SITE_URL = getattr(settings, 'SITE_URL', 'https://expectexception.com')

PING_URLS = [
    'https://www.google.com/ping?sitemap={sitemap_url}',
    'https://www.bing.com/ping?sitemap={sitemap_url}',
]


class Command(BaseCommand):
    help = 'Ping Google and Bing with the updated sitemap URL'

    def add_arguments(self, parser):
        parser.add_argument('--site', default=SITE_URL, help='Base site URL (default from settings.SITE_URL)')

    def handle(self, *args, **options):
        site = options['site'].rstrip('/')
        sitemap_url = urllib.parse.quote(f'{site}/sitemap.xml', safe=':/')

        success = 0
        for template in PING_URLS:
            url = template.format(sitemap_url=sitemap_url)
            try:
                with urllib.request.urlopen(url, timeout=10) as resp:
                    code = resp.getcode()
                    self.stdout.write(self.style.SUCCESS(f'✓ Pinged {url} → HTTP {code}'))
                    success += 1
            except Exception as exc:
                self.stdout.write(self.style.WARNING(f'✗ Failed {url}: {exc}'))
                logger.warning(f'Sitemap ping failed for {url}: {exc}')

        if success == len(PING_URLS):
            self.stdout.write(self.style.SUCCESS(f'\nAll {success} search engines notified of {sitemap_url}'))
        else:
            self.stdout.write(self.style.WARNING(f'\n{success}/{len(PING_URLS)} pings succeeded.'))
