from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .session_views import SessionListView, SessionRevokeView, SessionRevokeAllView
from .views import (
    RegisterView,
    ProfileView,
    FollowToggleView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    VerifyEmailView,
    MeView,
    GoogleAuthView,
    APIKeyListCreateView,
    APIKeyDeleteView,
    EmailClaimTokenObtainPairView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', EmailClaimTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify_email'),

    path('profiles/<str:username>/', ProfileView.as_view(), name='profile-detail'),
    path('profiles/<str:username>/follow/', FollowToggleView.as_view(), name='profile-follow'),
    path('profile/', MeView.as_view(), name='current-user-profile'),
    path('google/', GoogleAuthView.as_view(), name='google-auth'),

    # API Key management
    path('api-keys/', APIKeyListCreateView.as_view(), name='api-keys-list'),
    path('api-keys/<int:pk>/', APIKeyDeleteView.as_view(), name='api-keys-delete'),

    # Session management
    path('sessions/', SessionListView.as_view(), name='session-list'),
    path('sessions/revoke-all/', SessionRevokeAllView.as_view(), name='session-revoke-all'),
    path('sessions/<str:session_id>/', SessionRevokeView.as_view(), name='session-revoke'),
]
