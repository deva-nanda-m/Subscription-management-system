import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { SubscriptionStatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import subscriptionService from '../../services/subscriptionService';
import {
  CreditCard,
  Search,
  Eye,
  PauseCircle,
  Play,
  RotateCw,
  Lock,
  Calendar,
  Layers,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  User,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
} from 'lucide-react';

export const SubscriptionListPage = () => {
  const navigate = useNavigate();

  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [filterPaused, setFilterPaused] = useState('ALL'); // 'ALL' | 'PAUSED' | 'NOT_PAUSED'
  const [bannerNotice, setBannerNotice] = useState(null);

  // Quick Action Modal
  const [activeModal, setActiveModal] = useState(null); // 'PAUSE' | 'RESUME' | 'ACTIVATE' | 'CLOSE'
  const [selectedSub, setSelectedSub] = useState(null);
  const [modalReason, setModalReason] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (filterPaused === 'PAUSED') params.is_paused = true;
      if (filterPaused === 'NOT_PAUSED') params.is_paused = false;

      const data = await subscriptionService.getSubscriptions(params);
      const list = data?.results || (Array.isArray(data) ? data : []);
      setSubscriptions(list);
    } catch (err) {
      console.error('Failed to load subscriptions', err);
      setBannerNotice({
        type: 'danger',
        message: 'Could not load subscriptions catalog from backend.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [selectedStatus, filterPaused]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchSubscriptions();
  };

  const openActionModal = (sub, actionType) => {
    setSelectedSub(sub);
    setActiveModal(actionType);
    setModalReason('');
    setModalError('');
  };

  const handleExecuteModalAction = async () => {
    if (!selectedSub || !activeModal) return;
    setModalLoading(true);
    setModalError('');

    try {
      if (activeModal === 'ACTIVATE') {
        await subscriptionService.activateSubscription(selectedSub.id, modalReason);
        setBannerNotice({ type: 'success', message: `Subscription ${selectedSub.subscription_number} activated.` });
      } else if (activeModal === 'PAUSE') {
        if (!modalReason.trim()) {
          setModalError('Please provide a reason for pausing this subscription.');
          setModalLoading(false);
          return;
        }
        await subscriptionService.pauseSubscription(selectedSub.id, modalReason);
        setBannerNotice({ type: 'warning', message: `Subscription ${selectedSub.subscription_number} paused.` });
      } else if (activeModal === 'RESUME') {
        await subscriptionService.resumeSubscription(selectedSub.id);
        setBannerNotice({ type: 'success', message: `Subscription ${selectedSub.subscription_number} resumed.` });
      } else if (activeModal === 'CLOSE') {
        await subscriptionService.closeSubscription(selectedSub.id, modalReason);
        setBannerNotice({ type: 'danger', message: `Subscription ${selectedSub.subscription_number} closed.` });
      }
      setActiveModal(null);
      await fetchSubscriptions();
    } catch (err) {
      console.error('Action failed', err);
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to update subscription.';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  // Metrics
  const totalCount = subscriptions.length;
  const activeCount = subscriptions.filter((s) => s.status === 'ACTIVE' && !s.is_paused).length;
  const pausedCount = subscriptions.filter((s) => s.is_paused).length;
  const closedCount = subscriptions.filter((s) => s.status === 'CLOSED').length;

  return (
    <DashboardLayout
      title="Subscription Management"
      subtitle="Monitor recurring contracts, billing cycles, pause operational tracking and automated renewals."
    >
      <div className="space-y-6">
        {bannerNotice && (
          <Alert
            type={bannerNotice.type}
            message={bannerNotice.message}
            onClose={() => setBannerNotice(null)}
          />
        )}

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Subscriptions</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{totalCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Contracts</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Paused Services</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{pausedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <PauseCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Closed / Expired</p>
              <p className="text-2xl font-black text-slate-700 mt-1">{closedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <Card>
          <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-4 justify-between items-center">
            {/* Search Input */}
            <form onSubmit={handleSearch} className="w-full md:w-80 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search subscription number or customer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm">
                Search
              </Button>
            </form>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center rounded-lg bg-slate-100 p-1 text-xs font-semibold">
                {['ALL', 'ACTIVE', 'CONFIRMED', 'CLOSED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStatus(st)}
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      selectedStatus === st
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'ALL' ? 'All Statuses' : st}
                  </button>
                ))}
              </div>

              {/* Pause filter toggle */}
              <div className="flex items-center rounded-lg bg-slate-100 p-1 text-xs font-semibold">
                <button
                  onClick={() => setFilterPaused('ALL')}
                  className={`px-2.5 py-1.5 rounded-md transition-colors ${
                    filterPaused === 'ALL' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterPaused('PAUSED')}
                  className={`px-2.5 py-1.5 rounded-md transition-colors ${
                    filterPaused === 'PAUSED' ? 'bg-amber-100 text-amber-800 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Paused
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Subscriptions Table */}
        <Card>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                <p className="text-xs text-slate-500">Loading subscriptions...</p>
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="p-8 text-center">
                <EmptyState
                  icon={CreditCard}
                  title="No subscriptions found"
                  description="Subscriptions are generated by converting confirmed quotations. Navigate to quotations to issue and confirm a customer quotation."
                  action={
                    <Link to="/admin/quotations">
                      <Button variant="primary" size="sm" icon={Layers}>
                        Browse Quotations
                      </Button>
                    </Link>
                  }
                />
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Subscription</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Source Quotation</th>
                    <th className="py-3 px-4">Billing Dates</th>
                    <th className="py-3 px-4 text-right">Commitment</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <Link
                          to={`/admin/subscriptions/${sub.id}`}
                          className="hover:text-indigo-600 flex items-center gap-1.5"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{sub.subscription_number}</span>
                        </Link>
                        {sub.is_renewal && (
                          <span className="text-[10px] text-purple-600 font-semibold block mt-0.5">
                            Renewal Contract
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{sub.customer_name}</p>
                        <p className="text-[11px] text-slate-400">{sub.customer_email}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        {sub.source_quotation_number ? (
                          <Link
                            to={`/admin/quotations/${sub.source_quotation}`}
                            className="font-medium text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            <span>{sub.source_quotation_number}</span>
                          </Link>
                        ) : (
                          <span className="text-slate-400">Direct Contract</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <p>
                          <span className="text-slate-400">Start:</span> {sub.start_date}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          <span className="text-slate-400">Next Due:</span>{' '}
                          <strong className="text-slate-700">{sub.next_billing_date || 'N/A'}</strong>
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <p className="font-bold text-slate-900">
                          ₹{Number(sub.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-slate-400">{sub.payment_terms || 'Net 30'}</p>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <SubscriptionStatusBadge status={sub.status} isPaused={sub.is_paused} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link to={`/admin/subscriptions/${sub.id}`}>
                            <Button variant="ghost" size="xs" icon={Eye}>
                              View
                            </Button>
                          </Link>

                          {/* Fast Action Buttons */}
                          {sub.status === 'CONFIRMED' && (
                            <Button
                              variant="outline"
                              size="xs"
                              icon={CheckCircle2}
                              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => openActionModal(sub, 'ACTIVATE')}
                            >
                              Activate
                            </Button>
                          )}

                          {sub.status === 'ACTIVE' && !sub.is_paused && (
                            <Button
                              variant="ghost"
                              size="xs"
                              icon={PauseCircle}
                              className="text-amber-600 hover:bg-amber-50"
                              onClick={() => openActionModal(sub, 'PAUSE')}
                            >
                              Pause
                            </Button>
                          )}

                          {sub.is_paused && (
                            <Button
                              variant="ghost"
                              size="xs"
                              icon={Play}
                              className="text-emerald-600 hover:bg-emerald-50"
                              onClick={() => openActionModal(sub, 'RESUME')}
                            >
                              Resume
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Action Modal */}
      <Modal
        isOpen={!!activeModal}
        onClose={() => setActiveModal(null)}
        title={
          activeModal === 'ACTIVATE'
            ? 'Activate Subscription'
            : activeModal === 'PAUSE'
            ? 'Pause Active Subscription'
            : activeModal === 'RESUME'
            ? 'Resume Paused Subscription'
            : 'Close Subscription'
        }
      >
        <div className="space-y-4 text-sm">
          {modalError && <Alert type="danger" message={modalError} />}
          <p className="text-slate-600">
            {activeModal === 'ACTIVATE' &&
              `You are activating Subscription #${selectedSub?.subscription_number}. Future recurring cycles and service provisioning will begin.`}
            {activeModal === 'PAUSE' &&
              `You are pausing Subscription #${selectedSub?.subscription_number}. Service access and billing cycles will be temporarily placed on hold.`}
            {activeModal === 'RESUME' &&
              `You are resuming Subscription #${selectedSub?.subscription_number}. Service access will return to active operational state.`}
            {activeModal === 'CLOSE' &&
              `You are terminating Subscription #${selectedSub?.subscription_number}. This will permanently complete the subscription lifecycle.`}
          </p>

          {(activeModal === 'PAUSE' || activeModal === 'ACTIVATE' || activeModal === 'CLOSE') && (
            <Input
              label={activeModal === 'PAUSE' ? 'Pause Reason (Required)' : 'Reason / Note (Optional)'}
              placeholder={activeModal === 'PAUSE' ? 'e.g. Customer billing hold, seasonal hiatus' : 'Notes...'}
              value={modalReason}
              onChange={(e) => setModalReason(e.target.value)}
              required={activeModal === 'PAUSE'}
            />
          )}

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button
              variant={activeModal === 'CLOSE' ? 'danger' : 'primary'}
              onClick={handleExecuteModalAction}
              disabled={modalLoading}
            >
              {modalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default SubscriptionListPage;

