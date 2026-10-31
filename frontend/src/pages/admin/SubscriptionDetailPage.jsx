import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import {
  SubscriptionStatusBadge,
  BillingIntervalBadge,
} from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import subscriptionService from '../../services/subscriptionService';
import {
  CreditCard,
  ArrowLeft,
  PauseCircle,
  Play,
  RotateCw,
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
  DollarSign,
  Package,
  FileText,
  Sparkles,
  Link2,
} from 'lucide-react';

export const SubscriptionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [subscription, setSubscription] = useState(null);
  const [history, setHistory] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bannerNotice, setBannerNotice] = useState(null);

  // Modal Actions
  const [modalAction, setModalAction] = useState(null); // 'ACTIVATE' | 'PAUSE' | 'RESUME' | 'RENEW' | 'CLOSE'
  const [modalReason, setModalReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Renewal form
  const [renewalForm, setRenewalForm] = useState({
    start_date: '',
    end_date: '',
    reason: '',
  });

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const [subData, histData, renData] = await Promise.all([
        subscriptionService.getSubscription(id),
        subscriptionService.getSubscriptionHistory(id).catch(() => []),
        subscriptionService.getSubscriptionRenewals(id).catch(() => []),
      ]);
      setSubscription(subData);
      setHistory(Array.isArray(histData) ? histData : histData?.results || []);
      setRenewals(Array.isArray(renData) ? renData : renData?.results || []);

      // Default renewal start date to today or current end date
      const defaultStart = subData.end_date || new Date().toISOString().split('T')[0];
      setRenewalForm({
        start_date: defaultStart,
        end_date: '',
        reason: 'Contract period renewal',
      });
    } catch (err) {
      console.error('Failed to load subscription details', err);
      setBannerNotice({
        type: 'danger',
        message: 'Failed to retrieve subscription record.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, [id]);

  const openActionModal = (action) => {
    setModalAction(action);
    setModalReason('');
    setActionError('');
  };

  const handleExecuteAction = async () => {
    if (!modalAction) return;
    setActionLoading(true);
    setActionError('');

    try {
      if (modalAction === 'ACTIVATE') {
        await subscriptionService.activateSubscription(id, modalReason);
        setBannerNotice({ type: 'success', message: 'Subscription has been activated.' });
      } else if (modalAction === 'PAUSE') {
        if (!modalReason.trim()) {
          setActionError('Please specify the operational reason for pausing.');
          setActionLoading(false);
          return;
        }
        await subscriptionService.pauseSubscription(id, modalReason);
        setBannerNotice({ type: 'warning', message: 'Subscription paused. Billing and access suspended.' });
      } else if (modalAction === 'RESUME') {
        await subscriptionService.resumeSubscription(id);
        setBannerNotice({ type: 'success', message: 'Subscription resumed successfully.' });
      } else if (modalAction === 'CLOSE') {
        await subscriptionService.closeSubscription(id, modalReason);
        setBannerNotice({ type: 'danger', message: 'Subscription permanently closed.' });
      } else if (modalAction === 'RENEW') {
        const renewed = await subscriptionService.renewSubscription(id, renewalForm);
        setModalAction(null);
        setBannerNotice({ type: 'success', message: 'New renewal contract generated!' });
        navigate(`/admin/subscriptions/${renewed.id}`);
        return;
      }
      setModalAction(null);
      await fetchSubscriptionData();
    } catch (err) {
      console.error('Action error', err);
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to update subscription.';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Subscription Record" subtitle="Loading subscription details...">
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-500">Retrieving contract data from database...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!subscription) {
    return (
      <DashboardLayout title="Subscription Not Found">
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Subscription Record Not Found</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            The requested subscription contract could not be located.
          </p>
          <Link to="/admin/subscriptions" className="mt-6 inline-block">
            <Button variant="secondary" icon={ArrowLeft}>
              Return to Subscriptions List
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`Subscription ${subscription.subscription_number}`}
      subtitle="Recurring contract lifecycle, billing cycle schedules, pause logs and renewal history."
    >
      <div className="space-y-6">
        {/* Top Breadcrumb & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            to="/admin/subscriptions"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Subscriptions Catalog
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Link to Source Quotation if any */}
            {subscription.source_quotation && (
              <Link to={`/admin/quotations/${subscription.source_quotation}`}>
                <Button variant="outline" size="sm" icon={FileText}>
                  Source Quotation
                </Button>
              </Link>
            )}

            {/* Lifecycle Triggers */}
            {subscription.status === 'CONFIRMED' && (
              <Button
                variant="primary"
                size="sm"
                icon={CheckCircle2}
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => openActionModal('ACTIVATE')}
              >
                Activate Subscription
              </Button>
            )}

            {subscription.status === 'ACTIVE' && !subscription.is_paused && (
              <Button
                variant="outline"
                size="sm"
                icon={PauseCircle}
                className="text-amber-700 border-amber-300 hover:bg-amber-50"
                onClick={() => openActionModal('PAUSE')}
              >
                Pause Services
              </Button>
            )}

            {subscription.is_paused && (
              <Button
                variant="primary"
                size="sm"
                icon={Play}
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => openActionModal('RESUME')}
              >
                Resume Services
              </Button>
            )}

            {['ACTIVE', 'CONFIRMED'].includes(subscription.status) && (
              <Button
                variant="outline"
                size="sm"
                icon={RotateCw}
                onClick={() => openActionModal('RENEW')}
              >
                Renew Contract
              </Button>
            )}

            {subscription.status !== 'CLOSED' && (
              <Button
                variant="danger"
                size="sm"
                icon={Lock}
                onClick={() => openActionModal('CLOSE')}
              >
                Close Contract
              </Button>
            )}
          </div>
        </div>

        {bannerNotice && (
          <Alert
            type={bannerNotice.type}
            message={bannerNotice.message}
            onClose={() => setBannerNotice(null)}
          />
        )}

        {/* Primary Header Card */}
        <Card>
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    {subscription.subscription_number}
                  </h1>
                  <SubscriptionStatusBadge
                    status={subscription.status}
                    isPaused={subscription.is_paused}
                  />
                  {subscription.is_renewal && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      Renewed Contract
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <span>Customer: <strong>{subscription.customer_name}</strong> ({subscription.customer_email})</span>
                  <span>•</span>
                  <span>Started on {subscription.start_date}</span>
                </p>
              </div>

              {/* Total Recurring Value */}
              <div className="text-right">
                <p className="text-xs uppercase font-bold text-slate-400">Recurring Commitment</p>
                <p className="text-2xl font-black text-slate-900">
                  ₹{Number(subscription.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  {subscription.payment_terms || 'Net 30'} Billing Terms
                </p>
              </div>
            </div>

            {/* Diagnostic Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 text-xs">
              <div>
                <span className="font-bold uppercase tracking-wider text-slate-400">Next Billing Date</span>
                <p className="text-sm font-black text-indigo-600 mt-1">
                  {subscription.next_billing_date || 'None Scheduled'}
                </p>
                <p className="text-slate-500">Managed by Celery Beat</p>
              </div>

              <div>
                <span className="font-bold uppercase tracking-wider text-slate-400">Contract Period</span>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {subscription.start_date} {subscription.end_date ? `to ${subscription.end_date}` : '(Open-ended)'}
                </p>
                <p className="text-slate-500">
                  {subscription.end_date ? 'Fixed Duration' : 'Continuous Renewal'}
                </p>
              </div>

              <div>
                <span className="font-bold uppercase tracking-wider text-slate-400">Source Quotation</span>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {subscription.source_quotation_number ? (
                    <Link
                      to={`/admin/quotations/${subscription.source_quotation}`}
                      className="text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <span>{subscription.source_quotation_number}</span>
                      <Link2 className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    'Direct Staff Generation'
                  )}
                </p>
                <p className="text-slate-500">Immutable Price Snapshot</p>
              </div>

              <div>
                <span className="font-bold uppercase tracking-wider text-slate-400">Currency & Billing</span>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {subscription.currency} • {subscription.payment_terms || 'Net 30'}
                </p>
                <p className="text-slate-500">Standard Terms Applied</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Subscription Items Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">Provisioned Subscription Plan Items</h2>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {subscription.items?.length || 0} Plan Components
              </span>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Product & Variant</th>
                  <th className="py-3 px-4">Plan Specification</th>
                  <th className="py-3 px-4">Billing Interval</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Discount</th>
                  <th className="py-3 px-4 text-right">Tax Rate</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {subscription.items?.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {item.product_name}
                      {item.variant_name && (
                        <span className="block text-[11px] font-normal text-slate-500">
                          Variant: {item.variant_name}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-indigo-600">
                      {item.plan_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <BillingIntervalBadge interval={item.billing_interval} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      ₹{Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                      {item.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600">
                      {Number(item.discount_percentage) > 0 ? `${Number(item.discount_percentage)}%` : '0%'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600">
                      {Number(item.tax_rate) > 0 ? `${Number(item.tax_rate)}%` : '0%'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      ₹{Number(item.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-6 bg-slate-50/60 border-t border-slate-200 flex justify-end">
            <div className="w-full md:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold">₹{Number(subscription.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {Number(subscription.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount Applied:</span>
                  <span className="font-semibold">-₹{Number(subscription.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>GST / Tax:</span>
                <span className="font-semibold">+₹{Number(subscription.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                <span>Total Recurring Commitment:</span>
                <span className="text-indigo-600">₹{Number(subscription.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Operational Pause Log & Renewal Chain */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pause Operational History */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PauseCircle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Pause Operational History</h3>
              </div>
            </CardHeader>
            <CardBody>
              {!subscription.pause_history || subscription.pause_history.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No pause operations recorded for this subscription.
                </p>
              ) : (
                <div className="space-y-3">
                  {subscription.pause_history.map((ph) => (
                    <div key={ph.id} className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 text-xs">
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span>Paused: {new Date(ph.paused_at).toLocaleString()}</span>
                        <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-bold">
                          {ph.resumed_at ? 'RESUMED' : 'CURRENTLY PAUSED'}
                        </span>
                      </div>
                      <p className="text-slate-700 mt-1 font-medium">Reason: {ph.reason}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        By: {ph.paused_by_name || 'Staff User'}
                      </p>
                      {ph.resumed_at && (
                        <div className="mt-2 pt-2 border-t border-amber-200/60 text-[11px] text-emerald-700">
                          Resumed: {new Date(ph.resumed_at).toLocaleString()} by {ph.resumed_by_name || 'Staff User'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Renewal History / Linkages */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Contract Renewal Chain</h3>
              </div>
            </CardHeader>
            <CardBody>
              {renewals.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No renewals associated with this subscription record.
                </p>
              ) : (
                <div className="space-y-3">
                  {renewals.map((ren) => (
                    <div key={ren.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>Renewal #{ren.id}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(ren.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <Link
                          to={`/admin/subscriptions/${ren.previous_subscription}`}
                          className="font-medium text-slate-600 hover:text-indigo-600"
                        >
                          {ren.previous_subscription_number}
                        </Link>
                        <span>→</span>
                        <Link
                          to={`/admin/subscriptions/${ren.renewed_subscription}`}
                          className="font-bold text-indigo-600 hover:underline"
                        >
                          {ren.renewed_subscription_number}
                        </Link>
                      </div>
                      {ren.notes && (
                        <p className="text-slate-500 italic mt-1">"{ren.notes}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Status Lifecycle Audit Log */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Subscription Status Audit Trail</h3>
            </div>
          </CardHeader>
          <CardBody>
            {history.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No lifecycle transitions recorded.</p>
            ) : (
              <div className="space-y-4">
                {history.map((record) => (
                  <div key={record.id} className="flex gap-3 text-xs border-l-2 border-indigo-200 pl-3 py-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          {record.from_status ? `${record.from_status} → ${record.to_status}` : `Created as ${record.to_status}`}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(record.created_at).toLocaleString()}
                        </span>
                      </div>
                      {record.reason && (
                        <p className="text-slate-600 mt-1 italic">"{record.reason}"</p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        By: {record.changed_by_name || 'System / Staff'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Action Transition Modal */}
      <Modal
        isOpen={['ACTIVATE', 'PAUSE', 'RESUME', 'CLOSE'].includes(modalAction)}
        onClose={() => setModalAction(null)}
        title={
          modalAction === 'ACTIVATE'
            ? 'Activate Subscription'
            : modalAction === 'PAUSE'
            ? 'Pause Active Subscription'
            : modalAction === 'RESUME'
            ? 'Resume Subscription'
            : 'Close / Terminate Subscription'
        }
      >
        <div className="space-y-4 text-sm">
          {actionError && <Alert type="danger" message={actionError} />}
          <p className="text-slate-600">
            {modalAction === 'ACTIVATE' &&
              `You are activating Subscription #${subscription.subscription_number}. Service entitlements and recurring billing cycles are initiated.`}
            {modalAction === 'PAUSE' &&
              `You are pausing Subscription #${subscription.subscription_number}. This suspends service access and billing intervals until resumed.`}
            {modalAction === 'RESUME' &&
              `You are resuming Subscription #${subscription.subscription_number}. Normal operational status will be restored.`}
            {modalAction === 'CLOSE' &&
              `You are closing Subscription #${subscription.subscription_number}. This ends the subscription contract permanently.`}
          </p>

          <Input
            label={modalAction === 'PAUSE' ? 'Reason for Pausing (Required)' : 'Operational Reason / Notes (Optional)'}
            placeholder={modalAction === 'PAUSE' ? 'e.g. Customer billing hold, seasonal hiatus' : 'Notes...'}
            value={modalReason}
            onChange={(e) => setModalReason(e.target.value)}
            required={modalAction === 'PAUSE'}
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setModalAction(null)}>
              Cancel
            </Button>
            <Button
              variant={modalAction === 'CLOSE' ? 'danger' : 'primary'}
              onClick={handleExecuteAction}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Action'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Renewal Modal */}
      <Modal
        isOpen={modalAction === 'RENEW'}
        onClose={() => setModalAction(null)}
        title="Renew Subscription Contract"
      >
        <div className="space-y-4 text-sm">
          {actionError && <Alert type="danger" message={actionError} />}
          <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 text-xs text-indigo-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Contract Continuity
            </p>
            <p>
              Generating a renewal will create a new Subscription linked directly to{' '}
              <strong>{subscription.subscription_number}</strong> with replicated pricing and line items.
            </p>
          </div>

          <Input
            label="Renewal Start Date"
            type="date"
            value={renewalForm.start_date}
            onChange={(e) => setRenewalForm({ ...renewalForm, start_date: e.target.value })}
            required
          />

          <Input
            label="Renewal End Date (Optional)"
            type="date"
            value={renewalForm.end_date}
            onChange={(e) => setRenewalForm({ ...renewalForm, end_date: e.target.value })}
          />

          <Input
            label="Renewal Notes / Reason"
            placeholder="e.g. Annual contract extension"
            value={renewalForm.reason}
            onChange={(e) => setRenewalForm({ ...renewalForm, reason: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setModalAction(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={RotateCw}
              onClick={handleExecuteAction}
              disabled={actionLoading || !renewalForm.start_date}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Execute Renewal'}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default SubscriptionDetailPage;

