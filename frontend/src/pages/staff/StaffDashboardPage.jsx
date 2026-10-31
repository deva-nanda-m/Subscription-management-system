import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { RoleBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  Briefcase,
  CreditCard,
  FileText,
  Users,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  ArrowRight,
  Plus,
} from 'lucide-react';

export const StaffDashboardPage = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout
      title="Staff Operations Workspace"
      subtitle="Operational hub for Brightloop customer support, billing operations, and subscription maintenance."
    >
      <div className="space-y-8">
        {/* Welcome Header Card */}
        <div className="p-6 bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full bg-blue-800 text-blue-200">
                Staff Access Level
              </span>
              <RoleBadge role={user?.role} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Hello, {user?.full_name || 'Staff Member'}!
            </h2>
            <p className="text-slate-300 text-sm max-w-xl">
              You are authenticated to the Brightloop Operations Portal. Manage daily subscription workflows, customer inquiries, and invoice generation once integrated.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs space-y-1.5 shrink-0">
            <div className="text-slate-400">Security Clearance:</div>
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Operational Privileges Enforced
            </div>
            <div className="text-slate-400 text-[11px] pt-1 border-t border-slate-700">
              Staff ID: <span className="font-mono text-white">{user?.id}</span>
            </div>
          </div>
        </div>

        {/* Operational Quick Actions (Part 1 Workflow) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader
              title="Quotation Templates"
              subtitle="Reusable standardized software proposal blueprints."
            />
            <CardBody className="space-y-3">
              <p className="text-xs text-slate-600">
                Create and manage template packages with preconfigured product lines, tiers and validity terms.
              </p>
              <Link to="/staff/quotation-templates" className="block">
                <Button variant="secondary" size="sm" icon={Layers} className="w-full">
                  Manage Templates
                </Button>
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Customer Quotations"
              subtitle="Issue customer quotes and convert to contracts."
            />
            <CardBody className="space-y-3">
              <p className="text-xs text-slate-600">
                Generate customer-tailored quotes, preview ReportLab PDFs, email proposals, and execute conversions.
              </p>
              <div className="flex gap-2">
                <Link to="/staff/quotations" className="flex-1">
                  <Button variant="secondary" size="sm" icon={FileText} className="w-full">
                    View Quotes
                  </Button>
                </Link>
                <Link to="/staff/quotations/new">
                  <Button variant="primary" size="sm" icon={Plus}>
                    New Quote
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Subscription Contracts"
              subtitle="Manage active customer recurring licenses."
            />
            <CardBody className="space-y-3">
              <p className="text-xs text-slate-600">
                Monitor recurring commitments, track operational pause/resume events, and issue renewals.
              </p>
              <Link to="/staff/subscriptions" className="block">
                <Button variant="secondary" size="sm" icon={CreditCard} className="w-full">
                  Browse Subscriptions
                </Button>
              </Link>
            </CardBody>
          </Card>
        </div>

        {/* Permission Boundary Notice (Explicitly required by spec) */}
        <Card className="border-l-4 border-l-blue-600">
          <CardHeader
            title="Operational Role Permissions & Boundaries"
            subtitle="Under Brightloop security policy, staff access is strictly restricted by backend permissions."
          />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-2">
                <h4 className="text-sm font-semibold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Permitted Staff Operations
                </h4>
                <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                  <li>View customer subscription statuses and renewals (Module 4)</li>
                  <li>Review generated quotations and invoice receipts (Module 6)</li>
                  <li>Support customer payment verification inquiries (Module 7)</li>
                  <li>Access operational analytics and fulfillment queues</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-100 space-y-2">
                <h4 className="text-sm font-semibold text-rose-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Restricted Administrative Actions
                </h4>
                <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                  <li>Cannot provision or create other staff accounts</li>
                  <li>Cannot modify or deactivate admin accounts</li>
                  <li>Cannot access root system configuration endpoints</li>
                  <li>Protected by backend 403 Forbidden enforcement</li>
                </ul>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StaffDashboardPage;

