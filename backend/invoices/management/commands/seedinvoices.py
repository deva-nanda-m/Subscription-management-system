from decimal import Decimal
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import User, Role
from subscriptions.models import Subscription, SubscriptionStatus
from invoices.models import Invoice, InvoiceStatus
from invoices.billing_service import BillingEngineService
from payments.models import Payment, PaymentMethod, PaymentStatus
from payments.serializers import generate_payment_reference


class Command(BaseCommand):
    help = 'Seeds sample invoices, line items, and payment transactions.'

    def handle(self, *args, **options):
        self.stdout.write("Seeding sample invoices and payments...")

        admin_user = User.objects.filter(role=Role.ADMIN).first()
        staff_user = User.objects.filter(role=Role.STAFF).first()
        today = timezone.localdate()

        # Check for subscriptions
        active_subscriptions = Subscription.objects.filter(status=SubscriptionStatus.ACTIVE)
        if not active_subscriptions.exists():
            self.stdout.write("No active subscriptions found. Skipping invoice seeding.")
            return

        generated_invoices = []
        for sub in active_subscriptions:
            try:
                inv, created = BillingEngineService.generate_invoice_for_subscription(
                    sub,
                    manual_trigger=True,
                    operator_user=staff_user
                )
                generated_invoices.append(inv)
                status_str = "Generated" if created else "Existing"
                self.stdout.write(f"  [{status_str}] Invoice: {inv.invoice_number} for {sub.customer.full_name} (INR {inv.total_amount})")
            except Exception as e:
                self.stdout.write(f"  [Skipped] Sub {sub.subscription_number}: {str(e)}")

        # Create one overdue invoice for realistic dashboard reporting
        if generated_invoices:
            first_inv = generated_invoices[0]
            # Settle first invoice partially
            if first_inv.outstanding_amount > Decimal('0.00'):
                half_amount = (first_inv.outstanding_amount / Decimal('2')).quantize(Decimal('0.01'))
                Payment.objects.create(
                    payment_reference=generate_payment_reference(),
                    invoice=first_inv,
                    customer=first_inv.customer,
                    payment_method=PaymentMethod.BANK_TRANSFER,
                    amount=half_amount,
                    payment_date=today - timedelta(days=2),
                    transaction_reference='NEFT9988776655',
                    payment_status=PaymentStatus.SUCCESSFUL,
                    recorded_by=staff_user,
                    notes='Advance partial payment received via NEFT.'
                )
                first_inv.update_payment_balances()
                self.stdout.write(f"  [Payment] Recorded partial payment of INR {half_amount} on {first_inv.invoice_number}")

        if len(generated_invoices) > 1:
            second_inv = generated_invoices[1]
            # Settle second invoice fully
            full_amount = second_inv.outstanding_amount
            if full_amount > Decimal('0.00'):
                Payment.objects.create(
                    payment_reference=generate_payment_reference(),
                    invoice=second_inv,
                    customer=second_inv.customer,
                    payment_method=PaymentMethod.UPI,
                    amount=full_amount,
                    payment_date=today - timedelta(days=1),
                    transaction_reference='UPI1122334455',
                    payment_status=PaymentStatus.SUCCESSFUL,
                    recorded_by=staff_user,
                    notes='Full payment received via UPI.'
                )
                second_inv.update_payment_balances()
                self.stdout.write(f"  [Payment] Recorded full payment of INR {full_amount} on {second_inv.invoice_number} (Status: PAID)")

        # Create a historical overdue invoice
        customer = User.objects.filter(role=Role.CUSTOMER).first()
        if customer:
            overdue_inv, created = Invoice.objects.get_or_create(
                invoice_number='INV-202609-0099',
                defaults={
                    'customer': customer,
                    'invoice_date': today - timedelta(days=45),
                    'due_date': today - timedelta(days=15),
                    'billing_period_start': today - timedelta(days=45),
                    'billing_period_end': today - timedelta(days=15),
                    'subtotal': Decimal('2500.00'),
                    'tax_amount': Decimal('450.00'),
                    'total_amount': Decimal('2950.00'),
                    'amount_paid': Decimal('0.00'),
                    'outstanding_amount': Decimal('2950.00'),
                    'status': InvoiceStatus.CONFIRMED,
                    'payment_terms': 'Net 30',
                    'notes': 'Overdue invoice for previous billing cycle.'
                }
            )
            if created:
                self.stdout.write(f"  [Created] Historical Overdue Invoice: {overdue_inv.invoice_number} (15 days overdue)")

        self.stdout.write(self.style.SUCCESS("Successfully seeded invoices and payments."))

