from django.urls import path
from .views import GenerateHandwritingView

urlpatterns = [
    path('generate/', GenerateHandwritingView.as_view(), name='generate-handwriting'),
]
