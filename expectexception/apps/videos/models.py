from django.db import models
from django.conf import settings


class VideoDownload(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_RUNNING = 'running'
    STATUS_DONE = 'done'
    STATUS_FAILED = 'failed'

    STATUS_CHOICES = (
        (STATUS_PENDING, 'Pending'),
        (STATUS_RUNNING, 'Running'),
        (STATUS_DONE, 'Done'),
        (STATUS_FAILED, 'Failed'),
    )

    url = models.URLField()
    format_id = models.CharField(max_length=255, blank=True, null=True)
    filename = models.CharField(max_length=255, blank=True, null=True)
    file_path = models.CharField(max_length=500, blank=True, null=True)
    file_size = models.BigIntegerField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    error = models.TextField(blank=True, null=True)
    extra = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def media_file_path(self):
        # relative to MEDIA_ROOT
        if self.file_path:
            return self.file_path
        return None

    def absolute_file_path(self):
        if self.file_path:
            return settings.MEDIA_ROOT / self.file_path
        return None

    def __str__(self):
        return f"Download {self.id} - {self.url} ({self.status})"
