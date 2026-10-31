from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User, Role
from products.models import Product, ProductVariant, ProductCategory, ProductStatus, BillingType


class ProductAndVariantManagementTests(TestCase):
    """
    Comprehensive test suite for Module 2: Product and Product Variant Management.
    Ensures robust CRUD, SKU/Code uniqueness, validation, and role-based permissions.
    """

    def setUp(self):
        self.client = APIClient()

        # Users
        self.admin_user = User.objects.create_superuser(
            email='admin@brightloop.test',
            full_name='Admin User',
            password='AdminPassword123!',
            role=Role.ADMIN
        )

        self.staff_user = User.objects.create_user(
            email='staff@brightloop.test',
            full_name='Staff User',
            password='StaffPassword123!',
            role=Role.STAFF
        )

        self.customer_user = User.objects.create_user(
            email='customer@brightloop.test',
            full_name='Customer User',
            password='CustomerPassword123!',
            role=Role.CUSTOMER
        )

        # Existing Product with Variants
        self.active_product = Product.objects.create(
            name='Brightloop Analytics Engine',
            code='bl-analytics',
            description='Enterprise analytics platform',
            category=ProductCategory.SOFTWARE,
            status=ProductStatus.ACTIVE,
            is_recurring=True,
            created_by=self.admin_user
        )

        self.active_variant = ProductVariant.objects.create(
            product=self.active_product,
            name='Professional Tier',
            sku='BL-ANL-PRO',
            price=Decimal('99.00'),
            billing_type=BillingType.RECURRING,
            is_active=True,
            attributes={'seats': 10, 'storage_gb': 100}
        )

        self.inactive_variant = ProductVariant.objects.create(
            product=self.active_product,
            name='Legacy Tier',
            sku='BL-ANL-LEG',
            price=Decimal('49.00'),
            billing_type=BillingType.RECURRING,
            is_active=False
        )

        self.inactive_product = Product.objects.create(
            name='Deprecated Service',
            code='bl-deprecated',
            category=ProductCategory.SERVICE,
            status=ProductStatus.INACTIVE,
            created_by=self.admin_user
        )

        self.products_url = reverse('product-list-create')

    # 1. Admin can create product
    def test_01_admin_can_create_product(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'name': 'Brightloop CRM Pro',
            'code': 'bl-crm-pro',
            'description': 'Customer Relationship Management',
            'category': ProductCategory.SOFTWARE,
            'status': ProductStatus.ACTIVE,
            'is_recurring': True,
        }
        response = self.client.post(self.products_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data.get('success'))
        self.assertEqual(Product.objects.filter(code='bl-crm-pro').count(), 1)

    # 2. Duplicate product code is rejected
    def test_02_duplicate_product_code_rejected(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'name': 'Duplicate Code Product',
            'code': 'bl-analytics',  # Existing code
            'category': ProductCategory.SOFTWARE,
        }
        response = self.client.post(self.products_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('code', response.data)

    # 3. Admin can add a variant to a product
    def test_03_admin_can_create_variant(self):
        self.client.force_authenticate(user=self.admin_user)
        variant_url = reverse('product-variant-list-create', kwargs={'product_id': self.active_product.id})
        payload = {
            'name': 'Enterprise Tier',
            'sku': 'BL-ANL-ENT',
            'price': '299.00',
            'billing_type': BillingType.RECURRING,
            'attributes': {'seats': 50, 'dedicated_ip': True},
            'is_active': True,
        }
        response = self.client.post(variant_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data.get('success'))
        self.assertEqual(ProductVariant.objects.filter(sku='BL-ANL-ENT').count(), 1)

    # 4. Duplicate variant SKU is rejected
    def test_04_duplicate_variant_sku_rejected(self):
        self.client.force_authenticate(user=self.admin_user)
        variant_url = reverse('product-variant-list-create', kwargs={'product_id': self.active_product.id})
        payload = {
            'name': 'Another Pro Tier',
            'sku': 'BL-ANL-PRO',  # Existing SKU
            'price': '120.00',
        }
        response = self.client.post(variant_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('sku', response.data)

    # 5. Negative price is rejected
    def test_05_negative_price_rejected(self):
        self.client.force_authenticate(user=self.admin_user)
        variant_url = reverse('product-variant-list-create', kwargs={'product_id': self.active_product.id})
        payload = {
            'name': 'Invalid Price Tier',
            'sku': 'BL-ANL-INV',
            'price': '-25.00',
        }
        response = self.client.post(variant_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('price', response.data)

    # 6. Admin can update product details and status
    def test_06_admin_can_update_product(self):
        self.client.force_authenticate(user=self.admin_user)
        detail_url = reverse('product-detail', kwargs={'pk': self.active_product.id})
        payload = {'description': 'Updated platform description'}
        res = self.client.patch(detail_url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        status_url = reverse('product-status-update', kwargs={'pk': self.active_product.id})
        status_res = self.client.patch(status_url, {'status': ProductStatus.ARCHIVED}, format='json')
        self.assertEqual(status_res.status_code, status.HTTP_200_OK)
        self.active_product.refresh_from_db()
        self.assertEqual(self.active_product.status, ProductStatus.ARCHIVED)

    # 7. Admin can toggle variant status
    def test_07_admin_can_toggle_variant_status(self):
        self.client.force_authenticate(user=self.admin_user)
        toggle_url = reverse('variant-status-update', kwargs={'pk': self.active_variant.id})
        res = self.client.patch(toggle_url, {'is_active': False}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.active_variant.refresh_from_db()
        self.assertFalse(self.active_variant.is_active)

    # 8. Staff can view products and variants (read-only)
    def test_08_staff_can_view_products_and_variants(self):
        self.client.force_authenticate(user=self.staff_user)
        res_list = self.client.get(self.products_url)
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)

        detail_url = reverse('product-detail', kwargs={'pk': self.active_product.id})
        res_detail = self.client.get(detail_url)
        self.assertEqual(res_detail.status_code, status.HTTP_200_OK)
        self.assertIn('variants', res_detail.data)

    # 9. Staff cannot create, edit or delete products
    def test_09_staff_cannot_create_or_modify_products(self):
        self.client.force_authenticate(user=self.staff_user)
        res_create = self.client.post(self.products_url, {'name': 'Staff Product', 'code': 'staff-prod'})
        self.assertEqual(res_create.status_code, status.HTTP_403_FORBIDDEN)

        detail_url = reverse('product-detail', kwargs={'pk': self.active_product.id})
        res_update = self.client.patch(detail_url, {'name': 'Modified'})
        self.assertEqual(res_update.status_code, status.HTTP_403_FORBIDDEN)

        res_delete = self.client.delete(detail_url)
        self.assertEqual(res_delete.status_code, status.HTTP_403_FORBIDDEN)

    # 10. Customer can view active products only
    def test_10_customer_catalog_access_active_only(self):
        self.client.force_authenticate(user=self.customer_user)
        response = self.client.get(self.products_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        product_codes = [p['code'] for p in response.data]
        self.assertIn(self.active_product.code, product_codes)
        self.assertNotIn(self.inactive_product.code, product_codes)

    # 11. Customer cannot view inactive variants
    def test_11_customer_cannot_view_inactive_variants(self):
        self.client.force_authenticate(user=self.customer_user)
        variants_url = reverse('product-variant-list-create', kwargs={'product_id': self.active_product.id})
        response = self.client.get(variants_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        skus = [v['sku'] for v in response.data]
        self.assertIn('BL-ANL-PRO', skus)
        self.assertNotIn('BL-ANL-LEG', skus)  # Inactive variant filtered out

    # 12. Customer cannot write or delete
    def test_12_customer_cannot_write_or_delete(self):
        self.client.force_authenticate(user=self.customer_user)
        res_create = self.client.post(self.products_url, {'name': 'Cust Prod', 'code': 'cust-prod'})
        self.assertEqual(res_create.status_code, status.HTTP_403_FORBIDDEN)

        variant_url = reverse('product-variant-list-create', kwargs={'product_id': self.active_product.id})
        res_var = self.client.post(variant_url, {'name': 'Cust Variant', 'sku': 'CUST-VAR'})
        self.assertEqual(res_var.status_code, status.HTTP_403_FORBIDDEN)

    # 13. Unauthenticated requests rejected
    def test_13_unauthenticated_requests_rejected(self):
        res = self.client.get(self.products_url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
