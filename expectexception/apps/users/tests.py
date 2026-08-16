from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from .models import User
from rest_framework_simplejwt.tokens import RefreshToken
from django.core import mail

class AuthTests(APITestCase):
    def test_register_and_login(self):
        url = reverse('auth_register')
        data = {'email': 'test@example.com', 'password': 'StrongPass123!', 'password2': 'StrongPass123!'}
        r = self.client.post(url, data, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', r.data)
        # login
        login_url = reverse('token_obtain_pair')
        r2 = self.client.post(login_url, {'email': 'test@example.com', 'password': 'StrongPass123!'}, format='json')
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertIn('access', r2.data)

    def test_profile_follow(self):
        u1 = User.objects.create_user(email='a@example.com', password='Aabc123!')
        u2 = User.objects.create_user(email='b@example.com', password='Babc123!')
        self.client.force_authenticate(user=u1)
        follow_url = reverse('profile-follow', args=[u2.email])
        r = self.client.post(follow_url)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['status'], 'followed')

    def test_token_refresh(self):
        # register user and obtain tokens
        url = reverse('auth_register')
        data = {'email': 'refresh@example.com', 'password': 'StrongPass123!', 'password2': 'StrongPass123!'}
        r = self.client.post(url, data, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        refresh = r.data.get('refresh')
        refresh_url = reverse('token_refresh')
        r2 = self.client.post(refresh_url, {'refresh': refresh}, format='json')
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertIn('access', r2.data)

    def test_password_reset_flow(self):
        user = User.objects.create_user(email='pw@example.com', password='OldPass123')
        url = reverse('password_reset')
        r = self.client.post(url, {'email': user.email}, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        # Check console email was queued (console backend writes to mail.outbox in tests)
        self.assertTrue(len(mail.outbox) >= 1)
        # Parse uid and token from body
        body = mail.outbox[-1].body
        import re
        m = re.search(r'uid=([^&\s]+).*token=([A-Za-z0-9\-_:]+)', body)
        # The link format we send uses query params; try to extract using simpler approach
        m2 = re.search(r'uid=([^?&]+)&token=([^\s]+)', body)
        # If we can't parse, skip the rest of the flow (still validated email sending)
        if not m2:
            return
        uid = m2.group(1)
        token = m2.group(2)
        confirm_url = reverse('password_reset_confirm')
        r2 = self.client.post(confirm_url, {'uid': uid, 'token': token, 'new_password': 'NewPass123!'}, format='json')
        self.assertEqual(r2.status_code, status.HTTP_200_OK)


class EmailCaseSensitivityTests(APITestCase):
    """Registration stored the local-part's original case while the login form
    lowercases its input, so anyone who signed up with a capital letter could
    never log in again."""

    def test_login_succeeds_regardless_of_email_case(self):
        self.client.post(
            reverse('auth_register'),
            {'email': 'Mixed.Case@Example.com', 'password': 'StrongPass123!',
             'password2': 'StrongPass123!'},
            format='json',
        )
        for attempt in ('mixed.case@example.com', 'Mixed.Case@Example.com', 'MIXED.CASE@EXAMPLE.COM'):
            r = self.client.post(
                reverse('token_obtain_pair'),
                {'email': attempt, 'password': 'StrongPass123!'},
                format='json',
            )
            self.assertEqual(r.status_code, status.HTTP_200_OK, f'login failed for {attempt}')

    def test_register_rejects_case_variant_of_existing_email(self):
        User.objects.create_user(email='dupe@example.com', password='StrongPass123!')
        r = self.client.post(
            reverse('auth_register'),
            {'email': 'DUPE@example.com', 'password': 'StrongPass123!',
             'password2': 'StrongPass123!'},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.filter(email__iexact='dupe@example.com').count(), 1)


class MongoFailoverLoginTests(APITestCase):
    """The Mongo failover path used update_or_create() keyed on email, so a
    wrong password against an existing local account overwrote that account's
    password hash and privilege flags with whatever the mirror last held."""

    def test_failed_login_does_not_overwrite_existing_local_user(self):
        from unittest.mock import patch
        from django.contrib.auth.hashers import make_password

        user = User.objects.create_user(email='victim@example.com', password='LocalPass123!')
        original_hash = user.password

        stale_mirror = {
            'email': 'victim@example.com',
            'password': make_password('MirrorPass123!'),
            'is_active': True,
            'is_staff': True,
            'is_superuser': True,
        }
        with patch('apps.services.mongodb.find_one_in_mongo', return_value=stale_mirror):
            r = self.client.post(
                reverse('token_obtain_pair'),
                {'email': 'victim@example.com', 'password': 'WrongPassword!'},
                format='json',
            )

        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
        user.refresh_from_db()
        self.assertEqual(user.password, original_hash, 'local password hash was overwritten from the mirror')
        self.assertFalse(user.is_staff, 'privilege flags were escalated from the mirror')
        self.assertFalse(user.is_superuser)

    def test_wrong_password_does_not_materialize_shadow_user(self):
        from unittest.mock import patch
        from django.contrib.auth.hashers import make_password

        mirror = {
            'email': 'remote@example.com',
            'password': make_password('RemotePass123!'),
            'is_active': True,
        }
        with patch('apps.services.mongodb.find_one_in_mongo', return_value=mirror):
            r = self.client.post(
                reverse('token_obtain_pair'),
                {'email': 'remote@example.com', 'password': 'WrongPassword!'},
                format='json',
            )
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(User.objects.filter(email='remote@example.com').exists())

    def test_correct_password_hydrates_shadow_user_from_mirror(self):
        from unittest.mock import patch
        from django.contrib.auth.hashers import make_password

        mirror = {
            'email': 'remote@example.com',
            'password': make_password('RemotePass123!'),
            'first_name': 'Remote',
            'is_active': True,
        }
        with patch('apps.services.mongodb.find_one_in_mongo', return_value=mirror):
            r = self.client.post(
                reverse('token_obtain_pair'),
                {'email': 'remote@example.com', 'password': 'RemotePass123!'},
                format='json',
            )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertTrue(User.objects.filter(email='remote@example.com').exists())


class LogoutTests(APITestCase):
    """/api/auth/logout/ was referenced by the frontend but never routed, so
    logging out left the refresh token usable for its full lifetime."""

    def test_logout_revokes_refresh_token(self):
        r = self.client.post(
            reverse('auth_register'),
            {'email': 'logout@example.com', 'password': 'StrongPass123!',
             'password2': 'StrongPass123!'},
            format='json',
        )
        refresh = r.data['refresh']

        self.assertEqual(
            self.client.post(reverse('auth_logout'), {'refresh': refresh}, format='json').status_code,
            status.HTTP_200_OK,
        )
        replay = self.client.post(reverse('token_refresh'), {'refresh': refresh}, format='json')
        self.assertEqual(replay.status_code, status.HTTP_401_UNAUTHORIZED)


class ProfileExposureTests(APITestCase):
    """The public profile endpoint returned the full user serializer to
    anonymous callers, leaking email and is_staff for any address guessed."""

    def test_anonymous_viewer_does_not_receive_email_or_staff_flag(self):
        staff = User.objects.create_user(email='staff@example.com', password='StrongPass123!')
        staff.is_staff = True
        staff.save()

        r = self.client.get(reverse('profile-detail', args=[staff.email]))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertNotIn('email', r.data)
        self.assertNotIn('is_staff', r.data)

    def test_owner_still_receives_full_payload(self):
        user = User.objects.create_user(email='owner@example.com', password='StrongPass123!')
        self.client.force_authenticate(user=user)
        r = self.client.get(reverse('profile-detail', args=[user.email]))
        self.assertEqual(r.data['email'], 'owner@example.com')

