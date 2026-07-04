from rest_framework import serializers
from .models import User
from apps.profiles.models import Profile
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.tokens import RefreshToken


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ('id', 'bio', 'avatar', 'website', 'followers')
        read_only_fields = ('id', 'followers')


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    username = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'first_name', 'last_name', 'profile', 'is_staff',
                  'avatar_url', 'auth_provider')

    def get_username(self, obj):
        """Return email prefix as username since model uses email as identifier."""
        return obj.email.split('@')[0] if obj.email else ''


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('email', 'password', 'password2', 'first_name', 'last_name')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
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
        refresh['email'] = user.email
        return {'access': str(refresh.access_token), 'refresh': str(refresh)}


class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField()
