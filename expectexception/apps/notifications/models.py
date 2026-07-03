from django.db import models
from django.conf import settings
from django.utils import timezone


class PushSubscription(models.Model):
    """Store web push notification subscriptions"""
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='push_subscriptions',
        help_text="Optional: Link to authenticated user"
    )
    
    # Push subscription details
    endpoint = models.TextField(unique=True, help_text="Push service endpoint URL")
    p256dh_key = models.TextField(help_text="User public key for encryption (p256dh)")
    auth_key = models.TextField(help_text="User auth secret for encryption")
    
    # Metadata
    user_agent = models.TextField(blank=True, help_text="Browser/device info")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'push_subscriptions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['endpoint']),
            models.Index(fields=['user', 'is_active']),
        ]
    
    def __str__(self):
        user_info = f"User: {self.user.username}" if self.user else "Anonymous"
        return f"PushSubscription ({user_info}) - {self.endpoint[:50]}..."
    
    def disable(self):
        """Mark subscription as inactive"""
        self.is_active = False
        self.save(update_fields=['is_active', 'last_used'])


class NotificationLog(models.Model):
    """Log of sent notifications for analytics and debugging"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]
    
    subscription = models.ForeignKey(
        PushSubscription,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    
    title = models.CharField(max_length=255)
    body = models.TextField()
    icon = models.URLField(blank=True)
    url = models.URLField(blank=True, help_text="URL to open when clicked")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    error_message = models.TextField(blank=True)
    
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notification_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['subscription', '-created_at']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.status}"
    
    def mark_sent(self):
        """Mark notification as successfully sent"""
        self.status = 'sent'
        self.sent_at = timezone.now()
        self.save(update_fields=['status', 'sent_at'])
    
    def mark_failed(self, error):
        """Mark notification as failed with error message"""
        self.status = 'failed'
        self.error_message = str(error)
        self.save(update_fields=['status', 'error_message'])


class InAppNotification(models.Model):
    """In-app notification for community events (replies, votes, accepted answers)."""
    TYPE_CHOICES = [
        ('reply', 'New Reply'),
        ('vote', 'Vote Received'),
        ('accepted', 'Answer Accepted'),
        ('mention', 'Mention'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='sent_notifications'
    )
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    url = models.CharField(max_length=500, blank=True, help_text="Frontend path to navigate to")
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read', '-created_at']),
        ]

    def __str__(self):
        return f"{self.notification_type} for {self.recipient}"
