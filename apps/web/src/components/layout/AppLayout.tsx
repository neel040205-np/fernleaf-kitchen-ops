'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Tags,
  Building2,
  Users,
  ShoppingBag,
  ChefHat,
  Truck,
  Receipt,
  Settings,
  LogOut,
  UserCheck,
  Menu,
  X,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: any;
  roles: Array<'ADMIN' | 'KITCHEN' | 'DISPATCH' | 'DRIVER'>;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'KITCHEN', 'DISPATCH', 'DRIVER'] },
  { label: 'Catalogue & Menu', href: '/catalogue', icon: UtensilsCrossed, roles: ['ADMIN'] },
  { label: 'Price Tiers', href: '/pricing', icon: Tags, roles: ['ADMIN'] },
  { label: 'Companies', href: '/companies', icon: Building2, roles: ['ADMIN'] },
  { label: 'Employees', href: '/employees', icon: Users, roles: ['ADMIN'] },
  { label: 'Orders', href: '/orders', icon: ShoppingBag, roles: ['ADMIN'] },
  { label: 'Kitchen Board', href: '/kitchen', icon: ChefHat, roles: ['ADMIN', 'KITCHEN'] },
  { label: 'Dispatch Board', href: '/dispatch', icon: Truck, roles: ['ADMIN', 'DISPATCH'] },
  { label: 'My Deliveries', href: '/driver', icon: Truck, roles: ['DRIVER'] },
  { label: 'Billing & Invoices', href: '/billing', icon: Receipt, roles: ['ADMIN'] },
  { label: 'Platform Settings', href: '/settings', icon: Settings, roles: ['ADMIN'] },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auto-close sidebar on mobile screens when navigating
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [pathname]);

  const filteredNav = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full badge-admin">ADMIN</span>;
      case 'KITCHEN':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full badge-kitchen">KITCHEN</span>;
      case 'DISPATCH':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full badge-dispatch">DISPATCH</span>;
      case 'DRIVER':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full badge-driver">DRIVER</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden relative">
      {/* Mobile Overlay Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-30 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`bg-slate-900 text-white flex flex-col shrink-0 border-r border-slate-800 transition-all duration-300 ease-in-out z-40 ${
          isSidebarOpen
            ? 'w-64 opacity-100 translate-x-0'
            : 'w-0 opacity-0 -translate-x-full overflow-hidden border-none pointer-events-none p-0'
        } max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:h-full`}
      >
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-xs">
              <img src="/logo.png" alt="Fernleaf Kitchen Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight text-slate-100">Fernleaf Kitchen</h1>
              <p className="text-xs text-slate-400">Operations Admin</p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-md"
            title="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200 shrink-0">
                {user?.name.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-medium text-slate-200 truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden w-full transition-all duration-300">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Hamburger / Three stripes toggle button */}
            <button
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-hidden"
              title={isSidebarOpen ? 'Collapse sidebar (Full screen)' : 'Expand sidebar'}
            >
              <Menu className="w-5 h-5" />
            </button>

            <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate">
              {filteredNav.find((n) => n.href === pathname)?.label || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-2.5 sm:px-3 py-1.5 rounded-md border border-slate-200">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">
                Signed in as: <strong className="text-slate-700">{user?.name}</strong>
              </span>
              <span className="sm:hidden font-semibold text-slate-700">{user?.name}</span>
              {getRoleBadge(user?.role)}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
