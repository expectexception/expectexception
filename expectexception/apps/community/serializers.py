from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Category, Thread, Reply, Vote

User = get_user_model()


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name']


class CategorySerializer(serializers.ModelSerializer):
    thread_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'icon', 'color', 'order', 'thread_count']

    def get_thread_count(self, obj):
        return obj.threads.count()


class ReplySerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)
    children = serializers.SerializerMethodField()
    user_vote = serializers.SerializerMethodField()

    class Meta:
        model = Reply
        fields = [
            'id', 'thread', 'author', 'body', 'parent',
            'is_accepted_answer', 'vote_count', 'created_at', 'updated_at',
            'children', 'user_vote',
        ]
        read_only_fields = ['author', 'vote_count', 'is_accepted_answer']

    def get_children(self, obj):
        if obj.parent is None:
            children = obj.children.all()
            return ReplySerializer(children, many=True, context=self.context).data
        return []

    def get_user_vote(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            vote = obj.votes.filter(user=request.user).first()
            return vote.value if vote else None
        return None


class ThreadListSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    user_vote = serializers.SerializerMethodField()

    class Meta:
        model = Thread
        fields = [
            'id', 'title', 'slug', 'author', 'category', 'tags',
            'is_pinned', 'is_closed', 'is_solved',
            'view_count', 'vote_count', 'reply_count',
            'created_at', 'last_activity', 'user_vote',
        ]

    def get_user_vote(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            vote = obj.votes.filter(user=request.user).first()
            return vote.value if vote else None
        return None


class ThreadDetailSerializer(ThreadListSerializer):
    replies = serializers.SerializerMethodField()

    class Meta(ThreadListSerializer.Meta):
        fields = ThreadListSerializer.Meta.fields + ['body', 'replies', 'updated_at']

    def get_replies(self, obj):
        top_level = obj.replies.filter(parent=None)
        return ReplySerializer(top_level, many=True, context=self.context).data


class ThreadCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Thread
        fields = ['title', 'body', 'category', 'tags']
