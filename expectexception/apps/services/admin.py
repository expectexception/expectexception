from django.contrib import admin
from django.urls import path
from django.template.response import TemplateResponse
from django.utils.html import format_html
from django.conf import settings
from unfold.admin import ModelAdmin
from unfold.decorators import display
from .models import Service, DownloadableResource, UserActivity, DownloadHistory, FavoriteTool, LogAnalysis, ServerHealth, ToolUsage
from .log_analyzer import get_log_analysis

@admin.register(Service)
class ServiceAdmin(ModelAdmin):
    list_display = ('title', 'category', 'popularity', 'is_active', 'view_log_analysis_link', 'view_server_health_link')
    list_filter = ('category', 'is_active')
    search_fields = ('title', 'description')
    ordering = ('-popularity',)
    list_filter_submit = True

    @display(description='Logs')
    def view_log_analysis_link(self, obj):
        url = "/api/services/analytics-dashboard/"
        return format_html('<a class="button" href="{}" target="_blank">Analytics</a>', url)

    @display(description='Server Health')
    def view_server_health_link(self, obj):
        url = "/api/services/server-health/"
        return format_html('<a class="button" href="{}" target="_blank" style="background: #4338ca; color: white; padding: 5px 10px; border-radius: 4px; text-decoration: none;">Health</a>', url)

class LogAnalysisAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_view_permission(self, request, obj=None):
        return True

    def has_module_permission(self, request):
        return True

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('view_analysis/', self.admin_site.admin_view(self.view_analysis), name='log-analysis'),
        ]
        return custom_urls + urls

    def view_analysis(self, request):
        log_file = os.path.join(settings.BASE_DIR, 'logs', 'requests.log')
        state_file = os.path.join(settings.BASE_DIR, 'logs', 'requests_analysis.state.json')
        analysis = get_log_analysis(log_file, state_file=state_file)
        
        context = dict(
            self.admin_site.each_context(request),
            analysis=analysis,
            title="Log Analysis Report"
        )
        return TemplateResponse(request, "admin/log_analysis.html", context)

    def changelist_view(self, request, extra_context=None):
        return self.view_analysis(request)

class ServerHealthAdmin(admin.ModelAdmin):
    def has_add_permission(self, request): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False
    def has_view_permission(self, request, obj=None): return True
    def has_module_permission(self, request): return True

    def changelist_view(self, request, extra_context=None):
        from .views import ServerStatusView
        return ServerStatusView.as_view()(request)

@admin.register(LogAnalysis)
class LogAnalysisProxyAdmin(LogAnalysisAdmin):
    pass

@admin.register(ServerHealth)
class ServerHealthProxyAdmin(ServerHealthAdmin):
    pass

@admin.register(DownloadableResource)
class DownloadableResourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'size', 'downloads', 'version', 'created_at')
    list_filter = ('category', 'created_at')
    search_fields = ('name',)
    readonly_fields = ('size', 'downloads')
    
    fieldsets = (
        (None, {
            'fields': ('name', 'file', 'category', 'version')
        }),
        ('Stats', {
            'fields': ('size', 'downloads'),
            'classes': ('collapse',)
        }),
    )

@admin.register(UserActivity)
class UserActivityAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'status', 'created_at')
    list_filter = ('action', 'status', 'created_at')
    search_fields = ('user__email', 'details')
    readonly_fields = ('created_at',)


@admin.register(ToolUsage)
class ToolUsageAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'tool_name', 'status', 'http_status', 'user', 'ip_address', 'method', 'endpoint')
    list_filter = ('tool_name', 'status', 'method', 'created_at')
    search_fields = ('tool_name', 'endpoint', 'user__email', 'user__username', 'ip_address', 'user_agent', 'error_message')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    readonly_fields = (
        'created_at',
        'user',
        'tool_name',
        'endpoint',
        'method',
        'ip_address',
        'forwarded_for',
        'user_agent',
        'status',
        'http_status',
        'error_message',
        'execution_time_ms',
        'request_id',
        'extra',
    )

    fieldsets = (
        (None, {'fields': ('created_at', 'tool_name', 'status', 'http_status')}),
        ('Requester', {'fields': ('user', 'ip_address', 'forwarded_for', 'user_agent')}),
        ('Request', {'fields': ('method', 'endpoint', 'request_id')}),
        ('Execution', {'fields': ('execution_time_ms', 'error_message', 'extra')}),
    )

    def has_add_permission(self, request):
        return False

@admin.register(DownloadHistory)
class DownloadHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'download_type', 'title', 'status', 'created_at')
    list_filter = ('download_type', 'status', 'created_at')
    search_fields = ('user__email', 'title', 'url')
    readonly_fields = ('created_at',)

@admin.register(FavoriteTool)
class FavoriteToolAdmin(admin.ModelAdmin):
    list_display = ('user', 'service', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__email', 'service__title')
