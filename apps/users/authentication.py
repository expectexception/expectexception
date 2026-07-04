"""JWT authentication with a just-in-time shadow-user fallback.

Render and the local server each keep their own relational DB as the fast
primary read/write path (see apps/services/mongodb.py's module docstring for
why we didn't swap Django's ORM to Mongo entirely — that's a much larger,
riskier rewrite touching auth/admin/contenttypes across every app). A JWT is
only *signed*, not bound to one instance, so if a token issued by one side
arrives here and the user id isn't in the local DB (this instance is
standing in as a failover), rehydrate the user from the Mongo mirror and
create a local shadow row on the fly instead of failing the request.
"""
import logging

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.settings import api_settings

logger = logging.getLogger(__name__)


class JITMongoJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        try:
            return super().get_user(validated_token)
        except AuthenticationFailed:
            user_id = validated_token.get(api_settings.USER_ID_CLAIM)
            if user_id is None:
                raise
            user = self._hydrate_shadow_user(user_id)
            if user is None:
                raise
            return user

    def _hydrate_shadow_user(self, user_id):
        from django.contrib.auth import get_user_model
        from apps.services.mongodb import find_in_mongo

        doc = find_in_mongo('users', user_id)
        if not doc:
            return None

        User = get_user_model()
        try:
            user, created = User.objects.update_or_create(
                pk=user_id,
                defaults={
                    'email': doc.get('email'),
                    'password': doc.get('password') or '!',
                    'first_name': doc.get('first_name', ''),
                    'last_name': doc.get('last_name', ''),
                    'is_active': doc.get('is_active', True),
                    'is_staff': doc.get('is_staff', False),
                    'is_superuser': doc.get('is_superuser', False),
                    'auth_provider': doc.get('auth_provider', 'email'),
                    'google_id': doc.get('google_id'),
                    'avatar_url': doc.get('avatar_url', ''),
                },
            )
        except Exception as e:
            logger.error(f"Failed to JIT-hydrate shadow user id={user_id} from Mongo mirror: {e}")
            return None

        if created:
            logger.info(f"JIT-created shadow user id={user_id} from Mongo mirror (failover path).")
        if not user.is_active:
            raise AuthenticationFailed('User is inactive', code='user_inactive')
        return user
