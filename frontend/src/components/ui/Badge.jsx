import React from 'react';
import { ShieldCheck, UserCheck, User, CheckCircle2, XCircle, PauseCircle, Lock, AlertCircle, Calendar } from 'lucide-react';

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

export const ProductStatusBadge = ({ status }) => {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'ACTIVE') {
    return <Badge variant="active">Active</Badge>;
  }
  if (normalized === 'DRAFT') {
    return <Badge variant="warning">Draft</Badge>;
  }
  if (normalized === 'ARCHIVED') {
    return <Badge variant="danger">Archived</Badge>;
  }
  return <Badge variant="inactive">Inactive</Badge>;
};

export const ProductCategoryBadge = ({ category }) => {
  const normalized = (category || '').toUpperCase();
  const styles = {
    SOFTWARE: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    SERVICE: 'bg-amber-50 text-amber-700 border-amber-200',
    STORAGE: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    ADDON: 'bg-purple-50 text-purple-700 border-purple-200',
    API: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  const labels = {
    SOFTWARE: 'SaaS Platform',
    SERVICE: 'Service',
    STORAGE: 'Storage',
    ADDON: 'Add-on',
    API: 'API',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${styles[normalized] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {labels[normalized] || category}
    </span>
  );
};

export const BillingTypeBadge = ({ type }) => {
  const normalized = (type || '').toUpperCase();
  if (normalized === 'RECURRING') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        Recurring
      </span>
    );
  }
  if (normalized === 'ONE_TIME') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        One-Time
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
      Metered
    </span>
  );
};

export const PlanStatusBadge = ({ status }) => {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        Active
      </span>
    );
  }
  if (normalized === 'PAUSED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <PauseCircle className="w-3 h-3 text-amber-600" />
        Paused
      </span>
    );
  }
  if (normalized === 'CLOSED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
        <Lock className="w-3 h-3 text-slate-400" />
        Closed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
      <AlertCircle className="w-3 h-3 text-rose-500" />
      Inactive
    </span>
  );
};

export const BillingIntervalBadge = ({ interval }) => {
  const normalized = (interval || '').toUpperCase();
  const styles = {
    DAILY: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    WEEKLY: 'bg-blue-50 text-blue-700 border-blue-200',
    MONTHLY: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    YEARLY: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  const labels = {
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    MONTHLY: 'Monthly',
    YEARLY: 'Yearly',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${styles[normalized] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {labels[normalized] || interval}
    </span>
  );
};

export const AvailabilityBadge = ({ isCurrentlyAvailable, availabilityDisplay }) => {
  if (isCurrentlyAvailable) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        {availabilityDisplay || 'Available'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
      <Calendar className="w-3 h-3 text-slate-400" />
      {availabilityDisplay || 'Unavailable'}
    </span>
  );
};

export default Badge;


