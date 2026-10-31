from django.urls import path
from .views import (
    InvoiceListCreateView,
    InvoiceDetailView,
    InvoiceConfirmView,
    InvoiceCancelView,
    InvoicePDFView,
    InvoiceSendEmailView,
    OverdueInvoicesListView,
    BillingRunManualView,
    BillingLogsListView,
)

urlpatterns = [
    # Invoices
    path('invoices/', InvoiceListCreateView.as_view(), name='invoice-list'),
    path('invoices/overdue/', OverdueInvoicesListView.as_view(), name='invoice-overdue-list'),
    path('invoices/<int:pk>/', InvoiceDetailView.as_view(), name='invoice-detail'),
    path('invoices/<int:pk>/confirm/', InvoiceConfirmView.as_view(), name='invoice-confirm'),
    path('invoices/<int:pk>/cancel/', InvoiceCancelView.as_view(), name='invoice-cancel'),
    path('invoices/<int:pk>/pdf/', InvoicePDFView.as_view(), name='invoice-pdf'),
    path('invoices/<int:pk>/send-email/', InvoiceSendEmailView.as_view(), name='invoice-send-email'),

    # Billing Engine
    path('billing/run/', BillingRunManualView.as_view(), name='billing-run'),
    path('billing/logs/', BillingLogsListView.as_view(), name='billing-logs'),
]

