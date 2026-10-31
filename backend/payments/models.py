from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone
from invoices.models import Invoice


class PaymentMethod(models.TextChoices):
    CASH = 'CASH', 'Cash'
    BANK_TRANSFER = 'BANK_TRANSFER', 'Bank Transfer'
    UPI = 'UPI', 'UPI'
    CARD = 'CARD', 'Credit / Debit Card'
    ONLINE = 'ONLINE', 'Razorpay Online'
    OTHER = 'OTHER', 'Other'


class PaymentStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    SUCCESSFUL = 'SUCCESSFUL', 'Successful'
    FAILED = 'FAILED', 'Failed'
    REFUNDED = 'REFUNDED', 'Refunded'


class Payment(models.Model):
    """
    Payment transaction record associated with an Invoice.
    Tracks offline staff receipts as well as online Razorpay checkouts.
    """
    payment_reference = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Standardized reference: PAY-YYYYMM-XXXX"
    )
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.PROTECT,
        related_name='payments',
        help_text="Target invoice for this payment"
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='payments'
    )
    payment_method = models.CharField(max_length=30, choices=PaymentMethod.choices, default=PaymentMethod.ONLINE)
    amount = models.DecimalField(max_digits=12, decimal_places=2, help_text="Amount paid in local currency")
    payment_date = models.DateField(default=timezone.localdate)
    transaction_reference = models.CharField(
        max_length=100,
        blank=True,
        help_text="Bank UTR, cheque number, or gateway transaction ID"
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        db_index=True
    )
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recorded_payments',
        help_text="Staff or system user who recorded this payment"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    # Razorpay Gateway Metadata
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'

    def __str__(self):
        return f"{self.payment_reference} - {self.customer.full_name} (₹{self.amount}) [{self.payment_status}]"

    def mark_successful(self, transaction_ref: str = None, payment_id: str = None, signature: str = None):
        """
        Marks payment as SUCCESSFUL and triggers automatic invoice balance reconciliation.
        Idempotent: if already SUCCESSFUL, skips duplicate processing.
        """
        if self.payment_status == PaymentStatus.SUCCESSFUL:
            return

        self.payment_status = PaymentStatus.SUCCESSFUL
        if transaction_ref:
            self.transaction_reference = transaction_ref
        if payment_id:
            self.razorpay_payment_id = payment_id
        if signature:
            self.razorpay_signature = signature

        self.save(update_fields=[
            'payment_status',
            'transaction_reference',
            'razorpay_payment_id',
            'razorpay_signature'
        ])
        # Update invoice balances
        self.invoice.update_payment_balances()

