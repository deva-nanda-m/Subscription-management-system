import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, ShieldCheck, Zap, RefreshCw } from 'lucide-react';

export const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center">
      <div className="flex min-h-screen">
        {/* Left Branding Panel (Hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white flex-col justify-between p-12 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Brand Header */}
          <div className="relative z-10">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-white">Brightloop</span>
                <span className="text-xs text-slate-400 font-medium -mt-1">Subscription Management System</span>
              </div>
            </Link>
          </div>

          {/* Hero Content */}
          <div className="relative z-10 max-w-lg space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-indigo-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Enterprise-Grade Role Security & JWT Authentication</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
              Modular recurring billing built for high-growth SaaS.
            </h1>

            <p className="text-slate-300 text-base leading-relaxed">
              Brightloop provides automated recurring subscriptions, quotation workflows, tax management, and transparent invoice generation with strict role-based access control.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-slate-800 text-indigo-400 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Automated Cycles</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Daily, weekly, monthly and yearly renewals.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-slate-800 text-cyan-400 shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Role Governance</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Admin, Staff & Customer boundary enforcement.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="relative z-10 text-xs text-slate-500 flex items-center justify-between">
            <span>© 2026 Brightloop Software Inc. All rights reserved.</span>
            <span>Module 1: Authentication Engine</span>
          </div>
        </div>

        {/* Right Form Container */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md space-y-8">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center shadow-md">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">Brightloop Software</span>
            </div>

            {/* Header Titles */}
            {(title || subtitle) && (
              <div className="text-center sm:text-left">
                {title && <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>}
                {subtitle && <p className="mt-2 text-sm text-slate-600">{subtitle}</p>}
              </div>
            )}

            {/* Card Content */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;

