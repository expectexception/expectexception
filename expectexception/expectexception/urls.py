from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from django.contrib.sitemaps.views import sitemap
from .sitemaps import StaticSitemap, BlogSitemap, ToolsSitemap, CommunityThreadSitemap
from django.http import HttpResponse

sitemaps = {
    'static': StaticSitemap,
    'blog': BlogSitemap,
    'tools': ToolsSitemap,
    'community': CommunityThreadSitemap,
}

def robots_txt(request):
    content = "User-agent: *\nDisallow: /admin/\nSitemap: /sitemap.xml"
    return HttpResponse(content, content_type="text/plain")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/services/', include('apps.services.urls')),
    path('api/blog/', include('apps.blog.urls')),
    path('api/profiles/', include('apps.profiles.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/text-to-handwriting/', include('apps.text_to_handwriting.urls')),
    path('api/secret-sharer/', include('apps.secret_sharer.urls')),
    path('api/contact/', include('apps.contact.urls')),
    path('api/community/', include('apps.community.urls')),

    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='docs'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # SEO
    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
    path('robots.txt', robots_txt),
]

from django.conf import settings
from django.urls import re_path
from django.views.static import serve as serve_static

# This server runs with DEBUG=False and no nginx in front of it (Cloudflare
# Tunnel routes straight to gunicorn), so something still needs to serve
# generated files (background-removed images, resized/converted images,
# merged PDFs, etc.) or every service that returns a MEDIA_URL file_url
# 404s in production. Django's static() shortcut won't do it — it silently
# no-ops (returns []) whenever DEBUG=False, regardless of any surrounding
# guard — so this calls the underlying view directly instead. Not a concern
# for a single-instance deployment like this one; a horizontally-scaled
# deployment would want S3/Cloudinary instead (Render already excludes
# these apps).
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve_static, {'document_root': settings.MEDIA_ROOT}),
]

# Conditionally register routes for heavy/optional apps that may be
# excluded from INSTALLED_APPS on Render (e.g. videos, chatbot, ai_detector).
_installed = set(settings.INSTALLED_APPS)
if 'apps.videos' in _installed:
    urlpatterns += [path('api/videos/', include('apps.videos.urls'))]
if 'apps.chatbot' in _installed:
    urlpatterns += [path('api/chatbot/', include('apps.chatbot.urls'))]
if 'apps.ai_detector' in _installed:
    urlpatterns += [path('api/ai-detector/', include('apps.ai_detector.urls'))]
