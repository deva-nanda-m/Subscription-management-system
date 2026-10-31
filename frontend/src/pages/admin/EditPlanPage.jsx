import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import { PlanStatusBadge, BillingIntervalBadge } from '../../components/ui/Badge';
import planService from '../../services/planService';
import {
  CreditCard,
  ArrowLeft,
  Save,
  Lock,
  Loader2,
  Calendar,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export const EditPlanPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [plan, setPlan] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'INR',
    billing_interval: 'MONTHLY',
    minimum_quantity: 1,
    available_from: '',
    available_until: '',
    auto_close: true,
    allow_early_closure: true,
    allow_pause: true,
    allow_renewal: true,
  });

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        setLoading(true);
        const data = await planService.getPlan(id);
        setPlan(data);
        setFormData({
          name: data.name,
          description: data.description || '',
          price: data.price,
          currency: data.currency,
          billing_interval: data.billing_interval,
          minimum_quantity: data.minimum_quantity,
          available_from: data.available_from,
          available_until: data.available_until || '',
          auto_close: data.auto_close,
          allow_early_closure: data.allow_early_closure,
          allow_pause: data.allow_pause,
          allow_renewal: data.allow_renewal,
        });
      } catch (err) {
        console.error('Failed to load plan', err);
        setErrorNotice('Could not load plan details for editing.');
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorNotice('');
    setFieldErrors({});

    // Validations
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Plan name is mandatory.';
    const parsedPrice = parseFloat(formData.price);
    if (isNaN(parsedPrice) || parsedPrice < 0) errors.price = 'Price must be non-negative.';
    const parsedQty = parseInt(formData.minimum_quantity, 10);
    if (isNaN(parsedQty) || parsedQty < 1) errors.minimum_quantity = 'Minimum quantity must be >= 1.';
    if (formData.available_from && formData.available_until && formData.available_until < formData.available_from) {
      errors.available_until = 'End date cannot be earlier than start date.';
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

      await planService.updatePlan(id, payload);
      navigate(`/admin/plans/${id}`);
    } catch (err) {
      console.error('Update plan failed', err);
      if (err.response?.data) {
        if (typeof err.response.data === 'object') {
          setFieldErrors(err.response.data);
          const firstKey = Object.keys(err.response.data)[0];
          const firstVal = err.response.data[firstKey];
          setErrorNotice(Array.isArray(firstVal) ? `${firstKey}: ${firstVal[0]}` : String(firstVal));
        } else {
          setErrorNotice(String(err.response.data));
        }
      } else {
        setErrorNotice('Failed to update subscription plan.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Edit Plan" subtitle="Loading plan details...">
        <div className="p-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
          <p className="text-sm text-slate-500">Loading plan specifications...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (plan && plan.status === 'CLOSED') {
    return (
      <DashboardLayout title="Edit Plan" subtitle="Plan is Closed">
        <div className="max-w-2xl mx-auto space-y-4 pt-6">
          <div className="p-6 bg-slate-100 border border-slate-300 rounded-xl text-center space-y-3">
            <Lock className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="font-bold text-slate-800 text-lg">Cannot Edit Closed Plan</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Subscription plan <strong>{plan.name}</strong> ({plan.plan_code}) has been permanently closed. Closed plans are terminal and cannot be modified or reactivated.
            </p>
            <div className="pt-2">
              <Link to={`/admin/plans/${plan.id}`}>
                <Button variant="secondary" size="md" icon={ArrowLeft}>
                  Return to Plan Details
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`Edit: ${plan?.name || 'Subscription Plan'}`}
      subtitle={`Plan Code: ${plan?.plan_code} • Linked to product ${plan?.product_name}`}
    >
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-2">
          <Link
            to={`/admin/plans/${id}`}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Plan Details
          </Link>
        </div>

        {errorNotice && <Alert type="danger" message={errorNotice} />}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Details */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-900 text-sm">Basic Information</h3>
            </CardHeader>
            <CardBody className="p-6 space-y-4">
              <Input
                label="Plan Name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                error={fieldErrors.name}
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
                  className="block w-full rounded-lg text-sm border border-slate-300 py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

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
                />

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Currency <span className="text-rose-500">*</span>
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

          {/* Billing & Order Configuration */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-900 text-sm">Billing Configuration</h3>
            </CardHeader>
            <CardBody className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Billing Interval <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].map((interval) => (
                    <button
                      key={interval}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, billing_interval: interval }))}
                      className={`p-3 rounded-xl border text-center font-semibold text-xs cursor-pointer transition-all ${
                        formData.billing_interval === interval
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {interval}
                    </button>
                  ))}
                </div>
              </div>

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
                />
              </div>
            </CardBody>
          </Card>

          {/* Availability Window */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-900 text-sm">Availability Period</h3>
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
                />

                <Input
                  label="Available Until Date"
                  name="available_until"
                  type="date"
                  value={formData.available_until}
                  onChange={handleChange}
                  error={fieldErrors.available_until}
                  helperText="Leave blank for indefinite availability"
                />
              </div>
            </CardBody>
          </Card>

          {/* Lifecycle Settings */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-900 text-sm">Lifecycle Policies</h3>
            </CardHeader>
            <CardBody className="p-6 divide-y divide-slate-100">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-900">Automatic Closure on Expiry</p>
                  <p className="text-[11px] text-slate-500">Automatically close plan when availability end date is reached</p>
                </div>
                <input
                  type="checkbox"
                  name="auto_close"
                  checked={formData.auto_close}
                  onChange={handleChange}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-900">Allow Early Closure</p>
                  <p className="text-[11px] text-slate-500">Permit administrators to close this plan before the end date</p>
                </div>
                <input
                  type="checkbox"
                  name="allow_early_closure"
                  checked={formData.allow_early_closure}
                  onChange={handleChange}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-900">Allow Pausing</p>
                  <p className="text-[11px] text-slate-500">Allow temporarily pausing new subscriptions</p>
                </div>
                <input
                  type="checkbox"
                  name="allow_pause"
                  checked={formData.allow_pause}
                  onChange={handleChange}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-900">Allow Renewal</p>
                  <p className="text-[11px] text-slate-500">Allow existing subscribers to renew past the availability window</p>
                </div>
                <input
                  type="checkbox"
                  name="allow_renewal"
                  checked={formData.allow_renewal}
                  onChange={handleChange}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
              </div>
            </CardBody>
          </Card>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link to={`/admin/plans/${id}`}>
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
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default EditPlanPage;

