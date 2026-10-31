import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import invoiceService from '../../services/invoiceService';
import subscriptionService from '../../services/subscriptionService';
import {
  FileText,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Layers,
  User,
  Shield,
  CreditCard,
  PlusCircle,
} from 'lucide-react';

export const CreateInvoicePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedSubId = searchParams.get('subscription');

  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [selectedSubId, setSelectedSubId] = useState(preselectedSubId || '');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    fetchActiveSubscriptions();
  }, []);

  const fetchActiveSubscriptions = async () => {
    try {
      setLoading(true);
      const data = await subscriptionService.getSubscriptions({ status: 'ACTIVE' });
      const list = data?.results || (Array.isArray(data) ? data : []);
      setSubscriptions(list);

      if (preselectedSubId) {
        const found = list.find((s) => String(s.id) === String(preselectedSubId));
        if (found) {
          setSelectedSubscription(found);
          setSelectedSubId(found.id);
        }
      }
    } catch (err) {
      console.error('Failed to load active subscriptions', err);
      setError('Could not fetch active subscriptions list.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSubscription = (sub) => {
    setSelectedSubscription(sub);
    setSelectedSubId(sub.id);
    setError('');
  };

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    if (!selectedSubId) {
      setError('Please select an active subscription to generate an invoice for.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const response = await invoiceService.createInvoice({
        subscription_id: Number(selectedSubId),
        notes: notes.trim(),
      });

      // Navigate to created / fetched invoice detail page
      navigate(`/admin/invoices/${response.id}`, {
        state: { message: `Invoice #${response.invoice_number} successfully generated.` },
      });
    } catch (err) {
      console.error('Failed to create invoice', err);
      const msg =
        err.response?.data?.subscription_id?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        'Failed to generate invoice for the selected subscription.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const q = searchFilter.toLowerCase();
    const subNum = (sub.subscription_number || '').toLowerCase();
    const custName = (sub.customer_name || '').toLowerCase();
    const custEmail = (sub.customer_email || '').toLowerCase();
    return subNum.includes(q) || custName.includes(q) || custEmail.includes(q);
  });

  return (
    <DashboardLayout
      title="Generate Invoice"
      subtitle="Issue an ad-hoc or cycle tax invoice for an active recurring subscription"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Back Link */}
        <div className="flex items-center justify-between">
          <Link
            to="/admin/invoices"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Invoices Ledger
          </Link>
        </div>

        {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Subscription Selector */}
          <div className="lg:col-span-6 space-y-4">
            <Card>
              <CardHeader className="border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    1. Select Active Subscription
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                    {subscriptions.length} Eligible
                  </span>
                </div>
              </CardHeader>
              <CardBody className="p-4 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search by subscription # or customer name..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {loading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                    <span className="text-xs">Loading subscriptions...</span>
                  </div>
                ) : filteredSubscriptions.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-75" />
                    <p className="text-sm font-medium">No active subscriptions found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Only active, non-paused subscriptions can be invoiced.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                    {filteredSubscriptions.map((sub) => {
                      const isSelected = String(selectedSubId) === String(sub.id);
                      return (
                        <div
                          key={sub.id}
                          onClick={() => handleSelectSubscription(sub)}
                          className={`p-3 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-600'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-900">
                                  {sub.subscription_number}
                                </span>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                  {sub.billing_interval || 'MONTHLY'}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-slate-800 mt-1">
                                {sub.customer_name || 'Customer'}
                              </p>
                              <p className="text-xs text-slate-500">{sub.customer_email}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-extrabold text-slate-900">
                                ₹{parseFloat(sub.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Next: {sub.next_billing_date || 'Today'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Right Column: Invoice Details & Action */}
          <div className="lg:col-span-6 space-y-4">
            <Card>
              <CardHeader className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  2. Invoice Details & Confirmation
                </h3>
              </CardHeader>
              <CardBody className="p-4 space-y-4">
                {selectedSubscription ? (
                  <div className="space-y-4">
                    {/* Subscription Summary Box */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="text-xs font-semibold text-slate-500 uppercase">Selected Subscription</span>
                        <span className="text-xs font-mono font-bold text-indigo-700">
                          {selectedSubscription.subscription_number}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block">Customer</span>
                          <span className="font-semibold text-slate-800">
                            {selectedSubscription.customer_name}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Billing Frequency</span>
                          <span className="font-semibold text-slate-800">
                            {selectedSubscription.billing_interval || 'MONTHLY'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Current Period End</span>
                          <span className="font-semibold text-slate-800">
                            {selectedSubscription.current_period_end || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Next Scheduled Billing</span>
                          <span className="font-semibold text-slate-800">
                            {selectedSubscription.next_billing_date || 'Immediate'}
                          </span>
                        </div>
                      </div>

                      {/* Items Preview */}
                      {selectedSubscription.items && selectedSubscription.items.length > 0 && (
                        <div className="pt-2 border-t border-slate-200">
                          <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                            Included Subscribed Line Items:
                          </span>
                          <div className="space-y-1">
                            {selectedSubscription.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-xs text-slate-700">
                                <span className="truncate pr-2">
                                  {item.product_name} {item.variant_name ? `(${item.variant_name})` : ''} × {item.quantity}
                                </span>
                                <span className="font-medium shrink-0">
                                  ₹{parseFloat(item.line_total || item.line_subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Estimated Total Commitment</span>
                        <span className="text-base font-extrabold text-indigo-600">
                          ₹{parseFloat(selectedSubscription.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Operational Notes */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Invoice Remarks / Billing Notes (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add special terms, payment instructions, or invoice memos..."
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        These notes will be stamped onto the final generated vector PDF invoice.
                      </p>
                    </div>

                    {/* Confirmation Callout */}
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        Generating an invoice evaluates active discounts and statutory tax rates, increments the subscription billing cycle, and logs a permanent billing transaction.
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        type="button"
                        onClick={handleGenerateInvoice}
                        disabled={submitting}
                        className="w-full py-2.5 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-100"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Calculating & Generating Invoice...
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-4 h-4" />
                            Generate Tax Invoice Now
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center text-slate-400">
                    <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-600">No Subscription Selected</p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                      Pick an active subscription from the left list to review its line items and issue a cycle invoice.
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreateInvoicePage;

