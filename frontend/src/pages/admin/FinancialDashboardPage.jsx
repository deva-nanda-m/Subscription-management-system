import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Modal from '../../components/ui/Modal';
import reportService from '../../services/reportService';
import invoiceService from '../../services/invoiceService';
import {
  TrendingUp,
  CreditCard,
  FileText,
  DollarSign,
  Calendar,
  Download,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Layers,
  ArrowUpRight,
  Loader2,
  PieChart,
  BarChart2,
  ChevronRight,
  Play,
  Percent,
} from 'lucide-react';

export const FinancialDashboardPage = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('ALL'); // 30D, THIS_MONTH, THIS_YEAR, ALL
  const [bannerNotice, setBannerNotice] = useState(null);

  // Manual Billing Run State
  const [billingRunning, setBillingRunning] = useState(false);
  const [billingResult, setBillingResult] = useState(null);

  // CSV Export Loading States
  const [exportingType, setExportingType] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const params = {};
      const today = new Date();
      if (dateRange === '30D') {
        const d = new Date();
        d.setDate(today.getDate() - 30);
        params.start_date = d.toISOString().split('T')[0];
      } else if (dateRange === 'THIS_MONTH') {
        const d = new Date(today.getFullYear(), today.getMonth(), 1);
        params.start_date = d.toISOString().split('T')[0];
      } else if (dateRange === 'THIS_YEAR') {
        const d = new Date(today.getFullYear(), 0, 1);
        params.start_date = d.toISOString().split('T')[0];
      }

      const data = await reportService.getDashboardSummary(params);
      setSummaryData(data);
    } catch (err) {
      console.error('Failed to load financial dashboard', err);
      setBannerNotice({
        type: 'danger',
        message: 'Could not fetch executive financial indicators.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const handleRunBillingCycle = async () => {
    try {
      setBillingRunning(true);
      const result = await invoiceService.runManualBilling();
      setBillingResult(result);
      await fetchDashboardData();
    } catch (err) {
      console.error('Manual billing run failed', err);
      setBannerNotice({
        type: 'danger',
        message: err.response?.data?.detail || 'Recurring billing cycle trigger failed.',
      });
    } finally {
      setBillingRunning(false);
    }
  };

  const handleExportCSV = async (reportType, filename) => {
    try {
      setExportingType(reportType);
      await reportService.downloadReportCSV(reportType, {}, filename);
      setBannerNotice({
        type: 'success',
        message: `Exported ${reportType.toUpperCase()} report successfully.`,
      });
    } catch (err) {
      console.error(`Export ${reportType} CSV failed`, err);
      setBannerNotice({ type: 'danger', message: `Failed to export ${reportType} CSV.` });
    } finally {
      setExportingType(null);
    }
  };

  const metrics = summaryData?.metrics || {};
  const financials = metrics.financials || {};
  const subscriptions = metrics.subscriptions || {};
  const invoices = metrics.invoices || {};
  const monthlyRevenue = summaryData?.charts?.monthly_revenue || [];
  const paymentMethods = summaryData?.charts?.payment_methods || [];

  const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.revenue), 1000);

  return (
    <DashboardLayout
      title="Financial Dashboard & Reports"
      subtitle="Executive revenue insights, collection performance, aging indicators, and recurring billing runs"
    >
      <div className="space-y-6">
        {bannerNotice && (
          <Alert
            type={bannerNotice.type}
            message={bannerNotice.message}
            onClose={() => setBannerNotice(null)}
          />
        )}

        {/* Top Control Bar: Timeframe & Global Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Reporting Window:
            </span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {[
                { key: 'ALL', label: 'All Time' },
                { key: '30D', label: 'Last 30 Days' },
                { key: 'THIS_MONTH', label: 'This Month' },
                { key: 'THIS_YEAR', label: 'This Year' },
              ].map((r) => (
                <button
                  key={r.key}
                  onClick={() => setDateRange(r.key)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    dateRange === r.key
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Trigger Billing Run */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRunBillingCycle}
              disabled={billingRunning}
              className="flex items-center gap-1.5 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-bold"
            >
              {billingRunning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Running Cycle...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
                  Run Recurring Billing
                </>
              )}
            </Button>

            <button
              onClick={fetchDashboardData}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Refresh Analytics"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Primary Financial KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue Collected */}
          <Card className="border-l-4 border-l-emerald-500">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Revenue Collected</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  ₹{(financials.revenue_collected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Settled Cash Inflow
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </CardBody>
          </Card>

          {/* Total Billed */}
          <Card className="border-l-4 border-l-indigo-500">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Total Invoiced Billed</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  ₹{(financials.total_billed || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  Across {invoices.total || 0} tax invoices
                </span>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                <FileText className="w-6 h-6" />
              </div>
            </CardBody>
          </Card>

          {/* Outstanding Balance */}
          <Card className="border-l-4 border-l-amber-500">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Outstanding Receivables</p>
                <h3 className="text-2xl font-black text-amber-700 mt-1">
                  ₹{(financials.total_outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {invoices.unpaid || 0} unpaid / {invoices.partially_paid || 0} partial
                </span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                <Clock className="w-6 h-6" />
              </div>
            </CardBody>
          </Card>

          {/* Overdue Delinquent */}
          <Card className="border-l-4 border-l-rose-500">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Overdue Receivables</p>
                <h3 className="text-2xl font-black text-rose-700 mt-1">
                  ₹{(financials.overdue_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
                <Link
                  to="/admin/invoices/overdue"
                  className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1 mt-0.5"
                >
                  {financials.overdue_count || 0} past due invoices <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Charts & Analytical Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Monthly Trend Chart */}
          <div className="lg:col-span-8">
            <Card>
              <CardHeader className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-indigo-600" />
                    Monthly Revenue Collection Trend (Last 6 Months)
                  </h3>
                  <p className="text-xs text-slate-500">Actual settled receipts recorded in database</p>
                </div>
              </CardHeader>
              <CardBody className="p-6">
                {monthlyRevenue.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <BarChart2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium">No revenue entries captured yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Payments recorded will dynamically render monthly collection bars here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="h-56 flex items-end gap-3 pt-6 pb-2 border-b border-slate-100">
                      {monthlyRevenue.map((item, idx) => {
                        const heightPct = Math.max(Math.round((item.revenue / maxRevenue) * 100), 8);
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                            <span className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              ₹{(item.revenue / 1000).toFixed(1)}k
                            </span>
                            <div
                              style={{ height: `${heightPct}%` }}
                              className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-md hover:from-indigo-700 hover:to-indigo-500 transition-all shadow-sm"
                            />
                            <span className="text-[11px] font-semibold text-slate-600 truncate max-w-full">
                              {item.month}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
                      <span>Historical collection timeline</span>
                      <span className="font-semibold text-slate-600">Peak: ₹{maxRevenue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Payment Methods Distribution */}
          <div className="lg:col-span-4">
            <Card>
              <CardHeader className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-600" />
                  Collection Channels
                </h3>
              </CardHeader>
              <CardBody className="p-5 space-y-4">
                {paymentMethods.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <CreditCard className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                    <p className="text-xs">No channels active yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentMethods.map((m, idx) => {
                      const sharePct = financials.revenue_collected
                        ? Math.round((m.total / financials.revenue_collected) * 100)
                        : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-700">
                              {m.payment_method.replace('_', ' ')}
                            </span>
                            <span className="font-mono font-bold text-slate-900">
                              ₹{parseFloat(m.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({sharePct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${sharePct}%` }}
                              className={`h-full rounded-full ${
                                m.payment_method === 'ONLINE_RAZORPAY'
                                  ? 'bg-indigo-600'
                                  : m.payment_method === 'UPI'
                                  ? 'bg-emerald-500'
                                  : 'bg-amber-500'
                              }`}
                            />
                          </div>
                          <div className="text-[10px] text-slate-400 text-right">
                            {m.count} {m.count === 1 ? 'receipt' : 'receipts'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Operational Breakdowns & CSV Export Hub */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Subscriptions & Invoicing Health */}
          <Card>
            <CardHeader className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                Subscription Portfolio Breakdown
              </h3>
            </CardHeader>
            <CardBody className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-xl font-black text-emerald-800 block">
                    {subscriptions.active || 0}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 uppercase">Active</span>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                  <span className="text-xl font-black text-indigo-800 block">
                    {subscriptions.confirmed || 0}
                  </span>
                  <span className="text-[11px] font-bold text-indigo-600 uppercase">Confirmed</span>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <span className="text-xl font-black text-amber-800 block">
                    {subscriptions.paused || 0}
                  </span>
                  <span className="text-[11px] font-bold text-amber-600 uppercase">Paused</span>
                </div>
                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
                  <span className="text-xl font-black text-slate-700 block">
                    {subscriptions.closed || 0}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Closed</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-500">Total contracts under management:</span>
                <span className="text-sm font-bold text-slate-900">{subscriptions.total || 0} Subscriptions</span>
              </div>
            </CardBody>
          </Card>

          {/* Export Reports & Audit Data */}
          <Card>
            <CardHeader className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Download className="w-4 h-4 text-indigo-600" />
                Data Export & Regulatory Audit Hub
              </h3>
            </CardHeader>
            <CardBody className="p-5 space-y-3">
              <p className="text-xs text-slate-500">
                Stream real-time CSV spreadsheets for tax filing, statutory audits, or accounting import.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={() => handleExportCSV('revenue', 'brightloop_revenue_report.csv')}
                  disabled={exportingType === 'revenue'}
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all flex items-center justify-between text-xs font-semibold text-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" /> Revenue Summary CSV
                  </span>
                  {exportingType === 'revenue' && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
                </button>

                <button
                  onClick={() => handleExportCSV('invoices', 'brightloop_invoices_report.csv')}
                  disabled={exportingType === 'invoices'}
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all flex items-center justify-between text-xs font-semibold text-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" /> Invoices Ledger CSV
                  </span>
                  {exportingType === 'invoices' && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
                </button>

                <button
                  onClick={() => handleExportCSV('payments', 'brightloop_payments_report.csv')}
                  disabled={exportingType === 'payments'}
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all flex items-center justify-between text-xs font-semibold text-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600" /> Payments Ledger CSV
                  </span>
                  {exportingType === 'payments' && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
                </button>

                <button
                  onClick={() => handleExportCSV('subscriptions', 'brightloop_subscriptions_report.csv')}
                  disabled={exportingType === 'subscriptions'}
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all flex items-center justify-between text-xs font-semibold text-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-600" /> Subscriptions CSV
                  </span>
                  {exportingType === 'subscriptions' && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
                </button>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Billing Execution Modal */}
        <Modal
          isOpen={!!billingResult}
          onClose={() => setBillingResult(null)}
          title="Automated Billing Engine Run Completed"
        >
          {billingResult && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-indigo-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Recurring Cycle Execution Finished</h4>
                  <p className="text-xs text-slate-600 mt-0.5">{billingResult.message}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-xl font-bold text-slate-800 block">
                    {billingResult.subscriptions_evaluated || 0}
                  </span>
                  <span className="text-[11px] text-slate-500">Evaluated</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <span className="text-xl font-bold text-emerald-700 block">
                    {billingResult.invoices_generated || 0}
                  </span>
                  <span className="text-[11px] text-emerald-600 font-semibold">Generated</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-xl font-bold text-rose-700 block">
                    {billingResult.failed_count || 0}
                  </span>
                  <span className="text-[11px] text-slate-500">Errors</span>
                </div>
              </div>

              {billingResult.details && billingResult.details.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs font-mono">
                  {billingResult.details.map((d, i) => (
                    <div key={i} className="text-slate-600">
                      • {typeof d === 'string' ? d : JSON.stringify(d)}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button onClick={() => setBillingResult(null)}>Close</Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default FinancialDashboardPage;

