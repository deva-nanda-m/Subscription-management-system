from django.contrib import admin
from .models import Tax, Discount


@admin.register(Tax)
class TaxAdmin(admin.ModelAdmin):
    list_display = ('name', 'rate', 'tax_type', 'is_active', 'created_by', 'created_at')
    list_filter = ('is_active', 'tax_type')
    search_fields = ('name', 'description')


@admin.register(Discount)
class DiscountAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'code',
        'discount_type',
        'discount_value',
        'application_scope',
        'start_date',
        'end_date',
        'current_usage_count',
        'max_usage_limit',
        'is_active',
    )
    list_filter = ('is_active', 'discount_type', 'application_scope')
    search_fields = ('name', 'code', 'description')
    filter_horizontal = ('applicable_products', 'applicable_plans')

