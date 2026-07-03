import psutil
import time
import os
from datetime import datetime
from django.conf import settings
from .gpu_utils import get_gpu_info


def get_health_snapshot() -> dict:
    """Lightweight real-time health summary for the chatbot's health_check tool."""
    snapshot = {'status': 'ok', 'database': 'unknown', 'cpu_percent': None, 'memory_percent': None, 'gpu': None}

    try:
        from django.db import connections
        conn = connections['default']
        conn.ensure_connection()
        snapshot['database'] = 'ok'
    except Exception:
        snapshot['database'] = 'error'
        snapshot['status'] = 'degraded'

    snapshot['cpu_percent'] = psutil.cpu_percent(interval=None)
    snapshot['memory_percent'] = psutil.virtual_memory().percent

    gpu_stats = get_gpu_info()
    snapshot['gpu'] = gpu_stats.get('device') if gpu_stats and gpu_stats.get('available') else None

    return snapshot

def get_system_metrics():
    """
    Gather comprehensive system metrics for real-time dashboard.
    """
    # CPU
    cpu_percent = psutil.cpu_percent(interval=None)
    cpu_cores = psutil.cpu_count(logical=True)
    cpu_usage_per_core = psutil.cpu_percent(interval=None, percpu=True)
    
    # Memory
    mem = psutil.virtual_memory()
    mem_total_gb = round(mem.total / (1024**3), 1)
    mem_used_gb = round(mem.used / (1024**3), 1)
    
    # Disk
    disk = psutil.disk_usage('/')
    disk_total_gb = round(disk.total / (1024**3), 1)
    disk_used_gb = round(disk.used / (1024**3), 1)
    
    # Network
    net = psutil.net_io_counters()
    bytes_sent_mb = round(net.bytes_sent / (1024**2), 1)
    bytes_recv_mb = round(net.bytes_recv / (1024**2), 1)
    
    # GPU
    gpu_stats = get_gpu_info()
    
    # Load Averages using os.getloadavg() if on Unix, else fallback
    try:
        load_avg = [round(x, 2) for x in os.getloadavg()]
    except AttributeError:
        load_avg = [0, 0, 0]

    return {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "cpu": {
            "usage": cpu_percent,
            "cores": cpu_cores,
            "per_core": cpu_usage_per_core,
            "load_avg": load_avg
        },
        "memory": {
            "total_gb": mem_total_gb,
            "used_gb": mem_used_gb,
            "percent": mem.percent
        },
        "disk": {
            "total_gb": disk_total_gb,
            "used_gb": disk_used_gb,
            "percent": disk.percent
        },
        "network": {
            "sent_mb": bytes_sent_mb,
            "recv_mb": bytes_recv_mb
        },
        "gpu": gpu_stats,
        "runtime": {
            "uptime_seconds": int(time.time() - psutil.boot_time()),
            "environment": "Development" if settings.DEBUG else "Production"
        }
    }
