import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { InvoiceStatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import invoiceService from '../../services/invoiceService';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Download,
  AlertTriangle,
  RotateCw,
  Loader2,
  CreditCard,
  Calendar,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Clock,
  Send,
  Layers,
} from 'lucide-react';

export const InvoiceListPage = () => {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [bannerNotice, setBannerNotice] = useState(null);

  // Billing Run Modal State
  const [billingRunning, setBillingRunning] = useState(false);
  const [billingModalResult, setBillingModalResult] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (filterOverdue) params.is_overdue = true;

      const data = await invoiceService.getInvoices(params);
      const list = data?.results || (Array.isArray(data) ? data : []);
      setInvoices(list);
    } catch (err) {
      console.error('Failed to load invoices', err);
      setBannerNotice({ type: 'danger', message: 'Could not load invoices ledger.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [selectedStatus, filterOverdue]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchInvoices();
  };

  const handleRunBillingCycle = async () => {
    try {
      setBillingRunning(true);
      const result = await invoiceService.runManualBilling();
      setBillingModalResult(result);
      await fetchInvoices();
    } catch (err) {
      console.error('Billing run failed', err);
      setBannerNotice({ type: 'danger', message: err.response?.data?.detail || 'Billing run encountered an error.' });
    } finally {
      setBillingRunning(false);
    }
  };

  const handleDownloadPDF = async (inv) => {
    try {
      setDownloadingId(inv.id);
      await invoiceService.downloadPDF(inv.id, `${inv.invoice_number}.pdf`);
    } catch (err) {
      console.error('PDF download failed', err);
      setBannerNotice({ type: 'danger', message: 'Unable to stream invoice PDF.' });
    } finally {
      setDownloadingId(null);
    }
  };

  // Financial aggregates from loaded invoices
  const totalBilled = invoices.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
  const totalPaid = invoices.reduce((acc, curr) => acc + Number(curr.amount_paid || 0), 0);
  const totalOutstanding = invoices.reduce((acc, curr) => acc + Number(curr.outstanding_amount || 0), 0);
  const overdueCount = invoices.filter((i) => i.is_overdue).length;

  return (
    <DashboardLayout
      title="Invoice Management"
      subtitle="Track recurring customer invoices, statutory tax breakdowns, outstanding receivables and payment reconciliations."
    >
      <div className="space-y-6">
        {bannerNotice && (
          <Alert
            type={bannerNotice.type}
            message={bannerNotice.message}
            onClose={() => setBannerNotice(null)}
          />
        )}

        {/* Top Financial Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Billed</p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                ₹{totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{invoices.length} invoices generated</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Revenue Settled</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                ₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">Verified payments</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Balance Due</p>
              <p className="text-2xl font-black text-amber-600 mt-1">
                ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">Outstanding receivables</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Overdue Invoices</p>
              <p className="text-2xl font-black text-rose-600 mt-1">{overdueCount}</p>
              <Link to="/admin/invoices/overdue" className="text-[11px] text-rose-600 hover:underline mt-0.5 block">
                Inspect aging queue →
              </Link>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Action Header & Filter Bar */}
        <Card>
          <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-4 justify-between items-center">
            {/* Search Input */}
            <form onSubmit={handleSearch} className="w-full md:w-80 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search invoice number, customer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm">
                Search
              </Button>
            </form>

            {/* Filter Tabs and Quick Actions */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center rounded-lg bg-slate-100 p-1 text-xs font-semibold">
                {['ALL', 'CONFIRMED', 'PAID', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setSelectedStatus(st);
                      setFilterOverdue(false);
                    }}
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      selectedStatus === st && !filterOverdue
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'ALL' ? 'All Invoices' : st}
                  </button>
                ))}
                <button
                  onClick={() => setFilterOverdue(!filterOverdue)}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    filterOverdue ? 'bg-rose-100 text-rose-800 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Overdue
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                icon={billingRunning ? Loader2 : RotateCw}
                onClick={handleRunBillingCycle}
                disabled={billingRunning}
              >
                {billingRunning ? 'Billing...' : 'Run Billing Cycle'}
              </Button>

              <Link to="/admin/invoices/new">
                <Button variant="primary" size="sm" icon={Plus}>
                  Generate Invoice
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Invoices Table */}
        <Card>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                <p className="text-xs text-slate-500">Loading invoice records...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-8 text-center">
                <EmptyState
                  icon={FileText}
                  title="No invoices found"
                  description="Invoices are generated automatically during recurring billing runs or manually from active subscriptions."
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      icon={RotateCw}
                      onClick={handleRunBillingCycle}
                    >
                      Run Billing Engine Now
                    </Button>
                  }
                />
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Subscription</th>
                    <th className="py-3 px-4">Billing Period & Due</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Outstanding</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <Link
                          to={`/admin/invoices/${inv.id}`}
                          className="hover:text-indigo-600 flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{inv.invoice_number}</span>
                        </Link>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Issued {inv.invoice_date}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{inv.customer_name}</p>
                        <p className="text-[11px] text-slate-400">{inv.customer_email}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        {inv.subscription_number ? (
                          <Link
                            to={`/admin/subscriptions/${inv.subscription}`}
                            className="text-indigo-600 hover:underline font-medium"
                          >
                            {inv.subscription_number}
                          </Link>
                        ) : (
                          <span className="text-slate-400">Direct Invoice</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <p>
                          {inv.billing_period_start} to {inv.billing_period_end}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Due: <strong className={inv.is_overdue ? 'text-rose-600' : 'text-slate-700'}>{inv.due_date}</strong>
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        ₹{Number(inv.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={`font-bold ${Number(inv.outstanding_amount) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          ₹{Number(inv.outstanding_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <InvoiceStatusBadge
                          status={inv.status}
                          isOverdue={inv.is_overdue}
                          daysOverdue={inv.days_overdue}
                        />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link to={`/admin/invoices/${inv.id}`}>
                            <Button variant="ghost" size="xs" icon={Eye}>
                              View
                            </Button>
                          </Link>

                          <Button
                            variant="ghost"
                            size="xs"
                            icon={downloadingId === inv.id ? Loader2 : Download}
                            disabled={downloadingId === inv.id}
                            onClick={() => handleDownloadPDF(inv)}
                          >
                            PDF
                          </Button>

                          {Number(inv.outstanding_amount) > 0 && inv.status !== 'CANCELLED' && (
                            <Link to={`/admin/payments/record?invoice=${inv.id}`}>
                              <Button
                                variant="outline"
                                size="xs"
                                icon={CreditCard}
                                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              >
                                Pay
                              </Button>
                            </Link>
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

      {/* Billing Cycle Completion Modal */}
      <Modal
        isOpen={!!billingModalResult}
        onClose={() => setBillingModalResult(null)}
        title="Billing Engine Execution Completed"
      >
        <div className="space-y-4 text-sm">
          <div className="p-4 bg-indigo-50/80 rounded-xl border border-indigo-100 space-y-2">
            <p className="font-bold text-indigo-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              Cycle Reconciliation Summary
            </p>
            <div className="grid grid-cols-3 gap-2 text-center pt-2">
              <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                <span className="text-[11px] text-slate-400 block font-semibold">Evaluated</span>
                <span className="text-lg font-black text-slate-800">{billingModalResult?.subscriptions_evaluated || 0}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                <span className="text-[11px] text-emerald-600 block font-semibold">Generated</span>
                <span className="text-lg font-black text-emerald-600">{billingModalResult?.invoices_generated || 0}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-rose-100">
                <span className="text-[11px] text-rose-600 block font-semibold">Failed</span>
                <span className="text-lg font-black text-rose-600">{billingModalResult?.failed_count || 0}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Next recurring billing dates for processed subscriptions have been updated. Idempotency guarantees prevent duplicate billing for completed periods.
          </p>

          <div className="flex justify-end pt-3">
            <Button variant="primary" onClick={() => setBillingModalResult(null)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default InvoiceListPage;

