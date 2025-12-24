from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Post, Tag, Comment, Like, Bookmark, PostSeries, PostDraft, PostRevision, MediaAsset
from django.db import IntegrityError, models
from rest_framework.exceptions import ValidationError
from django.db.models import Q
from .serializers import (
    PostSerializer, TagSerializer, CommentSerializer, LikeSerializer, BookmarkSerializer,
    PostSeriesSerializer, MediaAssetSerializer
)
from .permissions import IsAuthorOrReadOnly, IsAdminOrReadOnly
from rest_framework import mixins

from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser
from django.conf import settings
import os
import uuid
class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ('title', 'content')
    ordering_fields = ('published_at', 'created_at')

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            # Authenticated users can see published posts and their own drafts
            qs = Post.objects.filter(Q(status=Post.STATUS_PUBLISHED) | Q(author=user)).distinct()
            # prefetch related fields to avoid N+1; cached counters live on model
            return qs.select_related('author').prefetch_related('tags')
        # anonymous: only published
        qs = Post.objects.filter(status=Post.STATUS_PUBLISHED)
        return qs.select_related('author').prefetch_related('tags')

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def publish(self, request, pk=None):
        post = self.get_object()
        if post.author != request.user:
            return Response({'detail': 'Only author can publish'}, status=status.HTTP_403_FORBIDDEN)
        post.publish()
        return Response(self.get_serializer(post).data)

    @action(detail=True, methods=['post', 'delete'], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        post = self.get_object()
        if request.method == 'POST':
            like, created = Like.objects.get_or_create(user=request.user, post=post)
            if not created:
                return Response({'detail': 'Already liked'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'detail': 'liked', 'likes_count': post.likes.count()})
        # DELETE -> unlike
        Like.objects.filter(user=request.user, post=post).delete()
        return Response({'detail': 'unliked', 'likes_count': post.likes.count()})

    @action(detail=True, methods=['post', 'delete'], permission_classes=[permissions.IsAuthenticated])
    def bookmark(self, request, pk=None):
        post = self.get_object()
        if request.method == 'POST':
            bm, created = Bookmark.objects.get_or_create(user=request.user, post=post)
            if not created:
                return Response({'detail': 'Already bookmarked'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'detail': 'bookmarked', 'bookmarks_count': post.bookmarks.count()})
        # DELETE -> unbookmark
        Bookmark.objects.filter(user=request.user, post=post).delete()
        return Response({'detail': 'unbookmarked', 'bookmarks_count': post.bookmarks.count()})

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def auto_save(self, request):
        """Auto-save draft for a post"""
        from .services import auto_save_draft
        from .serializers import PostDraftSerializer
        
        title = request.data.get('title', '')
        content = request.data.get('content', '')
        post_id = request.data.get('post_id')
        
        post = None
        if post_id:
            post = Post.objects.filter(id=post_id, author=request.user).first()
        
        draft = auto_save_draft(request.user, title, content, post)
        serializer = PostDraftSerializer(draft)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def revisions(self, request, pk=None):
        """Get version history for a post"""
        from .serializers import PostRevisionSerializer
        
        post = self.get_object()
        if post.author != request.user and not request.user.is_staff:
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        revisions = post.revisions.all()
        serializer = PostRevisionSerializer(revisions, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def restore_revision(self, request, pk=None):
        """Restore a specific revision"""
        from .models import PostRevision
        from .services import create_post_revision
        
        post = self.get_object()
        if post.author != request.user:
            return Response({'detail': 'Only author can restore revisions'}, status=status.HTTP_403_FORBIDDEN)
        
        revision_id = request.data.get('revision_id')
        if not revision_id:
            return Response({'detail': 'revision_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        revision = get_object_or_404(PostRevision, id=revision_id, post=post)
        
        # Create a new revision before restoring
        create_post_revision(post, request.user, f'Before restoring revision {revision_id}')
        
        # Restore content
        post.title = revision.title
        post.content = revision.content
        post.save()
        
        return Response(self.get_serializer(post).data)

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get analytics for a post"""
        post = self.get_object()
        
        # Only author or staff can view analytics
        if not request.user.is_authenticated or (post.author != request.user and not request.user.is_staff):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        analytics = {
            'views': post.view_count,
            'likes': post.likes_count,
            'bookmarks': post.bookmarks_count,
            'comments': post.comments.filter(active=True).count(),
            'reading_time': post.reading_time,
        }
        
        return Response(analytics)

    @action(detail=True, methods=['post'])
    def increment_view(self, request, pk=None):
        """Increment view count for a post"""
        post = self.get_object()
        post.view_count = models.F('view_count') + 1
        post.save(update_fields=['view_count'])
        post.refresh_from_db()
        return Response({'view_count': post.view_count})


class TagViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.filter(active=True)
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        post_id = self.request.data.get('post')
        post = get_object_or_404(Post, id=post_id)
        parent_id = self.request.data.get('parent')
        parent = None
        if parent_id:
            parent = get_object_or_404(Comment, id=parent_id)
        serializer.save(author=self.request.user, post=post, parent=parent)


class LikeViewSet(mixins.CreateModelMixin, mixins.DestroyModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Like.objects.all()
    serializer_class = LikeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        try:
            serializer.save(user=self.request.user)
        except IntegrityError:
            raise ValidationError({'detail': 'Already exists'})


class BookmarkViewSet(mixins.CreateModelMixin, mixins.DestroyModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Bookmark.objects.all()
    serializer_class = BookmarkSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        try:
            serializer.save(user=self.request.user)
        except IntegrityError:
            raise ValidationError({'detail': 'Already exists'})


class PostSeriesViewSet(viewsets.ModelViewSet):
    """ViewSet for managing post series"""
    queryset = PostSeries.objects.all()
    serializer_class = PostSeriesSerializer
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = 'slug'


class MediaAssetViewSet(viewsets.ModelViewSet):
    """ViewSet for media library"""
    queryset = MediaAsset.objects.all()
    serializer_class = MediaAssetSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]
    
    def get_queryset(self):
        # Users can see their own uploads and staff can see all
        if self.request.user.is_staff:
            return MediaAsset.objects.all()
        return MediaAsset.objects.filter(uploaded_by=self.request.user)
    
    def perform_create(self, serializer):
        from .services import optimize_image
        from PIL import Image
        
        file = self.request.FILES.get('file')
        
        # Determine asset type
        asset_type = 'other'
        if file.content_type.startswith('image/'):
            asset_type = 'image'
        elif file.content_type.startswith('video/'):
            asset_type = 'video'
        elif file.content_type in ['application/pdf', 'application/msword']:
            asset_type = 'document'
        
        # Get file size
        file_size = file.size
        
        # For images, get dimensions and optimize
        width, height = None, None
        if asset_type == 'image':
            try:
                img = Image.open(file)
                width, height = img.size
                # Optimize image
                file = optimize_image(file)
            except Exception as e:
                print(f"Image processing error: {e}")
        
        serializer.save(
            uploaded_by=self.request.user,
            asset_type=asset_type,
            file_size=file_size,
            width=width,
            height=height
        )


class BlogImageUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        if 'image' not in request.FILES:
            return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        image = request.FILES['image']
        # Simple validation
        if not image.content_type.startswith('image/'):
            return Response({'error': 'Invalid file type'}, status=status.HTTP_400_BAD_REQUEST)
            
        ext = os.path.splitext(image.name)[1]
        filename = f"blog_content/{uuid.uuid4()}{ext}"
        path = os.path.join(settings.MEDIA_ROOT, filename)
        
        # Ensure dir exists
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        with open(path, 'wb+') as destination:
            for chunk in image.chunks():
                destination.write(chunk)
                
        url = f"{settings.MEDIA_URL}{filename}"
        return Response({'url': url})
