import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { RoleBadge, StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import authService from '../../services/authService';
import {
  Users,
  UserCheck,
  ShieldCheck,
  Layers,
  ArrowRight,
  UserPlus,
  Activity,
  CreditCard,
  Package,
  Calendar,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export const AdminDashboardPage = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const staff = await authService.getStaffList();
        setStaffList(staff);
      } catch (err) {
        console.error('Failed to load admin stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const activeStaffCount = staffList.filter((s) => s.is_active).length;

  return (
    <DashboardLayout
      title="Admin Command Center"
      subtitle="Brightloop Software — System administration and staff governance."
    >
      <div className="space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="border-l-4 border-l-indigo-600">
            <CardBody className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Staff Team</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : staffList.length}</p>
                <p className="text-xs text-indigo-600 font-medium mt-1 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{activeStaffCount} active operational accounts</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-cyan-600">
            <CardBody className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Access Control</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">RBAC Enforced</p>
                <p className="text-xs text-cyan-600 font-medium mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin, Staff & Customer</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-emerald-600">
            <CardBody className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Authentication</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">JWT Active</p>
                <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Blacklist rotation enabled</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Activity className="w-6 h-6" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-purple-600">
            <CardBody className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Module Status</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">Module 1 Live</p>
                <p className="text-xs text-purple-600 font-medium mt-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>7 future modules scheduled</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Layers className="w-6 h-6" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Quick Governance Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader
              title="Staff Management"
              subtitle="Provision and govern Brightloop operational staff accounts."
              action={
                <Link to="/admin/staff">
                  <Button variant="primary" size="sm" icon={UserPlus}>
                    Manage Staff
                  </Button>
                </Link>
              }
            />
            <CardBody>
              <p className="text-sm text-slate-600 mb-4">
                Administrators can create staff credentials, monitor account status, and instantly activate or deactivate access to the operational dashboard.
              </p>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-slate-700">
                    {activeStaffCount} of {staffList.length} staff accounts currently active
                  </span>
                </div>
                <Link
                  to="/admin/staff"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  View Directory <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Brightloop Roadmap"
              subtitle="Module 1 authentication engine connects to upcoming modules."
            />
            <CardBody className="space-y-3">
              <Link
                to="/admin/products"
                className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100 hover:bg-indigo-50 text-xs transition-colors"
              >
                <div className="flex items-center gap-2 font-medium text-slate-900">
                  <Package className="w-4 h-4 text-indigo-600" />
                  <span>Module 2: Product & Variant Management</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Active
                </span>
              </Link>

              <Link
                to="/admin/plans"
                className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100 hover:bg-indigo-50 text-xs transition-colors"
              >
                <div className="flex items-center gap-2 font-medium text-slate-900">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span>Module 3: Subscription Plans (Cycles & Pricing)</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Active
                </span>
              </Link>

              <Link
                to="/admin/quotation-templates"
                className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100 hover:bg-indigo-50 text-xs transition-colors"
              >
                <div className="flex items-center gap-2 font-medium text-slate-900">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Part 1: Quotation Templates & Proposals</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Active
                </span>
              </Link>

              <Link
                to="/admin/quotations"
                className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100 hover:bg-indigo-50 text-xs transition-colors"
              >
                <div className="flex items-center gap-2 font-medium text-slate-900">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <span>Part 1: Quotations & PDF Generation</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Active
                </span>
              </Link>

              <Link
                to="/admin/subscriptions"
                className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100 hover:bg-indigo-50 text-xs transition-colors"
              >
                <div className="flex items-center gap-2 font-medium text-slate-900">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Part 1: Subscriptions Lifecycle Engine</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Active
                </span>
              </Link>
            </CardBody>
          </Card>
        </div>

        {/* Recent Staff Members Preview */}
        <Card>
          <CardHeader
            title="Operational Staff Team"
            subtitle="Recent staff accounts registered under Brightloop."
            action={
              <Link to="/admin/staff">
                <Button variant="outline" size="sm">
                  View All Staff
                </Button>
              </Link>
            }
          />
          <CardBody className="p-0">
            {loading ? (
              <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading staff directory...</span>
              </div>
            ) : staffList.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-500 mb-3">No staff accounts created yet.</p>
                <Link to="/admin/staff">
                  <Button variant="primary" size="sm" icon={UserPlus}>
                    Create First Staff Member
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-6">Staff Member</th>
                      <th className="py-3 px-6">Email Address</th>
                      <th className="py-3 px-6">Role</th>
                      <th className="py-3 px-6">Status</th>
                      <th className="py-3 px-6">Date Added</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffList.slice(0, 5).map((staff) => (
                      <tr key={staff.id} className="hover:bg-slate-50/60">
                        <td className="py-4 px-6 font-semibold text-slate-900">{staff.full_name}</td>
                        <td className="py-4 px-6 text-slate-600">{staff.email}</td>
                        <td className="py-4 px-6">
                          <RoleBadge role={staff.role} />
                        </td>
                        <td className="py-4 px-6">
                          <StatusBadge isActive={staff.is_active} />
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-500">
                          {new Date(staff.date_joined).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboardPage;

