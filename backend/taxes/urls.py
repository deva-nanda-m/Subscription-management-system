from django.urls import path
from .views import (
    TaxListCreateView,
    TaxDetailView,
    DiscountListCreateView,
    DiscountDetailView,
    DiscountDeactivateView,
)

urlpatterns = [
    # Taxes
    path('taxes/', TaxListCreateView.as_view(), name='tax-list'),
    path('taxes/<int:pk>/', TaxDetailView.as_view(), name='tax-detail'),

    # Discounts
    path('discounts/', DiscountListCreateView.as_view(), name='discount-list'),
    path('discounts/<int:pk>/', DiscountDetailView.as_view(), name='discount-detail'),
    path('discounts/<int:pk>/deactivate/', DiscountDeactivateView.as_view(), name='discount-deactivate'),
]

