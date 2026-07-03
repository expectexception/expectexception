from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class AiDetectorConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ai_detector'
    verbose_name = 'AI Image Detector'
    
    def ready(self):
        """Preload detection models on Django startup (only if transformers is installed)."""
        try:
            from .detector import _HAS_TRANSFORMERS, EnsembleDetector, get_detection_models
            if not _HAS_TRANSFORMERS:
                logger.info("AI Detector: transformers package not installed — running without detection models.")
                return
            logger.info("AI Detector: Preloading detection models...")
            detector = EnsembleDetector()
            models = get_detection_models()
            for model_config in models:
                if model_config.enabled:
                    logger.info(f"AI Detector: Loading {model_config.name}...")
                    detector.model_manager.get_model(model_config.name)
            logger.info(f"AI Detector: Preloaded {len([m for m in models if m.enabled])} models")
        except Exception as e:
            logger.warning(f"AI Detector: startup preload failed: {e}")
