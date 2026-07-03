"""URL patterns for contact API."""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.submit_contact, name='submit_contact'),
    path('hire/', views.submit_hire_inquiry, name='submit_hire_inquiry'),
]
