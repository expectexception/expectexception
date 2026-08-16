import logging

from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.shortcuts import get_object_or_404
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.profiles.models import Profile

from .google_auth import get_or_create_google_user, verify_google_token
from .models import User, UserManager
from .serializers import (
    ProfileSerializer,
    PublicUserSerializer,
    RegisterSerializer,
    TokenPairSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)


class EmailClaimTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds an `email` claim to login-issued tokens and supports email/username payload normalization."""

    def validate(self, attrs):
        from django.contrib.auth import authenticate
        from django.contrib.auth.models import update_last_login
        from rest_framework import exceptions
        from rest_framework_simplejwt.settings import api_settings

        email_input = (
            attrs.get(self.username_field)
            or attrs.get("email")
            or attrs.get("username")
            or self.initial_data.get("email")
            or self.initial_data.get("username")
        )
        password_input = attrs.get("password") or self.initial_data.get("password")

        if not email_input or not password_input:
            raise exceptions.AuthenticationFailed(
                "No active account found with the given credentials", code="no_active_account"
            )

        email_input = UserManager.normalize_email(email_input)

        user = authenticate(
            request=self.context.get("request"), username=email_input, password=password_input
        )

        if user is None:
            user = self._authenticate_from_mongo_mirror(email_input, password_input)

        if user is None:
            raise exceptions.AuthenticationFailed(
                "No active account found with the given credentials", code="no_active_account"
            )
        if not user.is_active:
            raise exceptions.AuthenticationFailed("User account is disabled", code="user_inactive")

        self.user = user
        refresh = self.get_token(user)

        if api_settings.UPDATE_LAST_LOGIN:
            update_last_login(None, user)

        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }

    @staticmethod
    def _authenticate_from_mongo_mirror(email, password):
        """Failover login: this instance's relational DB has no such user, so
        rebuild them from the cross-instance Mongo mirror.

        Strictly create-only. If a local row already exists, authenticate()
        above was authoritative and the password was simply wrong — the
        previous version of this code ran an update_or_create() here, so every
        mistyped password overwrote that account's local password hash,
        is_active and is_staff flags with whatever the mirror last saw.

        The mirrored password is a hash, so verify it here before creating
        anything; otherwise a wrong password would still materialize an
        account locally.
        """
        from django.contrib.auth.hashers import check_password

        from apps.services.mongodb import find_one_in_mongo

        if User.objects.filter(email__iexact=email).exists():
            return None

        doc = find_one_in_mongo("users", {"email": email})
        if not doc:
            return None

        hashed = doc.get("password") or ""
        if not hashed or not check_password(password, hashed):
            return None

        try:
            user = User(
                email=email,
                first_name=doc.get("first_name", ""),
                last_name=doc.get("last_name", ""),
                is_active=doc.get("is_active", True),
                is_staff=doc.get("is_staff", False),
                is_superuser=doc.get("is_superuser", False),
                auth_provider=doc.get("auth_provider", "email"),
                google_id=doc.get("google_id") or None,
                avatar_url=doc.get("avatar_url", ""),
            )
            user.password = hashed
            user.save()
        except Exception as e:
            logger.error("Failed Mongo JIT hydration during login for %s: %s", email, e)
            return None

        logger.info(
            "JIT-created shadow user %s from Mongo mirror during login (failover path).", email
        )
        return user

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        return token


class EmailClaimTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailClaimTokenObtainPairSerializer
    throttle_scope = "auth_login"


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth_register"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        data = UserSerializer(user).data
        data.update(TokenPairSerializer.for_user(user))
        return Response(data, status=status.HTTP_201_CREATED)


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """Token generator for email-confirmation links.

    The stock PasswordResetTokenGenerator hashes the password hash and
    last_login into the token, which is correct for password resets (using the
    link must invalidate it) but wrong here: it means a verification link dies
    the moment the user logs in, so signing in before clicking the emailed link
    made that link permanently invalid. Key off the flag this link actually
    flips instead, so the link stays valid until it is used.
    """

    def _make_hash_value(self, user, timestamp):
        verified = getattr(getattr(user, "profile", None), "email_verified", False)
        return f"{user.pk}{user.email}{timestamp}{verified}"


def _send_password_reset_email(user):
    token = PasswordResetTokenGenerator().make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    # Must point at the frontend's reset form, not the API endpoint — this
    # used to email a bare relative path ("/api/auth/password-reset/confirm/?…"),
    # which is not clickable in a mail client and, even pasted into a browser,
    # lands on a DRF endpoint that only accepts POST.
    reset_link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
    send_mail(
        "Reset your ExpectException password",
        f"Use this link to reset your password (valid for a limited time):\n\n{reset_link}\n\n"
        "If you did not request this, you can safely ignore this email.",
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
    )


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth_password_reset"

    def post(self, request):
        email = UserManager.normalize_email(request.data.get("email") or "")
        # One response for every outcome. Previously an unknown address got
        # "If the email exists…" while a known one got "Password reset email
        # sent.", which turned this endpoint into an account-existence oracle.
        generic_response = Response(
            {"detail": "If an account exists for that email, a reset link has been sent."}
        )
        if not email:
            return generic_response

        user = User.objects.filter(email__iexact=email).first()
        if user:
            try:
                _send_password_reset_email(user)
            except Exception as e:
                # Never surface SMTP failures — the timing/response difference
                # would leak existence just as the message text did.
                logger.error("Failed to send password reset email to %s: %s", email, e)
        return generic_response


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth_password_reset"

    def post(self, request):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError

        uidb64 = request.data.get("uid") or request.query_params.get("uid")
        token = request.data.get("token") or request.query_params.get("token")
        new_password = request.data.get("new_password")

        invalid = Response(
            {"detail": "This reset link is invalid or has expired."},
            status=status.HTTP_400_BAD_REQUEST,
        )
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except Exception:
            return invalid
        if not PasswordResetTokenGenerator().check_token(user, token):
            return invalid
        if not new_password:
            return Response({"detail": "Provide new_password"}, status=status.HTTP_400_BAD_REQUEST)

        # Registration runs the configured validators but this path did not, so
        # a reset was a way to set a password the signup form would reject.
        try:
            validate_password(new_password, user)
        except DjangoValidationError as e:
            return Response({"new_password": list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({"detail": "Password has been reset."})


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        uidb64 = request.query_params.get("uid")
        token = request.query_params.get("token")
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except Exception:
            return Response(
                {"detail": "This verification link is invalid or has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not EmailVerificationTokenGenerator().check_token(user, token):
            return Response(
                {"detail": "This verification link is invalid or has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Profile creation is a best-effort post_save signal that swallows its
        # own errors, so a user without one is reachable — this used to raise
        # RelatedObjectDoesNotExist and 500 on an otherwise valid link.
        profile, _ = Profile.objects.get_or_create(user=user)
        profile.email_verified = True
        profile.save(update_fields=["email_verified"])
        return Response({"detail": "Email verified."})


class LogoutView(APIView):
    """Revoke a refresh token so logging out actually ends the session.

    The frontend already pointed at /api/auth/logout/ but no such route
    existed (404), so "logging out" only cleared localStorage — the refresh
    token stayed valid for its full lifetime and anyone who had captured it
    could keep minting access tokens.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from rest_framework_simplejwt.exceptions import TokenError
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = request.data.get("refresh")
        if not refresh:
            return Response(
                {"detail": "Provide refresh token."}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            RefreshToken(refresh).blacklist()
        except TokenError:
            # Already expired/blacklisted — the client's intent is satisfied.
            pass
        except AttributeError:
            logger.warning(
                "Token blacklist app is not installed; logout could not revoke the refresh token."
            )
        return Response({"detail": "Logged out."})


class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, username, format=None):
        username = UserManager.normalize_email(username)
        user = get_object_or_404(User, email__iexact=username)
        # Anonymous/other viewers previously received the full UserSerializer
        # payload for any address they guessed — email and is_staff included —
        # which made this a working account-enumeration and admin-discovery
        # endpoint. Only the owner sees the private fields.
        if request.user.is_authenticated and request.user.pk == user.pk:
            return Response(UserSerializer(user, context={"request": request}).data)
        return Response(PublicUserSerializer(user, context={"request": request}).data)

    def put(self, request, username, format=None):
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED
            )
        if request.user.email != UserManager.normalize_email(username):
            return Response(
                {"detail": "Cannot update other user profile"}, status=status.HTTP_403_FORBIDDEN
            )
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class FollowToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        username = UserManager.normalize_email(username)
        target = get_object_or_404(User, email__iexact=username)
        if target.pk == request.user.pk:
            return Response(
                {"detail": "You cannot follow yourself."}, status=status.HTTP_400_BAD_REQUEST
            )
        profile, _ = Profile.objects.get_or_create(user=target)
        follower, _ = Profile.objects.get_or_create(user=request.user)
        if profile.followers.filter(pk=follower.pk).exists():
            profile.followers.remove(follower)
            return Response({"status": "unfollowed"})
        profile.followers.add(follower)
        return Response({"status": "followed"})


class GoogleAuthView(APIView):
    """Authenticate via Google Sign-In.

    Accepts the ID token returned by Google Identity Services (GSI)
    on the frontend, verifies it server-side, and returns JWT tokens.
    If the user doesn't exist yet, a new account is created automatically.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        credential = request.data.get("credential")
        if not credential:
            return Response(
                {"detail": "Google credential token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify the Google ID token
        google_data = verify_google_token(credential)
        if google_data is None:
            return Response(
                {"detail": "Invalid or expired Google token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Get or create the user
        try:
            user = get_or_create_google_user(google_data)
        except Exception as e:
            logger.error("Google auth user creation failed: %s", e, exc_info=True)
            return Response(
                {"detail": "Failed to create user account."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Issue JWT tokens
        tokens = TokenPairSerializer.for_user(user)
        data = UserSerializer(user).data
        data.update(tokens)

        logger.info("Google login successful for: %s", user.email)
        return Response(data, status=status.HTTP_200_OK)


# ── API Key Management ────────────────────────────────────────────────────────
from rest_framework.permissions import IsAuthenticated as _IsAuth
from rest_framework.views import APIView as _APIView

from .models import APIKey


class APIKeyListCreateView(_APIView):
    permission_classes = [_IsAuth]

    def get(self, request):
        keys = APIKey.objects.filter(user=request.user, is_active=True)
        data = [
            {
                "id": k.id,
                "name": k.name,
                "masked_key": k.masked_key,
                "scope": k.scope,
                "created_at": k.created_at,
                "last_used_at": k.last_used_at,
                "expires_at": k.expires_at,
            }
            for k in keys
        ]
        return Response(data)

    def post(self, request):
        name = request.data.get("name", "My Key")
        scope = request.data.get("scope", "full")
        if scope not in ("read", "full"):
            scope = "full"
        if APIKey.objects.filter(user=request.user, is_active=True).count() >= 10:
            return Response({"error": "Maximum 10 active API keys allowed."}, status=400)
        key = APIKey.objects.create(user=request.user, name=name, scope=scope)
        return Response(
            {"id": key.id, "name": key.name, "key": key.key, "scope": key.scope}, status=201
        )


class APIKeyDeleteView(_APIView):
    permission_classes = [_IsAuth]

    def delete(self, request, pk):
        try:
            key = APIKey.objects.get(pk=pk, user=request.user)
        except APIKey.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        key.is_active = False
        key.save(update_fields=["is_active"])
        return Response({"deleted": True})
