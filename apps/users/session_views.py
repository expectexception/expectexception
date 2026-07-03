"""
Session management: list active token sessions and revoke them.
Uses DRF's AuthToken (from Knox or rest_framework.authtoken).
If using Knox multi-token auth, this works natively.
For simple DRF Token (single token), it shows the one session.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


class SessionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return current active sessions / tokens for the user."""
        sessions = []

        # Try Knox multi-token
        try:
            from knox.models import AuthToken
            for token in AuthToken.objects.filter(user=request.user).order_by('-created'):
                sessions.append({
                    'id': str(token.pk),
                    'created': token.created,
                    'expiry': token.expiry,
                    'current': False,  # hard to detect current in Knox without per-request comparison
                })
        except ImportError:
            # Fallback: DRF single token
            try:
                token = request.auth
                if token:
                    sessions.append({
                        'id': 'current',
                        'created': getattr(token, 'created', None),
                        'expiry': None,
                        'current': True,
                    })
            except Exception:
                pass

        return Response({'sessions': sessions, 'count': len(sessions)})


class SessionRevokeView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, session_id):
        """Revoke a specific session/token."""
        try:
            from knox.models import AuthToken
            AuthToken.objects.filter(user=request.user, pk=session_id).delete()
            return Response({'revoked': True})
        except ImportError:
            # DRF single token: logout current session
            try:
                request.auth.delete()
                return Response({'revoked': True})
            except Exception:
                return Response({'error': 'Could not revoke session.'}, status=400)


class SessionRevokeAllView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        """Revoke all sessions for the user (logout everywhere)."""
        try:
            from knox.models import AuthToken
            AuthToken.objects.filter(user=request.user).delete()
        except ImportError:
            try:
                request.auth.delete()
            except Exception:
                pass
        return Response({'revoked_all': True})
