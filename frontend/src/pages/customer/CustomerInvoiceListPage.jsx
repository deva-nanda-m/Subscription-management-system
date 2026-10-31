import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { InvoiceStatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import invoiceService from '../../services/invoiceService';
import {
  FileText,
  Download,
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCw,
  Loader2,
  Calendar,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const CustomerInvoiceListPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [bannerNotice, setBannerNotice] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchCustomerInvoices = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedStatus !== 'ALL') params.status = selectedStatus;

      const data = await invoiceService.getInvoices(params);
      const list = data?.results || (Array.isArray(data) ? data : []);
      setInvoices(list);
    } catch (err) {
      console.error('Failed to load customer invoices', err);
      setBannerNotice({
        type: 'danger',
        message: 'Could not fetch your invoices and billing statements.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerInvoices();
  }, [selectedStatus]);

  const handleDownloadPDF = async (inv) => {
    try {
      setDownloadingId(inv.id);
      await invoiceService.downloadPDF(inv.id, `${inv.invoice_number}.pdf`);
    } catch (err) {
      console.error('PDF download failed', err);
      setBannerNotice({ type: 'danger', message: 'Failed to download tax invoice PDF.' });
    } finally {
      setDownloadingId(null);
    }
  };

  // KPI Calculations
  const totalInvoiced = invoices.reduce(
    (sum, inv) => sum + parseFloat(inv.total_amount || 0),
    0
  );
  const totalPaid = invoices.reduce(
    (sum, inv) => sum + parseFloat(inv.amount_paid || 0),
    0
  );
  const totalOutstanding = invoices.reduce(
    (sum, inv) => sum + parseFloat(inv.outstanding_amount || 0),
    0
  );

  return (
    <DashboardLayout
      title="My Invoices & Receipts"
      subtitle="View billing history, download GST tax invoices, and pay outstanding subscription dues"
    >
      <div className="space-y-6">
        {bannerNotice && (
          <Alert
            type={bannerNotice.type}
            message={bannerNotice.message}
            onClose={() => setBannerNotice(null)}
          />
        )}

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Total Billed</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">
                  ₹{totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
                <span className="text-xs text-slate-400 font-medium">
                  {invoices.length} invoices generated
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-100 text-slate-600">
                <FileText className="w-6 h-6" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Total Settled</p>
                <h3 className="text-2xl font-black text-emerald-700 mt-1">
                  ₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Fully verified payments
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </CardBody>
          </Card>

          <Card className={totalOutstanding > 0 ? 'border-l-4 border-l-rose-500' : ''}>
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Outstanding Balance</p>
                <h3 className={`text-2xl font-black mt-1 ${totalOutstanding > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                  ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
                <span className="text-xs text-slate-400 font-medium">
                  {totalOutstanding > 0 ? 'Payment required' : 'All accounts settled'}
                </span>
              </div>
              <div className={`p-3 rounded-xl ${totalOutstanding > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                <CreditCard className="w-6 h-6" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Filter and Table Card */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800">Billing Statements</h3>
              <p className="text-xs text-slate-500">
                Official GST-compliant tax invoices for your subscribed software services
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Invoices</option>
                <option value="PAID">Paid Invoices</option>
                <option value="CONFIRMED">Due / Unpaid</option>
                <option value="DRAFT">Pending Confirmation</option>
              </select>

              <button
                onClick={fetchCustomerInvoices}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
                title="Refresh List"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span className="text-xs">Fetching your billing statements...</span>
              </div>
            ) : invoices.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No Invoices Found"
                description="You currently have no tax invoices matching this selection."
                className="py-12"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Billing Period</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4 text-right">Total Amount</th>
                      <th className="py-3 px-4 text-right">Outstanding Balance</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {invoices.map((inv) => {
                      const isUnpaid = inv.status !== 'PAID' && parseFloat(inv.outstanding_amount || 0) > 0;
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            <Link
                              to={`/customer/invoices/${inv.id}`}
                              className="text-indigo-600 hover:underline hover:text-indigo-800"
                            >
                              {inv.invoice_number}
                            </Link>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-600">
                            {inv.billing_period_start} – {inv.billing_period_end}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                            {inv.due_date}
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                            ₹{parseFloat(inv.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                            ₹{parseFloat(inv.outstanding_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <InvoiceStatusBadge status={inv.status} isOverdue={inv.is_overdue} />
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Download PDF */}
                              <button
                                onClick={() => handleDownloadPDF(inv)}
                                disabled={downloadingId === inv.id}
                                title="Download Vector PDF"
                                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
                              >
                                {downloadingId === inv.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                              </button>

                              {/* Pay Now or View Button */}
                              {isUnpaid ? (
                                <Link
                                  to={`/customer/invoices/${inv.id}`}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm"
                                >
                                  <CreditCard className="w-3.5 h-3.5" /> Pay Now
                                </Link>
                              ) : (
                                <Link
                                  to={`/customer/invoices/${inv.id}`}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                                >
                                  View Details
                                </Link>
                              )}
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
      </div>
    </DashboardLayout>
  );
};

export default CustomerInvoiceListPage;

