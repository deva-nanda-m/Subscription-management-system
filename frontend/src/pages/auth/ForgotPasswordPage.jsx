import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../../services/authService';
import AuthLayout from '../../layouts/AuthLayout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { Mail, ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your registered email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err) {
      // Even on error, do not leak internal failure if possible
      setError('Unable to process password reset request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email associated with your Brightloop account to receive a secure recovery link."
    >
      {submitted ? (
        <div className="text-center py-4 space-y-4">
          <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <h3 className="text-lg font-bold text-slate-900">Check your inbox</h3>

          <p className="text-sm text-slate-600 leading-relaxed">
            If an account with <span className="font-semibold text-slate-900">{email}</span> exists in our system, you will receive an email shortly with instructions to reset your password.
          </p>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-start gap-2 text-left">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              For local development, email messages are printed to the Django backend terminal console.
            </span>
          </div>

          <div className="pt-4 flex flex-col gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setSubmitted(false);
                setEmail('');
              }}
              className="w-full"
            >
              Try another email
            </Button>
            <Link
              to="/login"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center justify-center gap-1 mt-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Login
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {error && (
            <Alert variant="danger" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Input
            label="Registered email address"
            name="email"
            type="email"
            icon={Mail}
            placeholder="you@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            required
            autoComplete="email"
            helperText="We will send a cryptographically verified, time-limited reset link."
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={loading}
          >
            Send Recovery Link
          </Button>

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
      )}
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
