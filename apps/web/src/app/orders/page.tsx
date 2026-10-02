'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '../../components/layout/AppLayout';
import { fetchApi } from '../../lib/api';
import {
  ShoppingBag,
  Plus,
  Filter,
  Calendar,
  Clock,
  Building2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [page, setPage] = useState(1);

  // New Order Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderEmployeeId, setOrderEmployeeId] = useState('');
  const [orderDeliveryDate, setOrderDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderDeliveryTime, setOrderDeliveryTime] = useState('12:30');
  const [orderPackaging, setOrderPackaging] = useState('Eco Box');
  const [selectedDishId, setSelectedDishId] = useState('');
  const [comboQty, setComboQty] = useState(1);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [orderLines, setOrderLines] = useState<any[]>([]);

  // Cutoff trigger state
  const [cutoffDate, setCutoffDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', selectedStatus, selectedCompanyId, page],
    queryFn: () =>
      fetchApi(
        `/orders?page=${page}&limit=10${selectedStatus ? `&status=${selectedStatus}` : ''}${
          selectedCompanyId ? `&companyId=${selectedCompanyId}` : ''
        }`,
      ),
  });

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => fetchApi('/companies'),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => fetchApi('/employees'),
  });

  const { data: menuPreview } = useQuery({
    queryKey: ['menuPreviewOrder', orderEmployeeId],
    queryFn: () => fetchApi(`/orders/menu-preview?employeeId=${orderEmployeeId}`),
    enabled: !!orderEmployeeId && isOrderModalOpen,
  });

  const createOrderMutation = useMutation({
    mutationFn: (newOrder: any) =>
      fetchApi('/orders', {
        method: 'POST',
        body: JSON.stringify(newOrder),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsOrderModalOpen(false);
      setOrderLines([]);
    },
  });

  const triggerCutoffMutation = useMutation({
    mutationFn: (date: string) =>
      fetchApi('/orders/process-cutoff', {
        method: 'POST',
        body: JSON.stringify({ deliveryDate: date }),
      }),
    onSuccess: (res) => {
      alert(`Cut-off processed for ${res.processedDate}: ${res.confirmedOrdersCount} orders confirmed, ${res.cancelledDraftsCount} drafts cancelled.`);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const formatUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const addCombinationToOrder = () => {
    if (!selectedDishId) return;

    let targetDish: any = null;
    for (const cat of menuPreview?.categories || []) {
      const found = cat.dishes?.find((d: any) => d.id === selectedDishId);
      if (found) {
        targetDish = found;
        break;
      }
    }

    if (!targetDish) return;

    const chosenOptions = [];
    for (const og of targetDish.optionGroups || []) {
      for (const opt of og.options || []) {
        if (selectedOptionIds.includes(opt.id)) {
          chosenOptions.push({
            optionId: opt.id,
          });
        }
      }
    }

    const newLine = {
      dishId: targetDish.id,
      dishName: targetDish.name,
      quantity: comboQty,
      combinations: [
        {
          quantity: comboQty,
          options: chosenOptions,
        },
      ],
    };

    setOrderLines([...orderLines, newLine]);
    setSelectedOptionIds([]);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Order Management</h1>
            <p className="text-sm text-slate-500 mt-1">Place employee meal orders, inspect historical price snapshots, and trigger cut-off processing.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-lg">
              <input
                type="date"
                value={cutoffDate}
                onChange={(e) => setCutoffDate(e.target.value)}
                className="text-xs p-1 text-slate-700 border-none focus:outline-none"
              />
              <button
                onClick={() => triggerCutoffMutation.mutate(cutoffDate)}
                disabled={triggerCutoffMutation.isPending}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded transition"
              >
                {triggerCutoffMutation.isPending ? 'Processing...' : 'Run Cut-Off Now'}
              </button>
            </div>

            <button
              onClick={() => setIsOrderModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg flex items-center gap-2 shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Place New Order
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 uppercase">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PLACED">PLACED</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 uppercase">Company:</span>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none"
            >
              <option value="">All Companies</option>
              {companies?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading orders...</div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Order #</th>
                  <th className="p-4">Employee</th>
                  <th className="p-4">Company</th>
                  <th className="p-4">Delivery Date / Time</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Invoiced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordersData?.orders?.map((ord: any) => (
                  <tr key={ord.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 font-mono font-bold text-slate-900">#{ord.orderNumber}</td>
                    <td className="p-4 font-semibold text-slate-900">{ord.employee?.name}</td>
                    <td className="p-4 text-slate-700">{ord.employee?.company?.name}</td>
                    <td className="p-4 text-xs text-slate-600">
                      {new Date(ord.deliveryDate).toISOString().split('T')[0]} at {ord.deliveryTime}
                    </td>
                    <td className="p-4 font-bold text-emerald-700">{formatUsd(ord.totalCents)}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                          ord.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.status === 'DELIVERED'
                            ? 'bg-blue-100 text-blue-800'
                            : ord.status === 'PLACED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {ord.invoiceId ? (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                          INVOICED
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">UNINVOICED</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create Order Modal */}
        {isOrderModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base">Staff Create Order on Behalf of Employee</h3>
                <button onClick={() => setIsOrderModalOpen(false)} className="text-slate-400 font-bold">
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs overflow-y-auto flex-1 p-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Select Customer Employee</label>
                    <select
                      value={orderEmployeeId}
                      onChange={(e) => setOrderEmployeeId(e.target.value)}
                      className="w-full p-2.5 rounded border border-slate-300 text-sm"
                    >
                      <option value="">-- Choose Employee --</option>
                      {employees?.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.company?.name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Delivery Date</label>
                    <input
                      type="date"
                      value={orderDeliveryDate}
                      onChange={(e) => setOrderDeliveryDate(e.target.value)}
                      className="w-full p-2.5 rounded border border-slate-300 text-sm"
                    />
                  </div>
                </div>

                {menuPreview && (
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-2">
                    <p className="font-bold text-indigo-900 text-xs">Employee Menu Options Available:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700">Select Dish</label>
                        <select
                          value={selectedDishId}
                          onChange={(e) => setSelectedDishId(e.target.value)}
                          className="w-full p-2 rounded border border-slate-300 text-xs"
                        >
                          <option value="">-- Choose Dish --</option>
                          {menuPreview.categories?.flatMap((c: any) =>
                            c.dishes?.map((d: any) => (
                              <option key={d.id} value={d.id}>
                                {d.name} ({formatUsd(d.resolvedPriceCents)})
                              </option>
                            )),
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700">Dish Quantity</label>
                        <input
                          type="number"
                          min={1}
                          value={comboQty}
                          onChange={(e) => setComboQty(parseInt(e.target.value, 10))}
                          className="w-full p-2 rounded border border-slate-300 text-xs"
                        />
                      </div>
                    </div>

                    {selectedDishId && (
                      <div className="space-y-2 pt-2 border-t border-indigo-100">
                        <p className="text-[11px] font-bold text-slate-700">Select Option Choices:</p>
                        {menuPreview.categories
                          ?.flatMap((c: any) => c.dishes)
                          .find((d: any) => d?.id === selectedDishId)
                          ?.optionGroups?.map((og: any) => (
                            <div key={og.id} className="text-[11px] space-y-1">
                              <span className="font-semibold text-slate-800">{og.name}:</span>
                              <div className="flex flex-wrap gap-2">
                                {og.options?.map((opt: any) => {
                                  const isSelected = selectedOptionIds.includes(opt.id);
                                  return (
                                    <button
                                      type="button"
                                      key={opt.id}
                                      onClick={() => {
                                        if (isSelected) {
                                          setSelectedOptionIds(selectedOptionIds.filter((id) => id !== opt.id));
                                        } else {
                                          setSelectedOptionIds([...selectedOptionIds, opt.id]);
                                        }
                                      }}
                                      className={`px-2 py-1 rounded border text-[10px] font-semibold transition ${
                                        isSelected
                                          ? 'bg-emerald-600 text-white border-emerald-600'
                                          : 'bg-white text-slate-700 border-slate-300'
                                      }`}
                                    >
                                      {opt.name} (+{formatUsd(opt.resolvedPriceCents)})
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}

                        <button
                          type="button"
                          onClick={addCombinationToOrder}
                          className="px-3 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded hover:bg-indigo-700"
                        >
                          Add Dish Combination to Order
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Lines Summary */}
                {orderLines.length > 0 && (
                  <div className="space-y-2 border-t border-slate-200 pt-3">
                    <p className="font-bold text-slate-900 text-xs">Order Summary ({orderLines.length} line items):</p>
                    <ul className="space-y-1">
                      {orderLines.map((line, idx) => (
                        <li key={idx} className="p-2 bg-slate-50 border rounded text-xs flex justify-between items-center">
                          <span>
                            {line.quantity}x <strong>{line.dishName}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => setOrderLines(orderLines.filter((_, i) => i !== idx))}
                            className="text-rose-600 font-bold"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsOrderModalOpen(false)} className="px-4 py-2 text-slate-600 font-semibold text-xs">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!orderEmployeeId || orderLines.length === 0 || createOrderMutation.isPending}
                  onClick={() =>
                    createOrderMutation.mutate({
                      employeeId: orderEmployeeId,
                      deliveryDate: orderDeliveryDate,
                      deliveryTime: orderDeliveryTime,
                      packagingType: orderPackaging,
                      status: 'PLACED',
                      lines: orderLines,
                    })
                  }
                  className="px-4 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {createOrderMutation.isPending ? 'Placing Order...' : 'Place Order Now'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
