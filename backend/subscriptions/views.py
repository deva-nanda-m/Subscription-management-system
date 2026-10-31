from decimal import Decimal
from datetime import timedelta
from dateutil.relativedelta import relativedelta
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import models, transaction
from django.utils import timezone
from rest_framework import generics, status, views, pagination, permissions
from rest_framework.response import Response

from accounts.models import Role
from plans.models import BillingInterval
from .models import (
    Subscription,
    SubscriptionItem,
    SubscriptionStatus,
    SubscriptionStatusHistory,
    SubscriptionPauseHistory,
    SubscriptionRenewal,
    generate_subscription_number,
)
from .serializers import (
    SubscriptionSerializer,
    SubscriptionStatusHistorySerializer,
    SubscriptionPauseHistorySerializer,
    SubscriptionRenewalSerializer,
    SubscriptionConvertRequestSerializer,
    SubscriptionStatusActionSerializer,
    SubscriptionRenewRequestSerializer,
)
from .permissions import IsAdminOrStaff, IsSubscriptionOwnerOrStaff
from .conversion_service import convert_quotation_to_subscription


class StandardResultsPagination(pagination.PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class SubscriptionConvertView(views.APIView):
    """
    POST /api/subscriptions/convert/<quotation_id>/
    Converts a CONFIRMED customer quotation into an active subscription record.
    Admin & Staff only.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, quotation_id):
        serializer = SubscriptionConvertRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        start_date = serializer.validated_data.get('start_date')
        payment_terms = serializer.validated_data.get('payment_terms', 'Net 30')

        try:
            subscription = convert_quotation_to_subscription(
                quotation_id=quotation_id,
                user=request.user,
                start_date=start_date,
                payment_terms=payment_terms,
            )
            return Response(SubscriptionSerializer(subscription).data, status=status.HTTP_201_CREATED)
        except DjangoValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": f"Conversion error: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class SubscriptionListView(generics.ListAPIView):
    """
    GET /api/subscriptions/
    Lists subscriptions with search, status filters, and pagination.
    Customers access strictly their own subscriptions.
    """
    permission_classes = [permissions.IsAuthenticated, IsSubscriptionOwnerOrStaff]
    serializer_class = SubscriptionSerializer
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        user = self.request.user
        queryset = Subscription.objects.select_related('customer', 'source_quotation', 'created_by').prefetch_related('items').all()

        if user.role == Role.CUSTOMER:
            queryset = queryset.filter(customer=user)
        else:
            customer_param = self.request.query_params.get('customer')
            if customer_param:
                queryset = queryset.filter(customer_id=customer_param)

        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                models.Q(subscription_number__icontains=search) |
                models.Q(customer__full_name__icontains=search) |
                models.Q(customer__email__icontains=search) |
                models.Q(items__product_name__icontains=search)
            ).distinct()

        status_param = self.request.query_params.get('status', '').strip().upper()
        if status_param and status_param != 'ALL':
            queryset = queryset.filter(status=status_param)

        is_paused = self.request.query_params.get('is_paused')
        if is_paused is not None and is_paused != 'ALL':
            queryset = queryset.filter(is_paused=is_paused.lower() in ('true', '1'))

        return queryset


class SubscriptionDetailView(generics.RetrieveAPIView):
    """
    GET /api/subscriptions/<id>/
    Retrieves full subscription details with items, lifecycle audit history, and renewals.
    """
    permission_classes = [permissions.IsAuthenticated, IsSubscriptionOwnerOrStaff]
    serializer_class = SubscriptionSerializer
    queryset = Subscription.objects.select_related('customer', 'source_quotation', 'created_by').prefetch_related(
        'items', 'status_history', 'pause_history', 'renewals_out'
    ).all()


class SubscriptionActivateView(views.APIView):
    """
    POST /api/subscriptions/<id>/activate/
    Activates a confirmed subscription when its start date is reached.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        subscription = get_object_or_404(Subscription, pk=pk)
        serializer = SubscriptionStatusActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get('reason') or "Subscription activated for service delivery."

        try:
            subscription.transition_status(SubscriptionStatus.ACTIVE, changed_by=request.user, reason=reason)
            return Response(SubscriptionSerializer(subscription).data)
        except DjangoValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SubscriptionPauseView(views.APIView):
    """
    POST /api/subscriptions/<id>/pause/
    Temporarily pauses an active subscription (checks plan's allow_pause).
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        subscription = get_object_or_404(Subscription, pk=pk)
        serializer = SubscriptionStatusActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get('reason') or "Subscription paused by administration."

        try:
            subscription.pause(paused_by=request.user, reason=reason)
            return Response(SubscriptionSerializer(subscription).data)
        except DjangoValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SubscriptionResumeView(views.APIView):
    """
    POST /api/subscriptions/<id>/resume/
    Resumes a paused subscription.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        subscription = get_object_or_404(Subscription, pk=pk)
        try:
            subscription.resume(resumed_by=request.user)
            return Response(SubscriptionSerializer(subscription).data)
        except DjangoValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SubscriptionCloseView(views.APIView):
    """
    POST /api/subscriptions/<id>/close/
    Permanently closes a subscription (checks plan's allow_early_closure).
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        subscription = get_object_or_404(Subscription, pk=pk)
        serializer = SubscriptionStatusActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get('reason') or "Subscription closed permanently."

        try:
            subscription.close(closed_by=request.user, reason=reason)
            return Response(SubscriptionSerializer(subscription).data)
        except DjangoValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SubscriptionRenewView(views.APIView):
    """
    POST /api/subscriptions/<id>/renew/
    Renews an eligible subscription, generating a linked renewed Subscription record.
    Checks plan's allow_renewal policy and preserves historical continuity.
    """
    permission_classes = [IsAdminOrStaff]

    @transaction.atomic
    def post(self, request, pk):
        subscription = get_object_or_404(Subscription, pk=pk)

        # 1. Validation: Plan allow_renewal check
        for item in subscription.items.all():
            if item.plan and not item.plan.allow_renewal:
                return Response(
                    {"detail": f"Plan '{item.plan.name}' explicitly prohibits renewal."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = SubscriptionRenewRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        today = timezone.localdate()
        base_start = serializer.validated_data.get('new_start_date') or (
            (subscription.expiry_date + timedelta(days=1)) if subscription.expiry_date else today
        )

        # Compute next expiry
        intervals = [item.billing_interval for item in subscription.items.all()]
        if serializer.validated_data.get('new_expiry_date'):
            base_expiry = serializer.validated_data['new_expiry_date']
        elif BillingInterval.YEARLY in intervals:
            base_expiry = base_start + relativedelta(years=1)
        elif BillingInterval.MONTHLY in intervals:
            base_expiry = base_start + relativedelta(years=1)
        else:
            base_expiry = base_start + relativedelta(months=1)

        reason = serializer.validated_data.get('reason') or f"Renewed from {subscription.subscription_number}"

        # 2. Create the renewed subscription
        new_sub = Subscription.objects.create(
            subscription_number=generate_subscription_number(),
            customer=subscription.customer,
            source_quotation=subscription.source_quotation,
            start_date=base_start,
            expiry_date=base_expiry,
            activation_date=base_start if base_start <= today else None,
            payment_terms=subscription.payment_terms,
            subtotal=subscription.subtotal,
            tax_amount=subscription.tax_amount,
            discount_amount=subscription.discount_amount,
            total_amount=subscription.total_amount,
            status=SubscriptionStatus.ACTIVE if base_start <= today else SubscriptionStatus.CONFIRMED,
            is_paused=False,
            created_by=request.user,
        )

        # 3. Duplicate lines with historical preservation
        for item in subscription.items.all():
            SubscriptionItem.objects.create(
                subscription=new_sub,
                product=item.product,
                variant=item.variant,
                plan=item.plan,
                product_name=item.product_name,
                variant_name=item.variant_name,
                plan_name=item.plan_name,
                billing_interval=item.billing_interval,
                quantity=item.quantity,
                unit_price=item.unit_price,
                tax_rate=item.tax_rate,
                tax_amount=item.tax_amount,
                line_subtotal=item.line_subtotal,
                line_total=item.line_total,
            )

        new_sub.next_billing_date = new_sub.calculate_next_billing_date(base_start)
        new_sub.save(update_fields=['next_billing_date'])

        # 4. Create SubscriptionRenewal record
        renewal_record = SubscriptionRenewal.objects.create(
            original_subscription=subscription,
            renewed_subscription=new_sub,
            previous_start_date=subscription.start_date,
            previous_expiry_date=subscription.expiry_date,
            new_start_date=base_start,
            new_expiry_date=base_expiry,
            renewed_by=request.user,
        )

        # 5. Log history
        SubscriptionStatusHistory.objects.create(
            subscription=new_sub,
            previous_status='RENEWAL_GENESIS',
            new_status=new_sub.status,
            changed_by=request.user,
            reason=f"Generated via renewal of subscription {subscription.subscription_number}."
        )

        SubscriptionStatusHistory.objects.create(
            subscription=subscription,
            previous_status=subscription.status,
            new_status=subscription.status,
            changed_by=request.user,
            reason=f"Renewed into subscription {new_sub.subscription_number}."
        )

        return Response(SubscriptionSerializer(new_sub).data, status=status.HTTP_201_CREATED)


class SubscriptionHistoryListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsSubscriptionOwnerOrStaff]
    serializer_class = SubscriptionStatusHistorySerializer

    def get_queryset(self):
        sub_id = self.kwargs.get('pk')
        sub = get_object_or_404(Subscription, pk=sub_id)
        if self.request.user.role == Role.CUSTOMER and sub.customer_id != self.request.user.id:
            return SubscriptionStatusHistory.objects.none()
        return sub.status_history.all()


class SubscriptionRenewalListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsSubscriptionOwnerOrStaff]
    serializer_class = SubscriptionRenewalSerializer

    def get_queryset(self):
        sub_id = self.kwargs.get('pk')
        sub = get_object_or_404(Subscription, pk=sub_id)
        if self.request.user.role == Role.CUSTOMER and sub.customer_id != self.request.user.id:
            return SubscriptionRenewal.objects.none()
        return SubscriptionRenewal.objects.filter(
            models.Q(original_subscription_id=sub_id) | models.Q(renewed_subscription_id=sub_id)
        )
