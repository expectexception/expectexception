from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PostViewSet, TagViewSet, CommentViewSet, LikeViewSet, BookmarkViewSet, 
    PostSeriesViewSet, MediaAssetViewSet, BlogImageUploadView
)

router = DefaultRouter()
router.register('posts', PostViewSet, basename='post')
router.register('tags', TagViewSet, basename='tag')
router.register('comments', CommentViewSet, basename='comment')
router.register('likes', LikeViewSet, basename='like')
router.register('bookmarks', BookmarkViewSet, basename='bookmark')
router.register('series', PostSeriesViewSet, basename='series')
router.register('media', MediaAssetViewSet, basename='media')

urlpatterns = [
    path('upload-image/', BlogImageUploadView.as_view(), name='upload-image'),
    path('', include(router.urls)),
]
