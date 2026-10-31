from django.contrib import admin
from .models import Invoice, InvoiceLineItem, BillingExecutionLog, InvoiceEmailLog


class InvoiceLineItemInline(admin.TabularInline):
    model = InvoiceLineItem
    extra = 0
    fields = ('product_name', 'variant_name', 'plan_name', 'quantity', 'unit_price', 'tax_rate', 'tax_amount', 'discount_amount', 'line_total')


class InvoiceEmailLogInline(admin.TabularInline):
    model = InvoiceEmailLog
    extra = 0
    readonly_fields = ('recipient_email', 'subject', 'sent_by', 'sent_at', 'status', 'error_message')


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = (
        'invoice_number',
        'customer',
        'subscription',
        'invoice_date',
        'due_date',
        'total_amount',
        'amount_paid',
        'outstanding_amount',
        'status',
    )
    list_filter = ('status', 'currency', 'invoice_date', 'due_date')
    search_fields = ('invoice_number', 'customer__full_name', 'customer__email')
    inlines = [InvoiceLineItemInline, InvoiceEmailLogInline]


@admin.register(BillingExecutionLog)
class BillingExecutionLogAdmin(admin.ModelAdmin):
    list_display = (
        'run_type',
        'executed_by',
        'executed_at',
        'subscriptions_evaluated',
        'invoices_generated',
        'failed_count',
    )
    list_filter = ('run_type', 'executed_at')

