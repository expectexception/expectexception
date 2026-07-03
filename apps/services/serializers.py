from rest_framework import serializers
from .models import Service, DownloadableResource, UserActivity, FavoriteTool, DownloadHistory

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = '__all__'

class DownloadableResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = DownloadableResource
        fields = (
            'id', 'name', 'file', 'category', 'size', 'downloads', 'version', 'created_at',
            'description', 'keywords', 'slug', 'seo_title', 'seo_description', 'cover_image'
        )
        read_only_fields = ('size', 'downloads', 'created_at')

class UserActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = UserActivity
        fields = ['id', 'action', 'details', 'ip_address', 'user_agent', 'execution_time', 'status', 'created_at']


class DownloadHistorySerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    file_size_formatted = serializers.CharField(read_only=True)
    duration_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = DownloadHistory
        fields = [
            'id', 'user', 'user_name', 'download_type', 'url', 'title', 
            'file_size', 'file_size_formatted', 'format', 'quality',
            'ip_address', 'status', 'error_message', 
            'duration_seconds', 'duration_formatted', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_user_name(self, obj):
        return obj.user.username if obj.user else 'Anonymous'
    
    def get_duration_formatted(self, obj):
        if not obj.duration_seconds:
            return "N/A"
        if obj.duration_seconds < 60:
            return f"{obj.duration_seconds:.1f}s"
        minutes = obj.duration_seconds / 60
        return f"{minutes:.1f}m"

class FavoriteToolSerializer(serializers.ModelSerializer):
    service = ServiceSerializer(read_only=True)
    service_id = serializers.PrimaryKeyRelatedField(queryset=Service.objects.all(), source='service', write_only=True)

    class Meta:
        model = FavoriteTool
        fields = ['id', 'service', 'service_id', 'created_at']
