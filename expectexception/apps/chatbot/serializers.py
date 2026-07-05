"""Serializers for chatbot API."""
from rest_framework import serializers
from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for chat messages."""
    
    class Meta:
        model = Message
        fields = ['id', 'role', 'content', 'created_at']
        read_only_fields = ['id', 'created_at']


class ConversationSerializer(serializers.ModelSerializer):
    """Serializer for conversations."""
    
    message_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        # 'model' deliberately excluded — it's an internal record of which
        # backend model served this conversation and shouldn't be disclosed.
        fields = ['id', 'title', 'created_at', 'updated_at', 'message_count', 'last_message']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_message_count(self, obj):
        return obj.messages.count()
    
    def get_last_message(self, obj):
        last = obj.messages.last()
        if last:
            return {
                'content': last.content[:100] + '...' if len(last.content) > 100 else last.content,
                'role': last.role,
                'created_at': last.created_at
            }
        return None


class ConversationDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer with messages."""
    
    messages = MessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Conversation
        # 'model' deliberately excluded — see ConversationSerializer.
        fields = ['id', 'title', 'system_prompt', 'created_at', 'updated_at', 'messages']


class ChatRequestSerializer(serializers.Serializer):
    """Request serializer for chat endpoint."""
    
    message = serializers.CharField(max_length=10000)
    conversation_id = serializers.IntegerField(required=False, allow_null=True)
    system_prompt = serializers.CharField(max_length=2000, required=False, allow_blank=True, default='')
    # No client-supplied `model` field — which model serves a request is a
    # server-side concern (see CHATBOT_MODEL), never something the client
    # names or picks.

    def validate_message(self, value):
        return value.strip()


class ChatResponseSerializer(serializers.Serializer):
    """Response serializer for chat endpoint."""
    
    conversation_id = serializers.IntegerField()
    message_id = serializers.IntegerField()
    response = serializers.CharField()
