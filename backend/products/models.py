from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal


class ProductCategory(models.TextChoices):
    SOFTWARE = 'SOFTWARE', 'SaaS Platform'
    SERVICE = 'SERVICE', 'Managed Service'
    ADDON = 'ADDON', 'Add-on Module'
    API = 'API', 'API & Integration'
    STORAGE = 'STORAGE', 'Cloud Storage'


class ProductStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    ACTIVE = 'ACTIVE', 'Active'
    INACTIVE = 'INACTIVE', 'Inactive'
    ARCHIVED = 'ARCHIVED', 'Archived'


class BillingType(models.TextChoices):
    RECURRING = 'RECURRING', 'Recurring Subscription'
    ONE_TIME = 'ONE_TIME', 'One-Time Charge'
    METERED = 'METERED', 'Metered / Usage-Based'


class Product(models.Model):
    """
    Core Product entity for Brightloop Software Subscription System.
    Serves as the umbrella for products sold independently or through recurring plans.
    """
    name = models.CharField(max_length=255, db_index=True)
    code = models.SlugField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True, default='')
    category = models.CharField(
        max_length=50,
        choices=ProductCategory.choices,
        default=ProductCategory.SOFTWARE,
        db_index=True
    )
    status = models.CharField(
        max_length=20,
        choices=ProductStatus.choices,
        default=ProductStatus.ACTIVE,
        db_index=True
    )
    is_recurring = models.BooleanField(
        default=True,
        help_text="Designates whether this product supports recurring subscription plans."
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_products'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def total_variants_count(self):
        return self.variants.count()

    @property
    def active_variants_count(self):
        return self.variants.filter(is_active=True).count()

    @property
    def min_price(self):
        active_prices = self.variants.filter(is_active=True).values_list('price', flat=True)
        return min(active_prices) if active_prices else Decimal('0.00')

    @property
    def max_price(self):
        active_prices = self.variants.filter(is_active=True).values_list('price', flat=True)
        return max(active_prices) if active_prices else Decimal('0.00')


class ProductVariant(models.Model):
    """
    Product Variant entity representing tiers, editions, or packaged capacity.
    These variants form the selectable offerings in Subscription Plans.
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='variants'
    )
    name = models.CharField(max_length=255)
    sku = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Stock Keeping Unit / Unique variant identifier."
    )
    description = models.TextField(blank=True, default='')
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Base reference price for this tier/variant."
    )
    currency = models.CharField(max_length=10, default='USD')
    billing_type = models.CharField(
        max_length=20,
        choices=BillingType.choices,
        default=BillingType.RECURRING
    )
    is_active = models.BooleanField(default=True, db_index=True)
    attributes = models.JSONField(
        default=dict,
        blank=True,
        help_text="Custom key-value specifications (e.g. seats, storage, features)."
    )
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Product Variant'
        verbose_name_plural = 'Product Variants'
        ordering = ['sort_order', 'price', '-created_at']

    def __str__(self):
        return f"{self.product.name} - {self.name} ({self.sku})"
