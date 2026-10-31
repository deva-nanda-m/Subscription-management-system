from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth

from subscriptions.models import Subscription, SubscriptionStatus
from invoices.models import Invoice, InvoiceStatus
from payments.models import Payment, PaymentStatus


class FinancialReportService:
    """
    High-performance aggregation engine for financial reporting, executive KPIs, and analytics.
    Uses pure database aggregation (COUNT, SUM, GROUP BY) to guarantee sub-second response times.
    """

    @classmethod
    def get_dashboard_summary(cls, start_date=None, end_date=None, customer_id=None) -> dict:
        today = timezone.localdate()

        # Base QuerySets
        subs_qs = Subscription.objects.all()
        inv_qs = Invoice.objects.all()
        pay_qs = Payment.objects.filter(payment_status=PaymentStatus.SUCCESSFUL)

        if customer_id:
            subs_qs = subs_qs.filter(customer_id=customer_id)
            inv_qs = inv_qs.filter(customer_id=customer_id)
            pay_qs = pay_qs.filter(customer_id=customer_id)

        if start_date:
            inv_qs = inv_qs.filter(invoice_date__gte=start_date)
            pay_qs = pay_qs.filter(payment_date__gte=start_date)
        if end_date:
            inv_qs = inv_qs.filter(invoice_date__lte=end_date)
            pay_qs = pay_qs.filter(payment_date__lte=end_date)

        # 1. Subscription Metrics
        sub_metrics = subs_qs.aggregate(
            total_active=Count('id', filter=Q(status=SubscriptionStatus.ACTIVE)),
            total_confirmed=Count('id', filter=Q(status=SubscriptionStatus.CONFIRMED)),
            total_closed=Count('id', filter=Q(status=SubscriptionStatus.CLOSED)),
            total_paused=Count('id', filter=Q(is_paused=True)),
            total_all=Count('id')
        )

        # 2. Revenue & Receivables Metrics
        total_revenue_collected = pay_qs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        inv_metrics = inv_qs.aggregate(
            total_invoices=Count('id'),
            total_billed=Sum('total_amount'),
            total_outstanding=Sum('outstanding_amount'),
            paid_count=Count('id', filter=Q(status=InvoiceStatus.PAID)),
            confirmed_count=Count('id', filter=Q(status=InvoiceStatus.CONFIRMED)),
            unpaid_count=Count('id', filter=Q(amount_paid=0, status__in=[InvoiceStatus.CONFIRMED, InvoiceStatus.DRAFT])),
            partially_paid_count=Count('id', filter=Q(amount_paid__gt=0, outstanding_amount__gt=0)),
            overdue_amount=Sum('outstanding_amount', filter=Q(due_date__lt=today, outstanding_amount__gt=0, status=InvoiceStatus.CONFIRMED)),
            overdue_count=Count('id', filter=Q(due_date__lt=today, outstanding_amount__gt=0, status=InvoiceStatus.CONFIRMED))
        )

        # 3. Monthly Revenue Trend (Last 6 months)
        six_months_ago = today - timedelta(days=180)
        monthly_revenue = (
            Payment.objects.filter(
                payment_status=PaymentStatus.SUCCESSFUL,
                payment_date__gte=six_months_ago
            )
            .annotate(month=TruncMonth('payment_date'))
            .values('month')
            .annotate(total=Sum('amount'))
            .order_by('month')
        )
        monthly_trend = [
            {'month': row['month'].strftime('%b %Y'), 'revenue': float(row['total'] or 0)}
            for row in monthly_revenue
        ]

        # 4. Payment Method Distribution
        method_dist = (
            pay_qs.values('payment_method')
            .annotate(total=Sum('amount'), count=Count('id'))
            .order_by('-total')
        )

        return {
            'metrics': {
                'subscriptions': {
                    'active': sub_metrics['total_active'],
                    'confirmed': sub_metrics['total_confirmed'],
                    'closed': sub_metrics['total_closed'],
                    'paused': sub_metrics['total_paused'],
                    'total': sub_metrics['total_all'],
                },
                'financials': {
                    'revenue_collected': float(total_revenue_collected),
                    'total_billed': float(inv_metrics['total_billed'] or 0),
                    'total_outstanding': float(inv_metrics['total_outstanding'] or 0),
                    'overdue_amount': float(inv_metrics['overdue_amount'] or 0),
                    'overdue_count': inv_metrics['overdue_count'],
                },
                'invoices': {
                    'total': inv_metrics['total_invoices'],
                    'paid': inv_metrics['paid_count'],
                    'confirmed': inv_metrics['confirmed_count'],
                    'unpaid': inv_metrics['unpaid_count'],
                    'partially_paid': inv_metrics['partially_paid_count'],
                }
            },
            'charts': {
                'monthly_revenue': monthly_trend,
                'payment_methods': list(method_dist),
            }
        }

    @classmethod
    def get_revenue_report(cls, start_date=None, end_date=None) -> list[dict]:
        """Returns revenue breakdown by month and payment method."""
        qs = Payment.objects.filter(payment_status=PaymentStatus.SUCCESSFUL)
        if start_date:
            qs = qs.filter(payment_date__gte=start_date)
        if end_date:
            qs = qs.filter(payment_date__lte=end_date)

        rows = (
            qs.annotate(month=TruncMonth('payment_date'))
            .values('month', 'payment_method')
            .annotate(total_collected=Sum('amount'), tx_count=Count('id'))
            .order_by('-month', 'payment_method')
        )
        return [
            {
                'month': r['month'].strftime('%Y-%m'),
                'payment_method': r['payment_method'],
                'transactions': r['tx_count'],
                'amount_collected': str(r['total_collected']),
            }
            for r in rows
        ]

    @classmethod
    def get_subscription_report(cls, start_date=None, end_date=None) -> list[dict]:
        """Returns subscription counts grouped by plan and status."""
        qs = Subscription.objects.select_related('customer').prefetch_related('items__plan')
        if start_date:
            qs = qs.filter(start_date__gte=start_date)
        if end_date:
            qs = qs.filter(start_date__lte=end_date)

        results = []
        for sub in qs.order_by('-created_at'):
            item = sub.items.first()
            results.append({
                'subscription_number': sub.subscription_number,
                'customer_name': sub.customer.full_name,
                'customer_email': sub.customer.email,
                'plan_name': item.plan_name if item else 'N/A',
                'billing_interval': item.billing_interval if item else 'N/A',
                'status': sub.status,
                'is_paused': sub.is_paused,
                'recurring_fee': str(sub.total_amount),
                'start_date': str(sub.start_date),
                'next_billing_date': str(sub.next_billing_date or ''),
            })
        return results

    @classmethod
    def get_invoice_report(cls, start_date=None, end_date=None) -> list[dict]:
        """Returns invoice items with outstanding and aging."""
        today = timezone.localdate()
        qs = Invoice.objects.select_related('customer', 'subscription')
        if start_date:
            qs = qs.filter(invoice_date__gte=start_date)
        if end_date:
            qs = qs.filter(invoice_date__lte=end_date)

        results = []
        for inv in qs.order_by('-created_at'):
            results.append({
                'invoice_number': inv.invoice_number,
                'customer_name': inv.customer.full_name,
                'customer_email': inv.customer.email,
                'subscription_number': inv.subscription.subscription_number if inv.subscription else 'N/A',
                'invoice_date': str(inv.invoice_date),
                'due_date': str(inv.due_date),
                'total_amount': str(inv.total_amount),
                'amount_paid': str(inv.amount_paid),
                'outstanding_amount': str(inv.outstanding_amount),
                'status': inv.status,
                'is_overdue': inv.is_overdue,
                'days_overdue': inv.days_overdue,
            })
        return results

    @classmethod
    def get_payment_report(cls, start_date=None, end_date=None) -> list[dict]:
        """Returns all payments with references, customer, and status."""
        qs = Payment.objects.select_related('customer', 'invoice')
        if start_date:
            qs = qs.filter(payment_date__gte=start_date)
        if end_date:
            qs = qs.filter(payment_date__lte=end_date)

        results = []
        for pay in qs.order_by('-created_at'):
            results.append({
                'payment_reference': pay.payment_reference,
                'invoice_number': pay.invoice.invoice_number,
                'customer_name': pay.customer.full_name,
                'payment_method': pay.payment_method,
                'amount': str(pay.amount),
                'payment_date': str(pay.payment_date),
                'transaction_reference': pay.transaction_reference,
                'status': pay.payment_status,
            })
        return results
