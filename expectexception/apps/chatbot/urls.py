"""URL patterns for chatbot API."""
from django.urls import path
from . import views

urlpatterns = [
    path('status/', views.check_status, name='chatbot_status'),
    path('chat/', views.chat, name='chatbot_chat'),
    path('chat/sync/', views.chat_sync, name='chatbot_chat_sync'),
    path('conversations/', views.list_conversations, name='chatbot_conversations'),
    path('conversations/<int:pk>/', views.conversation_detail, name='chatbot_conversation_detail'),
    path('personas/', views.list_personas, name='chatbot_personas'),
]
