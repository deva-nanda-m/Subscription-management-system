import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { InvoiceStatusBadge, PaymentStatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Modal from '../../components/ui/Modal';
import invoiceService from '../../services/invoiceService';
import paymentService from '../../services/paymentService';
import {
  FileText,
  ArrowLeft,
  Download,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Layers,
  Clock,
  ShieldCheck,
  Receipt,
  User,
  Sparkles,
} from 'lucide-react';

export const CustomerInvoiceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [bannerNotice, setBannerNotice] = useState(null);

  // Razorpay Checkout State
  const [razorpayProcessing, setRazorpayProcessing] = useState(false);
  const [paymentSuccessModal, setPaymentSuccessModal] = useState(null);

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
      const [invData, payData] = await Promise.all([
        invoiceService.getInvoice(id),
        paymentService.getPayments({ invoice: id }).catch(() => []),
      ]);
      setInvoice(invData);
      setPayments(Array.isArray(payData) ? payData : payData?.results || []);
    } catch (err) {
      console.error('Failed to load invoice details', err);
      setBannerNotice({
        type: 'danger',
        message: 'Could not fetch invoice specifications.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceDetails();
  }, [id]);

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    try {
      setDownloadingPdf(true);
      await invoiceService.downloadPDF(invoice.id, `${invoice.invoice_number}.pdf`);
    } catch (err) {
      console.error('PDF download failed', err);
      setBannerNotice({ type: 'danger', message: 'Failed to download tax invoice PDF.' });
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Helper to dynamically load Razorpay checkout script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayCheckout = async () => {
    if (!invoice) return;
    try {
      setRazorpayProcessing(true);
      setBannerNotice(null);

      // 1. Ensure Razorpay script is loaded
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setBannerNotice({
          type: 'danger',
          message: 'Razorpay payment SDK failed to load. Please check your network connection.',
        });
        setRazorpayProcessing(false);
        return;
      }

      // 2. Create Razorpay order on backend
      const orderData = await paymentService.createRazorpayOrder(invoice.id);

      // 3. Configure Razorpay checkout options
      const options = {
        key: orderData.razorpay_key_id,
        amount: orderData.amount, // in paise
        currency: orderData.currency || 'INR',
        name: 'Brightloop Software',
        description: `Tax Invoice #${invoice.invoice_number}`,
        order_id: orderData.razorpay_order_id,
        prefill: {
          name: orderData.customer_name || invoice.customer_name,
          email: orderData.customer_email || invoice.customer_email,
        },
        theme: {
          color: '#4F46E5', // Indigo-600
        },
        handler: async function (response) {
          try {
            // 4. Verify payment with backend HMAC SHA256
            const verifyResult = await paymentService.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            setPaymentSuccessModal({
              payment_id: response.razorpay_payment_id,
              payment_reference: verifyResult.payment_reference,
              amount: invoice.outstanding_amount,
            });

            // Refresh invoice data
            await fetchInvoiceDetails();
          } catch (verifyErr) {
            console.error('Payment verification failed', verifyErr);
            setBannerNotice({
              type: 'danger',
              message:
                verifyErr.response?.data?.detail ||
                'Payment verification failed. If your account was debited, please contact support.',
            });
          } finally {
            setRazorpayProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setRazorpayProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        console.error('Payment failed at gateway', resp.error);
        setBannerNotice({
          type: 'danger',
          message: `Payment failed: ${resp.error?.description || 'Transaction was declined.'}`,
        });
        setRazorpayProcessing(false);
      });

      rzp.open();
    } catch (err) {
      console.error('Failed to initiate Razorpay order', err);
      setBannerNotice({
        type: 'danger',
        message: err.response?.data?.detail || 'Could not initiate Razorpay checkout order.',
      });
      setRazorpayProcessing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Invoice Specification">
        <div className="py-24 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-600" />
          <span className="text-sm">Loading invoice specifications...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout title="Invoice Not Found">
        <div className="text-center py-16 space-y-3">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Invoice Not Found</h2>
          <p className="text-sm text-slate-500">The requested tax invoice could not be located.</p>
          <Link
            to="/customer/invoices"
            className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Return to My Invoices
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const isUnpaid = invoice.status !== 'PAID' && parseFloat(invoice.outstanding_amount || 0) > 0;
  const isCancelled = invoice.status === 'CANCELLED';

  return (
    <DashboardLayout
      title={`Invoice #${invoice.invoice_number}`}
      subtitle="Official GST Tax Invoice and Payment Receipt"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link
            to="/customer/invoices"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Invoices
          </Link>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={downloadingPdf}
              className="flex items-center gap-1.5 text-xs"
            >
              {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Download PDF
            </Button>

            {isUnpaid && !isCancelled && (
              <Button
                size="sm"
                onClick={handleRazorpayCheckout}
                disabled={razorpayProcessing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
              >
                {razorpayProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Opening Checkout...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-3.5 h-3.5" />
                    Pay Now (₹{parseFloat(invoice.outstanding_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                  </>
                )}
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

        {/* Invoice Header Card */}
        <Card className="border border-slate-200">
          <CardBody className="p-6">
            <div className="flex flex-col md:flex-row justify-between gap-6 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl font-black text-slate-900">
                    {invoice.invoice_number}
                  </span>
                  <InvoiceStatusBadge status={invoice.status} isOverdue={invoice.is_overdue} />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Issued on <span className="font-semibold text-slate-700">{invoice.invoice_date}</span>
                  {invoice.due_date && (
                    <> • Due on <span className="font-semibold text-slate-700">{invoice.due_date}</span></>
                  )}
                </p>
                {invoice.subscription_number && (
                  <p className="text-xs text-indigo-600 font-semibold mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Subscription: {invoice.subscription_number}
                  </p>
                )}
              </div>

              {/* Outstanding Highlight Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-right min-w-[220px]">
                <span className="text-xs font-semibold text-slate-500 uppercase block">
                  Outstanding Balance
                </span>
                <span className={`text-2xl font-black block mt-0.5 ${isUnpaid ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ₹{parseFloat(invoice.outstanding_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-slate-400 mt-1 block">
                  Total Billed: ₹{parseFloat(invoice.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Billed To / Billing Period Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Billed To
                </span>
                <h4 className="text-base font-bold text-slate-800">{invoice.customer_name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{invoice.customer_email}</p>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Service Coverage Period
                </span>
                <p className="text-sm font-semibold text-slate-800">
                  {invoice.billing_period_start} to {invoice.billing_period_end}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Terms: {invoice.payment_terms || 'Payment upon receipt (Immediate)'}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Itemized Line Items Table */}
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Subscribed Software Line Items
            </h3>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Item & Description</th>
                    <th className="py-3 px-4">Plan / Interval</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                    <th className="py-3 px-4 text-right">Statutory Tax</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {(invoice.lines || []).map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{line.product_name}</div>
                        {line.variant_name && (
                          <div className="text-xs text-slate-500">Variant: {line.variant_name}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                        {line.plan_name || 'Standard'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                        {line.quantity}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                        ₹{parseFloat(line.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right text-xs text-slate-600">
                        {parseFloat(line.tax_rate || 0)}% (₹{parseFloat(line.tax_amount || 0).toFixed(2)})
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        ₹{parseFloat(line.line_total || line.line_subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Totals Breakdown */}
            <div className="p-6 bg-slate-50/75 border-t border-slate-100 flex justify-end">
              <div className="w-full sm:w-80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Line Subtotal:</span>
                  <span className="font-semibold text-slate-800">
                    ₹{parseFloat(invoice.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {parseFloat(invoice.discount_amount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Promotional Discount:</span>
                    <span>-₹{parseFloat(invoice.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>Applicable GST Tax:</span>
                  <span className="font-semibold text-slate-800">
                    +₹{parseFloat(invoice.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Gross Total Amount:</span>
                  <span>₹{parseFloat(invoice.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between text-emerald-700 pt-1">
                  <span>Amount Settled:</span>
                  <span className="font-bold">
                    ₹{parseFloat(invoice.amount_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>Net Outstanding Balance:</span>
                  <span className={isUnpaid ? 'text-rose-600' : 'text-emerald-600'}>
                    ₹{parseFloat(invoice.outstanding_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {isUnpaid && !isCancelled && (
                  <div className="pt-3">
                    <Button
                      onClick={handleRazorpayCheckout}
                      disabled={razorpayProcessing}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 shadow-sm"
                    >
                      {razorpayProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Initiating Gateway...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          Pay with Razorpay
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Prior Payments / Receipts Section */}
        {payments.length > 0 && (
          <Card>
            <CardHeader className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Payment Receipts & Settlement Records
              </h3>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-2.5 px-4">Receipt #</th>
                      <th className="py-2.5 px-4">Payment Method</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {p.payment_reference}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {p.payment_method.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                          ₹{parseFloat(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{p.payment_date}</td>
                        <td className="py-3 px-4 text-center">
                          <PaymentStatusBadge status={p.payment_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Razorpay Success Modal */}
        <Modal
          isOpen={!!paymentSuccessModal}
          onClose={() => setPaymentSuccessModal(null)}
          title="Payment Successful"
        >
          {paymentSuccessModal && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                Payment Processed Successfully!
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Thank you! Your payment has been received and verified by Brightloop. Your invoice is now settled.
              </p>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-left max-w-sm mx-auto space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Reference:</span>
                  <span className="font-mono font-bold text-indigo-700">
                    {paymentSuccessModal.payment_reference}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Razorpay ID:</span>
                  <span className="font-mono text-slate-700">
                    {paymentSuccessModal.payment_id}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => setPaymentSuccessModal(null)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default CustomerInvoiceDetailPage;

