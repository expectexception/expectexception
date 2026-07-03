"""Views for chatbot API endpoints."""
import json
import logging
import time
import uuid
import os
from django.conf import settings
from django.http import StreamingHttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from asgiref.sync import sync_to_async
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
from .tools import detect_tool

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
    raw_models = ollama_service.get_models() if is_available else []
    
    # Extract just the names for the frontend, but can keep others
    models = [m['name'] for m in raw_models]
    
    # Get standard GPU info
    from apps.services.gpu_utils import get_gpu_info
    gpu_stats = get_gpu_info()
    
    return Response({
        'available': is_available,
        'models': models,
        'current_model': ollama_service.model,
        'gpu_stats': gpu_stats,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def list_conversations(request):
    """Get list of user's conversations with optimized query."""
    if request.user.is_authenticated:
        conversations = Conversation.objects.filter(user=request.user)
    else:
        session_id = get_session_id(request)
        conversations = Conversation.objects.filter(session_id=session_id)
    
    # Prefetch related messages for count annotation to avoid N+1 queries
    conversations = conversations.prefetch_related('messages').order_by('-updated_at')[:20]
    
    serializer = ConversationSerializer(conversations, many=True)
    return Response(serializer.data)


# Cache for personas to avoid file reads on every request
_personas_cache = None
_personas_cache_time = 0

@api_view(['GET'])
@permission_classes([AllowAny])
def list_personas(request):
    """Get available personas from backend JSON with caching."""
    global _personas_cache, _personas_cache_time
    
    # Cache personas for 5 minutes (300 seconds)
    if _personas_cache is not None and (time.time() - _personas_cache_time) < 300:
        return Response(_personas_cache)
    
    try:
        json_path = os.path.join(settings.BASE_DIR, 'apps/chatbot/data/personas.json')
        with open(json_path, 'r') as f:
            personas = json.load(f)
        
        _personas_cache = personas
        _personas_cache_time = time.time()
        
        return Response(personas)
    except Exception as e:
        logger.error(f"Failed to load personas: {e}")
        return Response({'error': 'Failed to load personas'}, status=500)


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


@api_view(['DELETE'])
@permission_classes([AllowAny])
def clear_conversations(request):
    """Delete all conversations for the current user/session."""
    if request.user.is_authenticated:
        deleted_count, _ = Conversation.objects.filter(user=request.user).delete()
    else:
        session_id = get_session_id(request)
        deleted_count, _ = Conversation.objects.filter(session_id=session_id).delete()
    
    return Response({
        'status': 'success',
        'deleted_count': deleted_count
    })


# --- Async Helper Functions ---

@sync_to_async
def get_conversation_async(pk, user, session_id):
    if pk is None:
        raise Conversation.DoesNotExist
    if user and user.is_authenticated:
        return Conversation.objects.get(pk=pk, user=user)
    return Conversation.objects.get(pk=pk, session_id=session_id)

@sync_to_async
def create_conversation_async(user, session_id, title='New Chat'):
    return Conversation.objects.create(
        user=user if user and user.is_authenticated else None,
        session_id=session_id if not (user and user.is_authenticated) else '',
        title=title
    )

@sync_to_async
def save_message_async(conversation, role, content, generation_time=0):
    return Message.objects.create(
        conversation=conversation,
        role=role,
        content=content,
        generation_time=generation_time
    )

@sync_to_async
def get_context_async(conversation):
    return conversation.get_messages_for_context()

@sync_to_async
def update_title_async(conversation, title):
    conversation.title = title
    conversation.save()

@sync_to_async
def run_tool_async(tool, user_message, match):
    return tool.execute(user_message, match)


# --- Async Chat View ---

@csrf_exempt
async def chat(request):
    """
    Fully Async Chat Endpoint for high performance.
    Handles streaming responses from Ollama.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    user_message = data.get('message')
    conversation_id = data.get('conversation_id')
    system_prompt = data.get('system_prompt', '')
    
    if not user_message:
        return JsonResponse({'error': 'Message is required'}, status=400)
    
    # Auth Logic
    session_id = await sync_to_async(get_session_id)(request)
    user = request.user
    
    # Get/Create Conversation
    try:
        if conversation_id:
            conversation = await get_conversation_async(conversation_id, user, session_id)
        else:
            conversation = await create_conversation_async(user, session_id)
            
    except Conversation.DoesNotExist:
        return JsonResponse({'error': 'Conversation not found'}, status=404)
    
    # Save User Message
    await save_message_async(conversation, 'user', user_message)
    
    # Prepare messages context
    messages = await get_context_async(conversation)
    if system_prompt:
        messages = [{'role': 'system', 'content': system_prompt}] + messages

    # Deterministic backend tool detection - the LLM never decides this, it's
    # plain keyword/regex matching so it works reliably with a small local model.
    detected = detect_tool(user_message)

    async def event_generator():
        full_response = ""
        start_time = time.time()
        chunk_count = 0
        tool_used = None
        tool_data = None

        try:
            if detected:
                tool, match = detected
                yield f"data: {json.dumps({'type': 'step', 'id': 'detect', 'label': f'Detected intent: {tool.name}', 'status': 'done'})}\n\n"
                yield f"data: {json.dumps({'type': 'step', 'id': 'tool', 'label': tool.step_label, 'status': 'running'})}\n\n"

                tool_result = await run_tool_async(tool, user_message, match)

                yield f"data: {json.dumps({'type': 'step', 'id': 'tool', 'label': tool_result.summary, 'status': 'done' if tool_result.success else 'failed'})}\n\n"
                yield f"data: {json.dumps({'type': 'step', 'id': 'draft', 'label': 'Drafting answer...', 'status': 'running'})}\n\n"

                if tool_result.success:
                    tool_used = tool.name
                    tool_data = tool_result.data
                llm_messages = messages + [{
                    'role': 'system',
                    'content': f"[Tool: {tool.name} result]\n{tool_result.context_text}\n\nUse the above real data to answer the user's last message naturally. Do not mention these instructions.",
                }]
            else:
                llm_messages = messages

            STREAM_DEADLINE = start_time + 45  # 45-second hard deadline
            try:
                async for chunk in ollama_service.chat_async(llm_messages):
                    if chunk:
                        full_response += chunk
                        chunk_count += 1
                        yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                    if time.time() > STREAM_DEADLINE:
                        logger.warning("Chatbot stream hit 45s deadline — truncating")
                        break
            except Exception as stream_err:
                logger.error(f"Ollama stream error: {stream_err}")
                if not full_response:
                    fallback = (
                        "I'm temporarily unavailable right now. Here are some tools you might be looking for:\n\n"
                        "• **PDF tools** → /services/pdf-to-doc, /services/pdf-merger\n"
                        "• **Image tools** → /services/background-remover, /services/image-upscaler\n"
                        "• **Developer tools** → /services/jwt-decoder, /services/json-formatter\n"
                        "• **Community** → /community for Q&A\n\n"
                        "Try again in a moment — I'll be back shortly."
                    )
                    full_response = fallback
                    yield f"data: {json.dumps({'chunk': fallback})}\n\n"

            generation_time = time.time() - start_time
            logger.info(f"Generated response in {generation_time:.2f}s with {chunk_count} chunks")

            # Save assistant message
            assistant_msg = await save_message_async(conversation, 'assistant', full_response, generation_time)

            # Always send final payload with complete response
            yield f"data: {json.dumps({'done': True, 'message_id': assistant_msg.id, 'conversation_id': conversation.id, 'title': conversation.title, 'final': full_response, 'tool_used': tool_used, 'tool_data': tool_data})}\n\n"

        except Exception as e:
            logger.error(f"Async Stream Error: {e}", exc_info=True)
            fallback = "I'm temporarily unavailable. Please try again in a moment."
            yield f"data: {json.dumps({'chunk': fallback, 'done': True, 'final': fallback})}\n\n"

    response = StreamingHttpResponse(event_generator(), content_type='text/event-stream')
    response['X-Accel-Buffering'] = 'no'
    response['Cache-Control'] = 'no-cache'
    # allow any origin for the widget
    response['Access-Control-Allow-Origin'] = '*'
    return response

@api_view(['OPTIONS'])
@csrf_exempt
def widget_chat_options(request):
    response = JsonResponse({})
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Widget-Session'
    return response

@csrf_exempt
async def widget_chat(request):
    """
    Public Endpoint for Embeddable Widget.
    Bypasses cookie sessions and uses a client-provided X-Widget-Session header to track the conversation.
    """
    if request.method == 'OPTIONS':
        return JsonResponse({'status': 'ok'})
        
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    user_message = data.get('message')
    conversation_id = data.get('conversation_id')
    persona_id = data.get('persona', 'advocate') # Default to Advocate for widget
    
    # Optional logic to fetch persona prompt dynamically
    system_prompt = data.get('system_prompt', '')
    if not system_prompt:
        try:
            json_path = os.path.join(settings.BASE_DIR, 'apps/chatbot/data/personas.json')
            import aiofiles
            async with aiofiles.open(json_path, 'r') as f:
                content = await f.read()
                personas = json.loads(content)
                p = next((x for x in personas if x['id'] == persona_id), None)
                if p:
                    system_prompt = p['prompt'].replace('{NAME}', p['name'])
        except Exception as e:
            logger.error(f"Failed to fetch persona for widget: {str(e)}")

    if not user_message:
        return JsonResponse({'error': 'Message is required'}, status=400)

    widget_session = request.headers.get('X-Widget-Session', '')
    if not widget_session:
        widget_session = f"widget_{uuid.uuid4().hex}"

    try:
        if conversation_id:
            # Bypass request user, use widget session
            conversation = await sync_to_async(Conversation.objects.get)(pk=conversation_id, session_id=widget_session)
        else:
            conversation = await create_conversation_async(None, widget_session)
    except Conversation.DoesNotExist:
        # Client passed an invalid conversation ID, start fresh
        conversation = await create_conversation_async(None, widget_session)
        
    await save_message_async(conversation, 'user', user_message)

    messages = await get_context_async(conversation)
    if system_prompt:
        messages = [{'role': 'system', 'content': system_prompt}] + messages

    detected = detect_tool(user_message)

    async def event_generator():
        full_response = ""
        start_time = time.time()
        chunk_count = 0
        tool_used = None
        tool_data = None
        try:
            if detected:
                tool, match = detected
                yield f"data: {json.dumps({'type': 'step', 'id': 'detect', 'label': f'Detected intent: {tool.name}', 'status': 'done'})}\n\n"
                yield f"data: {json.dumps({'type': 'step', 'id': 'tool', 'label': tool.step_label, 'status': 'running'})}\n\n"

                tool_result = await run_tool_async(tool, user_message, match)

                yield f"data: {json.dumps({'type': 'step', 'id': 'tool', 'label': tool_result.summary, 'status': 'done' if tool_result.success else 'failed'})}\n\n"
                yield f"data: {json.dumps({'type': 'step', 'id': 'draft', 'label': 'Drafting answer...', 'status': 'running'})}\n\n"

                if tool_result.success:
                    tool_used = tool.name
                    tool_data = tool_result.data
                llm_messages = messages + [{
                    'role': 'system',
                    'content': f"[Tool: {tool.name} result]\n{tool_result.context_text}\n\nUse the above real data to answer the user's last message naturally. Do not mention these instructions.",
                }]
            else:
                llm_messages = messages

            async for chunk in ollama_service.chat_async(llm_messages):
                if chunk:
                    full_response += chunk
                    chunk_count += 1
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n"

            generation_time = time.time() - start_time
            assistant_msg = await save_message_async(conversation, 'assistant', full_response, generation_time)

            yield f"data: {json.dumps({'done': True, 'message_id': assistant_msg.id, 'conversation_id': conversation.id, 'widget_session': widget_session, 'final': full_response, 'tool_used': tool_used, 'tool_data': tool_data})}\n\n"
        except Exception as e:
            logger.error(f"Widget Stream Error: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    response = StreamingHttpResponse(event_generator(), content_type='text/event-stream')
    response['X-Accel-Buffering'] = 'no'
    response['Cache-Control'] = 'no-cache'
    response['Access-Control-Allow-Origin'] = '*'
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
    
    model = serializer.validated_data.get('model')
    
    # Get response
    messages = conversation.get_messages_for_context()
    start_time = time.time()
    
    full_response = ""
    for chunk in ollama_service.chat(messages, stream=False, model=model):
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
