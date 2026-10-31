from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status

from accounts.models import User, Role
from invoices.models import Invoice, InvoiceStatus
from .models import Payment, PaymentMethod, PaymentStatus
from .razorpay_service import RazorpayService


class PaymentAndRazorpayTests(APITestCase):
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

        today = timezone.localdate()
        self.invoice = Invoice.objects.create(
            invoice_number='INV-202610-TEST1',
            customer=self.customer,
            invoice_date=today,
            due_date=today + timedelta(days=30),
            billing_period_start=today,
            billing_period_end=today + timedelta(days=30),
            subtotal=Decimal('1000.00'),
            tax_amount=Decimal('180.00'),
            total_amount=Decimal('1180.00'),
            outstanding_amount=Decimal('1180.00'),
            status=InvoiceStatus.CONFIRMED,
            created_by=self.staff
        )

    def test_record_manual_partial_payment(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post('/api/payments/record-manual/', {
            'invoice_id': self.invoice.id,
            'amount': '500.00',
            'payment_method': 'BANK_TRANSFER',
            'transaction_reference': 'UTR123456789',
            'notes': 'NEFT transfer received'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.amount_paid, Decimal('500.00'))
        self.assertEqual(self.invoice.outstanding_amount, Decimal('680.00'))
        self.assertEqual(self.invoice.status, InvoiceStatus.CONFIRMED)

    def test_record_manual_full_payment_marks_invoice_paid(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post('/api/payments/record-manual/', {
            'invoice_id': self.invoice.id,
            'amount': '1180.00',
            'payment_method': 'UPI',
            'transaction_reference': 'UPI987654321',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.amount_paid, Decimal('1180.00'))
        self.assertEqual(self.invoice.outstanding_amount, Decimal('0.00'))
        self.assertEqual(self.invoice.status, InvoiceStatus.PAID)

    def test_payment_amount_cannot_exceed_outstanding(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post('/api/payments/record-manual/', {
            'invoice_id': self.invoice.id,
            'amount': '1500.00',
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('amount', res.data)

    def test_razorpay_order_create(self):
        self.client.force_authenticate(user=self.customer)
        res = self.client.post('/api/payments/create-razorpay-order/', {
            'invoice_id': self.invoice.id
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('order_id', res.data)
        self.assertEqual(res.data['amount'], 118000)  # in paise

        # Check pending Payment record created
        payment = Payment.objects.filter(razorpay_order_id=res.data['order_id']).first()
        self.assertIsNotNone(payment)
        self.assertEqual(payment.payment_status, PaymentStatus.PENDING)

    def test_razorpay_verify_and_settlement(self):
        self.client.force_authenticate(user=self.customer)
        # Create order first
        create_res = self.client.post('/api/payments/create-razorpay-order/', {
            'invoice_id': self.invoice.id
        })
        order_id = create_res.data['order_id']

        # Verify signature
        verify_res = self.client.post('/api/payments/verify-razorpay/', {
            'razorpay_order_id': order_id,
            'razorpay_payment_id': 'pay_test_12345',
            'razorpay_signature': 'mock_signature'
        })
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)

        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, InvoiceStatus.PAID)
        self.assertEqual(self.invoice.outstanding_amount, Decimal('0.00'))

    def test_customer_cannot_access_others_payment(self):
        payment = Payment.objects.create(
            payment_reference='PAY-TEST-001',
            invoice=self.invoice,
            customer=self.customer,
            amount=Decimal('500.00'),
            payment_status=PaymentStatus.SUCCESSFUL
        )

        self.client.force_authenticate(user=self.other_customer)
        res = self.client.get(f'/api/payments/{payment.id}/')
        self.assertIn(res.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

