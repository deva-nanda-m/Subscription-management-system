from decimal import Decimal
from rest_framework import serializers
from .models import Payment, PaymentMethod, PaymentStatus
from invoices.models import Invoice, InvoiceStatus


def generate_payment_reference() -> str:
    from django.utils import timezone
    now = timezone.localdate()
    prefix = f"PAY-{now.strftime('%Y%m')}-"
    last_pay = Payment.objects.filter(payment_reference__startswith=prefix).order_by('-payment_reference').first()
    if last_pay:
        try:
            last_seq = int(last_pay.payment_reference.split('-')[-1])
            new_seq = last_seq + 1
        except (ValueError, IndexError):
            new_seq = 1
    else:
        new_seq = 1
    return f"{prefix}{new_seq:04d}"


class PaymentSerializer(serializers.ModelSerializer):
    customer_name = serializers.ReadOnlyField(source='customer.full_name')
    customer_email = serializers.ReadOnlyField(source='customer.email')
    invoice_number = serializers.ReadOnlyField(source='invoice.invoice_number')
    recorded_by_name = serializers.ReadOnlyField(source='recorded_by.full_name')

    class Meta:
        model = Payment
        fields = [
            'id',
            'payment_reference',
            'invoice',
            'invoice_number',
            'customer',
            'customer_name',
            'customer_email',
            'payment_method',
            'amount',
            'payment_date',
            'transaction_reference',
            'payment_status',
            'notes',
            'recorded_by',
            'recorded_by_name',
            'razorpay_order_id',
            'razorpay_payment_id',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'payment_reference',
            'customer',
            'payment_status',
            'recorded_by',
            'created_at',
        ]


class ManualPaymentRecordSerializer(serializers.Serializer):
    invoice_id = serializers.IntegerField(required=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)
    payment_method = serializers.ChoiceField(choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    payment_date = serializers.DateField(required=False)
    transaction_reference = serializers.CharField(required=False, allow_blank=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        invoice_id = attrs.get('invoice_id')
        amount = attrs.get('amount')

        try:
            invoice = Invoice.objects.get(pk=invoice_id)
        except Invoice.DoesNotExist:
            raise serializers.ValidationError({'invoice_id': "Invoice does not exist."})

        if invoice.status == InvoiceStatus.PAID or invoice.outstanding_amount <= Decimal('0.00'):
            raise serializers.ValidationError({'amount': "Invoice is already paid in full."})

        if invoice.status == InvoiceStatus.CANCELLED:
            raise serializers.ValidationError({'invoice_id': "Cannot record payment on a cancelled invoice."})

        if amount <= Decimal('0.00'):
            raise serializers.ValidationError({'amount': "Payment amount must be greater than zero."})

        if amount > invoice.outstanding_amount:
            raise serializers.ValidationError({
                'amount': f"Payment amount (₹{amount}) cannot exceed outstanding invoice balance (₹{invoice.outstanding_amount})."
            })

        attrs['invoice'] = invoice
        return attrs


class RazorpayOrderCreateSerializer(serializers.Serializer):
    invoice_id = serializers.IntegerField(required=True)

    def validate_invoice_id(self, value):
        try:
            invoice = Invoice.objects.get(pk=value)
        except Invoice.DoesNotExist:
            raise serializers.ValidationError("Invoice does not exist.")

        if invoice.status == InvoiceStatus.PAID or invoice.outstanding_amount <= Decimal('0.00'):
            raise serializers.ValidationError("Invoice is already paid in full.")

        if invoice.status == InvoiceStatus.CANCELLED:
            raise serializers.ValidationError("Cannot create payment order for a cancelled invoice.")

        return value


class RazorpayVerifySerializer(serializers.Serializer):
    razorpay_order_id = serializers.CharField(required=True)
    razorpay_payment_id = serializers.CharField(required=True)
    razorpay_signature = serializers.CharField(required=True)

