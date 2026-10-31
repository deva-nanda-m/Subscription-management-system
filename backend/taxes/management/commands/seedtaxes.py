from decimal import Decimal
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import User, Role
from taxes.models import Tax, Discount, TaxType, DiscountType, DiscountScope


class Command(BaseCommand):
    help = 'Seeds initial tax rules and promotional discount configurations.'

    def handle(self, *args, **options):
        self.stdout.write("Seeding tax rules and discount campaigns...")

        admin_user = User.objects.filter(role=Role.ADMIN).first()
        today = timezone.localdate()

        # Seed Taxes
        taxes_data = [
            {'name': 'GST 18% (Standard Software)', 'rate': Decimal('18.00'), 'description': 'Standard Indian GST for SaaS and cloud platform licenses.'},
            {'name': 'GST 12% (IT Infrastructure)', 'rate': Decimal('12.00'), 'description': 'Reduced GST rate for server hosting & storage components.'},
            {'name': 'GST 5% (Concessional)', 'rate': Decimal('5.00'), 'description': 'Concessional tax rate for educational institutions.'},
            {'name': 'Export / SEZ (Zero Rated)', 'rate': Decimal('0.00'), 'description': 'Exempt rate for cross-border software exports.'},
        ]

        for t_data in taxes_data:
            tax, created = Tax.objects.get_or_create(
                name=t_data['name'],
                defaults={
                    'rate': t_data['rate'],
                    'tax_type': TaxType.PERCENTAGE,
                    'description': t_data['description'],
                    'is_active': True,
                    'created_by': admin_user
                }
            )
            status_str = "Created" if created else "Exists"
            self.stdout.write(f"  [{status_str}] Tax Rule: {tax.name} ({tax.rate}%)")

        # Seed Discounts
        discounts_data = [
            {
                'name': 'Early Adopter 15% Launch Campaign',
                'code': 'EARLY15',
                'discount_type': DiscountType.PERCENTAGE,
                'discount_value': Decimal('15.00'),
                'minimum_purchase_amount': Decimal('500.00'),
                'minimum_quantity': 1,
                'start_date': today - timedelta(days=30),
                'end_date': today + timedelta(days=90),
                'max_usage_limit': 100,
                'description': '15% discount for early adopting enterprise customers.',
            },
            {
                'name': 'Festive Flat INR 1,000 Off Enterprise',
                'code': 'FESTIVE1000',
                'discount_type': DiscountType.FIXED,
                'discount_value': Decimal('1000.00'),
                'minimum_purchase_amount': Decimal('5000.00'),
                'minimum_quantity': 2,
                'start_date': today - timedelta(days=10),
                'end_date': today + timedelta(days=60),
                'max_usage_limit': 50,
                'description': 'Flat INR 1,000 deduction on bundled subscriptions exceeding INR 5,000.',
            },
            {
                'name': 'Annual Commitment 20% Privilege',
                'code': 'ANNUAL20',
                'discount_type': DiscountType.PERCENTAGE,
                'discount_value': Decimal('20.00'),
                'minimum_purchase_amount': Decimal('2000.00'),
                'minimum_quantity': 1,
                'start_date': today - timedelta(days=60),
                'end_date': today + timedelta(days=180),
                'max_usage_limit': 200,
                'description': 'Special 20% discount on long-term multi-seat plans.',
            },
        ]

        for d_data in discounts_data:
            disc, created = Discount.objects.get_or_create(
                code=d_data['code'],
                defaults={
                    'name': d_data['name'],
                    'discount_type': d_data['discount_type'],
                    'discount_value': d_data['discount_value'],
                    'minimum_purchase_amount': d_data['minimum_purchase_amount'],
                    'minimum_quantity': d_data['minimum_quantity'],
                    'start_date': d_data['start_date'],
                    'end_date': d_data['end_date'],
                    'max_usage_limit': d_data['max_usage_limit'],
                    'description': d_data['description'],
                    'application_scope': DiscountScope.ENTIRE_SUBSCRIPTION,
                    'is_active': True,
                    'created_by': admin_user
                }
            )
            status_str = "Created" if created else "Exists"
            safe_name = str(disc.name).replace('\u20b9', 'INR ')
            self.stdout.write(f"  [{status_str}] Discount Rule: {safe_name} ({disc.code})")

        self.stdout.write(self.style.SUCCESS("Successfully seeded taxes and discount rules."))
