from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone
from products.models import Product
from subscriptions.models import Subscription


class InvoiceStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    CONFIRMED = 'CONFIRMED', 'Confirmed'
    PAID = 'PAID', 'Paid'
    CANCELLED = 'CANCELLED', 'Cancelled'


class BillingRunType(models.TextChoices):
    AUTOMATED = 'AUTOMATED', 'Automated Celery Beat'
    MANUAL = 'MANUAL', 'Manual Admin/Staff Trigger'


class Invoice(models.Model):
    """
    Invoice generated from active subscriptions or ad-hoc commercial orders.
    Stores immutable snapshots of prices, taxes, and applied discounts.
    """
    invoice_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Standardized identifier: INV-YYYYMM-XXXX"
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='invoices',
        help_text="Customer user account billed for this invoice"
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='invoices',
        help_text="Source recurring subscription contract"
    )
    invoice_date = models.DateField(default=timezone.localdate)
    due_date = models.DateField()
    billing_period_start = models.DateField(help_text="Start of the service entitlement interval")
    billing_period_end = models.DateField(help_text="End of the service entitlement interval")

    # Financial snapshots
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    outstanding_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    currency = models.CharField(max_length=10, default='INR')

    status = models.CharField(
        max_length=20,
        choices=InvoiceStatus.choices,
        default=InvoiceStatus.CONFIRMED,
        db_index=True
    )
    payment_terms = models.CharField(max_length=100, default='Net 30')
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_invoices'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Invoice'
        verbose_name_plural = 'Invoices'
        constraints = [
            # Critical idempotency guard: prevent duplicate invoices for the same subscription & period
            models.UniqueConstraint(
                fields=['subscription', 'billing_period_start', 'billing_period_end'],
                name='unique_subscription_billing_period'
            )
        ]

    def __str__(self):
        return f"{self.invoice_number} - {self.customer.full_name} (₹{self.total_amount})"

    @property
    def is_overdue(self) -> bool:
        """Invoice is overdue if due date has passed, balance remains, and not cancelled."""
        if self.status in [InvoiceStatus.PAID, InvoiceStatus.CANCELLED]:
            return False
        return timezone.localdate() > self.due_date and self.outstanding_amount > Decimal('0.00')

    @property
    def days_overdue(self) -> int:
        """Returns integer count of days overdue, or 0 if not overdue."""
        if not self.is_overdue:
            return 0
        return (timezone.localdate() - self.due_date).days

    def update_payment_balances(self):
        """
        Recalculates amount_paid and outstanding_amount based on successful payments.
        Updates status to PAID when fully settled.
        """
        successful_payments = self.payments.filter(payment_status='SUCCESSFUL')
        total_paid = sum((p.amount for p in successful_payments), Decimal('0.00'))
        self.amount_paid = total_paid.quantize(Decimal('0.01'))
        remaining = max(Decimal('0.00'), self.total_amount - self.amount_paid)
        self.outstanding_amount = remaining.quantize(Decimal('0.01'))

        if self.outstanding_amount == Decimal('0.00') and self.total_amount > Decimal('0.00'):
            self.status = InvoiceStatus.PAID
        elif self.status == InvoiceStatus.PAID and self.outstanding_amount > Decimal('0.00'):
            self.status = InvoiceStatus.CONFIRMED

        self.save(update_fields=['amount_paid', 'outstanding_amount', 'status', 'updated_at'])


class InvoiceLineItem(models.Model):
    """
    Itemized product lines on an invoice.
    Contains immutable price, product, plan, and tax snapshots.
    """
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='lines')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    product_name = models.CharField(max_length=200, help_text="Product name snapshot")
    variant_name = models.CharField(max_length=200, blank=True, help_text="Variant name snapshot")
    plan_name = models.CharField(max_length=200, help_text="Plan specification snapshot")
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, help_text="Agreed unit price snapshot")
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'), help_text="Tax rate snapshot (%)")
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    line_subtotal = models.DecimalField(max_digits=12, decimal_places=2, help_text="quantity * unit_price")
    line_total = models.DecimalField(max_digits=12, decimal_places=2, help_text="(subtotal - discount) + tax")

    class Meta:
        ordering = ['id']
        verbose_name = 'Invoice Line Item'
        verbose_name_plural = 'Invoice Line Items'

    def __str__(self):
        return f"{self.product_name} ({self.plan_name}) x {self.quantity}"


class BillingExecutionLog(models.Model):
    """
    Audit log of automated or manual recurring billing engine runs.
    Enables administrators to inspect evaluated subscriptions and failed operations.
    """
    run_type = models.CharField(max_length=20, choices=BillingRunType.choices, default=BillingRunType.AUTOMATED)
    executed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    executed_at = models.DateTimeField(auto_now_add=True)
    subscriptions_evaluated = models.PositiveIntegerField(default=0)
    invoices_generated = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)
    details = models.JSONField(default=dict)

    class Meta:
        ordering = ['-executed_at']
        verbose_name = 'Billing Execution Log'
        verbose_name_plural = 'Billing Execution Logs'

    def __str__(self):
        return f"Billing Run [{self.run_type}] on {self.executed_at:%Y-%m-%d %H:%M} - Gen: {self.invoices_generated}, Fail: {self.failed_count}"


class InvoiceEmailLog(models.Model):
    """
    Log of emails dispatched with attached invoice PDFs.
    """
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='email_logs')
    recipient_email = models.EmailField()
    subject = models.CharField(max_length=255)
    sent_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='SENT')
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ['-sent_at']
        verbose_name = 'Invoice Email Log'
        verbose_name_plural = 'Invoice Email Logs'

    def __str__(self):
        return f"Email for {self.invoice.invoice_number} to {self.recipient_email} ({self.status})"

