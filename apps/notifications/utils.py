"""
Utility functions for sending web push notifications
"""
from pywebpush import webpush, WebPushException
from django.conf import settings
from .models import PushSubscription, NotificationLog
import logging
import json

logger = logging.getLogger(__name__)


def send_push_notification(subscription, title, body, icon=None, url=None, data=None):
    """
    Send a push notification to a single subscription
    
    Args:
        subscription: PushSubscription model instance
        title: Notification title
        body: Notification body text
        icon: Optional icon URL
        url: Optional URL to open when clicked
        data: Optional additional data
    
    Returns:
        bool: True if successful, False otherwise
    """
    # Create notification payload
    payload = {
        'title': title,
        'body': body,
        'icon': icon or '/logo192.png',
        'badge': '/logo192.png',
        'data': {
            'url': url or '/',
            **(data or {})
        }
    }
    
    # Log the notification
    notification_log = NotificationLog.objects.create(
        subscription=subscription,
        title=title,
        body=body,
        icon=icon or '',
        url=url or ''
    )
    
    try:
        # Send the push notification
        response = webpush(
            subscription_info={
                'endpoint': subscription.endpoint,
                'keys': {
                    'p256dh': subscription.p256dh_key,
                    'auth': subscription.auth_key
                }
            },
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY_PEM,
            vapid_claims={
                'sub': f'mailto:{settings.VAPID_EMAIL}'
            }
        )
        
        # Mark as sent
        notification_log.mark_sent()
        logger.info(f"Push notification sent successfully to subscription {subscription.id}")
        return True
        
    except WebPushException as e:
        error_msg = str(e)
        logger.error(f"WebPushException for subscription {subscription.id}: {error_msg}")
        
        # If subscription is gone (410) or invalid (404), disable it
        if e.response and e.response.status_code in [404, 410]:
            subscription.disable()
            logger.info(f"Disabled invalid subscription {subscription.id}")
        
        notification_log.mark_failed(error_msg)
        return False
        
    except Exception as e:
        logger.error(f"Error sending push notification: {str(e)}")
        notification_log.mark_failed(str(e))
        return False


def send_notification_to_user(user, title, body, icon=None, url=None, data=None):
    """
    Send push notification to all active subscriptions for a user
    
    Args:
        user: User model instance
        title: Notification title
        body: Notification body text
        icon: Optional icon URL
        url: Optional URL to open when clicked
        data: Optional additional data
    
    Returns:
        tuple: (success_count, failure_count)
    """
    subscriptions = PushSubscription.objects.filter(user=user, is_active=True)
    
    success_count = 0
    failure_count = 0
    
    for subscription in subscriptions:
        if send_push_notification(subscription, title, body, icon, url, data):
            success_count += 1
        else:
            failure_count += 1
    
    logger.info(f"Sent notifications to user {user.id}: {success_count} succeeded, {failure_count} failed")
    return success_count, failure_count


def send_notification_to_all(title, body, icon=None, url=None, data=None):
    """
    Send push notification to all active subscriptions
    
    Args:
        title: Notification title
        body: Notification body text
        icon: Optional icon URL
        url: Optional URL to open when clicked
        data: Optional additional data
    
    Returns:
        tuple: (success_count, failure_count)
    """
    subscriptions = PushSubscription.objects.filter(is_active=True)
    
    success_count = 0
    failure_count = 0
    
    for subscription in subscriptions:
        if send_push_notification(subscription, title, body, icon, url, data):
            success_count += 1
        else:
            failure_count += 1
    
    logger.info(f"Broadcast notification: {success_count} succeeded, {failure_count} failed")
    return success_count, failure_count


# Convenience functions for common notification types

def notify_download_complete(user, filename, download_url=None):
    """Send notification when download is complete"""
    return send_notification_to_user(
        user,
        title="Download Complete! ✓",
        body=f'"{filename}" is ready to download',
        url=download_url or '/downloads',
        data={'type': 'download_complete', 'filename': filename}
    )


def notify_processing_complete(user, task_type, result_url=None):
    """Send notification when processing task is complete"""
    return send_notification_to_user(
        user,
        title=f"{task_type} Complete! ✓",
        body=f"Your {task_type

.lower()} has finished processing",
        url=result_url or '/',
        data={'type': 'processing_complete', 'task_type': task_type}
    )


def notify_new_feature(title, description, feature_url=None):
    """Send notification about new feature to all users"""
    return send_notification_to_all(
        title=f"🎉 {title}",
        body=description,
        url=feature_url or '/',
        data={'type': 'new_feature'}
    )
