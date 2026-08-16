"""Authorization tests for the admin API.

Every endpoint in admin_views is gated on IsAdminUser, which only checks
is_staff. These pin down that a staff account cannot use that access to take
over a superuser account.
"""
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class AdminUserManagementPrivilegeTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(email='staff@example.com', password='StaffPass123!')
        self.staff.is_staff = True
        self.staff.save()

        self.superuser = User.objects.create_superuser(
            email='root@example.com', password='RootPass123!'
        )
        self.victim = User.objects.create_user(email='victim@example.com', password='VictimPass123!')

    def test_staff_cannot_reset_a_superusers_password(self):
        self.client.force_authenticate(user=self.staff)
        r = self.client.patch(
            reverse('admin-user-detail', args=[self.superuser.pk]),
            {'password': 'AttackerChosen123!'},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.superuser.refresh_from_db()
        self.assertTrue(self.superuser.check_password('RootPass123!'))

    def test_staff_cannot_delete_a_superuser(self):
        self.client.force_authenticate(user=self.staff)
        r = self.client.delete(reverse('admin-user-detail', args=[self.superuser.pk]))
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(User.objects.filter(pk=self.superuser.pk).exists())

    def test_staff_cannot_grant_admin_access(self):
        self.client.force_authenticate(user=self.staff)
        r = self.client.patch(
            reverse('admin-user-detail', args=[self.victim.pk]),
            {'is_staff': True},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.victim.refresh_from_db()
        self.assertFalse(self.victim.is_staff)

    def test_superuser_can_manage_a_superuser(self):
        self.client.force_authenticate(user=self.superuser)
        other = User.objects.create_superuser(email='root2@example.com', password='RootPass123!')
        r = self.client.patch(
            reverse('admin-user-detail', args=[other.pk]),
            {'first_name': 'Renamed'},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_staff_can_still_manage_ordinary_users(self):
        self.client.force_authenticate(user=self.staff)
        r = self.client.patch(
            reverse('admin-user-detail', args=[self.victim.pk]),
            {'first_name': 'Edited', 'is_active': False},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.victim.refresh_from_db()
        self.assertEqual(self.victim.first_name, 'Edited')
        self.assertFalse(self.victim.is_active)

    def test_non_staff_is_rejected_entirely(self):
        self.client.force_authenticate(user=self.victim)
        r = self.client.get(reverse('admin-users'))
        self.assertIn(r.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))


class AdminUserCreationTests(APITestCase):
    def setUp(self):
        self.superuser = User.objects.create_superuser(
            email='root@example.com', password='RootPass123!'
        )
        self.client.force_authenticate(user=self.superuser)

    def test_rejects_case_variant_duplicate_email(self):
        User.objects.create_user(email='taken@example.com', password='StrongPass123!')
        r = self.client.post(
            reverse('admin-users'),
            {'email': 'TAKEN@example.com', 'password': 'StrongPass123!'},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.filter(email__iexact='taken@example.com').count(), 1)

    def test_rejects_weak_password(self):
        r = self.client.post(
            reverse('admin-users'),
            {'email': 'weak@example.com', 'password': '123'},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email='weak@example.com').exists())

    def test_normalizes_email_case_on_create(self):
        r = self.client.post(
            reverse('admin-users'),
            {'email': 'Mixed@Example.COM', 'password': 'StrongPass123!'},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['email'], 'mixed@example.com')

    def test_patch_rejects_email_collision(self):
        other = User.objects.create_user(email='other@example.com', password='StrongPass123!')
        target = User.objects.create_user(email='target@example.com', password='StrongPass123!')
        r = self.client.patch(
            reverse('admin-user-detail', args=[target.pk]),
            {'email': 'OTHER@example.com'},
            format='json',
        )
        # Previously assigned straight onto the model -> IntegrityError -> 500.
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        target.refresh_from_db()
        self.assertEqual(target.email, 'target@example.com')


class AdminUserListPaginationTests(APITestCase):
    def setUp(self):
        self.superuser = User.objects.create_superuser(
            email='root@example.com', password='RootPass123!'
        )
        self.client.force_authenticate(user=self.superuser)
        for i in range(15):
            User.objects.create_user(email=f'bulk{i}@example.com', password='StrongPass123!')

    def test_pagination_reports_total_and_limits_page(self):
        # Not a hardcoded number: a data migration seeds its own author account,
        # so the table is not empty at the start of the test.
        total = User.objects.count()
        r = self.client.get(reverse('admin-users'), {'page_size': 5, 'page': 1})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data['users']), 5)
        self.assertEqual(r.data['count'], total)
        self.assertEqual(r.data['num_pages'], (total + 4) // 5)

    def test_search_filters_server_side(self):
        r = self.client.get(reverse('admin-users'), {'search': 'bulk7'})
        self.assertEqual(r.data['count'], 1)
        self.assertEqual(r.data['users'][0]['email'], 'bulk7@example.com')

    def test_bad_pagination_params_do_not_error(self):
        r = self.client.get(reverse('admin-users'), {'page': 'abc', 'page_size': '-3'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)


class AdminLogsViewTests(APITestCase):
    def setUp(self):
        self.superuser = User.objects.create_superuser(
            email='root@example.com', password='RootPass123!'
        )
        self.client.force_authenticate(user=self.superuser)

    def test_rejects_arbitrary_file_names(self):
        r = self.client.get(reverse('admin-logs'), {'file': '../../db.sqlite3'})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_numeric_lines_does_not_500(self):
        r = self.client.get(reverse('admin-logs'), {'lines': 'abc'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
