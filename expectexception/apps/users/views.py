from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import User
from apps.profiles.models import Profile
from .serializers import RegisterSerializer, UserSerializer, TokenPairSerializer, ProfileSerializer
from .google_auth import verify_google_token, get_or_create_google_user
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        resp = super().create(request, *args, **kwargs)
        user = User.objects.get(email=resp.data['email'])
        tokens = TokenPairSerializer.for_user(user)
        data = UserSerializer(user).data
        data.update(tokens)
        return Response(data, status=status.HTTP_201_CREATED)


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        user = User.objects.filter(email=email).first()
        if not user:
            return Response({'detail': 'If the email exists, a reset link will be sent.'})
        token = PasswordResetTokenGenerator().make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        # Build a simple URL (for production use absolute URL)
        reset_link = f"/api/auth/password-reset/confirm/?uid={uid}&token={token}"
        send_mail('Password reset', f'Use this link to reset: {reset_link}', settings.DEFAULT_FROM_EMAIL, [user.email])
        return Response({'detail': 'Password reset email sent.'})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uidb64 = request.data.get('uid') or request.query_params.get('uid')
        token = request.data.get('token') or request.query_params.get('token')
        new_password = request.data.get('new_password')
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except Exception:
            return Response({'detail': 'Invalid uid'}, status=status.HTTP_400_BAD_REQUEST)
        gen = PasswordResetTokenGenerator()
        if not gen.check_token(user, token):
            return Response({'detail': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)
        if not new_password:
            return Response({'detail': 'Provide new_password'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save()
        return Response({'detail': 'Password has been reset.'})


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        uidb64 = request.query_params.get('uid')
        token = request.query_params.get('token')
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except Exception:
            return Response({'detail': 'Invalid uid'}, status=status.HTTP_400_BAD_REQUEST)
        gen = PasswordResetTokenGenerator()
        if not gen.check_token(user, token):
            return Response({'detail': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)
        user.profile.email_verified = True
        user.profile.save()
        return Response({'detail': 'Email verified.'})


class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, username, format=None):
        user = get_object_or_404(User, email=username)
        serializer = UserSerializer(user, context={'request': request})
        return Response(serializer.data)

    def put(self, request, username, format=None):
        if request.user.email != username:
            return Response({'detail': 'Cannot update other user profile'}, status=status.HTTP_403_FORBIDDEN)
        profile = request.user.profile
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class FollowToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        target = get_object_or_404(User, email=username)
        profile = target.profile
        if request.user.profile in profile.followers.all():
            profile.followers.remove(request.user.profile)
            return Response({'status': 'unfollowed'})
        profile.followers.add(request.user.profile)
        return Response({'status': 'followed'})


class GoogleAuthView(APIView):
    """Authenticate via Google Sign-In.

    Accepts the ID token returned by Google Identity Services (GSI)
    on the frontend, verifies it server-side, and returns JWT tokens.
    If the user doesn't exist yet, a new account is created automatically.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        credential = request.data.get('credential')
        if not credential:
            return Response(
                {'detail': 'Google credential token is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify the Google ID token
        google_data = verify_google_token(credential)
        if google_data is None:
            return Response(
                {'detail': 'Invalid or expired Google token.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Get or create the user
        try:
            user = get_or_create_google_user(google_data)
        except Exception as e:
            logger.error("Google auth user creation failed: %s", e, exc_info=True)
            return Response(
                {'detail': 'Failed to create user account.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Issue JWT tokens
        tokens = TokenPairSerializer.for_user(user)
        data = UserSerializer(user).data
        data.update(tokens)

        logger.info("Google login successful for: %s", user.email)
        return Response(data, status=status.HTTP_200_OK)
