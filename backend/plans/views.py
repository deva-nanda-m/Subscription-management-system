from django.db import models
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import generics, status, views, pagination
from rest_framework.response import Response

from .models import SubscriptionPlan, PlanStatusHistory, PlanStatus, BillingInterval
from .serializers import (
    SubscriptionPlanSerializer,
    PlanStatusHistorySerializer,
    PlanStatusActionSerializer,
)
from .permissions import IsAdminOrStaffReadOnly


class StandardResultsSetPagination(pagination.PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class PlanListCreateView(generics.ListCreateAPIView):
    """
    GET: List all subscription plans with rich search, filtering, and sorting.
    POST: Create a new subscription plan (Admin only).
    """
    permission_classes = [IsAdminOrStaffReadOnly]
    serializer_class = SubscriptionPlanSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = SubscriptionPlan.objects.select_related('product', 'variant', 'created_by').all()

        # Search filter
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                models.Q(name__icontains=search) |
                models.Q(plan_code__icontains=search) |
                models.Q(description__icontains=search) |
                models.Q(product__name__icontains=search) |
                models.Q(product__code__icontains=search) |
                models.Q(variant__name__icontains=search) |
                models.Q(variant__sku__icontains=search)
            )

        # Product filter
        product_param = self.request.query_params.get('product')
        if product_param:
            queryset = queryset.filter(product_id=product_param)

        # Billing Interval filter
        interval_param = self.request.query_params.get('billing_interval', '').strip().upper()
        if interval_param and interval_param != 'ALL':
            queryset = queryset.filter(billing_interval=interval_param)

        # Status filter
        status_param = self.request.query_params.get('status', '').strip().upper()
        if status_param and status_param != 'ALL':
            queryset = queryset.filter(status=status_param)

        # Active / currently available filter
        available_only = self.request.query_params.get('available_only')
        if available_only and available_only.lower() in ('true', '1'):
            today = timezone.now().date()
            queryset = queryset.filter(
                status=PlanStatus.ACTIVE,
                available_from__lte=today
            ).filter(
                models.Q(available_until__isnull=True) | models.Q(available_until__gte=today)
            )

        # Sorting
        ordering_param = self.request.query_params.get('ordering', '-created_at').strip()
        valid_orderings = [
            'name', '-name',
            'price', '-price',
            'created_at', '-created_at',
            'billing_interval', '-billing_interval',
            'minimum_quantity', '-minimum_quantity',
        ]
        if ordering_param in valid_orderings:
            queryset = queryset.order_by(ordering_param)
        else:
            queryset = queryset.order_by('-created_at')

        return queryset

    def perform_create(self, serializer):
        plan = serializer.save(created_by=self.request.user)
        # Log initial creation in status history
        PlanStatusHistory.objects.create(
            plan=plan,
            previous_status='NONE',
            new_status=plan.status,
            changed_by=self.request.user,
            change_reason='Initial subscription plan creation.'
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {
                "success": True,
                "message": f"Subscription plan '{serializer.instance.name}' created successfully.",
                "plan": serializer.data
            },
            status=status.HTTP_201_CREATED
        )


class PlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: View detailed plan information.
    PUT/PATCH: Update existing plan details (Admin only).
    DELETE: Delete plan if unreferenced (Admin only).
    """
    permission_classes = [IsAdminOrStaffReadOnly]
    serializer_class = SubscriptionPlanSerializer
    queryset = SubscriptionPlan.objects.select_related('product', 'variant', 'created_by').prefetch_related('status_history__changed_by').all()
    lookup_field = 'pk'

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        plan = serializer.save()
        return Response(
            {
                "success": True,
                "message": f"Subscription plan '{plan.name}' updated successfully.",
                "plan": serializer.data
            },
            status=status.HTTP_200_OK
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        plan_name = instance.name
        try:
            instance.delete()
        except models.ProtectedError:
            return Response(
                {
                    "success": False,
                    "message": "Cannot delete plan: it is referenced by existing quotation or subscription records."
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        return Response(
            {"success": True, "message": f"Subscription plan '{plan_name}' was successfully deleted."},
            status=status.HTTP_200_OK
        )


# ==============================================================================
# Plan Status Transition Action Views
# ==============================================================================

class PlanPauseView(views.APIView):
    """
    Admin-only endpoint to temporarily pause a plan from new subscriptions.
    Requires allow_pause == True.
    """
    permission_classes = [IsAdminOrStaffReadOnly]

    def patch(self, request, pk):
        plan = get_object_or_404(SubscriptionPlan, pk=pk)
        serializer = PlanStatusActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get('change_reason') or 'Manually paused by Administrator.'

        try:
            plan.transition_status(PlanStatus.PAUSED, changed_by=request.user, reason=reason)
        except ValidationError as e:
            return Response(
                {"success": False, "message": e.message if hasattr(e, 'message') else str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                "success": True,
                "message": f"Plan '{plan.name}' has been paused. It is temporarily unavailable for new subscriptions.",
                "plan": SubscriptionPlanSerializer(plan).data
            },
            status=status.HTTP_200_OK
        )


class PlanResumeView(views.APIView):
    """
    Admin-only endpoint to resume a paused plan back to active status.
    """
    permission_classes = [IsAdminOrStaffReadOnly]

    def patch(self, request, pk):
        plan = get_object_or_404(SubscriptionPlan, pk=pk)
        serializer = PlanStatusActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get('change_reason') or 'Resumed by Administrator.'

        try:
            plan.transition_status(PlanStatus.ACTIVE, changed_by=request.user, reason=reason)
        except ValidationError as e:
            return Response(
                {"success": False, "message": e.message if hasattr(e, 'message') else str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                "success": True,
                "message": f"Plan '{plan.name}' has been resumed to Active status.",
                "plan": SubscriptionPlanSerializer(plan).data
            },
            status=status.HTTP_200_OK
        )


class PlanCloseView(views.APIView):
    """
    Admin-only endpoint to close a plan.
    Requires allow_early_closure == True. Closed plans cannot be resumed.
    """
    permission_classes = [IsAdminOrStaffReadOnly]

    def patch(self, request, pk):
        plan = get_object_or_404(SubscriptionPlan, pk=pk)
        serializer = PlanStatusActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get('change_reason') or 'Manually closed by Administrator.'

        try:
            plan.transition_status(PlanStatus.CLOSED, changed_by=request.user, reason=reason)
        except ValidationError as e:
            return Response(
                {"success": False, "message": e.message if hasattr(e, 'message') else str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                "success": True,
                "message": f"Plan '{plan.name}' has been closed. It is permanently closed to new subscriptions.",
                "plan": SubscriptionPlanSerializer(plan).data
            },
            status=status.HTTP_200_OK
        )


class PlanActivateView(views.APIView):
    """
    Admin-only endpoint to administratively activate an Inactive plan.
    """
    permission_classes = [IsAdminOrStaffReadOnly]

    def patch(self, request, pk):
        plan = get_object_or_404(SubscriptionPlan, pk=pk)
        serializer = PlanStatusActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get('change_reason') or 'Administratively activated by Administrator.'

        try:
            plan.transition_status(PlanStatus.ACTIVE, changed_by=request.user, reason=reason)
        except ValidationError as e:
            return Response(
                {"success": False, "message": e.message if hasattr(e, 'message') else str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                "success": True,
                "message": f"Plan '{plan.name}' is now Active.",
                "plan": SubscriptionPlanSerializer(plan).data
            },
            status=status.HTTP_200_OK
        )


class PlanHistoryListView(generics.ListAPIView):
    """
    Returns audit trail of status changes for a given plan.
    """
    permission_classes = [IsAdminOrStaffReadOnly]
    serializer_class = PlanStatusHistorySerializer

    def get_queryset(self):
        plan_id = self.kwargs.get('pk')
        return PlanStatusHistory.objects.filter(plan_id=plan_id).select_related('changed_by').order_by('-changed_at')


class PlanDashboardMetricsView(views.APIView):
    """
    Provides aggregated plan metrics for the dashboard summary cards.
    """
    permission_classes = [IsAdminOrStaffReadOnly]

    def get(self, request):
        qs = SubscriptionPlan.objects.all()
        total_plans = qs.count()
        active_plans = qs.filter(status=PlanStatus.ACTIVE).count()
        paused_plans = qs.filter(status=PlanStatus.PAUSED).count()
        closed_plans = qs.filter(status=PlanStatus.CLOSED).count()

        # Billing frequency breakdown
        interval_counts = {
            'DAILY': qs.filter(billing_interval=BillingInterval.DAILY).count(),
            'WEEKLY': qs.filter(billing_interval=BillingInterval.WEEKLY).count(),
            'MONTHLY': qs.filter(billing_interval=BillingInterval.MONTHLY).count(),
            'YEARLY': qs.filter(billing_interval=BillingInterval.YEARLY).count(),
        }

        # Currently available right now
        today = timezone.now().date()
        available_count = qs.filter(
            status=PlanStatus.ACTIVE,
            available_from__lte=today
        ).filter(
            models.Q(available_until__isnull=True) | models.Q(available_until__gte=today)
        ).count()

        return Response({
            "total_plans": total_plans,
            "active_plans": active_plans,
            "paused_plans": paused_plans,
            "closed_plans": closed_plans,
            "currently_available": available_count,
            "interval_counts": interval_counts,
        })
