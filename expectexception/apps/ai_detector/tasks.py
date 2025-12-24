"""
Celery tasks for async AI image detection.
Provides non-blocking image analysis with task queuing and result caching.
"""
import os
import tempfile
import logging
import base64
from io import BytesIO
from typing import Dict, Any, Optional
from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    name='ai_detector.analyze_image',
    queue='ai_detection',
    soft_time_limit=300,  # 5 minutes soft limit
    time_limit=360,       # 6 minutes hard limit
    max_retries=2,
    default_retry_delay=30,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=120,
)
def analyze_image_task(
    self,
    image_data: str,
    filename: str,
    user_id: Optional[int] = None,
    use_ensemble: bool = True,
    save_to_db: bool = True,
) -> Dict[str, Any]:
    """
    Async task to analyze an image for AI detection.
    
    Args:
        image_data: Base64 encoded image data
        filename: Original filename
        user_id: Optional user ID for saving to database
        use_ensemble: Whether to use ensemble detection
        save_to_db: Whether to save results to database
        
    Returns:
        Dict with detection results
    """
    from .detector import EnsembleDetector, format_results
    from .extractor import extract_metadata, get_image_stats, perform_ela
    from .cache import detection_cache
    
    tmp_path = None
    
    try:
        # Decode base64 image data
        image_bytes = base64.b64decode(image_data)
        
        # Get file extension from filename
        _, ext = os.path.splitext(filename)
        ext = ext or '.jpg'
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp_file:
            tmp_file.write(image_bytes)
            tmp_path = tmp_file.name
        
        # Check cache first
        cached_result = detection_cache.get(tmp_path, use_ensemble)
        if cached_result:
            logger.info(f"Task {self.request.id}: Cache hit for {filename}")
            return cached_result
        
        # Update task state
        self.update_state(state='PROCESSING', meta={'step': 'detection'})
        
        # Run AI Detection
        logger.info(f"Task {self.request.id}: Analyzing {filename}")
        detector = EnsembleDetector()
        raw_results = detector.detect(tmp_path, use_ensemble=use_ensemble)
        results = format_results(raw_results)
        
        # Update task state
        self.update_state(state='PROCESSING', meta={'step': 'metadata'})
        
        # Extract metadata
        metadata = extract_metadata(tmp_path)
        
        # Get image stats
        stats = get_image_stats(tmp_path)
        
        # Perform ELA
        self.update_state(state='PROCESSING', meta={'step': 'ela'})
        ela_image = perform_ela(tmp_path, quality=90)
        ela_base64 = None
        if ela_image:
            buffered = BytesIO()
            ela_image.save(buffered, format="PNG")
            ela_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        # Prepare response
        response_data = {
            'task_id': self.request.id,
            'filename': filename,
            'is_ai_generated': results.get('is_ai', False),
            'confidence': results.get('confidence', 0.0),
            'label': results.get('label', 'Unknown'),
            'ai_probability': results.get('ai_probability', 0.0),
            'real_probability': results.get('real_probability', 0.0),
            'models_used': results.get('models_used', 1),
            'ensemble_results': results.get('ensemble_results', []),
            'format': metadata.get('Format'),
            'dimensions': metadata.get('Dimensions'),
            'size_bytes': metadata.get('Size'),
            'exif_data': metadata.get('EXIF', {}),
            'image_stats': stats,
            'ela_base64': ela_base64,
        }
        
        # Save to database if requested
        if save_to_db:
            self.update_state(state='PROCESSING', meta={'step': 'saving'})
            try:
                from .models import ImageAnalysis
                from django.contrib.auth import get_user_model
                
                User = get_user_model()
                user = None
                if user_id:
                    try:
                        user = User.objects.get(id=user_id)
                    except User.DoesNotExist:
                        pass
                
                analysis = ImageAnalysis.objects.create(
                    user=user,
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
                        },
                        'stats': stats,
                        'detection': {
                            'label': results.get('label'),
                            'ensemble_results': results.get('ensemble_results', []),
                        },
                        'ela_base64': ela_base64,
                    }
                )
                response_data['analysis_id'] = analysis.id
                
            except Exception as db_error:
                logger.error(f"Failed to save to database: {db_error}")
                response_data['db_error'] = str(db_error)
        
        # Cache the result
        detection_cache.set(tmp_path, response_data, use_ensemble)
        
        logger.info(f"Task {self.request.id}: Analysis complete for {filename}")
        return response_data
        
    except SoftTimeLimitExceeded:
        logger.error(f"Task {self.request.id}: Time limit exceeded for {filename}")
        return {
            'error': 'Analysis timed out. The image may be too large or complex.',
            'task_id': self.request.id,
            'filename': filename,
        }
        
    except Exception as e:
        logger.error(f"Task {self.request.id}: Error analyzing {filename}: {e}", exc_info=True)
        raise  # Let Celery handle retry
        
    finally:
        # Cleanup temporary file
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception as cleanup_error:
                logger.warning(f"Failed to cleanup temp file: {cleanup_error}")


@shared_task(
    name='ai_detector.preload_models',
    queue='ai_detection',
    soft_time_limit=600,  # 10 minutes
)
def preload_models_task() -> Dict[str, Any]:
    """
    Preload all detection models on worker startup.
    This ensures fast response times for the first requests.
    """
    from .detector import EnsembleDetector, get_detection_models
    
    logger.info("Preloading AI detection models...")
    
    try:
        detector = EnsembleDetector()
        models = get_detection_models()
        results = detector.model_manager.preload_models(models)
        
        loaded = sum(1 for v in results.values() if v)
        total = len(results)
        
        logger.info(f"Preloaded {loaded}/{total} models successfully")
        
        return {
            'success': True,
            'loaded': loaded,
            'total': total,
            'results': results
        }
        
    except Exception as e:
        logger.error(f"Failed to preload models: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@shared_task(
    name='ai_detector.cleanup_old_analyses',
    queue='default',
)
def cleanup_old_analyses_task(days_old: int = 30) -> Dict[str, Any]:
    """
    Clean up old image analyses and their associated files.
    
    Args:
        days_old: Delete analyses older than this many days
    """
    from datetime import timedelta
    from django.utils import timezone
    from .models import ImageAnalysis
    
    try:
        cutoff_date = timezone.now() - timedelta(days=days_old)
        old_analyses = ImageAnalysis.objects.filter(created_at__lt=cutoff_date)
        
        count = old_analyses.count()
        
        # Delete associated image files
        for analysis in old_analyses.iterator():
            if analysis.image:
                try:
                    analysis.image.delete(save=False)
                except Exception:
                    pass
        
        # Delete database records
        old_analyses.delete()
        
        logger.info(f"Cleaned up {count} old analyses (older than {days_old} days)")
        
        return {
            'success': True,
            'deleted': count,
            'days_old': days_old
        }
        
    except Exception as e:
        logger.error(f"Cleanup failed: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@shared_task(
    name='ai_detector.health_check',
    queue='ai_detection',
)
def health_check_task() -> Dict[str, Any]:
    """
    Health check task to verify detection system is working.
    """
    from .detector import EnsembleDetector
    
    try:
        detector = EnsembleDetector()
        status = detector.get_model_status()
        
        return {
            'healthy': status.get('ready', False),
            'status': status
        }
        
    except Exception as e:
        return {
            'healthy': False,
            'error': str(e)
        }
