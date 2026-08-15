from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExtractView, DownloadRequestView, DownloadDetailView, FileServeView, MyDownloadsView

router = DefaultRouter()
router.register('mine', MyDownloadsView, basename='my-downloads')

urlpatterns = [
    path('extract/', ExtractView.as_view(), name='video-extract'),
    path('download/', DownloadRequestView.as_view(), name='video-download'),
    path('downloads/<int:pk>/', DownloadDetailView.as_view(), name='video-download-detail'),
    path('downloads/<int:pk>/file/', FileServeView.as_view(), name='video-download-file'),
    path('', include(router.urls)),
]
