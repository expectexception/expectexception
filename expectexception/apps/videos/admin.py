from django.contrib import admin
from .models import VideoDownload


@admin.register(VideoDownload)
class VideoDownloadAdmin(admin.ModelAdmin):
    list_display = ('id', 'url', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('url',)
