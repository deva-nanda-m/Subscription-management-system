import calendar
from datetime import date, timedelta
from decimal import Decimal
from django.db import transaction, models
from django.utils import timezone
from .models import Invoice, InvoiceLineItem, InvoiceStatus, BillingExecutionLog, BillingRunType
from subscriptions.models import Subscription, SubscriptionStatus
from taxes.models import Discount, Tax


def add_months_to_date(source_date: date, months: int = 1) -> date:
    """
    Safely adds months to a date, correctly clamping to the last valid day of the target month
    (e.g., Jan 31 -> Feb 28/29, or Aug 31 -> Sep 30).
    """
    month = source_date.month - 1 + months
    year = source_date.year + month // 12
    month = month % 12 + 1
    max_days = calendar.monthrange(year, month)[1]
    day = min(source_date.day, max_days)
    return date(year, month, day)


def add_years_to_date(source_date: date, years: int = 1) -> date:
    """
    Safely adds years to a date, clamping Feb 29 to Feb 28 on non-leap years.
    """
    try:
        return source_date.replace(year=source_date.year + years)
    except ValueError:
        # Handles Feb 29 on non-leap year
        return source_date.replace(year=source_date.year + years, day=28)


def calculate_billing_period_and_next_date(current_billing_date: date, interval: str) -> tuple[date, date, date]:
    """
    Given the current billing date and interval ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'),
    returns (period_start, period_end, next_billing_date).
    """
    interval_upper = (interval or 'MONTHLY').upper()
    period_start = current_billing_date

    if interval_upper == 'DAILY':
        period_end = period_start
        next_billing_date = period_start + timedelta(days=1)
    elif interval_upper == 'WEEKLY':
        period_end = period_start + timedelta(days=6)
        next_billing_date = period_end + timedelta(days=1)
    elif interval_upper == 'YEARLY':
        next_billing_date = add_years_to_date(period_start, 1)
        period_end = next_billing_date - timedelta(days=1)
    else:  # MONTHLY default
        next_billing_date = add_months_to_date(period_start, 1)
        period_end = next_billing_date - timedelta(days=1)

    return period_start, period_end, next_billing_date


def generate_invoice_number() -> str:
    """
    Generates unique, sequential invoice number: INV-YYYYMM-XXXX
    Uses database row count with zero-padding.
    """
    now = timezone.localdate()
    prefix = f"INV-{now.strftime('%Y%m')}-"
    last_inv = Invoice.objects.filter(invoice_number__startswith=prefix).order_by('-invoice_number').first()
    if last_inv:
        try:
            last_seq = int(last_inv.invoice_number.split('-')[-1])
            new_seq = last_seq + 1
        except (ValueError, IndexError):
            new_seq = 1
    else:
        new_seq = 1
    return f"{prefix}{new_seq:04d}"


def parse_payment_terms_days(terms_str: str) -> int:
    """Extracts integer days from payment terms string (e.g. 'Net 30' -> 30, 'Due on Receipt' -> 0)."""
    if not terms_str:
        return 30
    normalized = terms_str.strip().lower()
    if 'receipt' in normalized or 'immediate' in normalized:
        return 0
    import re
    match = re.search(r'\d+', normalized)
    if match:
        return int(match.group())
    return 30


class BillingEngineService:
    """
    Recurring Billing Engine.
    Processes subscriptions due for billing, applies taxes and eligible discounts,
    generates invoices, and idempotently advances billing dates.
    """

    @classmethod
    def generate_invoice_for_subscription(
        cls,
        subscription: Subscription,
        manual_trigger: bool = False,
        operator_user = None
    ) -> tuple[Invoice, bool]:
        """
        Generates an invoice for a single active subscription in an atomic transaction.
        Returns (invoice, created). If duplicate period detected, returns existing invoice and False.
        """
        if subscription.status != SubscriptionStatus.ACTIVE and not manual_trigger:
            raise ValueError(f"Subscription {subscription.subscription_number} is not in ACTIVE status.")
        if subscription.is_paused:
            raise ValueError(f"Subscription {subscription.subscription_number} is paused.")

        current_billing_date = subscription.next_billing_date or timezone.localdate()
        primary_item = subscription.items.first()
        billing_interval = primary_item.billing_interval if primary_item else 'MONTHLY'

        period_start, period_end, next_billing_date = calculate_billing_period_and_next_date(
            current_billing_date,
            billing_interval
        )

        # Idempotency / Duplicate Check
        existing_invoice = Invoice.objects.filter(
            subscription=subscription,
            billing_period_start=period_start,
            billing_period_end=period_end
        ).first()

        if existing_invoice:
            # Already generated for this period!
            return existing_invoice, False

        with transaction.atomic():
            invoice_date = timezone.localdate()
            terms_days = parse_payment_terms_days(subscription.payment_terms)
            due_date = invoice_date + timedelta(days=terms_days)
            invoice_num = generate_invoice_number()

            invoice = Invoice(
                invoice_number=invoice_num,
                customer=subscription.customer,
                subscription=subscription,
                invoice_date=invoice_date,
                due_date=due_date,
                billing_period_start=period_start,
                billing_period_end=period_end,
                currency=getattr(subscription, 'currency', 'INR'),
                status=InvoiceStatus.CONFIRMED,
                payment_terms=subscription.payment_terms or 'Net 30',
                created_by=operator_user
            )
            invoice.save()

            # Generate Line Items
            subtotal = Decimal('0.00')
            total_tax = Decimal('0.00')
            total_discount = Decimal('0.00')
            total_qty = 0
            product_ids = []
            plan_ids = []

            for sub_item in subscription.items.select_related('product', 'variant', 'plan').all():
                qty = sub_item.quantity
                total_qty += qty
                unit_price = sub_item.unit_price
                line_sub = (unit_price * qty).quantize(Decimal('0.01'))
                subtotal += line_sub

                tax_rate = sub_item.tax_rate
                line_tax = ((line_sub * tax_rate) / Decimal('100')).quantize(Decimal('0.01'))
                total_tax += line_tax

                item_disc_pct = getattr(sub_item, 'discount_percentage', Decimal('0.00'))
                line_disc = ((line_sub * item_disc_pct) / Decimal('100')).quantize(Decimal('0.01'))
                total_discount += line_disc

                line_total = (line_sub - line_disc + line_tax).quantize(Decimal('0.01'))

                if sub_item.product_id:
                    product_ids.append(sub_item.product_id)
                if sub_item.plan_id:
                    plan_ids.append(sub_item.plan_id)

                InvoiceLineItem.objects.create(
                    invoice=invoice,
                    product=sub_item.product,
                    product_name=sub_item.product_name,
                    variant_name=sub_item.variant_name,
                    plan_name=sub_item.plan_name,
                    quantity=qty,
                    unit_price=unit_price,
                    tax_rate=tax_rate,
                    tax_amount=line_tax,
                    discount_amount=line_disc,
                    line_subtotal=line_sub,
                    line_total=line_total
                )

            # Check and apply global discount rules if eligible
            active_discounts = Discount.objects.filter(is_active=True).order_by('-discount_value')
            for disc in active_discounts:
                if disc.is_eligible(subtotal=subtotal, total_quantity=total_qty, product_ids=product_ids, plan_ids=plan_ids):
                    disc_val = disc.calculate_discount_amount(subtotal - total_discount)
                    if disc_val > Decimal('0.00'):
                        total_discount += disc_val
                        # Concurrently increment usage safely
                        disc.current_usage_count = models.F('current_usage_count') + 1
                        disc.save(update_fields=['current_usage_count', 'updated_at'])
                        break  # Apply primary eligible discount

            # Final totals
            grand_total = max(Decimal('0.00'), subtotal - total_discount + total_tax).quantize(Decimal('0.01'))
            invoice.subtotal = subtotal
            invoice.discount_amount = total_discount
            invoice.tax_amount = total_tax
            invoice.total_amount = grand_total
            invoice.outstanding_amount = grand_total
            invoice.save(update_fields=[
                'subtotal', 'discount_amount', 'tax_amount', 'total_amount', 'outstanding_amount'
            ])

            # Advance subscription's next billing date ONLY after successful invoice commit
            subscription.next_billing_date = next_billing_date
            subscription.save(update_fields=['next_billing_date', 'updated_at'])

            return invoice, True

    @classmethod
    def execute_recurring_billing_cycle(cls, run_type: str = BillingRunType.AUTOMATED, operator_user = None) -> BillingExecutionLog:
        """
        Scans all active, non-paused subscriptions due for billing (next_billing_date <= today).
        Generates recurring invoices and records execution statistics in BillingExecutionLog.
        """
        today = timezone.localdate()
        due_subscriptions = Subscription.objects.filter(
            status=SubscriptionStatus.ACTIVE,
            is_paused=False,
            next_billing_date__lte=today
        ).prefetch_related('items__product', 'items__plan', 'customer')

        evaluated_count = due_subscriptions.count()
        generated_count = 0
        failed_count = 0
        details = {'success_invoices': [], 'skipped': [], 'errors': []}

        for sub in due_subscriptions:
            try:
                inv, created = cls.generate_invoice_for_subscription(
                    sub,
                    manual_trigger=False,
                    operator_user=operator_user
                )
                if created:
                    generated_count += 1
                    details['success_invoices'].append({
                        'subscription_number': sub.subscription_number,
                        'invoice_number': inv.invoice_number,
                        'total_amount': str(inv.total_amount)
                    })
                else:
                    details['skipped'].append({
                        'subscription_number': sub.subscription_number,
                        'reason': 'Invoice already exists for this billing period'
                    })
            except Exception as e:
                failed_count += 1
                details['errors'].append({
                    'subscription_number': sub.subscription_number,
                    'error': str(e)
                })

        log = BillingExecutionLog.objects.create(
            run_type=run_type,
            executed_by=operator_user,
            subscriptions_evaluated=evaluated_count,
            invoices_generated=generated_count,
            failed_count=failed_count,
            details=details
        )
        return log
