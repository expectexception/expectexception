from rest_framework import status, viewsets, mixins
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404
from django.utils.text import get_valid_filename
import os
import tempfile
import logging
import re
import base64

from .models import ImageAnalysis
from .serializers import (
    ImageAnalysisSerializer,
    ImageUploadSerializer,
    AnalysisResultSerializer
)
from .detector import EnsembleDetector, AIDetector, format_results
from .extractor import gather_image_context
from .cache import detection_cache
from io import BytesIO

logger = logging.getLogger(__name__)


# Rate limiting for AI detection endpoints
class AIDetectorAnonThrottle(AnonRateThrottle):
    rate = '10/minute'


class AIDetectorUserThrottle(UserRateThrottle):
    rate = '30/minute'


def sanitize_filename(filename):
    """
    Sanitize filename to prevent path traversal and other security issues
    """
    # Remove any path components
    filename = os.path.basename(filename)
    # Use Django's get_valid_filename for additional sanitization
    filename = get_valid_filename(filename)
    # Remove any remaining problematic characters
    filename = re.sub(r'[^\w\-_\.]', '_', filename)
    # Ensure filename is not empty
    if not filename:
        filename = 'unnamed_image'
    return filename


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AIDetectorAnonThrottle, AIDetectorUserThrottle])
def analyze_image(request):
    """
    Analyze an uploaded image for AI detection.
    
    POST /api/ai-detector/analyze/
    
    Query Parameters:
        sync: If 'true', run synchronously (default: false, returns task ID)
        ensemble: If 'false', use single model (default: true)
    
    Returns:
        Async mode (default): {'task_id': '...', 'status_url': '...'}
        Sync mode: Full analysis results
    """
    serializer = ImageUploadSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    uploaded_file = serializer.validated_data['image']
    filename = sanitize_filename(uploaded_file.name)
    
    # Parse options
    sync_mode = request.query_params.get('sync', 'false').lower() == 'true'
    use_ensemble = request.query_params.get('ensemble', 'true').lower() != 'false'
    
    # For async mode, encode image and dispatch to Celery
    if not sync_mode:
        try:
            from .tasks import analyze_image_task
            
            # Read and encode file
            uploaded_file.seek(0)
            image_data = base64.b64encode(uploaded_file.read()).decode('utf-8')
            
            # Get user ID if authenticated
            user_id = request.user.id if request.user.is_authenticated else None
            
            # Dispatch async task
            task = analyze_image_task.delay(
                image_data=image_data,
                filename=filename,
                user_id=user_id,
                use_ensemble=use_ensemble,
                save_to_db=True,
            )
            
            logger.info(f"Dispatched async analysis task {task.id} for {filename}")
            
            return Response({
                'task_id': task.id,
                'status': 'pending',
                'status_url': request.build_absolute_uri(f'/api/ai-detector/status/{task.id}/'),
                'message': 'Analysis started. Poll the status_url to get results.',
            }, status=status.HTTP_202_ACCEPTED)
            
        except ImportError:
            logger.warning("Celery not available, falling back to sync mode")
            sync_mode = True
        except Exception as e:
            logger.error(f"Failed to dispatch async task: {e}")
            sync_mode = True
    
    # Synchronous mode
    tmp_path = None
    
    try:
        # Save to temporary file for processing
        _, ext = os.path.splitext(filename)
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext or '.tmp') as tmp_file:
            for chunk in uploaded_file.chunks():
                tmp_file.write(chunk)
            tmp_path = tmp_file.name
        
        # Check cache first
        cached_result = detection_cache.get(tmp_path, use_ensemble)
        if cached_result:
            logger.info(f"Cache hit for {filename}")
            cached_result['from_cache'] = True
            return Response(cached_result, status=status.HTTP_200_OK)
        
        # AI Detection with ensemble
        logger.info(f"Analyzing image: {filename} (ensemble={use_ensemble})")
        detector = EnsembleDetector()
        raw_results = detector.detect(tmp_path, use_ensemble=use_ensemble)
        results = format_results(raw_results)
        
        # Run heavy metadata/stats/ELA work in parallel to trim latency
        metadata, stats, ela_image = gather_image_context(tmp_path)
        ela_base64 = None
        if ela_image:
            buffered = BytesIO()
            ela_image.save(buffered, format="PNG")
            ela_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        # Create ImageAnalysis record
        analysis = ImageAnalysis.objects.create(
            user=request.user if request.user.is_authenticated else None,
            filename=filename,
            is_ai_generated=results.get('is_ai', False),
            confidence=results.get('confidence', 0.0),
            metadata={
                'exif': metadata.get('EXIF', {}),
                'properties': {
                    'format': metadata.get('Format'),
                    'dimensions': metadata.get('Dimensions'),
                    'mode': metadata.get('Mode'),
                    'size_bytes': metadata.get('Size'),
                    'creation_date': metadata.get('Creation Date'),
                },
                'stats': stats,
                'detection': {
                    'label': results.get('label'),
                    'ensemble_results': results.get('ensemble_results', []),
                },
                'ela_base64': ela_base64,
            }
        )
        
        # Save the uploaded image to the model
        uploaded_file.seek(0)
        analysis.image.save(filename, uploaded_file, save=True)
        
        # Prepare response
        response_data = {
            'id': analysis.id,
            'filename': analysis.filename,
            'is_ai_generated': analysis.is_ai_generated,
            'confidence': analysis.confidence,
            'label': results.get('label'),
            'ai_probability': results.get('ai_probability', 0.0),
            'real_probability': results.get('real_probability', 0.0),
            'models_used': results.get('models_used', 1),
            'ensemble_results': results.get('ensemble_results', []),
            'image_url': request.build_absolute_uri(analysis.image.url) if analysis.image else None,
            'format': metadata.get('Format'),
            'dimensions': metadata.get('Dimensions'),
            'size_bytes': metadata.get('Size'),
            'exif_data': metadata.get('EXIF', {}),
            'image_stats': stats,
            'ela_base64': ela_base64,
            'created_at': analysis.created_at,
        }
        
        # Cache the result
        detection_cache.set(tmp_path, response_data, use_ensemble)
        
        confidence_val = results.get('confidence', 0) or 0
        logger.info(f"Analysis complete for {filename}: {results.get('label', 'Unknown')} ({confidence_val:.2f}%)")
        
        return Response(response_data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error analyzing image: {str(e)}", exc_info=True)
        return Response(
            {'error': f'Analysis failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception as cleanup_error:
                logger.warning(f"Failed to cleanup temp file {tmp_path}: {cleanup_error}")


@api_view(['GET'])
@permission_classes([AllowAny])
def get_task_status(request, task_id):
    """
    Get the status of an async analysis task.
    
    GET /api/ai-detector/status/{task_id}/
    
    Returns:
        Task status and results if complete
    """
    try:
        from celery.result import AsyncResult
        
        task = AsyncResult(task_id)
        
        if task.state == 'PENDING':
            response = {
                'task_id': task_id,
                'status': 'pending',
                'message': 'Task is waiting to be processed',
            }
        elif task.state == 'PROCESSING':
            response = {
                'task_id': task_id,
                'status': 'processing',
                'step': task.info.get('step', 'unknown') if task.info else 'unknown',
                'message': 'Task is being processed',
            }
        elif task.state == 'SUCCESS':
            result = task.result
            response = {
                'task_id': task_id,
                'status': 'completed',
                'result': result,
            }
        elif task.state == 'FAILURE':
            response = {
                'task_id': task_id,
                'status': 'failed',
                'error': str(task.result) if task.result else 'Unknown error',
            }
        elif task.state == 'REVOKED':
            response = {
                'task_id': task_id,
                'status': 'cancelled',
                'message': 'Task was cancelled',
            }
        else:
            response = {
                'task_id': task_id,
                'status': task.state.lower(),
            }
        
        return Response(response)
        
    except ImportError:
        return Response(
            {'error': 'Async processing not available'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except Exception as e:
        logger.error(f"Error getting task status: {e}")
        return Response(
            {'error': f'Failed to get task status: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint for the AI detector service.
    
    GET /api/ai-detector/health/
    
    Returns:
        Service health status and model availability
    """
    try:
        detector = EnsembleDetector()
        model_status = detector.get_model_status()
        
        # Check if at least one model is ready
        is_healthy = model_status.get('ready', False)
        
        # Check cache status
        cache_stats = detection_cache.get_stats()
        
        response = {
            'status': 'healthy' if is_healthy else 'degraded',
            'models': model_status,
            'cache': cache_stats,
        }
        
        # Check Celery connectivity
        try:
            from .tasks import health_check_task
            # Just check if we can import tasks
            response['async'] = {'available': True}
        except ImportError:
            response['async'] = {'available': False}
        
        status_code = status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(response, status=status_code)
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return Response(
            {'status': 'unhealthy', 'error': str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def model_status(request):
    """
    Get detailed status of all detection models.
    
    GET /api/ai-detector/models/
    """
    try:
        detector = EnsembleDetector()
        status_info = detector.get_model_status()
        
        return Response({
            'device': status_info.get('device', 'unknown'),
            'models': status_info.get('models', {}),
            'ready': status_info.get('ready', False),
        })
        
    except Exception as e:
        logger.error(f"Failed to get model status: {e}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def preload_models(request):
    """
    Trigger model preloading (admin only).
    
    POST /api/ai-detector/models/preload/
    """
    # Check if user is staff
    if not request.user.is_staff:
        return Response(
            {'error': 'Admin access required'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # Try async first
        from .tasks import preload_models_task
        task = preload_models_task.delay()
        return Response({
            'message': 'Model preloading started',
            'task_id': task.id,
        }, status=status.HTTP_202_ACCEPTED)
        
    except ImportError:
        # Fallback to sync
        from .detector import get_detection_models
        detector = EnsembleDetector()
        models = get_detection_models()
        results = detector.model_manager.preload_models(models)
        
        return Response({
            'message': 'Models preloaded synchronously',
            'results': results,
        })


class AnalysisHistoryPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class AnalysisHistoryViewSet(mixins.RetrieveModelMixin,
                             mixins.ListModelMixin,
                             mixins.DestroyModelMixin,
                             viewsets.GenericViewSet):
    """
    ViewSet for retrieving and deleting analysis history
    
    GET /api/ai-detector/history/
    GET /api/ai-detector/history/{id}/
    DELETE /api/ai-detector/history/{id}/
    """
    serializer_class = ImageAnalysisSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = AnalysisHistoryPagination
    
    def get_queryset(self):
        """Only return analyses for the authenticated user"""
        return ImageAnalysis.objects.filter(user=self.request.user)
    
    def retrieve(self, request, *args, **kwargs):
        """Get detailed analysis result"""
        instance = self.get_object()
        
        # Build detailed response
        metadata = instance.metadata or {}
        response_data = {
            'id': instance.id,
            'filename': instance.filename,
            'is_ai_generated': instance.is_ai_generated,
            'confidence': instance.confidence,
            'label': metadata.get('detection', {}).get('label', ''),
            'ensemble_results': metadata.get('detection', {}).get('ensemble_results', []),
            'image_url': request.build_absolute_uri(instance.image.url) if instance.image else None,
            'format': metadata.get('properties', {}).get('format'),
            'dimensions': metadata.get('properties', {}).get('dimensions'),
            'size_bytes': metadata.get('properties', {}).get('size_bytes'),
            'exif_data': metadata.get('exif', {}),
            'image_stats': metadata.get('stats', {}),
            'ela_base64': metadata.get('ela_base64'),
            'created_at': instance.created_at,
        }
        
        return Response(response_data)
