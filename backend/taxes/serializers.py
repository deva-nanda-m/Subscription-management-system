from decimal import Decimal
from rest_framework import serializers
from .models import Tax, Discount, TaxType, DiscountType, DiscountScope
from products.models import Product
from plans.models import SubscriptionPlan


class TaxSerializer(serializers.ModelSerializer):
    created_by_name = serializers.ReadOnlyField(source='created_by.full_name')

    class Meta:
        model = Tax
        fields = [
            'id',
            'name',
            'rate',
            'description',
            'tax_type',
            'is_active',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'created_at', 'updated_at']

    def validate_rate(self, value):
        if value < Decimal('0.00') or value > Decimal('100.00'):
            raise serializers.ValidationError("Tax rate must be between 0.00% and 100.00%.")
        return value

    def create(self, validated_data):
        user = self.context['request'].user
        if 'created_by' not in validated_data:
            validated_data['created_by'] = user
        return super().create(validated_data)


class DiscountSerializer(serializers.ModelSerializer):
    created_by_name = serializers.ReadOnlyField(source='created_by.full_name')
    applicable_product_names = serializers.SerializerMethodField()
    applicable_plan_names = serializers.SerializerMethodField()

    class Meta:
        model = Discount
        fields = [
            'id',
            'name',
            'code',
            'description',
            'discount_type',
            'discount_value',
            'minimum_purchase_amount',
            'minimum_quantity',
            'start_date',
            'end_date',
            'max_usage_limit',
            'current_usage_count',
            'application_scope',
            'applicable_products',
            'applicable_plans',
            'applicable_product_names',
            'applicable_plan_names',
            'is_active',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'current_usage_count', 'created_by', 'created_by_name', 'created_at', 'updated_at']

    def get_applicable_product_names(self, obj):
        return [p.name for p in obj.applicable_products.all()]

    def get_applicable_plan_names(self, obj):
        return [plan.name for plan in obj.applicable_plans.all()]

    def validate(self, attrs):
        discount_type = attrs.get('discount_type', getattr(self.instance, 'discount_type', None))
        discount_value = attrs.get('discount_value', getattr(self.instance, 'discount_value', None))
        start_date = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end_date = attrs.get('end_date', getattr(self.instance, 'end_date', None))

        if discount_type == DiscountType.PERCENTAGE and discount_value is not None:
            if discount_value > Decimal('100.00'):
                raise serializers.ValidationError({
                    'discount_value': "Percentage discount cannot exceed 100.00%."
                })

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({
                'end_date': "End date cannot be earlier than start date."
            })

        return attrs

    def create(self, validated_data):
        user = self.context['request'].user
        if 'created_by' not in validated_data:
            validated_data['created_by'] = user
        return super().create(validated_data)

