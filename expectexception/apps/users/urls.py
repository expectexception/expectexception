from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView,
    ProfileView,
    FollowToggleView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    VerifyEmailView,
    MeView,
    GoogleAuthView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify_email'),

    path('profiles/<str:username>/', ProfileView.as_view(), name='profile-detail'),
    path('profiles/<str:username>/follow/', FollowToggleView.as_view(), name='profile-follow'),
    path('profile/', MeView.as_view(), name='current-user-profile'),
    path('google/', GoogleAuthView.as_view(), name='google-auth'),
]
