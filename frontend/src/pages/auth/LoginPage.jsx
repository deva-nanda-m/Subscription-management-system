import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../layouts/AuthLayout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { Mail, Lock, LogIn, Sparkles } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(location.state?.message || '');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errorMessage) setErrorMessage('');
  };

  const redirectByRole = (role) => {
    switch (role) {
      case 'ADMIN':
        navigate('/admin/dashboard', { replace: true });
        break;
      case 'STAFF':
        navigate('/staff/dashboard', { replace: true });
        break;
      case 'CUSTOMER':
      default:
        navigate('/customer/dashboard', { replace: true });
        break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.password) {
      setErrorMessage('Please provide both your email address and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const response = await login(formData.email, formData.password, formData.rememberMe);
      const user = response.user;
      redirectByRole(user.role);
    } catch (err) {
      const serverDetail = err.response?.data?.detail;
      const serverMessage = err.response?.data?.message;

      if (serverDetail) {
        setErrorMessage(serverDetail);
      } else if (serverMessage) {
        setErrorMessage(serverMessage);
      } else if (err.response?.status === 401) {
        setErrorMessage('Invalid email or password. Please verify your credentials.');
      } else if (err.response?.status === 429) {
        setErrorMessage('Too many login attempts. Please wait a minute and try again.');
      } else {
        setErrorMessage('Unable to connect to the authentication server. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Demo credential fill helper for convenience
  const fillDemo = (email, password) => {
    setFormData({
      email,
      password,
      rememberMe: false,
    });
    setErrorMessage('');
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your Brightloop account to manage your subscriptions and operations."
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {errorMessage && (
          <Alert variant="danger" onClose={() => setErrorMessage('')}>
            {errorMessage}
          </Alert>
        )}

        {successMessage && (
          <Alert variant="success" onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}

        <Input
          label="Email address"
          name="email"
          type="email"
          icon={Mail}
          placeholder="name@company.com"
          value={formData.email}
          onChange={handleChange}
          required
          autoComplete="email"
        />

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="block text-sm font-medium text-slate-700">Password</span>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            name="password"
            type="password"
            icon={Lock}
            placeholder="••••••••••••"
            value={formData.password}
            onChange={handleChange}
            required
            autoComplete="current-password"
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
              className="w-4 h-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-slate-600 text-xs sm:text-sm">Remember me for 30 days</span>
          </label>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={loading}
          icon={LogIn}
        >
          Sign In
        </Button>

        {/* Demo Fast Fill Pill */}
        <div className="pt-4 border-t border-slate-100">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            Quick Demo Credentials:
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillDemo('admin@brightloop.com', 'Admin@Brightloop2026!')}
              className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
            >
              Admin Demo
            </button>
            <button
              type="button"
              onClick={() => fillDemo('staff@brightloop.test', 'StaffPassword123!')}
              className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
            >
              Staff Demo
            </button>
            <button
              type="button"
              onClick={() => fillDemo('customer1@brightloop.test', 'CustomerPassword123!')}
              className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
            >
              Customer Demo
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 pt-2">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Register as Customer
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;

