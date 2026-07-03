"""Contact inquiry models."""
from django.db import models


class ContactInquiry(models.Model):
    """Model to store contact form submissions and hire inquiries."""
    
    INQUIRY_TYPES = [
        ('general', 'General Contact'),
        ('hire', 'Hire Developer'),
        ('support', 'Support'),
        ('feedback', 'Feedback'),
        ('partnership', 'Partnership'),
    ]
    
    STATUS_CHOICES = [
        ('new', 'New'),
        ('read', 'Read'),
        ('replied', 'Replied'),
        ('closed', 'Closed'),
    ]
    
    # Sender info
    name = models.CharField(max_length=100)
    email = models.EmailField()
    
    # Inquiry details
    inquiry_type = models.CharField(max_length=20, choices=INQUIRY_TYPES, default='general')
    subject = models.CharField(max_length=200, blank=True)
    message = models.TextField()
    
    # Hire-specific fields
    project_type = models.CharField(max_length=100, blank=True, help_text='For hire inquiries')
    budget = models.CharField(max_length=50, blank=True, help_text='Budget range for project')
    
    # Metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    source_page = models.CharField(max_length=50, blank=True, help_text='Which page the form was submitted from')
    
    # Admin notes
    admin_notes = models.TextField(blank=True, help_text='Internal notes about this inquiry')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Contact Inquiry'
        verbose_name_plural = 'Contact Inquiries'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.inquiry_type.title()}: {self.name} - {self.email}"
    
    @property
    def is_hire_inquiry(self):
        return self.inquiry_type == 'hire'
