'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '../../components/layout/AppLayout';
import { fetchApi } from '../../lib/api';
import { formatUsd } from '../../lib/money';
import { Receipt, DollarSign, CheckCircle2, Building2, FileText, ArrowRight } from 'lucide-react';

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const { data: uninvoicedGroups, isLoading: uninvoicedLoading } = useQuery({
    queryKey: ['uninvoicedOrders'],
    queryFn: () => fetchApi('/billing/uninvoiced-orders'),
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => fetchApi('/billing/invoices'),
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (payload: { companyId: string; orderIds: string[] }) =>
      fetchApi('/billing/invoices', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uninvoicedOrders'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setSelectedOrderIds([]);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (payload: { id: string; status: 'PAID' | 'UNPAID' }) =>
      fetchApi(`/billing/invoices/${payload.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: payload.status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });



  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Company Billing & Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">Group confirmed orders into corporate invoices and record payment status.</p>
        </div>

        {/* Uninvoiced Orders Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Uninvoiced Confirmed Orders</h2>
              <p className="text-xs text-slate-500">Select orders per company to create an internal invoice record.</p>
            </div>
          </div>

          {uninvoicedLoading ? (
            <p className="text-xs text-slate-500">Loading uninvoiced orders...</p>
          ) : uninvoicedGroups?.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">All confirmed orders have been invoiced!</p>
          ) : (
            <div className="space-y-6">
              {uninvoicedGroups?.map((group: any) => (
                <div key={group.company?.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{group.company?.name}</h3>
                      <p className="text-xs text-slate-500">
                        {group.orders?.length || 0} Orders Outstanding • Total: <strong className="text-emerald-700">{formatUsd(group.totalCents)}</strong>
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        createInvoiceMutation.mutate({
                          companyId: group.company.id,
                          orderIds: group.orders.map((o: any) => o.id),
                        })
                      }
                      disabled={createInvoiceMutation.isPending}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition disabled:opacity-50"
                    >
                      Generate Invoice for All ({formatUsd(group.totalCents)})
                    </button>
                  </div>

                  <ul className="space-y-1.5 text-xs">
                    {group.orders?.map((ord: any) => (
                      <li key={ord.id} className="p-2.5 bg-white rounded border border-slate-200 flex items-center justify-between">
                        <span>
                          Order <strong>#{ord.orderNumber}</strong> ({ord.employee?.name}) • {new Date(ord.deliveryDate).toISOString().split('T')[0]}
                        </span>
                        <span className="font-bold text-slate-900">{formatUsd(ord.totalCents)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Generated Invoices Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Generated Company Invoices</h2>

          {invoicesLoading ? (
            <p className="text-xs text-slate-500">Loading invoices...</p>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Company</th>
                  <th className="p-3">Orders Count</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices?.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="p-3 font-semibold text-slate-900">{inv.company?.name}</td>
                    <td className="p-3 text-slate-600">{inv.orders?.length || 0} Orders</td>
                    <td className="p-3 font-bold text-emerald-700">{formatUsd(inv.totalCents)}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 text-xs font-extrabold rounded-full ${
                          inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {inv.status === 'UNPAID' ? (
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: inv.id, status: 'PAID' })}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded transition"
                        >
                          Mark as Paid
                        </button>
                      ) : (
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: inv.id, status: 'UNPAID' })}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded border border-slate-300 transition"
                        >
                          Mark Unpaid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
