from django.urls import path

from .views import (
    InAppNotificationDetailView,
    InAppNotificationListView,
    SubscribeView,
    UnsubscribeView,
    VapidPublicKeyView,
)

app_name = "notifications"

urlpatterns = [
    path("subscribe/", SubscribeView.as_view(), name="subscribe"),
    path("unsubscribe/", UnsubscribeView.as_view(), name="unsubscribe"),
    path("vapid-public-key/", VapidPublicKeyView.as_view(), name="vapid-public-key"),
    path("in-app/", InAppNotificationListView.as_view(), name="in-app-list"),
    path("in-app/<int:pk>/", InAppNotificationDetailView.as_view(), name="in-app-detail"),
]
