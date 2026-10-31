from decimal import Decimal
from datetime import timedelta
from dateutil.relativedelta import relativedelta
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from quotations.models import Quotation, QuotationStatus
from plans.models import BillingInterval
from .models import (
    Subscription,
    SubscriptionItem,
    SubscriptionStatus,
    SubscriptionStatusHistory,
    generate_subscription_number,
)


def convert_quotation_to_subscription(quotation_id, user=None, start_date=None, payment_terms="Net 30"):
    """
    Converts a confirmed Quotation into a Subscription.
    Guarantees atomic execution and duplicate conversion prevention.
    """
    with transaction.atomic():
        # Select for update to lock the quotation row and prevent concurrent conversions
        quotation = Quotation.objects.select_for_update().get(pk=quotation_id)

        # 1. Validation checks
        if quotation.is_converted or Subscription.objects.filter(source_quotation=quotation).exists():
            existing_sub = Subscription.objects.filter(source_quotation=quotation).first()
            raise ValidationError(
                f"Quotation {quotation.quotation_number} has already been converted to subscription "
                f"{existing_sub.subscription_number if existing_sub else ''}."
            )

        if quotation.status != QuotationStatus.CONFIRMED:
            raise ValidationError(
                f"Only CONFIRMED quotations can be converted to subscriptions. "
                f"Current status is '{quotation.status}'."
            )

        if quotation.is_expired:
            raise ValidationError(
                f"Cannot convert expired quotation {quotation.quotation_number}."
            )

        lines = quotation.lines.all()
        if not lines.exists():
            raise ValidationError("Quotation has no itemized lines to convert.")

        # 2. Determine start date and expiry date
        effective_start = start_date or timezone.localdate()

        # Compute calculated expiry date from the quotation's validity or default 1 year / billing interval
        # If any line is YEARLY, default 1 year; if MONTHLY, 1 month / 1 year term
        intervals = [line.billing_interval for line in lines]
        if BillingInterval.YEARLY in intervals:
            effective_expiry = effective_start + relativedelta(years=1)
        elif BillingInterval.MONTHLY in intervals:
            effective_expiry = effective_start + relativedelta(years=1)  # 1 year contract renewed monthly
        elif BillingInterval.WEEKLY in intervals:
            effective_expiry = effective_start + relativedelta(months=3)
        else:
            effective_expiry = effective_start + relativedelta(months=1)

        # 3. Create Subscription in CONFIRMED status
        sub_number = generate_subscription_number()
        subscription = Subscription.objects.create(
            subscription_number=sub_number,
            customer=quotation.customer,
            source_quotation=quotation,
            start_date=effective_start,
            expiry_date=effective_expiry,
            payment_terms=payment_terms or "Net 30",
            subtotal=quotation.subtotal,
            tax_amount=quotation.tax_amount,
            discount_amount=quotation.discount_amount,
            total_amount=quotation.grand_total,
            status=SubscriptionStatus.CONFIRMED,
            is_paused=False,
            created_by=user,
        )

        # 4. Transfer all lines to SubscriptionItems with agreed snapshots
        for q_line in lines:
            SubscriptionItem.objects.create(
                subscription=subscription,
                product=q_line.product,
                variant=q_line.variant,
                plan=q_line.plan,
                product_name=q_line.product_name,
                variant_name=q_line.variant_name,
                plan_name=q_line.plan_name,
                billing_interval=q_line.billing_interval,
                quantity=q_line.quantity,
                unit_price=q_line.unit_price,
                tax_rate=q_line.tax_rate,
                tax_amount=q_line.tax_amount,
                line_subtotal=q_line.line_subtotal,
                line_total=q_line.line_total,
            )

        # 5. Calculate next billing date
        subscription.next_billing_date = subscription.calculate_next_billing_date(effective_start)
        subscription.save(update_fields=['next_billing_date'])

        # 6. Flag quotation as converted
        quotation.is_converted = True
        quotation.save(update_fields=['is_converted', 'updated_at'])

        # 7. Write audit history log for subscription
        SubscriptionStatusHistory.objects.create(
            subscription=subscription,
            previous_status='QUOTATION_CONFIRMED',
            new_status=SubscriptionStatus.CONFIRMED,
            changed_by=user,
            reason=f"Converted from confirmed quotation {quotation.quotation_number}."
        )

        # Also log in quotation history
        quotation.status_history.create(
            previous_status=quotation.status,
            new_status='CONVERTED_TO_SUBSCRIPTION',
            changed_by=user,
            reason=f"Successfully converted to subscription {subscription.subscription_number}."
        )

        return subscription
