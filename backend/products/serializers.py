from rest_framework import serializers
from decimal import Decimal
from .models import Product, ProductVariant, ProductCategory, ProductStatus, BillingType


class ProductVariantSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.code', read_only=True)

    class Meta:
        model = ProductVariant
        fields = [
            'id',
            'product',
            'product_name',
            'product_code',
            'name',
            'sku',
            'description',
            'price',
            'currency',
            'billing_type',
            'is_active',
            'attributes',
            'sort_order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_price(self, value):
        if value < Decimal('0.00'):
            raise serializers.ValidationError("Price must be greater than or equal to 0.00.")
        return value

    def validate_sku(self, value):
        sku = value.strip().upper()
        qs = ProductVariant.objects.filter(sku__iexact=sku)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A product variant with this SKU already exists.")
        return sku


class ProductSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    total_variants_count = serializers.IntegerField(read_only=True)
    active_variants_count = serializers.IntegerField(read_only=True)
    min_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    max_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'code',
            'description',
            'category',
            'status',
            'is_recurring',
            'created_by',
            'created_by_name',
            'total_variants_count',
            'active_variants_count',
            'min_price',
            'max_price',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_by',
            'created_by_name',
            'total_variants_count',
            'active_variants_count',
            'min_price',
            'max_price',
            'created_at',
            'updated_at',
        ]

    def validate_code(self, value):
        code = value.strip().lower()
        qs = Product.objects.filter(code__iexact=code)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A product with this unique code/slug already exists.")
        return code


class ProductDetailSerializer(ProductSerializer):
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta(ProductSerializer.Meta):
        fields = ProductSerializer.Meta.fields + ['variants']


class ProductStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['status']


class VariantStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ['is_active']

