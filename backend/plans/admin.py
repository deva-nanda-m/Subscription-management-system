from django.contrib import admin
from .models import SubscriptionPlan, PlanStatusHistory


class PlanStatusHistoryInline(admin.TabularInline):
    model = PlanStatusHistory
    extra = 0
    readonly_fields = ('previous_status', 'new_status', 'changed_by', 'change_reason', 'changed_at')
    can_delete = False


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = (
        'plan_code',
        'name',
        'product',
        'variant',
        'billing_interval',
        'price',
        'currency',
        'status',
        'available_from',
        'available_until',
        'auto_close',
    )
    list_filter = ('status', 'billing_interval', 'auto_close', 'product')
    search_fields = ('name', 'plan_code', 'product__name')
    readonly_fields = ('plan_code', 'created_at', 'updated_at')
    inlines = [PlanStatusHistoryInline]


@admin.register(PlanStatusHistory)
class PlanStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ('plan', 'previous_status', 'new_status', 'changed_by', 'changed_at')
    list_filter = ('previous_status', 'new_status')
    search_fields = ('plan__name', 'plan__plan_code')
    readonly_fields = ('plan', 'previous_status', 'new_status', 'changed_by', 'change_reason', 'changed_at')
