import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { ProductCategoryBadge, ProductStatusBadge, BillingTypeBadge } from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import productService from '../../services/productService';
import {
  Package,
  Search,
  Layers,
  CheckCircle2,
  Lock,
  Loader2,
  Tag,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const StaffProductCatalogPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [expandedProductId, setExpandedProductId] = useState(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedCategory !== 'ALL') params.category = selectedCategory;

      const data = await productService.getProducts(params);
      setProducts(data);
    } catch (err) {
      console.error('Failed to load operational product catalog', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const toggleExpand = (productId) => {
    setExpandedProductId((prev) => (prev === productId ? null : productId));
  };

  return (
    <DashboardLayout
      title="Product Catalog & Specifications"
      subtitle="Operational reference for customer subscription assistance, tier specs, and billing configurations."
    >
      <div className="space-y-6">
        {/* Notice of Read-Only Clearance */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Staff Operational Clearance:</strong> You have read-only access to inspect all products, variant tiers, and price tables to support customer inquiries.
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
              placeholder="Search products or SKU specs..."
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button type="submit" variant="outline" size="md">
              Search
            </Button>
          </form>

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
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-sm font-medium">Loading operational catalog...</span>
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products found"
            description="No catalog products match your search criteria."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {products.map((product) => {
              const isExpanded = expandedProductId === product.id;
              return (
                <Card key={product.id} className="transition-all">
                  <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <ProductCategoryBadge category={product.category} />
                        <ProductStatusBadge status={product.status} />
                        <span className="font-mono text-xs text-slate-500 px-2 py-0.5 rounded-sm bg-slate-100">
                          {product.code}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{product.name}</h3>
                      {product.description && (
                        <p className="text-xs text-slate-600 max-w-2xl">{product.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block font-medium">Starting at</span>
                        <span className="text-base font-bold text-slate-900">
                          ${product.min_price}
                          {product.is_recurring ? <span className="text-xs font-normal text-slate-500"> / mo</span> : ''}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleExpand(product.id)}
                        className="gap-1.5"
                      >
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{product.total_variants_count} Tiers</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Variants details */}
                  {isExpanded && (
                    <div className="p-5 bg-slate-50/70 border-t border-slate-100">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        Configured Offering Tiers
                      </h4>
                      <OperationalVariantTable productId={product.id} />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

// Sub-component to fetch and render variants when product is expanded
const OperationalVariantTable = ({ productId }) => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVariants = async () => {
      try {
        const data = await productService.getVariants(productId);
        setVariants(data);
      } catch (err) {
        console.error('Failed to load variants', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVariants();
  }, [productId]);

  if (loading) {
    return <div className="p-4 text-xs text-slate-400">Loading variant specifications...</div>;
  }

  if (variants.length === 0) {
    return <div className="p-4 text-xs text-slate-400 italic">No variants configured for this product.</div>;
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
          <tr>
            <th className="py-2.5 px-4">Tier Name</th>
            <th className="py-2.5 px-4">SKU</th>
            <th className="py-2.5 px-4">Base Price</th>
            <th className="py-2.5 px-4">Billing Type</th>
            <th className="py-2.5 px-4">Specifications</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {variants.map((v) => (
            <tr key={v.id} className="hover:bg-slate-50">
              <td className="py-3 px-4 font-semibold text-slate-800">{v.name}</td>
              <td className="py-3 px-4 font-mono text-slate-600">{v.sku}</td>
              <td className="py-3 px-4 font-bold text-slate-900">
                ${v.price} {v.currency}
              </td>
              <td className="py-3 px-4">
                <BillingTypeBadge type={v.billing_type} />
              </td>
              <td className="py-3 px-4">
                {v.attributes && Object.keys(v.attributes).length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(v.attributes).map(([k, val]) => (
                      <span key={k} className="px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 border border-slate-200">
                        {k}: <strong>{String(val)}</strong>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 italic">Standard</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StaffProductCatalogPage;

