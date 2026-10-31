import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import quotationService from '../../services/quotationService';
import productService from '../../services/productService';
import planService from '../../services/planService';
import {
  FileText,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Package,
  Layers,
  CreditCard,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export const CreateQuotationTemplatePage = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    validity_days: 30,
    is_active: true,
    lines: [],
  });

  // Load products and plans
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setLoadingInitial(true);
        const [prodData, planData] = await Promise.all([
          productService.getProducts({ status: 'ACTIVE' }),
          planService.getPlans({ status: 'ACTIVE' }),
        ]);
        const prodList = Array.isArray(prodData) ? prodData : prodData?.results || [];
        const planList = planData?.results || (Array.isArray(planData) ? planData : []);
        setProducts(prodList);
        setPlans(planList);

        if (isEditing) {
          const tpl = await quotationService.getTemplate(id);
          setFormData({
            name: tpl.name,
            description: tpl.description || '',
            validity_days: tpl.validity_days,
            is_active: tpl.is_active,
            lines: (tpl.lines || []).map((l) => ({
              product: l.product,
              variant: l.variant || '',
              plan: l.plan,
              default_quantity: l.default_quantity,
            })),
          });
        }
      } catch (err) {
        console.error('Failed to load initial template data', err);
        setErrorNotice('Failed to initialize template editor.');
      } finally {
        setLoadingInitial(false);
      }
    };
    loadCatalog();
  }, [id, isEditing]);

  const addLine = () => {
    if (products.length === 0) return;
    const defaultProd = products[0];
    const availablePlans = plans.filter((p) => p.product === defaultProd.id);
    const defaultPlan = availablePlans.length > 0 ? availablePlans[0] : null;

    setFormData((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          product: defaultProd.id,
          variant: defaultPlan?.variant || '',
          plan: defaultPlan ? defaultPlan.id : '',
          default_quantity: defaultPlan ? defaultPlan.minimum_quantity : 1,
        },
      ],
    }));
  };

  const removeLine = (index) => {
    setFormData((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, idx) => idx !== index),
    }));
  };

  const handleLineChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedLines = [...prev.lines];
      const line = { ...updatedLines[index], [field]: value };

      // If product changed, update available plans and reset variant/plan
      if (field === 'product') {
        const prodId = parseInt(value, 10);
        const matchingPlans = plans.filter((p) => p.product === prodId);
        line.plan = matchingPlans.length > 0 ? matchingPlans[0].id : '';
        line.variant = matchingPlans.length > 0 && matchingPlans[0].variant ? matchingPlans[0].variant : '';
        line.default_quantity = matchingPlans.length > 0 ? matchingPlans[0].minimum_quantity : 1;
      }

      // If plan changed, sync variant and min qty
      if (field === 'plan') {
        const selectedPlan = plans.find((p) => p.id === parseInt(value, 10));
        if (selectedPlan) {
          line.variant = selectedPlan.variant || '';
          if (line.default_quantity < selectedPlan.minimum_quantity) {
            line.default_quantity = selectedPlan.minimum_quantity;
          }
        }
      }

      updatedLines[index] = line;
      return { ...prev, lines: updatedLines };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorNotice('Template name is mandatory.');
      return;
    }

    setSubmitting(true);
    setErrorNotice('');

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        validity_days: parseInt(formData.validity_days, 10) || 30,
        is_active: formData.is_active,
        lines: formData.lines.map((l) => ({
          product: parseInt(l.product, 10),
          variant: l.variant ? parseInt(l.variant, 10) : null,
          plan: parseInt(l.plan, 10),
          default_quantity: parseInt(l.default_quantity, 10),
        })),
      };

      if (isEditing) {
        await quotationService.updateTemplate(id, payload);
      } else {
        await quotationService.createTemplate(payload);
      }
      navigate('/admin/quotation-templates');
    } catch (err) {
      console.error('Template save failed', err);
      const msg = err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to save template.';
      setErrorNotice(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <DashboardLayout title="Template Editor" subtitle="Loading catalog...">
        <div className="p-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
          <p className="text-sm text-slate-500">Loading catalog items...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={isEditing ? 'Edit Quotation Template' : 'Create Quotation Template'}
      subtitle="Define reusable product packages, default tiers, plans, and recommended quantities."
    >
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center gap-2">
          <Link
            to="/admin/quotation-templates"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Templates
          </Link>
        </div>

        {errorNotice && <Alert type="danger" message={errorNotice} />}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Metadata */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-900 text-sm">Template Details</h3>
            </CardHeader>
            <CardBody className="p-6 space-y-4">
              <Input
                label="Template Name"
                name="name"
                required
                placeholder="e.g. Enterprise Annual Stack, Starter Cloud Onboarding"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Summary of this bundle and target client segment..."
                  className="block w-full rounded-lg text-sm border border-slate-300 py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <Input
                  label="Default Validity (Days)"
                  name="validity_days"
                  type="number"
                  min="1"
                  required
                  value={formData.validity_days}
                  onChange={(e) => setFormData({ ...formData, validity_days: e.target.value })}
                  helperText="Default expiration window when instantiated into customer quotation."
                />

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-slate-800">
                      Active (Available for new quotations)
                    </span>
                  </label>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Line Items Builder */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Configured Line Items</h3>
                <p className="text-xs text-slate-500">
                  Products, variants, and plans bundled in this template.
                </p>
              </div>
              <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={addLine}>
                Add Line Item
              </Button>
            </CardHeader>

            <CardBody className="p-6 space-y-4">
              {formData.lines.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">No Line Items Added Yet</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    Add standard software products and subscription plans to this template.
                  </p>
                  <Button type="button" variant="outline" size="sm" icon={Plus} onClick={addLine}>
                    Add First Line Item
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.lines.map((line, idx) => {
                    const selectedProd = products.find((p) => p.id === parseInt(line.product, 10));
                    const prodPlans = plans.filter((p) => p.product === parseInt(line.product, 10));
                    const selectedPlan = plans.find((p) => p.id === parseInt(line.plan, 10));

                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col md:flex-row items-start md:items-center gap-3"
                      >
                        {/* Product Selector */}
                        <div className="flex-1 w-full">
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Product
                          </label>
                          <select
                            value={line.product}
                            onChange={(e) => handleLineChange(idx, 'product', e.target.value)}
                            className="w-full text-xs rounded-lg border-slate-300 py-2 px-3 bg-white text-slate-800 shadow-sm focus:border-indigo-500"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Plan Selector */}
                        <div className="flex-1 w-full">
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Subscription Plan
                          </label>
                          <select
                            value={line.plan}
                            onChange={(e) => handleLineChange(idx, 'plan', e.target.value)}
                            className="w-full text-xs rounded-lg border-slate-300 py-2 px-3 bg-white text-slate-800 shadow-sm focus:border-indigo-500"
                          >
                            {prodPlans.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (${p.price} / {p.billing_interval}) - Min: {p.minimum_quantity}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Default Quantity */}
                        <div className="w-full md:w-32">
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Default Qty
                          </label>
                          <input
                            type="number"
                            min={selectedPlan ? selectedPlan.minimum_quantity : 1}
                            value={line.default_quantity}
                            onChange={(e) => handleLineChange(idx, 'default_quantity', e.target.value)}
                            className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white text-slate-800 shadow-sm focus:border-indigo-500"
                          />
                        </div>

                        {/* Remove Action */}
                        <div className="pt-2 md:pt-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            icon={Trash2}
                            onClick={() => removeLine(idx)}
                            className="text-slate-400 hover:text-rose-600 p-2"
                            title="Remove Line"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link to="/admin/quotation-templates">
              <Button variant="secondary" size="md" disabled={submitting}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" variant="primary" size="md" icon={Save} isLoading={submitting}>
              {isEditing ? 'Save Template Changes' : 'Create Quotation Template'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default CreateQuotationTemplatePage;

