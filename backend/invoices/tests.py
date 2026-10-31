from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status

from accounts.models import User, Role
from products.models import Product, ProductCategory
from plans.models import SubscriptionPlan, BillingInterval
from subscriptions.models import Subscription, SubscriptionItem, SubscriptionStatus
from .models import Invoice, InvoiceStatus
from .billing_service import BillingEngineService


class InvoiceAndBillingTests(APITestCase):
    def setUp(self):
        # Users
        self.admin = User.objects.create_user(
            email='admin@test.com',
            password='AdminPassword123!',
            full_name='Admin User',
            role=Role.ADMIN
        )
        self.staff = User.objects.create_user(
            email='staff@test.com',
            password='StaffPassword123!',
            full_name='Staff User',
            role=Role.STAFF
        )
        self.customer = User.objects.create_user(
            email='customer@test.com',
            password='CustomerPassword123!',
            full_name='Customer User',
            role=Role.CUSTOMER
        )
        self.other_customer = User.objects.create_user(
            email='other@test.com',
            password='OtherPassword123!',
            full_name='Other Customer',
            role=Role.CUSTOMER
        )

        # Product and Plan
        self.product = Product.objects.create(
            name='Cloud ERP',
            category=ProductCategory.SOFTWARE,
            created_by=self.admin
        )
        self.plan = SubscriptionPlan.objects.create(
            name='Monthly ERP Pro',
            product=self.product,
            price=Decimal('1000.00'),
            billing_interval=BillingInterval.MONTHLY,
            created_by=self.admin
        )

        # Active Subscription
        today = timezone.localdate()
        self.subscription = Subscription.objects.create(
            customer=self.customer,
            start_date=today - timedelta(days=30),
            next_billing_date=today,
            status=SubscriptionStatus.ACTIVE,
            subtotal=Decimal('1000.00'),
            tax_amount=Decimal('180.00'),
            total_amount=Decimal('1180.00'),
            payment_terms='Net 30',
            created_by=self.staff
        )
        self.item = SubscriptionItem.objects.create(
            subscription=self.subscription,
            product=self.product,
            plan=self.plan,
            product_name='Cloud ERP',
            plan_name='Monthly ERP Pro',
            billing_interval='MONTHLY',
            quantity=1,
            unit_price=Decimal('1000.00'),
            tax_rate=Decimal('18.00'),
        )

    def test_generate_invoice_from_subscription(self):
        invoice, created = BillingEngineService.generate_invoice_for_subscription(
            self.subscription,
            operator_user=self.staff
        )
        self.assertTrue(created)
        self.assertEqual(invoice.customer, self.customer)
        self.assertEqual(invoice.total_amount, Decimal('1180.00'))
        self.assertEqual(invoice.outstanding_amount, Decimal('1180.00'))
        self.assertEqual(invoice.lines.count(), 1)
        line = invoice.lines.first()
        self.assertEqual(line.product_name, 'Cloud ERP')
        self.assertEqual(line.unit_price, Decimal('1000.00'))

        # Verifies next_billing_date advanced
        self.subscription.refresh_from_db()
        self.assertGreater(self.subscription.next_billing_date, timezone.localdate())

    def test_duplicate_invoice_prevention(self):
        inv1, created1 = BillingEngineService.generate_invoice_for_subscription(self.subscription)
        self.assertTrue(created1)

        # Reset next_billing_date back to the same period to test idempotency
        self.subscription.next_billing_date = inv1.billing_period_start
        self.subscription.save()

        # Attempting to bill the same period returns existing invoice and created=False
        inv2, created2 = BillingEngineService.generate_invoice_for_subscription(
            self.subscription,
            manual_trigger=True
        )
        self.assertFalse(created2)
        self.assertEqual(inv1.id, inv2.id)

    def test_do_not_bill_paused_subscription(self):
        self.subscription.is_paused = True
        self.subscription.save()

        with self.assertRaises(ValueError):
            BillingEngineService.generate_invoice_for_subscription(self.subscription)

    def test_customer_cannot_view_others_invoices(self):
        invoice, _ = BillingEngineService.generate_invoice_for_subscription(self.subscription)

        # Authenticate as other customer
        self.client.force_authenticate(user=self.other_customer)
        res = self.client.get(f'/api/invoices/{invoice.id}/')
        self.assertIn(res.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

        # Own customer can view
        self.client.force_authenticate(user=self.customer)
        res_own = self.client.get(f'/api/invoices/{invoice.id}/')
        self.assertEqual(res_own.status_code, status.HTTP_200_OK)

    def test_invoice_pdf_endpoint(self):
        invoice, _ = BillingEngineService.generate_invoice_for_subscription(self.subscription)
        self.client.force_authenticate(user=self.customer)
        response = self.client.get(f'/api/invoices/{invoice.id}/pdf/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')

    def test_overdue_invoice_detection(self):
        invoice, _ = BillingEngineService.generate_invoice_for_subscription(self.subscription)
        # Set due_date in the past
        invoice.due_date = timezone.localdate() - timedelta(days=10)
        invoice.save()

        self.assertTrue(invoice.is_overdue)
        self.assertEqual(invoice.days_overdue, 10)

        self.client.force_authenticate(user=self.staff)
        res = self.client.get('/api/invoices/overdue/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [item['id'] for item in res.data['results']]
        self.assertIn(invoice.id, ids)
