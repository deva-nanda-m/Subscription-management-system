import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import {
  PlanStatusBadge,
  BillingIntervalBadge,
  AvailabilityBadge,
} from '../../components/ui/Badge';
import planService from '../../services/planService';
import productService from '../../services/productService';
import {
  CreditCard,
  ArrowLeft,
  Save,
  CheckCircle2,
  Calendar,
  Layers,
  HelpCircle,
  AlertCircle,
  Package,
  Clock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const CreatePlanPage = () => {
  const navigate = useNavigate();

  // Reference lists
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Today's date YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    product: '',
    variant: '',
    price: '499.00',
    currency: 'INR',
    billing_interval: 'MONTHLY',
    minimum_quantity: 1,
    available_from: todayStr,
    available_until: '',
    auto_close: true,
    allow_early_closure: true,
    allow_pause: true,
    allow_renewal: true,
  });

  // Load active products on mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingInitial(true);
        // Only active products
        const data = await productService.getProducts({ status: 'ACTIVE' });
        const list = Array.isArray(data) ? data : data.results || [];
        setProducts(list);
        if (list.length > 0) {
          setFormData((prev) => ({ ...prev, product: list[0].id.toString() }));
        }
      } catch (err) {
        console.error('Failed to load active products', err);
        setErrorNotice('Could not load active products catalog.');
      } finally {
        setLoadingInitial(false);
      }
    };
    loadProducts();
  }, []);

  // Whenever selected product changes, fetch its active variants
  useEffect(() => {
    if (!formData.product) {
      setVariants([]);
      return;
    }
    const loadVariants = async () => {
      try {
        setLoadingVariants(true);
        const data = await productService.getVariants(formData.product);
        const list = Array.isArray(data) ? data : data.results || [];
        // Only active variants
        const activeVariants = list.filter((v) => v.is_active);
        setVariants(activeVariants);
        setFormData((prev) => ({ ...prev, variant: '' }));
      } catch (err) {
        console.error('Failed to load variants for product', err);
        setVariants([]);
      } finally {
        setLoadingVariants(false);
      }
    };
    loadVariants();
  }, [formData.product]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (errorNotice) setErrorNotice('');
  };

  const selectedProductObj = products.find((p) => p.id.toString() === formData.product.toString());
  const selectedVariantObj = variants.find((v) => v.id.toString() === formData.variant.toString());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorNotice('');
    setFieldErrors({});

    // Client-side validations
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Plan name is mandatory.';
    }
    if (!formData.product) {
      errors.product = 'Please select a product.';
    }
    const parsedPrice = parseFloat(formData.price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      errors.price = 'Plan price must be a valid non-negative decimal.';
    }
    const parsedQty = parseInt(formData.minimum_quantity, 10);
    if (isNaN(parsedQty) || parsedQty < 1) {
      errors.minimum_quantity = 'Minimum quantity must be a positive integer (at least 1).';
    }
    if (formData.available_from && formData.available_until) {
      if (formData.available_until < formData.available_from) {
        errors.available_until = 'Available until date cannot be earlier than start date.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        product: parseInt(formData.product, 10),
        variant: formData.variant ? parseInt(formData.variant, 10) : null,
        price: parseFloat(formData.price).toFixed(2),
        currency: formData.currency,
        billing_interval: formData.billing_interval,
        minimum_quantity: parseInt(formData.minimum_quantity, 10),
        available_from: formData.available_from,
        available_until: formData.available_until || null,
        auto_close: formData.auto_close,
        allow_early_closure: formData.allow_early_closure,
        allow_pause: formData.allow_pause,
        allow_renewal: formData.allow_renewal,
      };

      const created = await planService.createPlan(payload);
      navigate(`/admin/plans/${created.id}`);
    } catch (err) {
      console.error('Plan creation failed', err);
      if (err.response?.data) {
        if (typeof err.response.data === 'object') {
          setFieldErrors(err.response.data);
          const firstKey = Object.keys(err.response.data)[0];
          const firstVal = err.response.data[firstKey];
          setErrorNotice(
            Array.isArray(firstVal) ? `${firstKey}: ${firstVal[0]}` : String(firstVal)
          );
        } else {
          setErrorNotice(String(err.response.data));
        }
      } else {
        setErrorNotice('Failed to create subscription plan. Please verify backend service.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="Create Subscription Plan"
      subtitle="Define pricing models, billing frequency, purchase availability periods, and lifecycle governance."
    >
      <div className="space-y-6 max-w-6xl">
        {/* Navigation back */}
        <div className="flex items-center gap-2">
          <Link
            to="/admin/plans"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Subscription Plans
          </Link>
        </div>

        {errorNotice && <Alert type="danger" message={errorNotice} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Form (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section A: Basic Information */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                      A
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">Basic Information</h3>
                      <p className="text-xs text-slate-500">
                        General identification and product association.
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardBody className="p-6 space-y-4">
                  <Input
                    label="Plan Name"
                    name="name"
                    required
                    placeholder="e.g. Basic Monthly, Business Annual, Enterprise Pro"
                    value={formData.name}
                    onChange={handleChange}
                    error={fieldErrors.name}
                    helperText="A descriptive title shown to subscribers and staff."
                  />

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Plan Description
                    </label>
                    <textarea
                      name="description"
                      rows={2}
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Optional summary of included features, quotas, or tier limits..."
                      className="block w-full rounded-lg text-sm transition-colors border border-slate-300 py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  {/* Product & Variant Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Select Product */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Target Product <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="product"
                        value={formData.product}
                        onChange={handleChange}
                        className={`w-full rounded-lg text-sm border ${
                          fieldErrors.product ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                        } py-2.5 px-3.5 bg-white text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500`}
                        required
                        disabled={loadingInitial}
                      >
                        <option value="">-- Select Active Product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code})
                          </option>
                        ))}
                      </select>
                      {fieldErrors.product && (
                        <p className="text-xs text-rose-500 mt-1">{fieldErrors.product}</p>
                      )}
                      <p className="text-[11px] text-slate-500 mt-1">
                        Only active products from Module 2 can be associated with new plans.
                      </p>
                    </div>

                    {/* Select Variant */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Product Variant / Tier{' '}
                        <span className="text-xs text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <select
                        name="variant"
                        value={formData.variant}
                        onChange={handleChange}
                        className="w-full rounded-lg text-sm border border-slate-300 py-2.5 px-3.5 bg-white text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        disabled={loadingVariants || variants.length === 0}
                      >
                        <option value="">
                          {variants.length === 0
                            ? '-- No active variants available (Base Product) --'
                            : '-- Base Product (No Specific Tier) --'}
                        </option>
                        {variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} (SKU: {v.sku}) - Base: {v.currency} {v.price}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Only active variants belonging to the selected product are selectable.
                      </p>
                    </div>
                  </div>

                  {/* Price & Currency */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Plan Price"
                      name="price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.price}
                      onChange={handleChange}
                      error={fieldErrors.price}
                      helperText="Non-negative recurring or base subscription rate."
                    />

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Billing Currency <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="currency"
                        value={formData.currency}
                        onChange={handleChange}
                        className="w-full rounded-lg text-sm border border-slate-300 py-2.5 px-3.5 bg-white text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="INR">INR (₹ - Indian Rupee)</option>
                        <option value="USD">USD ($ - US Dollar)</option>
                        <option value="EUR">EUR (€ - Euro)</option>
                        <option value="GBP">GBP (£ - British Pound)</option>
                      </select>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Section B: Billing Configuration */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                      B
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">
                        Billing Configuration & Minimum Order
                      </h3>
                      <p className="text-xs text-slate-500">
                        Recurring cycle intervals and purchase volume thresholds.
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardBody className="p-6 space-y-5">
                  {/* Billing Interval Selector */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Billing Interval <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { id: 'DAILY', label: 'Daily', desc: 'Charged every 24h' },
                        { id: 'WEEKLY', label: 'Weekly', desc: 'Charged every 7d' },
                        { id: 'MONTHLY', label: 'Monthly', desc: 'Charged monthly' },
                        { id: 'YEARLY', label: 'Yearly', desc: 'Charged annually' },
                      ].map((item) => {
                        const isSelected = formData.billing_interval === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({ ...prev, billing_interval: item.id }))
                            }
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <span
                              className={`block font-semibold text-xs ${
                                isSelected ? 'text-indigo-900' : 'text-slate-800'
                              }`}
                            >
                              {item.label}
                            </span>
                            <span className="block text-[11px] text-slate-500 mt-0.5">
                              {item.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {fieldErrors.billing_interval && (
                      <p className="text-xs text-rose-500 mt-1">{fieldErrors.billing_interval}</p>
                    )}
                  </div>

                  {/* Minimum Quantity */}
                  <div className="max-w-xs">
                    <Input
                      label="Minimum Quantity Required"
                      name="minimum_quantity"
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={formData.minimum_quantity}
                      onChange={handleChange}
                      error={fieldErrors.minimum_quantity}
                      helperText="Customers must subscribe to at least this number of seats or units."
                    />
                  </div>
                </CardBody>
              </Card>

              {/* Section C: Plan Availability Period */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                      C
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">
                        Plan Availability Management
                      </h3>
                      <p className="text-xs text-slate-500">
                        Calendar window defining when new subscriptions can be initiated.
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardBody className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Available From Date"
                      name="available_from"
                      type="date"
                      required
                      value={formData.available_from}
                      onChange={handleChange}
                      error={fieldErrors.available_from}
                      helperText="Plan cannot be subscribed before this date."
                    />

                    <Input
                      label="Available Until Date"
                      name="available_until"
                      type="date"
                      value={formData.available_until}
                      onChange={handleChange}
                      error={fieldErrors.available_until}
                      helperText="Leave blank for open-ended / indefinite availability."
                    />
                  </div>
                </CardBody>
              </Card>

              {/* Section D: Plan Lifecycle Configuration */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                      D
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">
                        Plan Lifecycle Policies
                      </h3>
                      <p className="text-xs text-slate-500">
                        Operational automation, early retirement controls, and renewal guarantees.
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardBody className="p-6 divide-y divide-slate-100">
                  {/* Auto Close */}
                  <div className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        Automatic Plan Closure on End Date
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        When enabled, the automated Celery background daemon transitions this plan to{' '}
                        <strong>CLOSED</strong> status immediately upon passing its configured end date.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        name="auto_close"
                        checked={formData.auto_close}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {/* Early Closure */}
                  <div className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">Allow Early Closure</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Permits an administrator to permanently close this plan prior to its scheduled
                        expiration date (e.g., phased product retirement).
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        name="allow_early_closure"
                        checked={formData.allow_early_closure}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {/* Allow Pause */}
                  <div className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">Allow Pausing</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Allows administrators to temporarily suspend new subscription intake without
                        permanently terminating the plan or affecting active subscribers.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        name="allow_pause"
                        checked={formData.allow_pause}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {/* Allow Renewal */}
                  <div className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        Allow Renewal for Existing Subscriptions
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Allows customers with pre-existing subscriptions on this plan to renew their
                        cycles even after the plan availability period expires.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        name="allow_renewal"
                        checked={formData.allow_renewal}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </CardBody>
              </Card>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Link to="/admin/plans">
                  <Button variant="secondary" size="md" disabled={submitting}>
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  icon={Save}
                  isLoading={submitting}
                >
                  Create & Activate Plan
                </Button>
              </div>
            </form>
          </div>

          {/* Live Preview Sidebar (1 col) */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-t-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Live Preview
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    Drafting
                  </span>
                </div>
                <h4 className="font-bold text-base mt-2 text-white line-clamp-1">
                  {formData.name || 'Untitled Subscription Plan'}
                </h4>
              </CardHeader>

              <CardBody className="p-5 space-y-4">
                {/* Pricing Banner */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-slate-900">
                      {formData.currency === 'INR' ? '₹' : '$'}
                      {Number(formData.price || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 ml-1">
                      / {formData.billing_interval.toLowerCase()}
                    </span>
                  </div>
                  <BillingIntervalBadge interval={formData.billing_interval} />
                </div>

                {/* Product spec */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Associated Product:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedProductObj ? selectedProductObj.name : '—'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Product Code:</span>
                    <span className="font-mono text-slate-700">
                      {selectedProductObj ? selectedProductObj.code : '—'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Tier / Variant:</span>
                    <span className="font-medium text-slate-800">
                      {selectedVariantObj ? selectedVariantObj.name : 'Base Product'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Minimum Order:</span>
                    <span className="font-semibold text-slate-800">
                      {formData.minimum_quantity}{' '}
                      {parseInt(formData.minimum_quantity, 10) === 1 ? 'unit' : 'units'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Availability:</span>
                    <span className="text-slate-800 font-medium">
                      {formData.available_from} → {formData.available_until || 'Indefinite'}
                    </span>
                  </div>
                </div>

                {/* Policies Checklist */}
                <div className="pt-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Active Policies
                  </p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          formData.auto_close ? 'text-indigo-600' : 'text-slate-300'
                        }`}
                      />
                      <span className={formData.auto_close ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                        Automatic Expiration Closure
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          formData.allow_early_closure ? 'text-indigo-600' : 'text-slate-300'
                        }`}
                      />
                      <span
                        className={
                          formData.allow_early_closure
                            ? 'text-slate-700 font-medium'
                            : 'text-slate-400'
                        }
                      >
                        Early Closure Allowed
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          formData.allow_pause ? 'text-indigo-600' : 'text-slate-300'
                        }`}
                      />
                      <span className={formData.allow_pause ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                        Administrative Pausing
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          formData.allow_renewal ? 'text-indigo-600' : 'text-slate-300'
                        }`}
                      />
                      <span className={formData.allow_renewal ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                        Subscriber Renewals Allowed
                      </span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreatePlanPage;

