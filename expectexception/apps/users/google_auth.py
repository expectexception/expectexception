"""Google OAuth 2.0 token verification and user management."""
import logging
from typing import Optional, Dict, Any

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.conf import settings

from .models import User

logger = logging.getLogger(__name__)


def verify_google_token(credential: str) -> Optional[Dict[str, Any]]:
    """Verify a Google ID token and return the decoded payload.
    
    Args:
        credential: The ID token string from Google Sign-In.
    
    Returns:
        Dict with user info (sub, email, name, picture, etc.) or None on failure.
    """
    try:
        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )

        # Verify the issuer
        if idinfo['iss'] not in ('accounts.google.com', 'https://accounts.google.com'):
            logger.warning("Google token has invalid issuer: %s", idinfo['iss'])
            return None

        logger.info("Google token verified for email: %s", idinfo.get('email'))
        return {
            'sub': idinfo['sub'],               # Unique Google user ID
            'email': idinfo['email'],
            'email_verified': idinfo.get('email_verified', False),
            'first_name': idinfo.get('given_name', ''),
            'last_name': idinfo.get('family_name', ''),
            'full_name': idinfo.get('name', ''),
            'picture': idinfo.get('picture', ''),
        }

    except ValueError as e:
        logger.warning("Google token verification failed: %s", e)
        return None
    except Exception as e:
        logger.error("Unexpected error verifying Google token: %s", e, exc_info=True)
        return None


def get_or_create_google_user(google_data: Dict[str, Any]) -> User:
    """Find an existing user by Google ID or email, or create a new one.
    
    Priority:
        1. Match by google_id (returning Google user)
        2. Match by email (existing email user linking their Google account)
        3. Create a brand-new user
    
    Args:
        google_data: Decoded Google token payload from verify_google_token().
    
    Returns:
        User instance (created or existing).
    """
    google_id = google_data['sub']
    email = google_data['email']

    # 1. Try to find by google_id (fastest path for returning users)
    try:
        user = User.objects.get(google_id=google_id)
        # Update avatar in case it changed
        if google_data.get('picture') and user.avatar_url != google_data['picture']:
            user.avatar_url = google_data['picture']
            user.save(update_fields=['avatar_url'])
        logger.info("Existing Google user found: %s", email)
        return user
    except User.DoesNotExist:
        pass

    # 2. Try to find by email (user registered with email, now linking Google)
    try:
        user = User.objects.get(email=email)
        # Link Google account to existing user
        user.google_id = google_id
        user.auth_provider = 'google'
        if google_data.get('picture') and not user.avatar_url:
            user.avatar_url = google_data['picture']
        user.save(update_fields=['google_id', 'auth_provider', 'avatar_url'])
        logger.info("Linked Google account to existing user: %s", email)
        return user
    except User.DoesNotExist:
        pass

    # 3. Create a brand-new user
    user = User.objects.create_user(
        email=email,
        password=None,  # Google users don't need a password
        first_name=google_data.get('first_name', ''),
        last_name=google_data.get('last_name', ''),
        google_id=google_id,
        avatar_url=google_data.get('picture', ''),
        auth_provider='google',
    )
    logger.info("Created new Google user: %s", email)
    return user
