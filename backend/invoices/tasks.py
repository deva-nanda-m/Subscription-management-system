import logging
from celery import shared_task
from django.utils import timezone
from .models import Invoice, InvoiceStatus, BillingRunType
from .billing_service import BillingEngineService

logger = logging.getLogger(__name__)


@shared_task
def generate_recurring_invoices_task():
    """
    Periodic Celery Beat task:
    Scans all active subscriptions due for billing and generates recurring invoices.
    """
    logger.info("Starting automated recurring billing cycle...")
    try:
        log = BillingEngineService.execute_recurring_billing_cycle(run_type=BillingRunType.AUTOMATED)
        logger.info(
            f"Automated billing completed: {log.invoices_generated} generated, "
            f"{log.failed_count} failed out of {log.subscriptions_evaluated} evaluated."
        )
        return {
            "status": "success",
            "invoices_generated": log.invoices_generated,
            "failed_count": log.failed_count,
            "evaluated": log.subscriptions_evaluated,
        }
    except Exception as e:
        logger.error(f"Fatal error during recurring billing cycle: {str(e)}", exc_info=True)
        return {"status": "error", "error": str(e)}


@shared_task
def check_overdue_invoices_task():
    """
    Periodic Celery task:
    Identifies confirmed invoices past due date with remaining balances.
    """
    today = timezone.localdate()
    overdue_invoices = Invoice.objects.filter(
        status=InvoiceStatus.CONFIRMED,
        due_date__lt=today,
        outstanding_amount__gt=0
    )
    count = overdue_invoices.count()
    logger.info(f"Identified {count} overdue invoices on {today}.")
    return {"status": "success", "overdue_count": count}

