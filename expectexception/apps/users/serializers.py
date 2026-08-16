from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.profiles.models import Profile

from .models import User


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ("id", "bio", "avatar", "website", "followers")
        read_only_fields = ("id", "followers")


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    username = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "display_name",
            "profile",
            "is_staff",
            "avatar_url",
            "auth_provider",
        )

    def get_username(self, obj):
        """Return email prefix as username since model uses email as identifier."""
        return obj.email.split("@")[0] if obj.email else ""

    def get_display_name(self, obj):
        """A public-facing name that's safe to render as a byline.

        first_name/last_name are blank on the accounts that author seeded
        content, so the frontend used to fall back to obj.email directly —
        showing a raw email address (in one case the site owner's own
        personal address) as the author of every blog post. Never derive
        this from email; every consumer that needs a byline should use it
        instead of `.email`.
        """
        full_name = f"{obj.first_name} {obj.last_name}".strip()
        return full_name or "Admin"


class PublicUserSerializer(serializers.ModelSerializer):
    """Profile fields safe to expose to anyone but the account owner.

    Deliberately omits email, is_staff and auth_provider — see ProfileView.
    """

    profile = ProfileSerializer(read_only=True)
    username = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "profile", "avatar_url")

    def get_username(self, obj):
        return obj.email.split("@")[0] if obj.email else ""


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ("email", "password", "password2", "first_name", "last_name")

    def validate_email(self, value):
        from .models import UserManager

        email = UserManager.normalize_email(value)
        # The model's unique=True gives DRF a case-sensitive uniqueness check
        # only, so "A@x.com" sailed past it and became a second account for
        # someone who already had "a@x.com".
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        return user


class TokenPairSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()

    @staticmethod
    def for_user(user):
        refresh = RefreshToken.for_user(user)
        # Embed email so JITMongoJWTAuthentication can detect cross-instance
        # id collisions (Render/local assign pks independently) even when the
        # pk already resolves to *some* local user — see apps/users/authentication.py.
        refresh["email"] = user.email
        return {"access": str(refresh.access_token), "refresh": str(refresh)}


class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField()
