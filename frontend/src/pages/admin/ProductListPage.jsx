import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { ProductStatusBadge, ProductCategoryBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import productService from '../../services/productService';
import {
  Package,
  Plus,
  Search,
  Layers,
  CheckCircle2,
  Edit2,
  Trash2,
  Power,
  ChevronRight,
  Filter,
  DollarSign,
  Tag,
  Loader2,
  ArrowRight,
} from 'lucide-react';

export const ProductListPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteProductTarget, setDeleteProductTarget] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Notifications
  const [bannerNotice, setBannerNotice] = useState(null);

  // Form Data
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'SOFTWARE',
    status: 'ACTIVE',
    description: '',
    is_recurring: true,
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;

      const data = await productService.getProducts(params);
      setProducts(data);
    } catch (err) {
      console.error('Failed to fetch products', err);
      setBannerNotice({ type: 'danger', message: 'Failed to retrieve products catalog.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Auto-generate code from name if code is empty or untouched during create
    if (name === 'name' && !editingProduct) {
      const generatedCode = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setFormData((prev) => ({ ...prev, code: generatedCode }));
    }
    if (modalError) setModalError('');
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      code: '',
      category: 'SOFTWARE',
      status: 'ACTIVE',
      description: '',
      is_recurring: true,
    });
    setModalError('');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      code: product.code,
      category: product.category,
      status: product.status,
      description: product.description || '',
      is_recurring: product.is_recurring,
    });
    setModalError('');
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      setModalError('Product Name and Unique Code/Slug are required.');
      return;
    }

    setModalLoading(true);
    setModalError('');

    try {
      const res = await productService.createProduct(formData);
      setIsCreateModalOpen(false);
      setBannerNotice({ type: 'success', message: res.message || 'Product created successfully.' });
      fetchProducts();
    } catch (err) {
      const serverData = err.response?.data;
      if (serverData && typeof serverData === 'object') {
        const errors = Object.values(serverData).flat().join(' ');
        setModalError(errors || 'Failed to create product.');
      } else {
        setModalError('Connection error. Please try again.');
      }
    } finally {
      setModalLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      setModalError('Product Name and Unique Code/Slug are required.');
      return;
    }

    setModalLoading(true);
    setModalError('');

    try {
      const res = await productService.updateProduct(editingProduct.id, formData);
      setIsEditModalOpen(false);
      setBannerNotice({ type: 'success', message: res.message || 'Product updated successfully.' });
      fetchProducts();
    } catch (err) {
      const serverData = err.response?.data;
      if (serverData && typeof serverData === 'object') {
        const errors = Object.values(serverData).flat().join(' ');
        setModalError(errors || 'Failed to update product.');
      } else {
        setModalError('Connection error. Please try again.');
      }
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleStatus = async (product) => {
    const nextStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await productService.updateProductStatus(product.id, nextStatus);
      setBannerNotice({ type: 'success', message: res.message || 'Product status updated.' });
      fetchProducts();
    } catch (err) {
      setBannerNotice({ type: 'danger', message: 'Failed to update product status.' });
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProductTarget) return;
    setModalLoading(true);
    try {
      const res = await productService.deleteProduct(deleteProductTarget.id);
      setDeleteProductTarget(null);
      setBannerNotice({ type: 'success', message: res.message || 'Product deleted successfully.' });
      fetchProducts();
    } catch (err) {
      setBannerNotice({ type: 'danger', message: 'Failed to delete product.' });
    } finally {
      setModalLoading(false);
    }
  };

  // Metrics
  const activeProductsCount = products.filter((p) => p.status === 'ACTIVE').length;
  const totalVariantsCount = products.reduce((acc, p) => acc + (p.total_variants_count || 0), 0);

  return (
    <DashboardLayout
      title="Product Catalog & Tier Governance"
      subtitle="Create, configure, and organize Brightloop SaaS products and their tier variants."
    >
      <div className="space-y-6">
        {bannerNotice && (
          <Alert variant={bannerNotice.type} onClose={() => setBannerNotice(null)}>
            {bannerNotice.message}
          </Alert>
        )}

        {/* Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-indigo-600">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Total Products</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : products.length}</p>
                <p className="text-xs text-indigo-600 font-medium mt-0.5">{activeProductsCount} published live</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-cyan-600">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Configured Variants</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : totalVariantsCount}</p>
                <p className="text-xs text-cyan-600 font-medium mt-0.5">Across all product tiers</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-emerald-600">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Subscription Ready</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {products.filter((p) => p.is_recurring).length}
                </p>
                <p className="text-xs text-emerald-600 font-medium mt-0.5">Recurring billing compatible</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-purple-600">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Module 2 Scope</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">Catalog Live</p>
                <p className="text-xs text-purple-600 font-medium mt-0.5">Ready for Module 3 Plans</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Action & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 max-w-md">
            <Input
              name="search"
              placeholder="Search by product, code or variant SKU..."
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button type="submit" variant="outline" size="md">
              Search
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-3">
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="SOFTWARE">SaaS Platform</option>
              <option value="SERVICE">Managed Service</option>
              <option value="STORAGE">Cloud Storage</option>
              <option value="ADDON">Add-on Module</option>
              <option value="API">API & Integration</option>
            </select>

            {/* Status Dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
              <option value="DRAFT">Drafts</option>
              <option value="ARCHIVED">Archived</option>
            </select>

            <Button variant="primary" size="md" icon={Plus} onClick={openCreateModal}>
              New Product
            </Button>
          </div>
        </div>

        {/* Product List Table */}
        <Card>
          <CardHeader
            title="Product Catalog Directory"
            subtitle={`${products.length} product(s) registered in the Brightloop directory`}
          />
          <CardBody className="p-0">
            {loading ? (
              <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span className="text-sm">Loading product catalog...</span>
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No products found"
                description={
                  search
                    ? `No products match "${search}". Try adjusting your query.`
                    : 'Get started by creating your first software product.'
                }
                actionLabel="Create Product"
                onAction={openCreateModal}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-6">Product Name</th>
                      <th className="py-3 px-6">Code / Slug</th>
                      <th className="py-3 px-6">Category</th>
                      <th className="py-3 px-6">Variants / Tiers</th>
                      <th className="py-3 px-6">Price Range</th>
                      <th className="py-3 px-6">Status</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((product) => {
                      const hasVariants = product.total_variants_count > 0;
                      return (
                        <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900">{product.name}</span>
                              {product.description && (
                                <span className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                  {product.description}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                              {product.code}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <ProductCategoryBadge category={product.category} />
                          </td>
                          <td className="py-4 px-6">
                            <Link
                              to={`/admin/products/${product.id}`}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>
                                {product.active_variants_count} active / {product.total_variants_count} total
                              </span>
                            </Link>
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-700 font-medium">
                            {hasVariants ? (
                              <span>
                                ${product.min_price}
                                {product.min_price !== product.max_price ? ` - $${product.max_price}` : ''}
                                {product.is_recurring ? ' / mo' : ''}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">No variants yet</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <ProductStatusBadge status={product.status} />
                          </td>
                          <td className="py-4 px-6 text-right space-x-1">
                            <Link
                              to={`/admin/products/${product.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                              title="Manage Tiers & Variants"
                            >
                              <span>Variants</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => openEditModal(product)}
                              className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Edit Product"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleStatus(product)}
                              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                product.status === 'ACTIVE'
                                  ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={product.status === 'ACTIVE' ? 'Deactivate Product' : 'Activate Product'}
                            >
                              <Power className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteProductTarget(product)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
      </div>

      {/* Modal: Create Product */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New SaaS Product"
        description="Define a new core product offering before attaching plan tiers."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4" noValidate>
          {modalError && (
            <Alert variant="danger" onClose={() => setModalError('')}>
              {modalError}
            </Alert>
          )}

          <Input
            label="Product Name"
            name="name"
            placeholder="e.g. Brightloop Cloud Analytics"
            value={formData.name}
            onChange={handleFormChange}
            required
          />

          <Input
            label="Product Code / Slug"
            name="code"
            placeholder="e.g. brightloop-cloud-analytics"
            value={formData.code}
            onChange={handleFormChange}
            required
            helperText="Unique identifier used in URLs, APIs, and invoice generation."
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleFormChange}
                className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="SOFTWARE">SaaS Platform</option>
                <option value="SERVICE">Managed Service</option>
                <option value="STORAGE">Cloud Storage</option>
                <option value="ADDON">Add-on Module</option>
                <option value="API">API & Integration</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Initial Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ACTIVE">Active (Live)</option>
                <option value="DRAFT">Draft</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleFormChange}
              placeholder="Detailed summary of the product capabilities and value proposition..."
              className="w-full text-sm rounded-lg border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              name="is_recurring"
              checked={formData.is_recurring}
              onChange={handleFormChange}
              className="w-4 h-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-sm font-medium text-slate-700">
              Supports recurring subscription billing cycles (Monthly, Yearly, etc.)
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" size="md" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={modalLoading} icon={Plus}>
              Create Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Product */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Product Details"
        description="Update metadata and properties for this product."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4" noValidate>
          {modalError && (
            <Alert variant="danger" onClose={() => setModalError('')}>
              {modalError}
            </Alert>
          )}

          <Input
            label="Product Name"
            name="name"
            value={formData.name}
            onChange={handleFormChange}
            required
          />

          <Input
            label="Product Code / Slug"
            name="code"
            value={formData.code}
            onChange={handleFormChange}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleFormChange}
                className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="SOFTWARE">SaaS Platform</option>
                <option value="SERVICE">Managed Service</option>
                <option value="STORAGE">Cloud Storage</option>
                <option value="ADDON">Add-on Module</option>
                <option value="API">API & Integration</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleFormChange}
              className="w-full text-sm rounded-lg border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="is_recurring"
              checked={formData.is_recurring}
              onChange={handleFormChange}
              className="w-4 h-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-sm font-medium text-slate-700">Supports recurring billing cycles</span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" size="md" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={modalLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirm Delete Product */}
      <Modal
        isOpen={!!deleteProductTarget}
        onClose={() => setDeleteProductTarget(null)}
        title="Delete Product?"
        description="Are you sure you want to delete this product? All attached variants and historical associations will be permanently removed."
        maxWidth="max-w-md"
        footer={
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setDeleteProductTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" isLoading={modalLoading} onClick={handleDeleteProduct}>
              Confirm Delete
            </Button>
          </div>
        }
      >
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
          Product: <span className="font-bold">{deleteProductTarget?.name}</span> ({deleteProductTarget?.code})
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default ProductListPage;
