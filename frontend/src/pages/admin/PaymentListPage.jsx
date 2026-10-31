import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { PaymentStatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import paymentService from '../../services/paymentService';
import reportService from '../../services/reportService';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Loader2,
  Calendar,
  Layers,
  DollarSign,
  TrendingUp,
  Receipt,
  User,
  ExternalLink,
} from 'lucide-react';

export const PaymentListPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedMethod, setSelectedMethod] = useState('ALL');
  const [bannerNotice, setBannerNotice] = useState(null);
  const [exportingCsv, setExportingCsv] = useState(false);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (selectedMethod !== 'ALL') params.payment_method = selectedMethod;

      const data = await paymentService.getPayments(params);
      const list = data?.results || (Array.isArray(data) ? data : []);
      setPayments(list);
    } catch (err) {
      console.error('Failed to load payments ledger', err);
      setBannerNotice({
        type: 'danger',
        message: 'Could not fetch payments transactions ledger.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [selectedStatus, selectedMethod]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPayments();
  };

  const handleExportCSV = async () => {
    try {
      setExportingCsv(true);
      await reportService.downloadReportCSV('payments', {}, `payments_ledger_${Date.now()}.csv`);
    } catch (err) {
      console.error('CSV export failed', err);
      setBannerNotice({ type: 'danger', message: 'Failed to export payments CSV.' });
    } finally {
      setExportingCsv(false);
    }
  };

  // KPI Calculations
  const successfulPayments = payments.filter((p) => p.payment_status === 'SUCCESSFUL');
  const totalCollected = successfulPayments.reduce(
    (sum, p) => sum + parseFloat(p.amount || 0),
    0
  );
  const razorpayTotal = successfulPayments
    .filter((p) => p.payment_method === 'ONLINE_RAZORPAY')
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const offlineTotal = totalCollected - razorpayTotal;

  return (
    <DashboardLayout
      title="Payments Ledger"
      subtitle="Audit real-time collection transactions, Razorpay checkouts, and offline reconciliations"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Total Collected</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">
                  ₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
                <span className="text-xs text-emerald-600 font-bold">
                  {successfulPayments.length} successful transactions
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Razorpay Online</p>
                <h3 className="text-2xl font-black text-indigo-700 mt-1">
                  ₹{razorpayTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
                <span className="text-xs text-slate-500">Automated webhooks</span>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                <CreditCard className="w-6 h-6" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Offline Manual</p>
                <h3 className="text-2xl font-black text-amber-700 mt-1">
                  ₹{offlineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
                <span className="text-xs text-slate-500">Bank, UPI, Cash receipts</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                <Receipt className="w-6 h-6" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Total Transactions</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">
                  {payments.length}
                </h3>
                <span className="text-xs text-slate-400">Total in current view</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-100 text-slate-600">
                <Layers className="w-6 h-6" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Filter and Search Action Bar */}
        <Card>
          <CardBody className="p-4 space-y-3">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <form onSubmit={handleSearch} className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by payment ref, invoice #, customer name, transaction ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </form>

              <div className="flex items-center gap-2 w-full md:w-auto">
                {/* Method Filter */}
                <select
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Payment Methods</option>
                  <option value="ONLINE_RAZORPAY">Razorpay Online</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="CASH">Cash</option>
                  <option value="OTHER">Other</option>
                </select>

                {/* Status Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SUCCESSFUL">Successful</option>
                  <option value="FAILED">Failed</option>
                  <option value="REFUNDED">Refunded</option>
                </select>

                {/* CSV Export */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={exportingCsv}
                  className="flex items-center gap-1.5 whitespace-nowrap text-xs"
                >
                  {exportingCsv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Export CSV
                </Button>

                {/* Record Offline Button */}
                <Link
                  to="/admin/payments/record"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Record Offline Payment
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader className="flex items-center justify-between border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800">Payment Transactions</h3>
              <p className="text-xs text-slate-500">
                Audited list of all captured, settled, and recorded financial entries
              </p>
            </div>
            <button
              onClick={fetchPayments}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
              title="Refresh Ledger"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </CardHeader>
          <CardBody className="p-0">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span className="text-xs">Loading payment transactions...</span>
              </div>
            ) : payments.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No Payment Transactions Found"
                description="No payment records match the current filter criteria."
                className="py-12"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Payment Ref #</th>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Payment Date</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Recorded By / Gateway</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {payments.map((p) => {
                      const isOnline = p.payment_method === 'ONLINE_RAZORPAY';
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                            {p.payment_reference}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                            {p.invoice ? (
                              <Link
                                to={`/admin/invoices/${p.invoice}`}
                                className="hover:underline hover:text-indigo-600"
                              >
                                {p.invoice_number}
                              </Link>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{p.customer_name}</div>
                            <div className="text-xs text-slate-400">{p.customer_email}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                                isOnline
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {p.payment_method.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                            ₹{parseFloat(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-600">
                            {p.payment_date}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <PaymentStatusBadge status={p.payment_status} />
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            {isOnline ? (
                              <div>
                                <span className="text-[11px] font-mono text-slate-500 block truncate max-w-[140px]" title={p.razorpay_payment_id}>
                                  {p.razorpay_payment_id || 'Razorpay Gateway'}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="font-medium text-slate-700">
                                  {p.recorded_by_name || 'Staff'}
                                </span>
                                {p.transaction_reference && (
                                  <span className="text-[11px] font-mono text-slate-400 block truncate max-w-[140px]" title={p.transaction_reference}>
                                    Ref: {p.transaction_reference}
                                  </span>
                                )}
                              </div>
                            )}
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

export default PaymentListPage;

