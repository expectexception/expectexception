from django.urls import path
from .share_views import ToolShareCreateView, ToolShareRetrieveView
from .views import (
    TextToSpeechView, 
    ImageCompressorView, 
    QrGeneratorView, 
    JsonFormatterView, 
    UrlDownloaderView, 
    YtDownloaderView,
    ServiceViewSet,
    ToolAccessView,
    ToolAccessToggleView,
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
    HealthCheckView,
    UptimeRobotView,
    UptimeTriggersView,
    UptimeTriggerDetailView,
    CeleryTaskStatusView,
)
from .server_status_view import ServerStatusView, get_metrics_api # Updated import path
from .admin_views import (
    AdminUserListView,
    AdminUserDetailView,
    AdminLogsView,
    AdminBlogListView,
    AdminBlogDetailView,
    AdminDownloadListView,
    AdminDownloadDetailView,
    AdminInquiryListView,
    AdminInquiryDetailView,
    AdminInquiryReplyView,
    OllamaModelsView,
    OllamaModelControlView,
    OllamaStatusView,
)
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'tools', ServiceViewSet, basename='tools')
router.register(r'downloads', DownloadableResourceViewSet, basename='downloads')
router.register(r'dashboard', UserDashboardViewSet, basename='dashboard')
router.register(r'history', DownloadHistoryViewSet, basename='history')

# Admin API endpoints
admin_urlpatterns = [
    path('admin/users/', AdminUserListView.as_view(), name='admin-users'),
    path('admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('admin/logs/', AdminLogsView.as_view(), name='admin-logs'),
    path('admin/blogs/', AdminBlogListView.as_view(), name='admin-blogs'),
    path('admin/blogs/<int:pk>/', AdminBlogDetailView.as_view(), name='admin-blog-detail'),
    path('admin/downloads/', AdminDownloadListView.as_view(), name='admin-downloads'),
    path('admin/downloads/<int:pk>/', AdminDownloadDetailView.as_view(), name='admin-download-detail'),
    path('admin/inquiries/', AdminInquiryListView.as_view(), name='admin-inquiries'),
    path('admin/inquiries/<int:pk>/', AdminInquiryDetailView.as_view(), name='admin-inquiry-detail'),
    path('admin/inquiries/<int:pk>/reply/', AdminInquiryReplyView.as_view(), name='admin-inquiry-reply'),
    path('admin/ollama/models/', OllamaModelsView.as_view(), name='admin-ollama-models'),
    path('admin/ollama/control/', OllamaModelControlView.as_view(), name='admin-ollama-control'),
    path('admin/ollama/status/', OllamaStatusView.as_view(), name='admin-ollama-status'),
]

urlpatterns = [
    # Core tools
    path('qr-generator/', QrGeneratorView.as_view(), name='qr-generator'),
    path('json-formatter/', JsonFormatterView.as_view(), name='json-formatter'),
    path('url-downloader/', UrlDownloaderView.as_view(), name='url-downloader'),
    path('yt-downloader/', YtDownloaderView.as_view(), name='yt-downloader'),
    path('tts/', TextToSpeechView.as_view(), name='tts'),
    path('compress-image/', ImageCompressorView.as_view(), name='compress-image'),

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

    # Diagnostics & security tools
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
    path('website-diagnostics/', WebsiteDiagnosticsView.as_view(), name='website-diagnostics'),
    path('uptime-robot/', UptimeRobotView.as_view(), name='uptime-robot'),
    path('uptime-robot/triggers/', UptimeTriggersView.as_view(), name='uptime-triggers'),
    path('uptime-robot/triggers/<str:trigger_id>/', UptimeTriggerDetailView.as_view(), name='uptime-trigger-detail'),

    # Audio tools
    path('audio-separator/process', AudioSeparatorView.as_view(), name='audio-separator'),
    path('audio-separator/status/<str:task_id>/', AudioSeparatorStatusView.as_view(), name='audio-separator-status'),

    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('task/<str:task_id>/status/', CeleryTaskStatusView.as_view(), name='task-status'),
    path('tool-access/', ToolAccessView.as_view(), name='tool-access'),
    path('tool-access/toggle/', ToolAccessToggleView.as_view(), name='tool-access-toggle'),
    path('server-health/', ServerStatusView.as_view(), name='server-health'),
    path('server-status-api/', get_metrics_api, name='server-status-api'), # New API
    # Webhook inspector endpoints
    path('webhook/create/', WebhookCreateView.as_view(), name='webhook-create'),
    path('webhook/<uuid:endpoint_id>/', WebhookReceiverView.as_view(), name='webhook-receiver'),
    path('webhook/<uuid:endpoint_id>/requests/', WebhookRequestsListView.as_view(), name='webhook-requests'),
    path('webhook/<uuid:endpoint_id>/requests/<uuid:request_id>/', WebhookRequestDetailView.as_view(), name='webhook-request-detail'),
    path('webhook/<uuid:endpoint_id>/replay/<uuid:request_id>/', WebhookReplayView.as_view(), name='webhook-replay'),
    # Shareable tool results
    path('share/', ToolShareCreateView.as_view(), name='tool-share-create'),
    path('share/<str:short_id>/', ToolShareRetrieveView.as_view(), name='tool-share-retrieve'),
] + router.urls + admin_urlpatterns
