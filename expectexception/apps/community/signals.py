from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from .models import Vote, Reply


def _update_author_reputation(user):
    try:
        profile = user.profile
        profile.recalculate_reputation()
    except Exception:
        pass


def _create_notification(recipient, sender, n_type, title, body, url=''):
    if recipient == sender:
        return
    try:
        from apps.notifications.models import InAppNotification
        InAppNotification.objects.create(
            recipient=recipient,
            sender=sender,
            notification_type=n_type,
            title=title,
            body=body,
            url=url,
        )
    except Exception:
        pass


@receiver(pre_save, sender=Reply)
def reply_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._old_is_accepted = Reply.objects.only('is_accepted_answer').get(pk=instance.pk).is_accepted_answer
        except Reply.DoesNotExist:
            instance._old_is_accepted = False
    else:
        instance._old_is_accepted = False


@receiver(post_save, sender=Reply)
def reply_posted(sender, instance, created, **kwargs):
    if created:
        thread = instance.thread
        thread_url = f"/community/thread/{thread.pk}/{thread.slug}"
        # Notify thread author
        _create_notification(
            recipient=thread.author,
            sender=instance.author,
            n_type='reply',
            title=f'{instance.author.first_name or instance.author.email} replied to your thread',
            body=instance.body[:120],
            url=thread_url,
        )
        # Notify parent reply author if it's a nested reply
        if instance.parent and instance.parent.author != thread.author:
            _create_notification(
                recipient=instance.parent.author,
                sender=instance.author,
                n_type='reply',
                title=f'{instance.author.first_name or instance.author.email} replied to your comment',
                body=instance.body[:120],
                url=thread_url,
            )

    # Accepted answer — only fire on transition False→True
    old_val = getattr(instance, '_old_is_accepted', False)
    if not created and instance.is_accepted_answer and not old_val:
        _update_author_reputation(instance.author)
        _create_notification(
            recipient=instance.author,
            sender=instance.thread.author,
            n_type='accepted',
            title='Your answer was accepted!',
            body=f'In thread: {instance.thread.title}',
            url=f"/community/thread/{instance.thread.pk}/{instance.thread.slug}",
        )


@receiver(post_save, sender=Vote)
def vote_created(sender, instance, created, **kwargs):
    if instance.thread_id and instance.thread:
        _update_author_reputation(instance.thread.author)
        if created and instance.value == 1:
            _create_notification(
                recipient=instance.thread.author,
                sender=instance.user,
                n_type='vote',
                title='Someone upvoted your thread',
                body=instance.thread.title[:120],
                url=f"/community/thread/{instance.thread.pk}/{instance.thread.slug}",
            )
    if instance.reply_id and instance.reply:
        _update_author_reputation(instance.reply.author)


@receiver(post_delete, sender=Vote)
def vote_deleted(sender, instance, **kwargs):
    try:
        if instance.thread_id and instance.thread:
            _update_author_reputation(instance.thread.author)
        if instance.reply_id and instance.reply:
            _update_author_reputation(instance.reply.author)
    except Exception:
        pass
