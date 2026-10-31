from decimal import Decimal
from datetime import timedelta
from dateutil.relativedelta import relativedelta
from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User, Role
from products.models import Product
from plans.models import SubscriptionPlan
from subscriptions.models import (
    Subscription,
    SubscriptionItem,
    SubscriptionStatus,
    generate_subscription_number,
)


class Command(BaseCommand):
    help = 'Seeds initial sample subscriptions for testing and demonstration.'

    def handle(self, *args, **options):
        admin_user = User.objects.filter(role=Role.ADMIN).first()
        customer_user = User.objects.filter(role=Role.CUSTOMER).first()

        plan = SubscriptionPlan.objects.first()
        if not plan:
            self.stdout.write(self.style.WARNING("No subscription plans found."))
            return

        today = timezone.localdate()

        # 1. Active Subscription
        sub_active, created = Subscription.objects.get_or_create(
            payment_terms="Net 30 - Corporate Invoice",
            defaults={
                "customer": customer_user,
                "start_date": today - timedelta(days=15),
                "expiry_date": today + relativedelta(years=1),
                "activation_date": today - timedelta(days=15),
                "next_billing_date": today + relativedelta(months=1),
                "subtotal": plan.price * 2,
                "tax_amount": (plan.price * 2 * Decimal('0.18')).quantize(Decimal('0.01')),
                "total_amount": (plan.price * 2 * Decimal('1.18')).quantize(Decimal('0.01')),
                "status": SubscriptionStatus.ACTIVE,
                "is_paused": False,
                "created_by": admin_user,
            }
        )
        if created:
            SubscriptionItem.objects.create(
                subscription=sub_active,
                product=plan.product,
                variant=plan.variant,
                plan=plan,
                quantity=2,
                unit_price=plan.price,
                tax_rate=Decimal('18.00'),
            )
            sub_active.status_history.create(
                previous_status=SubscriptionStatus.CONFIRMED,
                new_status=SubscriptionStatus.ACTIVE,
                changed_by=admin_user,
                reason="Activated for active customer usage."
            )

        # 2. Paused Subscription
        sub_paused, created = Subscription.objects.get_or_create(
            payment_terms="Quarterly Corporate Wire",
            defaults={
                "customer": customer_user,
                "start_date": today - timedelta(days=60),
                "expiry_date": today + relativedelta(months=10),
                "activation_date": today - timedelta(days=60),
                "next_billing_date": today + relativedelta(months=2),
                "subtotal": plan.price * 5,
                "tax_amount": (plan.price * 5 * Decimal('0.18')).quantize(Decimal('0.01')),
                "total_amount": (plan.price * 5 * Decimal('1.18')).quantize(Decimal('0.01')),
                "status": SubscriptionStatus.ACTIVE,
                "is_paused": True,
                "created_by": admin_user,
            }
        )
        if created:
            SubscriptionItem.objects.create(
                subscription=sub_paused,
                product=plan.product,
                variant=plan.variant,
                plan=plan,
                quantity=5,
                unit_price=plan.price,
                tax_rate=Decimal('18.00'),
            )
            sub_paused.pause_history.create(
                paused_by=admin_user,
                reason="Temporary business restructuring hiatus."
            )

        self.stdout.write(self.style.SUCCESS("Successfully seeded sample subscriptions."))

