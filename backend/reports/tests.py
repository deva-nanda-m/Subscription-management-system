from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status

from accounts.models import User, Role
from subscriptions.models import Subscription, SubscriptionStatus
from invoices.models import Invoice, InvoiceStatus
from payments.models import Payment, PaymentStatus


class ReportsAndDashboardTests(APITestCase):
    def setUp(self):
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

        today = timezone.localdate()
        self.subscription = Subscription.objects.create(
            customer=self.customer,
            start_date=today,
            status=SubscriptionStatus.ACTIVE,
            subtotal=Decimal('1000.00'),
            tax_amount=Decimal('180.00'),
            total_amount=Decimal('1180.00'),
        )

        self.invoice = Invoice.objects.create(
            invoice_number='INV-REP-001',
            customer=self.customer,
            subscription=self.subscription,
            invoice_date=today,
            due_date=today + timedelta(days=30),
            billing_period_start=today,
            billing_period_end=today + timedelta(days=30),
            subtotal=Decimal('1000.00'),
            tax_amount=Decimal('180.00'),
            total_amount=Decimal('1180.00'),
            amount_paid=Decimal('500.00'),
            outstanding_amount=Decimal('680.00'),
            status=InvoiceStatus.CONFIRMED
        )

        self.payment = Payment.objects.create(
            payment_reference='PAY-REP-001',
            invoice=self.invoice,
            customer=self.customer,
            amount=Decimal('500.00'),
            payment_status=PaymentStatus.SUCCESSFUL,
            payment_date=today
        )

    def test_dashboard_summary_metrics(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/dashboard/summary/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        metrics = res.data['metrics']
        self.assertEqual(metrics['subscriptions']['active'], 1)
        self.assertEqual(metrics['financials']['revenue_collected'], 500.00)
        self.assertEqual(metrics['financials']['total_outstanding'], 680.00)
        self.assertEqual(metrics['invoices']['total'], 1)
        self.assertEqual(metrics['invoices']['partially_paid'], 1)

    def test_csv_export_response(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.get('/api/reports/revenue/?export=csv')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res['Content-Type'], 'text/csv')
        self.assertIn('attachment; filename="revenue_report.csv"', res['Content-Disposition'])

    def test_customer_access_forbidden(self):
        self.client.force_authenticate(user=self.customer)
        res = self.client.get('/api/dashboard/summary/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
