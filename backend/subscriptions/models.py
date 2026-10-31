import uuid
from decimal import Decimal
from datetime import timedelta
from dateutil.relativedelta import relativedelta
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone

from accounts.models import User, Role
from products.models import Product, ProductVariant
from plans.models import SubscriptionPlan, BillingInterval
from quotations.models import Quotation


def generate_subscription_number():
    """Generates unique subscription reference format: SUB-YYYYMMDD-XXXX"""
    date_str = timezone.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"SUB-{date_str}-{unique_suffix}"


class SubscriptionStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'          # Offer being prepared
    QUOTATION = 'QUOTATION', 'Quotation'  # Offer issued
    CONFIRMED = 'CONFIRMED', 'Confirmed'  # Accepted / converted from quotation
    ACTIVE = 'ACTIVE', 'Active'        # Active and eligible for recurring billing
    CLOSED = 'CLOSED', 'Closed'        # Ended or retired


class Subscription(models.Model):
    """
    Core Subscription entity for Brightloop Software.
    Manages active customer subscriptions converted from confirmed quotations,
    tracking recurring cycles, pause states, renewals, and lifecycle governance.
    """
    subscription_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        default=generate_subscription_number,
        editable=False,
        help_text="Unique auto-generated subscription reference."
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='subscriptions',
        limit_choices_to={'role': Role.CUSTOMER},
        help_text="Subscribing customer account."
    )
    source_quotation = models.ForeignKey(
        Quotation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='subscriptions',
        help_text="Source quotation from which this subscription was generated."
    )

    # Dates
    start_date = models.DateField(default=timezone.localdate, db_index=True)
    expiry_date = models.DateField(null=True, blank=True, db_index=True)
    activation_date = models.DateField(null=True, blank=True)
    next_billing_date = models.DateField(null=True, blank=True, db_index=True)
    payment_terms = models.CharField(max_length=100, default='Net 30')

    # Financial snapshots
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
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )

    # Lifecycle & Pause Management
    status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.CONFIRMED,
        db_index=True
    )
    is_paused = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Operational pause status. Suspends recurring billing while preserving lifecycle history."
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_subscriptions'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Subscription'
        verbose_name_plural = 'Subscriptions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'is_paused']),
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['start_date', 'expiry_date']),
        ]

    def __str__(self):
        return f"{self.subscription_number} - {self.customer.full_name} ({self.status}{', Paused' if self.is_paused else ''})"

    def calculate_next_billing_date(self, from_date=None):
        """
        Determines the next recurring billing date based on the items' billing intervals.
        """
        base = from_date or self.start_date or timezone.localdate()
        intervals = [item.billing_interval for item in self.items.all()]

        if BillingInterval.DAILY in intervals:
            return base + timedelta(days=1)
        elif BillingInterval.WEEKLY in intervals:
            return base + timedelta(weeks=1)
        elif BillingInterval.YEARLY in intervals:
            return base + relativedelta(years=1)
        else:
            # Default to monthly
            return base + relativedelta(months=1)

    def transition_status(self, new_status, changed_by=None, reason=''):
        """
        State machine guarding subscription lifecycle transitions:
        Draft -> Quotation -> Confirmed -> Active -> Closed.
        """
        if self.status == new_status:
            return

        old_status = self.status

        # Closed is strictly terminal
        if old_status == SubscriptionStatus.CLOSED:
            raise ValidationError("Closed subscriptions are terminal and cannot be reopened or transitioned.")

        # Activation constraints
        if new_status == SubscriptionStatus.ACTIVE:
            today = timezone.localdate()
            if self.start_date > today:
                raise ValidationError(
                    f"Future-dated subscription starting on {self.start_date} cannot be activated before its start date."
                )
            if self.is_paused:
                raise ValidationError("Cannot activate a paused subscription. Please resume it first.")
            self.activation_date = today
            if not self.next_billing_date:
                self.next_billing_date = self.calculate_next_billing_date(today)

        self.status = new_status
        self.save(update_fields=['status', 'activation_date', 'next_billing_date', 'updated_at'])

        SubscriptionStatusHistory.objects.create(
            subscription=self,
            previous_status=old_status,
            new_status=new_status,
            changed_by=changed_by,
            reason=reason
        )

    def pause(self, paused_by=None, reason=''):
        """
        Pauses an active/confirmed subscription if plan policies permit pausing.
        """
        if self.status == SubscriptionStatus.CLOSED:
            raise ValidationError("Cannot pause a closed subscription.")
        if self.is_paused:
            raise ValidationError("Subscription is already paused.")

        # Check if any associated plan disallows pause
        for item in self.items.all():
            if item.plan and not item.plan.allow_pause:
                raise ValidationError(f"Plan '{item.plan.name}' explicitly prohibits pausing.")

        self.is_paused = True
        self.save(update_fields=['is_paused', 'updated_at'])

        SubscriptionPauseHistory.objects.create(
            subscription=self,
            paused_by=paused_by,
            reason=reason
        )

    def resume(self, resumed_by=None):
        """
        Resumes a paused subscription.
        """
        if not self.is_paused:
            raise ValidationError("Subscription is not paused.")

        self.is_paused = False
        self.save(update_fields=['is_paused', 'updated_at'])

        # Update latest open pause history record
        open_pause = self.pause_history.filter(resumed_date__isnull=True).order_by('-paused_date').first()
        if open_pause:
            open_pause.resumed_date = timezone.now()
            open_pause.resumed_by = resumed_by
            open_pause.save(update_fields=['resumed_date', 'resumed_by'])

    def close(self, closed_by=None, reason='', force=False):
        """
        Permanently closes the subscription.
        Checks plan's allow_early_closure unless force=True or expiry date passed.
        """
        if self.status == SubscriptionStatus.CLOSED:
            raise ValidationError("Subscription is already closed.")

        today = timezone.localdate()
        is_expired = self.expiry_date and self.expiry_date <= today

        if not force and not is_expired:
            for item in self.items.all():
                if item.plan and not item.plan.allow_early_closure:
                    raise ValidationError(f"Plan '{item.plan.name}' does not allow early closure before expiry.")

        self.is_paused = False
        self.transition_status(SubscriptionStatus.CLOSED, changed_by=closed_by, reason=reason)


class SubscriptionItem(models.Model):
    """
    Itemized subscription line item storing historical name snapshots,
    agreed price rates, quantities, and billing intervals.
    """
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='subscription_items'
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='subscription_items'
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name='subscription_items'
    )

    # Historical Snapshots
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
        default=Decimal('18.00')
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
        verbose_name = 'Subscription Item'
        verbose_name_plural = 'Subscription Items'

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

        # Calculate line amounts
        qty = Decimal(str(self.quantity))
        price = Decimal(str(self.unit_price))
        self.line_subtotal = (qty * price).quantize(Decimal('0.01'))

        rate = Decimal(str(self.tax_rate))
        self.tax_amount = ((self.line_subtotal * rate) / Decimal('100.00')).quantize(Decimal('0.01'))
        self.line_total = self.line_subtotal + self.tax_amount

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.subscription.subscription_number} - {self.product_name} x {self.quantity}"


class SubscriptionStatusHistory(models.Model):
    """
    Audit log of all lifecycle transitions for a subscription.
    """
    subscription = models.ForeignKey(
        Subscription,
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
        verbose_name = 'Subscription Status History'
        verbose_name_plural = 'Subscription Status Histories'
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.subscription.subscription_number}: {self.previous_status} -> {self.new_status} at {self.timestamp}"


class SubscriptionPauseHistory(models.Model):
    """
    Log of administrative or customer pause and resume events.
    """
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='pause_history'
    )
    paused_date = models.DateTimeField(auto_now_add=True)
    resumed_date = models.DateTimeField(null=True, blank=True)
    paused_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='paused_subscriptions'
    )
    resumed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resumed_subscriptions'
    )
    reason = models.TextField(blank=True, default='')

    class Meta:
        verbose_name = 'Subscription Pause History'
        verbose_name_plural = 'Subscription Pause Histories'
        ordering = ['-paused_date']

    def __str__(self):
        return f"Subscription {self.subscription.subscription_number} paused at {self.paused_date}"


class SubscriptionRenewal(models.Model):
    """
    Records renewal transactions linking previous and newly generated subscriptions,
    maintaining complete historical continuity of billing periods.
    """
    original_subscription = models.ForeignKey(
        Subscription,
        on_delete=models.PROTECT,
        related_name='renewals_out'
    )
    renewed_subscription = models.ForeignKey(
        Subscription,
        on_delete=models.PROTECT,
        related_name='renewals_in'
    )
    previous_start_date = models.DateField()
    previous_expiry_date = models.DateField(null=True, blank=True)
    new_start_date = models.DateField()
    new_expiry_date = models.DateField(null=True, blank=True)
    renewal_date = models.DateTimeField(auto_now_add=True)
    renewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    class Meta:
        verbose_name = 'Subscription Renewal'
        verbose_name_plural = 'Subscription Renewals'
        ordering = ['-renewal_date']

    def __str__(self):
        return f"Renewal of {self.original_subscription.subscription_number} -> {self.renewed_subscription.subscription_number} on {self.renewal_date}"
