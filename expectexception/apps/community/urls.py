from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CategoryViewSet,
    CommunityStatsView,
    ReplyViewSet,
    ThreadBookmarkView,
    ThreadViewSet,
)

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="community-category")
router.register("threads", ThreadViewSet, basename="community-thread")
router.register("replies", ReplyViewSet, basename="community-reply")

urlpatterns = [
    path("", include(router.urls)),
    path("bookmarks/", ThreadBookmarkView.as_view(), name="thread-bookmarks"),
    path("bookmarks/<int:thread_id>/", ThreadBookmarkView.as_view(), name="thread-bookmark-toggle"),
    path("stats/", CommunityStatsView.as_view(), name="community-stats"),
]
