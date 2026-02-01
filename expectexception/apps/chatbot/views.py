"""Views for chatbot API endpoints."""
import json
import logging
import time
import uuid
from django.http import StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Conversation, Message
from .serializers import (
    ConversationSerializer,
    ConversationDetailSerializer,
    ChatRequestSerializer,
)
from .services import ollama_service

logger = logging.getLogger(__name__)


def get_session_id(request):
    """Get or create session ID for anonymous users."""
    session_id = request.session.get('chatbot_session_id')
    if not session_id:
        session_id = str(uuid.uuid4())
        request.session['chatbot_session_id'] = session_id
    return session_id


@api_view(['GET'])
@permission_classes([AllowAny])
def check_status(request):
    """Check if Ollama is available and return status."""
    is_available = ollama_service.is_available()
    models = ollama_service.get_models() if is_available else []
    
    return Response({
        'available': is_available,
        'models': models,
        'current_model': ollama_service.model,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def list_conversations(request):
    """Get list of user's conversations."""
    if request.user.is_authenticated:
        conversations = Conversation.objects.filter(user=request.user)
    else:
        session_id = get_session_id(request)
        conversations = Conversation.objects.filter(session_id=session_id)
    
    serializer = ConversationSerializer(conversations[:20], many=True)
    return Response(serializer.data)


@api_view(['GET', 'DELETE'])
@permission_classes([AllowAny])
def conversation_detail(request, pk):
    """Get or delete a specific conversation."""
    try:
        if request.user.is_authenticated:
            conversation = Conversation.objects.get(pk=pk, user=request.user)
        else:
            session_id = get_session_id(request)
            conversation = Conversation.objects.get(pk=pk, session_id=session_id)
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=404)
    
    if request.method == 'DELETE':
        conversation.delete()
        return Response({'success': True})
    
    serializer = ConversationDetailSerializer(conversation)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def chat(request):
    """
    Send a message and get AI response.
    
    POST /api/chatbot/chat/
    {
        "message": "Hello, how are you?",
        "conversation_id": null  // or existing conversation ID
    }
    """
    serializer = ChatRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({
            'error': 'Invalid request',
            'details': serializer.errors
        }, status=400)
    
    user_message = serializer.validated_data['message']
    conversation_id = serializer.validated_data.get('conversation_id')
    system_prompt = serializer.validated_data.get('system_prompt', '')
    
    # Check if Ollama is available
    if not ollama_service.is_available():
        return Response({
            'error': 'AI service is temporarily unavailable. Please try again later.'
        }, status=503)
    
    # Get or create conversation
    if conversation_id:
        try:
            if request.user.is_authenticated:
                conversation = Conversation.objects.get(pk=conversation_id, user=request.user)
            else:
                session_id = get_session_id(request)
                conversation = Conversation.objects.get(pk=conversation_id, session_id=session_id)
        except Conversation.DoesNotExist:
            return Response({'error': 'Conversation not found'}, status=404)
    else:
        # Create new conversation
        conversation = Conversation.objects.create(
            user=request.user if request.user.is_authenticated else None,
            session_id=get_session_id(request) if not request.user.is_authenticated else '',
            title='New Chat',
        )
    
    # Save user message
    user_msg = Message.objects.create(
        conversation=conversation,
        role='user',
        content=user_message
    )
    
    # Generate title for new conversation
    if conversation.messages.count() == 1:
        try:
            title = ollama_service.generate_title(user_message)
            conversation.title = title
            conversation.save()
        except Exception as e:
            logger.error(f"Failed to generate title: {e}")
    
    # Get conversation context
    messages = conversation.get_messages_for_context()
    
    # Prepend system prompt if provided
    if system_prompt:
        messages = [{'role': 'system', 'content': system_prompt}] + messages
    
    # Generate streaming response
    def generate():
        full_response = ""
        start_time = time.time()
        
        try:
            for chunk in ollama_service.chat(messages, stream=True):
                full_response += chunk
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            
            # Save assistant message
            generation_time = time.time() - start_time
            assistant_msg = Message.objects.create(
                conversation=conversation,
                role='assistant',
                content=full_response,
                generation_time=generation_time
            )
            
            # Update conversation timestamp
            conversation.save()
            
            # Send final event
            yield f"data: {json.dumps({'done': True, 'message_id': assistant_msg.id, 'conversation_id': conversation.id, 'title': conversation.title})}\n\n"
            
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    response = StreamingHttpResponse(
        generate(),
        content_type='text/event-stream'
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response


@api_view(['POST'])
@permission_classes([AllowAny])
def chat_sync(request):
    """
    Synchronous chat endpoint (non-streaming).
    Useful for testing or when streaming is not supported.
    """
    serializer = ChatRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({
            'error': 'Invalid request',
            'details': serializer.errors
        }, status=400)
    
    user_message = serializer.validated_data['message']
    conversation_id = serializer.validated_data.get('conversation_id')
    
    if not ollama_service.is_available():
        return Response({
            'error': 'AI service is temporarily unavailable.'
        }, status=503)
    
    # Get or create conversation
    if conversation_id:
        try:
            if request.user.is_authenticated:
                conversation = Conversation.objects.get(pk=conversation_id, user=request.user)
            else:
                session_id = get_session_id(request)
                conversation = Conversation.objects.get(pk=conversation_id, session_id=session_id)
        except Conversation.DoesNotExist:
            return Response({'error': 'Conversation not found'}, status=404)
    else:
        conversation = Conversation.objects.create(
            user=request.user if request.user.is_authenticated else None,
            session_id=get_session_id(request) if not request.user.is_authenticated else '',
            title='New Chat',
        )
    
    # Save user message
    Message.objects.create(
        conversation=conversation,
        role='user',
        content=user_message
    )
    
    # Generate title for new conversation
    if conversation.messages.count() == 1:
        try:
            title = ollama_service.generate_title(user_message)
            conversation.title = title
            conversation.save()
        except Exception:
            pass
    
    # Get response
    messages = conversation.get_messages_for_context()
    start_time = time.time()
    
    full_response = ""
    for chunk in ollama_service.chat(messages, stream=False):
        full_response += chunk
    
    generation_time = time.time() - start_time
    
    # Save assistant message
    assistant_msg = Message.objects.create(
        conversation=conversation,
        role='assistant',
        content=full_response,
        generation_time=generation_time
    )
    
    conversation.save()
    
    return Response({
        'conversation_id': conversation.id,
        'message_id': assistant_msg.id,
        'response': full_response,
        'title': conversation.title
    })
