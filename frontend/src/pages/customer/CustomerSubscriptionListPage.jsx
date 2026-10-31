import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import {
  SubscriptionStatusBadge,
  BillingIntervalBadge,
} from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import subscriptionService from '../../services/subscriptionService';
import {
  CreditCard,
  Calendar,
  Layers,
  Loader2,
  Clock,
  Sparkles,
  Eye,
  CheckCircle2,
  ShieldCheck,
  PauseCircle,
  FileText,
} from 'lucide-react';

export const CustomerSubscriptionListPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bannerNotice, setBannerNotice] = useState(null);

  // Detail Modal
  const [selectedSub, setSelectedSub] = useState(null);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const data = await subscriptionService.getSubscriptions();
      const list = data?.results || (Array.isArray(data) ? data : []);
      setSubscriptions(list);
    } catch (err) {
      console.error('Failed to load customer subscriptions', err);
      setBannerNotice({
        type: 'danger',
        message: 'Could not load your subscriptions. Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const activeCount = subscriptions.filter((s) => s.status === 'ACTIVE' && !s.is_paused).length;
  const totalCommitment = subscriptions
    .filter((s) => s.status === 'ACTIVE')
    .reduce((acc, curr) => acc + Number(curr.grand_total || 0), 0);

  return (
    <DashboardLayout
      title="My Subscriptions"
      subtitle="Track your active software recurring licenses, billing schedules, and contract status."
    >
      <div className="space-y-6">
        {bannerNotice && (
          <Alert
            type={bannerNotice.type}
            message={bannerNotice.message}
            onClose={() => setBannerNotice(null)}
          />
        )}

        {/* Customer Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Subscriptions</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Software services operational</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Recurring Commitment</p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                ₹{totalCommitment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Across active contract intervals</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Subscriptions Table Card */}
        <Card>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                <p className="text-xs text-slate-500">Loading your subscriptions...</p>
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="p-8 text-center">
                <EmptyState
                  icon={CreditCard}
                  title="No active subscriptions yet"
                  description="You do not have any active subscriptions. Accept an issued quotation to get your subscription activated."
                />
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Contract ID</th>
                    <th className="py-3 px-4">Software Plans</th>
                    <th className="py-3 px-4">Billing Schedule</th>
                    <th className="py-3 px-4 text-right">Recurring Fee</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>{sub.subscription_number}</span>
                        </div>
                        {sub.source_quotation_number && (
                          <span className="text-[11px] font-normal text-slate-400 block mt-0.5">
                            From Quote #{sub.source_quotation_number}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-semibold text-slate-800">
                          {sub.items?.length || 0} Plan Components
                        </p>
                        <p className="text-[11px] text-slate-500 truncate max-w-xs">
                          {sub.items?.map((it) => it.product_name).join(', ')}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        <p>
                          <span className="text-slate-400">Start:</span> {sub.start_date}
                        </p>
                        <p className="text-[11px]">
                          <span className="text-slate-400">Next Billing:</span>{' '}
                          <strong className="text-indigo-600">{sub.next_billing_date || 'N/A'}</strong>
                        </p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="font-black text-slate-900">
                          ₹{Number(sub.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-slate-400">{sub.payment_terms || 'Net 30'}</p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <SubscriptionStatusBadge status={sub.status} isPaused={sub.is_paused} />
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          icon={Eye}
                          onClick={() => setSelectedSub(sub)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      {/* Subscription Detail Modal */}
      <Modal
        isOpen={!!selectedSub}
        onClose={() => setSelectedSub(null)}
        title={selectedSub ? `Subscription #${selectedSub.subscription_number}` : ''}
      >
        {selectedSub && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-slate-400">Commenced:</span>{' '}
                <strong className="text-slate-700">{selectedSub.start_date}</strong>
                <span className="mx-2">•</span>
                <span className="text-slate-400">Next Due:</span>{' '}
                <strong className="text-indigo-600">{selectedSub.next_billing_date || 'None scheduled'}</strong>
              </div>
              <SubscriptionStatusBadge status={selectedSub.status} isPaused={selectedSub.is_paused} />
            </div>

            {/* Plan Components */}
            <div>
              <p className="font-bold text-slate-800 mb-2">Subscribed Plan Items</p>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {selectedSub.items?.map((item) => (
                  <div key={item.id} className="p-3 bg-white flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900">{item.product_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-indigo-600 font-semibold">{item.plan_name}</span>
                        <BillingIntervalBadge interval={item.billing_interval} />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        ₹{Number(item.unit_price).toLocaleString('en-IN')} × {item.quantity} qty
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">
                        ₹{Number(item.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Breakdown */}
            <div className="p-3 bg-slate-50 rounded-lg space-y-1.5 text-right">
              <div className="flex justify-between text-slate-600">
                <span>Total Recurring Value:</span>
                <span className="font-black text-sm text-indigo-600">
                  ₹{Number(selectedSub.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Payment Terms: {selectedSub.payment_terms || 'Net 30'} • Currency: {selectedSub.currency}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedSub(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
};

export default CustomerSubscriptionListPage;

