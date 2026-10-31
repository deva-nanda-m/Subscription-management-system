from decimal import Decimal
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User, Role
from products.models import Product, ProductVariant, ProductCategory, ProductStatus
from plans.models import SubscriptionPlan, BillingInterval, PlanStatus
from quotations.models import Quotation, QuotationLineItem, QuotationStatus
from .models import (
    Subscription,
    SubscriptionItem,
    SubscriptionStatus,
    SubscriptionStatusHistory,
    SubscriptionPauseHistory,
    SubscriptionRenewal,
)


class SubscriptionModuleTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.admin = User.objects.create_user(
            email='admin.sub@brightloop.io',
            full_name='Admin User',
            password='AdminPassword123!',
            role=Role.ADMIN
        )
        self.staff = User.objects.create_user(
            email='staff.sub@brightloop.io',
            full_name='Staff User',
            password='StaffPassword123!',
            role=Role.STAFF
        )
        self.customer = User.objects.create_user(
            email='customer.sub@brightloop.io',
            full_name='Customer Alpha',
            password='CustomerPass123!',
            role=Role.CUSTOMER
        )
        self.other_customer = User.objects.create_user(
            email='other.sub@brightloop.io',
            full_name='Customer Beta',
            password='CustomerPass123!',
            role=Role.CUSTOMER
        )

        # Product & Variant
        self.product = Product.objects.create(
            name='Analytics Cloud Platform',
            code='ANL-001',
            category=ProductCategory.SOFTWARE,
            status=ProductStatus.ACTIVE,
            created_by=self.admin
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            name='Growth Tier',
            sku='ANL-GRW-01',
            price=Decimal('150.00'),
            is_active=True
        )

        # Subscription Plan
        self.plan = SubscriptionPlan.objects.create(
            name='Growth Monthly Plan',
            product=self.product,
            variant=self.variant,
            price=Decimal('1200.00'),
            currency='USD',
            billing_interval=BillingInterval.MONTHLY,
            minimum_quantity=1,
            available_from=timezone.localdate(),
            allow_pause=True,
            allow_early_closure=True,
            allow_renewal=True,
            status=PlanStatus.ACTIVE,
            created_by=self.admin
        )

        # Create a confirmed quotation ready for conversion
        self.confirmed_quotation = Quotation.objects.create(
            customer=self.customer,
            quotation_date=timezone.localdate(),
            validity_days=30,
            status=QuotationStatus.CONFIRMED,
            created_by=self.staff
        )
        QuotationLineItem.objects.create(
            quotation=self.confirmed_quotation,
            product=self.product,
            variant=self.variant,
            plan=self.plan,
            quantity=2,
            unit_price=Decimal('1200.00'),
            tax_rate=Decimal('18.00')
        )
        self.confirmed_quotation.calculate_totals()

    def test_01_atomic_conversion_from_confirmed_quotation(self):
        """Staff converts confirmed quotation; creates subscription in CONFIRMED status."""
        self.client.force_authenticate(user=self.staff)

        payload = {
            "start_date": str(timezone.localdate()),
            "payment_terms": "Net 15"
        }
        res = self.client.post(
            f'/api/subscriptions/convert/{self.confirmed_quotation.id}/',
            payload,
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        sub_id = res.data['id']

        sub = Subscription.objects.get(pk=sub_id)
        self.assertEqual(sub.customer, self.customer)
        self.assertEqual(sub.source_quotation, self.confirmed_quotation)
        self.assertEqual(sub.status, SubscriptionStatus.CONFIRMED)
        self.assertEqual(sub.subtotal, self.confirmed_quotation.subtotal)
        self.assertEqual(sub.tax_amount, self.confirmed_quotation.tax_amount)
        self.assertEqual(sub.total_amount, self.confirmed_quotation.grand_total)
        self.assertEqual(sub.items.count(), 1)

        # Check line item snapshots
        item = sub.items.first()
        self.assertEqual(item.product_name, self.product.name)
        self.assertEqual(item.variant_name, self.variant.name)
        self.assertEqual(item.plan_name, self.plan.name)
        self.assertEqual(item.quantity, 2)
        self.assertEqual(item.unit_price, Decimal('1200.00'))

        # Check quotation converted flag
        self.confirmed_quotation.refresh_from_db()
        self.assertTrue(self.confirmed_quotation.is_converted)

    def test_02_duplicate_conversion_prevention(self):
        """Converting an already-converted quotation must be strictly rejected."""
        self.client.force_authenticate(user=self.staff)

        # First conversion
        self.client.post(f'/api/subscriptions/convert/{self.confirmed_quotation.id}/', {})

        # Duplicate conversion attempt
        res_dup = self.client.post(f'/api/subscriptions/convert/{self.confirmed_quotation.id}/', {})
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already been converted", res_dup.data['detail'])

    def test_03_cannot_convert_unconfirmed_quotations(self):
        """Draft, Quotation (issued), and Expired quotations cannot be converted."""
        self.client.force_authenticate(user=self.staff)

        # Draft
        draft_q = Quotation.objects.create(
            customer=self.customer,
            quotation_date=timezone.localdate(),
            validity_days=30,
            status=QuotationStatus.DRAFT,
            created_by=self.staff
        )
        QuotationLineItem.objects.create(
            quotation=draft_q,
            product=self.product,
            plan=self.plan,
            quantity=1,
            unit_price=Decimal('100.00')
        )
        draft_q.calculate_totals()

        res_draft = self.client.post(f'/api/subscriptions/convert/{draft_q.id}/', {})
        self.assertEqual(res_draft.status_code, status.HTTP_400_BAD_REQUEST)

    def test_04_activation_and_future_date_restriction(self):
        """Future-dated subscriptions cannot be activated before start date."""
        self.client.force_authenticate(user=self.staff)

        # Create subscription with future start date
        future_date = timezone.localdate() + timedelta(days=15)
        res = self.client.post(
            f'/api/subscriptions/convert/{self.confirmed_quotation.id}/',
            {"start_date": str(future_date)},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        sub = Subscription.objects.get(pk=res.data['id'])

        # Try to activate early
        res_act_early = self.client.post(f'/api/subscriptions/{sub.id}/activate/')
        self.assertEqual(res_act_early.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cannot be activated before its start date", res_act_early.data['detail'])

        # Backdate start date to today and activate
        sub.start_date = timezone.localdate()
        sub.save()

        res_act = self.client.post(f'/api/subscriptions/{sub.id}/activate/')
        self.assertEqual(res_act.status_code, status.HTTP_200_OK)
        sub.refresh_from_db()
        self.assertEqual(sub.status, SubscriptionStatus.ACTIVE)
        self.assertIsNotNone(sub.activation_date)
        self.assertIsNotNone(sub.next_billing_date)

    def test_05_pause_and_resume_operations(self):
        """Test pausing, verifying plan allow_pause, and resuming."""
        self.client.force_authenticate(user=self.staff)

        # Convert and activate
        res = self.client.post(
            f'/api/subscriptions/convert/{self.confirmed_quotation.id}/',
            {"start_date": str(timezone.localdate())},
            format='json'
        )
        sub = Subscription.objects.get(pk=res.data['id'])
        sub.transition_status(SubscriptionStatus.ACTIVE)

        # 1. Pause
        res_pause = self.client.post(f'/api/subscriptions/{sub.id}/pause/', {'reason': 'Customer requested hiatus.'})
        self.assertEqual(res_pause.status_code, status.HTTP_200_OK)
        sub.refresh_from_db()
        self.assertTrue(sub.is_paused)
        self.assertEqual(sub.pause_history.count(), 1)

        # 2. Cannot pause already paused
        res_pause_again = self.client.post(f'/api/subscriptions/{sub.id}/pause/')
        self.assertEqual(res_pause_again.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Resume
        res_resume = self.client.post(f'/api/subscriptions/{sub.id}/resume/')
        self.assertEqual(res_resume.status_code, status.HTTP_200_OK)
        sub.refresh_from_db()
        self.assertFalse(sub.is_paused)
        self.assertIsNotNone(sub.pause_history.first().resumed_date)

    def test_06_renewal_generates_linked_subscription(self):
        """Renewal creates new linked subscription and records SubscriptionRenewal."""
        self.client.force_authenticate(user=self.staff)

        res = self.client.post(
            f'/api/subscriptions/convert/{self.confirmed_quotation.id}/',
            {"start_date": str(timezone.localdate())},
            format='json'
        )
        sub = Subscription.objects.get(pk=res.data['id'])

        # Renew
        res_renew = self.client.post(
            f'/api/subscriptions/{sub.id}/renew/',
            {"reason": "Annual corporate agreement renewal."},
            format='json'
        )
        self.assertEqual(res_renew.status_code, status.HTTP_201_CREATED)
        renewed_id = res_renew.data['id']
        renewed_sub = Subscription.objects.get(pk=renewed_id)

        # Check renewal link
        self.assertEqual(sub.renewals_out.count(), 1)
        renewal_link = sub.renewals_out.first()
        self.assertEqual(renewal_link.renewed_subscription, renewed_sub)
        self.assertEqual(renewed_sub.items.count(), sub.items.count())

    def test_07_closed_subscription_is_terminal(self):
        """Closed subscriptions cannot be paused, resumed, or reopened."""
        self.client.force_authenticate(user=self.staff)

        res = self.client.post(
            f'/api/subscriptions/convert/{self.confirmed_quotation.id}/',
            {"start_date": str(timezone.localdate())},
            format='json'
        )
        sub = Subscription.objects.get(pk=res.data['id'])
        sub.transition_status(SubscriptionStatus.ACTIVE)

        # Close
        res_close = self.client.post(f'/api/subscriptions/{sub.id}/close/', {'reason': 'Contract terminated.'})
        self.assertEqual(res_close.status_code, status.HTTP_200_OK)
        sub.refresh_from_db()
        self.assertEqual(sub.status, SubscriptionStatus.CLOSED)

        # Attempt to pause closed subscription
        res_p = self.client.post(f'/api/subscriptions/{sub.id}/pause/')
        self.assertEqual(res_p.status_code, status.HTTP_400_BAD_REQUEST)

        # Attempt to activate closed subscription
        res_a = self.client.post(f'/api/subscriptions/{sub.id}/activate/')
        self.assertEqual(res_a.status_code, status.HTTP_400_BAD_REQUEST)

    def test_08_customer_portal_isolation(self):
        """Customer can view only their own subscriptions and cannot execute staff actions."""
        self.client.force_authenticate(user=self.staff)
        res_conv = self.client.post(
            f'/api/subscriptions/convert/{self.confirmed_quotation.id}/',
            {"start_date": str(timezone.localdate())},
            format='json'
        )
        self.assertEqual(res_conv.status_code, status.HTTP_201_CREATED)
        sub_id = res_conv.data['id']

        # 1. Other customer cannot access
        self.client.force_authenticate(user=self.other_customer)
        res_other = self.client.get(f'/api/subscriptions/{sub_id}/')
        self.assertIn(res_other.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

        # 2. Target customer can read
        self.client.force_authenticate(user=self.customer)
        res_cust = self.client.get(f'/api/subscriptions/{sub_id}/')
        self.assertEqual(res_cust.status_code, status.HTTP_200_OK)

        # 3. Customer cannot activate, pause, or renew
        res_act = self.client.post(f'/api/subscriptions/{sub_id}/activate/')
        self.assertEqual(res_act.status_code, status.HTTP_403_FORBIDDEN)

        res_p = self.client.post(f'/api/subscriptions/{sub_id}/pause/')
        self.assertEqual(res_p.status_code, status.HTTP_403_FORBIDDEN)
