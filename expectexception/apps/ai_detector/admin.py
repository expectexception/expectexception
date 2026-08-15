from django.contrib import admin
from .models import ImageAnalysis


@admin.register(ImageAnalysis)
class ImageAnalysisAdmin(admin.ModelAdmin):
    list_display = ('filename', 'is_ai_generated', 'confidence', 'user', 'created_at')
    list_filter = ('is_ai_generated', 'created_at')
    search_fields = ('filename', 'user__username')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
