from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.core.mail import EmailMessage
from django.db import models
from django.utils import timezone
from rest_framework import generics, status, views, pagination, permissions
from rest_framework.response import Response

from accounts.models import Role
from .models import Invoice, InvoiceStatus, BillingExecutionLog, InvoiceEmailLog, BillingRunType
from .serializers import (
    InvoiceSerializer,
    ManualInvoiceCreateSerializer,
    BillingExecutionLogSerializer,
)
from .permissions import IsAdminOrStaff, IsInvoiceOwnerOrStaff
from .billing_service import BillingEngineService
from .pdf_generator import generate_invoice_pdf
from subscriptions.models import Subscription


class StandardResultsPagination(pagination.PageNumberPagination):
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 100


class InvoiceListCreateView(generics.ListCreateAPIView):
    """
    GET /api/invoices/ - List invoices (Customer sees only own; Admin/Staff see all)
    POST /api/invoices/ - Manually trigger invoice generation for an active subscription
    """
    permission_classes = [permissions.IsAuthenticated, IsInvoiceOwnerOrStaff]
    serializer_class = InvoiceSerializer
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        user = self.request.user
        queryset = Invoice.objects.select_related('customer', 'subscription', 'created_by').prefetch_related('lines').all()

        if user.role == Role.CUSTOMER:
            queryset = queryset.filter(customer=user)

        # Filters
        status_param = self.request.query_params.get('status')
        if status_param and status_param != 'ALL':
            queryset = queryset.filter(status=status_param.upper())

        customer_param = self.request.query_params.get('customer')
        if customer_param and user.role in [Role.ADMIN, Role.STAFF]:
            queryset = queryset.filter(customer_id=customer_param)

        subscription_param = self.request.query_params.get('subscription')
        if subscription_param:
            queryset = queryset.filter(subscription_id=subscription_param)

        is_overdue = self.request.query_params.get('is_overdue')
        if is_overdue is not None and is_overdue.lower() in ('true', '1'):
            today = timezone.localdate()
            queryset = queryset.filter(
                status=InvoiceStatus.CONFIRMED,
                due_date__lt=today,
                outstanding_amount__gt=0
            )

        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                models.Q(invoice_number__icontains=search) |
                models.Q(customer__full_name__icontains=search) |
                models.Q(customer__email__icontains=search) |
                models.Q(subscription__subscription_number__icontains=search)
            )

        return queryset

    def create(self, request, *args, **kwargs):
        if request.user.role not in [Role.ADMIN, Role.STAFF]:
            return Response(
                {"detail": "Only Admin or Staff can create invoices."},
                status=status.HTTP_403_FORBIDDEN
            )

        create_serializer = ManualInvoiceCreateSerializer(data=request.data)
        create_serializer.is_valid(raise_exception=True)
        sub_id = create_serializer.validated_data['subscription_id']
        notes = create_serializer.validated_data.get('notes', '')

        subscription = get_object_or_404(Subscription, pk=sub_id)
        try:
            invoice, created = BillingEngineService.generate_invoice_for_subscription(
                subscription=subscription,
                manual_trigger=True,
                operator_user=request.user
            )
            if notes:
                invoice.notes = f"{invoice.notes}\n{notes}".strip() if invoice.notes else notes
                invoice.save(update_fields=['notes'])

            data = InvoiceSerializer(invoice).data
            status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
            return Response(data, status=status_code)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class InvoiceDetailView(generics.RetrieveAPIView):
    """
    GET /api/invoices/{id}/ - Retrieve full invoice specifications
    """
    permission_classes = [permissions.IsAuthenticated, IsInvoiceOwnerOrStaff]
    serializer_class = InvoiceSerializer
    queryset = Invoice.objects.select_related('customer', 'subscription', 'created_by').prefetch_related('lines', 'email_logs').all()


class InvoiceConfirmView(views.APIView):
    """
    POST /api/invoices/{id}/confirm/ - Transitions DRAFT invoice to CONFIRMED
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        invoice = get_object_or_404(Invoice, pk=pk)
        if invoice.status != InvoiceStatus.DRAFT:
            return Response(
                {"detail": f"Cannot confirm invoice with status '{invoice.status}'. Must be DRAFT."},
                status=status.HTTP_400_BAD_REQUEST
            )
        invoice.status = InvoiceStatus.CONFIRMED
        invoice.save(update_fields=['status', 'updated_at'])
        return Response(InvoiceSerializer(invoice).data)


class InvoiceCancelView(views.APIView):
    """
    POST /api/invoices/{id}/cancel/ - Cancels an invoice
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        invoice = get_object_or_404(Invoice, pk=pk)
        if invoice.status == InvoiceStatus.PAID:
            return Response(
                {"detail": "Cannot cancel a paid invoice."},
                status=status.HTTP_400_BAD_REQUEST
            )
        invoice.status = InvoiceStatus.CANCELLED
        invoice.outstanding_amount = 0
        invoice.save(update_fields=['status', 'outstanding_amount', 'updated_at'])
        return Response(InvoiceSerializer(invoice).data)


class InvoicePDFView(views.APIView):
    """
    GET /api/invoices/{id}/pdf/ - Streams or downloads branded ReportLab invoice PDF
    """
    permission_classes = [permissions.IsAuthenticated, IsInvoiceOwnerOrStaff]

    def get(self, request, pk):
        invoice = get_object_or_404(Invoice, pk=pk)
        self.check_object_permissions(request, invoice)

        buffer = generate_invoice_pdf(invoice)
        pdf_bytes = buffer.getvalue()
        buffer.close()

        download = request.query_params.get('download', 'false').lower() in ('true', '1')
        disposition = 'attachment' if download else 'inline'
        filename = f"{invoice.invoice_number}.pdf"

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'{disposition}; filename="{filename}"'
        return response


class InvoiceSendEmailView(views.APIView):
    """
    POST /api/invoices/{id}/send-email/ - Dispatches invoice PDF via email
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        invoice = get_object_or_404(Invoice, pk=pk)
        recipient = request.data.get('recipient_email', '').strip() or invoice.customer.email
        subject = request.data.get('subject', '').strip() or f"Brightloop Tax Invoice #{invoice.invoice_number}"
        custom_message = request.data.get('message', '').strip()

        if not recipient:
            return Response(
                {"detail": "Recipient email is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        body = (
            f"Dear {invoice.customer.full_name},\n\n"
            f"Please find attached your Tax Invoice #{invoice.invoice_number} from Brightloop Software.\n\n"
            f"Invoice Total: ₹{invoice.total_amount}\n"
            f"Balance Outstanding: ₹{invoice.outstanding_amount}\n"
            f"Due Date: {invoice.due_date}\n\n"
            f"{custom_message}\n\n"
            f"Thank you for choosing Brightloop Software."
        )

        try:
            buffer = generate_invoice_pdf(invoice)
            pdf_bytes = buffer.getvalue()
            buffer.close()

            email = EmailMessage(
                subject=subject,
                body=body,
                to=[recipient],
            )
            email.attach(f"{invoice.invoice_number}.pdf", pdf_bytes, 'application/pdf')
            email.send(fail_silently=False)

            InvoiceEmailLog.objects.create(
                invoice=invoice,
                recipient_email=recipient,
                subject=subject,
                sent_by=request.user,
                status='SENT'
            )
            return Response({
                "message": f"Invoice PDF successfully emailed to {recipient}.",
                "recipient": recipient
            })
        except Exception as e:
            InvoiceEmailLog.objects.create(
                invoice=invoice,
                recipient_email=recipient,
                subject=subject,
                sent_by=request.user,
                status='FAILED',
                error_message=str(e)
            )
            return Response(
                {"detail": f"Failed to deliver invoice email: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class OverdueInvoicesListView(generics.ListAPIView):
    """
    GET /api/invoices/overdue/ - Dedicated endpoint returning unpaid overdue invoices
    """
    permission_classes = [IsAdminOrStaff]
    serializer_class = InvoiceSerializer
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        today = timezone.localdate()
        return Invoice.objects.filter(
            status=InvoiceStatus.CONFIRMED,
            due_date__lt=today,
            outstanding_amount__gt=0
        ).select_related('customer', 'subscription').order_by('due_date')


class BillingRunManualView(views.APIView):
    """
    POST /api/billing/run/ - Manually trigger batch recurring billing cycle
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request):
        log = BillingEngineService.execute_recurring_billing_cycle(
            run_type=BillingRunType.MANUAL,
            operator_user=request.user
        )
        return Response(BillingExecutionLogSerializer(log).data, status=status.HTTP_200_OK)


class BillingLogsListView(generics.ListAPIView):
    """
    GET /api/billing/logs/ - Review historical automated & manual billing execution logs
    """
    permission_classes = [IsAdminOrStaff]
    serializer_class = BillingExecutionLogSerializer
    pagination_class = StandardResultsPagination
    queryset = BillingExecutionLog.objects.select_related('executed_by').all()

