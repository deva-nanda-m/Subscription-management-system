import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { QuotationStatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import quotationService from '../../services/quotationService';
import {
  FileText,
  Download,
  CheckCircle2,
  Calendar,
  Layers,
  Loader2,
  Clock,
  Sparkles,
  Eye,
  ShieldCheck,
  Package,
} from 'lucide-react';

export const CustomerQuotationListPage = () => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bannerNotice, setBannerNotice] = useState(null);

  // Detail Modal
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  // Accept / Confirm Action State
  const [confirmingQuotation, setConfirmingQuotation] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const data = await quotationService.getQuotations();
      const list = data?.results || (Array.isArray(data) ? data : []);
      setQuotations(list);
    } catch (err) {
      console.error('Failed to load customer quotations', err);
      setBannerNotice({
        type: 'danger',
        message: 'Could not load your quotations. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const handleDownloadPDF = async (qtn) => {
    try {
      setDownloadingId(qtn.id);
      await quotationService.downloadPDF(qtn.id, `${qtn.quotation_number}.pdf`);
    } catch (err) {
      console.error('PDF download error', err);
      setBannerNotice({
        type: 'danger',
        message: 'Unable to download quotation PDF.',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleAcceptQuotation = async () => {
    if (!confirmingQuotation) return;
    setConfirmLoading(true);
    try {
      await quotationService.confirmQuotation(
        confirmingQuotation.id,
        'Accepted and signed by customer via Customer Portal.'
      );
      setConfirmingQuotation(null);
      setBannerNotice({
        type: 'success',
        message: `Quotation ${confirmingQuotation.quotation_number} successfully accepted! Our provisioning team will now activate your subscription.`,
      });
      await fetchQuotations();
    } catch (err) {
      console.error('Failed to accept quotation', err);
      setBannerNotice({
        type: 'danger',
        message: err.response?.data?.detail || 'Failed to accept quotation. It may have expired.',
      });
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="My Software Quotations"
      subtitle="Review commercial proposals, download formal PDFs, and accept quotations for subscription activation."
    >
      <div className="space-y-6">
        {bannerNotice && (
          <Alert
            type={bannerNotice.type}
            message={bannerNotice.message}
            onClose={() => setBannerNotice(null)}
          />
        )}

        {/* Info Banner */}
        <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3 text-xs text-indigo-900">
          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Transparent Subscription Quotes</p>
            <p className="text-indigo-800 mt-0.5">
              Quotations issued by Brightloop staff lock in special pricing and discounts for the validity duration. Once you accept a quotation, our automated lifecycle engine initiates your subscription contracts.
            </p>
          </div>
        </div>

        {/* Quotations List */}
        <Card>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                <p className="text-xs text-slate-500">Loading your quotations...</p>
              </div>
            ) : quotations.length === 0 ? (
              <div className="p-8 text-center">
                <EmptyState
                  icon={FileText}
                  title="No quotations received yet"
                  description="When Brightloop sales or support generates a subscription proposal for your account, it will appear here for your review and approval."
                />
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Quotation Ref</th>
                    <th className="py-3 px-4">Validity Period</th>
                    <th className="py-3 px-4">Included Plans</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>{q.quotation_number}</span>
                        </div>
                        <span className="text-[11px] font-normal text-slate-400 block mt-0.5">
                          Issued on {q.quotation_date}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        <p className="font-semibold text-slate-800">Expires {q.expiry_date}</p>
                        <p className="text-[11px] text-slate-400">Valid for {q.validity_days} days</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-semibold text-slate-800">
                          {q.lines?.length || 0} Software Component(s)
                        </p>
                        <p className="text-[11px] text-slate-400 truncate max-w-xs">
                          {q.lines?.map((l) => l.product_name).join(', ')}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="font-black text-slate-900">
                          ₹{Number(q.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Inc. ₹{Number(q.tax_amount || 0).toLocaleString('en-IN')} Tax
                        </p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <QuotationStatusBadge status={q.status} />
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="xs"
                            icon={Eye}
                            onClick={() => setSelectedQuotation(q)}
                          >
                            Details
                          </Button>

                          <Button
                            variant="outline"
                            size="xs"
                            icon={downloadingId === q.id ? Loader2 : Download}
                            disabled={downloadingId === q.id}
                            onClick={() => handleDownloadPDF(q)}
                          >
                            PDF
                          </Button>

                          {q.status === 'QUOTATION' && (
                            <Button
                              variant="primary"
                              size="xs"
                              icon={CheckCircle2}
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => setConfirmingQuotation(q)}
                            >
                              Accept Quote
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

      {/* Quotation Detail Modal */}
      <Modal
        isOpen={!!selectedQuotation}
        onClose={() => setSelectedQuotation(null)}
        title={selectedQuotation ? `Quotation #${selectedQuotation.quotation_number}` : ''}
      >
        {selectedQuotation && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-slate-400">Date Issued:</span>{' '}
                <strong className="text-slate-700">{selectedQuotation.quotation_date}</strong>
                <span className="mx-2">•</span>
                <span className="text-slate-400">Valid Until:</span>{' '}
                <strong className="text-slate-700">{selectedQuotation.expiry_date}</strong>
              </div>
              <QuotationStatusBadge status={selectedQuotation.status} />
            </div>

            {/* Line Items */}
            <div>
              <p className="font-bold text-slate-800 mb-2">Quotation Line Items</p>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {selectedQuotation.lines?.map((line) => (
                  <div key={line.id} className="p-3 bg-white flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900">{line.product_name}</p>
                      <p className="text-[11px] text-slate-500">
                        {line.plan_name} {line.variant_name ? `• ${line.variant_name}` : ''}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        ₹{Number(line.unit_price).toLocaleString('en-IN')} × {line.quantity} qty
                        {Number(line.discount_percentage) > 0 && ` (${line.discount_percentage}% off)`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">
                        ₹{Number(line.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing Total Breakdown */}
            <div className="p-3 bg-slate-50 rounded-lg space-y-1.5 text-right">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>₹{Number(selectedQuotation.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {Number(selectedQuotation.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-₹{Number(selectedQuotation.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Tax (GST):</span>
                <span>+₹{Number(selectedQuotation.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-black text-sm text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-indigo-600">
                  ₹{Number(selectedQuotation.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {selectedQuotation.terms_and_conditions && (
              <div>
                <span className="font-bold text-slate-700">Terms & Conditions:</span>
                <p className="text-slate-500 mt-0.5 whitespace-pre-line">{selectedQuotation.terms_and_conditions}</p>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="outline"
                size="sm"
                icon={Download}
                onClick={() => handleDownloadPDF(selectedQuotation)}
              >
                Download PDF
              </Button>

              {selectedQuotation.status === 'QUOTATION' && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={CheckCircle2}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    const q = selectedQuotation;
                    setSelectedQuotation(null);
                    setConfirmingQuotation(q);
                  }}
                >
                  Accept This Quotation
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Customer Accept Confirmation Modal */}
      <Modal
        isOpen={!!confirmingQuotation}
        onClose={() => setConfirmingQuotation(null)}
        title="Accept Software Proposal"
      >
        <div className="space-y-4 text-sm">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
            <p className="font-bold flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Confirm Proposal Acceptance
            </p>
            <p>
              By accepting Quotation #{confirmingQuotation?.quotation_number}, you agree to the quoted terms,
              pricing of ₹{Number(confirmingQuotation?.grand_total || 0).toLocaleString('en-IN')}, and authorize Brightloop to initiate subscription onboarding.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setConfirmingQuotation(null)}>
              Review Later
            </Button>
            <Button
              variant="primary"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleAcceptQuotation}
              disabled={confirmLoading}
            >
              {confirmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Accept'}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default CustomerQuotationListPage;

