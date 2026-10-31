# Brightloop Software – Subscription Management System

A production-grade, enterprise-scale subscription management platform designed to automate software product subscriptions, recurring billing cycles, invoice generation, and lifecycle governance.

---
## Features

- **User Management:** Role-based access for Admin, Staff, and Customers.
- **Product Management:** Create products, variants, and pricing.
- **Subscription Plans:** Manage daily, weekly, monthly, and yearly plans.
- **Subscription Management:** Create, renew, pause, and close subscriptions.
- **Automated Billing:** Generate invoices based on subscription cycles.
- **Discount Management:** Apply fixed and percentage-based discounts.
- **Payment Tracking:** Monitor payments and outstanding invoices.
- **Dashboard & Reports:** View revenue, active subscriptions, and overdue invoices.

## Tech Stack

- **Frontend:** React.js, Tailwind CSS
- **Backend:** Python, Django REST Framework
- **Database:** PostgreSQL
- **Task Scheduling:** Celery, Redis
- **Payment Gateway:** Razorpay
- **Tools:** Git, GitHub, Postman


## User Roles

- **Admin:** Manage users, products, plans, taxes, and discounts.
- **Staff:** Handle customers, subscriptions, invoices, and payments.
- **Customer:** View and manage personal subscriptions and invoices.

## Architecture & Technology Stack

- **Frontend:** React 19, Tailwind CSS, React Router DOM, Axios, Lucide React
- **Backend:** Python 3.12, Django 5.x, Django REST Framework, SimpleJWT
- **Background Tasks & Scheduling:** Celery, Redis
- **Database:** PostgreSQL (with Django ORM)
- **API Documentation & Testing:** Postman (`postman/Brightloop_Subscription_Management_API.postman_collection.json`)

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
python manage.py seedtaxes        # Seeds statutory GST tax rules and discount campaigns
python manage.py seedinvoices     # Seeds sample cycle invoices and payment receipts
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


