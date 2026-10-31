import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { QuotationStatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import quotationService from '../../services/quotationService';
import subscriptionService from '../../services/subscriptionService';
import {
  FileText,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Download,
  Send,
  Loader2,
  CreditCard,
  Clock,
  Sparkles,
  Calendar,
  Layers,
  History,
  ShieldCheck,
  User,
  AlertTriangle,
  Mail,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export const QuotationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quotation, setQuotation] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bannerNotice, setBannerNotice] = useState(null);

  // Action Modals State
  const [modalAction, setModalAction] = useState(null); // 'FINALIZE' | 'CONFIRM' | 'CANCEL' | 'EMAIL' | 'CONVERT'
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Email form state
  const [emailForm, setEmailForm] = useState({
    recipient_email: '',
    subject: '',
    message: '',
  });

  // Convert form state
  const [convertForm, setConvertForm] = useState({
    start_date: new Date().toISOString().split('T')[0],
    payment_terms: 'Net 30',
  });

  const fetchQuotationData = async () => {
    try {
      setLoading(true);
      const [qData, hData] = await Promise.all([
        quotationService.getQuotation(id),
        quotationService.getQuotationHistory(id).catch(() => []),
      ]);
      setQuotation(qData);
      setHistory(Array.isArray(hData) ? hData : hData?.results || []);
      setEmailForm((prev) => ({
        ...prev,
        recipient_email: qData.customer_email || '',
        subject: `Brightloop Quotation #${qData.quotation_number}`,
      }));
    } catch (err) {
      console.error('Failed to load quotation details', err);
      setBannerNotice({
        type: 'danger',
        message: 'Failed to retrieve quotation record. It may not exist or backend is unreachable.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotationData();
  }, [id]);

  const openModal = (action) => {
    setModalAction(action);
    setActionReason('');
    setActionError('');
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloadingPdf(true);
      await quotationService.downloadPDF(id, `${quotation.quotation_number}.pdf`);
    } catch (err) {
      console.error('PDF download failed', err);
      setBannerNotice({
        type: 'danger',
        message: 'Could not generate or download quotation PDF.',
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleStatusTransition = async () => {
    if (!modalAction) return;
    setActionLoading(true);
    setActionError('');

    try {
      if (modalAction === 'FINALIZE') {
        await quotationService.finalizeQuotation(id, actionReason);
        setBannerNotice({ type: 'success', message: 'Quotation has been finalized and issued.' });
      } else if (modalAction === 'CONFIRM') {
        await quotationService.confirmQuotation(id, actionReason);
        setBannerNotice({ type: 'success', message: 'Quotation confirmed successfully! Ready for subscription conversion.' });
      } else if (modalAction === 'CANCEL') {
        await quotationService.cancelQuotation(id, actionReason);
        setBannerNotice({ type: 'warning', message: 'Quotation has been marked as cancelled.' });
      }
      setModalAction(null);
      await fetchQuotationData();
    } catch (err) {
      console.error('Status transition error', err);
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to update quotation status.';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendEmail = async () => {
    setActionLoading(true);
    setActionError('');

    try {
      await quotationService.sendQuotationEmail(id, emailForm);
      setModalAction(null);
      setBannerNotice({ type: 'success', message: `Quotation email successfully dispatched to ${emailForm.recipient_email}.` });
      await fetchQuotationData();
    } catch (err) {
      console.error('Failed to dispatch email', err);
      const msg = err.response?.data?.detail || 'Failed to dispatch quotation email.';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertSubscription = async () => {
    setActionLoading(true);
    setActionError('');

    try {
      const createdSub = await subscriptionService.convertQuotation(id, convertForm);
      setModalAction(null);
      navigate(`/admin/subscriptions/${createdSub.id}`);
    } catch (err) {
      console.error('Conversion failed', err);
      const msg = err.response?.data?.detail || 'Failed to convert quotation into subscription.';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Quotation Record" subtitle="Loading quotation specifications...">
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-500">Retrieving quotation from database...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!quotation) {
    return (
      <DashboardLayout title="Quotation Not Found">
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Quotation Record Not Found</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            The requested quotation could not be located. It may have been removed.
          </p>
          <Link to="/admin/quotations" className="mt-6 inline-block">
            <Button variant="secondary" icon={ArrowLeft}>
              Return to Quotation List
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`Quotation ${quotation.quotation_number}`}
      subtitle="Complete price snapshot, line items and subscription conversion workflow."
    >
      <div className="space-y-6">
        {/* Top Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            to="/admin/quotations"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Quotations Catalog
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={downloadingPdf ? Loader2 : Download}
              onClick={handleDownloadPDF}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? 'Generating PDF...' : 'Download PDF'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={Mail}
              onClick={() => openModal('EMAIL')}
            >
              Send via Email
            </Button>

            {/* Lifecycle Triggers */}
            {quotation.status === 'DRAFT' && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  icon={CheckCircle2}
                  onClick={() => openModal('FINALIZE')}
                >
                  Finalize & Issue
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={XCircle}
                  onClick={() => openModal('CANCEL')}
                >
                  Cancel
                </Button>
              </>
            )}

            {quotation.status === 'QUOTATION' && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  icon={CheckCircle2}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => openModal('CONFIRM')}
                >
                  Confirm Quotation
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={XCircle}
                  onClick={() => openModal('CANCEL')}
                >
                  Cancel
                </Button>
              </>
            )}

            {quotation.status === 'CONFIRMED' && !quotation.is_converted && (
              <Button
                variant="primary"
                size="sm"
                icon={Sparkles}
                className="bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                onClick={() => openModal('CONVERT')}
              >
                Convert to Subscription
              </Button>
            )}

            {quotation.is_converted && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                Active Subscription Generated
              </span>
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

        {/* Primary Quotation Header Card */}
        <Card>
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    {quotation.quotation_number}
                  </h1>
                  <QuotationStatusBadge status={quotation.status} />
                  {quotation.is_converted && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      Converted
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <span>Created by {quotation.created_by_name || 'Staff'}</span>
                  <span>•</span>
                  <span>Issued on {quotation.quotation_date}</span>
                </p>
              </div>

              {/* High-level financials */}
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs uppercase font-bold text-slate-400">Total Commitment</p>
                  <p className="text-2xl font-black text-slate-900">
                    ₹{Number(quotation.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Inc. ₹{Number(quotation.tax_amount || 0).toLocaleString('en-IN')} Taxes
                  </p>
                </div>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Customer Account</span>
                <p className="text-sm font-bold text-slate-800 mt-1">{quotation.customer_name}</p>
                <p className="text-xs text-slate-500">{quotation.customer_email}</p>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Source Template</span>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {quotation.template_name || 'Direct Custom Quotation'}
                </p>
                <p className="text-xs text-slate-500">
                  {quotation.template ? 'Standard Bundle' : 'Custom Tailored'}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Validity & Expiry</span>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  Valid for {quotation.validity_days} Days
                </p>
                <p className="text-xs text-slate-500">Expires on {quotation.expiry_date}</p>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Currency</span>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {quotation.currency} (INR - Indian Rupee)
                </p>
                <p className="text-xs text-slate-500">Standard Domestic Billing</p>
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
                <h2 className="text-sm font-bold text-slate-900">Quotation Line Items & Price Snapshots</h2>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {quotation.lines?.length || 0} Plan Items Selected
              </span>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Product & Specification</th>
                  <th className="py-3 px-4">Subscription Plan</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Discount</th>
                  <th className="py-3 px-4 text-right">Tax Rate</th>
                  <th className="py-3 px-4 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {quotation.lines?.map((line) => (
                  <tr key={line.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{line.product_name}</p>
                      {line.variant_name && (
                        <span className="text-[11px] text-slate-500">
                          Variant: {line.variant_name}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-indigo-600">{line.plan_name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      ₹{Number(line.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                      {line.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600">
                      {Number(line.discount_percentage) > 0 ? `${Number(line.discount_percentage)}%` : '0%'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600">
                      {Number(line.tax_rate) > 0 ? `${Number(line.tax_rate)}%` : '0%'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      ₹{Number(line.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing Breakdown Footer */}
          <div className="p-6 bg-slate-50/60 border-t border-slate-200 flex flex-col md:flex-row justify-between gap-6">
            <div className="max-w-md">
              {quotation.notes && (
                <div className="mb-3">
                  <span className="text-[11px] font-bold uppercase text-slate-400">Notes to Customer</span>
                  <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">{quotation.notes}</p>
                </div>
              )}
              {quotation.terms_and_conditions && (
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-400">Terms & Conditions</span>
                  <p className="text-xs text-slate-500 mt-1 whitespace-pre-line">{quotation.terms_and_conditions}</p>
                </div>
              )}
            </div>

            <div className="w-full md:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold">₹{Number(quotation.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {Number(quotation.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Applied Discount:</span>
                  <span className="font-semibold">-₹{Number(quotation.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>GST / Tax Amount:</span>
                <span className="font-semibold">+₹{Number(quotation.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                <span>Grand Total:</span>
                <span className="text-indigo-600">₹{Number(quotation.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Audit Trail & Email History Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Audit Trail */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Lifecycle Audit History</h3>
              </div>
            </CardHeader>
            <CardBody>
              {history.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No status transitions recorded yet.</p>
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

          {/* Email Dispatches Log */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Email Dispatch Log</h3>
              </div>
            </CardHeader>
            <CardBody>
              {!quotation.email_logs || quotation.email_logs.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No email notifications dispatched for this quotation yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {quotation.email_logs.map((log) => (
                    <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span>To: {log.recipient_email}</span>
                        <span className="text-[10px] text-emerald-600 uppercase font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {log.status}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1 font-medium">{log.subject}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Dispatched: {new Date(log.sent_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Action Transition Modal */}
      <Modal
        isOpen={['FINALIZE', 'CONFIRM', 'CANCEL'].includes(modalAction)}
        onClose={() => setModalAction(null)}
        title={
          modalAction === 'FINALIZE'
            ? 'Finalize and Issue Quotation'
            : modalAction === 'CONFIRM'
            ? 'Confirm Customer Acceptance'
            : 'Cancel Quotation'
        }
      >
        <div className="space-y-4 text-sm">
          {actionError && <Alert type="danger" message={actionError} />}
          <p className="text-slate-600">
            {modalAction === 'FINALIZE' &&
              `You are about to finalize Quotation #${quotation.quotation_number}. This locks pricing and makes it formally available for customer review.`}
            {modalAction === 'CONFIRM' &&
              `You are confirming Quotation #${quotation.quotation_number}. Confirmed quotations can be converted directly into active subscriptions.`}
            {modalAction === 'CANCEL' &&
              `You are cancelling Quotation #${quotation.quotation_number}. This prevents any further order processing or subscription conversion.`}
          </p>

          <Input
            label="Reason / Notes (Optional)"
            placeholder="Add operational reason or customer confirmation ref..."
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setModalAction(null)}>
              Dismiss
            </Button>
            <Button
              variant={modalAction === 'CANCEL' ? 'danger' : 'primary'}
              onClick={handleStatusTransition}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Action'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Email Dispatch Modal */}
      <Modal
        isOpen={modalAction === 'EMAIL'}
        onClose={() => setModalAction(null)}
        title={`Send Quotation #${quotation.quotation_number} by Email`}
      >
        <div className="space-y-4 text-sm">
          {actionError && <Alert type="danger" message={actionError} />}
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
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              rows={4}
              placeholder="Please find attached your subscription proposal for Brightloop software suite..."
              value={emailForm.message}
              onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setModalAction(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={Send}
              onClick={handleSendEmail}
              disabled={actionLoading || !emailForm.recipient_email}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Dispatch Email'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Convert to Subscription Modal */}
      <Modal
        isOpen={modalAction === 'CONVERT'}
        onClose={() => setModalAction(null)}
        title="Convert Quotation to Live Subscription"
      >
        <div className="space-y-4 text-sm">
          {actionError && <Alert type="danger" message={actionError} />}
          <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 text-xs text-indigo-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Automated Subscription Generation
            </p>
            <p>
              This action will atomically convert Quotation #{quotation.quotation_number} into a managed
              subscription for <strong>{quotation.customer_name}</strong>. All line item snapshots will be preserved.
            </p>
          </div>

          <Input
            label="Subscription Start Date"
            type="date"
            value={convertForm.start_date}
            onChange={(e) => setConvertForm({ ...convertForm, start_date: e.target.value })}
            required
          />

          <Input
            label="Payment Terms"
            placeholder="e.g. Net 30, Due on Receipt"
            value={convertForm.payment_terms}
            onChange={(e) => setConvertForm({ ...convertForm, payment_terms: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setModalAction(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={CreditCard}
              onClick={handleConvertSubscription}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Conversion'}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default QuotationDetailPage;

