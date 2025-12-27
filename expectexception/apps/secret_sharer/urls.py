from django.urls import path
from .views import CreateSecretView, ViewSecretView

urlpatterns = [
    path('create/', CreateSecretView.as_view(), name='create-secret'),
    path('view/<uuid:pk>/', ViewSecretView.as_view(), name='view-secret'),
]
