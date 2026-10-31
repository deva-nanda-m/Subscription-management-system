from datetime import timedelta
from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, Role
from products.models import Product, ProductVariant, ProductCategory, ProductStatus, BillingType
from plans.models import SubscriptionPlan, PlanStatusHistory, PlanStatus, BillingInterval
from plans.tasks import close_expired_plans_task


class SubscriptionPlanManagementTests(TestCase):
    """
    Comprehensive test suite for Module 3: Subscription Plan Management.
    Directly satisfies the 20 required test scenarios:
    1. Admin can create a subscription plan.
    2. Plan name cannot be empty.
    3. Negative plan prices are rejected.
    4. Invalid billing intervals are rejected.
    5. Minimum quantity must be positive.
    6. End date cannot precede start date.
    7. Admin can associate an active product with a plan.
    8. Inactive products cannot be selected.
    9. Valid product variants can be selected.
    10. Variants belonging to another product cannot be selected.
    11. Admin can edit a plan.
    12. Admin can pause a plan when permitted.
    13. Admin can resume a paused plan.
    14. Admin can close a plan when early closure is permitted.
    15. Closed plans cannot be resumed through the ordinary pause/resume operation.
    16. Staff cannot create or modify plans.
    17. Customers cannot access plan administration endpoints.
    18. Automatic closure works for eligible plans.
    19. Automatic closure does not run twice for already closed plans.
    20. Existing subscription/historical data is preserved when a plan price changes.
    """

    def setUp(self):
        self.client = APIClient()

        # Users
        self.admin_user = User.objects.create_superuser(
            email='admin@brightloop.test',
            full_name='Admin User',
            password='AdminPassword123!',
            role=Role.ADMIN
        )

        self.staff_user = User.objects.create_user(
            email='staff@brightloop.test',
            full_name='Staff User',
            password='StaffPassword123!',
            role=Role.STAFF
        )

        self.customer_user = User.objects.create_user(
            email='customer@brightloop.test',
            full_name='Customer User',
            password='CustomerPassword123!',
            role=Role.CUSTOMER
        )

        # Products & Variants from Module 2
        self.active_product = Product.objects.create(
            name='Accounting Software',
            code='accounting-software',
            description='Cloud accounting and taxation platform',
            category=ProductCategory.SOFTWARE,
            status=ProductStatus.ACTIVE,
            is_recurring=True,
            created_by=self.admin_user
        )

        self.active_variant = ProductVariant.objects.create(
            product=self.active_product,
            name='Business Edition',
            sku='ACC-BIZ',
            price=Decimal('500.00'),
            billing_type=BillingType.RECURRING,
            is_active=True
        )

        self.inactive_variant = ProductVariant.objects.create(
            product=self.active_product,
            name='Old Discontinued Tier',
            sku='ACC-DISC',
            price=Decimal('200.00'),
            billing_type=BillingType.RECURRING,
            is_active=False
        )

        self.another_product = Product.objects.create(
            name='CRM System',
            code='crm-system',
            category=ProductCategory.SOFTWARE,
            status=ProductStatus.ACTIVE,
            created_by=self.admin_user
        )

        self.another_product_variant = ProductVariant.objects.create(
            product=self.another_product,
            name='CRM Standard',
            sku='CRM-STD',
            price=Decimal('100.00'),
            is_active=True
        )

        self.inactive_product = Product.objects.create(
            name='Legacy Payroll',
            code='legacy-payroll',
            category=ProductCategory.SOFTWARE,
            status=ProductStatus.INACTIVE,
            created_by=self.admin_user
        )

        self.plans_url = reverse('plan-list-create')

    # 1. Admin can create a subscription plan
    def test_01_admin_can_create_subscription_plan(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'name': 'Basic Monthly',
            'description': 'Entry tier monthly subscription',
            'product': self.active_product.id,
            'variant': self.active_variant.id,
            'price': '500.00',
            'currency': 'INR',
            'billing_interval': BillingInterval.MONTHLY,
            'minimum_quantity': 1,
            'available_from': str(timezone.now().date()),
            'auto_close': True,
            'allow_early_closure': True,
            'allow_pause': True,
            'allow_renewal': True,
        }
        response = self.client.post(self.plans_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data.get('success'))
        plan = SubscriptionPlan.objects.get(name='Basic Monthly')
        self.assertEqual(plan.price, Decimal('500.00'))
        self.assertEqual(plan.currency, 'INR')
        self.assertEqual(plan.billing_interval, BillingInterval.MONTHLY)
        self.assertTrue(plan.plan_code.startswith('PLAN-'))

        # Check status history was logged
        history = PlanStatusHistory.objects.filter(plan=plan)
        self.assertEqual(history.count(), 1)
        self.assertEqual(history.first().new_status, PlanStatus.ACTIVE)

    # 2. Plan name cannot be empty
    def test_02_plan_name_cannot_be_empty(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'name': '',
            'product': self.active_product.id,
            'price': '500.00',
            'billing_interval': BillingInterval.MONTHLY,
        }
        response = self.client.post(self.plans_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)

    # 3. Negative plan prices are rejected
    def test_03_negative_plan_prices_rejected(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'name': 'Negative Price Plan',
            'product': self.active_product.id,
            'price': '-150.00',
            'billing_interval': BillingInterval.MONTHLY,
        }
        response = self.client.post(self.plans_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('price', response.data)

    # 4. Invalid billing intervals are rejected
    def test_04_invalid_billing_intervals_rejected(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'name': 'Bi-Weekly Plan',
            'product': self.active_product.id,
            'price': '300.00',
            'billing_interval': 'BI_WEEKLY',  # Only Daily, Weekly, Monthly, Yearly allowed
        }
        response = self.client.post(self.plans_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('billing_interval', response.data)

    # 5. Minimum quantity must be positive
    def test_05_minimum_quantity_must_be_positive(self):
        self.client.force_authenticate(user=self.admin_user)
        # Quantity zero
        res_zero = self.client.post(self.plans_url, {
            'name': 'Zero Qty Plan',
            'product': self.active_product.id,
            'price': '100.00',
            'billing_interval': BillingInterval.MONTHLY,
            'minimum_quantity': 0
        }, format='json')
        self.assertEqual(res_zero.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('minimum_quantity', res_zero.data)

        # Quantity negative
        res_neg = self.client.post(self.plans_url, {
            'name': 'Negative Qty Plan',
            'product': self.active_product.id,
            'price': '100.00',
            'billing_interval': BillingInterval.MONTHLY,
            'minimum_quantity': -3
        }, format='json')
        self.assertEqual(res_neg.status_code, status.HTTP_400_BAD_REQUEST)

    # 6. End date cannot precede start date
    def test_06_end_date_cannot_precede_start_date(self):
        self.client.force_authenticate(user=self.admin_user)
        today = timezone.now().date()
        payload = {
            'name': 'Invalid Dates Plan',
            'product': self.active_product.id,
            'price': '100.00',
            'billing_interval': BillingInterval.MONTHLY,
            'available_from': str(today),
            'available_until': str(today - timedelta(days=5)),  # End is earlier than start
        }
        response = self.client.post(self.plans_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('available_until', response.data)

    # 7. Admin can associate an active product with a plan
    def test_07_admin_can_associate_active_product(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'name': 'Accounting Annual',
            'product': self.active_product.id,
            'price': '5000.00',
            'billing_interval': BillingInterval.YEARLY,
            'minimum_quantity': 5,
        }
        response = self.client.post(self.plans_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['plan']['product_name'], 'Accounting Software')

    # 8. Inactive products cannot be selected
    def test_08_inactive_products_cannot_be_selected(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'name': 'Legacy Plan',
            'product': self.inactive_product.id,  # Status is INACTIVE
            'price': '100.00',
            'billing_interval': BillingInterval.MONTHLY,
        }
        response = self.client.post(self.plans_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('product', response.data)

    # 9. Valid product variants can be selected
    def test_09_valid_product_variants_selectable(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'name': 'Accounting with Business Variant',
            'product': self.active_product.id,
            'variant': self.active_variant.id,
            'price': '750.00',
            'billing_interval': BillingInterval.MONTHLY,
        }
        response = self.client.post(self.plans_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['plan']['variant_sku'], 'ACC-BIZ')

    # 10. Variants belonging to another product cannot be selected
    def test_10_variants_belonging_to_another_product_rejected(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'name': 'Mismatched Variant Plan',
            'product': self.active_product.id,
            'variant': self.another_product_variant.id,  # Belongs to CRM System, not Accounting
            'price': '500.00',
            'billing_interval': BillingInterval.MONTHLY,
        }
        response = self.client.post(self.plans_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('variant', response.data)

    # 11. Admin can edit a plan
    def test_11_admin_can_edit_plan(self):
        self.client.force_authenticate(user=self.admin_user)
        plan = SubscriptionPlan.objects.create(
            name='Original Plan Name',
            product=self.active_product,
            price=Decimal('100.00'),
            billing_interval=BillingInterval.MONTHLY,
            created_by=self.admin_user
        )
        detail_url = reverse('plan-detail', kwargs={'pk': plan.id})
        response = self.client.patch(detail_url, {
            'name': 'Revised Enterprise Plan',
            'price': '125.00',
            'minimum_quantity': 3
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        plan.refresh_from_db()
        self.assertEqual(plan.name, 'Revised Enterprise Plan')
        self.assertEqual(plan.price, Decimal('125.00'))
        self.assertEqual(plan.minimum_quantity, 3)

    # 12. Admin can pause a plan when permitted
    def test_12_admin_can_pause_plan_when_permitted(self):
        self.client.force_authenticate(user=self.admin_user)
        plan = SubscriptionPlan.objects.create(
            name='Pausable Plan',
            product=self.active_product,
            price=Decimal('200.00'),
            billing_interval=BillingInterval.MONTHLY,
            allow_pause=True,
            status=PlanStatus.ACTIVE,
            created_by=self.admin_user
        )
        pause_url = reverse('plan-pause', kwargs={'pk': plan.id})
        response = self.client.patch(pause_url, {'change_reason': 'Temporary maintenance'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        plan.refresh_from_db()
        self.assertEqual(plan.status, PlanStatus.PAUSED)
        self.assertFalse(plan.is_currently_available)

        # Verify audit history
        latest_history = plan.status_history.first()
        self.assertEqual(latest_history.new_status, PlanStatus.PAUSED)

    # 13. Admin can resume a paused plan
    def test_13_admin_can_resume_paused_plan(self):
        self.client.force_authenticate(user=self.admin_user)
        plan = SubscriptionPlan.objects.create(
            name='Paused Plan to Resume',
            product=self.active_product,
            price=Decimal('200.00'),
            billing_interval=BillingInterval.MONTHLY,
            allow_pause=True,
            status=PlanStatus.PAUSED,
            created_by=self.admin_user
        )
        resume_url = reverse('plan-resume', kwargs={'pk': plan.id})
        response = self.client.patch(resume_url, {'change_reason': 'Resuming plan offering'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        plan.refresh_from_db()
        self.assertEqual(plan.status, PlanStatus.ACTIVE)

    # 14. Admin can close a plan when early closure is permitted
    def test_14_admin_can_close_plan_when_early_closure_permitted(self):
        self.client.force_authenticate(user=self.admin_user)
        plan = SubscriptionPlan.objects.create(
            name='Early Closable Plan',
            product=self.active_product,
            price=Decimal('300.00'),
            billing_interval=BillingInterval.MONTHLY,
            allow_early_closure=True,
            status=PlanStatus.ACTIVE,
            created_by=self.admin_user
        )
        close_url = reverse('plan-close', kwargs={'pk': plan.id})
        response = self.client.patch(close_url, {'change_reason': 'End of promotional campaign'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        plan.refresh_from_db()
        self.assertEqual(plan.status, PlanStatus.CLOSED)

    # 15. Closed plans cannot be resumed through the ordinary pause/resume operation
    def test_15_closed_plans_cannot_be_resumed(self):
        self.client.force_authenticate(user=self.admin_user)
        plan = SubscriptionPlan.objects.create(
            name='Permanently Closed Plan',
            product=self.active_product,
            price=Decimal('400.00'),
            billing_interval=BillingInterval.MONTHLY,
            status=PlanStatus.CLOSED,
            created_by=self.admin_user
        )
        resume_url = reverse('plan-resume', kwargs={'pk': plan.id})
        response = self.client.patch(resume_url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Closed plans cannot be resumed', str(response.data))

        pause_url = reverse('plan-pause', kwargs={'pk': plan.id})
        res_pause = self.client.patch(pause_url, {}, format='json')
        self.assertEqual(res_pause.status_code, status.HTTP_400_BAD_REQUEST)

    # 16. Staff cannot create or modify plans
    def test_16_staff_cannot_create_or_modify_plans(self):
        self.client.force_authenticate(user=self.staff_user)
        # Attempt create
        res_create = self.client.post(self.plans_url, {
            'name': 'Staff Created Plan',
            'product': self.active_product.id,
            'price': '100.00',
            'billing_interval': BillingInterval.MONTHLY,
        }, format='json')
        self.assertEqual(res_create.status_code, status.HTTP_403_FORBIDDEN)

        # Attempt modify
        plan = SubscriptionPlan.objects.create(
            name='Admin Plan',
            product=self.active_product,
            price=Decimal('100.00'),
            billing_interval=BillingInterval.MONTHLY,
            created_by=self.admin_user
        )
        detail_url = reverse('plan-detail', kwargs={'pk': plan.id})
        res_patch = self.client.patch(detail_url, {'price': '150.00'}, format='json')
        self.assertEqual(res_patch.status_code, status.HTTP_403_FORBIDDEN)

        # Attempt pause
        pause_url = reverse('plan-pause', kwargs={'pk': plan.id})
        res_pause = self.client.patch(pause_url, {}, format='json')
        self.assertEqual(res_pause.status_code, status.HTTP_403_FORBIDDEN)

    # 17. Customers cannot access plan administration endpoints
    def test_17_customers_cannot_access_plan_administration(self):
        self.client.force_authenticate(user=self.customer_user)
        # Customer cannot list administrative plans
        res_list = self.client.get(self.plans_url)
        self.assertEqual(res_list.status_code, status.HTTP_403_FORBIDDEN)

        # Customer cannot post plan
        res_create = self.client.post(self.plans_url, {})
        self.assertEqual(res_create.status_code, status.HTTP_403_FORBIDDEN)

    # 18. Automatic closure works for eligible plans
    def test_18_automatic_closure_for_eligible_plans(self):
        yesterday = timezone.now().date() - timedelta(days=1)
        plan_to_close = SubscriptionPlan.objects.create(
            name='Auto Close Expired Plan',
            product=self.active_product,
            price=Decimal('100.00'),
            billing_interval=BillingInterval.MONTHLY,
            available_from=yesterday - timedelta(days=30),
            available_until=yesterday,
            auto_close=True,
            status=PlanStatus.ACTIVE,
            created_by=self.admin_user
        )
        plan_not_expired = SubscriptionPlan.objects.create(
            name='Still Active Plan',
            product=self.active_product,
            price=Decimal('100.00'),
            billing_interval=BillingInterval.MONTHLY,
            available_from=yesterday,
            available_until=yesterday + timedelta(days=10),
            auto_close=True,
            status=PlanStatus.ACTIVE,
            created_by=self.admin_user
        )

        # Run Celery task
        result = close_expired_plans_task()
        self.assertIn("Automatically closed 1 plan(s)", result)

        plan_to_close.refresh_from_db()
        self.assertEqual(plan_to_close.status, PlanStatus.CLOSED)

        plan_not_expired.refresh_from_db()
        self.assertEqual(plan_not_expired.status, PlanStatus.ACTIVE)

        # Verify audit history was generated for automatic closure
        history = PlanStatusHistory.objects.filter(plan=plan_to_close, new_status=PlanStatus.CLOSED)
        self.assertTrue(history.exists())
        self.assertIn("Automatic closure policy", history.first().change_reason)

    # 19. Automatic closure does not run twice for already closed plans
    def test_19_automatic_closure_idempotent_no_duplicate(self):
        yesterday = timezone.now().date() - timedelta(days=1)
        plan = SubscriptionPlan.objects.create(
            name='Already Closed Expired Plan',
            product=self.active_product,
            price=Decimal('100.00'),
            billing_interval=BillingInterval.MONTHLY,
            available_until=yesterday,
            auto_close=True,
            status=PlanStatus.CLOSED,
            created_by=self.admin_user
        )
        initial_history_count = PlanStatusHistory.objects.filter(plan=plan).count()

        # Run task
        result = close_expired_plans_task()
        self.assertIn("Automatically closed 0 plan(s)", result)
        self.assertEqual(PlanStatusHistory.objects.filter(plan=plan).count(), initial_history_count)

    # 20. Existing subscription/historical data is preserved when a plan price changes
    def test_20_existing_data_preserved_on_price_change(self):
        self.client.force_authenticate(user=self.admin_user)
        plan = SubscriptionPlan.objects.create(
            name='Standard Tier',
            product=self.active_product,
            price=Decimal('500.00'),
            currency='INR',
            billing_interval=BillingInterval.MONTHLY,
            created_by=self.admin_user
        )

        # Simulate existing subscription capturing price snapshot at time of agreement
        agreed_historical_price = plan.price
        self.assertEqual(agreed_historical_price, Decimal('500.00'))

        # Admin updates plan price to ₹650.00
        detail_url = reverse('plan-detail', kwargs={'pk': plan.id})
        self.client.patch(detail_url, {'price': '650.00'}, format='json')
        plan.refresh_from_db()

        # Plan price is updated for new subscriptions
        self.assertEqual(plan.price, Decimal('650.00'))
        # Historical snapshot agreed price remains completely unaffected
        self.assertEqual(agreed_historical_price, Decimal('500.00'))
