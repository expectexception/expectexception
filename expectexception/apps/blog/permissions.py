from rest_framework import permissions


class IsAuthorOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request for published posts
        if request.method in permissions.SAFE_METHODS:
            if hasattr(obj, 'status'):
                # If it's a Post, only allow reading published posts to anonymous users
                if obj.status == 'published':
                    return True
                return request.user and request.user.is_authenticated
            return True
        # Write permissions only to the author
        return obj.author == request.user


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff
