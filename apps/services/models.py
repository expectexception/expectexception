from django.db import models
import uuid

class Service(models.Model):
    title = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(max_length=50, help_text="MUI Icon name")
    path = models.CharField(max_length=200)
    category = models.CharField(max_length=50)
    popularity = models.IntegerField(default=0)
    tags = models.JSONField(default=list)
    color = models.CharField(max_length=20, default='primary', help_text="MUI Color palette name")
    is_active = models.BooleanField(default=True)
    requires_login = models.BooleanField(
        default=False,
        help_text="If checked, only authenticated users can use this tool"
    )

    def __str__(self):
        return self.title

class DownloadableResource(models.Model):
    CATEGORY_CHOICES = [
        ('doc', 'Documents'),
        ('img', 'Images'),
        ('video', 'Videos'),
        ('audio', 'Audio'),
        ('archive', 'Archives'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=255)
    file = models.FileField(upload_to='downloads/')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    size = models.CharField(max_length=20, help_text="e.g., '45.2 MB'")
    downloads = models.IntegerField(default=0)
    version = models.CharField(max_length=20, default='v1.0.0')
    created_at = models.DateTimeField(auto_now_add=True)
    
    # SEO & Content Fields
    description = models.TextField(blank=True, help_text="Full description of the resource")
    keywords = models.CharField(max_length=255, blank=True, help_text="Comma-separated SEO keywords")
    slug = models.SlugField(max_length=255, unique=True, blank=True, help_text="URL-friendly identifier")
    seo_title = models.CharField(max_length=100, blank=True, help_text="Custom SEO title (optional)")
    seo_description = models.CharField(max_length=160, blank=True, help_text="SEO meta description (optional)")
    cover_image = models.ImageField(upload_to='downloads/covers/', null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while DownloadableResource.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
            
        if self.file and not self.size:
            try:
                self.size = self.format_file_size(self.file.size)
            except Exception:
                pass
        super().save(*args, **kwargs)

    def format_file_size(self, size_bytes):
        if size_bytes == 0:
            return "0 B"
        size_name = ("B", "KB", "MB", "GB", "TB")
        import math
        i = int(math.floor(math.log(size_bytes, 1024)))
        p = math.pow(1024, i)
        s = round(size_bytes / p, 2)
        return "%s %s" % (s, size_name[i])

    def __str__(self):
        return self.name

class UserActivity(models.Model):
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='activities')
    action = models.CharField(max_length=50) # "download_video", "generate_qr", etc.
    details = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    execution_time = models.FloatField(null=True, blank=True, help_text="Execution time in seconds")
    status = models.CharField(max_length=20, default='success', choices=[
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('partial', 'Partial'),
    ])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} - {self.action} - {self.created_at}"


class ToolUsage(models.Model):
    """Audit log for tool usage by user/IP.

    This is designed to answer: who (user), from where (ip), used which tool,
    when, and whether it succeeded.
    """

    STATUS_CHOICES = [
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('partial', 'Partial'),
    ]

    user = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tool_usages',
    )

    tool_name = models.CharField(max_length=120, db_index=True, help_text="Logical tool name e.g. 'qr-generator'")
    endpoint = models.CharField(max_length=255, blank=True, help_text="Request path e.g. /api/services/qr-generator/")
    method = models.CharField(max_length=10, blank=True)

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    forwarded_for = models.TextField(blank=True, help_text="Raw X-Forwarded-For header")
    user_agent = models.TextField(blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='success', db_index=True)
    http_status = models.IntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    execution_time_ms = models.IntegerField(null=True, blank=True)
    request_id = models.UUIDField(null=True, blank=True, db_index=True)

    extra = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tool_name', '-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['ip_address', '-created_at']),
            models.Index(fields=['status', '-created_at']),
        ]

    def __str__(self):
        user_label = getattr(self.user, 'email', None) or getattr(self.user, 'username', None) or 'Anonymous'
        return f"{user_label} • {self.tool_name} • {self.status} • {self.created_at}"


class DownloadHistory(models.Model):
    """Track all downloads for analytics and user history"""
    DOWNLOAD_TYPES = [
        ('youtube', 'YouTube Video'),
        ('url', 'URL Download'),
        ('image', 'Image'),
        ('resource', 'Downloadable Resource'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('partial', 'Partial'),
    ]
    
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='download_history')
    download_type = models.CharField(max_length=20, choices=DOWNLOAD_TYPES)
    url = models.URLField(max_length=500)
    title = models.CharField(max_length=500, blank=True)
    file_size = models.BigIntegerField(null=True, blank=True, help_text="File size in bytes")
    format = models.CharField(max_length=20, blank=True)
    quality = models.CharField(max_length=50, blank=True, help_text="e.g., 720p, 1080p")
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='success')
    error_message = models.TextField(blank=True)
    duration_seconds = models.FloatField(null=True, blank=True, help_text="How long the download took")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Download Histories'
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['download_type']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        user_str = self.user.username if self.user else 'Anonymous'
        return f"{user_str} - {self.download_type} - {self.title[:50]} - {self.created_at}"
    
    @property
    def file_size_formatted(self):
        """Return file size in human-readable format"""
        if not self.file_size:
            return "N/A"
        
        for unit in ['B', 'KB', 'MB', 'GB']:
            if self.file_size < 1024.0:
                return f"{self.file_size:.2f} {unit}"
            self.file_size /= 1024.0
        return f"{self.file_size:.2f} TB"


class FavoriteTool(models.Model):
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='favorites')
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'service')

    def __str__(self):
        return f"{self.user} -> {self.service}"

class LogIntelligence(models.Model):
    """Stores persistent aggregated log analytics data"""
    date = models.DateField(auto_now_add=True, unique=True)
    state_data = models.JSONField(help_text="Full aggregated state of log analysis")
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Log Intelligence State"
        verbose_name_plural = "Log Intelligence States"
        ordering = ['-date']

    def __str__(self):
        return f"Analytics State - {self.date}"

class LogAnalysis(Service):
    class Meta:
        proxy = True
        verbose_name = "Log Analysis"
        verbose_name_plural = "Log Analysis"

class ServerHealth(Service):
    class Meta:
        proxy = True
        verbose_name = "Server Health"
        verbose_name_plural = "Server Health"


class WebhookEndpoint(models.Model):
    """Represents an ephemeral webhook endpoint that collects incoming requests."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    secret = models.CharField(max_length=128, blank=True, help_text="Optional secret for validating incoming requests")
    max_requests = models.IntegerField(default=100)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Webhook {self.id} ({self.name})"


class WebhookRequest(models.Model):
    """Stores a received webhook request for an endpoint."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    endpoint = models.ForeignKey(WebhookEndpoint, on_delete=models.CASCADE, related_name='requests')
    method = models.CharField(max_length=10, blank=True)
    path = models.CharField(max_length=500, blank=True)
    headers = models.JSONField(default=dict, blank=True)
    body = models.TextField(blank=True)
    remote_addr = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Request {self.id} -> {self.endpoint_id} @ {self.created_at}"


class UptimeMonitor(models.Model):
    """A recurring keep-alive/uptime check owned by one user. Replaces the
    old anonymous, file-backed 'trigger' storage (apps/services/scheduler.py,
    now removed) which had no ownership and no target validation."""

    TYPE_CHOICES = [
        ('http', 'HTTP(S)'),
        ('keyword', 'Keyword Match'),
        ('ping', 'Ping (TCP connect)'),
        ('port', 'Port Check'),
        ('ssl', 'SSL Certificate'),
        ('heartbeat', 'Heartbeat Listener'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paused', 'Paused'),
    ]

    MAX_MONITORS_PER_USER = 10
    MIN_INTERVAL_MINUTES = 1
    MAX_INTERVAL_MINUTES = 60

    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='uptime_monitors')
    name = models.CharField(max_length=120)
    monitor_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='http')
    target = models.CharField(max_length=500, blank=True, help_text="URL or hostname; not used for heartbeat monitors")
    keyword = models.CharField(max_length=200, blank=True)
    port = models.IntegerField(null=True, blank=True)
    interval_minutes = models.IntegerField(default=5)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')

    heartbeat_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    last_run_at = models.DateTimeField(null=True, blank=True)
    last_status = models.CharField(max_length=10, default='never')
    last_latency_ms = models.IntegerField(default=0)
    logs = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_monitor_type_display()}) — {self.user}"

    def push_log(self, message: str, check_status: str = 'info', max_entries: int = 30):
        """Prepend a structured log entry, capped to the most recent N.
        check_status is 'up' | 'down' | 'info' (paused/registered/etc, not a
        pass/fail result) — lets the frontend render a real color-coded
        recent-check-history strip instead of string-sniffing message text."""
        from django.utils import timezone
        entry = {
            'at': timezone.localtime().strftime('%H:%M:%S'),
            'message': message,
            'status': check_status,
        }
        self.logs = ([entry] + (self.logs or []))[:max_entries]
