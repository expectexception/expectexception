from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Conversation, Message
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Conversation)
def mirror_conversation(sender, instance, created, **kwargs):
    """Mirror conversation data to MongoDB Atlas."""
    try:
        from apps.services.mongodb import get_mongodb_db
        db = get_mongodb_db()
        if db is not None:
            db.conversations.update_one(
                {'id': instance.id},
                {'$set': {
                    'id': instance.id,
                    'user_email': instance.user.email if instance.user else None,
                    'session_id': instance.session_id,
                    'title': instance.title,
                    'model': instance.model,
                    'system_prompt': instance.system_prompt,
                    'created_at': instance.created_at.isoformat() if instance.created_at else None,
                    'updated_at': instance.updated_at.isoformat() if instance.updated_at else None,
                }},
                upsert=True
            )
            logger.info(f"Mirrored conversation #{instance.id} to MongoDB Atlas.")
    except Exception as e:
        logger.error(f"Failed to mirror conversation to MongoDB Atlas: {e}")

@receiver(post_save, sender=Message)
def mirror_message(sender, instance, created, **kwargs):
    """Mirror message data to MongoDB Atlas."""
    try:
        from apps.services.mongodb import get_mongodb_db
        db = get_mongodb_db()
        if db is not None:
            db.messages.update_one(
                {'id': instance.id},
                {'$set': {
                    'id': instance.id,
                    'conversation_id': instance.conversation_id,
                    'role': instance.role,
                    'content': instance.content,
                    'tokens_used': instance.tokens_used,
                    'generation_time': instance.generation_time,
                    'created_at': instance.created_at.isoformat() if instance.created_at else None,
                }},
                upsert=True
            )
            logger.info(f"Mirrored message #{instance.id} to MongoDB Atlas.")
    except Exception as e:
        logger.error(f"Failed to mirror message to MongoDB Atlas: {e}")

@receiver(post_delete, sender=Conversation)
def delete_mirrored_conversation(sender, instance, **kwargs):
    """Delete mirrored conversation and messages from MongoDB Atlas."""
    try:
        from apps.services.mongodb import get_mongodb_db
        db = get_mongodb_db()
        if db is not None:
            db.conversations.delete_one({'id': instance.id})
            db.messages.delete_many({'conversation_id': instance.id})
            logger.info(f"Deleted mirrored conversation #{instance.id} from MongoDB Atlas.")
    except Exception as e:
        logger.error(f"Failed to delete mirrored conversation from MongoDB Atlas: {e}")
