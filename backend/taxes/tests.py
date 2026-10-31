from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from accounts.models import User, Role
from .models import Tax, Discount, TaxType, DiscountType, DiscountScope


class TaxAndDiscountTests(APITestCase):
    def setUp(self):
        # Create users
        self.admin = User.objects.create_user(
            email='admin@test.com',
            password='AdminPassword123!',
            full_name='Admin User',
            role=Role.ADMIN
        )
        self.staff = User.objects.create_user(
            email='staff@test.com',
            password='StaffPassword123!',
            full_name='Staff User',
            role=Role.STAFF
        )
        self.customer = User.objects.create_user(
            email='customer@test.com',
            password='CustomerPassword123!',
            full_name='Customer User',
            role=Role.CUSTOMER
        )

        # Create sample Tax
        self.tax = Tax.objects.create(
            name='GST 18%',
            rate=Decimal('18.00'),
            tax_type=TaxType.PERCENTAGE,
            is_active=True,
            created_by=self.admin
        )

        # Create sample Discount
        today = timezone.localdate()
        self.discount = Discount.objects.create(
            name='Early Bird 10%',
            code='EARLY10',
            discount_type=DiscountType.PERCENTAGE,
            discount_value=Decimal('10.00'),
            minimum_purchase_amount=Decimal('500.00'),
            minimum_quantity=1,
            start_date=today - timedelta(days=5),
            end_date=today + timedelta(days=25),
            max_usage_limit=10,
            current_usage_count=0,
            is_active=True,
            created_by=self.admin
        )

    # ---------------- Tax Tests ----------------

    def test_admin_create_tax_rule(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/taxes/', {
            'name': 'VAT 5%',
            'rate': '5.00',
            'tax_type': 'PERCENTAGE',
            'description': 'Standard VAT',
            'is_active': True,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'VAT 5%')
        self.assertEqual(Decimal(str(response.data['rate'])), Decimal('5.00'))

    def test_tax_rate_validation(self):
        self.client.force_authenticate(user=self.admin)
        # Exceeds 100%
        response = self.client.post('/api/taxes/', {
            'name': 'Invalid Tax',
            'rate': '105.00',
            'tax_type': 'PERCENTAGE',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_staff_can_view_but_cannot_create_tax(self):
        self.client.force_authenticate(user=self.staff)
        # GET is allowed
        get_res = self.client.get('/api/taxes/')
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)

        # POST is forbidden
        post_res = self.client.post('/api/taxes/', {
            'name': 'Staff Tax',
            'rate': '12.00',
        })
        self.assertEqual(post_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_tax_calculation_method(self):
        taxable = Decimal('1000.00')
        calc = self.tax.calculate_tax(taxable)
        self.assertEqual(calc, Decimal('180.00'))

        # Inactive tax yields 0
        self.tax.is_active = False
        self.tax.save()
        self.assertEqual(self.tax.calculate_tax(taxable), Decimal('0.00'))

    # ---------------- Discount Tests ----------------

    def test_admin_create_discount_rule(self):
        self.client.force_authenticate(user=self.admin)
        today = timezone.localdate()
        response = self.client.post('/api/discounts/', {
            'name': 'Flat 500 Off',
            'code': 'FLAT500',
            'discount_type': 'FIXED',
            'discount_value': '500.00',
            'minimum_purchase_amount': '2000.00',
            'start_date': str(today),
            'is_active': True,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Flat 500 Off')
        self.assertEqual(Decimal(str(response.data['discount_value'])), Decimal('500.00'))

    def test_discount_eligibility_and_calculation(self):
        # Meets minimum purchase of 500.00
        eligible = self.discount.is_eligible(subtotal=Decimal('1000.00'), total_quantity=2)
        self.assertTrue(eligible)
        calc = self.discount.calculate_discount_amount(Decimal('1000.00'))
        self.assertEqual(calc, Decimal('100.00'))

        # Below minimum purchase
        ineligible_amount = self.discount.is_eligible(subtotal=Decimal('400.00'), total_quantity=1)
        self.assertFalse(ineligible_amount)

        # Exceeds usage limit
        self.discount.current_usage_count = 10
        self.discount.save()
        ineligible_usage = self.discount.is_eligible(subtotal=Decimal('1000.00'), total_quantity=1)
        self.assertFalse(ineligible_usage)

    def test_discount_deactivate(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/discounts/{self.discount.id}/deactivate/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.discount.refresh_from_db()
        self.assertFalse(self.discount.is_active)

    def test_customer_access_forbidden(self):
        self.client.force_authenticate(user=self.customer)
        res_tax = self.client.get('/api/taxes/')
        self.assertEqual(res_tax.status_code, status.HTTP_403_FORBIDDEN)
        res_disc = self.client.get('/api/discounts/')
        self.assertEqual(res_disc.status_code, status.HTTP_403_FORBIDDEN)

