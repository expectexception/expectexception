"""
GPU Utilities - Monitor and manage GPU resources for backend services.
Supports NVIDIA GPUs via PyTorch CUDA.
"""
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


def is_gpu_available() -> bool:
    """Check if GPU is available for compute tasks."""
    try:
        import torch
        return torch.cuda.is_available()
    except ImportError:
        return False


def get_device() -> str:
    """
    Get the optimal device for inference (cuda or cpu).
    Respects settings.USE_GPU and handles errors by falling back to CPU.
    """
    from django.conf import settings
    import torch

    if not settings.USE_GPU:
        return "cpu"

    try:
        if torch.cuda.is_available():
            device_name = torch.cuda.get_device_name(0)
            logger.info(f"✓ Using GPU: {device_name} ({settings.GPU_DEVICE})")
            return settings.GPU_DEVICE
    except Exception as e:
        logger.warning(f"Error checking GPU availability: {e}")
    
    if settings.CPU_FALLBACK:
        logger.warning("Falling back to CPU device due to error or unavailability")
        return "cpu"
    
    raise RuntimeError("GPU requested but not available, and CPU fallback disabled.")


def get_gpu_info() -> Dict[str, Any]:
    """Get comprehensive GPU status and memory usage."""
    try:
        import torch
        
        if not torch.cuda.is_available():
            return {
                "available": False, 
                "device": "cpu",
                "reason": "CUDA not available (Driver or Hardware issue)"
            }
        
        # Select first device
        device_idx = 0
        device_name = torch.cuda.get_device_name(device_idx)
        
        # Real-time memory stats
        # torch.cuda.memory_stats provides detailed metrics
        total_memory = torch.cuda.get_device_properties(device_idx).total_memory
        
        # Clear cache before measuring for higher accuracy if needed, 
        # but maybe not every 2 seconds to avoid perf hit.
        # torch.cuda.empty_cache() 
        
        allocated = torch.cuda.memory_allocated(device_idx)
        reserved = torch.cuda.memory_reserved(device_idx)
        free_inside_reserved = reserved - allocated
        
        # Utilization % based on total memory
        utilization = (allocated / total_memory * 100) if total_memory > 0 else 0
        
        return {
            "available": True,
            "device": device_name,
            "total_memory_mb": round(total_memory / 1024**2, 1),
            "allocated_mb": round(allocated / 1024**2, 1),
            "reserved_mb": round(reserved / 1024**2, 1),
            "free_mb": round((total_memory - allocated) / 1024**2, 1),
            "utilization_pct": round(utilization, 1),
            "temperature": "N/A", # Torch doesn't provide temp easily without pynvml
            "capability": torch.cuda.get_device_capability(device_idx)
        }
    except ImportError:
        return {"available": False, "device": "cpu", "reason": "PyTorch not installed"}
    except Exception as e:
        logger.error(f"GPU Info Error: {e}")
        return {"available": False, "device": "cpu", "reason": str(e)}


async def get_gpu_info_async() -> Dict[str, Any]:
    """
    Async-safe wrapper for get_gpu_info().
    Runs the sync GPU check in a thread pool to avoid blocking the event loop.
    Use this in async views instead of get_gpu_info().
    """
    import asyncio
    from concurrent.futures import ThreadPoolExecutor
    
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor(max_workers=1) as executor:
        return await loop.run_in_executor(executor, get_gpu_info)


def cleanup_gpu_memory():
    """Free unused GPU memory (cache cleanup)."""
    try:
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
            logger.info("GPU memory cache cleared")
            return True
    except Exception as e:
        logger.warning(f"GPU memory cleanup failed: {e}")
    return False


def set_memory_fraction(fraction: float = 0.8):
    """
    Limit GPU memory usage to a fraction of total.
    Useful for low-VRAM GPUs like GeForce 940MX (2GB).
    
    Args:
        fraction: Fraction of total GPU memory to use (0.0-1.0)
    """
    try:
        import torch
        if torch.cuda.is_available():
            # Note: This must be called before any CUDA operations
            torch.cuda.set_per_process_memory_fraction(fraction, 0)
            logger.info(f"GPU memory limited to {fraction * 100:.0f}% of total")
            return True
    except Exception as e:
        logger.warning(f"Could not set GPU memory fraction: {e}")
    return False


def get_onnx_providers() -> list:
    """
    Get ONNX Runtime execution providers prioritized for GPU.
    Returns list suitable for onnxruntime session creation.
    """
    providers = []
    
    try:
        import onnxruntime
        available = onnxruntime.get_available_providers()
        
        # Prioritize CUDA, then TensorRT, then CPU
        if 'CUDAExecutionProvider' in available:
            providers.append('CUDAExecutionProvider')
        if 'TensorrtExecutionProvider' in available:
            providers.append('TensorrtExecutionProvider')
        providers.append('CPUExecutionProvider')
        
    except ImportError:
        providers = ['CPUExecutionProvider']
    
    return providers
