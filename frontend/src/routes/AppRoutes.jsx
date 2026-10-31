import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

// Auth Pages
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';

// Role Dashboards
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import StaffManagementPage from '../pages/admin/StaffManagementPage';
import ProductListPage from '../pages/admin/ProductListPage';
import ProductDetailPage from '../pages/admin/ProductDetailPage';
import PlanListPage from '../pages/admin/PlanListPage';
import CreatePlanPage from '../pages/admin/CreatePlanPage';
import PlanDetailPage from '../pages/admin/PlanDetailPage';
import EditPlanPage from '../pages/admin/EditPlanPage';

import StaffDashboardPage from '../pages/staff/StaffDashboardPage';
import StaffProductCatalogPage from '../pages/staff/StaffProductCatalogPage';
import StaffPlanListPage from '../pages/staff/StaffPlanListPage';

// Quotation and Subscription Pages
import QuotationTemplateListPage from '../pages/admin/QuotationTemplateListPage';
import CreateQuotationTemplatePage from '../pages/admin/CreateQuotationTemplatePage';
import QuotationListPage from '../pages/admin/QuotationListPage';
import CreateQuotationPage from '../pages/admin/CreateQuotationPage';
import QuotationDetailPage from '../pages/admin/QuotationDetailPage';
import SubscriptionListPage from '../pages/admin/SubscriptionListPage';
import SubscriptionDetailPage from '../pages/admin/SubscriptionDetailPage';

import CustomerDashboardPage from '../pages/customer/CustomerDashboardPage';
import CustomerProductCatalogPage from '../pages/customer/CustomerProductCatalogPage';
import CustomerQuotationListPage from '../pages/customer/CustomerQuotationListPage';
import CustomerSubscriptionListPage from '../pages/customer/CustomerSubscriptionListPage';

// Part 2: Tax, Discount, Invoices, Payments, Reports Pages
import TaxManagementPage from '../pages/admin/TaxManagementPage';
import DiscountManagementPage from '../pages/admin/DiscountManagementPage';
import InvoiceListPage from '../pages/admin/InvoiceListPage';
import CreateInvoicePage from '../pages/admin/CreateInvoicePage';
import InvoiceDetailPage from '../pages/admin/InvoiceDetailPage';
import OverdueInvoicesPage from '../pages/admin/OverdueInvoicesPage';
import PaymentListPage from '../pages/admin/PaymentListPage';
import RecordPaymentPage from '../pages/admin/RecordPaymentPage';
import FinancialDashboardPage from '../pages/admin/FinancialDashboardPage';

import CustomerInvoiceListPage from '../pages/customer/CustomerInvoiceListPage';
import CustomerInvoiceDetailPage from '../pages/customer/CustomerInvoiceDetailPage';

// Root index redirector
const RootRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (user?.role === 'STAFF') {
    return <Navigate to="/staff/dashboard" replace />;
  }
  return <Navigate to="/customer/dashboard" replace />;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public Authentication Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Admin-only Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/staff"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <StaffManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <ProductListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <ProductDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/plans"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <PlanListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/plans/new"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <CreatePlanPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/plans/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <PlanDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/plans/:id/edit"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <EditPlanPage />
          </ProtectedRoute>
        }
      />

      {/* Quotation & Subscription Management (Admin) */}
      <Route
        path="/admin/quotation-templates"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
            <QuotationTemplateListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/quotation-templates/new"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
            <CreateQuotationTemplatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/quotations"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
            <QuotationListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/quotations/new"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
            <CreateQuotationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/quotations/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
            <QuotationDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/subscriptions"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
            <SubscriptionListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/subscriptions/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
            <SubscriptionDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Part 2: Tax, Discount, Invoice, Payment & Reports (Admin) */}
      <Route
        path="/admin/taxes"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <TaxManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/discounts"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <DiscountManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/invoices"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
            <InvoiceListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/invoices/new"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
            <CreateInvoicePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/invoices/overdue"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
            <OverdueInvoicesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/invoices/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
            <InvoiceDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
            <PaymentListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/payments/record"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
            <RecordPaymentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <FinancialDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Staff Routes */}
      <Route
        path="/staff/dashboard"
        element={
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
            <StaffDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/products"
        element={
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
            <StaffProductCatalogPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/plans"
        element={
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
            <StaffPlanListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/quotation-templates"
        element={
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
            <QuotationTemplateListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/quotation-templates/new"
        element={
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
            <CreateQuotationTemplatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/quotations"
        element={
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
            <QuotationListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/quotations/new"
        element={
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
            <CreateQuotationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/quotations/:id"
        element={
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
            <QuotationDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/subscriptions"
        element={
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
            <SubscriptionListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/subscriptions/:id"
        element={
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
            <SubscriptionDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Part 2: Tax, Discount, Invoice, Payment (Staff) */}
      <Route
        path="/staff/taxes"
        element={
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
            <TaxManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/discounts"
        element={
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
            <DiscountManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/invoices"
        element={
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
            <InvoiceListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/invoices/new"
        element={
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
            <CreateInvoicePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/invoices/overdue"
        element={
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
            <OverdueInvoicesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/invoices/:id"
        element={
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
            <InvoiceDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/payments"
        element={
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
            <PaymentListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/payments/record"
        element={
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
            <RecordPaymentPage />
          </ProtectedRoute>
        }
      />

      {/* Customer Routes */}
      <Route
        path="/customer/dashboard"
        element={
          <ProtectedRoute allowedRoles={['CUSTOMER']}>
            <CustomerDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/products"
        element={
          <ProtectedRoute allowedRoles={['CUSTOMER']}>
            <CustomerProductCatalogPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/quotations"
        element={
          <ProtectedRoute allowedRoles={['CUSTOMER']}>
            <CustomerQuotationListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/subscriptions"
        element={
          <ProtectedRoute allowedRoles={['CUSTOMER']}>
            <CustomerSubscriptionListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/invoices"
        element={
          <ProtectedRoute allowedRoles={['CUSTOMER']}>
            <CustomerInvoiceListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/invoices/:id"
        element={
          <ProtectedRoute allowedRoles={['CUSTOMER']}>
            <CustomerInvoiceDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Catch-all 404 */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
            <h1 className="text-6xl font-black text-slate-300">404</h1>
            <h2 className="text-xl font-bold text-slate-800 mt-2">Page Not Found</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              The page you are looking for does not exist in the Brightloop directory.
            </p>
            <a
              href="/"
              className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
            >
              Return to Home
            </a>
          </div>
        }
      />
    </Routes>
  );
};

export default AppRoutes;

