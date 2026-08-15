from uvicorn.workers import UvicornWorker

class ImprovedUvicornWorker(UvicornWorker):
    """
    Custom Uvicorn worker for Gunicorn that disables the lifespan protocol 
    to prevent 'protocol appears unsupported' warnings in Django.
    """
    CONFIG_KWARGS = {"lifespan": "off"}
