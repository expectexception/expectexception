from django.contrib.sitemaps import Sitemap
from django.urls import reverse
from apps.blog.models import Post

class StaticSitemap(Sitemap):
    priority = 0.5
    changefreq = 'daily'

    def items(self):
        return ['home', 'services', 'downloads', 'blogs', 'contact', 'privacy-policy', 'terms-of-service']

    def location(self, item):
        # Frontend routes - returned as absolute paths
        if item == 'home':
            return '/'
        elif item == 'services':
            return '/services'
        elif item == 'downloads':
            return '/downloads'
        elif item == 'blogs':
            return '/blogs'
        elif item == 'contact':
            return '/contact'
        elif item == 'privacy-policy':
            return '/privacy-policy'
        elif item == 'terms-of-service':
            return '/terms-of-service'
        return f'/{item}'

class BlogSitemap(Sitemap):
    priority = 0.6
    changefreq = 'weekly'

    def items(self):
        return Post.objects.filter(status='published')

    def lastmod(self, obj):
        return obj.updated_at
        
    def location(self, obj):
        return f"/blogs/{obj.id}"

class ToolsSitemap(Sitemap):
    priority = 0.8
    changefreq = 'weekly'

    def items(self):
        return [
            # Original tools
            'qr-generator',
            'json-formatter',
            'url-downloader',
            'yt-downloader',
            'text-to-speech',
            'image-compressor',
            'ai-detector',
            # Document tools
            'pdf-to-doc',
            'doc-to-pdf',
            'pdf-merger',
            'pdf-splitter',
            'image-to-pdf',
            # Image tools
            'image-resizer',
            'background-remover',
            'image-to-text',
            'image-converter',
            # Developer tools
            'base64',
            'hash-generator',
            'uuid-generator',
            'color-converter',
            'markdown-preview',
        ]

    def location(self, item):
        return f"/services/{item}"
