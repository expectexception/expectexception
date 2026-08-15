from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.utils.text import slugify

User = get_user_model()


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name


class Post(models.Model):
    STATUS_DRAFT = 'draft'
    STATUS_PUBLISHED = 'published'
    STATUS_CHOICES = ((STATUS_DRAFT, 'Draft'), (STATUS_PUBLISHED, 'Published'))

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    tags = models.ManyToManyField(Tag, blank=True, related_name='posts')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(blank=True, null=True)
    cover_image = models.ImageField(upload_to='covers/', blank=True, null=True)
    likes_count = models.PositiveIntegerField(default=0)
    bookmarks_count = models.PositiveIntegerField(default=0)

    # SEO Fields
    seo_title = models.CharField(max_length=70, blank=True, help_text="Optimize for search engines (Max 70 chars)")
    seo_description = models.CharField(max_length=160, blank=True, help_text="Meta description (Max 160 chars)")
    keywords = models.CharField(max_length=255, blank=True, help_text="Comma-separated keywords")

    # Enhanced Fields
    reading_time = models.PositiveIntegerField(default=0, help_text="Estimated reading time in minutes")
    view_count = models.PositiveIntegerField(default=0)
    featured = models.BooleanField(default=False, help_text="Feature this post on homepage")
    excerpt = models.TextField(blank=True, help_text="Auto-generated or custom excerpt")
    table_of_contents = models.JSONField(default=list, blank=True, help_text="Auto-generated table of contents")
    series = models.ForeignKey('PostSeries', on_delete=models.SET_NULL, null=True, blank=True, related_name='posts')

    class Meta:
        ordering = ['-published_at', '-created_at']

    def save(self, *args, **kwargs):
        from .services import calculate_reading_time, generate_excerpt, generate_table_of_contents
        
        if not self.slug:
            base_slug = slugify(self.title)[:200]
            slug = base_slug
            n = 1
            while Post.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{n}"
                n += 1
            self.slug = slug
        
        if self.status == self.STATUS_PUBLISHED and not self.published_at:
            self.published_at = timezone.now()
        
        # Auto-calculate reading time
        if self.content:
            self.reading_time = calculate_reading_time(self.content)
            
            # Auto-generate excerpt if not provided
            if not self.excerpt:
                self.excerpt = generate_excerpt(self.content)
            
            # Auto-generate table of contents
            self.table_of_contents = generate_table_of_contents(self.content)
        
        super().save(*args, **kwargs)

    def publish(self):
        self.status = self.STATUS_PUBLISHED
        self.published_at = timezone.now()
        self.save()

    def __str__(self):
        return self.title


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    active = models.BooleanField(default=True)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='replies')

    def __str__(self):
        return f"Comment by {self.author} on {self.post}"


class Like(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='likes')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'post')

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            # increment cached counter
            Post.objects.filter(pk=self.post_id).update(likes_count=models.F('likes_count') + 1)

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)
        Post.objects.filter(pk=self.post_id).update(likes_count=models.F('likes_count') - 1)

    def __str__(self):
        return f"{self.user.email} likes {self.post.title}"


class Bookmark(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookmarks')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='bookmarks')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'post')

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            Post.objects.filter(pk=self.post_id).update(bookmarks_count=models.F('bookmarks_count') + 1)

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)
        Post.objects.filter(pk=self.post_id).update(bookmarks_count=models.F('bookmarks_count') - 1)

    def __str__(self):
        return f"{self.user.email} bookmarked {self.post.title}"


class PostSeries(models.Model):
    """Group related posts into a series"""
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    description = models.TextField(blank=True)
    cover_image = models.ImageField(upload_to='series/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = 'Post Series'
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)[:200]
            slug = base_slug
            n = 1
            while PostSeries.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.title


class PostDraft(models.Model):
    """Auto-saved drafts for posts"""
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='drafts', null=True, blank=True)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='drafts')
    title = models.CharField(max_length=255, blank=True)
    content = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
        get_latest_by = 'updated_at'
    
    def __str__(self):
        return f"Draft: {self.title or 'Untitled'} by {self.author.email}"


class PostRevision(models.Model):
    """Version history for posts"""
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='revisions')
    title = models.CharField(max_length=255)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    revision_note = models.CharField(max_length=255, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Revision of '{self.post.title}' at {self.created_at}"


class MediaAsset(models.Model):
    """Centralized media library"""
    ASSET_TYPE_CHOICES = (
        ('image', 'Image'),
        ('video', 'Video'),
        ('document', 'Document'),
        ('other', 'Other'),
    )
    
    title = models.CharField(max_length=255, blank=True)
    file = models.FileField(upload_to='media_library/%Y/%m/')
    asset_type = models.CharField(max_length=20, choices=ASSET_TYPE_CHOICES, default='image')
    file_size = models.PositiveIntegerField(default=0, help_text="File size in bytes")
    width = models.PositiveIntegerField(null=True, blank=True, help_text="Image width in pixels")
    height = models.PositiveIntegerField(null=True, blank=True, help_text="Image height in pixels")
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='media_assets')
    created_at = models.DateTimeField(auto_now_add=True)
    alt_text = models.CharField(max_length=255, blank=True, help_text="Alt text for accessibility")
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title or f"{self.asset_type} - {self.file.name}"
