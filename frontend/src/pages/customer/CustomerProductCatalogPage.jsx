import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { ProductCategoryBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import productService from '../../services/productService';
import {
  Package,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Loader2,
  CreditCard,
} from 'lucide-react';

export const CustomerProductCatalogPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoading(true);
        // Customer endpoint automatically filters to active products only
        const data = await productService.getProducts();
        setProducts(data);
      } catch (err) {
        console.error('Failed to load customer catalog', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  return (
    <DashboardLayout
      title="Software Catalog & Offerings"
      subtitle="Explore Brightloop software platforms, tier plans, and add-on cloud services."
    >
      <div className="space-y-8">
        {/* Hero banner */}
        <div className="p-6 bg-gradient-to-tr from-slate-900 to-indigo-950 text-white rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Subscription Catalog
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight">Available Brightloop Products</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Discover subscription packages designed to scale with your team. Once Module 3 (Plans) is active, you will be able to subscribe directly from this portal.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs shrink-0 space-y-1">
            <div className="text-slate-400">Available Products:</div>
            <div className="text-lg font-bold text-white">{products.length} Core Platforms</div>
            <div className="text-emerald-400 flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Direct provisioning enabled</span>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-sm font-medium">Loading software catalog...</span>
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products available"
            description="Our product catalog is currently being updated by the Brightloop operations team."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                <CardBody className="p-6 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <ProductCategoryBadge category={product.category} />
                    <span className="text-xs font-mono text-slate-400 font-semibold">{product.code}</span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{product.name}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {product.description || 'Enterprise-ready SaaS subscription.'}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Pricing</span>
                      <span className="text-sm font-bold text-slate-900">
                        ${product.min_price}
                        {product.min_price !== product.max_price ? ` - $${product.max_price}` : ''}
                        {product.is_recurring ? ' / mo' : ''}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 block font-medium">Tiers Available</span>
                      <span className="font-semibold text-indigo-600">
                        {product.active_variants_count} Editions
                      </span>
                    </div>
                  </div>
                </CardBody>

                <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Module 2 verified
                  </span>

                  <span className="text-indigo-600 font-medium inline-flex items-center gap-1">
                    Subscription Plans (Module 3) coming next <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CustomerProductCatalogPage;

