from decimal import Decimal
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User, Role
from products.models import Product, ProductVariant, ProductCategory, ProductStatus
from plans.models import SubscriptionPlan, BillingInterval, PlanStatus
from .models import (
    QuotationTemplate,
    QuotationTemplateLine,
    Quotation,
    QuotationLineItem,
    QuotationStatus,
    QuotationStatusHistory,
    QuotationEmailLog,
)
from .pdf_generator import generate_quotation_pdf


class QuotationModuleTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.admin = User.objects.create_user(
            email='admin.q@brightloop.io',
            full_name='Admin User',
            password='AdminPassword123!',
            role=Role.ADMIN
        )
        self.staff = User.objects.create_user(
            email='staff.q@brightloop.io',
            full_name='Staff User',
            password='StaffPassword123!',
            role=Role.STAFF
        )
        self.customer = User.objects.create_user(
            email='customer.q@brightloop.io',
            full_name='Customer Alpha',
            password='CustomerPass123!',
            role=Role.CUSTOMER
        )
        self.other_customer = User.objects.create_user(
            email='other.q@brightloop.io',
            full_name='Customer Beta',
            password='CustomerPass123!',
            role=Role.CUSTOMER
        )

        # Product & Variant
        self.product = Product.objects.create(
            name='Cloud ERP System',
            code='ERP-001',
            category=ProductCategory.SOFTWARE,
            status=ProductStatus.ACTIVE,
            created_by=self.admin
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            name='Enterprise Edition',
            sku='ERP-ENT-01',
            price=Decimal('299.00'),
            is_active=True
        )

        # Subscription Plan
        self.plan = SubscriptionPlan.objects.create(
            name='Enterprise Annual Plan',
            product=self.product,
            variant=self.variant,
            price=Decimal('2500.00'),
            currency='USD',
            billing_interval=BillingInterval.YEARLY,
            minimum_quantity=2,
            available_from=timezone.localdate(),
            allow_pause=True,
            allow_early_closure=True,
            allow_renewal=True,
            status=PlanStatus.ACTIVE,
            created_by=self.admin
        )

    def test_01_template_crud(self):
        """Test template creation, validation, and line items."""
        self.client.force_authenticate(user=self.staff)

        payload = {
            "name": "Standard Enterprise Onboarding",
            "description": "Standard package for corporate rollouts.",
            "validity_days": 45,
            "is_active": True,
            "lines": [
                {
                    "product": self.product.id,
                    "variant": self.variant.id,
                    "plan": self.plan.id,
                    "default_quantity": 2,
                }
            ]
        }
        res = self.client.post('/api/quotation-templates/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['name'], "Standard Enterprise Onboarding")
        self.assertEqual(len(res.data['lines']), 1)
        self.assertEqual(res.data['lines'][0]['default_quantity'], 2)

        # Minimum quantity rejection
        bad_payload = {
            "name": "Invalid Qty Template",
            "lines": [
                {
                    "product": self.product.id,
                    "variant": self.variant.id,
                    "plan": self.plan.id,
                    "default_quantity": 1,  # Plan minimum is 2
                }
            ]
        }
        res_bad = self.client.post('/api/quotation-templates/', bad_payload, format='json')
        self.assertEqual(res_bad.status_code, status.HTTP_400_BAD_REQUEST)

    def test_02_customer_cannot_manage_templates(self):
        """Customers must receive 403 Forbidden on template APIs."""
        self.client.force_authenticate(user=self.customer)
        res = self.client.get('/api/quotation-templates/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_03_create_quotation_and_backend_price_calculation(self):
        """Staff creates quotation; totals and taxes are calculated strictly by backend."""
        self.client.force_authenticate(user=self.staff)

        payload = {
            "customer": self.customer.id,
            "quotation_date": str(timezone.localdate()),
            "validity_days": 30,
            "discount_amount": "100.00",
            "notes": "Negotiated enterprise volume rate.",
            "lines": [
                {
                    "product": self.product.id,
                    "variant": self.variant.id,
                    "plan": self.plan.id,
                    "quantity": 3,
                    "unit_price": "2000.00",
                    "tax_rate": "18.00"
                }
            ]
        }
        res = self.client.post('/api/quotations/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        qtn = Quotation.objects.get(pk=res.data['id'])
        # Qty: 3 * 2000 = 6000.00 subtotal
        # Tax: 6000 * 18% = 1080.00
        # Discount: 100.00
        # Grand total: 6000 + 1080 - 100 = 6980.00
        self.assertEqual(qtn.subtotal, Decimal('6000.00'))
        self.assertEqual(qtn.tax_amount, Decimal('1080.00'))
        self.assertEqual(qtn.grand_total, Decimal('6980.00'))
        self.assertEqual(qtn.status, QuotationStatus.DRAFT)
        self.assertFalse(qtn.is_converted)

        # Verify snapshots
        line = qtn.lines.first()
        self.assertEqual(line.product_name, self.product.name)
        self.assertEqual(line.variant_name, self.variant.name)
        self.assertEqual(line.plan_name, self.plan.name)
        self.assertEqual(line.billing_interval, self.plan.billing_interval)

    def test_04_quotation_workflow_and_customer_acceptance(self):
        """Finalize -> Quotation -> Confirm workflow and customer isolation."""
        # 1. Staff creates draft
        qtn = Quotation.objects.create(
            customer=self.customer,
            quotation_date=timezone.localdate(),
            validity_days=30,
            status=QuotationStatus.DRAFT,
            created_by=self.staff
        )
        QuotationLineItem.objects.create(
            quotation=qtn,
            product=self.product,
            variant=self.variant,
            plan=self.plan,
            quantity=2,
            unit_price=Decimal('2500.00'),
            tax_rate=Decimal('18.00')
        )
        qtn.calculate_totals()

        # 2. Staff finalizes to QUOTATION
        self.client.force_authenticate(user=self.staff)
        res_fin = self.client.post(f'/api/quotations/{qtn.id}/finalize/', {'reason': 'Issued to customer.'})
        self.assertEqual(res_fin.status_code, status.HTTP_200_OK)
        qtn.refresh_from_db()
        self.assertEqual(qtn.status, QuotationStatus.QUOTATION)

        # 3. Other customer cannot view or confirm
        self.client.force_authenticate(user=self.other_customer)
        res_other = self.client.get(f'/api/quotations/{qtn.id}/')
        self.assertIn(res_other.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

        res_other_confirm = self.client.post(f'/api/quotations/{qtn.id}/confirm/')
        self.assertEqual(res_other_confirm.status_code, status.HTTP_403_FORBIDDEN)

        # 4. Target customer accepts via portal
        self.client.force_authenticate(user=self.customer)
        res_cust = self.client.get(f'/api/quotations/{qtn.id}/')
        self.assertEqual(res_cust.status_code, status.HTTP_200_OK)

        res_confirm = self.client.post(f'/api/quotations/{qtn.id}/confirm/', {'reason': 'Approved by CFO.'})
        self.assertEqual(res_confirm.status_code, status.HTTP_200_OK)
        qtn.refresh_from_db()
        self.assertEqual(qtn.status, QuotationStatus.CONFIRMED)

    def test_05_cannot_confirm_expired_quotation(self):
        """Expired quotations must reject confirmation."""
        past_date = timezone.localdate() - timedelta(days=40)
        qtn = Quotation.objects.create(
            customer=self.customer,
            quotation_date=past_date,
            validity_days=10,
            status=QuotationStatus.QUOTATION,
            created_by=self.staff
        )
        QuotationLineItem.objects.create(
            quotation=qtn,
            product=self.product,
            variant=self.variant,
            plan=self.plan,
            quantity=2,
            unit_price=Decimal('2500.00'),
            tax_rate=Decimal('18.00')
        )
        qtn.calculate_totals()

        self.client.force_authenticate(user=self.customer)
        res = self.client.post(f'/api/quotations/{qtn.id}/confirm/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expired", res.data['detail'].lower())

    def test_06_pdf_generation(self):
        """Test PDF generation bytes and endpoint."""
        qtn = Quotation.objects.create(
            customer=self.customer,
            quotation_date=timezone.localdate(),
            validity_days=30,
            status=QuotationStatus.QUOTATION,
            created_by=self.staff
        )
        QuotationLineItem.objects.create(
            quotation=qtn,
            product=self.product,
            variant=self.variant,
            plan=self.plan,
            quantity=2,
            unit_price=Decimal('2500.00'),
            tax_rate=Decimal('18.00')
        )
        qtn.calculate_totals()

        pdf_io = generate_quotation_pdf(qtn)
        pdf_bytes = pdf_io.getvalue()
        self.assertTrue(pdf_bytes.startswith(b'%PDF'))

        self.client.force_authenticate(user=self.customer)
        res = self.client.get(f'/api/quotations/{qtn.id}/pdf/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res['Content-Type'], 'application/pdf')
