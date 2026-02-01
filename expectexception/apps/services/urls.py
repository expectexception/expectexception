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
    ServerStatusView,
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
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'tools', ServiceViewSet, basename='tools')
router.register(r'downloads', DownloadableResourceViewSet, basename='downloads')
router.register(r'dashboard', UserDashboardViewSet, basename='dashboard')
router.register(r'history', DownloadHistoryViewSet, basename='history')


urlpatterns = [
    # Existing tools
    path('tts/', TextToSpeechView.as_view(), name='text-to-speech'),
    path('compress-image/', ImageCompressorView.as_view(), name='compress-image'),
    path('qr-generator/', QrGeneratorView.as_view(), name='qr-generator'),
    path('json-formatter/', JsonFormatterView.as_view(), name='json-formatter'),
    path('url-downloader/', UrlDownloaderView.as_view(), name='url-downloader'),
    path('yt-downloader/', YtDownloaderView.as_view(), name='yt-downloader'),
    path('search/', GlobalSearchView.as_view(), name='global-search'),
    
    # Document tools
    path('pdf-to-doc/', PdfToDocView.as_view(), name='pdf-to-doc'),
    path('pdf-to-doc/status/<str:task_id>/', PdfToDocStatusView.as_view(), name='pdf-to-doc-status'),
    path('doc-to-pdf/', DocToPdfView.as_view(), name='doc-to-pdf'),
    path('pdf-merge/', PdfMergerView.as_view(), name='pdf-merge'),
    path('pdf-split/', PdfSplitterView.as_view(), name='pdf-split'),
    path('image-to-pdf/', ImageToPdfView.as_view(), name='image-to-pdf'),
    
    # Image tools
    path('image-resize/', ImageResizerView.as_view(), name='image-resize'),
    path('background-remove/', BackgroundRemoverView.as_view(), name='background-remove'),
    path('image-to-text/', ImageToTextView.as_view(), name='image-to-text'),
    path('image-convert/', ImageConverterView.as_view(), name='image-convert'),
    path('image-upscale/', ImageUpscalerView.as_view(), name='image-upscale'),
    
    # Developer tools
    path('base64/', Base64View.as_view(), name='base64'),
    path('hash-generator/', HashGeneratorView.as_view(), name='hash-generator'),
    path('uuid-generator/', UuidGeneratorView.as_view(), name='uuid-generator'),
    path('color-converter/', ColorConverterView.as_view(), name='color-converter'),
    path('markdown-preview/', MarkdownPreviewView.as_view(), name='markdown-preview'),
    path('log-analysis/', LogAnalysisView.as_view(), name='log-analysis'),
    path('analytics-dashboard/', AnalyticsDashboardView.as_view(), name='analytics-dashboard'),
    path('server-health/', ServerStatusView.as_view(), name='server-health'),
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
