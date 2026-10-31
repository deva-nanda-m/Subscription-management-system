from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from accounts.models import User, Role
from products.models import Product, ProductVariant, ProductCategory, ProductStatus
from plans.models import SubscriptionPlan, PlanStatusHistory, PlanStatus, BillingInterval


class Command(BaseCommand):
    help = 'Seed initial subscription plans using products from Module 2.'

    def handle(self, *args, **options):
        admin_user = User.objects.filter(role=Role.ADMIN).first()
        today = timezone.now().date()

        # Retrieve or create Accounting Software product for prompt examples
        accounting_prod, _ = Product.objects.get_or_create(
            code="accounting-software",
            defaults={
                "name": "Accounting Software",
                "description": "Comprehensive accounting, GST/VAT billing, and ledger compliance platform.",
                "category": ProductCategory.SOFTWARE,
                "status": ProductStatus.ACTIVE,
                "is_recurring": True,
                "created_by": admin_user,
            }
        )

        acc_starter_var, _ = ProductVariant.objects.get_or_create(
            sku="ACC-STD-01",
            defaults={
                "product": accounting_prod,
                "name": "Single Entity Edition",
                "price": Decimal("500.00"),
                "currency": "INR",
                "is_active": True,
            }
        )

        analytics_prod = Product.objects.filter(code="brightloop-analytics").first()
        anl_pro_var = analytics_prod.variants.filter(sku="BL-ANL-PRO").first() if analytics_prod else None

        vault_prod = Product.objects.filter(code="brightloop-cloud-vault").first()
        vault_var = vault_prod.variants.first() if vault_prod else None

        plans_data = [
            # Prompt Example 1
            {
                "name": "Basic Monthly",
                "description": "Standard monthly billing plan for single-entity accounting.",
                "product": accounting_prod,
                "variant": acc_starter_var,
                "price": Decimal("500.00"),
                "currency": "INR",
                "billing_interval": BillingInterval.MONTHLY,
                "minimum_quantity": 1,
                "available_from": today - timedelta(days=10),
                "available_until": None,
                "auto_close": False,
                "allow_early_closure": True,
                "allow_pause": True,
                "allow_renewal": True,
                "status": PlanStatus.ACTIVE,
            },
            # Prompt Example 2
            {
                "name": "Business Yearly",
                "description": "Enterprise-grade annual accounting plan with discounted volume pricing.",
                "product": accounting_prod,
                "variant": acc_starter_var,
                "price": Decimal("5000.00"),
                "currency": "INR",
                "billing_interval": BillingInterval.YEARLY,
                "minimum_quantity": 5,
                "available_from": today - timedelta(days=5),
                "available_until": today + timedelta(days=365),
                "auto_close": True,
                "allow_early_closure": True,
                "allow_pause": True,
                "allow_renewal": True,
                "status": PlanStatus.ACTIVE,
            },
            # Prompt Example 3
            {
                "name": "Enterprise Weekly",
                "description": "Short-cycle weekly burst billing plan for audit firms and temporary accounting staff.",
                "product": accounting_prod,
                "variant": acc_starter_var,
                "price": Decimal("150.00"),
                "currency": "INR",
                "billing_interval": BillingInterval.WEEKLY,
                "minimum_quantity": 10,
                "available_from": today,
                "available_until": today + timedelta(days=90),
                "auto_close": True,
                "allow_early_closure": True,
                "allow_pause": True,
                "allow_renewal": False,
                "status": PlanStatus.ACTIVE,
            },
        ]

        if analytics_prod and anl_pro_var:
            plans_data.append({
                "name": "Analytics Growth Monthly",
                "description": "Monthly recurring intelligence tier for scaling companies.",
                "product": analytics_prod,
                "variant": anl_pro_var,
                "price": Decimal("149.00"),
                "currency": "USD",
                "billing_interval": BillingInterval.MONTHLY,
                "minimum_quantity": 1,
                "available_from": today - timedelta(days=20),
                "available_until": None,
                "auto_close": False,
                "allow_early_closure": True,
                "allow_pause": True,
                "allow_renewal": True,
                "status": PlanStatus.ACTIVE,
            })

        if vault_prod and vault_var:
            plans_data.append({
                "name": "Cloud Vault Daily Compute",
                "description": "High-frequency daily retention storage billing.",
                "product": vault_prod,
                "variant": vault_var,
                "price": Decimal("1.50"),
                "currency": "USD",
                "billing_interval": BillingInterval.DAILY,
                "minimum_quantity": 1,
                "available_from": today,
                "available_until": today + timedelta(days=180),
                "auto_close": True,
                "allow_early_closure": True,
                "allow_pause": True,
                "allow_renewal": True,
                "status": PlanStatus.ACTIVE,
            })

        created_count = 0
        for p in plans_data:
            plan, created = SubscriptionPlan.objects.update_or_create(
                name=p["name"],
                defaults={**p, "created_by": admin_user}
            )
            if created:
                created_count += 1
                PlanStatusHistory.objects.create(
                    plan=plan,
                    previous_status="NONE",
                    new_status=plan.status,
                    changed_by=admin_user,
                    change_reason="Seeded demo plan."
                )

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {created_count} subscription plans!"))

