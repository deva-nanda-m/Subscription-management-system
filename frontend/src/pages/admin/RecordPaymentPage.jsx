import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import invoiceService from '../../services/invoiceService';
import paymentService from '../../services/paymentService';
import {
  CreditCard,
  ArrowLeft,
  FileText,
  User,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Receipt,
  Search,
} from 'lucide-react';

export const RecordPaymentPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedInvoiceId = searchParams.get('invoice');

  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    invoice_id: preselectedInvoiceId || '',
    amount: '',
    payment_method: 'BANK_TRANSFER',
    payment_date: new Date().toISOString().split('T')[0],
    transaction_reference: '',
    notes: '',
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      // Fetch invoices that have outstanding balance
      const data = await invoiceService.getInvoices({ page_size: 100 });
      const list = data?.results || (Array.isArray(data) ? data : []);
      // Filter unpaid / partially paid / confirmed
      const payableInvoices = list.filter(
        (inv) =>
          inv.status !== 'CANCELLED' &&
          inv.status !== 'PAID' &&
          parseFloat(inv.outstanding_amount || 0) > 0
      );
      setInvoices(payableInvoices);

      if (preselectedInvoiceId) {
        // Also fetch the specific invoice in case it wasn't in the first page
        try {
          const inv = await invoiceService.getInvoice(preselectedInvoiceId);
          setSelectedInvoice(inv);
          setFormData((prev) => ({
            ...prev,
            invoice_id: inv.id,
            amount: String(inv.outstanding_amount || ''),
          }));
        } catch {
          // fallback to matching in payableInvoices
          const found = payableInvoices.find((i) => String(i.id) === String(preselectedInvoiceId));
          if (found) {
            setSelectedInvoice(found);
            setFormData((prev) => ({
              ...prev,
              invoice_id: found.id,
              amount: String(found.outstanding_amount || ''),
            }));
          }
        }
      }
    } catch (err) {
      console.error('Failed to load eligible invoices', err);
      setError('Could not fetch eligible invoices for payment recording.');
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceChange = (e) => {
    const invId = e.target.value;
    const inv = invoices.find((i) => String(i.id) === String(invId));
    setSelectedInvoice(inv || null);
    setFormData((prev) => ({
      ...prev,
      invoice_id: invId,
      amount: inv ? String(inv.outstanding_amount || '') : '',
    }));
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.invoice_id) {
      setError('Please select an invoice.');
      return;
    }
    const payAmt = parseFloat(formData.amount);
    if (isNaN(payAmt) || payAmt <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }
    if (selectedInvoice && payAmt > parseFloat(selectedInvoice.outstanding_amount || 0)) {
      setError(
        `Amount cannot exceed the remaining balance of ₹${selectedInvoice.outstanding_amount}.`
      );
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const payload = {
        invoice_id: Number(formData.invoice_id),
        amount: payAmt.toFixed(2),
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        transaction_reference: formData.transaction_reference.trim(),
        notes: formData.notes.trim(),
      };

      const result = await paymentService.recordManualPayment(payload);
      navigate(`/admin/invoices/${formData.invoice_id}`, {
        state: {
          message: `Payment of ₹${payAmt.toFixed(2)} recorded successfully (Ref: ${result.payment_reference}).`,
        },
      });
    } catch (err) {
      console.error('Failed to record payment', err);
      const msg =
        err.response?.data?.amount?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        'Failed to record offline collection payment.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="Record Offline Payment"
      subtitle="Manually settle customer invoices via Bank Transfer, UPI, Cheque, or Cash"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/admin/payments"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Payments Ledger
          </Link>
        </div>

        {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Main Form */}
          <div className="md:col-span-8">
            <Card>
              <CardHeader className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  Manual Payment Specification
                </h3>
              </CardHeader>
              <CardBody className="p-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Select Invoice */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Invoice <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.invoice_id}
                      onChange={handleInvoiceChange}
                      required
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    >
                      <option value="">-- Select an Outstanding Invoice --</option>
                      {invoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoice_number} – {inv.customer_name} (₹{inv.outstanding_amount} due)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Amount */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Amount to Pay (INR) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          name="amount"
                          value={formData.amount}
                          onChange={handleChange}
                          placeholder="0.00"
                          required
                          className="w-full pl-8 pr-3 py-2 text-sm font-bold text-slate-800 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      {selectedInvoice && (
                        <p className="text-[11px] text-slate-400 mt-1">
                          Max allowable: ₹{parseFloat(selectedInvoice.outstanding_amount || 0).toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Payment Method <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="payment_method"
                        value={formData.payment_method}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                        <option value="UPI">UPI / QR Code</option>
                        <option value="CARD">Debit / Credit Card (POS/Terminal)</option>
                        <option value="CASH">Cash</option>
                        <option value="OTHER">Cheque / Demand Draft / Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Payment Date */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Payment Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="payment_date"
                        value={formData.payment_date}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Transaction Reference */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Bank UTR / Transaction / Cheque #
                      </label>
                      <input
                        type="text"
                        name="transaction_reference"
                        value={formData.transaction_reference}
                        onChange={handleChange}
                        placeholder="e.g. UTR198273648 or CHQ-0012"
                        className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Internal Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Audit Notes / Internal Memo
                    </label>
                    <textarea
                      rows={3}
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="e.g. Verified against HDFC bank statement dated 31/10/2026..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/admin/payments')}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Reconciling & Recording...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Record & Settle Invoice
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>

          {/* Invoice Summary Side Panel */}
          <div className="md:col-span-4">
            <Card>
              <CardHeader className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Invoice Balance Summary
                </h3>
              </CardHeader>
              <CardBody className="p-4 space-y-3">
                {selectedInvoice ? (
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Invoice Reference</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {selectedInvoice.invoice_number}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Billed Customer</span>
                      <span className="font-semibold text-slate-800">
                        {selectedInvoice.customer_name}
                      </span>
                      <span className="text-slate-500 block">{selectedInvoice.customer_email}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block">Invoice Date</span>
                        <span className="font-medium text-slate-700">{selectedInvoice.invoice_date}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Due Date</span>
                        <span className="font-medium text-slate-700">{selectedInvoice.due_date}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Gross Billed Total:</span>
                        <span className="font-semibold text-slate-800">
                          ₹{parseFloat(selectedInvoice.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Already Paid:</span>
                        <span className="font-semibold text-emerald-600">
                          ₹{parseFloat(selectedInvoice.amount_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200">
                        <span className="font-bold text-slate-700">Balance Due:</span>
                        <span className="font-extrabold text-rose-600 text-sm">
                          ₹{parseFloat(selectedInvoice.outstanding_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 text-[11px] flex gap-1.5 mt-3">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
                      <div>
                        Recording this payment will immediately update the invoice balance and mark it as{' '}
                        <strong>PAID</strong> if the balance reaches zero.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-1 opacity-50" />
                    <p className="text-xs">No invoice selected yet</p>
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

export default RecordPaymentPage;

