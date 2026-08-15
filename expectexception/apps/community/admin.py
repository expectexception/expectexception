from django.contrib import admin
from .models import Category, Thread, Reply, Vote


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'order']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Thread)
class ThreadAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'category', 'is_pinned', 'is_solved', 'reply_count', 'created_at']
    list_filter = ['is_pinned', 'is_closed', 'is_solved', 'category']
    search_fields = ['title', 'body']
    readonly_fields = ['view_count', 'vote_count', 'reply_count', 'slug']


@admin.register(Reply)
class ReplyAdmin(admin.ModelAdmin):
    list_display = ['author', 'thread', 'is_accepted_answer', 'vote_count', 'created_at']
    list_filter = ['is_accepted_answer']


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ['user', 'thread', 'reply', 'value', 'created_at']
