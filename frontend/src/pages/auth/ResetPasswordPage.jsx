import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import authService from '../../services/authService';
import AuthLayout from '../../layouts/AuthLayout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import PasswordStrengthMeter, { checkPasswordRules } from '../../components/PasswordStrengthMeter';
import { Lock, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const isInvalidLink = !token || !email;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isInvalidLink) {
      setError('Invalid password reset link. Please request a new link.');
      return;
    }

    const rules = checkPasswordRules(password);
    if (!rules.length || !rules.uppercase || !rules.lowercase || !rules.special) {
      setError('Password must meet all complexity requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.resetPassword({
        email,
        token,
        password,
        confirm_password: confirmPassword,
      });

      setIsSuccess(true);
    } catch (err) {
      const serverMessage = err.response?.data?.message || err.response?.data?.detail;
      if (serverMessage) {
        setError(serverMessage);
      } else {
        setError('Failed to reset password. The link may have expired or already been used.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (isInvalidLink) {
    return (
      <AuthLayout title="Invalid Recovery Link" subtitle="This password reset link is invalid or incomplete.">
        <div className="text-center py-6 space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Missing Token or Email</h3>
          <p className="text-sm text-slate-500">
            The link you clicked does not contain the required security verification tokens.
          </p>
          <div className="pt-2">
            <Link to="/forgot-password">
              <Button variant="primary" className="w-full">
                Request a new link
              </Button>
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (isSuccess) {
    return (
      <AuthLayout title="Password Reset Successful" subtitle="Your password has been securely updated.">
        <div className="text-center py-6 space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">All Set!</h3>
          <p className="text-sm text-slate-500">
            Your credentials have been updated in the Brightloop directory. You may now sign in with your new password.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => navigate('/login', { state: { message: 'Password reset successful. Please sign in.' } })}
            >
              Sign In Now
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create new password"
      subtitle={`Choose a strong password for your account: ${email}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <Alert variant="danger" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <div>
          <Input
            label="New password"
            name="password"
            type="password"
            icon={Lock}
            placeholder="At least 9 characters"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError('');
            }}
            required
            autoComplete="new-password"
          />

          {password && (
            <PasswordStrengthMeter
              password={password}
              confirmPassword={confirmPassword}
              showConfirmMatch={false}
            />
          )}
        </div>

        <Input
          label="Confirm new password"
          name="confirm_password"
          type="password"
          icon={Lock}
          placeholder="Repeat your new password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (error) setError('');
          }}
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
          >
            Update Password
          </Button>
        </div>

        <div className="text-center pt-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;

