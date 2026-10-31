import json
import logging
from decimal import Decimal
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import models
from rest_framework import generics, status, views, pagination, permissions
from rest_framework.response import Response

from accounts.models import Role
from invoices.models import Invoice, InvoiceStatus
from .models import Payment, PaymentMethod, PaymentStatus
from .serializers import (
    PaymentSerializer,
    ManualPaymentRecordSerializer,
    RazorpayOrderCreateSerializer,
    RazorpayVerifySerializer,
    generate_payment_reference,
)
from .permissions import IsAdminOrStaff, IsPaymentOwnerOrStaff
from .razorpay_service import RazorpayService

logger = logging.getLogger(__name__)


class StandardResultsPagination(pagination.PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class PaymentListCreateView(generics.ListAPIView):
    """
    GET /api/payments/ - List payments (Customer isolated to own, Admin/Staff sees all)
    """
    permission_classes = [permissions.IsAuthenticated, IsPaymentOwnerOrStaff]
    serializer_class = PaymentSerializer
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        user = self.request.user
        queryset = Payment.objects.select_related('invoice', 'customer', 'recorded_by').all()

        if user.role == Role.CUSTOMER:
            queryset = queryset.filter(customer=user)

        # Filters
        invoice_param = self.request.query_params.get('invoice')
        if invoice_param:
            queryset = queryset.filter(invoice_id=invoice_param)

        status_param = self.request.query_params.get('status')
        if status_param and status_param != 'ALL':
            queryset = queryset.filter(payment_status=status_param.upper())

        method_param = self.request.query_params.get('method')
        if method_param and method_param != 'ALL':
            queryset = queryset.filter(payment_method=method_param.upper())

        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                models.Q(payment_reference__icontains=search) |
                models.Q(invoice__invoice_number__icontains=search) |
                models.Q(customer__full_name__icontains=search) |
                models.Q(transaction_reference__icontains=search)
            )

        return queryset


class PaymentDetailView(generics.RetrieveAPIView):
    """
    GET /api/payments/{id}/ - Retrieve payment details
    """
    permission_classes = [permissions.IsAuthenticated, IsPaymentOwnerOrStaff]
    serializer_class = PaymentSerializer
    queryset = Payment.objects.select_related('invoice', 'customer', 'recorded_by').all()


class RecordManualPaymentView(views.APIView):
    """
    POST /api/payments/record-manual/
    Staff or Admin manually records an offline payment (Cash, Bank Transfer, UPI, etc.)
    Validates amount <= invoice.outstanding_amount and automatically updates invoice balances.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request):
        serializer = ManualPaymentRecordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        invoice = serializer.validated_data['invoice']
        amount = serializer.validated_data['amount']
        method = serializer.validated_data['payment_method']
        payment_date = serializer.validated_data.get('payment_date', timezone.localdate())
        txn_ref = serializer.validated_data.get('transaction_reference', '')
        notes = serializer.validated_data.get('notes', '')

        payment = Payment.objects.create(
            payment_reference=generate_payment_reference(),
            invoice=invoice,
            customer=invoice.customer,
            payment_method=method,
            amount=amount,
            payment_date=payment_date,
            transaction_reference=txn_ref,
            payment_status=PaymentStatus.SUCCESSFUL,
            notes=notes,
            recorded_by=request.user
        )

        # Update invoice balance
        invoice.update_payment_balances()

        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


class RazorpayOrderCreateView(views.APIView):
    """
    POST /api/payments/create-razorpay-order/
    Creates a Razorpay Order for online customer payment.
    Pre-creates a PENDING Payment record linked to the order.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = RazorpayOrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invoice_id = serializer.validated_data['invoice_id']

        invoice = get_object_or_404(Invoice, pk=invoice_id)
        if request.user.role == Role.CUSTOMER and invoice.customer_id != request.user.id:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        pay_ref = generate_payment_reference()
        order_info = RazorpayService.create_order(
            amount=invoice.outstanding_amount,
            currency=invoice.currency,
            receipt=pay_ref
        )

        payment = Payment.objects.create(
            payment_reference=pay_ref,
            invoice=invoice,
            customer=invoice.customer,
            payment_method=PaymentMethod.ONLINE,
            amount=invoice.outstanding_amount,
            payment_status=PaymentStatus.PENDING,
            razorpay_order_id=order_info['order_id'],
            notes=f"Razorpay online order for Invoice #{invoice.invoice_number}"
        )

        return Response({
            'order_id': order_info['order_id'],
            'amount': order_info['amount'],
            'currency': order_info['currency'],
            'key_id': order_info['key_id'],
            'invoice_number': invoice.invoice_number,
            'payment_reference': payment.payment_reference,
            'customer_name': invoice.customer.full_name,
            'customer_email': invoice.customer.email,
        }, status=status.HTTP_200_OK)


class RazorpayVerifyView(views.APIView):
    """
    POST /api/payments/verify-razorpay/
    Verifies HMAC SHA256 payment signature from Razorpay checkout.
    Updates payment status to SUCCESSFUL and marks invoice Paid if fully satisfied.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = RazorpayVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order_id = serializer.validated_data['razorpay_order_id']
        payment_id = serializer.validated_data['razorpay_payment_id']
        signature = serializer.validated_data['razorpay_signature']

        is_valid = RazorpayService.verify_payment_signature(
            order_id=order_id,
            payment_id=payment_id,
            signature=signature
        )

        if not is_valid:
            logger.warning(f"Invalid Razorpay signature for order: {order_id}")
            return Response(
                {"detail": "Payment signature verification failed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment = get_object_or_404(Payment, razorpay_order_id=order_id)
        if request.user.role == Role.CUSTOMER and payment.customer_id != request.user.id:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        payment.mark_successful(
            transaction_ref=payment_id,
            payment_id=payment_id,
            signature=signature
        )

        return Response({
            "message": "Payment verified successfully.",
            "payment": PaymentSerializer(payment).data,
            "invoice_status": payment.invoice.status,
            "outstanding_amount": str(payment.invoice.outstanding_amount)
        }, status=status.HTTP_200_OK)


class RazorpayWebhookView(views.APIView):
    """
    POST /api/payments/razorpay-webhook/
    Public webhook receiver for Razorpay asynchronous payment events.
    Verifies signature and idempotently marks payment as successful.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        signature = request.headers.get('X-Razorpay-Signature', '')
        raw_body = request.body

        if not RazorpayService.verify_webhook_signature(raw_body, signature):
            logger.warning("Razorpay webhook signature verification failed.")
            return Response({"detail": "Invalid signature."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            event_data = json.loads(raw_body.decode('utf-8'))
        except Exception:
            return Response({"detail": "Invalid JSON payload."}, status=status.HTTP_400_BAD_REQUEST)

        event = event_data.get('event')
        if event == 'payment.captured':
            payment_entity = event_data.get('payload', {}).get('payment', {}).get('entity', {})
            order_id = payment_entity.get('order_id')
            payment_id = payment_entity.get('id')

            if order_id:
                payment = Payment.objects.filter(razorpay_order_id=order_id).first()
                if payment:
                    payment.mark_successful(transaction_ref=payment_id, payment_id=payment_id)
                    logger.info(f"Webhook reconciled Payment {payment.payment_reference} for Order {order_id}")

        return Response({"status": "received"}, status=status.HTTP_200_OK)

