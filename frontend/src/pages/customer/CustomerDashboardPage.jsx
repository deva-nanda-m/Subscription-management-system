import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { RoleBadge, StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  User,
  CreditCard,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  Lock,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const CustomerDashboardPage = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout
      title="Customer Portal"
      subtitle="Welcome to your personal subscription management dashboard."
    >
      <div className="space-y-8">
        {/* Customer Welcome Hero */}
        <div className="p-6 sm:p-8 bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Customer Workspace
                </span>
                <RoleBadge role={user?.role} />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight">
                Welcome, {user?.full_name || 'Valued Customer'}!
              </h2>
              <p className="text-slate-300 text-sm max-w-xl">
                This is your dedicated Brightloop portal. You have complete autonomy over your active recurring subscriptions, billing plans, and digital invoice records.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs space-y-1.5 shrink-0">
              <div className="text-slate-400">Account Verified:</div>
              <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Customer ID: <span className="font-mono text-white">BL-CUST-{user?.id}</span>
              </div>
              <div className="text-slate-400 text-[11px] pt-1 border-t border-slate-700">
                Primary Email: <span className="text-slate-200">{user?.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Customer Modules (Part 1 Workflow) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quotations Card */}
          <Card>
            <CardHeader
              title="My Software Quotations"
              subtitle="View proposals, download ReportLab PDFs, and accept terms."
              action={
                <Link to="/customer/quotations">
                  <Button variant="primary" size="sm" icon={FileText}>
                    View Proposals
                  </Button>
                </Link>
              }
            />
            <CardBody className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Quotation Approval & Sign-off</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Review software packages, pricing discounts, and commercial terms prepared by Brightloop staff. Accept quotations to immediately initiate subscription contracts.
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Isolated strictly to your customer ID — completely invisible to other customers.</span>
              </div>
            </CardBody>
          </Card>

          {/* Subscriptions Card */}
          <Card>
            <CardHeader
              title="My Subscriptions"
              subtitle="View and manage active recurring plans and renewal schedules."
              action={
                <Link to="/customer/subscriptions">
                  <Button variant="primary" size="sm" icon={CreditCard}>
                    Manage Plans
                  </Button>
                </Link>
              }
            />
            <CardBody className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-100 text-indigo-600 shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Subscription Lifecycle Engine</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Track recurring billing cycles, check service activation status, and verify scheduled next billing dates for all active licenses.
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Active automated renewal handling and service entitlement.</span>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Security & Isolation Summary */}
        <Card className="border-l-4 border-l-emerald-600">
          <CardHeader
            title="Privacy & Role Isolation Architecture"
            subtitle="Brightloop Software guarantees complete data segregation between customers."
          />
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block font-medium">Account Boundary</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">Isolated Customer Role</span>
                <p className="text-[11px] text-slate-500 mt-1">Cannot access administrative or operational staff portals.</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block font-medium">Token Security</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">JWT Refresh Rotation</span>
                <p className="text-[11px] text-slate-500 mt-1">Protected against token hijacking with automatic blacklisting.</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block font-medium">Password Standard</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">Strict Complexity</span>
                <p className="text-[11px] text-slate-500 mt-1">Hashed with PBKDF2/SHA256 password hashers.</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CustomerDashboardPage;

