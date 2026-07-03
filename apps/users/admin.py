from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import User
from apps.profiles.models import Profile


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    model = User
    list_display = ('email', 'auth_provider', 'is_staff', 'is_superuser')
    list_filter = ('auth_provider', 'is_staff', 'is_superuser', 'is_active')
    ordering = ('email',)
    search_fields = ('email', 'first_name', 'last_name', 'google_id')
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'avatar_url')}),
        ('Google OAuth', {'fields': ('google_id', 'auth_provider')}),
        ('Permissions', {'fields': ('is_staff', 'is_superuser', 'groups')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('email', 'password1', 'password2')}),
    )


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'website')
    search_fields = ('user__email',)
