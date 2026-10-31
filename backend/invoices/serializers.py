from rest_framework import serializers
from .models import Invoice, InvoiceLineItem, BillingExecutionLog, InvoiceEmailLog, InvoiceStatus
from subscriptions.models import Subscription


class InvoiceLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLineItem
        fields = [
            'id',
            'product',
            'product_name',
            'variant_name',
            'plan_name',
            'quantity',
            'unit_price',
            'tax_rate',
            'tax_amount',
            'discount_amount',
            'line_subtotal',
            'line_total',
        ]


class InvoiceEmailLogSerializer(serializers.ModelSerializer):
    sent_by_name = serializers.ReadOnlyField(source='sent_by.full_name')

    class Meta:
        model = InvoiceEmailLog
        fields = [
            'id',
            'recipient_email',
            'subject',
            'sent_by',
            'sent_by_name',
            'sent_at',
            'status',
            'error_message',
        ]


class InvoiceSerializer(serializers.ModelSerializer):
    customer_name = serializers.ReadOnlyField(source='customer.full_name')
    customer_email = serializers.ReadOnlyField(source='customer.email')
    subscription_number = serializers.ReadOnlyField(source='subscription.subscription_number')
    created_by_name = serializers.ReadOnlyField(source='created_by.full_name')
    lines = InvoiceLineItemSerializer(many=True, read_only=True)
    email_logs = InvoiceEmailLogSerializer(many=True, read_only=True)
    is_overdue = serializers.ReadOnlyField()
    days_overdue = serializers.ReadOnlyField()

    class Meta:
        model = Invoice
        fields = [
            'id',
            'invoice_number',
            'customer',
            'customer_name',
            'customer_email',
            'subscription',
            'subscription_number',
            'invoice_date',
            'due_date',
            'billing_period_start',
            'billing_period_end',
            'subtotal',
            'tax_amount',
            'discount_amount',
            'total_amount',
            'amount_paid',
            'outstanding_amount',
            'currency',
            'status',
            'payment_terms',
            'notes',
            'is_overdue',
            'days_overdue',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
            'lines',
            'email_logs',
        ]
        read_only_fields = [
            'id',
            'invoice_number',
            'subtotal',
            'tax_amount',
            'discount_amount',
            'total_amount',
            'amount_paid',
            'outstanding_amount',
            'created_by',
            'created_at',
            'updated_at',
        ]


class ManualInvoiceCreateSerializer(serializers.Serializer):
    subscription_id = serializers.IntegerField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_subscription_id(self, value):
        try:
            subscription = Subscription.objects.get(pk=value)
        except Subscription.DoesNotExist:
            raise serializers.ValidationError("Subscription does not exist.")
        if subscription.is_paused:
            raise serializers.ValidationError("Cannot bill a paused subscription.")
        if subscription.status != 'ACTIVE':
            raise serializers.ValidationError(f"Cannot bill subscription with status '{subscription.status}'. Must be ACTIVE.")
        return value


class BillingExecutionLogSerializer(serializers.ModelSerializer):
    executed_by_name = serializers.ReadOnlyField(source='executed_by.full_name')

    class Meta:
        model = BillingExecutionLog
        fields = [
            'id',
            'run_type',
            'executed_by',
            'executed_by_name',
            'executed_at',
            'subscriptions_evaluated',
            'invoices_generated',
            'failed_count',
            'details',
        ]

