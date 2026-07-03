from rest_framework import serializers
from .models import Post, Tag, Comment, Like, Bookmark, PostSeries, PostDraft, PostRevision, MediaAsset
from apps.users.serializers import UserSerializer


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ('id', 'name')


class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ('id', 'author', 'content', 'created_at', 'active', 'parent', 'replies')
        read_only_fields = ('author', 'created_at', 'replies')

    def get_replies(self, obj):
        if obj.replies.exists():
            return CommentSerializer(obj.replies.filter(active=True), many=True).data
        return []


class PostSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    tag_names = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)
    comments = CommentSerializer(many=True, read_only=True)
    likes_count = serializers.SerializerMethodField()
    bookmarks_count = serializers.SerializerMethodField()
    liked = serializers.SerializerMethodField()
    bookmarked = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = (
            'id', 'title', 'slug', 'content', 'author', 'tags', 'tag_names', 'status', 'created_at', 'updated_at',
            'published_at', 'cover_image', 'comments', 'likes_count', 'bookmarks_count', 'liked', 'bookmarked',
            'seo_title', 'seo_description', 'keywords', 'reading_time', 'view_count', 'featured', 
            'excerpt', 'table_of_contents', 'series'
        )
        read_only_fields = ('author', 'published_at', 'reading_time', 'view_count', 'table_of_contents')

    def create(self, validated_data):
        tags_data = validated_data.pop('tag_names', [])
        post = Post.objects.create(**validated_data)
        for tag_name in tags_data:
            t, _ = Tag.objects.get_or_create(name=tag_name)
            post.tags.add(t)
        return post

    def update(self, instance, validated_data):
        tags_data = validated_data.pop('tag_names', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if tags_data is not None:
            instance.tags.clear()
            for tag_name in tags_data:
                t, _ = Tag.objects.get_or_create(name=tag_name)
                instance.tags.add(t)
        return instance

    def get_likes_count(self, obj):
        # Prefer annotated cached counter when available
        return getattr(obj, 'likes_count', obj.likes.count())

    def get_bookmarks_count(self, obj):
        return getattr(obj, 'bookmarks_count', obj.bookmarks.count())

    def get_liked(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.likes.filter(user=request.user).exists()

    def get_bookmarked(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.bookmarks.filter(user=request.user).exists()


class LikeSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Like
        fields = ('id', 'user', 'post', 'created_at')
        read_only_fields = ('user', 'created_at')

    def create(self, validated_data):
        user = validated_data.get('user')
        post = validated_data.get('post')
        if Like.objects.filter(user=user, post=post).exists():
            raise serializers.ValidationError({'detail': 'Already exists'})
        return super().create(validated_data)


class BookmarkSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Bookmark
        fields = ('id', 'user', 'post', 'created_at')
        read_only_fields = ('user', 'created_at')

    def create(self, validated_data):
        user = validated_data.get('user')
        post = validated_data.get('post')
        if Bookmark.objects.filter(user=user, post=post).exists():
            raise serializers.ValidationError({'detail': 'Already exists'})
        return super().create(validated_data)


class PostSeriesSerializer(serializers.ModelSerializer):
    post_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PostSeries
        fields = ('id', 'title', 'slug', 'description', 'cover_image', 'created_at', 'updated_at', 'post_count')
        read_only_fields = ('slug', 'created_at', 'updated_at')
    
    def get_post_count(self, obj):
        return obj.posts.filter(status=Post.STATUS_PUBLISHED).count()


class PostDraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostDraft
        fields = ('id', 'post', 'author', 'title', 'content', 'created_at', 'updated_at')
        read_only_fields = ('author', 'created_at', 'updated_at')


class PostRevisionSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    
    class Meta:
        model = PostRevision
        fields = ('id', 'post', 'title', 'content', 'created_at', 'created_by', 'revision_note')
        read_only_fields = ('created_at', 'created_by')


class MediaAssetSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = MediaAsset
        fields = ('id', 'title', 'file', 'file_url', 'asset_type', 'file_size', 'width', 'height', 
                  'uploaded_by', 'created_at', 'alt_text')
        read_only_fields = ('uploaded_by', 'created_at', 'file_size', 'width', 'height')
    
    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and hasattr(obj.file, 'url'):
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
