"""Serializers for contact inquiries."""
from rest_framework import serializers
from .models import ContactInquiry


class ContactInquirySerializer(serializers.ModelSerializer):
    """Serializer for creating contact inquiries from frontend."""
    
    class Meta:
        model = ContactInquiry
        fields = [
            'name',
            'email',
            'inquiry_type',
            'subject',
            'message',
            'project_type',
            'budget',
        ]
    
    def validate_email(self, value):
        """Normalize email to lowercase."""
        return value.lower().strip()
    
    def validate_name(self, value):
        """Strip whitespace from name."""
        return value.strip()


class ContactInquiryResponseSerializer(serializers.Serializer):
    """Response serializer for contact form submission."""
    success = serializers.BooleanField()
    message = serializers.CharField()
    inquiry_id = serializers.IntegerField(required=False)
