from django.db import models
from django.contrib.auth import get_user_model
from django.utils.text import slugify

User = get_user_model()


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, help_text='MUI icon name')
    color = models.CharField(max_length=20, blank=True, default='#3dfc55')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'name']
        verbose_name_plural = 'Categories'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Thread(models.Model):
    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=300, unique=True, blank=True)
    body = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='threads')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='threads')
    tags = models.CharField(max_length=255, blank=True, help_text='Comma-separated tags')
    is_pinned = models.BooleanField(default=False)
    is_closed = models.BooleanField(default=False)
    is_solved = models.BooleanField(default=False)
    view_count = models.PositiveIntegerField(default=0)
    vote_count = models.IntegerField(default=0)
    reply_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_activity = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_pinned', '-last_activity']

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)[:260]
            slug = base
            n = 1
            while Thread.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base}-{n}'
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class Reply(models.Model):
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name='replies')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='community_replies')
    body = models.TextField()
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='children')
    is_accepted_answer = models.BooleanField(default=False)
    vote_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'Reply by {self.author.email} on {self.thread.title}'


class ThreadBookmark(models.Model):
    """User saves/bookmarks a community thread."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='thread_bookmarks')
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name='bookmarks')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('user', 'thread')]
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.email} bookmarked {self.thread.title}'


class Vote(models.Model):
    VOTE_UP = 1
    VOTE_DOWN = -1
    VOTE_CHOICES = ((VOTE_UP, 'Upvote'), (VOTE_DOWN, 'Downvote'))

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='community_votes')
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name='votes', null=True, blank=True)
    reply = models.ForeignKey(Reply, on_delete=models.CASCADE, related_name='votes', null=True, blank=True)
    value = models.SmallIntegerField(choices=VOTE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('user', 'thread'), ('user', 'reply')]

    def __str__(self):
        target = self.thread or self.reply
        return f'{self.user.email} {"↑" if self.value == 1 else "↓"} {target}'
