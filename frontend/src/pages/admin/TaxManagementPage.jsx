import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import taxService from '../../services/taxService';
import {
  Percent,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Loader2,
  ShieldCheck,
  Tag,
  AlertTriangle,
} from 'lucide-react';

export const TaxManagementPage = () => {
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bannerNotice, setBannerNotice] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const [form, setForm] = useState({
    name: '',
    rate: '',
    description: '',
    tax_type: 'PERCENTAGE',
    is_active: true,
  });

  const fetchTaxes = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      const data = await taxService.getTaxes(params);
      const list = data?.results || (Array.isArray(data) ? data : []);
      setTaxes(list);
    } catch (err) {
      console.error('Failed to load taxes', err);
      setBannerNotice({ type: 'danger', message: 'Failed to retrieve tax configurations.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  const openCreateModal = () => {
    setEditingTax(null);
    setForm({
      name: '',
      rate: '',
      description: '',
      tax_type: 'PERCENTAGE',
      is_active: true,
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const openEditModal = (tax) => {
    setEditingTax(tax);
    setForm({
      name: tax.name,
      rate: String(tax.rate),
      description: tax.description || '',
      tax_type: tax.tax_type,
      is_active: tax.is_active,
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
        rate: parseFloat(form.rate),
        description: form.description.trim(),
        tax_type: form.tax_type,
        is_active: form.is_active,
      };

      if (editingTax) {
        await taxService.updateTax(editingTax.id, payload);
        setBannerNotice({ type: 'success', message: `Tax rule '${payload.name}' updated successfully.` });
      } else {
        await taxService.createTax(payload);
        setBannerNotice({ type: 'success', message: `Tax rule '${payload.name}' configured successfully.` });
      }

      setIsModalOpen(false);
      await fetchTaxes();
    } catch (err) {
      console.error('Tax save error', err);
      const msg = err.response?.data?.name?.[0] || err.response?.data?.rate?.[0] || err.response?.data?.detail || 'Failed to save tax rule.';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleStatus = async (tax) => {
    try {
      await taxService.updateTax(tax.id, { is_active: !tax.is_active });
      setBannerNotice({
        type: 'success',
        message: `Tax rule '${tax.name}' marked as ${!tax.is_active ? 'Active' : 'Inactive'}.`,
      });
      await fetchTaxes();
    } catch (err) {
      console.error('Status toggle error', err);
      setBannerNotice({ type: 'danger', message: 'Could not toggle tax status.' });
    }
  };

  return (
    <DashboardLayout
      title="Tax Configuration"
      subtitle="Define statutory tax rates (GST, VAT) applied to products, quotations, and recurring invoice lines."
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
              fetchTaxes();
            }}
            className="w-full sm:w-80 flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tax rules by name..."
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
            Add Tax Rule
          </Button>
        </div>

        {/* Tax Rules Table Card */}
        <Card>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                <p className="text-xs text-slate-500">Loading statutory tax rules...</p>
              </div>
            ) : taxes.length === 0 ? (
              <div className="p-8 text-center">
                <EmptyState
                  icon={Percent}
                  title="No tax rules configured"
                  description="Tax rules specify statutory percentages applied during invoice and quotation line calculations."
                  action={
                    <Button variant="primary" size="sm" icon={Plus} onClick={openCreateModal}>
                      Create First Tax Rule
                    </Button>
                  }
                />
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Tax Name</th>
                    <th className="py-3 px-4">Rate (%)</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {taxes.map((tax) => (
                    <tr key={tax.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-indigo-600" />
                          <span>{tax.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-black text-indigo-600 text-sm">
                        {tax.rate}%
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {tax.tax_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                        {tax.description || 'Standard statutory levy'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(tax)}
                          className="cursor-pointer inline-flex items-center gap-1"
                          title="Click to toggle status"
                        >
                          {tax.is_active ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                              Inactive
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          icon={Edit2}
                          onClick={() => openEditModal(tax)}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      {/* Tax Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTax ? `Edit Tax Rule: ${editingTax.name}` : 'Configure New Tax Rule'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {modalError && <Alert type="danger" message={modalError} />}

          <Input
            label="Tax Rule Name"
            placeholder="e.g. GST 18%, VAT Standard 20%"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <Input
            label="Statutory Tax Rate (%)"
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="e.g. 18.00"
            value={form.rate}
            onChange={(e) => setForm({ ...form, rate: e.target.value })}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description & Statutory Context
            </label>
            <textarea
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              rows={3}
              placeholder="e.g. Applicable to domestic SaaS platform supply under HSN/SAC 997331"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active_tax"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="is_active_tax" className="text-xs font-medium text-slate-700">
              Tax Rule is Active (Available for selection on new products and invoices)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={modalLoading}>
              {modalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingTax ? 'Save Changes' : 'Create Tax Rule'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default TaxManagementPage;

