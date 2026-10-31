from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.core.mail import EmailMessage
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import models
from django.utils import timezone
from rest_framework import generics, status, views, pagination, permissions
from rest_framework.response import Response

from accounts.models import Role
from .models import (
    QuotationTemplate,
    Quotation,
    QuotationStatus,
    QuotationStatusHistory,
    QuotationEmailLog,
)
from .serializers import (
    QuotationTemplateSerializer,
    QuotationSerializer,
    QuotationStatusHistorySerializer,
    QuotationStatusActionSerializer,
    QuotationEmailSerializer,
)
from .permissions import IsAdminOrStaff, IsQuotationOwnerOrStaff
from .pdf_generator import generate_quotation_pdf


class StandardResultsPagination(pagination.PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


# ============================================================================
# Quotation Template Views (Admin & Staff)
# ============================================================================

class QuotationTemplateListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminOrStaff]
    serializer_class = QuotationTemplateSerializer
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        queryset = QuotationTemplate.objects.prefetch_related('lines__product', 'lines__variant', 'lines__plan').all()
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                models.Q(name__icontains=search) | models.Q(description__icontains=search)
            )
        is_active = self.request.query_params.get('is_active')
        if is_active is not None and is_active != 'ALL':
            queryset = queryset.filter(is_active=is_active.lower() in ('true', '1'))
        return queryset


class QuotationTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminOrStaff]
    serializer_class = QuotationTemplateSerializer
    queryset = QuotationTemplate.objects.prefetch_related('lines__product', 'lines__variant', 'lines__plan').all()


# ============================================================================
# Quotation Core Views
# ============================================================================

class QuotationListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsQuotationOwnerOrStaff]
    serializer_class = QuotationSerializer
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        user = self.request.user
        queryset = Quotation.objects.select_related('customer', 'template', 'created_by').prefetch_related('lines').all()

        # Role scoping: Customers only access their own quotations
        if user.role == Role.CUSTOMER:
            queryset = queryset.filter(customer=user)
        else:
            customer_param = self.request.query_params.get('customer')
            if customer_param:
                queryset = queryset.filter(customer_id=customer_param)

        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                models.Q(quotation_number__icontains=search) |
                models.Q(customer__full_name__icontains=search) |
                models.Q(customer__email__icontains=search) |
                models.Q(notes__icontains=search)
            )

        status_param = self.request.query_params.get('status', '').strip().upper()
        if status_param and status_param != 'ALL':
            queryset = queryset.filter(status=status_param)

        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class QuotationDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsQuotationOwnerOrStaff]
    serializer_class = QuotationSerializer
    queryset = Quotation.objects.select_related('customer', 'template', 'created_by').prefetch_related('lines', 'status_history').all()

    def perform_destroy(self, instance):
        if instance.status not in (QuotationStatus.DRAFT, QuotationStatus.CANCELLED):
            raise serializers.ValidationError(
                f"Quotation in status '{instance.status}' cannot be deleted. Cancel it first."
            )
        instance.delete()


# ============================================================================
# Quotation Lifecycle Action Views
# ============================================================================

class QuotationFinalizeView(views.APIView):
    """
    Transitions DRAFT -> QUOTATION (issued to customer).
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        quotation = get_object_or_404(Quotation, pk=pk)
        if quotation.status != QuotationStatus.DRAFT:
            return Response(
                {"detail": f"Only Draft quotations can be finalized. Current status is '{quotation.status}'."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if quotation.lines.count() == 0:
            return Response(
                {"detail": "Cannot finalize an empty quotation. At least one line item is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = QuotationStatusActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get('reason') or "Quotation issued to customer."

        try:
            quotation.transition_status(QuotationStatus.QUOTATION, changed_by=request.user, reason=reason)
            return Response(QuotationSerializer(quotation).data)
        except DjangoValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class QuotationConfirmView(views.APIView):
    """
    Transitions QUOTATION -> CONFIRMED (customer accepts quotation).
    Can be executed by customer owner via portal or staff recording customer acceptance.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        quotation = get_object_or_404(Quotation, pk=pk)

        # Ownership check for customer
        if request.user.role == Role.CUSTOMER and quotation.customer_id != request.user.id:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        if quotation.status not in (QuotationStatus.QUOTATION, QuotationStatus.DRAFT):
            return Response(
                {"detail": f"Quotation in status '{quotation.status}' cannot be confirmed."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if quotation.is_expired:
            quotation.status = QuotationStatus.EXPIRED
            quotation.save(update_fields=['status'])
            return Response(
                {"detail": "This quotation has expired and can no longer be accepted."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = QuotationStatusActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get('reason') or (
            "Accepted by customer via portal." if request.user.role == Role.CUSTOMER else "Customer acceptance confirmed by staff."
        )

        try:
            quotation.transition_status(QuotationStatus.CONFIRMED, changed_by=request.user, reason=reason)
            return Response(QuotationSerializer(quotation).data)
        except DjangoValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class QuotationCancelView(views.APIView):
    """
    Transitions quotation -> CANCELLED.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        quotation = get_object_or_404(Quotation, pk=pk)
        if quotation.is_converted:
            return Response(
                {"detail": "Cannot cancel a quotation that has already been converted to an active subscription."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = QuotationStatusActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get('reason') or "Quotation cancelled by administration."

        try:
            quotation.transition_status(QuotationStatus.CANCELLED, changed_by=request.user, reason=reason)
            return Response(QuotationSerializer(quotation).data)
        except DjangoValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ============================================================================
# PDF Generation & Email Dispatch Views
# ============================================================================

class QuotationPDFView(views.APIView):
    """
    Generates and streams quotation PDF.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        quotation = get_object_or_404(Quotation, pk=pk)

        # Scoping check
        if request.user.role == Role.CUSTOMER and quotation.customer_id != request.user.id:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        pdf_buffer = generate_quotation_pdf(quotation)
        filename = f"{quotation.quotation_number}.pdf"

        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        download = request.query_params.get('download', 'false').lower() in ('true', '1')
        disposition = 'attachment' if download else 'inline'
        response['Content-Disposition'] = f'{disposition}; filename="{filename}"'
        return response


class QuotationSendEmailView(views.APIView):
    """
    Emails the quotation with PDF attachment to the customer.
    Logs success or failure to QuotationEmailLog.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        quotation = get_object_or_404(Quotation, pk=pk)
        serializer = QuotationEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        recipient = serializer.validated_data.get('recipient_email') or quotation.customer.email
        subject = serializer.validated_data.get('subject') or f"Brightloop Quotation {quotation.quotation_number}"
        body_text = serializer.validated_data.get('message') or (
            f"Dear {quotation.customer.full_name},\n\n"
            f"Please find attached your official quotation {quotation.quotation_number} "
            f"for ${quotation.grand_total:,.2f}.\n\n"
            f"Validity Period: {quotation.quotation_date} to {quotation.expiry_date}.\n\n"
            f"Thank you,\nBrightloop Software Team"
        )

        try:
            pdf_buffer = generate_quotation_pdf(quotation)
            email = EmailMessage(
                subject=subject,
                body=body_text,
                to=[recipient],
            )
            email.attach(f"{quotation.quotation_number}.pdf", pdf_buffer.getvalue(), 'application/pdf')
            email.send(fail_silently=False)

            QuotationEmailLog.objects.create(
                quotation=quotation,
                recipient_email=recipient,
                subject=subject,
                sent_by=request.user,
                status='SUCCESS'
            )
            return Response({
                "message": f"Quotation PDF successfully emailed to {recipient}.",
                "recipient": recipient
            })
        except Exception as e:
            QuotationEmailLog.objects.create(
                quotation=quotation,
                recipient_email=recipient,
                subject=subject,
                sent_by=request.user,
                status='FAILED',
                error_message=str(e)
            )
            return Response(
                {"detail": f"Failed to deliver email: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class QuotationHistoryListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsQuotationOwnerOrStaff]
    serializer_class = QuotationStatusHistorySerializer

    def get_queryset(self):
        quotation_id = self.kwargs.get('pk')
        quotation = get_object_or_404(Quotation, pk=quotation_id)
        if self.request.user.role == Role.CUSTOMER and quotation.customer_id != self.request.user.id:
            return QuotationStatusHistory.objects.none()
        return quotation.status_history.all()


class CustomerLookupListView(views.APIView):
    """
    GET /api/customers/lookup/
    Lists active customer accounts for selection in quotation creation.
    Admin & Staff only.
    """
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        from accounts.models import User, Role
        customers = User.objects.filter(role=Role.CUSTOMER, is_active=True).values('id', 'full_name', 'email')
        return Response(list(customers))
