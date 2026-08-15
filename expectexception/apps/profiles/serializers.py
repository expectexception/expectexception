from rest_framework import serializers
from django.conf import settings
from .models import Profile

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['id', 'user', 'bio', 'avatar', 'website', 'followers', 'email_verified', 'reputation', 'badges']
        read_only_fields = ['user']

    def update(self, instance, validated_data):
        # handle avatar upload if needed
        return super().update(instance, validated_data)
