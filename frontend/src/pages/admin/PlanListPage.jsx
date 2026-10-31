import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import {
  PlanStatusBadge,
  BillingIntervalBadge,
  AvailabilityBadge,
} from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import planService from '../../services/planService';
import productService from '../../services/productService';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  PauseCircle,
  Lock,
  Calendar,
  Layers,
  ChevronRight,
  Filter,
  DollarSign,
  Tag,
  Loader2,
  Eye,
  Edit2,
  Trash2,
  Play,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export const PlanListPage = () => {
  const navigate = useNavigate();

  // Data states
  const [plans, setPlans] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [productsList, setProductsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bannerNotice, setBannerNotice] = useState(null);

  // Filter and pagination states
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedInterval, setSelectedInterval] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [ordering, setOrdering] = useState('-created_at');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Transition Action Modals
  const [transitionAction, setTransitionAction] = useState(null); // { type: 'PAUSE'|'RESUME'|'CLOSE'|'DELETE', plan }
  const [changeReason, setChangeReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Fetch metrics
  const fetchMetrics = async () => {
    try {
      const data = await planService.getPlanMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load plan metrics', err);
    }
  };

  // Fetch available products for filter
  const fetchProductsList = async () => {
    try {
      const data = await productService.getProducts();
      setProductsList(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Failed to load products list', err);
    }
  };

  // Fetch plans with filters
  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        ordering,
      };
      if (search.trim()) params.search = search.trim();
      if (selectedProduct) params.product = selectedProduct;
      if (selectedInterval !== 'ALL') params.billing_interval = selectedInterval;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (availableOnly) params.available_only = 'true';

      const data = await planService.getPlans(params);

      if (data && data.results) {
        setPlans(data.results);
        setTotalCount(data.count || 0);
        setTotalPages(Math.ceil((data.count || 0) / 10) || 1);
      } else if (Array.isArray(data)) {
        setPlans(data);
        setTotalCount(data.length);
        setTotalPages(1);
      } else {
        setPlans([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to load subscription plans', err);
      setBannerNotice({
        type: 'danger',
        message: 'Could not load subscription plans. Please verify backend connectivity.',
      });
    } finally {
      setLoading(false);
    }
  }, [page, ordering, search, selectedProduct, selectedInterval, selectedStatus, availableOnly]);

  useEffect(() => {
    fetchMetrics();
    fetchProductsList();
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPlans();
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedProduct('');
    setSelectedInterval('ALL');
    setSelectedStatus('ALL');
    setAvailableOnly(false);
    setOrdering('-created_at');
    setPage(1);
  };

  const openActionModal = (type, plan) => {
    setTransitionAction({ type, plan });
    setChangeReason('');
    setActionError('');
  };

  const closeActionModal = () => {
    setTransitionAction(null);
    setChangeReason('');
    setActionError('');
  };

  const executeTransitionAction = async () => {
    if (!transitionAction) return;
    const { type, plan } = transitionAction;
    setActionLoading(true);
    setActionError('');

    try {
      if (type === 'PAUSE') {
        await planService.pausePlan(plan.id, changeReason);
        setBannerNotice({
          type: 'success',
          message: `Plan "${plan.name}" has been paused. New subscriptions are suspended.`,
        });
      } else if (type === 'RESUME') {
        await planService.resumePlan(plan.id, changeReason);
        setBannerNotice({
          type: 'success',
          message: `Plan "${plan.name}" has been resumed and is now active for subscriptions.`,
        });
      } else if (type === 'CLOSE') {
        await planService.closePlan(plan.id, changeReason);
        setBannerNotice({
          type: 'warning',
          message: `Plan "${plan.name}" has been permanently closed. No further subscriptions can be created.`,
        });
      } else if (type === 'DELETE') {
        await planService.deletePlan(plan.id);
        setBannerNotice({
          type: 'success',
          message: `Plan "${plan.name}" was successfully deleted.`,
        });
      }

      closeActionModal();
      fetchPlans();
      fetchMetrics();
    } catch (err) {
      console.error('Lifecycle action error:', err);
      const errMsg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        (typeof err.response?.data === 'string' ? err.response.data : 'Action failed to execute.');
      setActionError(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Subscription Plan Management"
      subtitle="Configure pricing, billing intervals, purchase windows, and lifecycle automation for software products."
    >
      <div className="space-y-6">
        {/* Banner Notification */}
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
                  Total Plans
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {metrics ? metrics.total_plans : '—'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <CreditCard className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Active Plans
                </p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">
                  {metrics ? metrics.active_plans : '—'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Paused Plans
                </p>
                <p className="text-2xl font-bold text-amber-700 mt-1">
                  {metrics ? metrics.paused_plans : '—'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <PauseCircle className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-slate-500">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Closed Plans
                </p>
                <p className="text-2xl font-bold text-slate-700 mt-1">
                  {metrics ? metrics.closed_plans : '—'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <Lock className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-cyan-500">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Available Now
                </p>
                <p className="text-2xl font-bold text-cyan-700 mt-1">
                  {metrics ? metrics.currently_available : '—'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600">
                <Calendar className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Action Bar & Filter Controls */}
        <Card>
          <CardBody className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              {/* Search Form */}
              <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 max-w-md">
                <Input
                  name="search"
                  placeholder="Search plan name, code, product..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  icon={Search}
                  className="mb-0"
                />
                <Button type="submit" variant="secondary" size="md">
                  Search
                </Button>
              </form>

              {/* Create Plan Button */}
              <div className="flex items-center gap-2">
                <Link to="/admin/plans/new">
                  <Button variant="primary" size="md" icon={Plus}>
                    Create Subscription Plan
                  </Button>
                </Link>
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
              {/* Product Filter */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Product</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => {
                    setSelectedProduct(e.target.value);
                    setPage(1);
                  }}
                  className="w-full text-xs rounded-lg border-slate-300 py-2 px-2.5 bg-white text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">All Products</option>
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Billing Interval Filter */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Billing Interval
                </label>
                <select
                  value={selectedInterval}
                  onChange={(e) => {
                    setSelectedInterval(e.target.value);
                    setPage(1);
                  }}
                  className="w-full text-xs rounded-lg border-slate-300 py-2 px-2.5 bg-white text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ALL">All Intervals</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Plan Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full text-xs rounded-lg border-slate-300 py-2 px-2.5 bg-white text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="CLOSED">Closed</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              {/* Sorting */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Sort Order</label>
                <select
                  value={ordering}
                  onChange={(e) => {
                    setOrdering(e.target.value);
                    setPage(1);
                  }}
                  className="w-full text-xs rounded-lg border-slate-300 py-2 px-2.5 bg-white text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="-created_at">Newest First</option>
                  <option value="created_at">Oldest First</option>
                  <option value="price">Price: Low to High</option>
                  <option value="-price">Price: High to Low</option>
                  <option value="name">Name: A to Z</option>
                </select>
              </div>

              {/* Available Only & Clear */}
              <div className="flex items-center justify-between pt-4 sm:pt-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => {
                      setAvailableOnly(e.target.checked);
                      setPage(1);
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-xs font-medium text-slate-700">Currently Open</span>
                </label>

                {(search || selectedProduct || selectedInterval !== 'ALL' || selectedStatus !== 'ALL' || availableOnly) && (
                  <button
                    onClick={handleClearFilters}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Subscription Plans Table */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-900 text-base">Configured Plans</h2>
              <span className="text-xs text-slate-500 font-medium">({totalCount} total)</span>
            </div>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
          </CardHeader>

          <CardBody className="p-0">
            {loading && plans.length === 0 ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                <p className="text-sm text-slate-500">Loading subscription plans catalog...</p>
              </div>
            ) : plans.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No Subscription Plans Found"
                description={
                  search || selectedProduct || selectedInterval !== 'ALL' || selectedStatus !== 'ALL'
                    ? 'No plans match the selected criteria. Try adjusting your filters.'
                    : 'Get started by creating your first subscription plan tied to your software products.'
                }
                action={
                  <Link to="/admin/plans/new">
                    <Button variant="primary" size="sm" icon={Plus}>
                      Create Subscription Plan
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Plan Name & Code</th>
                      <th className="py-3 px-4">Product / Variant</th>
                      <th className="py-3 px-4">Price & Interval</th>
                      <th className="py-3 px-4">Min Qty</th>
                      <th className="py-3 px-4">Availability Period</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Policies</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                    {plans.map((plan) => {
                      const isClosed = plan.status === 'CLOSED';
                      const isPaused = plan.status === 'PAUSED';
                      const isActive = plan.status === 'ACTIVE';

                      return (
                        <tr
                          key={plan.id}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          {/* Plan Name & Code */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <Link
                                to={`/admin/plans/${plan.id}`}
                                className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5"
                              >
                                {plan.name}
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                              </Link>
                              <span className="text-[11px] font-mono text-slate-500 mt-0.5">
                                {plan.plan_code}
                              </span>
                              {plan.description && (
                                <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 max-w-xs">
                                  {plan.description}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Product / Variant */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900">
                                {plan.product_name}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                {plan.variant_name ? `Tier: ${plan.variant_name}` : 'Base Product'}
                              </span>
                            </div>
                          </td>

                          {/* Price & Billing Interval */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span className="font-bold text-slate-900 text-sm">
                                {plan.currency === 'INR' ? '₹' : '$'}
                                {Number(plan.price).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                              <BillingIntervalBadge interval={plan.billing_interval} />
                            </div>
                          </td>

                          {/* Minimum Quantity */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-xs">
                              {plan.minimum_quantity} {plan.minimum_quantity === 1 ? 'unit' : 'units'}
                            </span>
                          </td>

                          {/* Availability Period */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1">
                              <div className="text-[11px] text-slate-600 flex items-center gap-1">
                                <span className="font-medium">From:</span> {plan.available_from}
                              </div>
                              <div className="text-[11px] text-slate-600 flex items-center gap-1">
                                <span className="font-medium">Until:</span>{' '}
                                {plan.available_until || 'Indefinite'}
                              </div>
                              <AvailabilityBadge
                                isCurrentlyAvailable={plan.is_currently_available}
                                availabilityDisplay={plan.availability_display}
                              />
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            <PlanStatusBadge status={plan.status} />
                          </td>

                          {/* Policies / Flags */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-[140px]">
                              {plan.auto_close && (
                                <span
                                  title="Automatically closes when availability window ends"
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200"
                                >
                                  Auto-Close
                                </span>
                              )}
                              {plan.allow_renewal && (
                                <span
                                  title="Subscribers can renew after availability period ends"
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200"
                                >
                                  Renewable
                                </span>
                              )}
                              {plan.allow_pause && (
                                <span
                                  title="Admin can pause this plan"
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200"
                                >
                                  Pause OK
                                </span>
                              )}
                              {plan.allow_early_closure && (
                                <span
                                  title="Admin can terminate early before end date"
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                                >
                                  Early Close
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Details */}
                              <Link to={`/admin/plans/${plan.id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-1.5 text-slate-600 hover:text-indigo-600"
                                  title="View Plan Details & Audit History"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>

                              {/* Edit (allowed unless CLOSED) */}
                              {!isClosed && (
                                <Link to={`/admin/plans/${plan.id}/edit`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-1.5 text-slate-600 hover:text-blue-600"
                                    title="Edit Plan Settings"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                </Link>
                              )}

                              {/* Pause Button (if ACTIVE and allow_pause is true) */}
                              {isActive && plan.allow_pause && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openActionModal('PAUSE', plan)}
                                  className="p-1.5 text-amber-600 hover:bg-amber-50"
                                  title="Pause Plan (Suspend New Subscriptions)"
                                >
                                  <PauseCircle className="w-4 h-4" />
                                </Button>
                              )}

                              {/* Resume Button (if PAUSED) */}
                              {isPaused && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openActionModal('RESUME', plan)}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50"
                                  title="Resume Plan (Reactivate New Subscriptions)"
                                >
                                  <Play className="w-4 h-4" />
                                </Button>
                              )}

                              {/* Close Button (if not CLOSED and (allow_early_closure or window expired)) */}
                              {!isClosed && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openActionModal('CLOSE', plan)}
                                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                  title="Close Plan Permanently"
                                >
                                  <Lock className="w-4 h-4" />
                                </Button>
                              )}

                              {/* Delete Button (if not closed or safe) */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openActionModal('DELETE', plan)}
                                className="p-1.5 text-slate-400 hover:text-rose-600"
                                title="Delete Plan"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> (
                  {totalCount} total plans)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Transition Confirmation Modal */}
        <Modal
          isOpen={!!transitionAction}
          onClose={closeActionModal}
          title={
            transitionAction?.type === 'PAUSE'
              ? 'Pause Subscription Plan'
              : transitionAction?.type === 'RESUME'
              ? 'Resume Subscription Plan'
              : transitionAction?.type === 'CLOSE'
              ? 'Permanently Close Subscription Plan'
              : 'Delete Subscription Plan'
          }
          description={
            transitionAction?.type === 'CLOSE'
              ? 'Warning: Closing a plan is a terminal, irreversible action. Once closed, no new subscriptions can ever be created under this plan.'
              : transitionAction?.type === 'PAUSE'
              ? 'Pausing this plan will temporarily stop new customers from subscribing. Existing subscriptions remain unaffected.'
              : transitionAction?.type === 'RESUME'
              ? 'Resuming will make this plan immediately active and available for eligible subscriptions.'
              : `Are you sure you want to delete "${transitionAction?.plan?.name}"?`
          }
        >
          <div className="space-y-4">
            {actionError && <Alert type="danger" message={actionError} />}

            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
              <div>
                <strong>Target Plan:</strong> {transitionAction?.plan?.name} (
                {transitionAction?.plan?.plan_code})
              </div>
              <div>
                <strong>Associated Product:</strong> {transitionAction?.plan?.product_name}
              </div>
              <div>
                <strong>Current Status:</strong> {transitionAction?.plan?.status}
              </div>
            </div>

            {transitionAction?.type !== 'DELETE' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Status Change (Audit Record)
                </label>
                <textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Provide an explanation for this administrative action (e.g. Price model revision, seasonal promotion ended)..."
                  rows={3}
                  className="w-full text-xs rounded-lg border-slate-300 p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                onClick={closeActionModal}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant={
                  transitionAction?.type === 'CLOSE' || transitionAction?.type === 'DELETE'
                    ? 'danger'
                    : transitionAction?.type === 'PAUSE'
                    ? 'warning'
                    : 'primary'
                }
                size="md"
                onClick={executeTransitionAction}
                isLoading={actionLoading}
              >
                {transitionAction?.type === 'PAUSE'
                  ? 'Confirm Pause'
                  : transitionAction?.type === 'RESUME'
                  ? 'Confirm Resume'
                  : transitionAction?.type === 'CLOSE'
                  ? 'Confirm Permanent Closure'
                  : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default PlanListPage;

