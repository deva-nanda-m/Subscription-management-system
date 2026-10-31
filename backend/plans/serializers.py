from decimal import Decimal
from rest_framework import serializers
from products.models import Product, ProductVariant, ProductStatus
from .models import SubscriptionPlan, PlanStatusHistory, BillingInterval, PlanStatus


class PlanStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.full_name', read_only=True)
    changed_by_email = serializers.CharField(source='changed_by.email', read_only=True)

    class Meta:
        model = PlanStatusHistory
        fields = [
            'id',
            'previous_status',
            'new_status',
            'changed_by',
            'changed_by_name',
            'changed_by_email',
            'change_reason',
            'changed_at',
        ]
        read_only_fields = fields


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.code', read_only=True)
    product_category = serializers.CharField(source='product.category', read_only=True)
    product_status = serializers.CharField(source='product.status', read_only=True)

    variant_name = serializers.CharField(source='variant.name', read_only=True)
    variant_sku = serializers.CharField(source='variant.sku', read_only=True)
    variant_base_price = serializers.DecimalField(source='variant.price', max_digits=10, decimal_places=2, read_only=True)

    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    is_currently_available = serializers.BooleanField(read_only=True)
    availability_display = serializers.CharField(read_only=True)

    status_history = PlanStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = SubscriptionPlan
        fields = [
            'id',
            'plan_code',
            'name',
            'description',
            'product',
            'product_name',
            'product_code',
            'product_category',
            'product_status',
            'variant',
            'variant_name',
            'variant_sku',
            'variant_base_price',
            'price',
            'currency',
            'billing_interval',
            'minimum_quantity',
            'available_from',
            'available_until',
            'is_currently_available',
            'availability_display',
            'auto_close',
            'allow_early_closure',
            'allow_pause',
            'allow_renewal',
            'status',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
            'status_history',
        ]
        read_only_fields = [
            'id',
            'plan_code',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
            'is_currently_available',
            'availability_display',
            'status_history',
        ]

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Plan name is mandatory.")
        return value.strip()

    def validate_price(self, value):
        if value is None or value < Decimal('0.00'):
            raise serializers.ValidationError("Plan price must be a valid non-negative decimal value.")
        return value

    def validate_minimum_quantity(self, value):
        if value is None or value < 1:
            raise serializers.ValidationError("Minimum quantity must be a positive integer (at least 1).")
        return value

    def validate_billing_interval(self, value):
        valid_intervals = [choice[0] for choice in BillingInterval.choices]
        if value not in valid_intervals:
            raise serializers.ValidationError(
                f"Invalid billing interval '{value}'. Allowed intervals: {', '.join(valid_intervals)}."
            )
        return value

    def validate(self, attrs):
        # 1. Validate availability dates
        avail_from = attrs.get('available_from', getattr(self.instance, 'available_from', None))
        avail_until = attrs.get('available_until', getattr(self.instance, 'available_until', None))
        if avail_from and avail_until and avail_until < avail_from:
            raise serializers.ValidationError({
                "available_until": "Available until date cannot precede the available from date."
            })

        # 2. Validate product active status
        product = attrs.get('product', getattr(self.instance, 'product', None))
        if product:
            # During creation or if product is being changed
            if not self.instance or ('product' in attrs and self.instance.product_id != product.id):
                if product.status != ProductStatus.ACTIVE:
                    raise serializers.ValidationError({
                        "product": "Plans can only be associated with active products."
                    })

        # 3. Validate variant belongs to product and is active
        variant = attrs.get('variant', getattr(self.instance, 'variant', None))
        if variant:
            target_product = product or (self.instance.product if self.instance else None)
            if target_product and variant.product_id != target_product.id:
                raise serializers.ValidationError({
                    "variant": f"Variant '{variant.name}' does not belong to product '{target_product.name}'."
                })
            # On creation or variant change, ensure it's active
            if not self.instance or ('variant' in attrs and self.instance.variant_id != variant.id):
                if not variant.is_active:
                    raise serializers.ValidationError({
                        "variant": "The selected product variant is inactive and cannot be attached to a new plan."
                    })

        return attrs


class PlanStatusActionSerializer(serializers.Serializer):
    change_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        default='',
        help_text="Optional administrative rationale for the status transition."
    )

