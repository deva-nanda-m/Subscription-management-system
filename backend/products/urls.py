from django.urls import path
from .views import (
    ProductListCreateView,
    ProductDetailView,
    ProductStatusUpdateView,
    ProductVariantListCreateView,
    VariantDetailView,
    VariantStatusUpdateView,
)

urlpatterns = [
    # Product Endpoints
    path('products/', ProductListCreateView.as_view(), name='product-list-create'),
    path('products/<int:pk>/', ProductDetailView.as_view(), name='product-detail'),
    path('products/<int:pk>/status/', ProductStatusUpdateView.as_view(), name='product-status-update'),

    # Product Variant Endpoints
    path('products/<int:product_id>/variants/', ProductVariantListCreateView.as_view(), name='product-variant-list-create'),
    path('variants/<int:pk>/', VariantDetailView.as_view(), name='variant-detail'),
    path('variants/<int:pk>/status/', VariantStatusUpdateView.as_view(), name='variant-status-update'),
]

