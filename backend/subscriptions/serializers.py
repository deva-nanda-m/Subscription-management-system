from decimal import Decimal
from rest_framework import serializers

from accounts.models import User, Role
from products.models import Product, ProductVariant
from plans.models import SubscriptionPlan
from .models import (
    Subscription,
    SubscriptionItem,
    SubscriptionStatusHistory,
    SubscriptionPauseHistory,
    SubscriptionRenewal,
    SubscriptionStatus,
)


class SubscriptionItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(read_only=True)
    variant_name = serializers.CharField(read_only=True, default='')
    plan_name = serializers.CharField(read_only=True)
    billing_interval = serializers.CharField(read_only=True)
    line_subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    tax_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = SubscriptionItem
        fields = [
            'id',
            'product',
            'product_name',
            'variant',
            'variant_name',
            'plan',
            'plan_name',
            'billing_interval',
            'quantity',
            'unit_price',
            'tax_rate',
            'tax_amount',
            'line_subtotal',
            'line_total',
        ]
        read_only_fields = fields


class SubscriptionStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.full_name', read_only=True)
    changed_by_email = serializers.CharField(source='changed_by.email', read_only=True)

    class Meta:
        model = SubscriptionStatusHistory
        fields = [
            'id',
            'previous_status',
            'new_status',
            'changed_by',
            'changed_by_name',
            'changed_by_email',
            'reason',
            'timestamp',
        ]
        read_only_fields = fields


class SubscriptionPauseHistorySerializer(serializers.ModelSerializer):
    paused_by_name = serializers.CharField(source='paused_by.full_name', read_only=True)
    resumed_by_name = serializers.CharField(source='resumed_by.full_name', read_only=True)

    class Meta:
        model = SubscriptionPauseHistory
        fields = [
            'id',
            'paused_date',
            'resumed_date',
            'paused_by',
            'paused_by_name',
            'resumed_by',
            'resumed_by_name',
            'reason',
        ]
        read_only_fields = fields


class SubscriptionRenewalSerializer(serializers.ModelSerializer):
    original_subscription_number = serializers.CharField(
        source='original_subscription.subscription_number',
        read_only=True
    )
    renewed_subscription_number = serializers.CharField(
        source='renewed_subscription.subscription_number',
        read_only=True
    )
    renewed_by_name = serializers.CharField(source='renewed_by.full_name', read_only=True)

    class Meta:
        model = SubscriptionRenewal
        fields = [
            'id',
            'original_subscription',
            'original_subscription_number',
            'renewed_subscription',
            'renewed_subscription_number',
            'previous_start_date',
            'previous_expiry_date',
            'new_start_date',
            'new_expiry_date',
            'renewal_date',
            'renewed_by_name',
        ]
        read_only_fields = fields


class SubscriptionSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    source_quotation_number = serializers.CharField(
        source='source_quotation.quotation_number',
        read_only=True,
        default=''
    )
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    items = SubscriptionItemSerializer(many=True, read_only=True)
    status_history = SubscriptionStatusHistorySerializer(many=True, read_only=True)
    pause_history = SubscriptionPauseHistorySerializer(many=True, read_only=True)
    renewals_out = SubscriptionRenewalSerializer(many=True, read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id',
            'subscription_number',
            'customer',
            'customer_name',
            'customer_email',
            'source_quotation',
            'source_quotation_number',
            'start_date',
            'expiry_date',
            'activation_date',
            'next_billing_date',
            'payment_terms',
            'subtotal',
            'tax_amount',
            'discount_amount',
            'total_amount',
            'status',
            'is_paused',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
            'items',
            'status_history',
            'pause_history',
            'renewals_out',
        ]
        read_only_fields = fields


class SubscriptionConvertRequestSerializer(serializers.Serializer):
    start_date = serializers.DateField(required=False)
    payment_terms = serializers.CharField(required=False, default="Net 30")


class SubscriptionStatusActionSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default='')


class SubscriptionRenewRequestSerializer(serializers.Serializer):
    new_start_date = serializers.DateField(required=False)
    new_expiry_date = serializers.DateField(required=False)
    reason = serializers.CharField(required=False, allow_blank=True, default='')

