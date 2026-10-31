from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings
from django.utils import timezone
from products.models import Product
from plans.models import SubscriptionPlan


class TaxType(models.TextChoices):
    PERCENTAGE = 'PERCENTAGE', 'Percentage'
    FIXED = 'FIXED', 'Fixed Amount'


class DiscountType(models.TextChoices):
    PERCENTAGE = 'PERCENTAGE', 'Percentage'
    FIXED = 'FIXED', 'Fixed Amount'


class DiscountScope(models.TextChoices):
    ENTIRE_SUBSCRIPTION = 'ENTIRE_SUBSCRIPTION', 'Entire Subscription'
    PRODUCTS = 'PRODUCTS', 'Specific Products'


class Tax(models.Model):
    """
    Tax Rule Configuration controlled by Administrator.
    Used for calculating tax amounts across invoice lines and quotations.
    """
    name = models.CharField(max_length=100, unique=True, help_text="e.g. GST 18%, VAT Standard")
    rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text="Percentage rate applied to taxable amounts (e.g. 18.00 for 18%)"
    )
    description = models.TextField(blank=True, help_text="Context regarding applicable jurisdiction or threshold")
    tax_type = models.CharField(max_length=20, choices=TaxType.choices, default=TaxType.PERCENTAGE)
    is_active = models.BooleanField(default=True, help_text="Inactive tax rules cannot be selected for new transactions")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_taxes'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Tax Rule'
        verbose_name_plural = 'Tax Rules'

    def __str__(self):
        return f"{self.name} ({self.rate}%)"

    def calculate_tax(self, taxable_amount: Decimal) -> Decimal:
        """Calculates tax amount based on rate, returning a 2-decimal Decimal."""
        if not self.is_active or taxable_amount <= Decimal('0.00'):
            return Decimal('0.00')
        if self.tax_type == TaxType.PERCENTAGE:
            amount = (taxable_amount * self.rate) / Decimal('100')
        else:
            amount = self.rate
        return amount.quantize(Decimal('0.01'))


class Discount(models.Model):
    """
    Discount Rule Engine.
    Configured exclusively by Administrator.
    Supports percentage or fixed discounts, usage caps, validity windows, and scopes.
    """
    name = models.CharField(max_length=150, help_text="Descriptive campaign or rule name")
    code = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        help_text="Optional coupon code (e.g. EARLYBIRD20). If empty, can auto-apply."
    )
    description = models.TextField(blank=True)
    discount_type = models.CharField(max_length=20, choices=DiscountType.choices, default=DiscountType.PERCENTAGE)
    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Percentage value (0-100) or fixed currency amount"
    )
    minimum_purchase_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Minimum subtotal required to qualify for this discount"
    )
    minimum_quantity = models.PositiveIntegerField(
        default=1,
        help_text="Minimum total line quantity required"
    )
    start_date = models.DateField(help_text="Effective commencement date")
    end_date = models.DateField(null=True, blank=True, help_text="Expiry date (inclusive). Null means indefinite.")
    max_usage_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum total times this discount rule can be applied across all invoices"
    )
    current_usage_count = models.PositiveIntegerField(
        default=0,
        help_text="Counter of how many times this discount has been applied"
    )
    application_scope = models.CharField(
        max_length=30,
        choices=DiscountScope.choices,
        default=DiscountScope.ENTIRE_SUBSCRIPTION
    )
    applicable_products = models.ManyToManyField(
        Product,
        blank=True,
        related_name='discounts',
        help_text="If scope is Specific Products, select matching products"
    )
    applicable_plans = models.ManyToManyField(
        SubscriptionPlan,
        blank=True,
        related_name='discounts',
        help_text="Optional plan-specific applicability restriction"
    )
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_discounts'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Discount Rule'
        verbose_name_plural = 'Discount Rules'

    def __str__(self):
        val_str = f"{self.discount_value}%" if self.discount_type == DiscountType.PERCENTAGE else f"₹{self.discount_value}"
        return f"{self.name} ({val_str})"

    def is_eligible(self, subtotal: Decimal, total_quantity: int = 1, product_ids: list = None, plan_ids: list = None) -> bool:
        """
        Evaluates whether a given transaction qualifies for this discount.
        Checks active status, calendar window, usage limits, and minimum thresholds.
        """
        if not self.is_active:
            return False

        today = timezone.localdate()
        if self.start_date > today:
            return False
        if self.end_date and self.end_date < today:
            return False

        if self.max_usage_limit is not None and self.current_usage_count >= self.max_usage_limit:
            return False

        if subtotal < self.minimum_purchase_amount:
            return False

        if total_quantity < self.minimum_quantity:
            return False

        if self.application_scope == DiscountScope.PRODUCTS:
            applicable_pids = set(self.applicable_products.values_list('id', flat=True))
            applicable_plids = set(self.applicable_plans.values_list('id', flat=True))

            product_match = True
            if applicable_pids:
                provided_pids = set(product_ids or [])
                product_match = bool(applicable_pids.intersection(provided_pids))

            plan_match = True
            if applicable_plids:
                provided_plids = set(plan_ids or [])
                plan_match = bool(applicable_plids.intersection(provided_plids))

            if not (product_match or plan_match):
                return False

        return True

    def calculate_discount_amount(self, qualifying_subtotal: Decimal) -> Decimal:
        """Calculates discount without letting it exceed the qualifying subtotal or fall below 0."""
        if qualifying_subtotal <= Decimal('0.00'):
            return Decimal('0.00')

        if self.discount_type == DiscountType.PERCENTAGE:
            computed = (qualifying_subtotal * self.discount_value) / Decimal('100')
        else:
            computed = self.discount_value

        discount_amount = min(qualifying_subtotal, computed)
        return max(Decimal('0.00'), discount_amount.quantize(Decimal('0.01')))

