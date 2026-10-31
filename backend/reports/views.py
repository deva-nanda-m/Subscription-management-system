import csv
from django.http import HttpResponse
from rest_framework import views, status, permissions
from rest_framework.response import Response

from .services import FinancialReportService
from .permissions import IsAdminOrStaff


def export_dict_list_to_csv(data: list[dict], filename: str) -> HttpResponse:
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'

    if not data:
        return response

    writer = csv.DictWriter(response, fieldnames=list(data[0].keys()))
    writer.writeheader()
    for row in data:
        writer.writerow(row)
    return response


class DashboardSummaryView(views.APIView):
    """
    GET /api/dashboard/summary/
    Returns high-level KPI metrics, receivables, and time-series chart data.
    """
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        customer_id = request.query_params.get('customer')

        summary = FinancialReportService.get_dashboard_summary(
            start_date=start_date,
            end_date=end_date,
            customer_id=customer_id
        )
        return Response(summary, status=status.HTTP_200_OK)


class RevenueReportView(views.APIView):
    """
    GET /api/reports/revenue/ - Collected revenue report over time and payment methods
    """
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        data = FinancialReportService.get_revenue_report(start_date, end_date)

        if request.query_params.get('export') == 'csv':
            return export_dict_list_to_csv(data, 'revenue_report.csv')

        return Response(data, status=status.HTTP_200_OK)


class SubscriptionReportView(views.APIView):
    """
    GET /api/reports/subscriptions/ - Subscription contracts status and recurring fee report
    """
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        data = FinancialReportService.get_subscription_report(start_date, end_date)

        if request.query_params.get('export') == 'csv':
            return export_dict_list_to_csv(data, 'subscriptions_report.csv')

        return Response(data, status=status.HTTP_200_OK)


class InvoiceReportView(views.APIView):
    """
    GET /api/reports/invoices/ - Invoice balances, payment status, and aging report
    """
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        data = FinancialReportService.get_invoice_report(start_date, end_date)

        if request.query_params.get('export') == 'csv':
            return export_dict_list_to_csv(data, 'invoices_report.csv')

        return Response(data, status=status.HTTP_200_OK)


class PaymentReportView(views.APIView):
    """
    GET /api/reports/payments/ - Comprehensive payment transaction ledger
    """
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        data = FinancialReportService.get_payment_report(start_date, end_date)

        if request.query_params.get('export') == 'csv':
            return export_dict_list_to_csv(data, 'payments_report.csv')

        return Response(data, status=status.HTTP_200_OK)

