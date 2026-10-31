import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import {
  PlanStatusBadge,
  BillingIntervalBadge,
  AvailabilityBadge,
  ProductCategoryBadge,
} from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import planService from '../../services/planService';
import {
  CreditCard,
  Search,
  Lock,
  Loader2,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Tag,
  DollarSign,
  ShieldCheck,
  Package,
} from 'lucide-react';

export const StaffPlanListPage = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedInterval, setSelectedInterval] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [expandedPlanId, setExpandedPlanId] = useState(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedInterval !== 'ALL') params.billing_interval = selectedInterval;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;

      const data = await planService.getPlans(params);
      const list = data?.results || (Array.isArray(data) ? data : []);
      setPlans(list);
    } catch (err) {
      console.error('Failed to load operational plans catalog', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [selectedInterval, selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPlans();
  };

  const toggleExpand = (planId) => {
    setExpandedPlanId((prev) => (prev === planId ? null : planId));
  };

  return (
    <DashboardLayout
      title="Subscription Plans Catalog"
      subtitle="Operational specifications, pricing intervals, minimum order rules, and availability for customer inquiries."
    >
      <div className="space-y-6">
        {/* Read-Only Notice */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Staff Operational Clearance:</strong> You have read-only access to inspect all subscription plans, billing frequencies, and purchase availability windows to assist customers.
            </span>
          </div>
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
            Read-Only
          </span>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 max-w-md">
            <Input
              name="search"
              placeholder="Search plan name, code, or product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
              className="mb-0"
            />
            <Button type="submit" variant="secondary" size="md">
              Search
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">Interval:</label>
              <select
                value={selectedInterval}
                onChange={(e) => setSelectedInterval(e.target.value)}
                className="text-xs rounded-lg border-slate-300 py-2 px-3 bg-white text-slate-700 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Intervals</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">Status:</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs rounded-lg border-slate-300 py-2 px-3 bg-white text-slate-700 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Plans Table / Cards */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-900 text-sm">Active & Operational Plans</h2>
              <span className="text-xs text-slate-500">({plans.length} available)</span>
            </div>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
          </CardHeader>

          <CardBody className="p-0">
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                <p className="text-sm text-slate-500">Loading subscription plans catalog...</p>
              </div>
            ) : plans.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No Subscription Plans Found"
                description={
                  search || selectedInterval !== 'ALL' || selectedStatus !== 'ALL'
                    ? 'No plans match your operational query.'
                    : 'No subscription plans have been created by administrators yet.'
                }
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {plans.map((plan) => {
                  const isExpanded = expandedPlanId === plan.id;
                  return (
                    <div key={plan.id} className="transition-colors hover:bg-slate-50/50">
                      {/* Plan Row Summary */}
                      <div
                        onClick={() => toggleExpand(plan.id)}
                        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                            <CreditCard className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900 text-sm">{plan.name}</h3>
                              <PlanStatusBadge status={plan.status} />
                              <AvailabilityBadge
                                isCurrentlyAvailable={plan.is_currently_available}
                                availabilityDisplay={plan.availability_display}
                              />
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono mt-1">
                              <span>Code: {plan.plan_code}</span>
                              <span>•</span>
                              <span>Product: {plan.product_name}</span>
                              {plan.variant_name && (
                                <>
                                  <span>•</span>
                                  <span>Tier: {plan.variant_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Price & Billing Interval */}
                        <div className="flex items-center justify-between md:justify-end gap-6 shrink-0">
                          <div className="text-right">
                            <div className="text-base font-bold text-slate-900">
                              {plan.currency === 'INR' ? '₹' : '$'}
                              {Number(plan.price).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                            <div className="flex items-center gap-1.5 justify-end mt-0.5">
                              <BillingIntervalBadge interval={plan.billing_interval} />
                              <span className="text-[11px] text-slate-500">
                                (Min: {plan.minimum_quantity})
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Specification Drawer */}
                      {isExpanded && (
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-700 space-y-4">
                          {plan.description && (
                            <p className="text-slate-600 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                              {plan.description}
                            </p>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                              <span className="text-[10px] uppercase font-bold text-slate-400">
                                Product Details
                              </span>
                              <p className="font-semibold text-slate-800">{plan.product_name}</p>
                              <p className="font-mono text-slate-500 text-[11px]">
                                {plan.product_code}
                              </p>
                            </div>

                            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                              <span className="text-[10px] uppercase font-bold text-slate-400">
                                Variant / Tier
                              </span>
                              <p className="font-semibold text-slate-800">
                                {plan.variant_name || 'Base Standard Product'}
                              </p>
                              {plan.variant_sku && (
                                <p className="font-mono text-slate-500 text-[11px]">
                                  SKU: {plan.variant_sku}
                                </p>
                              )}
                            </div>

                            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                              <span className="text-[10px] uppercase font-bold text-slate-400">
                                Purchase Window
                              </span>
                              <p className="font-medium text-slate-800">
                                {plan.available_from} → {plan.available_until || 'Indefinite'}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Status: {plan.availability_display}
                              </p>
                            </div>

                            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                              <span className="text-[10px] uppercase font-bold text-slate-400">
                                Renewal & Lifecycle
                              </span>
                              <p className="font-medium text-slate-800">
                                {plan.allow_renewal ? 'Renewals Permitted' : 'No Renewals'}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Auto-close on expiry: {plan.auto_close ? 'Yes' : 'No'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StaffPlanListPage;

