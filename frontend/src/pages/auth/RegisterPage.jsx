import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../layouts/AuthLayout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import PasswordStrengthMeter, { checkPasswordRules } from '../../components/PasswordStrengthMeter';
import { User, Mail, Lock, UserPlus, CheckCircle } from 'lucide-react';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear specific field error
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) setServerError('');
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please provide a valid email address.';
    }

    const rules = checkPasswordRules(formData.password);
    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (!rules.length || !rules.uppercase || !rules.lowercase || !rules.special) {
      newErrors.password = 'Password must meet all complexity requirements listed below.';
    }

    if (!formData.confirm_password) {
      newErrors.confirm_password = 'Confirm password is required.';
    } else if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setServerError('');

    try {
      await register({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirm_password: formData.confirm_password,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login', {
          state: { message: 'Registration successful! Please sign in with your credentials.' },
        });
      }, 2000);
    } catch (err) {
      const responseData = err.response?.data;
      if (responseData) {
        if (typeof responseData === 'object') {
          // If serializer returned field-specific errors
          const fieldErrors = {};
          for (const [key, val] of Object.entries(responseData)) {
            if (Array.isArray(val)) {
              fieldErrors[key] = val.join(' ');
            } else if (typeof val === 'string') {
              fieldErrors[key] = val;
            }
          }
          setErrors(fieldErrors);

          if (responseData.non_field_errors) {
            setServerError(
              Array.isArray(responseData.non_field_errors)
                ? responseData.non_field_errors.join(' ')
                : responseData.non_field_errors
            );
          } else if (responseData.message) {
            setServerError(responseData.message);
          }
        } else {
          setServerError('An unexpected error occurred during registration.');
        }
      } else {
        setServerError('Unable to connect to server. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Account Created" subtitle="Your Customer portal account is ready.">
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Registration Complete!</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Welcome to Brightloop Software. Your customer account has been created with role-based access. Redirecting you to login...
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/login')}
              className="w-full"
            >
              Go to Login Now
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create customer account"
      subtitle="Register to subscribe to Brightloop services and manage your billing portal."
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {serverError && (
          <Alert variant="danger" onClose={() => setServerError('')}>
            {serverError}
          </Alert>
        )}

        <Input
          label="Full name"
          name="full_name"
          icon={User}
          placeholder="Jane Doe"
          value={formData.full_name}
          onChange={handleChange}
          error={errors.full_name}
          required
          autoComplete="name"
        />

        <Input
          label="Email address"
          name="email"
          type="email"
          icon={Mail}
          placeholder="jane@company.com"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          required
          autoComplete="email"
        />

        <div>
          <Input
            label="Password"
            name="password"
            type="password"
            icon={Lock}
            placeholder="At least 9 characters"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            required
            autoComplete="new-password"
          />

          {formData.password && (
            <PasswordStrengthMeter
              password={formData.password}
              confirmPassword={formData.confirm_password}
              showConfirmMatch={false}
            />
          )}
        </div>

        <Input
          label="Confirm password"
          name="confirm_password"
          type="password"
          icon={Lock}
          placeholder="Repeat your password"
          value={formData.confirm_password}
          onChange={handleChange}
          error={errors.confirm_password}
          required
          autoComplete="new-password"
        />

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={loading}
            icon={UserPlus}
          >
            Create Customer Account
          </Button>
        </div>

        <p className="text-center text-xs text-slate-500 pt-3">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Sign In here
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;

