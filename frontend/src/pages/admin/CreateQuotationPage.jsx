import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  CreditCard,
  User,
  Layers,
  Sparkles,
  Calculator,
  Loader2,
} from 'lucide-react';

export const CreateQuotationPage = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    customer: '',
    template: '',
    quotation_date: todayStr,
    validity_days: 30,
    discount_amount: '0.00',
    notes: 'Commercial quotation for Brightloop Software services.',
    terms_and_conditions: 'Payment terms: Net 30. All prices subject to applicable local taxes.',
    lines: [],
  });

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingInitial(true);
        const [custList, tplData, prodData, planData] = await Promise.all([
          quotationService.getCustomersLookup(),
          quotationService.getTemplates({ is_active: 'true' }),
          productService.getProducts({ status: 'ACTIVE' }),
          planService.getPlans({ status: 'ACTIVE' }),
        ]);

        const cList = Array.isArray(custList) ? custList : [];
        const tList = tplData?.results || (Array.isArray(tplData) ? tplData : []);
        const pList = Array.isArray(prodData) ? prodData : prodData?.results || [];
        const plList = planData?.results || (Array.isArray(planData) ? planData : []);

        setCustomers(cList);
        setTemplates(tList);
        setProducts(pList);
        setPlans(plList);

        if (cList.length > 0) {
          setFormData((prev) => ({ ...prev, customer: cList[0].id.toString() }));
        }

        // Initialize with 1 default line if available
        if (pList.length > 0 && plList.length > 0) {
          const firstPlan = plList[0];
          setFormData((prev) => ({
            ...prev,
            lines: [
              {
                product: firstPlan.product,
                variant: firstPlan.variant || '',
                plan: firstPlan.id,
                quantity: firstPlan.minimum_quantity || 1,
                unit_price: firstPlan.price,
                tax_rate: '18.00',
              },
            ],
          }));
        }
      } catch (err) {
        console.error('Failed to load quotation creation data', err);
        setErrorNotice('Could not load catalog or customer directory.');
      } finally {
        setLoadingInitial(false);
      }
    };
    loadInitialData();
  }, []);

  // When a template is selected, prefill line items
  const handleTemplateSelect = (templateId) => {
    setFormData((prev) => ({ ...prev, template: templateId }));
    if (!templateId) return;

    const tpl = templates.find((t) => t.id === parseInt(templateId, 10));
    if (tpl && tpl.lines && tpl.lines.length > 0) {
      const templateLines = tpl.lines.map((l) => ({
        product: l.product,
        variant: l.variant || '',
        plan: l.plan,
        quantity: l.default_quantity,
        unit_price: l.plan_price || '0.00',
        tax_rate: '18.00',
      }));
      setFormData((prev) => ({
        ...prev,
        validity_days: tpl.validity_days || prev.validity_days,
        lines: templateLines,
      }));
    }
  };

  const addLine = () => {
    if (products.length === 0 || plans.length === 0) return;
    const defaultProd = products[0];
    const availablePlans = plans.filter((p) => p.product === defaultProd.id);
    const selectedPlan = availablePlans.length > 0 ? availablePlans[0] : plans[0];

    setFormData((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          product: selectedPlan.product,
          variant: selectedPlan.variant || '',
          plan: selectedPlan.id,
          quantity: selectedPlan.minimum_quantity || 1,
          unit_price: selectedPlan.price,
          tax_rate: '18.00',
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

      if (field === 'product') {
        const prodId = parseInt(value, 10);
        const matchingPlans = plans.filter((p) => p.product === prodId);
        const planObj = matchingPlans.length > 0 ? matchingPlans[0] : null;
        if (planObj) {
          line.plan = planObj.id;
          line.variant = planObj.variant || '';
          line.quantity = planObj.minimum_quantity || 1;
          line.unit_price = planObj.price;
        }
      }

      if (field === 'plan') {
        const selectedPlan = plans.find((p) => p.id === parseInt(value, 10));
        if (selectedPlan) {
          line.variant = selectedPlan.variant || '';
          line.unit_price = selectedPlan.price;
          if (line.quantity < selectedPlan.minimum_quantity) {
            line.quantity = selectedPlan.minimum_quantity;
          }
        }
      }

      updatedLines[index] = line;
      return { ...prev, lines: updatedLines };
    });
  };

  // Live total calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;

    formData.lines.forEach((l) => {
      const qty = parseFloat(l.quantity) || 0;
      const price = parseFloat(l.unit_price) || 0;
      const taxRate = parseFloat(l.tax_rate) || 0;
      const lineSub = qty * price;
      const lineTax = (lineSub * taxRate) / 100;
      subtotal += lineSub;
      taxTotal += lineTax;
    });

    const discount = parseFloat(formData.discount_amount) || 0;
    const grandTotal = Math.max(0, subtotal + taxTotal - discount);

    return { subtotal, taxTotal, grandTotal };
  };

  const { subtotal, taxTotal, grandTotal } = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer) {
      setErrorNotice('Please select a target customer account.');
      return;
    }
    if (formData.lines.length === 0) {
      setErrorNotice('Please add at least one line item to the quotation.');
      return;
    }

    setSubmitting(true);
    setErrorNotice('');

    try {
      const payload = {
        customer: parseInt(formData.customer, 10),
        template: formData.template ? parseInt(formData.template, 10) : null,
        quotation_date: formData.quotation_date,
        validity_days: parseInt(formData.validity_days, 10) || 30,
        discount_amount: parseFloat(formData.discount_amount || '0').toFixed(2),
        notes: formData.notes.trim(),
        terms_and_conditions: formData.terms_and_conditions.trim(),
        lines: formData.lines.map((l) => ({
          product: parseInt(l.product, 10),
          variant: l.variant ? parseInt(l.variant, 10) : null,
          plan: parseInt(l.plan, 10),
          quantity: parseInt(l.quantity, 10),
          unit_price: parseFloat(l.unit_price).toFixed(2),
          tax_rate: parseFloat(l.tax_rate || '18.00').toFixed(2),
        })),
      };

      const created = await quotationService.createQuotation(payload);
      navigate(`/admin/quotations/${created.id}`);
    } catch (err) {
      console.error('Failed to create quotation', err);
      const msg = err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to generate quotation.';
      setErrorNotice(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <DashboardLayout title="Create Quotation" subtitle="Loading customer directory...">
        <div className="p-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
          <p className="text-sm text-slate-500">Preparing quotation workspace...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Create Customer Quotation"
      subtitle="Configure bespoke software subscription proposals, negotiate unit pricing, and calculate taxes."
    >
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center gap-2">
          <Link
            to="/admin/quotations"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Quotations
          </Link>
        </div>

        {errorNotice && <Alert type="danger" message={errorNotice} />}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Customer & Template */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-900 text-sm">Customer & Source Template</h3>
            </CardHeader>
            <CardBody className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Select Customer */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Target Customer <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.customer}
                    onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                    required
                    className="w-full text-sm rounded-lg border-slate-300 py-2.5 px-3 bg-white text-slate-900 shadow-sm focus:border-indigo-500"
                  >
                    <option value="">-- Select Customer Account --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pre-fill from Template */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Load from Template <span className="text-xs text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={formData.template}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full text-sm rounded-lg border-slate-300 py-2.5 px-3 bg-white text-slate-900 shadow-sm focus:border-indigo-500"
                  >
                    <option value="">-- Blank Custom Quotation --</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.validity_days} days validity)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates & Validity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <Input
                  label="Quotation Date"
                  type="date"
                  required
                  value={formData.quotation_date}
                  onChange={(e) => setFormData({ ...formData, quotation_date: e.target.value })}
                />

                <Input
                  label="Validity Window (Days)"
                  type="number"
                  min="1"
                  required
                  value={formData.validity_days}
                  onChange={(e) => setFormData({ ...formData, validity_days: e.target.value })}
                />

                <Input
                  label="Discount Amount ($)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discount_amount}
                  onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                />
              </div>
            </CardBody>
          </Card>

          {/* Section 2: Line Items Builder */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Product & Subscription Lines</h3>
                <p className="text-xs text-slate-500">
                  Select products, plans, committed quantities, and negotiated unit prices.
                </p>
              </div>
              <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={addLine}>
                Add Item Line
              </Button>
            </CardHeader>

            <CardBody className="p-6 space-y-4">
              {formData.lines.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">No Items Added to Quotation</p>
                  <Button type="button" variant="outline" size="sm" icon={Plus} onClick={addLine} className="mt-2">
                    Add First Product Line
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.lines.map((line, idx) => {
                    const prodPlans = plans.filter((p) => p.product === parseInt(line.product, 10));
                    const selectedPlan = plans.find((p) => p.id === parseInt(line.plan, 10));

                    const qty = parseFloat(line.quantity) || 0;
                    const price = parseFloat(line.unit_price) || 0;
                    const taxRate = parseFloat(line.tax_rate) || 0;
                    const lineSub = qty * price;
                    const lineTot = lineSub + (lineSub * taxRate) / 100;

                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                      >
                        {/* Product */}
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Product
                          </label>
                          <select
                            value={line.product}
                            onChange={(e) => handleLineChange(idx, 'product', e.target.value)}
                            className="w-full text-xs rounded-lg border-slate-300 py-2 px-2.5 bg-white text-slate-800 shadow-sm focus:border-indigo-500"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Plan */}
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Subscription Plan
                          </label>
                          <select
                            value={line.plan}
                            onChange={(e) => handleLineChange(idx, 'plan', e.target.value)}
                            className="w-full text-xs rounded-lg border-slate-300 py-2 px-2.5 bg-white text-slate-800 shadow-sm focus:border-indigo-500"
                          >
                            {prodPlans.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.billing_interval}) - Min: {p.minimum_quantity}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Qty (Min {selectedPlan?.minimum_quantity || 1})
                          </label>
                          <input
                            type="number"
                            min={selectedPlan?.minimum_quantity || 1}
                            value={line.quantity}
                            onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                            className="w-full text-xs rounded-lg border-slate-300 py-2 px-2.5 bg-white text-slate-800 shadow-sm focus:border-indigo-500"
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Agreed Rate ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.unit_price}
                            onChange={(e) => handleLineChange(idx, 'unit_price', e.target.value)}
                            className="w-full text-xs rounded-lg border-slate-300 py-2 px-2.5 bg-white text-slate-800 shadow-sm focus:border-indigo-500"
                          />
                        </div>

                        {/* Line Total & Remove */}
                        <div className="sm:col-span-2 flex items-center justify-between pt-4 sm:pt-4">
                          <div className="text-right">
                            <span className="block text-xs font-bold text-slate-900">
                              ${lineTot.toFixed(2)}
                            </span>
                            <span className="block text-[10px] text-slate-500">
                              incl. {line.tax_rate}% tax
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Remove Line"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Financial Calculation Bar */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-slate-500">Subtotal:</span>
                    <span className="font-semibold text-slate-900 ml-1.5">${subtotal.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Tax (18%):</span>
                    <span className="font-semibold text-slate-900 ml-1.5">${taxTotal.toFixed(2)}</span>
                  </div>
                  {parseFloat(formData.discount_amount || '0') > 0 && (
                    <div>
                      <span className="text-slate-500">Discount:</span>
                      <span className="font-semibold text-rose-600 ml-1.5">
                        -${parseFloat(formData.discount_amount).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    Grand Total:
                  </span>
                  <span className="text-xl font-black text-indigo-600">
                    ${grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Section 3: Notes & Terms */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-900 text-sm">Notes & Terms</h3>
            </CardHeader>
            <CardBody className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="block w-full rounded-lg text-sm border border-slate-300 py-2.5 px-3.5 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Terms and Conditions
                </label>
                <textarea
                  name="terms_and_conditions"
                  rows={2}
                  value={formData.terms_and_conditions}
                  onChange={(e) =>
                    setFormData({ ...formData, terms_and_conditions: e.target.value })
                  }
                  className="block w-full rounded-lg text-sm border border-slate-300 py-2.5 px-3.5 focus:border-indigo-500"
                />
              </div>
            </CardBody>
          </Card>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link to="/admin/quotations">
              <Button variant="secondary" size="md" disabled={submitting}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" variant="primary" size="md" icon={Save} isLoading={submitting}>
              Generate Quotation
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default CreateQuotationPage;

