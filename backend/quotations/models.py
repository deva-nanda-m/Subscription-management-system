import uuid
from decimal import Decimal
from datetime import timedelta
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone

from accounts.models import User, Role
from products.models import Product, ProductVariant
from plans.models import SubscriptionPlan


def generate_quotation_number():
    """Generates unique quotation reference format: QTN-YYYYMMDD-XXXX"""
    date_str = timezone.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"QTN-{date_str}-{unique_suffix}"


class QuotationStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    QUOTATION = 'QUOTATION', 'Quotation'  # Finalized and issued to customer
    CONFIRMED = 'CONFIRMED', 'Confirmed'  # Accepted by customer
    EXPIRED = 'EXPIRED', 'Expired'
    CANCELLED = 'CANCELLED', 'Cancelled'


class QuotationTemplate(models.Model):
    """
    Reusable quotation template allowing rapid assembly of standardized
    product, variant, and plan offerings.
    """
    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True, default='')
    validity_days = models.PositiveIntegerField(
        default=30,
        validators=[MinValueValidator(1)],
        help_text="Default validity duration in days."
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_quotation_templates'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Quotation Template'
        verbose_name_plural = 'Quotation Templates'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.validity_days} days)"

    @property
    def lines_count(self):
        return self.lines.count()


class QuotationTemplateLine(models.Model):
    """
    Standardized line item configured within a QuotationTemplate.
    """
    template = models.ForeignKey(
        QuotationTemplate,
        on_delete=models.CASCADE,
        related_name='lines'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='template_lines'
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='template_lines'
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name='template_lines'
    )
    default_quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)]
    )

    class Meta:
        verbose_name = 'Quotation Template Line'
        verbose_name_plural = 'Quotation Template Lines'

    def clean(self):
        super().clean()
        if self.variant and self.variant.product_id != self.product_id:
            raise ValidationError({'variant': f"Variant '{self.variant.name}' does not belong to product '{self.product.name}'."})
        if self.plan and self.plan.product_id != self.product_id:
            raise ValidationError({'plan': f"Plan '{self.plan.name}' is not configured for product '{self.product.name}'."})
        if self.plan and self.default_quantity < self.plan.minimum_quantity:
            raise ValidationError({'default_quantity': f"Default quantity ({self.default_quantity}) cannot be less than plan minimum ({self.plan.minimum_quantity})."})

    def __str__(self):
        return f"{self.template.name} - {self.product.name} ({self.plan.name})"


class Quotation(models.Model):
    """
    Customer-specific quotation containing negotiated pricing, quantity,
    and terms prior to subscription activation.
    """
    quotation_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        default=generate_quotation_number,
        editable=False,
        help_text="Unique auto-generated quotation reference."
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='customer_quotations',
        limit_choices_to={'role': Role.CUSTOMER},
        help_text="Target customer account."
    )
    template = models.ForeignKey(
        QuotationTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_quotations',
        help_text="Source template if instantiated from a template."
    )
    quotation_date = models.DateField(default=timezone.localdate, db_index=True)
    validity_days = models.PositiveIntegerField(
        default=30,
        validators=[MinValueValidator(1)],
        help_text="Number of days this quotation remains valid."
    )
    expiry_date = models.DateField(db_index=True)

    # Financial Totals (computed on backend)
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    grand_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )

    notes = models.TextField(blank=True, default='', help_text="Customer-facing notes or special instructions.")
    terms_and_conditions = models.TextField(blank=True, default='', help_text="Legally binding terms, SLA and warranty terms.")

    status = models.CharField(
        max_length=20,
        choices=QuotationStatus.choices,
        default=QuotationStatus.DRAFT,
        db_index=True
    )
    is_converted = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Indicates whether this quotation has been converted to an active subscription."
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_quotations'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Quotation'
        verbose_name_plural = 'Quotations'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'expiry_date']),
            models.Index(fields=['customer', 'status']),
        ]

    def __str__(self):
        return f"{self.quotation_number} - {self.customer.full_name} ({self.status})"

    def save(self, *args, **kwargs):
        # Auto-compute expiry_date from quotation_date + validity_days if not set
        if not self.expiry_date and self.quotation_date and self.validity_days:
            self.expiry_date = self.quotation_date + timedelta(days=self.validity_days)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return self.expiry_date < timezone.localdate()

    def calculate_totals(self):
        """
        Recomputes subtotal, tax_amount, and grand_total strictly from line items.
        """
        subtotal = Decimal('0.00')
        tax_total = Decimal('0.00')

        for line in self.lines.all():
            subtotal += line.line_subtotal
            tax_total += line.tax_amount

        self.subtotal = subtotal
        self.tax_amount = tax_total
        discount = self.discount_amount or Decimal('0.00')
        self.grand_total = max(Decimal('0.00'), (subtotal + tax_total) - discount)
        self.save(update_fields=['subtotal', 'tax_amount', 'discount_amount', 'grand_total', 'updated_at'])

    def transition_status(self, new_status, changed_by=None, reason=''):
        """
        State machine guarding status transitions and generating audit logs.
        """
        if self.status == new_status:
            return

        old_status = self.status

        # If already converted, prevent status mutations
        if self.is_converted:
            raise ValidationError("This quotation has already been converted to a subscription and cannot change status.")

        # Terminal state validations
        if old_status == QuotationStatus.CANCELLED:
            raise ValidationError("Cancelled quotations cannot transition to any other status.")

        if old_status == QuotationStatus.EXPIRED and new_status == QuotationStatus.CONFIRMED:
            raise ValidationError("Expired quotations cannot be confirmed.")

        # Confirmation checks
        if new_status == QuotationStatus.CONFIRMED:
            if self.is_expired:
                raise ValidationError("Cannot confirm an expired quotation.")
            if old_status not in (QuotationStatus.QUOTATION, QuotationStatus.DRAFT):
                raise ValidationError(f"Cannot confirm quotation from status '{old_status}'.")

        # Cancellation checks
        if new_status == QuotationStatus.CANCELLED:
            if self.is_converted:
                raise ValidationError("Cannot cancel a quotation that has already been converted.")

        self.status = new_status
        self.save(update_fields=['status', 'updated_at'])

        QuotationStatusHistory.objects.create(
            quotation=self,
            previous_status=old_status,
            new_status=new_status,
            changed_by=changed_by,
            reason=reason
        )


class QuotationLineItem(models.Model):
    """
    Individual itemized line within a customer quotation.
    Preserves historical name and price snapshots so future product/plan updates
    do not alter issued quotation records.
    """
    quotation = models.ForeignKey(
        Quotation,
        on_delete=models.CASCADE,
        related_name='lines'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='quotation_lines'
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='quotation_lines'
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name='quotation_lines'
    )

    # Immutability Snapshots
    product_name = models.CharField(max_length=255)
    variant_name = models.CharField(max_length=255, blank=True, default='')
    plan_name = models.CharField(max_length=255)
    billing_interval = models.CharField(max_length=50)

    quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)]
    )
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('18.00'),
        help_text="Tax percentage (e.g. 18.00 for 18% GST/VAT)."
    )
    tax_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    line_subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    line_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )

    class Meta:
        verbose_name = 'Quotation Line Item'
        verbose_name_plural = 'Quotation Line Items'

    def save(self, *args, **kwargs):
        # Populate snapshots from linked entities if not set
        if not self.product_name and self.product:
            self.product_name = self.product.name
        if not self.variant_name and self.variant:
            self.variant_name = self.variant.name
        if not self.plan_name and self.plan:
            self.plan_name = self.plan.name
        if not self.billing_interval and self.plan:
            self.billing_interval = self.plan.billing_interval

        # Enforce minimum quantity constraint
        if self.plan and self.quantity < self.plan.minimum_quantity:
            raise ValidationError(
                f"Quantity ({self.quantity}) must be at least the plan minimum ({self.plan.minimum_quantity})."
            )

        # Backend calculation of line totals
        qty = Decimal(str(self.quantity))
        price = Decimal(str(self.unit_price))
        self.line_subtotal = (qty * price).quantize(Decimal('0.01'))

        rate = Decimal(str(self.tax_rate))
        self.tax_amount = ((self.line_subtotal * rate) / Decimal('100.00')).quantize(Decimal('0.01'))
        self.line_total = self.line_subtotal + self.tax_amount

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quotation.quotation_number} - {self.product_name} x {self.quantity}"


class QuotationStatusHistory(models.Model):
    """
    Immutable audit trail capturing all status transitions on quotations.
    """
    quotation = models.ForeignKey(
        Quotation,
        on_delete=models.CASCADE,
        related_name='status_history'
    )
    previous_status = models.CharField(max_length=20)
    new_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    reason = models.TextField(blank=True, default='')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Quotation Status History'
        verbose_name_plural = 'Quotation Status Histories'
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.quotation.quotation_number}: {self.previous_status} -> {self.new_status} at {self.timestamp}"


class QuotationEmailLog(models.Model):
    """
    Audit log of emails dispatched for quotations.
    """
    quotation = models.ForeignKey(
        Quotation,
        on_delete=models.CASCADE,
        related_name='email_logs'
    )
    recipient_email = models.EmailField()
    subject = models.CharField(max_length=255)
    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    status = models.CharField(
        max_length=20,
        choices=[('SUCCESS', 'Success'), ('FAILED', 'Failed')],
        default='SUCCESS'
    )
    error_message = models.TextField(blank=True, default='')
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Quotation Email Log'
        verbose_name_plural = 'Quotation Email Logs'
        ordering = ['-sent_at']

    def __str__(self):
        return f"Email to {self.recipient_email} [{self.status}] on {self.sent_at}"
