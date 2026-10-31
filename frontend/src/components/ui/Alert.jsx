import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export const Alert = ({
  variant = 'info',
  title,
  children,
  onClose,
  className = '',
}) => {
  const styles = {
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-900',
      icon: Info,
      iconColor: 'text-blue-500',
    },
    success: {
      container: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: CheckCircle2,
      iconColor: 'text-emerald-500',
    },
    warning: {
      container: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
    },
    danger: {
      container: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: AlertCircle,
      iconColor: 'text-rose-500',
    },
    error: {
      container: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: AlertCircle,
      iconColor: 'text-rose-500',
    },
  };

  const current = styles[variant] || styles.info;
  const IconComponent = current.icon;

  return (
    <div className={`p-4 rounded-lg border flex items-start gap-3 transition-all ${current.container} ${className}`}>
      <IconComponent className={`w-5 h-5 mt-0.5 shrink-0 ${current.iconColor}`} />
      <div className="flex-1 text-sm">
        {title && <h4 className="font-semibold mb-0.5">{title}</h4>}
        <div className="leading-relaxed">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Alert;

