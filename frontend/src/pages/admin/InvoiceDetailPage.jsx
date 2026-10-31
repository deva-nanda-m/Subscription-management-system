import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { InvoiceStatusBadge, PaymentStatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import invoiceService from '../../services/invoiceService';
import paymentService from '../../services/paymentService';
import {
  FileText,
  ArrowLeft,
  Download,
  Send,
  CheckCircle2,
  XCircle,
  CreditCard,
  DollarSign,
  AlertTriangle,
  Loader2,
  Calendar,
  Layers,
  Clock,
  History,
  ShieldCheck,
  Mail,
  User,
  Plus,
} from 'lucide-react';

export const InvoiceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bannerNotice, setBannerNotice] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Email Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({
    recipient_email: '',
    subject: '',
    message: '',
  });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Payment Recording Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: '',
    payment_method: 'CASH',
    transaction_reference: '',
    notes: '',
  });
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');

  const fetchInvoiceData = async () => {
    try {
      setLoading(true);
      const [invData, payData] = await Promise.all([
        invoiceService.getInvoice(id),
        paymentService.getPayments({ invoice: id }).catch(() => []),
      ]);
      setInvoice(invData);
      setPayments(Array.isArray(payData) ? payData : payData?.results || []);
      setEmailForm({
        recipient_email: invData.customer_email || '',
        subject: `Brightloop Tax Invoice #${invData.invoice_number}`,
        message: '',
      });
      setPayForm((prev) => ({
        ...prev,
        amount: String(invData.outstanding_amount || ''),
      }));
    } catch (err) {
      console.error('Failed to load invoice record', err);
      setBannerNotice({
        type: 'danger',
        message: 'Failed to retrieve invoice specifications.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceData();
  }, [id]);

  const handleDownloadPDF = async () => {
    try {
      setDownloadingPdf(true);
      await invoiceService.downloadPDF(id, `${invoice.invoice_number}.pdf`);
    } catch (err) {
      console.error('PDF download error', err);
      setBannerNotice({ type: 'danger', message: 'Could not generate invoice PDF.' });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailError('');

    try {
      await invoiceService.sendInvoiceEmail(id, emailForm);
      setIsEmailModalOpen(false);
      setBannerNotice({
        type: 'success',
        message: `Invoice PDF successfully emailed to ${emailForm.recipient_email}.`,
      });
      await fetchInvoiceData();
    } catch (err) {
      console.error('Email send error', err);
      setEmailError(err.response?.data?.detail || 'Failed to dispatch invoice email.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleConfirmInvoice = async () => {
    try {
      await invoiceService.confirmInvoice(id);
      setBannerNotice({ type: 'success', message: 'Invoice confirmed and issued.' });
      await fetchInvoiceData();
    } catch (err) {
      setBannerNotice({ type: 'danger', message: err.response?.data?.detail || 'Failed to confirm invoice.' });
    }
  };

  const handleCancelInvoice = async () => {
    if (!window.confirm('Are you sure you want to cancel this invoice? This cannot be undone.')) return;
    try {
      await invoiceService.cancelInvoice(id);
      setBannerNotice({ type: 'warning', message: 'Invoice cancelled.' });
      await fetchInvoiceData();
    } catch (err) {
      setBannerNotice({ type: 'danger', message: err.response?.data?.detail || 'Failed to cancel invoice.' });
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setPayLoading(true);
    setPayError('');

    try {
      await paymentService.recordManualPayment({
        invoice_id: invoice.id,
        amount: parseFloat(payForm.amount),
        payment_method: payForm.payment_method,
        transaction_reference: payForm.transaction_reference.trim(),
        notes: payForm.notes.trim(),
      });
      setIsPayModalOpen(false);
      setBannerNotice({ type: 'success', message: 'Payment successfully credited and reconciled!' });
      await fetchInvoiceData();
    } catch (err) {
      console.error('Payment record error', err);
      const msg = err.response?.data?.amount?.[0] || err.response?.data?.detail || 'Failed to record payment.';
      setPayError(msg);
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Tax Invoice" subtitle="Loading invoice specifications...">
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-500">Retrieving invoice record...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout title="Invoice Not Found">
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Invoice Record Not Found</h2>
          <Link to="/admin/invoices" className="mt-6 inline-block">
            <Button variant="secondary" icon={ArrowLeft}>
              Return to Invoices List
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`Tax Invoice ${invoice.invoice_number}`}
      subtitle="Statutory tax breakdown, immutable line snapshots and payment transactions."
    >
      <div className="space-y-6">
        {/* Top Breadcrumb & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            to="/admin/invoices"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Invoices Ledger
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={downloadingPdf ? Loader2 : Download}
              onClick={handleDownloadPDF}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? 'Generating...' : 'Download PDF'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={Mail}
              onClick={() => setIsEmailModalOpen(true)}
            >
              Send Invoice Email
            </Button>

            {invoice.status === 'DRAFT' && (
              <Button
                variant="primary"
                size="sm"
                icon={CheckCircle2}
                onClick={handleConfirmInvoice}
              >
                Confirm & Issue
              </Button>
            )}

            {Number(invoice.outstanding_amount) > 0 && invoice.status !== 'CANCELLED' && (
              <Button
                variant="primary"
                size="sm"
                icon={CreditCard}
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setIsPayModalOpen(true)}
              >
                Record Payment
              </Button>
            )}

            {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
              <Button
                variant="danger"
                size="sm"
                icon={XCircle}
                onClick={handleCancelInvoice}
              >
                Cancel Invoice
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

        {/* Primary Invoice Header Card */}
        <Card>
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    {invoice.invoice_number}
                  </h1>
                  <InvoiceStatusBadge
                    status={invoice.status}
                    isOverdue={invoice.is_overdue}
                    daysOverdue={invoice.days_overdue}
                  />
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <span>Customer: <strong>{invoice.customer_name}</strong> ({invoice.customer_email})</span>
                  <span>•</span>
                  <span>Issued on {invoice.invoice_date}</span>
                </p>
              </div>

              {/* Financial Balances */}
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs uppercase font-bold text-slate-400">Total Billed</p>
                  <p className="text-2xl font-black text-slate-900">
                    ₹{Number(invoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Paid: ₹{Number(invoice.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="pl-6 border-l border-slate-200 text-right">
                  <p className="text-xs uppercase font-bold text-slate-400">Balance Outstanding</p>
                  <p className={`text-2xl font-black ${Number(invoice.outstanding_amount) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    ₹{Number(invoice.outstanding_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Terms: {invoice.payment_terms}
                  </p>
                </div>
              </div>
            </div>

            {/* Diagnostic Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 text-xs">
              <div>
                <span className="font-bold uppercase tracking-wider text-slate-400">Due Date</span>
                <p className={`text-sm font-black mt-1 ${invoice.is_overdue ? 'text-rose-600' : 'text-slate-800'}`}>
                  {invoice.due_date}
                </p>
                <p className="text-slate-500">
                  {invoice.is_overdue ? `Overdue by ${invoice.days_overdue} day(s)` : 'Within payment term'}
                </p>
              </div>

              <div>
                <span className="font-bold uppercase tracking-wider text-slate-400">Billing Period</span>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {invoice.billing_period_start} to {invoice.billing_period_end}
                </p>
                <p className="text-slate-500">Service Entitlement Window</p>
              </div>

              <div>
                <span className="font-bold uppercase tracking-wider text-slate-400">Subscription Link</span>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {invoice.subscription_number ? (
                    <Link
                      to={`/admin/subscriptions/${invoice.subscription}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {invoice.subscription_number}
                    </Link>
                  ) : (
                    'Direct Commercial Invoice'
                  )}
                </p>
                <p className="text-slate-500">Originating Contract</p>
              </div>

              <div>
                <span className="font-bold uppercase tracking-wider text-slate-400">Currency & Origin</span>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {invoice.currency} • Created by {invoice.created_by_name || 'Billing Daemon'}
                </p>
                <p className="text-slate-500">Statutory Tax Invoice</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Line Items Table Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">Invoiced Line Items & Tax Snapshots</h2>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {invoice.lines?.length || 0} Invoiced Components
              </span>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Product & Plan</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Discount</th>
                  <th className="py-3 px-4 text-right">Tax (Rate)</th>
                  <th className="py-3 px-4 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {invoice.lines?.map((line) => (
                  <tr key={line.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {line.product_name}
                      {line.variant_name && (
                        <span className="block text-[11px] font-normal text-slate-500">
                          Variant: {line.variant_name}
                        </span>
                      )}
                      <span className="block text-[11px] font-semibold text-indigo-600">
                        {line.plan_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      ₹{Number(line.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                      {line.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600">
                      {Number(line.discount_amount) > 0 ? `₹${Number(line.discount_amount).toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600">
                      ₹{Number(line.tax_amount).toLocaleString('en-IN')} ({line.tax_rate}%)
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      ₹{Number(line.line_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-6 bg-slate-50/60 border-t border-slate-200 flex flex-col md:flex-row justify-between gap-6">
            <div className="max-w-md">
              {invoice.notes && (
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-400">Notes / Remarks</span>
                  <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">{invoice.notes}</p>
                </div>
              )}
            </div>

            <div className="w-full md:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold">₹{Number(invoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {Number(invoice.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discounts Applied:</span>
                  <span className="font-semibold">-₹{Number(invoice.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>GST / Taxes:</span>
                <span className="font-semibold">+₹{Number(invoice.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                <span>Invoice Total:</span>
                <span>₹{Number(invoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Amount Paid:</span>
                <span className="font-bold">₹{Number(invoice.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="pt-1.5 border-t border-slate-200 flex justify-between text-xs font-black text-indigo-600">
                <span>Balance Due:</span>
                <span>₹{Number(invoice.outstanding_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Payments Ledger Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Payments & Settlements Ledger</h3>
              </div>
              {Number(invoice.outstanding_amount) > 0 && (
                <Button
                  variant="primary"
                  size="xs"
                  icon={Plus}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setIsPayModalOpen(true)}
                >
                  Record Payment
                </Button>
              )}
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            {payments.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No payment receipts recorded for this invoice yet.
              </p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                    <th className="py-2.5 px-4">Receipt Ref</th>
                    <th className="py-2.5 px-4">Method</th>
                    <th className="py-2.5 px-4">Payment Date</th>
                    <th className="py-2.5 px-4">Transaction Ref</th>
                    <th className="py-2.5 px-4 text-right">Amount Paid</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 px-4 font-bold text-slate-800">{p.payment_reference}</td>
                      <td className="py-3 px-4 font-semibold text-slate-600">{p.payment_method}</td>
                      <td className="py-3 px-4 text-slate-500">{p.payment_date}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {p.transaction_reference || p.razorpay_payment_id || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-600">
                        ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <PaymentStatusBadge status={p.payment_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Email Logs */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Email Delivery History</h3>
            </div>
          </CardHeader>
          <CardBody>
            {!invoice.email_logs || invoice.email_logs.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No email notifications dispatched for this invoice yet.
              </p>
            ) : (
              <div className="space-y-3">
                {invoice.email_logs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">To: {log.recipient_email}</p>
                      <p className="text-slate-600 text-[11px]">{log.subject}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(log.sent_at).toLocaleString()} by {log.sent_by_name || 'Staff'}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title={`Record Manual Payment for #${invoice.invoice_number}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4 text-sm">
          {payError && <Alert type="danger" message={payError} />}

          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900">
            Current Outstanding Balance: <strong>₹{Number(invoice.outstanding_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </div>

          <Input
            label="Payment Amount (₹)"
            type="number"
            step="0.01"
            min="0.01"
            max={invoice.outstanding_amount}
            value={payForm.amount}
            onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Method
            </label>
            <select
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-indigo-500 outline-none bg-white"
              value={payForm.payment_method}
              onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
            >
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS)</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Credit / Debit Card</option>
              <option value="OTHER">Other Offline Receipt</option>
            </select>
          </div>

          <Input
            label="Transaction Reference / UTR Number"
            placeholder="e.g. UTR1234567890"
            value={payForm.transaction_reference}
            onChange={(e) => setPayForm({ ...payForm, transaction_reference: e.target.value })}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Notes
            </label>
            <textarea
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-indigo-500 outline-none"
              rows={2}
              placeholder="Cheque clear confirmation, branch ref..."
              value={payForm.notes}
              onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setIsPayModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={payLoading}>
              {payLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Reconcile'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Send Email Modal */}
      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        title={`Email Invoice #${invoice.invoice_number}`}
      >
        <form onSubmit={handleSendEmail} className="space-y-4 text-sm">
          {emailError && <Alert type="danger" message={emailError} />}

          <Input
            label="Recipient Email"
            type="email"
            value={emailForm.recipient_email}
            onChange={(e) => setEmailForm({ ...emailForm, recipient_email: e.target.value })}
            required
          />

          <Input
            label="Subject"
            value={emailForm.subject}
            onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom Message (Optional)
            </label>
            <textarea
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-indigo-500 outline-none"
              rows={3}
              placeholder="Attached please find your invoice for this billing period..."
              value={emailForm.message}
              onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setIsEmailModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" icon={Send} type="submit" disabled={emailLoading}>
              {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Dispatch Invoice Email'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default InvoiceDetailPage;

