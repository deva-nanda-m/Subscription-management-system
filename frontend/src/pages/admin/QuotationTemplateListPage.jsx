import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import quotationService from '../../services/quotationService';
import {
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  Layers,
  CheckCircle2,
  Calendar,
  Loader2,
  ChevronRight,
  Package,
} from 'lucide-react';

export const QuotationTemplateListPage = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bannerNotice, setBannerNotice] = useState(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      const data = await quotationService.getTemplates(params);
      const list = data?.results || (Array.isArray(data) ? data : []);
      setTemplates(list);
    } catch (err) {
      console.error('Failed to load quotation templates', err);
      setBannerNotice({ type: 'danger', message: 'Could not load quotation templates catalog.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTemplates();
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete template "${name}"?`)) return;
    try {
      await quotationService.deleteTemplate(id);
      setBannerNotice({ type: 'success', message: `Template "${name}" deleted.` });
      fetchTemplates();
    } catch (err) {
      console.error('Delete template error', err);
      setBannerNotice({ type: 'danger', message: 'Failed to delete template.' });
    }
  };

  return (
    <DashboardLayout
      title="Quotation Templates"
      subtitle="Standardized, reusable templates for rapid customer quotation assembly."
    >
      <div className="space-y-6">
        {bannerNotice && (
          <Alert
            type={bannerNotice.type}
            message={bannerNotice.message}
            onClose={() => setBannerNotice(null)}
          />
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2 max-w-md">
            <Input
              name="search"
              placeholder="Search templates by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
              className="mb-0"
            />
            <Button type="submit" variant="secondary" size="md">
              Search
            </Button>
          </form>

          <Link to="/admin/quotation-templates/new">
            <Button variant="primary" size="md" icon={Plus}>
              Create Template
            </Button>
          </Link>
        </div>

        {/* Templates Grid / Table */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-900 text-sm">Configured Templates</h2>
              <span className="text-xs text-slate-500 font-medium">({templates.length} total)</span>
            </div>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
          </CardHeader>

          <CardBody className="p-0">
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                <p className="text-sm text-slate-500">Loading quotation templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No Quotation Templates Found"
                description="Create standardized product & subscription bundles to streamline sales quotations."
                action={
                  <Link to="/admin/quotation-templates/new">
                    <Button variant="primary" size="sm" icon={Plus}>
                      Create Template
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="p-5 hover:bg-slate-50/70 transition-colors space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-semibold text-slate-900 text-base">{tpl.name}</h3>
                          <StatusBadge isActive={tpl.is_active} />
                          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {tpl.validity_days} days validity
                          </span>
                        </div>
                        {tpl.description && (
                          <p className="text-xs text-slate-500 mt-1">{tpl.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link to={`/admin/quotation-templates/${tpl.id}/edit`}>
                          <Button variant="outline" size="sm" icon={Edit2}>
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Trash2}
                          onClick={() => handleDelete(tpl.id, tpl.name)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    {/* Pre-configured Lines */}
                    {tpl.lines && tpl.lines.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                        {tpl.lines.map((line) => (
                          <div
                            key={line.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 text-xs"
                          >
                            <Package className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="font-semibold">{line.product_name}</span>
                            {line.variant_name && (
                              <span className="text-slate-500">({line.variant_name})</span>
                            )}
                            <span className="text-indigo-600 font-medium">• {line.plan_name}</span>
                            <span className="px-1.5 py-0.5 rounded bg-white font-mono text-[11px] text-slate-600 border border-slate-200">
                              Qty: {line.default_quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default QuotationTemplateListPage;

