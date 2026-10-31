from django.contrib import admin
from .models import (
    QuotationTemplate,
    QuotationTemplateLine,
    Quotation,
    QuotationLineItem,
    QuotationStatusHistory,
    QuotationEmailLog,
)


class QuotationTemplateLineInline(admin.TabularInline):
    model = QuotationTemplateLine
    extra = 1


@admin.register(QuotationTemplate)
class QuotationTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'validity_days', 'is_active', 'created_by', 'created_at')
    list_filter = ('is_active', 'validity_days')
    search_fields = ('name', 'description')
    inlines = [QuotationTemplateLineInline]


class QuotationLineItemInline(admin.TabularInline):
    model = QuotationLineItem
    extra = 0
    readonly_fields = ('line_subtotal', 'tax_amount', 'line_total')


class QuotationStatusHistoryInline(admin.TabularInline):
    model = QuotationStatusHistory
    extra = 0
    readonly_fields = ('previous_status', 'new_status', 'changed_by', 'reason', 'timestamp')
    can_delete = False


@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = (
        'quotation_number',
        'customer',
        'status',
        'grand_total',
        'quotation_date',
        'expiry_date',
        'is_converted',
        'created_at'
    )
    list_filter = ('status', 'is_converted', 'quotation_date')
    search_fields = ('quotation_number', 'customer__email', 'customer__full_name')
    readonly_fields = (
        'quotation_number',
        'subtotal',
        'tax_amount',
        'grand_total',
        'is_converted',
        'created_at',
        'updated_at'
    )
    inlines = [QuotationLineItemInline, QuotationStatusHistoryInline]


@admin.register(QuotationEmailLog)
class QuotationEmailLogAdmin(admin.ModelAdmin):
    list_display = ('quotation', 'recipient_email', 'subject', 'status', 'sent_at')
    list_filter = ('status', 'sent_at')
    search_fields = ('recipient_email', 'subject', 'quotation__quotation_number')
    readonly_fields = ('quotation', 'recipient_email', 'subject', 'sent_by', 'status', 'error_message', 'sent_at')
