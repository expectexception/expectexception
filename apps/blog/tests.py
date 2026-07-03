from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from apps.users.models import User
from .models import Post
from .models import Like, Bookmark

class BlogTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='author@example.com', password='Test1234')
        # We'll use force_authenticate in individual tests

    def test_create_and_publish_post(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('post-list')
        data = {'title': 'My Post', 'content': 'Content here'}
        r = self.client.post(url, data, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        post_id = r.data['id']
        # publish
        pub_url = reverse('post-publish', args=[post_id])
        r2 = self.client.post(pub_url)
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        p = Post.objects.get(id=post_id)
        self.assertEqual(p.status, Post.STATUS_PUBLISHED)

    def test_anonymous_sees_only_published(self):
        # create a draft post
        p = Post.objects.create(title='Draft', content='x', author=self.user, status=Post.STATUS_DRAFT)
        list_url = reverse('post-list')
        r = self.client.get(list_url)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        # draft should not be visible to anonymous
        data = r.data
        # support paginated and non-paginated responses
        items = data.get('results', data) if isinstance(data, dict) else data
        ids = [item['id'] for item in items]
        self.assertNotIn(p.id, ids)

    def test_comment_creation_requires_auth(self):
        # anonymous should not be able to create a comment
        p = Post.objects.create(title='Pub', content='x', author=self.user, status=Post.STATUS_PUBLISHED)
        url = reverse('comment-list')
        r = self.client.post(url, {'post': p.id, 'content': 'hi'}, format='json')
        self.assertIn(r.status_code, (401, 403))

    def test_like_and_bookmark(self):
        self.client.force_authenticate(user=self.user)
        p = Post.objects.create(title='Likeable', content='x', author=self.user, status=Post.STATUS_PUBLISHED)
        # ensure cached counters start at 0
        self.assertEqual(p.likes_count, 0)
        self.assertEqual(p.bookmarks_count, 0)
        # use post actions on PostViewSet
        like_url = reverse('post-like', args=[p.id])
        r = self.client.post(like_url)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['likes_count'], 1)
        p.refresh_from_db()
        self.assertEqual(p.likes_count, 1)
        # duplicate like should return 400
        r2 = self.client.post(like_url)
        self.assertEqual(r2.status_code, 400)

        # unlike
        r3 = self.client.delete(like_url)
        self.assertEqual(r3.status_code, 200)
        self.assertEqual(r3.data['likes_count'], 0)

        bookmark_url = reverse('post-bookmark', args=[p.id])
        r4 = self.client.post(bookmark_url)
        self.assertEqual(r4.status_code, 200)
        self.assertEqual(r4.data['bookmarks_count'], 1)
        p.refresh_from_db()
        self.assertEqual(p.bookmarks_count, 1)
        # duplicate bookmark
        r5 = self.client.post(bookmark_url)
        self.assertEqual(r5.status_code, 400)
        # unbookmark
        r6 = self.client.delete(bookmark_url)
        self.assertEqual(r6.status_code, 200)
        self.assertEqual(r6.data['bookmarks_count'], 0)
