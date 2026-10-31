from celery import shared_task
from django.utils import timezone
from .models import SubscriptionPlan, PlanStatus, PlanStatusHistory


@shared_task(name='plans.tasks.close_expired_plans_task')
def close_expired_plans_task():
    """
    Periodic background task checking all plans configured with auto_close=True.
    If the plan's available_until date is strictly before today and status is not CLOSED,
    it transitions the plan to CLOSED and creates an audit history record.
    Idempotent and safe to run on an hourly schedule.
    """
    today = timezone.now().date()
    eligible_plans = SubscriptionPlan.objects.filter(
        auto_close=True,
        available_until__lt=today
    ).exclude(status=PlanStatus.CLOSED)

    closed_count = 0
    for plan in eligible_plans:
        old_status = plan.status
        plan.status = PlanStatus.CLOSED
        plan.save(update_fields=['status', 'updated_at'])

        PlanStatusHistory.objects.create(
            plan=plan,
            previous_status=old_status,
            new_status=PlanStatus.CLOSED,
            changed_by=None,
            change_reason="Automatic closure policy: availability end date passed."
        )
        closed_count += 1

    return f"Evaluated expired plans. Automatically closed {closed_count} plan(s)."

