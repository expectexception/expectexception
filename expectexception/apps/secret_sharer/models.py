import uuid
from django.db import models
from django.utils import timezone

class Secret(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    encrypted_content = models.TextField()
    passphrase_hash = models.CharField(max_length=128, blank=True, null=True)  # Future use
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_viewed = models.BooleanField(default=False)

    def is_expired(self):
        if self.expires_at and timezone.now() > self.expires_at:
            return True
        return False

    def __str__(self):
        return str(self.id)
