from django.contrib import admin
from .models import Product, ProductVariant


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1
    fields = ('name', 'sku', 'price', 'currency', 'billing_type', 'is_active', 'sort_order')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'code', 'category', 'status', 'is_recurring', 'total_variants_count', 'created_at')
    list_filter = ('category', 'status', 'is_recurring')
    search_fields = ('name', 'code', 'description')
    prepopulated_fields = {'code': ('name',)}
    inlines = [ProductVariantInline]
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ('id', 'product', 'name', 'sku', 'price', 'currency', 'billing_type', 'is_active')
    list_filter = ('is_active', 'billing_type', 'product')
    search_fields = ('name', 'sku', 'product__name')
    readonly_fields = ('created_at', 'updated_at')
