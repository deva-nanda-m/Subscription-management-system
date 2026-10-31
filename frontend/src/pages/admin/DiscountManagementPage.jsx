import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import discountService from '../../services/discountService';
import {
  Tag,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Lock,
  Loader2,
  Layers,
  Calendar,
  Sparkles,
  Zap,
} from 'lucide-react';

export const DiscountManagementPage = () => {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bannerNotice, setBannerNotice] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    discount_type: 'PERCENTAGE',
    discount_value: '',
    minimum_purchase_amount: '0.00',
    minimum_quantity: 1,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    max_usage_limit: '',
    application_scope: 'ENTIRE_SUBSCRIPTION',
    is_active: true,
  });

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      const data = await discountService.getDiscounts(params);
      const list = data?.results || (Array.isArray(data) ? data : []);
      setDiscounts(list);
    } catch (err) {
      console.error('Failed to load discounts', err);
      setBannerNotice({ type: 'danger', message: 'Could not load discount campaigns.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const openCreateModal = () => {
    setEditingDiscount(null);
    setForm({
      name: '',
      code: '',
      description: '',
      discount_type: 'PERCENTAGE',
      discount_value: '',
      minimum_purchase_amount: '0.00',
      minimum_quantity: 1,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      max_usage_limit: '',
      application_scope: 'ENTIRE_SUBSCRIPTION',
      is_active: true,
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const openEditModal = (disc) => {
    setEditingDiscount(disc);
    setForm({
      name: disc.name,
      code: disc.code || '',
      description: disc.description || '',
      discount_type: disc.discount_type,
      discount_value: String(disc.discount_value),
      minimum_purchase_amount: String(disc.minimum_purchase_amount || '0.00'),
      minimum_quantity: disc.minimum_quantity || 1,
      start_date: disc.start_date,
      end_date: disc.end_date || '',
      max_usage_limit: disc.max_usage_limit ? String(disc.max_usage_limit) : '',
      application_scope: disc.application_scope,
      is_active: disc.is_active,
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');

    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase() || null,
        description: form.description.trim(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        minimum_purchase_amount: parseFloat(form.minimum_purchase_amount || 0),
        minimum_quantity: parseInt(form.minimum_quantity || 1, 10),
        start_date: form.start_date,
        end_date: form.end_date || null,
        max_usage_limit: form.max_usage_limit ? parseInt(form.max_usage_limit, 10) : null,
        application_scope: form.application_scope,
        is_active: form.is_active,
      };

      if (editingDiscount) {
        await discountService.updateDiscount(editingDiscount.id, payload);
        setBannerNotice({ type: 'success', message: `Discount rule '${payload.name}' updated.` });
      } else {
        await discountService.createDiscount(payload);
        setBannerNotice({ type: 'success', message: `Discount rule '${payload.name}' activated.` });
      }

      setIsModalOpen(false);
      await fetchDiscounts();
    } catch (err) {
      console.error('Discount save error', err);
      const msg = err.response?.data?.name?.[0] || err.response?.data?.code?.[0] || err.response?.data?.detail || 'Failed to save discount rule.';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeactivate = async (disc) => {
    try {
      await discountService.deactivateDiscount(disc.id);
      setBannerNotice({ type: 'warning', message: `Discount rule '${disc.name}' deactivated immediately.` });
      await fetchDiscounts();
    } catch (err) {
      console.error('Deactivate error', err);
      setBannerNotice({ type: 'danger', message: 'Failed to deactivate discount rule.' });
    }
  };

  return (
    <DashboardLayout
      title="Discount Management"
      subtitle="Configure automated promotional discounts, coupon codes, usage caps and purchase thresholds."
    >
      <div className="space-y-6">
        {bannerNotice && (
          <Alert
            type={bannerNotice.type}
            message={bannerNotice.message}
            onClose={() => setBannerNotice(null)}
          />
        )}

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchDiscounts();
            }}
            className="w-full sm:w-80 flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search discount campaigns..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>

          <Button variant="primary" size="sm" icon={Plus} onClick={openCreateModal}>
            Create Discount Rule
          </Button>
        </div>

        {/* Discounts Table Card */}
        <Card>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                <p className="text-xs text-slate-500">Loading promotional discount rules...</p>
              </div>
            ) : discounts.length === 0 ? (
              <div className="p-8 text-center">
                <EmptyState
                  icon={Tag}
                  title="No discount rules found"
                  description="Discounts are evaluated and applied automatically to recurring subscription invoices based on qualifying criteria."
                  action={
                    <Button variant="primary" size="sm" icon={Plus} onClick={openCreateModal}>
                      Create First Discount
                    </Button>
                  }
                />
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Campaign & Code</th>
                    <th className="py-3 px-4">Benefit</th>
                    <th className="py-3 px-4">Thresholds</th>
                    <th className="py-3 px-4">Validity Window</th>
                    <th className="py-3 px-4 text-center">Usage</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {discounts.map((disc) => (
                    <tr key={disc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>{disc.name}</span>
                        </div>
                        {disc.code && (
                          <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded mt-1 inline-block">
                            {disc.code}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-black text-emerald-600 text-sm">
                          {disc.discount_type === 'PERCENTAGE'
                            ? `${disc.discount_value}% OFF`
                            : `₹${Number(disc.discount_value).toLocaleString('en-IN')} OFF`}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Scope: {disc.application_scope === 'ENTIRE_SUBSCRIPTION' ? 'Whole Invoice' : 'Product-level'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <p>Min Spend: ₹{Number(disc.minimum_purchase_amount || 0).toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-slate-400">Min Qty: {disc.minimum_quantity} seat(s)</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <p>{disc.start_date}</p>
                        <p className="text-[10px] text-slate-400">
                          {disc.end_date ? `until ${disc.end_date}` : 'Indefinite'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-slate-800">{disc.current_usage_count}</span>
                        <span className="text-slate-400 text-[10px]">
                          {' '}/ {disc.max_usage_limit || '∞'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {disc.is_active ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="xs"
                            icon={Edit2}
                            onClick={() => openEditModal(disc)}
                          >
                            Edit
                          </Button>
                          {disc.is_active && (
                            <Button
                              variant="ghost"
                              size="xs"
                              icon={Lock}
                              className="text-amber-600 hover:bg-amber-50"
                              onClick={() => handleDeactivate(disc)}
                            >
                              Deactivate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      {/* Discount Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDiscount ? `Edit Discount: ${editingDiscount.name}` : 'Configure New Discount Rule'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {modalError && <Alert type="danger" message={modalError} />}

          <Input
            label="Campaign / Rule Name"
            placeholder="e.g. Enterprise Q4 Promotional Discount"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Promo Code (Optional)"
              placeholder="e.g. SAVE20"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Discount Type
              </label>
              <select
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-indigo-500 outline-none bg-white"
                value={form.discount_type}
                onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (₹)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={form.discount_type === 'PERCENTAGE' ? 'Discount Value (%)' : 'Discount Value (₹)'}
              type="number"
              step="0.01"
              min="0.01"
              max={form.discount_type === 'PERCENTAGE' ? '100' : undefined}
              placeholder={form.discount_type === 'PERCENTAGE' ? '15.00' : '1000.00'}
              value={form.discount_value}
              onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
              required
            />

            <Input
              label="Minimum Purchase Amount (₹)"
              type="number"
              step="0.01"
              min="0"
              value={form.minimum_purchase_amount}
              onChange={(e) => setForm({ ...form, minimum_purchase_amount: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Effective Start Date"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              required
            />

            <Input
              label="Expiry End Date (Optional)"
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Max Usage Limit (Optional)"
              type="number"
              min="1"
              placeholder="e.g. 100 uses"
              value={form.max_usage_limit}
              onChange={(e) => setForm({ ...form, max_usage_limit: e.target.value })}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Application Scope
              </label>
              <select
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-indigo-500 outline-none bg-white"
                value={form.application_scope}
                onChange={(e) => setForm({ ...form, application_scope: e.target.value })}
              >
                <option value="ENTIRE_SUBSCRIPTION">Entire Subscription Invoice</option>
                <option value="PRODUCTS">Specific Products / Plans</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active_disc"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="is_active_disc" className="text-xs font-medium text-slate-700">
              Rule is Active (Eligible for automatic evaluation during recurring invoice cycles)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={modalLoading}>
              {modalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingDiscount ? 'Save Changes' : 'Activate Discount'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default DiscountManagementPage;

