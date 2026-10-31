# Brightloop Software – Subscription Management System
## Multi-Module Enterprise SaaS Billing Platform

A modular, scalable, and production-grade full-stack web application for recurring subscription billing, quotation workflows, automated invoice generation, and revenue lifecycle management.

### Platform Modules Architecture:
- **Module 1: Authentication and User Role Management** (COMPLETED & VERIFIED)
- **Module 2: Product and Product Variant Management** (COMPLETED & VERIFIED)
- **Module 3: Subscription Plan Management** (Upcoming — Daily, Weekly, Monthly, Annual plans linked to Variants)
- **Module 4: Subscription Lifecycle Management** (Upcoming — Create, Renew, Pause, Cancel)
- **Module 5: Tax and Discount Management** (Upcoming)
- **Module 6: Automated Invoice Generation** (Upcoming)
- **Module 7: Payment Gateway Integration** (Upcoming)
- **Module 8: Revenue & Churn Analytics** (Upcoming)

---

## 1. Technology Stack

### Frontend
- **React.js** (Vite build engine)
- **Tailwind CSS** (Utility-first styling with modern dark/light contrast)
- **React Router DOM v7** (Role-based route guards)
- **Axios** (With silent token refresh and response interceptors)
- **Lucide React** (Modern SaaS iconography)

### Backend
- **Python 3.11+**
- **Django 5.x**
- **Django REST Framework (DRF)**
- **Django REST Framework Simple JWT** (Access + Refresh tokens with blacklist rotation)
- **django-cors-headers**
- **psycopg2-binary** (PostgreSQL adapter)
- **python-dotenv**

### Database
- **PostgreSQL** (Production standard) with SQLite development fallback

---

## 2. Module 1: Authentication & User Role Governance

Strict **Role-Based Access Control (RBAC)** enforced by backend permission classes:
- **Admin (`ADMIN`)**: Full application access, staff account provisioning, staff activation/deactivation, product CRUD, and system configuration.
- **Staff (`STAFF`)**: Operational management; can view products and variants to assist subscribers; blocked by backend from creating other staff or modifying products.
- **Customer (`CUSTOMER`)**: Independent self-registration (`/register`); access to customer portal; isolated strictly to their own data; read-only access to published active products.

### Password Security Standard
- Password length must be **MORE THAN 8 characters** (at least 9 characters).
- At least one uppercase letter (`A-Z`).
- At least one lowercase letter (`a-z`).
- At least one special character (`[^A-Za-z0-9]`).
- Hashed using Django's PBKDF2/SHA256 hasher before storage.

---

## 3. Module 2: Product and Product Variant Management

Module 2 allows administrators to create, manage, update, and organize SaaS products and their tier variants. These variants serve as the foundational entities that will be attached to recurring subscription plans in Module 3.

### 3.1 Database Models (`backend/products/models.py`)

#### `Product` Model
- `id` (BigAutoField, Primary Key)
- `name` (CharField, max 255)
- `code` (SlugField, unique, indexed, e.g. `brightloop-analytics`)
- `description` (TextField)
- `category` (Choice: `SOFTWARE`, `SERVICE`, `STORAGE`, `ADDON`, `API`)
- `status` (Choice: `DRAFT`, `ACTIVE`, `INACTIVE`, `ARCHIVED`)
- `is_recurring` (BooleanField, default `True`)
- `created_by` (ForeignKey -> `User`)
- `created_at` / `updated_at` (DateTimeFields)
- Computed properties: `total_variants_count`, `active_variants_count`, `min_price`, `max_price`.

#### `ProductVariant` Model
- `id` (BigAutoField, Primary Key)
- `product` (ForeignKey -> `Product`, `on_delete=CASCADE`, `related_name='variants'`)
- `name` (CharField, max 255, e.g. `Professional Tier`, `500GB SSD Vault`)
- `sku` (CharField, unique, indexed, uppercase, e.g. `BL-ANL-PRO`)
- `description` (TextField)
- `price` (DecimalField, min 0.00, reference price)
- `currency` (CharField, default `USD`)
- `billing_type` (Choice: `RECURRING`, `ONE_TIME`, `METERED`)
- `is_active` (BooleanField, default `True`)
- `attributes` (JSONField, e.g. `{"seats": 25, "storage_gb": 250, "sla_hours": 4}`)
- `sort_order` (PositiveIntegerField, default 0)
- `created_at` / `updated_at` (DateTimeFields)

### 3.2 REST API Endpoints

| Category | Method | Endpoint | Permissions | Description |
| :--- | :---: | :--- | :--- | :--- |
| **Products** | `GET` | `/api/products/?search=&category=&status=` | Authenticated | List products. Filtered to `ACTIVE` only for customers. |
| **Products** | `POST` | `/api/products/` | `ADMIN` only | Create new core product. |
| **Products** | `GET` | `/api/products/<id>/` | Authenticated | Get product specifications and nested variant tiers. |
| **Products** | `PATCH` | `/api/products/<id>/` | `ADMIN` only | Update product details. |
| **Products** | `PATCH` | `/api/products/<id>/status/` | `ADMIN` only | Change product status (`ACTIVE`, `INACTIVE`, `DRAFT`, `ARCHIVED`). |
| **Products** | `DELETE`| `/api/products/<id>/` | `ADMIN` only | Delete product and cascaded variants. |
| **Variants** | `GET` | `/api/products/<product_id>/variants/` | Authenticated | List all variants/tiers for a product. |
| **Variants** | `POST` | `/api/products/<product_id>/variants/` | `ADMIN` only | Create a new tier variant with price and attributes. |
| **Variants** | `GET` | `/api/variants/<id>/` | Authenticated | Get variant detail. |
| **Variants** | `PATCH` | `/api/variants/<id>/` | `ADMIN` only | Update variant details, price, or custom attributes. |
| **Variants** | `PATCH` | `/api/variants/<id>/status/` | `ADMIN` only | Activate or deactivate variant. |
| **Variants** | `DELETE`| `/api/variants/<id>/` | `ADMIN` only | Delete variant tier. |

---

## 4. Setup and Execution Instructions

### 4.1 Backend Setup

```bash
cd backend

# 1. Activate virtual environment
.\venv\Scripts\activate   # Windows
# source venv/bin/activate # macOS/Linux

# 2. Run migrations
python manage.py migrate

# 3. Seed Administrator account
python manage.py initadmin
# Default Admin: admin@brightloop.com / Admin@Brightloop2026!

# 4. Seed initial SaaS products and variants
python manage.py seedproducts

# 5. Start Django development server
python manage.py runserver 127.0.0.1:8000
```

### 4.2 Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
```

Application will run at `http://localhost:5173/`.

---

## 5. Automated Test Suite (28 Tests Passing)

To run the complete automated test suite covering Module 1 and Module 2:

```bash
cd backend
.\venv\Scripts\python.exe manage.py test accounts products
```

**Results:**
```
Ran 28 tests in 52.125s
OK
```

### Verified Test Scenarios:
- **Accounts (15 tests):** Customer registration, unique email validation, password complexity, login verification, invalid credential rejection, inactive account lockout, password reset token generation, token expiration check, single-use token invalidation, admin staff creation, staff creation lockout for non-admins, customer isolation, and JWT verification.
- **Products & Variants (13 tests):** Admin product creation, unique slug/code enforcement, variant creation, unique SKU validation, negative price prevention, product details & status update, variant status toggle, staff read-only clearance, staff modification lockout, customer active catalog filtering, customer inactive variant filtering, customer write lockout, and unauthenticated request rejection.

---

## 6. Postman Collection

Import `postman/Brightloop_Subscription_Management_API.postman_collection.json` into Postman. It includes pre-configured requests for Authentication, Password Recovery, Staff Management, Products, and Product Variants with automated JWT session persistence.
