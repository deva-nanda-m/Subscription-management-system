import logging
from celery import shared_task
from django.utils import timezone
from .models import Quotation, QuotationStatus

logger = logging.getLogger(__name__)


@shared_task
def expire_overdue_quotations_task():
    """
    Idempotent periodic Celery background task:
    Finds all quotations in DRAFT or QUOTATION status where expiry_date < today
    and transitions them to EXPIRED status.
    """
    today = timezone.localdate()
    overdue_quotations = Quotation.objects.filter(
        status__in=[QuotationStatus.DRAFT, QuotationStatus.QUOTATION],
        expiry_date__lt=today,
        is_converted=False
    )

    count = 0
    for qtn in overdue_quotations:
        try:
            qtn.status = QuotationStatus.EXPIRED
            qtn.save(update_fields=['status', 'updated_at'])
            qtn.status_history.create(
                previous_status=QuotationStatus.QUOTATION,
                new_status=QuotationStatus.EXPIRED,
                reason="Automatic expiration via scheduled Celery daemon (validity period ended)."
            )
            count += 1
        except Exception as e:
            logger.error(f"Failed to expire quotation {qtn.quotation_number}: {e}")

    logger.info(f"Overdue quotations check complete: {count} quotations expired.")
    return count

