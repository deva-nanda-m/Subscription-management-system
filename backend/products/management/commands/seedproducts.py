from decimal import Decimal
from django.core.management.base import BaseCommand
from accounts.models import User, Role
from products.models import Product, ProductVariant, ProductCategory, ProductStatus, BillingType


class Command(BaseCommand):
    help = 'Seed initial Brightloop SaaS products and tier variants for development and demo.'

    def handle(self, *args, **options):
        admin_user = User.objects.filter(role=Role.ADMIN).first()

        catalog_data = [
            {
                "name": "Brightloop Analytics Suite",
                "code": "brightloop-analytics",
                "description": "Real-time subscription intelligence, MRR/ARR forecasting, customer churn analytics, and cohort analysis.",
                "category": ProductCategory.SOFTWARE,
                "status": ProductStatus.ACTIVE,
                "is_recurring": True,
                "variants": [
                    {
                        "name": "Starter Edition",
                        "sku": "BL-ANL-STR",
                        "price": Decimal("49.00"),
                        "billing_type": BillingType.RECURRING,
                        "description": "Essential metrics for seed-stage startups.",
                        "attributes": {"seats": 5, "retention_months": 12, "custom_dashboards": 3},
                        "sort_order": 1,
                    },
                    {
                        "name": "Growth / Pro Edition",
                        "sku": "BL-ANL-PRO",
                        "price": Decimal("149.00"),
                        "billing_type": BillingType.RECURRING,
                        "description": "Advanced cohort modeling, automated churn alerts, and multi-currency reporting.",
                        "attributes": {"seats": 25, "retention_months": 36, "custom_dashboards": 20, "slack_alerts": True},
                        "sort_order": 2,
                    },
                    {
                        "name": "Enterprise Scale",
                        "sku": "BL-ANL-ENT",
                        "price": Decimal("499.00"),
                        "billing_type": BillingType.RECURRING,
                        "description": "Dedicated analytics cluster, real-time Snowflake/BigQuery sync, and 24/7 SLA.",
                        "attributes": {"seats": "Unlimited", "retention_months": "Unlimited", "custom_dashboards": "Unlimited", "dedicated_csm": True},
                        "sort_order": 3,
                    },
                ]
            },
            {
                "name": "Brightloop Automated Billing Engine",
                "code": "brightloop-billing",
                "description": "Recurring cycle billing, proration handling, failed payment recovery, and automated dunning.",
                "category": ProductCategory.SOFTWARE,
                "status": ProductStatus.ACTIVE,
                "is_recurring": True,
                "variants": [
                    {
                        "name": "Standard Gateway",
                        "sku": "BL-BIL-STD",
                        "price": Decimal("79.00"),
                        "billing_type": BillingType.RECURRING,
                        "description": "Up to 1,000 monthly active subscribers with standard payment webhooks.",
                        "attributes": {"monthly_invoices": 1000, "payment_gateways": 2, "dunning_cycles": 3},
                        "sort_order": 1,
                    },
                    {
                        "name": "High-Volume Enterprise Gateway",
                        "sku": "BL-BIL-ENT",
                        "price": Decimal("299.00"),
                        "billing_type": BillingType.RECURRING,
                        "description": "High-throughput billing engine for up to 25,000 active subscriptions.",
                        "attributes": {"monthly_invoices": 25000, "payment_gateways": "Unlimited", "dunning_cycles": "Custom AI"},
                        "sort_order": 2,
                    },
                ]
            },
            {
                "name": "High-Throughput Cloud Vault",
                "code": "brightloop-cloud-vault",
                "description": "Compliant cloud storage add-on for invoice PDFs, audit trail history, and encrypted backups.",
                "category": ProductCategory.STORAGE,
                "status": ProductStatus.ACTIVE,
                "is_recurring": True,
                "variants": [
                    {
                        "name": "500GB SSD Vault",
                        "sku": "BL-VLT-500GB",
                        "price": Decimal("25.00"),
                        "billing_type": BillingType.RECURRING,
                        "description": "500 GB AES-256 encrypted storage volume.",
                        "attributes": {"storage_gb": 500, "redundancy": "Geo-Replicated"},
                        "sort_order": 1,
                    },
                    {
                        "name": "2TB NVMe Enterprise Vault",
                        "sku": "BL-VLT-2TB",
                        "price": Decimal("85.00"),
                        "billing_type": BillingType.RECURRING,
                        "description": "2 TB ultra-fast NVMe cloud vault with instant immutable snapshots.",
                        "attributes": {"storage_gb": 2048, "redundancy": "Multi-Region Active-Active"},
                        "sort_order": 2,
                    },
                ]
            },
            {
                "name": "Enterprise Implementation & Setup",
                "code": "brightloop-setup-service",
                "description": "White-glove implementation service led by Brightloop systems engineers.",
                "category": ProductCategory.SERVICE,
                "status": ProductStatus.ACTIVE,
                "is_recurring": False,
                "variants": [
                    {
                        "name": "Rapid Onboarding Package",
                        "sku": "BL-SRV-ONB",
                        "price": Decimal("1500.00"),
                        "billing_type": BillingType.ONE_TIME,
                        "description": "15 hours of engineering assistance for custom CRM/ERP integration and data migration.",
                        "attributes": {"engineering_hours": 15, "delivery_days": 14},
                        "sort_order": 1,
                    }
                ]
            }
        ]

        created_products = 0
        created_variants = 0

        for p_data in catalog_data:
            variants_data = p_data.pop("variants")
            product, created = Product.objects.update_or_create(
                code=p_data["code"],
                defaults={**p_data, "created_by": admin_user}
            )
            if created:
                created_products += 1

            for v_data in variants_data:
                variant, v_created = ProductVariant.objects.update_or_create(
                    sku=v_data["sku"],
                    defaults={**v_data, "product": product}
                )
                if v_created:
                    created_variants += 1

        self.stdout.write(self.style.SUCCESS(
            f"Successfully seeded {created_products} products and {created_variants} product variants!"
        ))

