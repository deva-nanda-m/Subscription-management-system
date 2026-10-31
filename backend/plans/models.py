import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone

from products.models import Product, ProductVariant, ProductStatus


class BillingInterval(models.TextChoices):
    DAILY = 'DAILY', 'Daily'
    WEEKLY = 'WEEKLY', 'Weekly'
    MONTHLY = 'MONTHLY', 'Monthly'
    YEARLY = 'YEARLY', 'Yearly'


class PlanStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    PAUSED = 'PAUSED', 'Paused'
    CLOSED = 'CLOSED', 'Closed'
    INACTIVE = 'INACTIVE', 'Inactive'


def generate_plan_code():
    """Generates a human-readable unique plan identifier e.g. PLAN-A1B2C3D4"""
    return f"PLAN-{uuid.uuid4().hex[:8].upper()}"


class SubscriptionPlan(models.Model):
    """
    Subscription Plan entity for Brightloop Software.
    Defines pricing, billing frequency, minimum commitment quantity,
    availability window, and lifecycle rules under which customers subscribe.
    """
    plan_code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        default=generate_plan_code,
        editable=False,
        help_text="Unique auto-generated plan reference identifier."
    )
    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True, default='')

    # Product & Variant integration with Module 2
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='subscription_plans',
        help_text="Associated product from Module 2. Protected against deletion while referenced."
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='subscription_plans',
        help_text="Optional associated tier variant belonging to the selected product."
    )

    # Pricing & Currency
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Agreed plan selling price per billing cycle. Must be non-negative."
    )
    currency = models.CharField(max_length=10, default='USD')

    # Billing Configuration
    billing_interval = models.CharField(
        max_length=20,
        choices=BillingInterval.choices,
        default=BillingInterval.MONTHLY,
        db_index=True,
        help_text="Billing frequency: Daily, Weekly, Monthly, or Yearly."
    )
    minimum_quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Minimum units required when subscribing to this plan (must be at least 1)."
    )

    # Availability Period
    available_from = models.DateField(
        default=timezone.localdate,
        db_index=True,
        help_text="Date from which the plan becomes available for new subscriptions."
    )
    available_until = models.DateField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Optional expiry date after which plan is unavailable for new purchases."
    )

    # Lifecycle Policies
    auto_close = models.BooleanField(
        default=False,
        help_text="Automatically close plan when availability period ends via scheduled task."
    )
    allow_early_closure = models.BooleanField(
        default=True,
        help_text="Permit Administrator to manually close plan before availability end date."
    )
    allow_pause = models.BooleanField(
        default=True,
        help_text="Permit Administrator to temporarily pause the plan from new subscriptions."
    )
    allow_renewal = models.BooleanField(
        default=True,
        help_text="Permit customer subscriptions governed by this plan to be renewed in future modules."
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=PlanStatus.choices,
        default=PlanStatus.ACTIVE,
        db_index=True
    )

    # Authorship & Audit
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_plans'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Subscription Plan'
        verbose_name_plural = 'Subscription Plans'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'billing_interval']),
            models.Index(fields=['available_from', 'available_until']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_billing_interval_display()} - {self.currency} {self.price})"

    def clean(self):
        super().clean()

        # Validate minimum quantity
        if self.minimum_quantity is not None and self.minimum_quantity < 1:
            raise ValidationError({'minimum_quantity': "Minimum quantity must be a positive integer (at least 1)."})

        # Validate price
        if self.price is not None and self.price < Decimal('0.00'):
            raise ValidationError({'price': "Plan price must be greater than or equal to 0.00."})

        # Validate availability window
        if self.available_from and self.available_until:
            if self.available_until < self.available_from:
                raise ValidationError({'available_until': "Available Until date cannot precede Available From date."})

        # Validate product active status on creation
        if self.product_id and self.product.status != ProductStatus.ACTIVE:
            raise ValidationError({'product': "Subscription plans can only be associated with active products."})

        # Validate variant belongs to product and is active
        if self.variant_id:
            if self.variant.product_id != self.product_id:
                raise ValidationError({'variant': "The selected variant does not belong to the chosen product."})
            if not self.variant.is_active:
                raise ValidationError({'variant': "Selected product variant is inactive and cannot be used in a new plan."})

    @property
    def is_currently_available(self):
        """
        Calculates real-time availability for purchase based on status and dates.
        """
        if self.status != PlanStatus.ACTIVE:
            return False

        today = timezone.now().date()
        if self.available_from and today < self.available_from:
            return False

        if self.available_until and today > self.available_until:
            return False

        return True

    @property
    def availability_display(self):
        """Human-readable availability diagnostic string."""
        if self.status == PlanStatus.CLOSED:
            return "Closed"
        if self.status == PlanStatus.PAUSED:
            return "Paused"
        if self.status == PlanStatus.INACTIVE:
            return "Inactive"

        today = timezone.now().date()
        if self.available_from and today < self.available_from:
            return f"Scheduled (Starts {self.available_from})"
        if self.available_until and today > self.available_until:
            return f"Expired (Ended {self.available_until})"

        if self.available_until:
            return f"Available until {self.available_until}"
        return "Indefinitely Available"

    def transition_status(self, new_status, changed_by=None, reason=''):
        """
        Enforces state transition rules and records an immutable entry in PlanStatusHistory.
        """
        if self.status == new_status:
            return self

        # Rule: Closed plans are terminal
        if self.status == PlanStatus.CLOSED:
            raise ValidationError("Closed plans cannot be resumed or modified through ordinary status transitions.")

        # Rule: Pausing requires allow_pause policy
        if new_status == PlanStatus.PAUSED and not self.allow_pause:
            raise ValidationError("This plan's lifecycle policy does not permit pausing.")

        # Rule: Manual early closure requires allow_early_closure policy
        if new_status == PlanStatus.CLOSED and not self.allow_early_closure:
            # Allow automatic closure by system task, but reject manual early close
            if reason != "Automatic closure policy: availability end date passed":
                raise ValidationError("This plan's lifecycle policy does not permit early closure.")

        old_status = self.status
        self.status = new_status
        self.save(update_fields=['status', 'updated_at'])

        # Record in status history
        PlanStatusHistory.objects.create(
            plan=self,
            previous_status=old_status,
            new_status=new_status,
            changed_by=changed_by,
            change_reason=reason
        )

        return self


class PlanStatusHistory(models.Model):
    """
    Immutable audit history tracking all status transitions for SubscriptionPlans.
    """
    plan = models.ForeignKey(
        SubscriptionPlan,
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
    change_reason = models.TextField(blank=True, default='')
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Plan Status History'
        verbose_name_plural = 'Plan Status Histories'
        ordering = ['-changed_at']

    def __str__(self):
        return f"{self.plan.name}: {self.previous_status} -> {self.new_status} at {self.changed_at}"
