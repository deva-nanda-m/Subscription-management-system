import logging
from celery import shared_task
from django.utils import timezone
from .models import Subscription, SubscriptionStatus

logger = logging.getLogger(__name__)


@shared_task
def activate_scheduled_subscriptions_task():
    """
    Periodic Celery task:
    Finds CONFIRMED subscriptions whose start_date has arrived (start_date <= today)
    and transitions them to ACTIVE status, recording activation_date and next_billing_date.
    """
    today = timezone.localdate()
    eligible = Subscription.objects.filter(
        status=SubscriptionStatus.CONFIRMED,
        start_date__lte=today,
        is_paused=False
    )

    count = 0
    for sub in eligible:
        try:
            sub.transition_status(
                SubscriptionStatus.ACTIVE,
                reason="Automatic scheduled activation via Celery daemon (start date reached)."
            )
            count += 1
        except Exception as e:
            logger.error(f"Failed to auto-activate subscription {sub.subscription_number}: {e}")

    logger.info(f"Scheduled subscriptions activation complete: {count} activated.")
    return count


@shared_task
def close_expired_subscriptions_task():
    """
    Periodic Celery task:
    Finds ACTIVE or PAUSED subscriptions whose expiry_date has passed (expiry_date < today)
    and closes them if the underlying plan policy enables automatic closure.
    """
    today = timezone.localdate()
    eligible = Subscription.objects.filter(
        status__in=[SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED],
        expiry_date__lt=today
    )

    count = 0
    for sub in eligible:
        # Check if plan auto_close is enabled
        should_close = any(item.plan.auto_close for item in sub.items.all() if item.plan)
        if should_close:
            try:
                sub.close(
                    reason="Automatic expiration closure via Celery daemon (plan auto_close enabled).",
                    force=True
                )
                count += 1
            except Exception as e:
                logger.error(f"Failed to auto-close expired subscription {sub.subscription_number}: {e}")

    logger.info(f"Expired subscriptions check complete: {count} closed.")
    return count

