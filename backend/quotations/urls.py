from django.urls import path
from .views import (
    QuotationTemplateListCreateView,
    QuotationTemplateDetailView,
    QuotationListCreateView,
    QuotationDetailView,
    QuotationFinalizeView,
    QuotationConfirmView,
    QuotationCancelView,
    QuotationPDFView,
    QuotationSendEmailView,
    QuotationHistoryListView,
    CustomerLookupListView,
)

urlpatterns = [
    # Quotation Templates
    path('quotation-templates/', QuotationTemplateListCreateView.as_view(), name='quotation-template-list'),
    path('quotation-templates/<int:pk>/', QuotationTemplateDetailView.as_view(), name='quotation-template-detail'),

    # Quotations
    path('quotations/', QuotationListCreateView.as_view(), name='quotation-list'),
    path('quotations/<int:pk>/', QuotationDetailView.as_view(), name='quotation-detail'),

    # Lifecycle Actions
    path('quotations/<int:pk>/finalize/', QuotationFinalizeView.as_view(), name='quotation-finalize'),
    path('quotations/<int:pk>/confirm/', QuotationConfirmView.as_view(), name='quotation-confirm'),
    path('quotations/<int:pk>/cancel/', QuotationCancelView.as_view(), name='quotation-cancel'),

    # PDF & Email
    path('quotations/<int:pk>/pdf/', QuotationPDFView.as_view(), name='quotation-pdf'),
    path('quotations/<int:pk>/send-email/', QuotationSendEmailView.as_view(), name='quotation-send-email'),

    # History
    path('quotations/<int:pk>/history/', QuotationHistoryListView.as_view(), name='quotation-history'),

    # Customer Lookup
    path('customers/lookup/', CustomerLookupListView.as_view(), name='customer-lookup'),
]
