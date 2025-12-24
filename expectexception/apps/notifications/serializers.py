from rest_framework import serializers
from .models import PushSubscription


class PushSubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for push subscription data"""
    
    class Meta:
        model = PushSubscription
        fields = ['id', 'endpoint', 'p256dh_key', 'auth_key', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        # Add request metadata if available
        request = self.context.get('request')
        if request:
            validated_data['user_agent'] = request.META.get('HTTP_USER_AGENT', '')
            validated_data['ip_address'] = request.META.get('REMOTE_ADDR')
            
            # Link to user if authenticated
            if request.user.is_authenticated:
                validated_data['user'] = request.user
        
        # Update existing subscription if endpoint exists
        endpoint = validated_data.get('endpoint')
        existing = PushSubscription.objects.filter(endpoint=endpoint).first()
        
        if existing:
            # Update existing subscription
            for key, value in validated_data.items():
                setattr(existing, key, value)
            existing.is_active = True
            existing.save()
            return existing
        
        return super().create(validated_data)
