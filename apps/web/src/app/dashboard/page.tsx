'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '../../components/layout/AppLayout';
import { useAuth } from '../../lib/auth-context';
import { fetchApi } from '../../lib/api';
import { formatUsd } from '../../lib/money';
import Link from 'next/link';
import {
  ShoppingBag,
  DollarSign,
  Building2,
  ChefHat,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', user?.role],
    queryFn: () => fetchApi('/dashboards'),
    enabled: !!user,
  });


  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 text-slate-500 font-medium">
          Loading dashboard metrics...
        </div>
      </AppLayout>
    );
  }

  const metrics = data?.metrics || {};

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Welcome back, {user?.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Role Overview: <span className="font-semibold text-emerald-700">{user?.role}</span>
          </p>
        </div>

        {/* Admin Dashboard */}
        {user?.role === 'ADMIN' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{formatUsd(metrics.totalRevenueCents || 0)}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Orders</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.todayOrdersCount || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Companies</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.activeCompaniesCount || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Catalogue Items</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalDishesCount || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ChefHat className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-base">Quick Operations Shortcuts</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/orders"
                    className="p-4 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition group"
                  >
                    <ShoppingBag className="w-5 h-5 text-emerald-600 mb-2" />
                    <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">Create / Manage Orders</p>
                    <p className="text-xs text-slate-500">Order placement & cut-off</p>
                  </Link>
                  <Link
                    href="/kitchen"
                    className="p-4 rounded-lg border border-slate-200 hover:border-amber-500 hover:bg-amber-50/30 transition group"
                  >
                    <ChefHat className="w-5 h-5 text-amber-600 mb-2" />
                    <p className="text-sm font-bold text-slate-900 group-hover:text-amber-700">Kitchen Prep Board</p>
                    <p className="text-xs text-slate-500">Station cooking units</p>
                  </Link>
                  <Link
                    href="/dispatch"
                    className="p-4 rounded-lg border border-slate-200 hover:border-sky-500 hover:bg-sky-50/30 transition group"
                  >
                    <Truck className="w-5 h-5 text-sky-600 mb-2" />
                    <p className="text-sm font-bold text-slate-900 group-hover:text-sky-700">Dispatch Drops</p>
                    <p className="text-xs text-slate-500">Driver drop assignment</p>
                  </Link>
                  <Link
                    href="/billing"
                    className="p-4 rounded-lg border border-slate-200 hover:border-purple-500 hover:bg-purple-50/30 transition group"
                  >
                    <DollarSign className="w-5 h-5 text-purple-600 mb-2" />
                    <p className="text-sm font-bold text-slate-900 group-hover:text-purple-700">Invoices & Billing</p>
                    <p className="text-xs text-slate-500">Company billing records</p>
                  </Link>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-base">System Pricing Health</h3>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Unpriced Dishes on Standard Tier</p>
                    <p className="text-xs text-slate-500">Dishes without price will be hidden from employee menu</p>
                  </div>
                  <span className="text-lg font-extrabold text-amber-600">{metrics.unpricedDishesCount || 0}</span>
                </div>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:underline"
                >
                  Manage Price Tiers & Overrides <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Kitchen Dashboard */}
        {user?.role === 'KITCHEN' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase">Total Prep Units Today</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalPrepUnitsToday || 0}</p>
              </div>
              <div className="bg-amber-50 p-5 rounded-xl border border-amber-200">
                <p className="text-xs font-semibold text-amber-700 uppercase">Pending Cooking</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">{metrics.pendingCount || 0}</p>
              </div>
              <div className="bg-sky-50 p-5 rounded-xl border border-sky-200">
                <p className="text-xs font-semibold text-sky-700 uppercase">In Progress (Started)</p>
                <p className="text-2xl font-bold text-sky-900 mt-1">{metrics.startedCount || 0}</p>
              </div>
              <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200">
                <p className="text-xs font-semibold text-emerald-700 uppercase">Completed (Done)</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">{metrics.doneCount || 0}</p>
              </div>
            </div>

            {metrics.lateCount > 0 && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <div>
                    <p className="text-sm font-bold">{metrics.lateCount} Prep Units are Late / At-Risk!</p>
                    <p className="text-xs text-rose-600">Action required immediately on Kitchen Board.</p>
                  </div>
                </div>
                <Link
                  href="/kitchen"
                  className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-lg hover:bg-rose-700 transition"
                >
                  Go to Kitchen Board
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Dispatch Dashboard */}
        {user?.role === 'DISPATCH' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase">Today's Delivery Drops</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalDropsToday || 0}</p>
            </div>
            <div className="bg-amber-50 p-5 rounded-xl border border-amber-200">
              <p className="text-xs font-semibold text-amber-700 uppercase">Unassigned Drops</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">{metrics.unassignedCount || 0}</p>
            </div>
            <div className="bg-sky-50 p-5 rounded-xl border border-sky-200">
              <p className="text-xs font-semibold text-sky-700 uppercase">Out For Delivery</p>
              <p className="text-2xl font-bold text-sky-900 mt-1">{metrics.outForDeliveryCount || 0}</p>
            </div>
            <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200">
              <p className="text-xs font-semibold text-emerald-700 uppercase">On-Time Delivery Rate</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">{metrics.onTimeRate || 100}%</p>
            </div>
          </div>
        )}

        {/* Driver Dashboard */}
        {user?.role === 'DRIVER' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase">Assigned Drops Today</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalAssigned || 0}</p>
              </div>
              <div className="bg-amber-50 p-5 rounded-xl border border-amber-200">
                <p className="text-xs font-semibold text-amber-700 uppercase">Pending Delivery</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">{metrics.pendingCount || 0}</p>
              </div>
              <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200">
                <p className="text-xs font-semibold text-emerald-700 uppercase">Delivered</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">{metrics.completedCount || 0}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Driver Delivery Interface</h3>
                <p className="text-xs text-slate-500">View today's assigned drop list, customer addresses, notes & photo uploads.</p>
              </div>
              <Link
                href="/driver"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-md transition"
              >
                Open Mobile Delivery View
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
