from django.urls import path
from .views import (
    TextToSpeechView, 
    ImageCompressorView, 
    QrGeneratorView, 
    JsonFormatterView, 
    UrlDownloaderView, 
    YtDownloaderView,
    ServiceViewSet,
    DownloadableResourceViewSet,
    UserDashboardViewSet,
    DownloadHistoryViewSet,
    GlobalSearchView,
    GlobalSearchView,
    PdfToDocView,
    PdfToDocStatusView,
    # New tools
    DocToPdfView,
    PdfMergerView,
    PdfSplitterView,
    ImageToPdfView,
    ImageResizerView,
    BackgroundRemoverView,
    ImageToTextView,
    ImageConverterView,
    ImageUpscalerView,
    Base64View,
    HashGeneratorView,
    UuidGeneratorView,
    ColorConverterView,
    MarkdownPreviewView,
    LogAnalysisView,
    AnalyticsDashboardView,
    # ServerStatusView, # Removed from old import location
    RedirectInspectorView,
    DnsLookupView,
    TlsCheckView,
    HeaderHardeningView,
    CorsPreflightView,
    WhoisRdapView,
    SitemapRobotsView,
    PortCheckerView,
    PerformanceSnapshotView,
    CacheKeyDebuggerView,
    PingTracerouteView,
    SubdomainEnumView,
    JwtVerifyView,
    # Webhook inspector views
    WebhookCreateView,
    WebhookReceiverView,
    WebhookRequestsListView,
    WebhookRequestDetailView,
    WebhookReplayView,
    WebsiteDiagnosticsView,
    AudioSeparatorView,
    AudioSeparatorStatusView,
)
from .server_status_view import ServerStatusView, get_metrics_api # Updated import path
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'tools', ServiceViewSet, basename='tools')
router.register(r'downloads', DownloadableResourceViewSet, basename='downloads')
router.register(r'dashboard', UserDashboardViewSet, basename='dashboard')
router.register(r'history', DownloadHistoryViewSet, basename='history')

urlpatterns = [
    # ...
    path('server-health/', ServerStatusView.as_view(), name='server-health'),
    path('server-status-api/', get_metrics_api, name='server-status-api'), # New API
    path('redirect-inspector/', RedirectInspectorView.as_view(), name='redirect-inspector'),
    path('dns-lookup/', DnsLookupView.as_view(), name='dns-lookup'),
    path('tls-check/', TlsCheckView.as_view(), name='tls-check'),
    path('header-hardening/', HeaderHardeningView.as_view(), name='header-hardening'),
    path('cors-preflight/', CorsPreflightView.as_view(), name='cors-preflight'),
    path('whois-rdap/', WhoisRdapView.as_view(), name='whois-rdap'),
    path('sitemap-robots/', SitemapRobotsView.as_view(), name='sitemap-robots'),
    path('port-check/', PortCheckerView.as_view(), name='port-check'),
    path('performance-snapshot/', PerformanceSnapshotView.as_view(), name='performance-snapshot'),
    path('cache-debug/', CacheKeyDebuggerView.as_view(), name='cache-debug'),
    path('ping-traceroute/', PingTracerouteView.as_view(), name='ping-traceroute'),
    path('subdomain-enum/', SubdomainEnumView.as_view(), name='subdomain-enum'),
    path('jwt-verify/', JwtVerifyView.as_view(), name='jwt-verify'),
    # Webhook inspector endpoints
    path('webhook/create/', WebhookCreateView.as_view(), name='webhook-create'),
    path('webhook/<uuid:endpoint_id>/', WebhookReceiverView.as_view(), name='webhook-receiver'),
    path('webhook/<uuid:endpoint_id>/requests/', WebhookRequestsListView.as_view(), name='webhook-requests'),
    path('webhook/<uuid:endpoint_id>/requests/<uuid:request_id>/', WebhookRequestDetailView.as_view(), name='webhook-request-detail'),
    path('webhook/<uuid:endpoint_id>/replay/<uuid:request_id>/', WebhookReplayView.as_view(), name='webhook-replay'),
    path('website-diagnostics/', WebsiteDiagnosticsView.as_view(), name='website-diagnostics'),
    path('audio-separator/process', AudioSeparatorView.as_view(), name='audio-separator'),
    path('audio-separator/status/<str:task_id>/', AudioSeparatorStatusView.as_view(), name='audio-separator-status'),
] + router.urls
