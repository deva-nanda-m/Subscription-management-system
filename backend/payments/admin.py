from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        'payment_reference',
        'invoice',
        'customer',
        'payment_method',
        'amount',
        'payment_date',
        'payment_status',
        'recorded_by',
        'created_at',
    )
    list_filter = ('payment_status', 'payment_method', 'payment_date')
    search_fields = (
        'payment_reference',
        'invoice__invoice_number',
        'customer__full_name',
        'transaction_reference',
        'razorpay_order_id',
        'razorpay_payment_id',
    )

