"""Admin configuration for contact inquiries."""
from django.contrib import admin
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from .models import ContactInquiry


@admin.register(ContactInquiry)
class ContactInquiryAdmin(ModelAdmin):
    """Admin interface for managing contact inquiries."""
    
    list_display = [
        'id',
        'name',
        'email',
        'phone',
        'inquiry_type_badge',
        'subject_preview',
        'status_badge',
        'created_at',
    ]
    
    list_filter = [
        'inquiry_type',
        'status',
        'created_at',
        'source_page',
    ]
    
    search_fields = [
        'name',
        'email',
        'phone',
        'subject',
        'message',
        'project_type',
    ]
    
    readonly_fields = [
        'created_at',
        'updated_at',
        'ip_address',
        'user_agent',
        'source_page',
    ]
    
    list_per_page = 25
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Sender Information', {
            'fields': ('name', 'email', 'phone')
        }),
        ('Inquiry Details', {
            'fields': ('inquiry_type', 'subject', 'message')
        }),
        ('Hire Project Details', {
            'fields': ('project_type', 'budget'),
            'classes': ('collapse',),
        }),
        ('Status & Notes', {
            'fields': ('status', 'admin_notes')
        }),
        ('Metadata', {
            'fields': ('source_page', 'ip_address', 'user_agent', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    
    actions = ['mark_as_read', 'mark_as_replied', 'mark_as_closed']
    
    def inquiry_type_badge(self, obj):
        colors = {
            'general': '#3b82f6',
            'hire': '#10b981',
            'support': '#f59e0b',
            'feedback': '#8b5cf6',
            'partnership': '#ec4899',
        }
        color = colors.get(obj.inquiry_type, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 4px; font-size: 11px; font-weight: 600;">{}</span>',
            color, obj.get_inquiry_type_display()
        )
    inquiry_type_badge.short_description = 'Type'
    inquiry_type_badge.admin_order_field = 'inquiry_type'
    
    def status_badge(self, obj):
        colors = {
            'new': '#ef4444',
            'read': '#3b82f6',
            'replied': '#10b981',
            'closed': '#6b7280',
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 4px; font-size: 11px; font-weight: 600;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'
    
    def subject_preview(self, obj):
        if obj.subject:
            return obj.subject[:50] + '...' if len(obj.subject) > 50 else obj.subject
        return obj.message[:50] + '...' if len(obj.message) > 50 else obj.message
    subject_preview.short_description = 'Subject/Message'
    
    @admin.action(description='Mark selected as Read')
    def mark_as_read(self, request, queryset):
        updated = queryset.update(status='read')
        self.message_user(request, f'{updated} inquiries marked as read.')
    
    @admin.action(description='Mark selected as Replied')
    def mark_as_replied(self, request, queryset):
        updated = queryset.update(status='replied')
        self.message_user(request, f'{updated} inquiries marked as replied.')
    
    @admin.action(description='Mark selected as Closed')
    def mark_as_closed(self, request, queryset):
        updated = queryset.update(status='closed')
        self.message_user(request, f'{updated} inquiries marked as closed.')
