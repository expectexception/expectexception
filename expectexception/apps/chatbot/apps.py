"""Chatbot app configuration."""
from django.apps import AppConfig


class ChatbotConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.chatbot'
    verbose_name = 'AI Chatbot'

    def ready(self):
        try:
            import apps.chatbot.signals
        except Exception:
            pass
