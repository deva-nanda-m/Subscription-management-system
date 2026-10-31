from django.urls import path
from .views import (
    DashboardSummaryView,
    RevenueReportView,
    SubscriptionReportView,
    InvoiceReportView,
    PaymentReportView,
)

urlpatterns = [
    path('dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('reports/revenue/', RevenueReportView.as_view(), name='report-revenue'),
    path('reports/subscriptions/', SubscriptionReportView.as_view(), name='report-subscriptions'),
    path('reports/invoices/', InvoiceReportView.as_view(), name='report-invoices'),
    path('reports/payments/', PaymentReportView.as_view(), name='report-payments'),
]

