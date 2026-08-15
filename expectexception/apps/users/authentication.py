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
        token_email = validated_token.get('email')

        try:
            user = super().get_user(validated_token)
        except AuthenticationFailed:
            user_id = validated_token.get(api_settings.USER_ID_CLAIM)
            if user_id is None:
                raise
            user = self._hydrate_shadow_user(user_id, token_email)
            if user is None:
                raise
            return user

        # The pk resolved to *some* local user — but Render/local assign pks
        # independently, so that pk can belong to a different real account on
        # each side (verified: a fresh signup landed on id=1, which already
        # belongs to someone else locally). If the token carries the email
        # claim (see EmailClaimTokenObtainPairSerializer / TokenPairSerializer),
        # cross-check it against whoever the pk actually resolved to. Tokens
        # issued before this claim existed simply have nothing to check.
        if token_email and user.email != token_email:
            logger.warning(
                f"Rejecting token: user_id {validated_token.get(api_settings.USER_ID_CLAIM)} "
                f"resolved locally to {user.email!r} but the token claims "
                f"{token_email!r} — cross-instance id collision, not the same account."
            )
            raise AuthenticationFailed('Token identity mismatch', code='user_mismatch')
        return user

    def _hydrate_shadow_user(self, user_id, token_email=None):
        from django.contrib.auth import get_user_model
        from apps.services.mongodb import find_in_mongo

        doc = find_in_mongo('users', user_id)
        if not doc:
            return None

        # Belt-and-suspenders: if the token itself carries an email claim,
        # it must agree with what the Mongo mirror says this pk's owner is.
        if token_email and doc.get('email') != token_email:
            logger.warning(
                f"Refusing to JIT-hydrate user id={user_id}: token claims "
                f"{token_email!r} but the Mongo mirror has {doc.get('email')!r}."
            )
            return None

        User = get_user_model()

        # Render and local each assign primary keys independently (separate
        # auto-increment sequences), so the same numeric id can legitimately
        # belong to two different people on the two instances. Verified this
        # is not theoretical: a fresh Render signup landed on id=1, which on
        # local already belongs to a real, unrelated user. Only hydrate if
        # there's no local row at this pk yet, or the local row already *is*
        # this same person (matched by email) — never overwrite a different
        # local user's data just because the pk number matches.
        existing = User.objects.filter(pk=user_id).first()
        if existing is not None and existing.email != doc.get('email'):
            logger.warning(
                f"Refusing to JIT-hydrate user id={user_id}: pk belongs to a "
                f"different local user ({existing.email!r} != {doc.get('email')!r}). "
                "This is a cross-instance id collision, not the same account."
            )
            return None

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
