"""
Result caching for AI Image Detector using Redis.
Uses image hash for cache key to avoid redundant processing.
"""
import hashlib
import json
import logging
from typing import Optional, Dict, Any
from functools import wraps

logger = logging.getLogger(__name__)

# Try to import Redis, graceful fallback if not available
try:
    from django.core.cache import cache
    from django.conf import settings
    CACHE_AVAILABLE = True
except ImportError:
    CACHE_AVAILABLE = False
    logger.warning("Django cache not available, caching disabled")


# Default cache TTL (24 hours)
DEFAULT_CACHE_TTL = 60 * 60 * 24


def get_cache_ttl() -> int:
    """Get cache TTL from settings or use default"""
    try:
        from django.conf import settings
        return getattr(settings, 'AI_DETECTOR_CACHE_TTL', DEFAULT_CACHE_TTL)
    except Exception:
        return DEFAULT_CACHE_TTL


def compute_file_hash(file_path: str) -> str:
    """
    Compute MD5 hash of a file for cache key.
    Uses chunked reading for memory efficiency with large files.
    """
    hasher = hashlib.md5()
    try:
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(65536), b''):
                hasher.update(chunk)
        return hasher.hexdigest()
    except Exception as e:
        logger.error(f"Error computing file hash: {e}")
        return ""


def get_cache_key(image_hash: str, use_ensemble: bool = True) -> str:
    """Generate cache key for detection results"""
    mode = "ensemble" if use_ensemble else "single"
    return f"ai_detector:{mode}:{image_hash}"


class DetectionCache:
    """
    Cache manager for AI detection results.
    Uses Django's cache backend (Redis recommended for production).
    """
    
    def __init__(self):
        self.enabled = CACHE_AVAILABLE
        self.ttl = get_cache_ttl()
    
    def get(self, image_path: str, use_ensemble: bool = True) -> Optional[Dict[str, Any]]:
        """
        Get cached detection result for an image.
        
        Args:
            image_path: Path to the image file
            use_ensemble: Whether ensemble mode was used
            
        Returns:
            Cached result dict or None if not found
        """
        if not self.enabled:
            return None
        
        try:
            image_hash = compute_file_hash(image_path)
            if not image_hash:
                return None
            
            cache_key = get_cache_key(image_hash, use_ensemble)
            cached = cache.get(cache_key)
            
            if cached:
                logger.debug(f"Cache hit for {image_path[:50]}...")
                result = json.loads(cached)
                result['from_cache'] = True
                return result
            
            logger.debug(f"Cache miss for {image_path[:50]}...")
            return None
            
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    def set(
        self, 
        image_path: str, 
        result: Dict[str, Any], 
        use_ensemble: bool = True,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Cache detection result for an image.
        
        Args:
            image_path: Path to the image file
            result: Detection result to cache
            use_ensemble: Whether ensemble mode was used
            ttl: Cache TTL in seconds (uses default if not specified)
            
        Returns:
            True if cached successfully
        """
        if not self.enabled:
            return False
        
        # Don't cache errors
        if "error" in result:
            return False
        
        try:
            image_hash = compute_file_hash(image_path)
            if not image_hash:
                return False
            
            cache_key = get_cache_key(image_hash, use_ensemble)
            cache_ttl = ttl or self.ttl
            
            # Remove any non-serializable data
            cache_result = self._prepare_for_cache(result)
            
            cache.set(cache_key, json.dumps(cache_result), cache_ttl)
            logger.debug(f"Cached result for {image_path[:50]}... (TTL: {cache_ttl}s)")
            return True
            
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False
    
    def invalidate(self, image_path: str) -> bool:
        """Invalidate cache for an image"""
        if not self.enabled:
            return False
        
        try:
            image_hash = compute_file_hash(image_path)
            if not image_hash:
                return False
            
            # Invalidate both ensemble and single mode caches
            for use_ensemble in [True, False]:
                cache_key = get_cache_key(image_hash, use_ensemble)
                cache.delete(cache_key)
            
            logger.debug(f"Invalidated cache for {image_path[:50]}...")
            return True
            
        except Exception as e:
            logger.error(f"Cache invalidate error: {e}")
            return False
    
    def clear_all(self) -> bool:
        """Clear all detection caches (use with caution)"""
        if not self.enabled:
            return False
        
        try:
            # This depends on cache backend supporting key patterns
            # For Redis, this would work; for other backends, may not
            cache.delete_pattern("ai_detector:*")
            logger.info("Cleared all AI detector caches")
            return True
        except AttributeError:
            # Backend doesn't support pattern deletion
            logger.warning("Cache backend doesn't support pattern deletion")
            return False
        except Exception as e:
            logger.error(f"Cache clear error: {e}")
            return False
    
    def _prepare_for_cache(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare result dict for JSON serialization"""
        cache_result = {}
        for key, value in result.items():
            if key == 'from_cache':
                continue
            try:
                # Test if serializable
                json.dumps(value)
                cache_result[key] = value
            except (TypeError, ValueError):
                # Skip non-serializable values
                logger.debug(f"Skipping non-serializable key: {key}")
        return cache_result
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics (if supported by backend)"""
        if not self.enabled:
            return {"enabled": False}
        
        try:
            # This is Redis-specific
            from django_redis import get_redis_connection
            conn = get_redis_connection("default")
            info = conn.info()
            return {
                "enabled": True,
                "backend": "redis",
                "keys": conn.dbsize(),
                "memory_used": info.get("used_memory_human", "unknown"),
                "hits": info.get("keyspace_hits", 0),
                "misses": info.get("keyspace_misses", 0),
            }
        except Exception:
            return {
                "enabled": True,
                "backend": "unknown",
                "stats": "not available"
            }


# Global cache instance
detection_cache = DetectionCache()


def cached_detection(use_ensemble: bool = True):
    """
    Decorator to cache detection results.
    
    Usage:
        @cached_detection(use_ensemble=True)
        def detect(image_path):
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(image_path: str, *args, **kwargs):
            # Check cache first
            cached_result = detection_cache.get(image_path, use_ensemble)
            if cached_result:
                return cached_result
            
            # Run detection
            result = func(image_path, *args, **kwargs)
            
            # Cache the result
            detection_cache.set(image_path, result, use_ensemble)
            
            return result
        return wrapper
    return decorator
