from django.db import models
from django.conf import settings


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    followers = models.ManyToManyField('self', symmetrical=False, related_name='following', blank=True)
    email_verified = models.BooleanField(default=False)

    # Reputation system
    reputation = models.IntegerField(default=0, db_index=True)

    # Badges awarded (simple JSON list of badge slugs)
    badges = models.JSONField(default=list, blank=True)

    def recalculate_reputation(self):
        """Recompute reputation from community votes received and accepted answers."""
        from apps.community.models import Vote, Reply
        upvotes_on_threads = Vote.objects.filter(thread__author=self.user, value=1).count()
        downvotes_on_threads = Vote.objects.filter(thread__author=self.user, value=-1).count()
        upvotes_on_replies = Vote.objects.filter(reply__author=self.user, value=1).count()
        downvotes_on_replies = Vote.objects.filter(reply__author=self.user, value=-1).count()
        accepted_answers = Reply.objects.filter(author=self.user, is_accepted_answer=True).count()
        threads_posted = Vote.objects.filter(thread__author=self.user).values('thread').distinct().count()

        self.reputation = (
            (upvotes_on_threads * 5)
            - (downvotes_on_threads * 2)
            + (upvotes_on_replies * 10)
            - (downvotes_on_replies * 2)
            + (accepted_answers * 15)
            + (threads_posted * 2)
        )
        self._update_badges()
        self.save(update_fields=['reputation', 'badges'])

    def _update_badges(self):
        badges = []
        if self.reputation >= 10:
            badges.append('newcomer')
        if self.reputation >= 50:
            badges.append('contributor')
        if self.reputation >= 200:
            badges.append('trusted')
        if self.reputation >= 500:
            badges.append('expert')
        if self.reputation >= 1000:
            badges.append('legend')
        self.badges = badges

    def __str__(self):
        return f"Profile of {self.user.email}"
