from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from rest_framework import serializers
from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError

from accounts.models import User, Role
from products.models import Product, ProductVariant
from plans.models import SubscriptionPlan
from .models import (
    QuotationTemplate,
    QuotationTemplateLine,
    Quotation,
    QuotationLineItem,
    QuotationStatusHistory,
    QuotationEmailLog,
    QuotationStatus,
)


class QuotationTemplateLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.code', read_only=True)
    variant_name = serializers.CharField(source='variant.name', read_only=True, default='')
    variant_sku = serializers.CharField(source='variant.sku', read_only=True, default='')
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    plan_interval = serializers.CharField(source='plan.billing_interval', read_only=True)
    plan_price = serializers.DecimalField(source='plan.price', max_digits=10, decimal_places=2, read_only=True)
    plan_min_quantity = serializers.IntegerField(source='plan.minimum_quantity', read_only=True)

    class Meta:
        model = QuotationTemplateLine
        fields = [
            'id',
            'product',
            'product_name',
            'product_code',
            'variant',
            'variant_name',
            'variant_sku',
            'plan',
            'plan_name',
            'plan_interval',
            'plan_price',
            'plan_min_quantity',
            'default_quantity',
        ]

    def validate(self, attrs):
        product = attrs.get('product')
        variant = attrs.get('variant')
        plan = attrs.get('plan')
        qty = attrs.get('default_quantity', 1)

        if variant and variant.product_id != product.id:
            raise serializers.ValidationError({
                "variant": f"Variant '{variant.name}' does not belong to product '{product.name}'."
            })
        if plan and plan.product_id != product.id:
            raise serializers.ValidationError({
                "plan": f"Plan '{plan.name}' is not configured for product '{product.name}'."
            })
        if plan and qty < plan.minimum_quantity:
            raise serializers.ValidationError({
                "default_quantity": f"Quantity ({qty}) cannot be less than plan minimum ({plan.minimum_quantity})."
            })
        return attrs


class QuotationTemplateSerializer(serializers.ModelSerializer):
    lines = QuotationTemplateLineSerializer(many=True, required=False)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = QuotationTemplate
        fields = [
            'id',
            'name',
            'description',
            'validity_days',
            'is_active',
            'lines',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'created_at', 'updated_at']

    @transaction.atomic
    def create(self, validated_data):
        lines_data = validated_data.pop('lines', [])
        if 'created_by' not in validated_data and 'request' in self.context:
            validated_data['created_by'] = self.context['request'].user
        template = QuotationTemplate.objects.create(**validated_data)

        for line_data in lines_data:
            QuotationTemplateLine.objects.create(template=template, **line_data)

        return template

    @transaction.atomic
    def update(self, instance, validated_data):
        lines_data = validated_data.pop('lines', None)

        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get('description', instance.description)
        instance.validity_days = validated_data.get('validity_days', instance.validity_days)
        instance.is_active = validated_data.get('is_active', instance.is_active)
        instance.save()

        if lines_data is not None:
            instance.lines.all().delete()
            for line_data in lines_data:
                QuotationTemplateLine.objects.create(template=instance, **line_data)

        return instance


class QuotationLineItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(read_only=True)
    variant_name = serializers.CharField(read_only=True, default='')
    plan_name = serializers.CharField(read_only=True)
    billing_interval = serializers.CharField(read_only=True)
    line_subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    tax_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = QuotationLineItem
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

    def validate(self, attrs):
        product = attrs.get('product')
        variant = attrs.get('variant')
        plan = attrs.get('plan')
        qty = attrs.get('quantity', 1)

        if variant and variant.product_id != product.id:
            raise serializers.ValidationError({
                "variant": f"Variant '{variant.name}' does not belong to product '{product.name}'."
            })
        if plan and plan.product_id != product.id:
            raise serializers.ValidationError({
                "plan": f"Plan '{plan.name}' is not configured for product '{product.name}'."
            })
        if plan and qty < plan.minimum_quantity:
            raise serializers.ValidationError({
                "quantity": f"Quantity ({qty}) must be at least plan minimum commitment ({plan.minimum_quantity})."
            })
        return attrs


class QuotationStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.full_name', read_only=True)
    changed_by_email = serializers.CharField(source='changed_by.email', read_only=True)

    class Meta:
        model = QuotationStatusHistory
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


class QuotationSerializer(serializers.ModelSerializer):
    lines = QuotationLineItemSerializer(many=True, required=False)
    status_history = QuotationStatusHistorySerializer(many=True, read_only=True)

    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True, default='')
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    expiry_date = serializers.DateField(required=False)

    class Meta:
        model = Quotation
        fields = [
            'id',
            'quotation_number',
            'customer',
            'customer_name',
            'customer_email',
            'template',
            'template_name',
            'quotation_date',
            'validity_days',
            'expiry_date',
            'subtotal',
            'tax_amount',
            'discount_amount',
            'grand_total',
            'notes',
            'terms_and_conditions',
            'status',
            'is_converted',
            'is_expired',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
            'lines',
            'status_history',
        ]
        read_only_fields = [
            'id',
            'quotation_number',
            'subtotal',
            'tax_amount',
            'grand_total',
            'status',
            'is_converted',
            'is_expired',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
            'status_history',
        ]

    def validate_customer(self, value):
        if value.role != Role.CUSTOMER:
            raise serializers.ValidationError("Quotations can only be generated for customer accounts.")
        return value

    def validate(self, attrs):
        if not attrs.get('expiry_date'):
            q_date = attrs.get('quotation_date', timezone.localdate())
            val_days = attrs.get('validity_days', 30)
            attrs['expiry_date'] = q_date + timedelta(days=val_days)
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        lines_data = validated_data.pop('lines', [])
        if 'created_by' not in validated_data and 'request' in self.context:
            validated_data['created_by'] = self.context['request'].user

        quotation = Quotation.objects.create(**validated_data)

        # Create lines with snapshot population
        for line_data in lines_data:
            QuotationLineItem.objects.create(quotation=quotation, **line_data)

        # Calculate backend financial totals
        quotation.calculate_totals()

        # Initial history
        QuotationStatusHistory.objects.create(
            quotation=quotation,
            previous_status='CREATED',
            new_status=quotation.status,
            changed_by=validated_data.get('created_by'),
            reason="Quotation drafted."
        )

        return quotation

    @transaction.atomic
    def update(self, instance, validated_data):
        if instance.status not in (QuotationStatus.DRAFT, QuotationStatus.QUOTATION):
            raise serializers.ValidationError(
                f"Quotation in status '{instance.status}' cannot be edited."
            )

        lines_data = validated_data.pop('lines', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if lines_data is not None:
            instance.lines.all().delete()
            for line_data in lines_data:
                QuotationLineItem.objects.create(quotation=instance, **line_data)
            instance.calculate_totals()

        return instance


class QuotationStatusActionSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default='')


class QuotationEmailSerializer(serializers.Serializer):
    recipient_email = serializers.EmailField(required=False)
    subject = serializers.CharField(required=False, default="Your Brightloop Software Quotation")
    message = serializers.CharField(required=False, allow_blank=True, default="")
