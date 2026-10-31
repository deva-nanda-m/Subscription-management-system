import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import {
  ProductStatusBadge,
  ProductCategoryBadge,
  BillingTypeBadge,
  StatusBadge,
} from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import productService from '../../services/productService';
import {
  Package,
  Layers,
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Power,
  DollarSign,
  Tag,
  CheckCircle2,
  Sliders,
  Loader2,
  Info,
} from 'lucide-react';

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bannerNotice, setBannerNotice] = useState(null);

  // Variant Modal States
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [deleteVariantTarget, setDeleteVariantTarget] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Variant Form State
  const [variantForm, setVariantForm] = useState({
    name: '',
    sku: '',
    price: '0.00',
    currency: 'USD',
    billing_type: 'RECURRING',
    description: '',
    is_active: true,
    attributesString: '{\n  "seats": 10,\n  "storage_gb": 100\n}',
  });

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const data = await productService.getProduct(id);
      setProduct(data);
    } catch (err) {
      console.error('Failed to load product details', err);
      setBannerNotice({ type: 'danger', message: 'Failed to retrieve product record.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  const handleVariantFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setVariantForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Auto-generate SKU from name if empty
    if (name === 'name' && !editingVariant && product) {
      const prefix = product.code.split('-')[0].toUpperCase();
      const suffix = value.replace(/[^A-Za-z0-9]+/g, '').substring(0, 4).toUpperCase();
      if (suffix) {
        setVariantForm((prev) => ({ ...prev, sku: `${prefix}-${suffix}` }));
      }
    }
    if (modalError) setModalError('');
  };

  const openAddVariantModal = () => {
    setEditingVariant(null);
    setVariantForm({
      name: '',
      sku: '',
      price: '49.00',
      currency: 'USD',
      billing_type: product?.is_recurring ? 'RECURRING' : 'ONE_TIME',
      description: '',
      is_active: true,
      attributesString: '{\n  "seats": 5,\n  "storage_gb": 50\n}',
    });
    setModalError('');
    setIsVariantModalOpen(true);
  };

  const openEditVariantModal = (variant) => {
    setEditingVariant(variant);
    setVariantForm({
      name: variant.name,
      sku: variant.sku,
      price: variant.price,
      currency: variant.currency,
      billing_type: variant.billing_type,
      description: variant.description || '',
      is_active: variant.is_active,
      attributesString: JSON.stringify(variant.attributes || {}, null, 2),
    });
    setModalError('');
    setIsVariantModalOpen(true);
  };

  const handleVariantSubmit = async (e) => {
    e.preventDefault();
    if (!variantForm.name.trim() || !variantForm.sku.trim()) {
      setModalError('Variant Name and Unique SKU are required.');
      return;
    }

    let parsedAttributes = {};
    if (variantForm.attributesString.trim()) {
      try {
        parsedAttributes = JSON.parse(variantForm.attributesString);
      } catch (jsonErr) {
        setModalError('Custom Attributes must be valid JSON format (e.g. {"seats": 10}).');
        return;
      }
    }

    setModalLoading(true);
    setModalError('');

    const payload = {
      name: variantForm.name.trim(),
      sku: variantForm.sku.trim().toUpperCase(),
      price: variantForm.price,
      currency: variantForm.currency,
      billing_type: variantForm.billing_type,
      description: variantForm.description,
      is_active: variantForm.is_active,
      attributes: parsedAttributes,
    };

    try {
      if (editingVariant) {
        const res = await productService.updateVariant(editingVariant.id, payload);
        setBannerNotice({ type: 'success', message: res.message || 'Variant updated successfully.' });
      } else {
        const res = await productService.createVariant(product.id, payload);
        setBannerNotice({ type: 'success', message: res.message || 'Variant created successfully.' });
      }
      setIsVariantModalOpen(false);
      fetchProductDetails();
    } catch (err) {
      const serverData = err.response?.data;
      if (serverData && typeof serverData === 'object') {
        const errors = Object.values(serverData).flat().join(' ');
        setModalError(errors || 'Failed to save variant.');
      } else {
        setModalError('Connection error. Please try again.');
      }
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleVariantStatus = async (variant) => {
    try {
      const res = await productService.updateVariantStatus(variant.id, !variant.is_active);
      setBannerNotice({ type: 'success', message: res.message || 'Variant status updated.' });
      fetchProductDetails();
    } catch (err) {
      setBannerNotice({ type: 'danger', message: 'Failed to update variant status.' });
    }
  };

  const handleDeleteVariant = async () => {
    if (!deleteVariantTarget) return;
    setModalLoading(true);
    try {
      const res = await productService.deleteVariant(deleteVariantTarget.id);
      setDeleteVariantTarget(null);
      setBannerNotice({ type: 'success', message: res.message || 'Variant deleted successfully.' });
      fetchProductDetails();
    } catch (err) {
      setBannerNotice({ type: 'danger', message: 'Failed to delete variant.' });
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Product Details">
        <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm text-slate-500 font-medium">Loading product specifications and variants...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!product) {
    return (
      <DashboardLayout title="Product Not Found">
        <EmptyState
          icon={Package}
          title="Product not found"
          description="The requested product does not exist or has been deleted."
          actionLabel="Return to Catalog"
          onAction={() => navigate('/admin/products')}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`${product.name} — Tier & Variant Management`}
      subtitle={`Manage product specifications and plan tiers under SKU family: ${product.code}`}
    >
      <div className="space-y-6">
        {/* Back Link */}
        <div>
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Products Catalog</span>
          </Link>
        </div>

        {bannerNotice && (
          <Alert variant={bannerNotice.type} onClose={() => setBannerNotice(null)}>
            {bannerNotice.message}
          </Alert>
        )}

        {/* Product Overview Hero Card */}
        <Card className="border-l-4 border-l-indigo-600">
          <CardBody className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <ProductCategoryBadge category={product.category} />
                  <ProductStatusBadge status={product.status} />
                  {product.is_recurring ? (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Recurring Subscription
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      One-Time Offering
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{product.name}</h2>
                <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                  {product.description || 'No description provided for this software product.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="text-slate-500">Unique Code:</div>
                  <div className="font-mono font-bold text-slate-900">{product.code}</div>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200">
                    Created: {new Date(product.created_at).toLocaleDateString()}
                  </div>
                </div>

                <Button variant="primary" size="md" icon={Plus} onClick={openAddVariantModal}>
                  Add Tier / Variant
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Variants List Section */}
        <Card>
          <CardHeader
            title="Product Tiers & Variants"
            subtitle={`${product.variants?.length || 0} variant tier(s) configured for this product.`}
            action={
              <Button variant="outline" size="sm" icon={Plus} onClick={openAddVariantModal}>
                New Variant
              </Button>
            }
          />
          <CardBody className="p-0">
            {(!product.variants || product.variants.length === 0) ? (
              <EmptyState
                icon={Layers}
                title="No variants configured yet"
                description="Variants represent selectable editions or tiers (e.g. Starter, Pro, Enterprise) for subscription plans."
                actionLabel="Create First Variant"
                onAction={openAddVariantModal}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-6">Tier / Variant Name</th>
                      <th className="py-3 px-6">SKU Identifier</th>
                      <th className="py-3 px-6">Base Unit Price</th>
                      <th className="py-3 px-6">Billing Mode</th>
                      <th className="py-3 px-6">Specifications & Attributes</th>
                      <th className="py-3 px-6">Status</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {product.variants.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900">{v.name}</span>
                            {v.description && (
                              <span className="text-xs text-slate-500 line-clamp-1">{v.description}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                            {v.sku}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-900 font-bold">
                          ${v.price}{' '}
                          <span className="text-xs font-normal text-slate-500">{v.currency}</span>
                        </td>
                        <td className="py-4 px-6">
                          <BillingTypeBadge type={v.billing_type} />
                        </td>
                        <td className="py-4 px-6">
                          {v.attributes && Object.keys(v.attributes).length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {Object.entries(v.attributes).map(([key, val]) => (
                                <span
                                  key={key}
                                  className="text-[10px] px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 border border-slate-200 font-medium"
                                >
                                  {key}: <strong>{String(val)}</strong>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">None</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <StatusBadge isActive={v.is_active} />
                        </td>
                        <td className="py-4 px-6 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => openEditVariantModal(v)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Edit Variant"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleVariantStatus(v)}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              v.is_active
                                ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={v.is_active ? 'Deactivate Variant' : 'Activate Variant'}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteVariantTarget(v)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Variant"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Modal: Add / Edit Variant */}
      <Modal
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        title={editingVariant ? 'Edit Variant Tier' : 'Add New Variant Tier'}
        description={`Configure an offering tier for ${product.name}.`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleVariantSubmit} className="space-y-4" noValidate>
          {modalError && (
            <Alert variant="danger" onClose={() => setModalError('')}>
              {modalError}
            </Alert>
          )}

          <Input
            label="Variant / Tier Name"
            name="name"
            placeholder="e.g. Professional Tier"
            value={variantForm.name}
            onChange={handleVariantFormChange}
            required
          />

          <Input
            label="Variant SKU"
            name="sku"
            placeholder="e.g. BL-ANL-PRO"
            value={variantForm.sku}
            onChange={handleVariantFormChange}
            required
            helperText="Unique Stock Keeping Unit. Converted to uppercase automatically."
          />

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input
                label="Base Price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                icon={DollarSign}
                value={variantForm.price}
                onChange={handleVariantFormChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Currency</label>
              <select
                name="currency"
                value={variantForm.currency}
                onChange={handleVariantFormChange}
                className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Billing Mode</label>
            <select
              name="billing_type"
              value={variantForm.billing_type}
              onChange={handleVariantFormChange}
              className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="RECURRING">Recurring Subscription</option>
              <option value="ONE_TIME">One-Time Charge</option>
              <option value="METERED">Metered / Usage-Based</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              name="description"
              rows={2}
              value={variantForm.description}
              onChange={handleVariantFormChange}
              placeholder="Highlight what is included in this tier..."
              className="w-full text-sm rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700">Custom Attributes (JSON)</label>
              <span className="text-[11px] text-slate-400">e.g. seats, storage, features</span>
            </div>
            <textarea
              name="attributesString"
              rows={3}
              value={variantForm.attributesString}
              onChange={handleVariantFormChange}
              className="w-full font-mono text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="is_active"
              checked={variantForm.is_active}
              onChange={handleVariantFormChange}
              className="w-4 h-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-sm font-medium text-slate-700">Active variant (available for subscription plans)</span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" size="md" onClick={() => setIsVariantModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={modalLoading}>
              {editingVariant ? 'Update Variant' : 'Create Variant'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirm Delete Variant */}
      <Modal
        isOpen={!!deleteVariantTarget}
        onClose={() => setDeleteVariantTarget(null)}
        title="Delete Variant?"
        description="Are you sure you want to delete this variant tier?"
        maxWidth="max-w-md"
        footer={
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setDeleteVariantTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" isLoading={modalLoading} onClick={handleDeleteVariant}>
              Confirm Delete
            </Button>
          </div>
        }
      >
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
          Variant: <span className="font-bold">{deleteVariantTarget?.name}</span> ({deleteVariantTarget?.sku})
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default ProductDetailPage;

