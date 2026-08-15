from rest_framework import serializers
from .models import ImageAnalysis


class ImageAnalysisSerializer(serializers.ModelSerializer):
    """
    Serializer for ImageAnalysis model
    """
    user_username = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ImageAnalysis
        fields = [
            'id',
            'user',
            'user_username',
            'image',
            'image_url',
            'filename',
            'is_ai_generated',
            'confidence',
            'metadata',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
    
    def get_image_url(self, obj):
        """Get the full URL for the image"""
        request = self.context.get('request')
        if obj.image and hasattr(obj.image, 'url'):
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class ImageUploadSerializer(serializers.Serializer):
    """
    Serializer for image upload
    """
    image = serializers.ImageField(required=True)
    
    # Supported formats - includes all common image formats
    ALLOWED_FORMATS = {
        'JPEG', 'JPG', 'PNG', 'WEBP', 'GIF', 'BMP', 'TIFF', 'TIF',
        'ICO', 'HEIC', 'HEIF', 'AVIF', 'PPM', 'PGM', 'PBM', 'PNM'
    }
    
    def validate_image(self, value):
        """Validate the uploaded image using Pillow for robust format detection"""
        from PIL import Image
        import io
        
        # Check file size (max 500MB for large images)
        max_size = 500 * 1024 * 1024  # 500MB
        if value.size > max_size:
            raise serializers.ValidationError(
                f"Image file too large. Maximum size is {max_size // (1024*1024)}MB"
            )
        
        # Validate using Pillow - most reliable method
        try:
            # Reset file pointer
            value.seek(0)
            
            # Try to open and verify the image
            img = Image.open(value)
            img.verify()  # Verify it's a valid image
            
            # Reset file pointer for downstream use
            value.seek(0)
            
            # Re-open to get format (verify() can close the image)
            img = Image.open(value)
            format_name = img.format
            
            if format_name is None:
                raise serializers.ValidationError("Could not determine image format")
            
            if format_name.upper() not in self.ALLOWED_FORMATS:
                raise serializers.ValidationError(
                    f"Unsupported image format '{format_name}'. "
                    f"Allowed formats: {', '.join(sorted(self.ALLOWED_FORMATS))}"
                )
            
            # Reset file pointer for downstream use
            value.seek(0)
            
        except serializers.ValidationError:
            raise
        except Exception as e:
            raise serializers.ValidationError(
                f"Invalid or corrupted image file: {str(e)}"
            )
        
        return value


class AnalysisResultSerializer(serializers.Serializer):
    """
    Serializer for detailed analysis results
    """
    id = serializers.IntegerField(read_only=True)
    filename = serializers.CharField()
    is_ai_generated = serializers.BooleanField()
    confidence = serializers.FloatField()
    label = serializers.CharField()
    all_scores = serializers.ListField(child=serializers.DictField())
    
    # Image properties
    image_url = serializers.URLField(allow_null=True)
    format = serializers.CharField(allow_null=True)
    dimensions = serializers.CharField(allow_null=True)
    size_bytes = serializers.IntegerField(allow_null=True)
    
    # Metadata
    exif_data = serializers.DictField(allow_null=True)
    image_stats = serializers.DictField(allow_null=True)
    
    # Timestamps
    created_at = serializers.DateTimeField()
