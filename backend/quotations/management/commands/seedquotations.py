from decimal import Decimal
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User, Role
from products.models import Product
from plans.models import SubscriptionPlan
from quotations.models import (
    QuotationTemplate,
    QuotationTemplateLine,
    Quotation,
    QuotationLineItem,
    QuotationStatus,
)


class Command(BaseCommand):
    help = 'Seeds initial quotation templates and sample customer quotations.'

    def handle(self, *args, **options):
        admin_user = User.objects.filter(role=Role.ADMIN).first()
        staff_user = User.objects.filter(role=Role.STAFF).first() or admin_user
        customer_user = User.objects.filter(role=Role.CUSTOMER).first()

        if not customer_user:
            customer_user = User.objects.create_user(
                email="customer@brightloop.io",
                full_name="Acme Enterprise Corp",
                password="CustomerSecure2026!",
                role=Role.CUSTOMER
            )

        # Retrieve products and plans
        accounting_plan = SubscriptionPlan.objects.filter(name__icontains="Basic").first() or SubscriptionPlan.objects.first()
        analytics_plan = SubscriptionPlan.objects.filter(name__icontains="Analytics").first() or SubscriptionPlan.objects.last()

        if not accounting_plan:
            self.stdout.write(self.style.WARNING("No subscription plans found. Run seedplans first."))
            return

        # 1. Quotation Template
        template, _ = QuotationTemplate.objects.get_or_create(
            name="Enterprise SaaS Starter Bundle",
            defaults={
                "description": "Standard multi-suite subscription bundle for medium and enterprise teams.",
                "validity_days": 30,
                "is_active": True,
                "created_by": admin_user,
            }
        )

        QuotationTemplateLine.objects.get_or_create(
            template=template,
            product=accounting_plan.product,
            plan=accounting_plan,
            defaults={
                "variant": accounting_plan.variant,
                "default_quantity": max(accounting_plan.minimum_quantity, 2),
            }
        )

        if analytics_plan and analytics_plan.id != accounting_plan.id:
            QuotationTemplateLine.objects.get_or_create(
                template=template,
                product=analytics_plan.product,
                plan=analytics_plan,
                defaults={
                    "variant": analytics_plan.variant,
                    "default_quantity": max(analytics_plan.minimum_quantity, 1),
                }
            )

        # 2. Quotation 1: Confirmed (Ready to convert to subscription)
        qtn_confirmed, created = Quotation.objects.get_or_create(
            notes="Ready for immediate subscription onboarding.",
            defaults={
                "customer": customer_user,
                "template": template,
                "quotation_date": timezone.localdate(),
                "validity_days": 30,
                "status": QuotationStatus.CONFIRMED,
                "created_by": staff_user,
                "terms_and_conditions": "Payment due Net 30. Subject to Brightloop Master Services Agreement.",
            }
        )
        if created:
            QuotationLineItem.objects.create(
                quotation=qtn_confirmed,
                product=accounting_plan.product,
                variant=accounting_plan.variant,
                plan=accounting_plan,
                quantity=max(accounting_plan.minimum_quantity, 3),
                unit_price=accounting_plan.price,
                tax_rate=Decimal('18.00')
            )
            qtn_confirmed.calculate_totals()
            qtn_confirmed.status_history.create(
                previous_status=QuotationStatus.QUOTATION,
                new_status=QuotationStatus.CONFIRMED,
                changed_by=customer_user,
                reason="Client confirmed quotation agreement via customer portal."
            )

        # 3. Quotation 2: Issued (Quotation status)
        qtn_issued, created = Quotation.objects.get_or_create(
            notes="Formal commercial proposal awaiting customer review.",
            defaults={
                "customer": customer_user,
                "template": template,
                "quotation_date": timezone.localdate(),
                "validity_days": 15,
                "status": QuotationStatus.QUOTATION,
                "created_by": staff_user,
            }
        )
        if created:
            QuotationLineItem.objects.create(
                quotation=qtn_issued,
                product=accounting_plan.product,
                variant=accounting_plan.variant,
                plan=accounting_plan,
                quantity=max(accounting_plan.minimum_quantity, 1),
                unit_price=accounting_plan.price,
                tax_rate=Decimal('18.00')
            )
            qtn_issued.calculate_totals()

        self.stdout.write(self.style.SUCCESS("Successfully seeded quotation templates and sample quotations."))
