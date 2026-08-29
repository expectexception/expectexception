from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import User

from .models import Post


class BlogTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="author@example.com", password="Test1234")
        # We'll use force_authenticate in individual tests

    def test_create_and_publish_post(self):
        # Creating/publishing posts is gated on is_staff (IsAdminOrReadOnly,
        # see apps/blog/permissions.py) - self.user is a plain account, so
        # authenticating as it here always got a 403 regardless of anything
        # this test actually meant to check. Needs its own staff user rather
        # than making self.user staff, since the other tests in this class
        # (test_like_and_bookmark, etc.) rely on it being an ordinary account.
        staff_user = User.objects.create_user(
            email="staff-author@example.com", password="Test1234", is_staff=True
        )
        self.client.force_authenticate(user=staff_user)
        url = reverse("post-list")
        data = {"title": "My Post", "content": "Content here"}
        r = self.client.post(url, data, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        post_id = r.data["id"]
        # publish
        pub_url = reverse("post-publish", args=[post_id])
        r2 = self.client.post(pub_url)
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        p = Post.objects.get(id=post_id)
        self.assertEqual(p.status, Post.STATUS_PUBLISHED)

    def test_anonymous_sees_only_published(self):
        # create a draft post
        p = Post.objects.create(
            title="Draft", content="x", author=self.user, status=Post.STATUS_DRAFT
        )
        list_url = reverse("post-list")
        r = self.client.get(list_url)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        # draft should not be visible to anonymous
        data = r.data
        # support paginated and non-paginated responses
        items = data.get("results", data) if isinstance(data, dict) else data
        ids = [item["id"] for item in items]
        self.assertNotIn(p.id, ids)

    def test_comment_creation_requires_auth(self):
        # anonymous should not be able to create a comment
        p = Post.objects.create(
            title="Pub", content="x", author=self.user, status=Post.STATUS_PUBLISHED
        )
        url = reverse("comment-list")
        r = self.client.post(url, {"post": p.id, "content": "hi"}, format="json")
        self.assertIn(r.status_code, (401, 403))

    def test_like_and_bookmark(self):
        self.client.force_authenticate(user=self.user)
        p = Post.objects.create(
            title="Likeable", content="x", author=self.user, status=Post.STATUS_PUBLISHED
        )
        # ensure cached counters start at 0
        self.assertEqual(p.likes_count, 0)
        self.assertEqual(p.bookmarks_count, 0)
        # use post actions on PostViewSet
        like_url = reverse("post-like", args=[p.id])
        r = self.client.post(like_url)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["likes_count"], 1)
        p.refresh_from_db()
        self.assertEqual(p.likes_count, 1)
        # duplicate like should return 400
        r2 = self.client.post(like_url)
        self.assertEqual(r2.status_code, 400)

        # unlike
        r3 = self.client.delete(like_url)
        self.assertEqual(r3.status_code, 200)
        self.assertEqual(r3.data["likes_count"], 0)

        bookmark_url = reverse("post-bookmark", args=[p.id])
        r4 = self.client.post(bookmark_url)
        self.assertEqual(r4.status_code, 200)
        self.assertEqual(r4.data["bookmarks_count"], 1)
        p.refresh_from_db()
        self.assertEqual(p.bookmarks_count, 1)
        # duplicate bookmark
        r5 = self.client.post(bookmark_url)
        self.assertEqual(r5.status_code, 400)
        # unbookmark
        r6 = self.client.delete(bookmark_url)
        self.assertEqual(r6.status_code, 200)


class BlogAuthorDisplayTests(APITestCase):
    """The listing/detail pages used to render post.author.email directly as
    the byline - showing a demo placeholder account, or worse, whichever
    admin's personal email happened to own the row. author.display_name
    must never be (or contain) the raw email.
    """

    def test_display_name_falls_back_to_admin_not_email(self):
        author = User.objects.create_user(email="someone.personal@gmail.com", password="Test1234")
        post = Post.objects.create(
            title="Pub", content="x", author=author, status=Post.STATUS_PUBLISHED
        )
        r = self.client.get(reverse("post-detail", args=[post.id]))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        display_name = r.data["author"]["display_name"]
        self.assertEqual(display_name, "Admin")
        self.assertNotIn("@", display_name)
        self.assertNotIn("someone.personal", display_name)

    def test_display_name_prefers_real_name_when_set(self):
        author = User.objects.create_user(
            email="jane@example.com", password="Test1234", first_name="Jane", last_name="Doe"
        )
        post = Post.objects.create(
            title="Pub", content="x", author=author, status=Post.STATUS_PUBLISHED
        )
        r = self.client.get(reverse("post-detail", args=[post.id]))
        self.assertEqual(r.data["author"]["display_name"], "Jane Doe")


class BlogListingPaginationTests(APITestCase):
    """The listing page used to fetch with no page/search/ordering params at
    all, so clicking "page 2" (or searching) silently kept showing the same
    first 10 posts by publish date - anything further down the list could
    never actually be reached. These pin down that the query params the
    frontend now sends actually work.
    """

    def setUp(self):
        self.author = User.objects.create_user(email="author@example.com", password="Test1234")
        from datetime import UTC, datetime, timedelta

        base = datetime(2026, 1, 1, tzinfo=UTC)
        for i in range(15):
            p = Post.objects.create(
                title=f"Post {i}",
                content=f"unique-marker-{i}" if i == 12 else "content",
                author=self.author,
                status=Post.STATUS_PUBLISHED,
            )
            Post.objects.filter(pk=p.pk).update(published_at=base + timedelta(days=i))

    def test_second_page_returns_different_posts_than_first(self):
        # Data migrations 0004/0005 seed the real service-tool posts into
        # every test database too, so the total here is "at least the 15
        # this test added" rather than an exact count.
        url = reverse("post-list")
        page1 = self.client.get(url, {"page": 1}).data
        page2 = self.client.get(url, {"page": 2}).data
        self.assertGreaterEqual(page1["count"], 15)
        ids_page1 = {item["id"] for item in page1["results"]}
        ids_page2 = {item["id"] for item in page2["results"]}
        self.assertTrue(ids_page1.isdisjoint(ids_page2))

    def test_search_param_filters_by_content(self):
        r = self.client.get(reverse("post-list"), {"search": "unique-marker-12"})
        self.assertEqual(r.data["count"], 1)
        self.assertEqual(r.data["results"][0]["title"], "Post 12")

    def test_ordering_by_likes_count_for_popular_filter(self):
        posts = list(Post.objects.order_by("id"))
        posts[3].likes_count = 50
        posts[3].save(update_fields=["likes_count"])
        r = self.client.get(reverse("post-list"), {"ordering": "-likes_count"})
        self.assertEqual(r.data["results"][0]["id"], posts[3].id)
