from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone
from django.conf import settings


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Users must have an email address')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    AUTH_PROVIDER_CHOICES = [
        ('email', 'Email'),
        ('google', 'Google'),
    ]

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    # Google OAuth fields
    google_id = models.CharField(max_length=255, unique=True, null=True, blank=True,
                                  help_text="Google 'sub' claim — unique Google account ID")
    avatar_url = models.URLField(max_length=500, blank=True, default='',
                                  help_text="Profile picture URL (from Google or uploaded)")
    auth_provider = models.CharField(max_length=20, choices=AUTH_PROVIDER_CHOICES,
                                      default='email', help_text="How the user registered")

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email





import secrets

class APIKey(models.Model):
    """Programmatic API access key for authenticated users."""
    SCOPE_CHOICES = [
        ('read', 'Read Only'),
        ('full', 'Full Access'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_keys')
    name = models.CharField(max_length=100, help_text="Friendly name, e.g. 'My Script'")
    key = models.CharField(max_length=64, unique=True, db_index=True)
    scope = models.CharField(max_length=20, choices=SCOPE_CHOICES, default='full')
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True, help_text="Leave blank for no expiry")

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = secrets.token_urlsafe(48)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.email} — {self.name}"

    @property
    def masked_key(self):
        return f"{self.key[:8]}...{self.key[-4:]}"


class Subscription(models.Model):
    """Simple tier system for rate-limit differentiation. No payment logic."""
    TIER_FREE = 'free'
    TIER_PRO = 'pro'
    TIER_CHOICES = [(TIER_FREE, 'Free'), (TIER_PRO, 'Pro')]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='subscription'
    )
    tier = models.CharField(max_length=20, choices=TIER_CHOICES, default=TIER_FREE, db_index=True)
    started_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True, help_text='None = no expiry')
    notes = models.TextField(blank=True, help_text='Admin notes (e.g. promo, paid invoice)')

    class Meta:
        db_table = 'user_subscriptions'

    def __str__(self):
        return f"{self.user.email} [{self.tier}]"

    @property
    def is_active_pro(self):
        from django.utils import timezone
        if self.tier != self.TIER_PRO:
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        return True
