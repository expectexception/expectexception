from django.urls import path
from .views import CreateSecretView, ViewSecretView, CreateFileSecretView, DownloadFileSecretView
urlpatterns = [
    path('create/', CreateSecretView.as_view(), name='create-secret'),
    path('view/<uuid:pk>/', ViewSecretView.as_view(), name='view-secret'),
    path('create-file/', CreateFileSecretView.as_view(), name='create-file-secret'),
    path('view-file/<uuid:pk>/', DownloadFileSecretView.as_view(), name='view-file-secret'),
]
