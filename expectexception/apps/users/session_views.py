"""Session management for JWT auth: list issued refresh tokens and revoke them.

This module previously tried `from knox.models import AuthToken` and fell back
to `request.auth.delete()` on ImportError. Knox is not installed, and under JWT
`request.auth` is a validated token object with no `.delete()` — so every view
here silently returned an empty list or swallowed the AttributeError. Nothing
could actually be listed or revoked.

SimpleJWT's token_blacklist app already tracks every issued refresh token
(OutstandingToken) and which ones are revoked (BlacklistedToken), so sessions
are derived from that.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken


def _current_jti(request):
    """The jti of the access token on this request, so the caller's own session
    can be flagged in the list."""
    return getattr(request.auth, 'payload', {}).get('jti') if request.auth else None


class SessionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils import timezone

        revoked_ids = set(
            BlacklistedToken.objects.filter(token__user=request.user).values_list('token_id', flat=True)
        )
        now = timezone.now()
        sessions = [
            {
                'id': str(token.id),
                'created': token.created_at,
                'expiry': token.expires_at,
                'current': False,
            }
            for token in OutstandingToken.objects.filter(user=request.user, expires_at__gt=now)
            .exclude(id__in=revoked_ids)
            .order_by('-created_at')
        ]
        return Response({'sessions': sessions, 'count': len(sessions)})


class SessionRevokeView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, session_id):
        token = OutstandingToken.objects.filter(user=request.user, pk=session_id).first()
        if token is None:
            return Response({'error': 'Session not found.'}, status=404)
        BlacklistedToken.objects.get_or_create(token=token)
        return Response({'revoked': True})


class SessionRevokeAllView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        tokens = OutstandingToken.objects.filter(user=request.user)
        for token in tokens:
            BlacklistedToken.objects.get_or_create(token=token)
        return Response({'revoked_all': True, 'count': tokens.count()})
