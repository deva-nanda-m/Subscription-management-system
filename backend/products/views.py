from rest_framework import generics, status, views
from rest_framework.response import Response
from django.db import models
from django.shortcuts import get_object_or_404
from accounts.models import Role

from .models import Product, ProductVariant, ProductStatus
from .serializers import (
    ProductSerializer,
    ProductDetailSerializer,
    ProductVariantSerializer,
    ProductStatusUpdateSerializer,
    VariantStatusUpdateSerializer,
)
from .permissions import IsAdminOrReadOnly


class ProductListCreateView(generics.ListCreateAPIView):
    """
    Endpoint for listing and creating Products.
    - Admins: full create & view with all statuses.
    - Staff: read-only access to all products.
    - Customers: read-only access to active products only.
    """
    permission_classes = [IsAdminOrReadOnly]

    def get_serializer_class(self):
        return ProductSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Product.objects.all().prefetch_related('variants')

        # Filter active only for customer role
        if user.role == Role.CUSTOMER:
            queryset = queryset.filter(status=ProductStatus.ACTIVE)
        else:
            status_param = self.request.query_params.get('status', '').strip().upper()
            if status_param and status_param != 'ALL':
                queryset = queryset.filter(status=status_param)

        category = self.request.query_params.get('category', '').strip().upper()
        if category and category != 'ALL':
            queryset = queryset.filter(category=category)

        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                models.Q(name__icontains=search) |
                models.Q(code__icontains=search) |
                models.Q(description__icontains=search) |
                models.Q(variants__name__icontains=search) |
                models.Q(variants__sku__icontains=search)
            ).distinct()

        is_recurring = self.request.query_params.get('is_recurring')
        if is_recurring is not None:
            if is_recurring.lower() in ('true', '1'):
                queryset = queryset.filter(is_recurring=True)
            elif is_recurring.lower() in ('false', '0'):
                queryset = queryset.filter(is_recurring=False)

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.save(created_by=request.user)
        return Response(
            {
                "success": True,
                "message": f"Product '{product.name}' created successfully.",
                "product": ProductSerializer(product).data
            },
            status=status.HTTP_201_CREATED
        )


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Endpoint for viewing, updating and deleting a single Product.
    Includes full nested variants.
    """
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = 'pk'

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ProductSerializer
        return ProductDetailSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Product.objects.all().prefetch_related('variants')
        if user.role == Role.CUSTOMER:
            queryset = queryset.filter(status=ProductStatus.ACTIVE)
        return queryset

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        return Response(
            {
                "success": True,
                "message": f"Product '{product.name}' updated successfully.",
                "product": ProductDetailSerializer(product).data
            },
            status=status.HTTP_200_OK
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        product_name = instance.name
        instance.delete()
        return Response(
            {
                "success": True,
                "message": f"Product '{product_name}' was successfully deleted."
            },
            status=status.HTTP_200_OK
        )


class ProductStatusUpdateView(views.APIView):
    """
    Admin-only endpoint for changing product lifecycle status.
    """
    permission_classes = [IsAdminOrReadOnly]

    def patch(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        serializer = ProductStatusUpdateSerializer(product, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_product = serializer.save()
        return Response(
            {
                "success": True,
                "message": f"Product status updated to {updated_product.get_status_display()}.",
                "product": ProductSerializer(updated_product).data
            },
            status=status.HTTP_200_OK
        )


class ProductVariantListCreateView(generics.ListCreateAPIView):
    """
    Endpoint for listing variants of a specific product, or creating a new variant.
    """
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = ProductVariantSerializer

    def get_queryset(self):
        product_id = self.kwargs.get('product_id')
        user = self.request.user
        queryset = ProductVariant.objects.filter(product_id=product_id)
        if user.role == Role.CUSTOMER:
            queryset = queryset.filter(is_active=True)
        return queryset.order_by('sort_order', 'price')

    def create(self, request, *args, **kwargs):
        product_id = self.kwargs.get('product_id')
        product = get_object_or_404(Product, pk=product_id)

        data = request.data.copy()
        data['product'] = product.id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        variant = serializer.save()

        return Response(
            {
                "success": True,
                "message": f"Variant '{variant.name}' created for {product.name}.",
                "variant": ProductVariantSerializer(variant).data
            },
            status=status.HTTP_201_CREATED
        )


class VariantDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Endpoint for viewing, updating or deleting an individual ProductVariant.
    """
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = ProductVariantSerializer
    queryset = ProductVariant.objects.all()
    lookup_field = 'pk'

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        variant = serializer.save()
        return Response(
            {
                "success": True,
                "message": f"Variant '{variant.name}' updated successfully.",
                "variant": ProductVariantSerializer(variant).data
            },
            status=status.HTTP_200_OK
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        name = instance.name
        instance.delete()
        return Response(
            {
                "success": True,
                "message": f"Variant '{name}' was deleted successfully."
            },
            status=status.HTTP_200_OK
        )


class VariantStatusUpdateView(views.APIView):
    """
    Admin-only endpoint for toggling active/inactive status of a variant.
    """
    permission_classes = [IsAdminOrReadOnly]

    def patch(self, request, pk):
        variant = get_object_or_404(ProductVariant, pk=pk)
        serializer = VariantStatusUpdateSerializer(variant, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_variant = serializer.save()
        status_text = "activated" if updated_variant.is_active else "deactivated"
        return Response(
            {
                "success": True,
                "message": f"Variant '{updated_variant.name}' has been {status_text}.",
                "variant": ProductVariantSerializer(updated_variant).data
            },
            status=status.HTTP_200_OK
        )
