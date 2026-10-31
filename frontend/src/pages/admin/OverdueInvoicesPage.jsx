import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { InvoiceStatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import invoiceService from '../../services/invoiceService';
import {
  AlertTriangle,
  Clock,
  DollarSign,
  Mail,
  Download,
  CreditCard,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Calendar,
  Send,
  Loader2,
  FileText,
  User,
  ShieldAlert,
} from 'lucide-react';

export const OverdueInvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [agingFilter, setAgingFilter] = useState('ALL'); // ALL, 1-15, 16-30, 31+
  const [bannerNotice, setBannerNotice] = useState(null);

  // Email Reminder State
  const [sendingEmailId, setSendingEmailId] = useState(null);
  const [emailModalInvoice, setEmailModalInvoice] = useState(null);
  const [reminderCustomMessage, setReminderCustomMessage] = useState('');
  const [submittingReminder, setSubmittingReminder] = useState(false);

  const fetchOverdueInvoices = async () => {
    try {
      setLoading(true);
      const data = await invoiceService.getOverdueInvoices({
        search: search.trim() || undefined,
      });
      const list = data?.results || (Array.isArray(data) ? data : []);
      setInvoices(list);
    } catch (err) {
      console.error('Failed to load overdue invoices queue', err);
      setBannerNotice({
        type: 'danger',
        message: 'Could not fetch overdue invoices aging queue.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdueInvoices();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOverdueInvoices();
  };

  const handleDownloadPDF = async (inv) => {
    try {
      await invoiceService.downloadPDF(inv.id, `${inv.invoice_number}.pdf`);
    } catch (err) {
      console.error('PDF download failed', err);
      setBannerNotice({ type: 'danger', message: 'Failed to download invoice PDF.' });
    }
  };

  const handleOpenReminderModal = (inv) => {
    setEmailModalInvoice(inv);
    setReminderCustomMessage(
      `Dear ${inv.customer_name},\n\nThis is a friendly reminder that invoice ${inv.invoice_number} for ₹${inv.outstanding_amount} was due on ${inv.due_date} (${inv.days_overdue || 0} days ago).\n\nPlease make payment at your earliest convenience to maintain uninterrupted subscription service.\n\nBest regards,\nBrightloop Software Billing Operations`
    );
  };

  const handleSendReminder = async () => {
    if (!emailModalInvoice) return;
    try {
      setSubmittingReminder(true);
      await invoiceService.sendInvoiceEmail(emailModalInvoice.id, {
        recipient_email: emailModalInvoice.customer_email,
        subject: `Payment Reminder: Brightloop Overdue Invoice #${emailModalInvoice.invoice_number}`,
        message: reminderCustomMessage,
      });
      setBannerNotice({
        type: 'success',
        message: `Overdue payment reminder dispatched to ${emailModalInvoice.customer_email}`,
      });
      setEmailModalInvoice(null);
    } catch (err) {
      console.error('Failed to send overdue reminder', err);
      setBannerNotice({
        type: 'danger',
        message: 'Failed to dispatch email reminder. Please check mail server settings.',
      });
    } finally {
      setSubmittingReminder(false);
    }
  };

  // Filter by aging bracket
  const filteredInvoices = invoices.filter((inv) => {
    const days = inv.days_overdue || 0;
    if (agingFilter === '1-15') return days >= 1 && days <= 15;
    if (agingFilter === '16-30') return days >= 16 && days <= 30;
    if (agingFilter === '31+') return days > 30;
    return true;
  });

  // KPI Calculations
  const totalOverdueCount = invoices.length;
  const totalOverdueAmount = invoices.reduce(
    (sum, inv) => sum + parseFloat(inv.outstanding_amount || 0),
    0
  );
  const criticalOverdueCount = invoices.filter((i) => (i.days_overdue || 0) > 30).length;
  const criticalOverdueAmount = invoices
    .filter((i) => (i.days_overdue || 0) > 30)
    .reduce((sum, inv) => sum + parseFloat(inv.outstanding_amount || 0), 0);

  return (
    <DashboardLayout
      title="Overdue Invoices Queue"
      subtitle="Monitor payment defaults, aging buckets, and dispatch collection notices"
    >
      <div className="space-y-6">
        {bannerNotice && (
          <Alert
            type={bannerNotice.type}
            message={bannerNotice.message}
            onClose={() => setBannerNotice(null)}
          />
        )}

        {/* Executive Aging KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-rose-500">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Total Overdue Receivables</p>
                <h3 className="text-2xl font-black text-rose-700 mt-1">
                  ₹{totalOverdueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
                <span className="text-xs text-rose-600 font-medium">{totalOverdueCount} delinquent accounts</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">1 – 15 Days Aging</p>
                <h3 className="text-2xl font-black text-amber-700 mt-1">
                  {invoices.filter((i) => (i.days_overdue || 0) <= 15).length}
                </h3>
                <span className="text-xs text-slate-500">First-stage follow-up</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                <Clock className="w-6 h-6" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">16 – 30 Days Aging</p>
                <h3 className="text-2xl font-black text-orange-700 mt-1">
                  {invoices.filter((i) => (i.days_overdue || 0) > 15 && (i.days_overdue || 0) <= 30).length}
                </h3>
                <span className="text-xs text-slate-500">Escalated reminder</span>
              </div>
              <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
                <Mail className="w-6 h-6" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-red-600">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Critical (30+ Days)</p>
                <h3 className="text-2xl font-black text-red-800 mt-1">
                  ₹{criticalOverdueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
                <span className="text-xs text-red-600 font-bold">{criticalOverdueCount} at-risk accounts</span>
              </div>
              <div className="p-3 rounded-xl bg-red-50 text-red-600">
                <ShieldAlert className="w-6 h-6" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <Card>
          <CardBody className="p-4">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <form onSubmit={handleSearch} className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by invoice #, customer name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </form>

              {/* Aging Buckets Filter */}
              <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Aging:
                </span>
                {[
                  { key: 'ALL', label: 'All Overdue' },
                  { key: '1-15', label: '1–15 Days' },
                  { key: '16-30', label: '16–30 Days' },
                  { key: '31+', label: '30+ Days Critical' },
                ].map((bracket) => (
                  <button
                    key={bracket.key}
                    onClick={() => setAgingFilter(bracket.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      agingFilter === bracket.key
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {bracket.label}
                  </button>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Overdue Aging Table */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800">Delinquent Invoices Aging Ledger</h3>
              <p className="text-xs text-slate-500">
                Showing {filteredInvoices.length} invoices with past-due balances requiring action
              </p>
            </div>
            <Link
              to="/admin/payments/record"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Record Offline Collection
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span className="text-xs">Scanning overdue receivables ledger...</span>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Zero Overdue Invoices in this Bracket"
                description="No outstanding delinquent receivables found under selected aging criteria."
                className="py-12"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Days Overdue</th>
                      <th className="py-3 px-4 text-right">Billed Total</th>
                      <th className="py-3 px-4 text-right">Outstanding Due</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredInvoices.map((inv) => {
                      const days = inv.days_overdue || 0;
                      const isHighRisk = days > 30;

                      return (
                        <tr
                          key={inv.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isHighRisk ? 'bg-rose-50/30' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            <Link
                              to={`/admin/invoices/${inv.id}`}
                              className="text-indigo-600 hover:underline hover:text-indigo-800"
                            >
                              {inv.invoice_number}
                            </Link>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{inv.customer_name}</div>
                            <div className="text-xs text-slate-400">{inv.customer_email}</div>
                          </td>
                          <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                            {inv.due_date}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                                isHighRisk
                                  ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-300'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              {days} {days === 1 ? 'day' : 'days'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-slate-700">
                            ₹{parseFloat(inv.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-rose-700">
                            ₹{parseFloat(inv.outstanding_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <InvoiceStatusBadge status={inv.status} isOverdue={true} />
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick Send Reminder Button */}
                              <button
                                onClick={() => handleOpenReminderModal(inv)}
                                title="Send Email Reminder Notice"
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                              >
                                <Mail className="w-4 h-4" />
                              </button>

                              {/* Download PDF */}
                              <button
                                onClick={() => handleDownloadPDF(inv)}
                                title="Download Vector PDF"
                                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
                              >
                                <Download className="w-4 h-4" />
                              </button>

                              {/* Record Offline Payment */}
                              <Link
                                to={`/admin/payments/record?invoice=${inv.id}`}
                                title="Record Collection Payment"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                              >
                                <CreditCard className="w-4 h-4" />
                              </Link>

                              {/* View Detail */}
                              <Link
                                to={`/admin/invoices/${inv.id}`}
                                title="View Specifications"
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Send Email Reminder Modal */}
        <Modal
          isOpen={!!emailModalInvoice}
          onClose={() => !submittingReminder && setEmailModalInvoice(null)}
          title={`Dispatch Overdue Payment Notice - ${emailModalInvoice?.invoice_number}`}
        >
          {emailModalInvoice && (
            <div className="space-y-4">
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-800 flex justify-between items-center">
                <div>
                  <span className="font-bold">Recipient:</span> {emailModalInvoice.customer_name} ({emailModalInvoice.customer_email})
                </div>
                <div className="font-mono font-bold text-rose-900">
                  ₹{emailModalInvoice.outstanding_amount} Due ({emailModalInvoice.days_overdue}d overdue)
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notice Message Content
                </label>
                <textarea
                  rows={6}
                  value={reminderCustomMessage}
                  onChange={(e) => setReminderCustomMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEmailModalInvoice(null)}
                  disabled={submittingReminder}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSendReminder}
                  disabled={submittingReminder}
                  className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5"
                >
                  {submittingReminder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Dispatching Reminder...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Collection Notice
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default OverdueInvoicesPage;

