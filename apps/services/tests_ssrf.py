"""SSRF protection tests for the user-supplied-URL tools.

UrlDownloaderView is unauthenticated and streams the fetched body straight
back to the caller, so an unvalidated target let anyone read cloud metadata
(169.254.169.254), loopback services, and internal hosts through the server.
"""
from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


BLOCKED_TARGETS = [
    'http://169.254.169.254/latest/meta-data/iam/security-credentials/',  # cloud metadata
    'http://127.0.0.1:6379/',        # loopback (redis)
    'http://localhost:8000/admin/',  # loopback by name
    'http://10.0.0.5/internal',      # RFC1918
    'http://192.168.1.1/',           # RFC1918
    'http://[::1]:8000/',            # IPv6 loopback
    'file:///etc/passwd',            # non-http scheme
    'gopher://127.0.0.1:6379/_INFO',  # non-http scheme
]


class UrlDownloaderSSRFTests(APITestCase):
    def setUp(self):
        self.url = reverse('url-downloader')

    def test_blocked_targets_are_refused_without_any_request(self):
        for target in BLOCKED_TARGETS:
            with self.subTest(target=target):
                # If validation is bypassed the patched sender records the call,
                # which is the actual failure we care about.
                # Patched at Session.request: requests.get/head/request all
                # funnel through it, so this catches the target being contacted
                # by any code path, not just the one in use today.
                with patch('requests.sessions.Session.request') as sender:
                    r = self.client.post(
                        self.url, {'url': target, 'action': 'check'}, format='json'
                    )
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                sender.assert_not_called()

    def test_download_action_is_also_protected(self):
        with patch('requests.sessions.Session.request') as sender:
            r = self.client.post(
                self.url,
                {'url': 'http://169.254.169.254/latest/meta-data/', 'action': 'download'},
                format='json',
            )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        sender.assert_not_called()

    def test_redirect_to_internal_host_is_blocked_mid_chain(self):
        """A public URL that 302s to the metadata endpoint must not be followed.

        This is why requests' own allow_redirects cannot be used here: it would
        validate only the first hop.
        """
        from apps.services.views import safe_public_request

        class FakeResponse:
            status_code = 302
            headers = {'Location': 'http://169.254.169.254/latest/meta-data/'}

            def close(self):
                pass

        with patch('apps.services.views.requests.request', return_value=FakeResponse()):
            with self.assertRaises(ValueError):
                safe_public_request('GET', 'https://example.com/redirect-me')


class WebsiteDiagnosticsSSRFTests(APITestCase):
    def test_internal_target_is_refused(self):
        r = self.client.post(
            reverse('website-diagnostics'),
            {'url': 'http://169.254.169.254/'},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


class FilenameSanitizationTests(APITestCase):
    def test_remote_filename_cannot_inject_into_content_disposition(self):
        from apps.services.views import UrlDownloaderView

        view = UrlDownloaderView()
        hostile = {'Content-Disposition': 'attachment; filename="eve.txt"\r\nX-Injected: yes"'}
        name = view._extract_filename('https://example.com/a.txt', hostile)
        self.assertNotIn('\r', name)
        self.assertNotIn('\n', name)
        self.assertNotIn('"', name)
