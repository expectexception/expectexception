"""Chatbot models for conversation persistence."""
from django.db import models
from django.conf import settings


class Conversation(models.Model):
    """A chat conversation session."""
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations',
        null=True,
        blank=True,
        help_text='Authenticated user (null for anonymous)'
    )
    session_id = models.CharField(
        max_length=100,
        blank=True,
        help_text='Session ID for anonymous users'
    )
    title = models.CharField(
        max_length=200,
        default='New Chat',
        help_text='Auto-generated from first message'
    )
    model = models.CharField(
        max_length=50,
        default='phi3:mini',
        help_text='Model used for this conversation'
    )
    system_prompt = models.TextField(
        blank=True,
        default='You are a helpful AI assistant. Be concise, friendly, and helpful.',
        help_text='System prompt for the conversation'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'Conversation'
        verbose_name_plural = 'Conversations'
    
    def __str__(self):
        user_str = self.user.email if self.user else f'Anonymous ({self.session_id[:8]}...)'
        return f"{self.title} - {user_str}"
    
    def get_messages_for_context(self, limit=20):
        """Get recent messages formatted for Ollama context."""
        messages = self.messages.order_by('-created_at')[:limit]
        messages = list(reversed(messages))
        
        result = []
        if self.system_prompt:
            result.append({'role': 'system', 'content': self.system_prompt})
        
        for msg in messages:
            result.append({'role': msg.role, 'content': msg.content})
        
        return result


class Message(models.Model):
    """A single message in a conversation."""
    
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    ]
    
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    
    # Metadata
    tokens_used = models.IntegerField(default=0, help_text='Tokens used for this message')
    generation_time = models.FloatField(default=0, help_text='Time to generate response (seconds)')
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
        verbose_name = 'Message'
        verbose_name_plural = 'Messages'
    
    def __str__(self):
        preview = self.content[:50] + '...' if len(self.content) > 50 else self.content
        return f"[{self.role}] {preview}"
