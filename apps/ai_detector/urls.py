from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    analyze_image,
    get_task_status,
    health_check,
    model_status,
    preload_models,
    AnalysisHistoryViewSet,
)

router = DefaultRouter()
router.register(r'history', AnalysisHistoryViewSet, basename='analysis-history')

urlpatterns = [
    # Main analysis endpoint (async-first)
    path('analyze/', analyze_image, name='analyze-image'),
    
    # Task status for async processing
    path('status/<str:task_id>/', get_task_status, name='task-status'),
    
    # Health and monitoring
    path('health/', health_check, name='health-check'),
    path('models/', model_status, name='model-status'),
    path('models/preload/', preload_models, name='preload-models'),
    
    # History (requires auth)
    path('', include(router.urls)),
]
