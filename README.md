# Brightloop Software – Subscription Management System

A production-grade, enterprise-scale subscription management platform designed to automate software product subscriptions, recurring billing cycles, invoice generation, and lifecycle governance.

---

## Architecture & Technology Stack

- **Frontend:** React 19, Tailwind CSS, React Router DOM, Axios, Lucide React
- **Backend:** Python 3.12, Django 5.x, Django REST Framework, SimpleJWT
- **Background Tasks & Scheduling:** Celery, Redis
- **Database:** PostgreSQL (with Django ORM)
- **API Documentation & Testing:** Postman (`postman/Brightloop_Subscription_Management_API.postman_collection.json`)

---

## Modules Implemented

### Module 1: Authentication & User Role Management
- **Role-Based Access Control (RBAC):** `ADMIN`, `STAFF`, `CUSTOMER`.
- **Custom User Model:** Email-as-username, Bcrypt-grade password hashing, activation control.
- **JWT Authentication:** SimpleJWT access & refresh tokens with token blacklist rotation.
- **Customer Registration:** Client & server validation (8+ chars, uppercase, lowercase, special character, match confirmation).
- **Staff Provisioning:** Admin-only staff account creation, activation/deactivation toggles, directory browsing.
- **Forgot Password Workflow:** Cryptographic reset tokens, time-limited reset links, secure password updates.

### Module 2: Product & Product Variant Management
- **Products:** Core software offerings (`SOFTWARE`, `SERVICE`, `STORAGE`, `ADDON`, `API`) with auto-generated unique codes (`PRD-XXXXXX`).
- **Product Variants:** Multi-tier specifications (e.g., Basic, Pro, Enterprise, Dedicated) with custom SKU generator (`SKU-XXXXXX`), billing types (`RECURRING`, `ONE_TIME`, `METERED`), and JSON attributes (`seats`, `storage_gb`, `rate_limit`).
- **Data Integrity:** `PROTECT` on delete foreign keys prevent orphaned variants or plans.
- **RBAC:** Admins have full CRUD; Staff has operational read-only clearance; Customers browse active products.

### Module 3: Subscription Plan Management
- **Plan Definitions:** Connects to active `Product` and optional `ProductVariant`. Defines non-negative recurring price, currency (`INR`, `USD`, `EUR`, `GBP`), and minimum order quantity ($\ge 1$).
- **Supported Billing Intervals:** Strictly enforced:
  - `DAILY`: Charged every 24 hours.
  - `WEEKLY`: Charged every 7 days.
  - `MONTHLY`: Charged monthly.
  - `YEARLY`: Charged annually.
- **Purchase Availability Management:** Configurable `available_from` and `available_until` window. Supports indefinite availability (no end date).
- **Plan Lifecycle Configuration:**
  - `auto_close`: Automatically transitions plan to `CLOSED` when end date passes.
  - `allow_early_closure`: Allows Admin to retire a plan prior to end date.
  - `allow_pause`: Permits temporary suspension of new subscriptions.
  - `allow_renewal`: Guarantees existing subscribers can renew after plan availability ends.
- **State Machine & Status Transitions:**
  - `ACTIVE` $\leftrightarrow$ `PAUSED` (Requires `allow_pause = True`)
  - `ACTIVE` $\to$ `CLOSED` (Requires `allow_early_closure = True` or expired window)
  - `PAUSED` $\to$ `CLOSED`
  - `CLOSED` is terminal: Reopening a closed plan is strictly prohibited.
- **Audit Trail:** Every status transition writes an immutable `PlanStatusHistory` record capturing previous status, new status, changed by user, change reason, and timestamp.
- **Celery Periodic Automation:** Hourly background daemon (`close_expired_plans_task`) checks for expired plans with `auto_close=True` and closes them automatically.
- **RBAC:** Admins have complete CRUD & lifecycle controls; Staff has read-only access for operational customer assistance; Customers cannot access administrative management endpoints.

### Part 1: Quotation Management & Subscription Lifecycle
- **Quotation Templates:** Reusable blueprints (`QuotationTemplate`, `QuotationTemplateLine`) with validity period, product, variant, and plan line items. Editing a template never alters historical quotations.
- **Customer Quotations:** Generated for specific customers with unique quotation numbers (`QTN-YYYYMM-XXXX`). Captures immutable price snapshots (`unit_price`, `discount_percentage`, `tax_rate`, `total_amount`), validity period, and auto-computed expiry dates.
- **Quotation Lifecycle:**
  - `DRAFT` $\to$ `QUOTATION` (Finalized/Issued)
  - `QUOTATION` $\to$ `CONFIRMED` (Customer Acceptance / Staff Approval)
  - `DRAFT` / `QUOTATION` $\to$ `CANCELLED`
  - Automated expiry via Celery Beat if overdue without confirmation (`EXPIRED`).
- **ReportLab PDF Generation:** Generates vector-quality, branded PDF proposals (`backend/quotations/pdf_generator.py`) with company metadata, pricing summaries, and customer sign-off blocks. Supports direct browser viewing and attachment downloads.
- **Email Notification Engine:** Integrates SMTP/console email dispatch (`QuotationSendEmailView`) attaching the generated PDF and logging dispatch status into `QuotationEmailLog`.
- **Atomic Subscription Conversion:** Confirmed quotations can be converted atomically (`transaction.atomic`) into active `Subscription` contracts. Copies snapshot line items into `SubscriptionItem`, computes the initial `next_billing_date` based on plan billing intervals, and enforces duplicate-conversion protection (`is_converted=True`).
- **Subscription Lifecycle Engine:**
  - `CONFIRMED` $\to$ `ACTIVE`
  - `ACTIVE` $\leftrightarrow$ `PAUSED` (Requires mandatory pause reason, logs pause & resume timestamps in `SubscriptionPauseHistory`)
  - `ACTIVE` $\to$ `CLOSED` (Terminal state)
  - `RENEWAL`: Creates a new subscription linked through `SubscriptionRenewal` to the original contract.
- **Celery Periodic Automations:**
  - `expire_overdue_quotations_task`: Hourly task that flags unconfirmed overdue quotations as `EXPIRED`.
  - `activate_scheduled_subscriptions_task`: Activates confirmed subscriptions whose start date has arrived.
  - `close_expired_subscriptions_task`: Closes subscriptions whose fixed end date has elapsed.
- **Audit Logging:** Comprehensive status history tracking for both quotations (`QuotationStatusHistory`) and subscriptions (`SubscriptionStatusHistory`).

---

## API Endpoints Overview

### Authentication (`/api/auth/`)
| Method | Endpoint | Description | Clearance |
|---|---|---|---|
| `POST` | `/api/auth/register/` | Register customer account | Public |
| `POST` | `/api/auth/login/` | Obtain JWT access & refresh tokens | Public |
| `POST` | `/api/auth/token/refresh/` | Refresh expired access token | Public |
| `POST` | `/api/auth/logout/` | Blacklist refresh token and logout | Authenticated |
| `POST` | `/api/auth/forgot-password/` | Request password reset token | Public |
| `POST` | `/api/auth/reset-password/` | Reset password using reset token | Public |
| `GET` | `/api/auth/me/` | Fetch current user profile and role | Authenticated |
| `GET` | `/api/admin/staff/` | List all staff members | Admin only |
| `POST` | `/api/admin/staff/` | Create new staff account | Admin only |
| `PATCH` | `/api/admin/staff/<id>/status/` | Activate or deactivate staff account | Admin only |

### Products & Variants (`/api/products/`, `/api/variants/`)
| Method | Endpoint | Description | Clearance |
|---|---|---|---|
| `GET` | `/api/products/` | List products with search and category filters | Authenticated |
| `POST` | `/api/products/` | Create new software product | Admin only |
| `GET` | `/api/products/<id>/` | Get detailed product specifications | Authenticated |
| `PATCH` | `/api/products/<id>/` | Update product details | Admin only |
| `DELETE` | `/api/products/<id>/` | Delete product (protected against in-use items) | Admin only |
| `PATCH` | `/api/products/<id>/status/` | Toggle product status (ACTIVE, DRAFT, ARCHIVED) | Admin only |
| `GET` | `/api/products/<id>/variants/` | List variants belonging to product | Authenticated |
| `POST` | `/api/products/<id>/variants/` | Create variant under product | Admin only |
| `GET` | `/api/variants/<id>/` | Retrieve variant details | Authenticated |
| `PATCH` | `/api/variants/<id>/` | Update variant details | Admin only |
| `DELETE` | `/api/variants/<id>/` | Delete variant | Admin only |
| `PATCH` | `/api/variants/<id>/status/` | Toggle variant active status | Admin only |

### Subscription Plans (`/api/plans/`)
| Method | Endpoint | Description | Clearance |
|---|---|---|---|
| `GET` | `/api/plans/metrics/` | Aggregated plan counts and billing distribution | Admin & Staff |
| `GET` | `/api/plans/` | List paginated plans (supports search, product, interval, status filters) | Admin & Staff |
| `POST` | `/api/plans/` | Create subscription plan with lifecycle policies | Admin only |
| `GET` | `/api/plans/<id>/` | Get comprehensive plan details & history | Admin & Staff |
| `PATCH` | `/api/plans/<id>/` | Update plan details (prohibited on CLOSED plans) | Admin only |
| `DELETE` | `/api/plans/<id>/` | Delete subscription plan | Admin only |
| `POST` | `/api/plans/<id>/pause/` | Temporarily pause plan (stops new subscriptions) | Admin only |
| `POST` | `/api/plans/<id>/resume/` | Resume paused plan back to active status | Admin only |
| `POST` | `/api/plans/<id>/close/` | Permanently close plan (irreversible) | Admin only |
| `POST` | `/api/plans/<id>/activate/` | Activate inactive/draft plan | Admin only |
| `GET` | `/api/plans/<id>/history/` | Audit log of status transitions and reasons | Admin & Staff |

### Quotations & Templates (`/api/quotations/`, `/api/quotation-templates/`)
| Method | Endpoint | Description | Clearance |
|---|---|---|---|
| `GET` | `/api/quotation-templates/` | List reusable quotation templates | Admin & Staff |
| `POST` | `/api/quotation-templates/` | Create template with preconfigured lines | Admin & Staff |
| `GET` | `/api/quotation-templates/<id>/` | Retrieve quotation template details | Admin & Staff |
| `PATCH` | `/api/quotation-templates/<id>/` | Update quotation template | Admin & Staff |
| `DELETE` | `/api/quotation-templates/<id>/` | Delete quotation template | Admin & Staff |
| `GET` | `/api/customers/lookup/` | List active customers for quote selection | Admin & Staff |
| `GET` | `/api/quotations/` | List quotations (Customer role filtered to own) | Authenticated |
| `POST` | `/api/quotations/` | Create customer quotation with snapshot lines | Admin & Staff |
| `GET` | `/api/quotations/<id>/` | Retrieve quotation details and pricing breakdown | Authenticated |
| `POST` | `/api/quotations/<id>/finalize/` | Finalize draft quotation to QUOTATION status | Admin & Staff |
| `POST` | `/api/quotations/<id>/confirm/` | Confirm quotation acceptance | Customer, Staff, Admin |
| `POST` | `/api/quotations/<id>/cancel/` | Cancel quotation | Admin & Staff |
| `GET` | `/api/quotations/<id>/pdf/` | Stream/download ReportLab quotation PDF | Authenticated |
| `POST` | `/api/quotations/<id>/send-email/` | Dispatch PDF proposal via email and log dispatch | Admin & Staff |
| `GET` | `/api/quotations/<id>/history/` | Audit log of quotation status transitions | Authenticated |

### Subscriptions (`/api/subscriptions/`)
| Method | Endpoint | Description | Clearance |
|---|---|---|---|
| `POST` | `/api/subscriptions/convert/<quotation_id>/` | Convert confirmed quotation to subscription | Admin & Staff |
| `GET` | `/api/subscriptions/` | List subscriptions (Customer filtered to own) | Authenticated |
| `GET` | `/api/subscriptions/<id>/` | Retrieve subscription and itemized snapshots | Authenticated |
| `POST` | `/api/subscriptions/<id>/activate/` | Activate confirmed subscription | Admin & Staff |
| `POST` | `/api/subscriptions/<id>/pause/` | Pause active subscription (requires reason) | Admin & Staff |
| `POST` | `/api/subscriptions/<id>/resume/` | Resume paused subscription | Admin & Staff |
| `POST` | `/api/subscriptions/<id>/renew/` | Renew subscription, creating linked contract | Admin & Staff |
| `POST` | `/api/subscriptions/<id>/close/` | Close/terminate subscription contract | Admin & Staff |
| `GET` | `/api/subscriptions/<id>/history/` | Audit trail of subscription status transitions | Authenticated |
| `GET` | `/api/subscriptions/<id>/renewals/` | View subscription renewal chain | Authenticated |

---

## Running the Application

### 1. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # On Windows
# source venv/bin/activate # On Linux/macOS

pip install -r requirements.txt
python manage.py migrate
python manage.py seedusers        # Seeds default admin, staff, and customer accounts
python manage.py seedproducts     # Seeds realistic software products & variants
python manage.py seedplans        # Seeds realistic subscription plans
python manage.py seedquotations   # Seeds quotation templates and sample quotations
python manage.py seedsubscriptions# Seeds active and paused subscriptions
python manage.py runserver
```

Default credentials:
- **Admin:** `admin@brightloop.io` / `BrightloopAdmin2026!`
- **Staff:** `staff@brightloop.io` / `BrightloopStaff2026!`
- **Customer:** `customer@brightloop.io` / `CustomerSecure2026!`

### 2. Celery Worker & Beat (Background Daemon)

```bash
# Terminal 1: Celery Worker
celery -A config worker --loglevel=info

# Terminal 2: Celery Beat (Hourly automated plan closure)
celery -A config beat --loglevel=info
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to access the application.

---


