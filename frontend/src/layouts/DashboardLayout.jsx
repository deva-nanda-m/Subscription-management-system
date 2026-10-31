import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from '../components/ui/Badge';
import {
  Layers,
  LayoutDashboard,
  Users,
  LogOut,
  Menu,
  X,
  CreditCard,
  FileText,
  Package,
  Settings,
  Shield,
  ChevronRight,
  User,
} from 'lucide-react';

export const DashboardLayout = ({ children, title, subtitle }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const role = user?.role || 'CUSTOMER';

  // Role-based navigation items
  const getNavLinks = () => {
    if (role === 'ADMIN') {
      return [
        { label: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Staff Management', path: '/admin/staff', icon: Users },
        {
          label: 'Products & Variants',
          path: '/admin/products',
          icon: Package,
          badge: 'Module 2',
        },
        {
          label: 'Subscription Plans',
          path: '/admin/plans',
          icon: CreditCard,
          badge: 'Module 3',
        },
        {
          label: 'Quotation Templates',
          path: '/admin/quotation-templates',
          icon: Layers,
          badge: 'Part 1',
        },
        {
          label: 'Customer Quotations',
          path: '/admin/quotations',
          icon: FileText,
          badge: 'Part 1',
        },
        {
          label: 'Subscriptions',
          path: '/admin/subscriptions',
          icon: Shield,
          badge: 'Part 1',
        },
        {
          label: 'Invoices & Billing',
          path: '#',
          icon: FileText,
          badge: 'Part 2',
          disabled: true,
        },
      ];
    }

    if (role === 'STAFF') {
      return [
        { label: 'Staff Operations', path: '/staff/dashboard', icon: LayoutDashboard },
        {
          label: 'Product Catalog',
          path: '/staff/products',
          icon: Package,
          badge: 'Module 2',
        },
        {
          label: 'Subscription Plans',
          path: '/staff/plans',
          icon: CreditCard,
          badge: 'Module 3',
        },
        {
          label: 'Quotation Templates',
          path: '/staff/quotation-templates',
          icon: Layers,
          badge: 'Part 1',
        },
        {
          label: 'Customer Quotations',
          path: '/staff/quotations',
          icon: FileText,
          badge: 'Part 1',
        },
        {
          label: 'Subscriptions',
          path: '/staff/subscriptions',
          icon: Shield,
          badge: 'Part 1',
        },
        {
          label: 'Invoices & Payments',
          path: '#',
          icon: FileText,
          badge: 'Part 2',
          disabled: true,
        },
      ];
    }

    // CUSTOMER role
    return [
      { label: 'Customer Portal', path: '/customer/dashboard', icon: LayoutDashboard },
      {
        label: 'Software Catalog',
        path: '/customer/products',
        icon: Package,
        badge: 'Module 2',
      },
      {
        label: 'My Quotations',
        path: '/customer/quotations',
        icon: FileText,
        badge: 'Part 1',
      },
      {
        label: 'My Subscriptions',
        path: '/customer/subscriptions',
        icon: CreditCard,
        badge: 'Part 1',
      },
      {
        label: 'Invoices & Receipts',
        path: '#',
        icon: FileText,
        badge: 'Part 2',
        disabled: true,
      },
    ];
  };

  const navLinks = getNavLinks();

  const SidebarContent = () => (
    <div className="flex flex-col h-full justify-between bg-slate-900 text-slate-300">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center shadow-md">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white text-base leading-tight">Brightloop</span>
            <span className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">Subscription Suite</span>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-sm shrink-0">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.full_name || 'User'}</p>
              <p className="text-xs text-slate-400 truncate mb-1">{user?.email}</p>
              <RoleBadge role={user?.role} />
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="px-3 py-2 space-y-1">
          <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">Navigation</p>
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            if (item.disabled) {
              return (
                <div
                  key={item.label}
                  className="flex items-center justify-between px-3 py-2 text-xs text-slate-400 rounded-lg cursor-not-allowed select-none"
                  title="Coming in subsequent modules"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-slate-800 text-slate-400 border border-slate-700">
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Logout button at footer */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col fixed inset-y-0 z-30 shadow-lg border-r border-slate-800">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-xs flex-1 flex flex-col z-50">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-800">{role} Portal</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-600 font-medium">{title || 'Dashboard'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              <Shield className="w-3.5 h-3.5 text-indigo-500" />
              <span>JWT Session Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold text-xs">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="text-xs font-semibold text-slate-700 hidden sm:inline-block">
                {user?.full_name}
              </span>
            </div>
          </div>
        </header>

        {/* Body Container */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {(title || subtitle) && (
            <div className="mb-8">
              {title && <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>}
              {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

