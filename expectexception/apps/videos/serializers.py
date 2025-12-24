from rest_framework import serializers
from .models import VideoDownload


class ExtractRequestSerializer(serializers.Serializer):
    url = serializers.URLField()


class FormatSerializer(serializers.Serializer):
    format_id = serializers.CharField()
    ext = serializers.CharField()
    format_note = serializers.CharField(allow_blank=True)
    filesize = serializers.IntegerField(required=False, allow_null=True)


class VideoDownloadSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoDownload
        fields = ('id', 'url', 'format_id', 'filename', 'file_path', 'file_size', 'status', 'error', 'extra', 'created_at')
        read_only_fields = ('id', 'filename', 'file_path', 'file_size', 'status', 'error', 'extra', 'created_at')
