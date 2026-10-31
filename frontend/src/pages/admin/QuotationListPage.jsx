import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { QuotationStatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import quotationService from '../../services/quotationService';
import subscriptionService from '../../services/subscriptionService';
import {
  FileText,
  Plus,
  Search,
  Eye,
  CheckCircle2,
  Lock,
  Calendar,
  Layers,
  ChevronRight,
  Download,
  Send,
  Loader2,
  CreditCard,
  XCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

export const QuotationListPage = () => {
  const navigate = useNavigate();

  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [bannerNotice, setBannerNotice] = useState(null);

  // Conversion Modal State
  const [convertingQuotation, setConvertingQuotation] = useState(null);
  const [conversionLoading, setConversionLoading] = useState(false);
  const [conversionError, setConversionError] = useState('');
  const [conversionForm, setConversionForm] = useState({
    start_date: new Date().toISOString().split('T')[0],
    payment_terms: 'Net 30',
  });

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedStatus !== 'ALL') params.status = selectedStatus;

      const data = await quotationService.getQuotations(params);
      const list = data?.results || (Array.isArray(data) ? data : []);
      setQuotations(list);
    } catch (err) {
      console.error('Failed to load quotations', err);
      setBannerNotice({ type: 'danger', message: 'Could not load quotations catalog.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [selectedStatus]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchQuotations();
  };

  const openConvertModal = (qtn) => {
    setConvertingQuotation(qtn);
    setConversionError('');
    setConversionForm({
      start_date: new Date().toISOString().split('T')[0],
      payment_terms: 'Net 30',
    });
  };

  const handleExecuteConversion = async () => {
    if (!convertingQuotation) return;
    setConversionLoading(true);
    setConversionError('');

    try {
      const createdSub = await subscriptionService.convertQuotation(
        convertingQuotation.id,
        conversionForm
      );
      setConvertingQuotation(null);
      navigate(`/admin/subscriptions/${createdSub.id}`);
    } catch (err) {
      console.error('Conversion failed', err);
      const msg = err.response?.data?.detail || 'Failed to convert quotation to subscription.';
      setConversionError(msg);
    } finally {
      setConversionLoading(false);
    }
  };

  // Metrics
  const totalCount = quotations.length;
  const draftCount = quotations.filter((q) => q.status === 'DRAFT').length;
  const issuedCount = quotations.filter((q) => q.status === 'QUOTATION').length;
  const confirmedCount = quotations.filter((q) => q.status === 'CONFIRMED').length;
  const convertedCount = quotations.filter((q) => q.is_converted).length;

  return (
    <DashboardLayout
      title="Quotation Management"
      subtitle="Assemble, negotiate, issue, and convert commercial software subscription quotations."
    >
      <div className="space-y-6">
        {bannerNotice && (
          <Alert
            type={bannerNotice.type}
            message={bannerNotice.message}
            onClose={() => setBannerNotice(null)}
          />
        )}

        {/* Dashboard Metrics Header */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-l-4 border-l-indigo-500">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Total Quotations
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <FileText className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Drafts</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{draftCount}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Issued</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{issuedCount}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Send className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Confirmed
                </p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{confirmedCount}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Converted Subs
                </p>
                <p className="text-2xl font-bold text-purple-700 mt-1">{convertedCount}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                <CreditCard className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Action & Filter Toolbar */}
        <Card>
          <CardBody className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2 max-w-md">
              <Input
                name="search"
                placeholder="Search by QTN#, customer name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={Search}
                className="mb-0"
              />
              <Button type="submit" variant="secondary" size="md">
                Search
              </Button>
            </form>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-600">Status:</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="text-xs rounded-lg border-slate-300 py-2 px-3 bg-white text-slate-800 shadow-sm focus:border-indigo-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="QUOTATION">Issued</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <Link to="/admin/quotations/new">
                <Button variant="primary" size="md" icon={Plus}>
                  Create Quotation
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>

        {/* Quotations Table */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-900 text-sm">Quotations Catalog</h2>
              <span className="text-xs text-slate-500 font-medium">({quotations.length} total)</span>
            </div>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
          </CardHeader>

          <CardBody className="p-0">
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                <p className="text-sm text-slate-500">Loading customer quotations...</p>
              </div>
            ) : quotations.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No Quotations Found"
                description={
                  search || selectedStatus !== 'ALL'
                    ? 'No quotations match the selected criteria.'
                    : 'Get started by creating your first customer-specific quotation.'
                }
                action={
                  <Link to="/admin/quotations/new">
                    <Button variant="primary" size="sm" icon={Plus}>
                      Create Quotation
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Quotation # & Customer</th>
                      <th className="py-3 px-4">Validity Window</th>
                      <th className="py-3 px-4">Grand Total</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Conversion</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {quotations.map((qtn) => {
                      const isConfirmed = qtn.status === 'CONFIRMED';
                      const canConvert = isConfirmed && !qtn.is_converted && !qtn.is_expired;

                      return (
                        <tr key={qtn.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <Link
                                to={`/admin/quotations/${qtn.id}`}
                                className="font-semibold text-slate-900 hover:text-indigo-600 font-mono"
                              >
                                {qtn.quotation_number}
                              </Link>
                              <span className="font-medium text-slate-800 text-[11px] mt-0.5">
                                {qtn.customer_name} ({qtn.customer_email})
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600">
                            <div>
                              <span>{qtn.quotation_date}</span> →{' '}
                              <span className={qtn.is_expired ? 'text-rose-600 font-semibold' : ''}>
                                {qtn.expiry_date}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              ({qtn.validity_days} days)
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-sm font-bold text-slate-900">
                              ${Number(qtn.grand_total).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <QuotationStatusBadge status={qtn.status} />
                          </td>

                          <td className="py-3.5 px-4">
                            {qtn.is_converted ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                <CreditCard className="w-3 h-3 text-purple-600" />
                                Sub Active
                              </span>
                            ) : canConvert ? (
                              <Button
                                variant="primary"
                                size="xs"
                                icon={Sparkles}
                                onClick={() => openConvertModal(qtn)}
                              >
                                Convert to Sub
                              </Button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Unconverted</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link to={`/admin/quotations/${qtn.id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-1.5 text-slate-600 hover:text-indigo-600"
                                  title="View Quotation"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>

                              <button
                                type="button"
                                onClick={() =>
                                  quotationService.downloadPDF(
                                    qtn.id,
                                    `${qtn.quotation_number}.pdf`
                                  )
                                }
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                title="Download PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>
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

        {/* Convert to Subscription Modal */}
        <Modal
          isOpen={!!convertingQuotation}
          onClose={() => setConvertingQuotation(null)}
          title="Convert Quotation to Subscription"
          description="Initiate active subscription contract from this customer-confirmed quotation."
        >
          <div className="space-y-4">
            {conversionError && <Alert type="danger" message={conversionError} />}

            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
              <div>
                <strong>Source Quotation:</strong> {convertingQuotation?.quotation_number}
              </div>
              <div>
                <strong>Customer:</strong> {convertingQuotation?.customer_name} (
                {convertingQuotation?.customer_email})
              </div>
              <div>
                <strong>Total Agreement Value:</strong> $
                {Number(convertingQuotation?.grand_total || 0).toFixed(2)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Subscription Start Date"
                type="date"
                required
                value={conversionForm.start_date}
                onChange={(e) =>
                  setConversionForm({ ...conversionForm, start_date: e.target.value })
                }
              />

              <Input
                label="Payment Terms"
                placeholder="e.g. Net 30, Due on Receipt"
                value={conversionForm.payment_terms}
                onChange={(e) =>
                  setConversionForm({ ...conversionForm, payment_terms: e.target.value })
                }
              />
            </div>

            <p className="text-[11px] text-slate-500">
              This action will create an official Subscription in <strong>Confirmed</strong> status,
              transfer all agreed line items, compute recurring billing intervals, and lock the
              source quotation from further edits.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setConvertingQuotation(null)}
                disabled={conversionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={Sparkles}
                onClick={handleExecuteConversion}
                isLoading={conversionLoading}
              >
                Confirm Conversion
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default QuotationListPage;

