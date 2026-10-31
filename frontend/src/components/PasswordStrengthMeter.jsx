import React from 'react';
import { Check, X } from 'lucide-react';

export const checkPasswordRules = (password = '') => {
  return {
    length: password.length > 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
};

export const PasswordStrengthMeter = ({ password = '', confirmPassword, showConfirmMatch = false }) => {
  const rules = checkPasswordRules(password);
  const metCount = Object.values(rules).filter(Boolean).length;

  const strengthColor = () => {
    if (metCount === 0) return 'bg-slate-200';
    if (metCount === 1) return 'bg-rose-500';
    if (metCount === 2) return 'bg-amber-500';
    if (metCount === 3) return 'bg-blue-500';
    return 'bg-emerald-500';
  };

  const strengthLabel = () => {
    if (metCount === 0) return 'Enter a password';
    if (metCount <= 2) return 'Weak';
    if (metCount === 3) return 'Good';
    return 'Strong & compliant';
  };

  const isMatching = confirmPassword !== undefined && confirmPassword.length > 0 && password === confirmPassword;

  return (
    <div className="mt-2 space-y-2">
      {/* Progress Bar */}
      <div>
        <div className="flex justify-between items-center text-xs mb-1">
          <span className="text-slate-500">Password strength:</span>
          <span className="font-medium text-slate-700">{strengthLabel()}</span>
        </div>
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex gap-1">
          <div
            className={`h-full transition-all duration-300 ${strengthColor()}`}
            style={{ width: `${(metCount / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Rules Checklist */}
      <ul className="text-xs space-y-1 pt-1">
        <li className={`flex items-center gap-1.5 ${rules.length ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
          {rules.length ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center shrink-0" />}
          More than 8 characters (at least 9)
        </li>
        <li className={`flex items-center gap-1.5 ${rules.uppercase ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
          {rules.uppercase ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center shrink-0" />}
          At least one uppercase letter (A-Z)
        </li>
        <li className={`flex items-center gap-1.5 ${rules.lowercase ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
          {rules.lowercase ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center shrink-0" />}
          At least one lowercase letter (a-z)
        </li>
        <li className={`flex items-center gap-1.5 ${rules.special ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
          {rules.special ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center shrink-0" />}
          At least one special character (!@#$%^&*)
        </li>
        {showConfirmMatch && confirmPassword !== undefined && (
          <li className={`flex items-center gap-1.5 ${isMatching ? 'text-emerald-700 font-medium' : confirmPassword ? 'text-rose-600' : 'text-slate-400'}`}>
            {isMatching ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : confirmPassword ? (
              <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center shrink-0" />
            )}
            Passwords match
          </li>
        )}
      </ul>
    </div>
  );
};

export default PasswordStrengthMeter;

