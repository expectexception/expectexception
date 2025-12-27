from django.db import models

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
