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
import StaffDashboardPage from '../pages/staff/StaffDashboardPage';
import CustomerDashboardPage from '../pages/customer/CustomerDashboardPage';

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

      {/* Staff Routes */}
      <Route
        path="/staff/dashboard"
        element={
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
            <StaffDashboardPage />
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

