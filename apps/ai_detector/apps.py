from django.apps import AppConfig
import logging
import os
import sys

logger = logging.getLogger(__name__)


class AiDetectorConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ai_detector'
    verbose_name = 'AI Image Detector'

    def ready(self):
        """Preload detection models on startup — but only in the Celery
        worker that actually consumes the ai_detection queue.

        get_model() lazily loads on first use regardless (see detector.py),
        so preloading here is purely a warm-cache optimization — it must
        NOT run in gunicorn's web workers. Django's app registry (and this
        ready() hook) initializes in every process that imports the app,
        including gunicorn — preloading there means each of the 9 web
        workers redundantly downloads/loads these models from HuggingFace
        *before gunicorn can bind its port*, turning every restart into a
        multi-minute outage of the whole site, not just AI features.
        Confirmed live: this blocked port 8000 from accepting connections
        for minutes after enabling transformers/torch. -Q<queue list> is
        how docker-compose distinguishes worker-heavy (has ai_detection)
        from worker-light/beat/gunicorn (don't).
        """
        argv = ' '.join(sys.argv)
        is_ai_detection_worker = (
            os.path.basename(sys.argv[0] if sys.argv else '') == 'celery'
            and 'worker' in sys.argv
            and 'ai_detection' in argv
        )
        if not is_ai_detection_worker:
            return
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
