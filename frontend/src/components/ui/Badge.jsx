import React from 'react';
import { ShieldCheck, UserCheck, User, CheckCircle2, XCircle } from 'lucide-react';

export const Badge = ({ children, variant = 'default', size = 'sm', className = '' }) => {
  const variants = {
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
    staff: 'bg-blue-100 text-blue-800 border-blue-200',
    customer: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    inactive: 'bg-slate-100 text-slate-600 border-slate-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    default: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const sizes = {
    xs: 'text-[10px] px-2 py-0.5 font-medium',
    sm: 'text-xs px-2.5 py-1 font-medium',
    md: 'text-sm px-3 py-1.5 font-medium',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border ${variants[variant] || variants.default} ${sizes[size] || sizes.sm} ${className}`}>
      {children}
    </span>
  );
};

export const RoleBadge = ({ role }) => {
  const normalized = (role || '').toUpperCase();
  if (normalized === 'ADMIN') {
    return (
      <Badge variant="admin">
        <ShieldCheck className="w-3 h-3" />
        Admin
      </Badge>
    );
  }
  if (normalized === 'STAFF') {
    return (
      <Badge variant="staff">
        <UserCheck className="w-3 h-3" />
        Staff
      </Badge>
    );
  }
  return (
    <Badge variant="customer">
      <User className="w-3 h-3" />
      Customer
    </Badge>
  );
};

export const StatusBadge = ({ isActive }) => {
  if (isActive) {
    return (
      <Badge variant="active">
        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
        Active
      </Badge>
    );
  }
  return (
    <Badge variant="inactive">
      <XCircle className="w-3 h-3 text-slate-400" />
      Inactive
    </Badge>
  );
};

export default Badge;

