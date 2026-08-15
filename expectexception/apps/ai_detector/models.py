from django.db import models
from django.conf import settings


class ImageAnalysis(models.Model):
    """
    Stores the results of AI image detection analysis
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='image_analyses',
        help_text="User who uploaded the image (null for anonymous)"
    )
    image = models.ImageField(
        upload_to='ai_detector/%Y/%m/%d/',
        help_text="Uploaded image file"
    )
    filename = models.CharField(
        max_length=255,
        help_text="Original filename"
    )
    is_ai_generated = models.BooleanField(
        default=False,
        help_text="Whether the image is detected as AI-generated"
    )
    confidence = models.FloatField(
        default=0.0,
        help_text="Confidence score (0-100)"
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Stores EXIF data, image stats, ELA results, and all detection scores"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Image Analysis'
        verbose_name_plural = 'Image Analyses'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        result = "AI" if self.is_ai_generated else "Real"
        return f"{self.filename} - {result} ({self.confidence:.1f}%)"
