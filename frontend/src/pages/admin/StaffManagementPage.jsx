import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { RoleBadge, StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import PasswordStrengthMeter, { checkPasswordRules } from '../../components/PasswordStrengthMeter';
import authService from '../../services/authService';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  Mail,
  User,
  Lock,
  Calendar,
  Shield,
  Loader2,
  Power,
} from 'lucide-react';

export const StaffManagementPage = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create Staff Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
  });
  const [createErrors, setCreateErrors] = useState({});
  const [createLoading, setCreateLoading] = useState(false);
  const [createServerError, setCreateServerError] = useState('');

  // View Staff Detail Modal State
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Status Toggle Modal State
  const [statusToggleStaff, setStatusToggleStaff] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Global Notification Banner
  const [bannerNotice, setBannerNotice] = useState(null);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      const data = await authService.getStaffList(params);
      setStaffList(data);
    } catch (err) {
      console.error('Failed to load staff list', err);
      setBannerNotice({
        type: 'danger',
        message: 'Failed to retrieve staff directory. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStaff();
  };

  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateFormData((prev) => ({ ...prev, [name]: value }));
    if (createErrors[name]) {
      setCreateErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (createServerError) setCreateServerError('');
  };

  const validateCreateForm = () => {
    const errors = {};
    if (!createFormData.full_name.trim()) {
      errors.full_name = 'Full name is required.';
    }
    if (!createFormData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createFormData.email.trim())) {
      errors.email = 'Valid email address is required.';
    }

    const rules = checkPasswordRules(createFormData.password);
    if (!createFormData.password) {
      errors.password = 'Password is required.';
    } else if (!rules.length || !rules.uppercase || !rules.lowercase || !rules.special) {
      errors.password = 'Password must satisfy all complexity requirements.';
    }

    if (!createFormData.confirm_password) {
      errors.confirm_password = 'Confirm password is required.';
    } else if (createFormData.password !== createFormData.confirm_password) {
      errors.confirm_password = 'Passwords do not match.';
    }

    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!validateCreateForm()) return;

    setCreateLoading(true);
    setCreateServerError('');

    try {
      const response = await authService.createStaff({
        full_name: createFormData.full_name.trim(),
        email: createFormData.email.trim(),
        password: createFormData.password,
        confirm_password: createFormData.confirm_password,
      });

      setIsCreateModalOpen(false);
      setCreateFormData({ full_name: '', email: '', password: '', confirm_password: '' });
      setBannerNotice({
        type: 'success',
        message: response.message || 'Staff account created successfully.',
      });
      fetchStaff();
    } catch (err) {
      const resp = err.response?.data;
      if (resp) {
        if (typeof resp === 'object') {
          const fieldErrs = {};
          for (const [k, v] of Object.entries(resp)) {
            fieldErrs[k] = Array.isArray(v) ? v.join(' ') : v;
          }
          setCreateErrors(fieldErrs);
          if (resp.message) setCreateServerError(resp.message);
        } else {
          setCreateServerError('Unable to create staff account.');
        }
      } else {
        setCreateServerError('Connection error. Please try again.');
      }
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusToggleStaff) return;
    setStatusLoading(true);

    try {
      const newStatus = !statusToggleStaff.is_active;
      const res = await authService.updateStaffStatus(statusToggleStaff.id, newStatus);
      setStatusToggleStaff(null);
      setBannerNotice({
        type: 'success',
        message: res.message || `Staff account status updated.`,
      });
      fetchStaff();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update staff status.';
      setBannerNotice({ type: 'danger', message: msg });
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Staff Management"
      subtitle="Provision and administer Brightloop operational staff accounts."
    >
      <div className="space-y-6">
        {bannerNotice && (
          <Alert
            variant={bannerNotice.type}
            onClose={() => setBannerNotice(null)}
          >
            {bannerNotice.message}
          </Alert>
        )}

        {/* Filter and Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 max-w-md">
            <Input
              name="search"
              placeholder="Search by name or email..."
              icon={Search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="submit" variant="outline" size="md">
              Search
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-1 text-xs">
              <span className="text-slate-400 pl-2 font-medium">Status:</span>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  statusFilter === 'active'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('inactive')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  statusFilter === 'inactive'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Inactive
              </button>
            </div>

            <Button
              variant="primary"
              size="md"
              icon={UserPlus}
              onClick={() => {
                setCreateFormData({ full_name: '', email: '', password: '', confirm_password: '' });
                setCreateErrors({});
                setCreateServerError('');
                setIsCreateModalOpen(true);
              }}
            >
              Add Staff
            </Button>
          </div>
        </div>

        {/* Staff Table */}
        <Card>
          <CardHeader
            title="Registered Staff Accounts"
            subtitle={`${staffList.length} total staff account(s) matching criteria`}
          />
          <CardBody className="p-0">
            {loading ? (
              <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span className="text-sm">Loading staff members...</span>
              </div>
            ) : staffList.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No staff accounts found"
                description={
                  searchQuery
                    ? `No staff match the query "${searchQuery}".`
                    : 'Get started by creating the first staff member account.'
                }
                actionLabel="Create Staff Account"
                onAction={() => setIsCreateModalOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-6">Name</th>
                      <th className="py-3 px-6">Email Address</th>
                      <th className="py-3 px-6">Role</th>
                      <th className="py-3 px-6">Account Status</th>
                      <th className="py-3 px-6">Created On</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffList.map((staff) => (
                      <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6 font-semibold text-slate-900 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {staff.full_name?.charAt(0).toUpperCase()}
                          </div>
                          <span>{staff.full_name}</span>
                        </td>
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
                        <td className="py-4 px-6 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStaff(staff);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="View Staff Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setStatusToggleStaff(staff)}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              staff.is_active
                                ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={staff.is_active ? 'Deactivate Staff' : 'Activate Staff'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
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

      {/* Modal: Create Staff Account */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Provision New Staff Account"
        description="Creates an operational staff account with automatic STAFF role assignment."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4" noValidate>
          {createServerError && (
            <Alert variant="danger" onClose={() => setCreateServerError('')}>
              {createServerError}
            </Alert>
          )}

          <Input
            label="Staff full name"
            name="full_name"
            icon={User}
            placeholder="Alex Morgan"
            value={createFormData.full_name}
            onChange={handleCreateChange}
            error={createErrors.full_name}
            required
            autoComplete="name"
          />

          <Input
            label="Staff email address"
            name="email"
            type="email"
            icon={Mail}
            placeholder="alex.staff@brightloop.com"
            value={createFormData.email}
            onChange={handleCreateChange}
            error={createErrors.email}
            required
            autoComplete="email"
          />

          <div>
            <Input
              label="Temporary password"
              name="password"
              type="password"
              icon={Lock}
              placeholder="At least 9 characters"
              value={createFormData.password}
              onChange={handleCreateChange}
              error={createErrors.password}
              required
              autoComplete="new-password"
            />

            {createFormData.password && (
              <PasswordStrengthMeter
                password={createFormData.password}
                confirmPassword={createFormData.confirm_password}
                showConfirmMatch={false}
              />
            )}
          </div>

          <Input
            label="Confirm password"
            name="confirm_password"
            type="password"
            icon={Lock}
            placeholder="Repeat password"
            value={createFormData.confirm_password}
            onChange={handleCreateChange}
            error={createErrors.confirm_password}
            required
            autoComplete="new-password"
          />

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <Shield className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <span>
              The <strong>STAFF</strong> role is automatically enforced by the backend. Staff members cannot access user provisioning or administrator security functions.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={createLoading}
              icon={UserPlus}
            >
              Create Staff Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Staff Details */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Staff Member Profile"
        description="Detailed record of the registered staff member."
        maxWidth="max-w-md"
        footer={
          <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
            Close
          </Button>
        }
      >
        {selectedStaff && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-base">
                {selectedStaff.full_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">{selectedStaff.full_name}</h4>
                <p className="text-xs text-slate-500">{selectedStaff.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <RoleBadge role={selectedStaff.role} />
                  <StatusBadge isActive={selectedStaff.is_active} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block font-medium">User ID</span>
                <span className="font-mono text-slate-800 font-semibold">{selectedStaff.id}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block font-medium">Django Admin Privilege</span>
                <span className="text-slate-800 font-semibold">{selectedStaff.is_staff ? 'Yes' : 'No'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 col-span-2">
                <span className="text-slate-400 block font-medium">Account Created</span>
                <span className="text-slate-800 font-semibold">
                  {new Date(selectedStaff.date_joined).toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 col-span-2">
                <span className="text-slate-400 block font-medium">Last Profile Update</span>
                <span className="text-slate-800 font-semibold">
                  {new Date(selectedStaff.updated_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Confirm Status Activation/Deactivation */}
      <Modal
        isOpen={!!statusToggleStaff}
        onClose={() => setStatusToggleStaff(null)}
        title={statusToggleStaff?.is_active ? 'Deactivate Staff Account?' : 'Activate Staff Account?'}
        description={
          statusToggleStaff?.is_active
            ? `Deactivating ${statusToggleStaff?.full_name} will immediately revoke their access to the Brightloop staff portal.`
            : `Activating ${statusToggleStaff?.full_name} will restore their login access to the staff operations dashboard.`
        }
        maxWidth="max-w-md"
        footer={
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setStatusToggleStaff(null)}>
              Cancel
            </Button>
            <Button
              variant={statusToggleStaff?.is_active ? 'danger' : 'success'}
              size="sm"
              isLoading={statusLoading}
              onClick={handleToggleStatus}
            >
              {statusToggleStaff?.is_active ? 'Confirm Deactivation' : 'Confirm Activation'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          Staff member: <span className="font-semibold text-slate-900">{statusToggleStaff?.full_name}</span> ({statusToggleStaff?.email})
        </p>
      </Modal>
    </DashboardLayout>
  );
};

export default StaffManagementPage;

