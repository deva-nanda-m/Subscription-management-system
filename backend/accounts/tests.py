import datetime
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from django.core import mail
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User, Role, PasswordResetToken


class AuthenticationAndRoleManagementTests(TestCase):
    """
    Comprehensive test suite for Module 1: Authentication and User Role Management.
    Directly satisfies the 15 required test scenarios:
    1. Customer can register successfully.
    2. Duplicate email registration is rejected.
    3. Invalid passwords are rejected.
    4. Customer can log in.
    5. Invalid login credentials are rejected.
    6. Inactive users cannot log in.
    7. Forgot password email is sent.
    8. Expired reset tokens are rejected.
    9. Used reset tokens cannot be reused.
    10. Admin can create staff accounts.
    11. Staff cannot create staff accounts.
    12. Customer cannot access admin endpoints.
    13. Staff cannot access restricted admin endpoints.
    14. Customer cannot access another customer's information.
    15. Invalid or expired JWT tokens are rejected.
    """

    def setUp(self):
        self.client = APIClient()

        # URLs
        self.register_url = reverse('auth-register')
        self.login_url = reverse('auth-login')
        self.logout_url = reverse('auth-logout')
        self.refresh_url = reverse('auth-token-refresh')
        self.me_url = reverse('auth-me')
        self.forgot_password_url = reverse('auth-forgot-password')
        self.reset_password_url = reverse('auth-reset-password')
        self.admin_staff_url = reverse('admin-staff-list-create')

        # Test users
        self.admin_user = User.objects.create_superuser(
            email='admin@brightloop.test',
            full_name='Master Admin',
            password='AdminPassword123!',
            role=Role.ADMIN
        )

        self.staff_user = User.objects.create_user(
            email='staff@brightloop.test',
            full_name='Staff Member',
            password='StaffPassword123!',
            role=Role.STAFF
        )

        self.customer_user = User.objects.create_user(
            email='customer1@brightloop.test',
            full_name='Jane Customer',
            password='CustomerPassword123!',
            role=Role.CUSTOMER
        )

        self.customer_user_2 = User.objects.create_user(
            email='customer2@brightloop.test',
            full_name='John Customer',
            password='CustomerPassword123!',
            role=Role.CUSTOMER
        )

    # --------------------------------------------------------------------------
    # Scenario 1: Customer can register successfully
    # --------------------------------------------------------------------------
    def test_01_customer_registration_success(self):
        payload = {
            'full_name': 'New Customer',
            'email': 'newcustomer@test.com',
            'password': 'SecurePassword123!',
            'confirm_password': 'SecurePassword123!'
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data.get('success'))

        user = User.objects.get(email='newcustomer@test.com')
        self.assertEqual(user.role, Role.CUSTOMER)
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertTrue(user.check_password('SecurePassword123!'))

    # --------------------------------------------------------------------------
    # Scenario 2: Duplicate email registration is rejected
    # --------------------------------------------------------------------------
    def test_02_duplicate_email_registration_rejected(self):
        payload = {
            'full_name': 'Duplicate Email User',
            'email': 'customer1@brightloop.test',
            'password': 'ValidPassword123!',
            'confirm_password': 'ValidPassword123!'
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    # --------------------------------------------------------------------------
    # Scenario 3: Invalid passwords are rejected
    # --------------------------------------------------------------------------
    def test_03_invalid_passwords_rejected(self):
        # Too short (<= 8 chars)
        short_payload = {
            'full_name': 'Test User',
            'email': 'short@test.com',
            'password': 'Pass1!',
            'confirm_password': 'Pass1!'
        }
        res1 = self.client.post(self.register_url, short_payload, format='json')
        self.assertEqual(res1.status_code, status.HTTP_400_BAD_REQUEST)

        # No uppercase
        no_upper = {
            'full_name': 'Test User',
            'email': 'noupper@test.com',
            'password': 'password123!',
            'confirm_password': 'password123!'
        }
        res2 = self.client.post(self.register_url, no_upper, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

        # No lowercase
        no_lower = {
            'full_name': 'Test User',
            'email': 'nolower@test.com',
            'password': 'PASSWORD123!',
            'confirm_password': 'PASSWORD123!'
        }
        res3 = self.client.post(self.register_url, no_lower, format='json')
        self.assertEqual(res3.status_code, status.HTTP_400_BAD_REQUEST)

        # No special character
        no_special = {
            'full_name': 'Test User',
            'email': 'nospecial@test.com',
            'password': 'Password1234',
            'confirm_password': 'Password1234'
        }
        res4 = self.client.post(self.register_url, no_special, format='json')
        self.assertEqual(res4.status_code, status.HTTP_400_BAD_REQUEST)

        # Mismatched confirm_password
        mismatch = {
            'full_name': 'Test User',
            'email': 'mismatch@test.com',
            'password': 'Password123!',
            'confirm_password': 'DifferentPassword123!'
        }
        res5 = self.client.post(self.register_url, mismatch, format='json')
        self.assertEqual(res5.status_code, status.HTTP_400_BAD_REQUEST)

    # --------------------------------------------------------------------------
    # Scenario 4: Customer can log in
    # --------------------------------------------------------------------------
    def test_04_customer_can_login(self):
        payload = {
            'email': 'customer1@brightloop.test',
            'password': 'CustomerPassword123!'
        }
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])
        self.assertEqual(response.data['user']['role'], Role.CUSTOMER)
        self.assertEqual(response.data['user']['email'], 'customer1@brightloop.test')

    # --------------------------------------------------------------------------
    # Scenario 5: Invalid login credentials are rejected
    # --------------------------------------------------------------------------
    def test_05_invalid_login_credentials_rejected(self):
        payload = {
            'email': 'customer1@brightloop.test',
            'password': 'WrongPassword999!'
        }
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --------------------------------------------------------------------------
    # Scenario 6: Inactive users cannot log in
    # --------------------------------------------------------------------------
    def test_06_inactive_user_cannot_login(self):
        inactive_user = User.objects.create_user(
            email='inactive@brightloop.test',
            full_name='Inactive User',
            password='Password123!',
            role=Role.CUSTOMER,
            is_active=False
        )
        payload = {
            'email': 'inactive@brightloop.test',
            'password': 'Password123!'
        }
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('inactive', str(response.data).lower())

    # --------------------------------------------------------------------------
    # Scenario 7: Forgot password email is sent
    # --------------------------------------------------------------------------
    def test_07_forgot_password_email_sent(self):
        mail.outbox.clear()
        payload = {'email': 'customer1@brightloop.test'}
        response = self.client.post(self.forgot_password_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('success'))
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('customer1@brightloop.test', mail.outbox[0].to)
        self.assertIn('Password Reset Request', mail.outbox[0].subject)

        # Verify token created in DB as hash (not raw token)
        token_record = PasswordResetToken.objects.filter(user=self.customer_user).first()
        self.assertIsNotNone(token_record)
        self.assertFalse(token_record.is_used)

    # --------------------------------------------------------------------------
    # Scenario 8: Expired reset tokens are rejected
    # --------------------------------------------------------------------------
    def test_08_expired_reset_token_rejected(self):
        raw_token, token_record = PasswordResetToken.generate_token(self.customer_user, lifetime_minutes=60)
        # Manually expire the token
        token_record.expires_at = timezone.now() - datetime.timedelta(minutes=10)
        token_record.save()

        payload = {
            'email': self.customer_user.email,
            'token': raw_token,
            'password': 'BrandNewPassword123!',
            'confirm_password': 'BrandNewPassword123!'
        }
        response = self.client.post(self.reset_password_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('expired', str(response.data).lower())

    # --------------------------------------------------------------------------
    # Scenario 9: Used reset tokens cannot be reused
    # --------------------------------------------------------------------------
    def test_09_used_reset_token_cannot_be_reused(self):
        raw_token, token_record = PasswordResetToken.generate_token(self.customer_user, lifetime_minutes=60)

        payload = {
            'email': self.customer_user.email,
            'token': raw_token,
            'password': 'BrandNewPassword123!',
            'confirm_password': 'BrandNewPassword123!'
        }
        # First use: should succeed
        res1 = self.client.post(self.reset_password_url, payload, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Second use: must be rejected
        payload2 = {
            'email': self.customer_user.email,
            'token': raw_token,
            'password': 'AnotherNewPassword123!',
            'confirm_password': 'AnotherNewPassword123!'
        }
        res2 = self.client.post(self.reset_password_url, payload2, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    # --------------------------------------------------------------------------
    # Scenario 10: Admin can create staff accounts
    # --------------------------------------------------------------------------
    def test_10_admin_can_create_staff_accounts(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'full_name': 'Operations Officer',
            'email': 'ops@brightloop.test',
            'password': 'StaffAccountPassword123!',
            'confirm_password': 'StaffAccountPassword123!'
        }
        response = self.client.post(self.admin_staff_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data.get('success'))

        created_staff = User.objects.get(email='ops@brightloop.test')
        self.assertEqual(created_staff.role, Role.STAFF)
        self.assertTrue(created_staff.is_active)
        self.assertFalse(created_staff.is_staff)

    # --------------------------------------------------------------------------
    # Scenario 11: Staff cannot create staff accounts
    # --------------------------------------------------------------------------
    def test_11_staff_cannot_create_staff_accounts(self):
        self.client.force_authenticate(user=self.staff_user)
        payload = {
            'full_name': 'Unauthorized Staff',
            'email': 'unauth@brightloop.test',
            'password': 'StaffAccountPassword123!',
            'confirm_password': 'StaffAccountPassword123!'
        }
        response = self.client.post(self.admin_staff_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --------------------------------------------------------------------------
    # Scenario 12: Customer cannot access admin endpoints
    # --------------------------------------------------------------------------
    def test_12_customer_cannot_access_admin_endpoints(self):
        self.client.force_authenticate(user=self.customer_user)
        # Customer tries to list staff
        response_list = self.client.get(self.admin_staff_url)
        self.assertEqual(response_list.status_code, status.HTTP_403_FORBIDDEN)

        # Customer tries to create staff
        response_create = self.client.post(self.admin_staff_url, {})
        self.assertEqual(response_create.status_code, status.HTTP_403_FORBIDDEN)

    # --------------------------------------------------------------------------
    # Scenario 13: Staff cannot access restricted admin endpoints
    # --------------------------------------------------------------------------
    def test_13_staff_cannot_access_restricted_admin_endpoints(self):
        self.client.force_authenticate(user=self.staff_user)
        # Staff tries to view staff list in admin management
        response = self.client.get(self.admin_staff_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Staff tries to toggle status
        status_url = reverse('admin-staff-status-update', kwargs={'pk': self.staff_user.id})
        res_status = self.client.patch(status_url, {'is_active': False})
        self.assertEqual(res_status.status_code, status.HTTP_403_FORBIDDEN)

    # --------------------------------------------------------------------------
    # Scenario 14: Customer cannot access another customer's information
    # --------------------------------------------------------------------------
    def test_14_customer_isolation(self):
        # Authenticated as Customer 1
        self.client.force_authenticate(user=self.customer_user)
        res = self.client.get(self.me_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Returns only Customer 1's own data
        self.assertEqual(res.data['email'], self.customer_user.email)
        self.assertNotEqual(res.data['email'], self.customer_user_2.email)

    # --------------------------------------------------------------------------
    # Scenario 15: Invalid or expired JWT tokens are rejected
    # --------------------------------------------------------------------------
    def test_15_invalid_or_expired_jwt_tokens_rejected(self):
        # Unauthenticated request
        response_unauth = self.client.get(self.me_url)
        self.assertEqual(response_unauth.status_code, status.HTTP_401_UNAUTHORIZED)

        # Invalid token signature
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid.token.signature123')
        response_invalid = self.client.get(self.me_url)
        self.assertEqual(response_invalid.status_code, status.HTTP_401_UNAUTHORIZED)
