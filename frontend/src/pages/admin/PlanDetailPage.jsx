import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import {
  PlanStatusBadge,
  BillingIntervalBadge,
  AvailabilityBadge,
  ProductCategoryBadge,
} from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import planService from '../../services/planService';
import {
  CreditCard,
  ArrowLeft,
  Edit2,
  Trash2,
  PauseCircle,
  Play,
  Lock,
  Calendar,
  Layers,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  User,
  AlertTriangle,
  Loader2,
  Tag,
  DollarSign,
  Package,
} from 'lucide-react';

export const PlanDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bannerNotice, setBannerNotice] = useState(null);

  // Transition Modal State
  const [modalAction, setModalAction] = useState(null); // 'PAUSE' | 'RESUME' | 'CLOSE' | 'DELETE'
  const [changeReason, setChangeReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchPlanDetails = async () => {
    try {
      setLoading(true);
      const [planData, historyData] = await Promise.all([
        planService.getPlan(id),
        planService.getPlanHistory(id),
      ]);
      setPlan(planData);
      setHistory(Array.isArray(historyData) ? historyData : historyData.results || []);
    } catch (err) {
      console.error('Failed to load plan details', err);
      setBannerNotice({
        type: 'danger',
        message: 'Failed to retrieve plan record. It may not exist or backend is unreachable.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanDetails();
  }, [id]);

  const openActionModal = (action) => {
    setModalAction(action);
    setChangeReason('');
    setActionError('');
  };

  const closeActionModal = () => {
    setModalAction(null);
    setChangeReason('');
    setActionError('');
  };

  const executeAction = async () => {
    if (!modalAction || !plan) return;
    setActionLoading(true);
    setActionError('');

    try {
      if (modalAction === 'PAUSE') {
        await planService.pausePlan(plan.id, changeReason);
        setBannerNotice({
          type: 'success',
          message: `Plan "${plan.name}" has been paused. New subscriptions suspended.`,
        });
      } else if (modalAction === 'RESUME') {
        await planService.resumePlan(plan.id, changeReason);
        setBannerNotice({
          type: 'success',
          message: `Plan "${plan.name}" is now active and available.`,
        });
      } else if (modalAction === 'CLOSE') {
        await planService.closePlan(plan.id, changeReason);
        setBannerNotice({
          type: 'warning',
          message: `Plan "${plan.name}" has been permanently closed.`,
        });
      } else if (modalAction === 'DELETE') {
        await planService.deletePlan(plan.id);
        navigate('/admin/plans');
        return;
      }

      closeActionModal();
      fetchPlanDetails();
    } catch (err) {
      console.error('Lifecycle action failed', err);
      const errMsg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        (typeof err.response?.data === 'string' ? err.response.data : 'Action failed to execute.');
      setActionError(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Plan Details" subtitle="Loading specification...">
        <div className="p-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
          <p className="text-sm text-slate-500">Retrieving subscription plan specification...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!plan) {
    return (
      <DashboardLayout title="Plan Details" subtitle="Plan not found">
        <div className="p-8 text-center max-w-md mx-auto">
          <Alert type="danger" message="The requested subscription plan could not be found." />
          <Link to="/admin/plans" className="mt-4 inline-block">
            <Button variant="secondary" size="md" icon={ArrowLeft}>
              Back to Plans
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const isClosed = plan.status === 'CLOSED';
  const isPaused = plan.status === 'PAUSED';
  const isActive = plan.status === 'ACTIVE';

  return (
    <DashboardLayout
      title={plan.name}
      subtitle={`Plan Code: ${plan.plan_code} • Linked to product ${plan.product_name}`}
    >
      <div className="space-y-6 max-w-6xl">
        {/* Back Link & Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link
            to="/admin/plans"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Subscription Plans
          </Link>

          {/* Quick Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {!isClosed && (
              <Link to={`/admin/plans/${plan.id}/edit`}>
                <Button variant="secondary" size="sm" icon={Edit2}>
                  Edit Plan
                </Button>
              </Link>
            )}

            {isActive && plan.allow_pause && (
              <Button
                variant="warning"
                size="sm"
                icon={PauseCircle}
                onClick={() => openActionModal('PAUSE')}
              >
                Pause Plan
              </Button>
            )}

            {isPaused && (
              <Button
                variant="primary"
                size="sm"
                icon={Play}
                onClick={() => openActionModal('RESUME')}
              >
                Resume Plan
              </Button>
            )}

            {!isClosed && (
              <Button
                variant="danger"
                size="sm"
                icon={Lock}
                onClick={() => openActionModal('CLOSE')}
              >
                Close Plan Permanently
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              onClick={() => openActionModal('DELETE')}
              className="text-slate-400 hover:text-rose-600"
            >
              Delete
            </Button>
          </div>
        </div>

        {bannerNotice && (
          <Alert
            type={bannerNotice.type}
            message={bannerNotice.message}
            onClose={() => setBannerNotice(null)}
          />
        )}

        {/* Closed Status Notice */}
        {isClosed && (
          <div className="p-4 bg-slate-100 border border-slate-300 rounded-xl flex items-center gap-3 text-xs text-slate-700">
            <Lock className="w-5 h-5 text-slate-500 shrink-0" />
            <div>
              <strong>Plan Retired / Closed:</strong> This subscription plan is permanently closed.
              No further subscriptions can be initiated under this plan, and its status cannot be
              reopened. Pre-existing subscriptions may continue subject to the renewal policy.
            </div>
          </div>
        )}

        {/* Overview Header Banner Card */}
        <Card className="border border-slate-200">
          <CardBody className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-slate-900">{plan.name}</h2>
                  <PlanStatusBadge status={plan.status} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono">
                  <span>Code: {plan.plan_code}</span>
                  <span>•</span>
                  <span>Created: {new Date(plan.created_at).toLocaleDateString()}</span>
                  {plan.created_by_name && (
                    <>
                      <span>•</span>
                      <span>By: {plan.created_by_name}</span>
                    </>
                  )}
                </div>
                {plan.description && (
                  <p className="text-xs text-slate-600 max-w-2xl leading-relaxed pt-1">
                    {plan.description}
                  </p>
                )}
              </div>

              {/* Price & Billing Interval Highlight */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-left md:text-right shrink-0">
                <div className="text-2xl font-black text-slate-900">
                  {plan.currency === 'INR' ? '₹' : '$'}
                  {Number(plan.price).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="flex items-center md:justify-end gap-1.5 mt-1">
                  <BillingIntervalBadge interval={plan.billing_interval} />
                  <span className="text-xs text-slate-500 font-medium">billing</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Min. Order: <strong>{plan.minimum_quantity} units</strong>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 3-Column Specifications Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Product Linkage */}
          <Card>
            <CardHeader className="py-3 px-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" /> Associated Product
              </h3>
            </CardHeader>
            <CardBody className="p-5 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Product Name:</span>
                <Link
                  to={`/admin/products/${plan.product}`}
                  className="font-semibold text-indigo-600 hover:underline"
                >
                  {plan.product_name}
                </Link>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Product Code:</span>
                <span className="font-mono text-slate-800">{plan.product_code}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Category:</span>
                <ProductCategoryBadge category={plan.product_category} />
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Tier / Variant:</span>
                <span className="font-medium text-slate-800">
                  {plan.variant_name ? `${plan.variant_name} (${plan.variant_sku})` : 'Base Product'}
                </span>
              </div>
              {plan.variant_base_price && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Variant Base Rate:</span>
                  <span className="text-slate-700">
                    {plan.currency} {plan.variant_base_price}
                  </span>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Card 2: Availability Window */}
          <Card>
            <CardHeader className="py-3 px-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-600" /> Availability Window
              </h3>
            </CardHeader>
            <CardBody className="p-5 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Available From:</span>
                <span className="font-semibold text-slate-800">{plan.available_from}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Available Until:</span>
                <span className="font-semibold text-slate-800">
                  {plan.available_until || 'Indefinite (No End Date)'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Purchase Status:</span>
                <AvailabilityBadge
                  isCurrentlyAvailable={plan.is_currently_available}
                  availabilityDisplay={plan.availability_display}
                />
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-600">
                {plan.is_currently_available
                  ? 'Open for new subscriptions under current date criteria.'
                  : 'Currently closed to new customer subscriptions.'}
              </div>
            </CardBody>
          </Card>

          {/* Card 3: Lifecycle Policies */}
          <Card>
            <CardHeader className="py-3 px-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Lifecycle Policies
              </h3>
            </CardHeader>
            <CardBody className="p-5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Automatic Closure:</span>
                <span
                  className={`font-semibold ${
                    plan.auto_close ? 'text-indigo-600' : 'text-slate-400'
                  }`}
                >
                  {plan.auto_close ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Allow Early Closure:</span>
                <span
                  className={`font-semibold ${
                    plan.allow_early_closure ? 'text-indigo-600' : 'text-slate-400'
                  }`}
                >
                  {plan.allow_early_closure ? 'Allowed' : 'Disallowed'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Allow Pausing:</span>
                <span
                  className={`font-semibold ${
                    plan.allow_pause ? 'text-indigo-600' : 'text-slate-400'
                  }`}
                >
                  {plan.allow_pause ? 'Allowed' : 'Disallowed'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Allow Renewal:</span>
                <span
                  className={`font-semibold ${
                    plan.allow_renewal ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {plan.allow_renewal ? 'Permitted' : 'Prohibited'}
                </span>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Audit Status History Timeline */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <h3 className="font-semibold text-slate-900 text-sm">
                Lifecycle & Status Audit Trail
              </h3>
              <span className="text-xs text-slate-500">({history.length} events logged)</span>
            </div>
          </CardHeader>

          <CardBody className="p-0">
            {history.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No status transitions have occurred on this plan yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Transition</th>
                      <th className="py-3 px-4">Changed By</th>
                      <th className="py-3 px-4">Administrative Reason</th>
                      <th className="py-3 px-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {history.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <PlanStatusBadge status={entry.previous_status} />
                            <span className="text-slate-400">→</span>
                            <PlanStatusBadge status={entry.new_status} />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800">
                              {entry.changed_by_name || 'System / Daemon'}
                            </span>
                            {entry.changed_by_email && (
                              <span className="text-[11px] text-slate-500">
                                {entry.changed_by_email}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-md">
                          {entry.change_reason || (
                            <span className="italic text-slate-400">No reason specified</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                          {new Date(entry.changed_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Transition Confirmation Modal */}
        <Modal
          isOpen={!!modalAction}
          onClose={closeActionModal}
          title={
            modalAction === 'PAUSE'
              ? 'Pause Plan'
              : modalAction === 'RESUME'
              ? 'Resume Plan'
              : modalAction === 'CLOSE'
              ? 'Close Plan Permanently'
              : 'Delete Plan'
          }
          description={
            modalAction === 'CLOSE'
              ? 'Warning: Closing is terminal and irreversible. No new subscriptions can ever be created under this plan once closed.'
              : modalAction === 'PAUSE'
              ? 'Pausing stops new subscription intakes. Existing subscriptions continue active.'
              : modalAction === 'RESUME'
              ? 'Resuming restores this plan to active status for subscriptions.'
              : `Permanently delete subscription plan "${plan.name}"?`
          }
        >
          <div className="space-y-4">
            {actionError && <Alert type="danger" message={actionError} />}

            {modalAction !== 'DELETE' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Status Change (Audit Record)
                </label>
                <textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Provide an explanation for this administrative action..."
                  rows={3}
                  className="w-full text-xs rounded-lg border-slate-300 p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                onClick={closeActionModal}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant={
                  modalAction === 'CLOSE' || modalAction === 'DELETE'
                    ? 'danger'
                    : modalAction === 'PAUSE'
                    ? 'warning'
                    : 'primary'
                }
                size="md"
                onClick={executeAction}
                isLoading={actionLoading}
              >
                {modalAction === 'PAUSE'
                  ? 'Confirm Pause'
                  : modalAction === 'RESUME'
                  ? 'Confirm Resume'
                  : modalAction === 'CLOSE'
                  ? 'Confirm Permanent Closure'
                  : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default PlanDetailPage;

