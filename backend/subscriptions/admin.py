from django.contrib import admin
from .models import (
    Subscription,
    SubscriptionItem,
    SubscriptionStatusHistory,
    SubscriptionPauseHistory,
    SubscriptionRenewal,
)


class SubscriptionItemInline(admin.TabularInline):
    model = SubscriptionItem
    extra = 0
    readonly_fields = ('product_name', 'variant_name', 'plan_name', 'billing_interval', 'line_subtotal', 'tax_amount', 'line_total')


class SubscriptionStatusHistoryInline(admin.TabularInline):
    model = SubscriptionStatusHistory
    extra = 0
    readonly_fields = ('previous_status', 'new_status', 'changed_by', 'reason', 'timestamp')
    can_delete = False


class SubscriptionPauseHistoryInline(admin.TabularInline):
    model = SubscriptionPauseHistory
    extra = 0
    readonly_fields = ('paused_date', 'resumed_date', 'paused_by', 'resumed_by', 'reason')
    can_delete = False


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        'subscription_number',
        'customer',
        'status',
        'is_paused',
        'total_amount',
        'start_date',
        'expiry_date',
        'next_billing_date',
        'created_at'
    )
    list_filter = ('status', 'is_paused', 'start_date', 'expiry_date')
    search_fields = ('subscription_number', 'customer__email', 'customer__full_name')
    readonly_fields = (
        'subscription_number',
        'subtotal',
        'tax_amount',
        'total_amount',
        'created_at',
        'updated_at'
    )
    inlines = [SubscriptionItemInline, SubscriptionStatusHistoryInline, SubscriptionPauseHistoryInline]


@admin.register(SubscriptionRenewal)
class SubscriptionRenewalAdmin(admin.ModelAdmin):
    list_display = (
        'original_subscription',
        'renewed_subscription',
        'previous_start_date',
        'new_start_date',
        'renewal_date',
        'renewed_by'
    )
    list_filter = ('renewal_date',)
    search_fields = (
        'original_subscription__subscription_number',
        'renewed_subscription__subscription_number'
    )
    readonly_fields = (
        'original_subscription',
        'renewed_subscription',
        'previous_start_date',
        'previous_expiry_date',
        'new_start_date',
        'new_expiry_date',
        'renewal_date',
        'renewed_by'
    )
