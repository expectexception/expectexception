from django.utils import timezone
from django.db.models import Q
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated

from .models import Category, Thread, Reply, Vote, ThreadBookmark
from rest_framework.views import APIView
from .serializers import (
    CategorySerializer, ThreadListSerializer, ThreadDetailSerializer,
    ThreadCreateSerializer, ReplySerializer,
)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class ThreadViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = Thread.objects.select_related('author', 'category').order_by('-is_pinned', '-last_activity')
        category = self.request.query_params.get('category')
        search = self.request.query_params.get('search')
        sort = self.request.query_params.get('sort', 'latest')

        if category:
            qs = qs.filter(category__slug=category)
        if search:
            try:
                vector = SearchVector('title', weight='A') + SearchVector('body', weight='B') + SearchVector('tags', weight='C')
                query = SearchQuery(search)
                qs = qs.annotate(rank=SearchRank(vector, query)).filter(rank__gte=0.01).order_by('-rank')
            except Exception:
                qs = qs.filter(Q(title__icontains=search) | Q(body__icontains=search) | Q(tags__icontains=search))
        if sort == 'popular':
            qs = qs.order_by('-vote_count', '-reply_count')
        elif sort == 'unanswered':
            qs = qs.filter(reply_count=0)
        elif sort == 'solved':
            qs = qs.filter(is_solved=True)
        return qs

    def get_serializer_class(self):
        if self.action in ['retrieve']:
            return ThreadDetailSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return ThreadCreateSerializer
        return ThreadListSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        Thread.objects.filter(pk=instance.pk).update(view_count=instance.view_count + 1)
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def vote(self, request, pk=None):
        thread = self.get_object()
        value = request.data.get('value')
        if value not in [1, -1]:
            return Response({'error': 'Value must be 1 or -1'}, status=400)

        existing = Vote.objects.filter(user=request.user, thread=thread).first()
        if existing:
            if existing.value == value:
                # Remove vote (toggle off)
                Thread.objects.filter(pk=thread.pk).update(vote_count=thread.vote_count - value)
                existing.delete()
                thread.refresh_from_db()
                return Response({'vote_count': thread.vote_count, 'user_vote': None})
            else:
                # Flip vote
                diff = value - existing.value
                Thread.objects.filter(pk=thread.pk).update(vote_count=thread.vote_count + diff)
                existing.value = value
                existing.save()
                thread.refresh_from_db()
                return Response({'vote_count': thread.vote_count, 'user_vote': value})
        else:
            Vote.objects.create(user=request.user, thread=thread, value=value)
            Thread.objects.filter(pk=thread.pk).update(vote_count=thread.vote_count + value)
            thread.refresh_from_db()
            return Response({'vote_count': thread.vote_count, 'user_vote': value})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def mark_solved(self, request, pk=None):
        thread = self.get_object()
        if thread.author != request.user and not request.user.is_staff:
            return Response({'error': 'Permission denied'}, status=403)
        thread.is_solved = not thread.is_solved
        thread.save()
        return Response({'is_solved': thread.is_solved})


class ReplyViewSet(viewsets.ModelViewSet):
    serializer_class = ReplySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        thread_id = self.request.query_params.get('thread')
        qs = Reply.objects.select_related('author').filter(parent=None)
        if thread_id:
            qs = qs.filter(thread_id=thread_id)
        return qs

    def perform_create(self, serializer):
        reply = serializer.save(author=self.request.user)
        Thread.objects.filter(pk=reply.thread_id).update(
            reply_count=reply.thread.reply_count + 1,
            last_activity=timezone.now()
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def vote(self, request, pk=None):
        reply = self.get_object()
        value = request.data.get('value')
        if value not in [1, -1]:
            return Response({'error': 'Value must be 1 or -1'}, status=400)

        existing = Vote.objects.filter(user=request.user, reply=reply).first()
        if existing:
            if existing.value == value:
                Reply.objects.filter(pk=reply.pk).update(vote_count=reply.vote_count - value)
                existing.delete()
                reply.refresh_from_db()
                return Response({'vote_count': reply.vote_count, 'user_vote': None})
            else:
                diff = value - existing.value
                Reply.objects.filter(pk=reply.pk).update(vote_count=reply.vote_count + diff)
                existing.value = value
                existing.save()
                reply.refresh_from_db()
                return Response({'vote_count': reply.vote_count, 'user_vote': value})
        else:
            Vote.objects.create(user=request.user, reply=reply, value=value)
            Reply.objects.filter(pk=reply.pk).update(vote_count=reply.vote_count + value)
            reply.refresh_from_db()
            return Response({'vote_count': reply.vote_count, 'user_vote': value})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def accept(self, request, pk=None):
        reply = self.get_object()
        thread = reply.thread
        if thread.author != request.user and not request.user.is_staff:
            return Response({'error': 'Only the thread author can accept answers'}, status=403)
        # Unmark previous accepted answer
        Reply.objects.filter(thread=thread, is_accepted_answer=True).update(is_accepted_answer=False)
        reply.refresh_from_db()
        reply.is_accepted_answer = not reply.is_accepted_answer
        reply.save()
        if reply.is_accepted_answer:
            Thread.objects.filter(pk=thread.pk).update(is_solved=True)
        return Response({'is_accepted_answer': reply.is_accepted_answer})


class ThreadBookmarkView(APIView):
    """Toggle bookmark on a thread. GET lists user's bookmarked threads."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookmarks = ThreadBookmark.objects.filter(user=request.user).select_related('thread')
        data = [{
            'id': b.thread.id,
            'title': b.thread.title,
            'slug': b.thread.slug,
            'category': b.thread.category.name if b.thread.category else '',
            'vote_count': b.thread.vote_count,
            'reply_count': b.thread.reply_count,
            'created_at': b.created_at,
        } for b in bookmarks]
        return Response(data)

    def post(self, request, thread_id):
        thread = get_object_or_404(Thread, pk=thread_id)
        bm, created = ThreadBookmark.objects.get_or_create(user=request.user, thread=thread)
        if not created:
            bm.delete()
            return Response({'bookmarked': False})
        return Response({'bookmarked': True})


class CommunityStatsView(APIView):
    """Public community stats for the leaderboard page."""
    permission_classes = []

    def get(self, request):
        from .models import Thread, Reply
        from django.contrib.auth import get_user_model
        from django.db.models import Count, Sum

        User = get_user_model()

        top_contributors = (
            User.objects.annotate(
                thread_count=Count('community_threads', distinct=True),
                reply_count=Count('community_replies', distinct=True),
            )
            .filter(thread_count__gt=0)
            .order_by('-thread_count', '-reply_count')[:10]
        )

        leaderboard = [{
            'display': f"{u.first_name} {u.last_name}".strip() or f"User-{u.id}",
            'thread_count': u.thread_count,
            'reply_count': u.reply_count,
            'reputation': getattr(getattr(u, 'profile', None), 'reputation', 0),
            'badges': getattr(getattr(u, 'profile', None), 'badges', []),
        } for u in top_contributors]

        top_threads = Thread.objects.filter(is_active=True).order_by('-vote_count')[:5]

        return Response({
            'total_threads': Thread.objects.filter(is_active=True).count(),
            'total_replies': Reply.objects.count(),
            'solved_threads': Thread.objects.filter(is_solved=True).count(),
            'total_members': User.objects.filter(is_active=True).count(),
            'leaderboard': leaderboard,
            'top_threads': [{'id': t.id, 'title': t.title, 'slug': t.slug, 'vote_count': t.vote_count, 'reply_count': t.reply_count} for t in top_threads],
        })
