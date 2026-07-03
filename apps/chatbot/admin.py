"""Admin configuration for chatbot."""
from django.contrib import admin
from django.utils.html import format_html
from .models import Conversation, Message


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ['role', 'content', 'tokens_used', 'generation_time', 'created_at']
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'user_display', 'model', 'system_prompt_preview', 'message_count', 'created_at']
    list_filter = ['model', 'created_at']
    search_fields = ['title', 'user__email', 'session_id', 'system_prompt']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [MessageInline]
    
    def user_display(self, obj):
        if obj.user:
            return obj.user.email
        return format_html('<span style="color: #888;">{}</span>', 'Anonymous')
    user_display.short_description = 'User'
    
    def message_count(self, obj):
        return obj.messages.count()
    message_count.short_description = 'Messages'

    def system_prompt_preview(self, obj):
        return obj.system_prompt[:50] + '...' if obj.system_prompt else '-'
    system_prompt_preview.short_description = 'System Prompt'


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'conversation', 'role_badge', 'content_preview', 'generation_time', 'created_at']
    list_filter = ['role', 'created_at']
    search_fields = ['content', 'conversation__title']
    readonly_fields = ['conversation', 'role', 'content', 'tokens_used', 'generation_time', 'created_at']
    
    def role_badge(self, obj):
        colors = {
            'user': '#3b82f6',
            'assistant': '#10b981',
            'system': '#8b5cf6',
        }
        color = colors.get(obj.role, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 4px; font-size: 11px; font-weight: 600;">{}</span>',
            color, obj.role.title()
        )
    role_badge.short_description = 'Role'
    
    def content_preview(self, obj):
        return obj.content[:80] + '...' if len(obj.content) > 80 else obj.content
    content_preview.short_description = 'Content'
