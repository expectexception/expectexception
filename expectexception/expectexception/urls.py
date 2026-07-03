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
    path('api/videos/', include('apps.videos.urls')),
    path('api/profiles/', include('apps.profiles.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/ai-detector/', include('apps.ai_detector.urls')),
    path('api/text-to-handwriting/', include('apps.text_to_handwriting.urls')),
    path('api/secret-sharer/', include('apps.secret_sharer.urls')),
    path('api/contact/', include('apps.contact.urls')),
    path('api/chatbot/', include('apps.chatbot.urls')),
    path('api/community/', include('apps.community.urls')),

    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='docs'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # SEO
    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
    path('robots.txt', robots_txt),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
