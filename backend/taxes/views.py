from rest_framework import generics, status, views, pagination
from rest_framework.response import Response
from django.db import models
from django.shortcuts import get_object_or_404
from .models import Tax, Discount
from .serializers import TaxSerializer, DiscountSerializer
from .permissions import IsAdminOrStaffReadOnly, IsAdminUserOnly


class StandardPagination(pagination.PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ============================================================================
# Tax Views
# ============================================================================

class TaxListCreateView(generics.ListCreateAPIView):
    """
    GET /api/taxes/ - List taxes (Admin & Staff)
    POST /api/taxes/ - Create new tax rule (Admin only)
    """
    permission_classes = [IsAdminOrStaffReadOnly]
    serializer_class = TaxSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        queryset = Tax.objects.all()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() in ('true', '1'))
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(models.Q(name__icontains=search) | models.Q(description__icontains=search))
        return queryset


class TaxDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/taxes/{id}/ - Retrieve tax rule
    PUT/PATCH /api/taxes/{id}/ - Update tax rule (Admin only)
    DELETE /api/taxes/{id}/ - Delete tax rule (Admin only)
    """
    permission_classes = [IsAdminOrStaffReadOnly]
    serializer_class = TaxSerializer
    queryset = Tax.objects.all()


# ============================================================================
# Discount Views
# ============================================================================

class DiscountListCreateView(generics.ListCreateAPIView):
    """
    GET /api/discounts/ - List discounts (Admin & Staff)
    POST /api/discounts/ - Create new discount rule (Admin only)
    """
    permission_classes = [IsAdminOrStaffReadOnly]
    serializer_class = DiscountSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        queryset = Discount.objects.prefetch_related('applicable_products', 'applicable_plans').all()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() in ('true', '1'))
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                models.Q(name__icontains=search) |
                models.Q(code__icontains=search) |
                models.Q(description__icontains=search)
            )
        return queryset


class DiscountDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/discounts/{id}/ - Retrieve discount rule
    PUT/PATCH /api/discounts/{id}/ - Update discount rule (Admin only)
    DELETE /api/discounts/{id}/ - Delete discount rule (Admin only)
    """
    permission_classes = [IsAdminOrStaffReadOnly]
    serializer_class = DiscountSerializer
    queryset = Discount.objects.prefetch_related('applicable_products', 'applicable_plans').all()


class DiscountDeactivateView(views.APIView):
    """
    POST /api/discounts/{id}/deactivate/
    Admin can deactivate a discount rule immediately.
    """
    permission_classes = [IsAdminUserOnly]

    def post(self, request, pk):
        discount = get_object_or_404(Discount, pk=pk)
        discount.is_active = False
        discount.save(update_fields=['is_active', 'updated_at'])
        return Response({
            "message": f"Discount rule '{discount.name}' has been deactivated.",
            "is_active": discount.is_active
        }, status=status.HTTP_200_OK)

