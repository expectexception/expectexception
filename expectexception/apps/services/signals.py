"""Cross-instance Mongo mirror signals (Render <-> local server failover sync).

Wired up from ServicesConfig.ready() rather than each individual app so the
Render/local split only needs to reason about one place. Every write still
goes to the local relational DB first (untouched — admin/permissions/
serializers all keep working exactly as before); these receivers just queue
a best-effort async mirror afterward so the *other* instance can find the
record if it ever needs to stand in during a failover.
"""
import logging

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


def _queue_mirror(task, *args):
    """Dispatch a mirror task without ever letting a broker/Celery hiccup
    break the save() that triggered it."""
    try:
        task.delay(*args)
    except Exception as e:
        logger.warning(f"Could not queue mirror task {task.name}: {e}")


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def mirror_user_on_save(sender, instance, **kwargs):
    from .tasks import mirror_user_task
    _queue_mirror(mirror_user_task, instance.pk)


def connect():
    """Connect signals for models in apps that may not always be installed
    (blog/community/contact are all "light" apps present on both Render and
    local, but keep this defensive since ready() runs on every instance)."""
    try:
        from apps.blog.models import Post

        @receiver(post_save, sender=Post, weak=False)
        def mirror_post_on_save(sender, instance, **kwargs):
            from .tasks import mirror_post_task
            _queue_mirror(mirror_post_task, instance.pk)
    except Exception as e:
        logger.info(f"Skipping blog.Post mirror signal: {e}")

    try:
        from apps.community.models import Thread

        @receiver(post_save, sender=Thread, weak=False)
        def mirror_thread_on_save(sender, instance, **kwargs):
            from .tasks import mirror_thread_task
            _queue_mirror(mirror_thread_task, instance.pk)
    except Exception as e:
        logger.info(f"Skipping community.Thread mirror signal: {e}")

    try:
        from apps.contact.models import ContactInquiry

        @receiver(post_save, sender=ContactInquiry, weak=False)
        def mirror_contact_inquiry_on_save(sender, instance, **kwargs):
            from .tasks import mirror_contact_inquiry_task
            _queue_mirror(mirror_contact_inquiry_task, instance.pk)
    except Exception as e:
        logger.info(f"Skipping contact.ContactInquiry mirror signal: {e}")
