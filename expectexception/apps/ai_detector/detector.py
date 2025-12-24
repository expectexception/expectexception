"""
AI Image Detector Module - Enhanced with Ensemble Detection
Supports multiple models for improved accuracy and performance optimization.
"""
from transformers import pipeline
import torch
from PIL import Image
import os
import logging
import threading
import hashlib
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

logger = logging.getLogger(__name__)


@dataclass
class ModelConfig:
    """Configuration for a detection model"""
    name: str
    weight: float = 1.0
    priority: int = 1
    enabled: bool = True
    max_image_size: int = 512


# Ensemble models configuration - can be overridden via Django settings
DEFAULT_DETECTION_MODELS = [
    ModelConfig(
        name="umm-maybe/AI-image-detector",
        weight=1.0,
        priority=1,
        enabled=True,
        max_image_size=512
    ),
    ModelConfig(
        name="Organika/sdxl-detector",
        weight=0.8,
        priority=2,
        enabled=True,
        max_image_size=384
    ),
]


def get_detection_models() -> List[ModelConfig]:
    """Get detection models from Django settings or use defaults"""
    try:
        from django.conf import settings
        models_config = getattr(settings, 'AI_DETECTOR_MODELS', None)
        if models_config:
            return [ModelConfig(**m) for m in models_config]
    except Exception:
        pass
    return DEFAULT_DETECTION_MODELS


class ModelManager:
    """
    Manages lazy loading and caching of detection models.
    Thread-safe singleton pattern for efficient resource usage.
    """
    _instance = None
    _lock = threading.Lock()
    _models: Dict[str, Any] = {}
    _model_status: Dict[str, str] = {}
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(ModelManager, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if ModelManager._initialized:
            return
        with ModelManager._lock:
            if ModelManager._initialized:
                return
            self._device = 0 if torch.cuda.is_available() else -1
            self._device_name = "cuda" if torch.cuda.is_available() else "cpu"
            ModelManager._initialized = True
            logger.info(f"ModelManager initialized on {self._device_name}")
    
    def get_model(self, model_name: str) -> Optional[Any]:
        """Get a model, loading it if necessary"""
        if model_name in self._models:
            return self._models[model_name]
        
        with self._lock:
            # Double-check after acquiring lock
            if model_name in self._models:
                return self._models[model_name]
            
            self._model_status[model_name] = "loading"
            logger.info(f"Loading model: {model_name}")
            
            try:
                start_time = time.time()
                pipe = pipeline(
                    "image-classification",
                    model=model_name,
                    device=self._device
                )
                self._models[model_name] = pipe
                self._model_status[model_name] = "ready"
                load_time = time.time() - start_time
                logger.info(f"Model {model_name} loaded in {load_time:.2f}s")
                return pipe
            except Exception as e:
                self._model_status[model_name] = f"error: {str(e)}"
                logger.error(f"Failed to load model {model_name}: {e}")
                return None
    
    def get_status(self) -> Dict[str, str]:
        """Get status of all models"""
        return dict(self._model_status)
    
    def preload_models(self, models: List[ModelConfig]) -> Dict[str, bool]:
        """Preload all enabled models"""
        results = {}
        for model in models:
            if model.enabled:
                success = self.get_model(model.name) is not None
                results[model.name] = success
        return results
    
    def is_ready(self) -> bool:
        """Check if at least one model is ready"""
        return any(status == "ready" for status in self._model_status.values())
    
    def cleanup(self):
        """Clean up GPU memory"""
        with self._lock:
            for model_name in list(self._models.keys()):
                del self._models[model_name]
            self._models.clear()
            self._model_status.clear()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            logger.info("ModelManager: Cleaned up all models")


def preprocess_image(image_path: str, max_size: int = 512) -> Image.Image:
    """
    Optimize image for fast inference while preserving detection accuracy.
    Uses memory-efficient loading techniques for large images.
    """
    try:
        img = Image.open(image_path)
        
        # Use draft mode for very large images to reduce memory during loading
        if max(img.size) > max_size * 2:
            img.draft(img.mode, (max_size, max_size))
            img = img.copy()  # Materialize the draft
        
        # Resize maintaining aspect ratio if larger than max_size
        if max(img.size) > max_size:
            img.thumbnail((max_size, max_size), Image.LANCZOS)
        
        return img.convert("RGB")
    except Exception as e:
        logger.error(f"Image preprocessing failed: {e}")
        # Fallback to simple load
        return Image.open(image_path).convert("RGB")


def compute_image_hash(image_path: str) -> str:
    """Compute a hash for caching purposes"""
    hasher = hashlib.md5()
    with open(image_path, 'rb') as f:
        # Read in chunks to handle large files
        for chunk in iter(lambda: f.read(8192), b''):
            hasher.update(chunk)
    return hasher.hexdigest()


class EnsembleDetector:
    """
    Ensemble AI Image Detector using multiple HuggingFace models.
    Combines predictions from multiple models for improved accuracy.
    """
    
    def __init__(self, models: Optional[List[ModelConfig]] = None):
        self.models = models or get_detection_models()
        self.model_manager = ModelManager()
    
    def detect_single_model(
        self, 
        image: Image.Image, 
        model_config: ModelConfig
    ) -> Optional[Dict[str, Any]]:
        """Run detection with a single model"""
        pipe = self.model_manager.get_model(model_config.name)
        if pipe is None:
            return None
        
        try:
            # Resize if needed for this specific model
            img = image.copy()
            max_size = model_config.max_image_size
            if max(img.size) > max_size:
                img.thumbnail((max_size, max_size), Image.LANCZOS)
            
            results = pipe(img)
            return {
                "model": model_config.name,
                "weight": model_config.weight,
                "results": results
            }
        except Exception as e:
            logger.error(f"Detection failed for {model_config.name}: {e}")
            return None
    
    def detect(self, image_path: str, use_ensemble: bool = True) -> Dict[str, Any]:
        """
        Detect if an image is AI-generated using ensemble of models.
        
        Args:
            image_path: Path to the image file
            use_ensemble: If False, only use the primary model
            
        Returns:
            Dict with detection results including ensemble scores
        """
        if not os.path.exists(image_path):
            return {"error": f"File not found: {image_path}"}
        
        try:
            # Preprocess image once for all models
            image = preprocess_image(image_path)
            
            # Get enabled models
            enabled_models = [m for m in self.models if m.enabled]
            if not enabled_models:
                return {"error": "No detection models configured"}
            
            # If not using ensemble, only use primary (highest priority)
            if not use_ensemble:
                enabled_models = [min(enabled_models, key=lambda x: x.priority)]
            
            # Run detection with each model
            model_results = []
            for model_config in enabled_models:
                result = self.detect_single_model(image, model_config)
                if result:
                    model_results.append(result)
            
            if not model_results:
                return {"error": "All detection models failed"}
            
            return self._combine_results(model_results)
            
        except Exception as e:
            logger.error(f"Ensemble detection failed: {e}")
            return {"error": f"Detection failed: {str(e)}"}
    
    def _combine_results(self, model_results: List[Dict]) -> Dict[str, Any]:
        """
        Combine results from multiple models using weighted voting.
        """
        # Calculate weighted scores for AI vs Real
        ai_score = 0.0
        real_score = 0.0
        total_weight = 0.0
        
        individual_results = []
        
        for result in model_results:
            model_name = result["model"]
            weight = result["weight"]
            predictions = result["results"]
            
            # Find AI and Real scores
            model_ai_score = 0.0
            model_real_score = 0.0
            
            for pred in predictions:
                label = pred["label"].lower()
                score = pred["score"]
                
                # Classify label as AI or Real
                ai_keywords = ["artificial", "ai", "generated", "fake", "synthetic"]
                if any(kw in label for kw in ai_keywords):
                    model_ai_score = max(model_ai_score, score)
                else:
                    model_real_score = max(model_real_score, score)
            
            # Apply weight
            ai_score += model_ai_score * weight
            real_score += model_real_score * weight
            total_weight += weight
            
            individual_results.append({
                "model": model_name,
                "weight": weight,
                "ai_score": round(model_ai_score * 100, 2),
                "real_score": round(model_real_score * 100, 2),
                "raw_predictions": predictions
            })
        
        # Normalize scores
        if total_weight > 0:
            ai_score /= total_weight
            real_score /= total_weight
        
        # Determine final prediction
        is_ai = ai_score > real_score
        confidence = max(ai_score, real_score) * 100
        
        return {
            "is_ai": is_ai,
            "label": "AI Generated" if is_ai else "Real/Human",
            "confidence": round(confidence, 2),
            "ai_probability": round(ai_score * 100, 2),
            "real_probability": round(real_score * 100, 2),
            "models_used": len(model_results),
            "ensemble_results": individual_results
        }
    
    def get_model_status(self) -> Dict[str, Any]:
        """Get status of all detection models"""
        return {
            "device": self.model_manager._device_name,
            "models": self.model_manager.get_status(),
            "ready": self.model_manager.is_ready()
        }


# Backwards compatibility - single model detector
class AIDetector:
    """
    Single model AI Image Detector - for backwards compatibility.
    Use EnsembleDetector for improved accuracy.
    """
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(AIDetector, cls).__new__(cls)
                    cls._instance._ensemble = EnsembleDetector()
        return cls._instance
    
    def detect(self, image_path: str) -> Union[List[Dict], Dict]:
        """Detect using primary model only for backwards compatibility"""
        result = self._ensemble.detect(image_path, use_ensemble=False)
        
        if "error" in result:
            return result
        
        # Return in legacy format
        ensemble_res = result.get("ensemble_results", [])
        if ensemble_res:
            return ensemble_res[0].get("raw_predictions", [])
        return []


def format_results(results: Union[List, Dict]) -> Dict[str, Any]:
    """
    Format the raw detection results into a standardized format.
    Supports both legacy single-model and new ensemble results.
    """
    # Handle ensemble results directly
    if isinstance(results, dict):
        if "error" in results:
            return {
                "error": results["error"],
                "is_ai": False,
                "label": "Error",
                "confidence": 0,
                "all_scores": []
            }
        if "ensemble_results" in results:
            # Already formatted ensemble results
            return results
    
    # Handle legacy list format
    if isinstance(results, list) and results:
        try:
            sorted_results = sorted(results, key=lambda x: x['score'], reverse=True)
            top_prediction = sorted_results[0]
            
            label = top_prediction['label']
            confidence = top_prediction['score'] * 100
            
            ai_keywords = ["artificial", "ai", "generated", "fake", "synthetic"]
            is_ai = any(kw in label.lower() for kw in ai_keywords)
            
            return {
                "is_ai": is_ai,
                "label": label,
                "confidence": confidence,
                "all_scores": sorted_results
            }
        except Exception as e:
            logger.error(f"Formatting failed: {str(e)}")
    
    return {
        "error": "Failed to format results",
        "is_ai": False,
        "label": "Error",
        "confidence": 0,
        "all_scores": []
    }
