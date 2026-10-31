import React from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { RoleBadge } from '../../components/ui/Badge';
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

        {/* Operational Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card>
            <CardBody className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Subscriptions</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">Ready for M4</p>
                <p className="text-xs text-slate-500 mt-1">Lifecycle monitoring</p>
              </div>
              <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Invoices Pending</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">Ready for M6</p>
                <p className="text-xs text-slate-500 mt-1">Billing cycle engine</p>
              </div>
              <div className="w-11 h-11 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Customer Directory</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">Active</p>
                <p className="text-xs text-slate-500 mt-1">View verified accounts</p>
              </div>
              <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">System Uptime</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">99.98%</p>
                <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>All services nominal</span>
                </p>
              </div>
              <div className="w-11 h-11 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
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

