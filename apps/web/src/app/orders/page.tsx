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
  Flame,
  Snowflake,
  Utensils,
  Trash2,
  Check,
  Edit2,
  Search,
  Eye,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

export default function OrdersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState(1);

  // New / Edit Order Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string>('');

  const [orderEmployeeId, setOrderEmployeeId] = useState('');
  const [orderDeliveryDate, setOrderDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderDeliveryTime, setOrderDeliveryTime] = useState('12:30');
  const [orderPackaging, setOrderPackaging] = useState('Eco Box');
  const [orderStatus, setOrderStatus] = useState<string>('PLACED');
  const [selectedDishId, setSelectedDishId] = useState('');
  const [comboQty, setComboQty] = useState(1);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [orderLines, setOrderLines] = useState<any[]>([]);

  // Read / Detail Modal State
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);

  // Delete Modal State
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  // Cutoff trigger state
  const [cutoffDate, setCutoffDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', selectedStatus, selectedCompanyId, searchQuery, page],
    queryFn: () =>
      fetchApi(
        `/orders?page=${page}&limit=10${selectedStatus ? `&status=${selectedStatus}` : ''}${
          selectedCompanyId ? `&companyId=${selectedCompanyId}` : ''
        }${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`,
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

  const { data: menuPreview, isLoading: menuLoading } = useQuery({
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
      closeModal();
    },
    onError: (err: any) => {
      setModalError(err.message || 'Failed to place order (400 Bad Request)');
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: (payload: { id: string; data: any }) =>
      fetchApi(`/orders/${payload.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload.data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      closeModal();
    },
    onError: (err: any) => {
      setModalError(err.message || 'Failed to update order (400 Bad Request)');
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/orders/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setDeletingOrderId(null);
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to delete order');
      setDeletingOrderId(null);
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

  const formatTime = (timeInput?: string | Date) => {
    if (!timeInput) return '--:--';
    const d = new Date(timeInput);
    if (isNaN(d.getTime())) return String(timeInput);
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const closeModal = () => {
    setIsOrderModalOpen(false);
    setIsEditing(false);
    setEditingOrderId(null);
    setOrderEmployeeId('');
    setSelectedDishId('');
    setSelectedOptionIds([]);
    setOrderLines([]);
    setComboQty(1);
    setOrderStatus('PLACED');
    setModalError('');
  };

  /**
   * Check if order is eligible for editing (within 30 minutes of creation & not delivered/cancelled/invoiced, or ADMIN)
   */
  const getOrderEditEligibility = (ord: any) => {
    if (user?.role === 'ADMIN') return { eligible: true, remainingMins: 999, isAdminOverride: true };
    if (ord.invoiceId || ord.status === 'DELIVERED' || ord.status === 'CANCELLED' || ord.status === 'REJECTED') {
      return { eligible: false, remainingMins: 0, isAdminOverride: false };
    }
    const createdTime = new Date(ord.createdAt).getTime();
    const nowTime = new Date().getTime();
    const elapsedMins = Math.floor((nowTime - createdTime) / (1000 * 60));
    const remainingMins = Math.max(0, 30 - elapsedMins);
    return {
      eligible: remainingMins > 0,
      remainingMins,
      isAdminOverride: false,
    };
  };

  const handleOpenEditModal = (ord: any) => {
    setModalError('');
    setIsEditing(true);
    setEditingOrderId(ord.id);
    setOrderEmployeeId(ord.employeeId);
    setOrderDeliveryDate(new Date(ord.deliveryDate).toISOString().split('T')[0]);
    setOrderDeliveryTime(ord.deliveryTime || '12:30');
    setOrderPackaging(ord.packagingType || 'Eco Box');
    setOrderStatus(ord.status || 'PLACED');

    // Pre-populate order lines
    const formattedLines = ord.lines?.map((line: any) => ({
      dishId: line.dishId,
      dishName: line.dishName,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      totalCents: line.totalCents,
      combinations: line.combinations?.map((combo: any) => ({
        quantity: combo.quantity,
        options: combo.options?.map((opt: any) => ({ optionId: opt.optionId, name: opt.optionName })),
        chosenOptionDetails: combo.options?.map((opt: any) => ({ name: opt.optionName })),
      })),
    }));

    setOrderLines(formattedLines || []);
    setIsOrderModalOpen(true);
  };

  const addCombinationToOrder = () => {
    setModalError('');
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

    // Validate required option groups
    for (const og of targetDish.optionGroups || []) {
      if (og.isRequired) {
        const optionIdsInGroup = og.options?.map((opt: any) => opt.id) || [];
        const hasSelected = selectedOptionIds.some((id) => optionIdsInGroup.includes(id));
        if (!hasSelected) {
          setModalError(`Please select a required option for group "${og.name}"`);
          return;
        }
      }
    }

    const chosenOptions = [];
    let optionTotalCents = 0;
    for (const og of targetDish.optionGroups || []) {
      for (const opt of og.options || []) {
        if (selectedOptionIds.includes(opt.id)) {
          chosenOptions.push({
            optionId: opt.id,
            name: opt.name,
            groupName: og.name,
            priceCents: opt.resolvedPriceCents || 0,
          });
          optionTotalCents += opt.resolvedPriceCents || 0;
        }
      }
    }

    const unitPriceCents = (targetDish.resolvedPriceCents || 0) + optionTotalCents;
    const lineTotalCents = unitPriceCents * comboQty;

    const newLine = {
      dishId: targetDish.id,
      dishName: targetDish.name,
      quantity: comboQty,
      unitPriceCents,
      totalCents: lineTotalCents,
      combinations: [
        {
          quantity: comboQty,
          options: chosenOptions.map((o) => ({ optionId: o.optionId })),
          chosenOptionDetails: chosenOptions,
        },
      ],
    };

    setOrderLines([...orderLines, newLine]);
    setSelectedDishId('');
    setSelectedOptionIds([]);
    setComboQty(1);
  };

  const calculateOrderGrandTotal = () => {
    return orderLines.reduce((sum, line) => sum + (line.totalCents || 0), 0);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Order Management</h1>
            <p className="text-sm text-slate-500 mt-1">Place, search, view details, edit, and delete employee meal orders with historical price snapshots.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-lg shadow-sm">
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
              onClick={() => {
                closeModal();
                setIsOrderModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg flex items-center gap-2 shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Place New Order
            </button>
          </div>
        </div>

        {/* Filters & Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 text-xs">
          {/* Search Input Bar */}
          <div className="flex-1 min-w-[260px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search order #, employee name, company, dish..."
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-none bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 uppercase">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none bg-white"
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
              onChange={(e) => {
                setSelectedCompanyId(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none bg-white"
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
          ) : ordersData?.orders?.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <ShoppingBag className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-700">No orders found</p>
              <p className="text-xs text-slate-400">Try adjusting your search or filters.</p>
            </div>
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
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordersData?.orders?.map((ord: any) => {
                  const editStatus = getOrderEditEligibility(ord);
                  return (
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
                              : ord.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-800'
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
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {/* Read / Details */}
                          <button
                            onClick={() => setViewingOrder(ord)}
                            title="View Order Details"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                          >
                            <Eye className="w-3.5 h-3.5" /> Details
                          </button>

                          {/* Edit */}
                          {editStatus.eligible ? (
                            <button
                              onClick={() => handleOpenEditModal(ord)}
                              className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold rounded-lg flex items-center gap-1 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit {editStatus.isAdminOverride ? '' : `(${editStatus.remainingMins}m)`}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Locked</span>
                          )}

                          {/* Delete */}
                          {!ord.invoiceId && (
                            <button
                              onClick={() => setDeletingOrderId(ord.id)}
                              title="Delete Order"
                              className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Read / View Order Details Modal */}
        {viewingOrder && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-base">Order #{viewingOrder.orderNumber} Details</h3>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                      viewingOrder.status === 'CONFIRMED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : viewingOrder.status === 'DELIVERED'
                        ? 'bg-blue-100 text-blue-800'
                        : viewingOrder.status === 'PLACED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {viewingOrder.status}
                  </span>
                </div>
                <button onClick={() => setViewingOrder(null)} className="text-slate-400 font-bold p-1 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Order Logistics Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Employee & Company
                  </p>
                  <p className="text-slate-800 font-semibold">{viewingOrder.employee?.name}</p>
                  <p className="text-slate-500">{viewingOrder.employee?.company?.name}</p>
                  <p className="text-slate-500">{viewingOrder.employee?.email}</p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Timings & Packaging (IST)
                  </p>
                  <p className="text-slate-800">
                    Delivery Date: <strong>{new Date(viewingOrder.deliveryDate).toISOString().split('T')[0]}</strong>
                  </p>
                  <p className="text-slate-800">
                    Delivery Time: <strong>{viewingOrder.deliveryTime} IST</strong>
                  </p>
                  <p className="text-amber-800 font-semibold">
                    Expected Cooking Completion: <strong>{formatTime(viewingOrder.plannedKitchenReadyAt)}</strong>
                  </p>
                  <p className="text-[10px] text-amber-700 font-medium">
                    (1:30 hr:min before delivery | 0:30 hr:min before dispatch)
                  </p>
                  <p className="text-slate-500">Packaging: {viewingOrder.packagingType}</p>
                </div>
              </div>

              {/* Order Lines */}
              <div className="space-y-2">
                <p className="font-bold text-slate-900 text-xs">Order Items & Options:</p>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                  {viewingOrder.lines?.map((line: any) => (
                    <div key={line.id} className="p-3 bg-white space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900">
                          {line.quantity}x {line.dishName} <span className="text-[10px] font-normal text-slate-400">({line.dishSku})</span>
                        </span>
                        <span className="font-bold text-emerald-700">{formatUsd(line.totalCents)}</span>
                      </div>
                      {line.combinations?.map((combo: any, cIdx: number) => (
                        <div key={cIdx} className="pl-3 text-[11px] text-slate-600 border-l-2 border-slate-200 space-y-0.5">
                          {combo.options?.map((opt: any) => (
                            <p key={opt.id}>
                              • {opt.optionGroupName}: <strong>{opt.optionName}</strong> {opt.portionSize && `(${opt.portionSize})`}
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-500">
                  Invoice Status: {viewingOrder.invoiceId ? 'INVOICED' : 'UNINVOICED'}
                </span>
                <span className="text-base font-black text-emerald-700">
                  Total: {formatUsd(viewingOrder.totalCents)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingOrderId && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <AlertTriangle className="w-7 h-7 shrink-0" />
                <h3 className="font-extrabold text-slate-900 text-lg">Delete Order</h3>
              </div>

              <p className="text-xs text-slate-600">
                Are you sure you want to delete order #{ordersData?.orders?.find((o: any) => o.id === deletingOrderId)?.orderNumber}? This will remove all order line options and kitchen prep units.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  onClick={() => setDeletingOrderId(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteOrderMutation.mutate(deletingOrderId)}
                  disabled={deleteOrderMutation.isPending}
                  className="px-4.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition shadow-sm"
                >
                  {deleteOrderMutation.isPending ? 'Deleting...' : 'Yes, Delete Order'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create / Edit Order Modal */}
        {isOrderModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-base">
                    {isEditing ? `Edit Order #${ordersData?.orders?.find((o: any) => o.id === editingOrderId)?.orderNumber || ''}` : 'Place Order on Behalf of Employee'}
                  </h3>
                </div>
                <button onClick={closeModal} className="text-slate-400 font-bold p-1 hover:text-slate-600">
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
                {modalError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold flex items-center justify-between">
                    <span>{modalError}</span>
                    <button type="button" onClick={() => setModalError('')} className="text-rose-500 hover:text-rose-700 font-bold ml-2">✕</button>
                  </div>
                )}

                {/* Step 1: Employee & Delivery Logistics */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    Step 1: Select Employee & Delivery Details
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block font-semibold text-slate-700 mb-1">Customer Employee *</label>
                      <select
                        disabled={isEditing}
                        value={orderEmployeeId}
                        onChange={(e) => {
                          const newEmpId = e.target.value;
                          setOrderEmployeeId(newEmpId);
                          setSelectedDishId('');
                          setSelectedOptionIds([]);
                          setComboQty(1);
                          setOrderLines([]);
                        }}
                        className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500/20 bg-white disabled:bg-slate-100"
                      >
                        <option value="">-- Choose Employee --</option>
                        {employees?.map((emp: any) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.company?.name || 'No Company'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Delivery Date *</label>
                      <input
                        type="date"
                        value={orderDeliveryDate}
                        onChange={(e) => setOrderDeliveryDate(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Delivery Time *</label>
                      <input
                        type="text"
                        value={orderDeliveryTime}
                        onChange={(e) => setOrderDeliveryTime(e.target.value)}
                        placeholder="12:30"
                        className="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>

                    {isEditing && (
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Order Status</label>
                        <select
                          value={orderStatus}
                          onChange={(e) => setOrderStatus(e.target.value)}
                          className="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white font-bold text-slate-800"
                        >
                          <option value="DRAFT">DRAFT</option>
                          <option value="PLACED">PLACED</option>
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Callout if Employee not selected */}
                {!orderEmployeeId ? (
                  <div className="p-6 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 text-center space-y-2">
                    <Sparkles className="w-8 h-8 mx-auto text-indigo-500" />
                    <p className="font-bold text-slate-800 text-sm">Please select a Customer Employee above</p>
                    <p className="text-slate-500 text-xs max-w-md mx-auto">
                      Selecting an employee automatically resolves their company's price tier (Standard, Enterprise, or Partner), menu availability, and custom option groups.
                    </p>
                  </div>
                ) : menuLoading ? (
                  <div className="p-8 text-center text-slate-500">Loading custom company menu catalogue & price tier...</div>
                ) : (
                  /* Step 2: Catalogue & Dishes Browser */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Utensils className="w-4 h-4 text-emerald-600" />
                        Step 2: Browse Menu Catalogue ({menuPreview?.employee?.companyName} • {menuPreview?.categories?.reduce((acc: number, c: any) => acc + (c.dishes?.length || 0), 0)} Available Dishes)
                      </p>
                    </div>

                    {/* Dish Categories Accordion / Grid */}
                    <div className="space-y-4">
                      {menuPreview?.categories?.map((cat: any) => (
                        <div key={cat.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                          <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                            <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                              {cat.name} ({cat.dishes?.length || 0} items)
                            </span>
                          </div>

                          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {cat.dishes?.map((dish: any) => {
                              const isSelected = selectedDishId === dish.id;
                              return (
                                <div
                                  key={dish.id}
                                  onClick={() => {
                                    setSelectedDishId(dish.id);
                                    setSelectedOptionIds([]);
                                  }}
                                  className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-2 ${
                                    isSelected
                                      ? 'border-emerald-600 bg-emerald-50/40 shadow-sm ring-2 ring-emerald-500/20'
                                      : 'border-slate-200 hover:border-slate-300 bg-white'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-2">
                                      <h4 className="font-bold text-slate-900 text-xs">{dish.name}</h4>
                                      <span className="font-extrabold text-emerald-700 text-xs shrink-0">
                                        {formatUsd(dish.resolvedPriceCents)}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{dish.description}</p>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                                    {dish.temperature === 'HOT' ? (
                                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 font-bold rounded flex items-center gap-0.5">
                                        <Flame className="w-3 h-3" /> HOT
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 font-bold rounded flex items-center gap-0.5">
                                        <Snowflake className="w-3 h-3" /> COLD
                                      </span>
                                    )}

                                    {dish.allergens?.map((alg: string) => (
                                      <span key={alg} className="px-1.5 py-0.5 bg-rose-50 text-rose-700 font-medium rounded">
                                        {alg}
                                      </span>
                                    ))}

                                    {dish.dietaryTags?.map((tag: string) => (
                                      <span key={tag} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 font-medium rounded">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Dish Option Customizer Block */}
                    {selectedDishId && (
                      <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                          <span className="font-bold text-indigo-950 text-xs">Customize Selected Dish Options:</span>
                          <span className="text-slate-500 text-[11px]">Select protein, grain, dressing, or portions</span>
                        </div>

                        {menuPreview?.categories
                          ?.flatMap((c: any) => c.dishes)
                          .find((d: any) => d?.id === selectedDishId)
                          ?.optionGroups?.map((og: any) => (
                            <div key={og.id} className="space-y-1.5">
                              <span className="font-semibold text-slate-800 text-xs">
                                {og.name} {og.isRequired && <span className="text-rose-600">*</span>}:
                              </span>
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
                                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition flex items-center gap-1.5 ${
                                        isSelected
                                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                          : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                                      }`}
                                    >
                                      {isSelected && <Check className="w-3 h-3" />}
                                      {opt.name} {opt.resolvedPriceCents > 0 ? `(+${formatUsd(opt.resolvedPriceCents)})` : ''}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}

                        <div className="flex items-center gap-3 pt-2 border-t border-indigo-100">
                          <div className="flex items-center gap-2">
                            <label className="font-semibold text-slate-700 text-xs">Quantity:</label>
                            <input
                              type="number"
                              min={1}
                              value={comboQty}
                              onChange={(e) => setComboQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                              className="w-16 p-1.5 rounded border border-slate-300 text-xs font-bold text-center bg-white"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={addCombinationToOrder}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-sm flex items-center gap-1.5"
                          >
                            <Plus className="w-4 h-4" /> Add Combination to Cart
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Selected Order Items Summary */}
                {orderLines.length > 0 && (
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900 text-xs">
                        Step 3: Order Items Summary ({orderLines.length} item{orderLines.length > 1 ? 's' : ''})
                      </p>
                      <span className="font-extrabold text-emerald-800 text-sm">
                        Grand Total: {formatUsd(calculateOrderGrandTotal())}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {orderLines.map((line, idx) => (
                        <div key={idx} className="p-3 bg-white border border-slate-200 rounded-lg text-xs flex items-center justify-between gap-2 shadow-sm">
                          <div>
                            <p className="font-bold text-slate-900">
                              {line.quantity}x {line.dishName}
                            </p>
                            {line.combinations?.[0]?.chosenOptionDetails?.length > 0 && (
                              <p className="text-[11px] text-slate-500 font-normal">
                                Options: {line.combinations[0].chosenOptionDetails.map((o: any) => o.name).join(', ')}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-800">{formatUsd(line.totalCents)}</span>
                            <button
                              type="button"
                              onClick={() => setOrderLines(orderLines.filter((_, i) => i !== idx))}
                              className="text-rose-600 hover:text-rose-800 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700">
                  {orderLines.length > 0 && `Total: ${formatUsd(calculateOrderGrandTotal())}`}
                </span>
                <div className="flex gap-2">
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-600 font-semibold text-xs">
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!orderEmployeeId || orderLines.length === 0 || createOrderMutation.isPending || updateOrderMutation.isPending}
                    onClick={() => {
                      if (isEditing && editingOrderId) {
                        updateOrderMutation.mutate({
                          id: editingOrderId,
                          data: {
                            deliveryDate: orderDeliveryDate,
                            deliveryTime: orderDeliveryTime,
                            packagingType: orderPackaging,
                            status: orderStatus,
                            lines: orderLines,
                          },
                        });
                      } else {
                        createOrderMutation.mutate({
                          employeeId: orderEmployeeId,
                          deliveryDate: orderDeliveryDate,
                          deliveryTime: orderDeliveryTime,
                          packagingType: orderPackaging,
                          status: 'PLACED',
                          lines: orderLines,
                        });
                      }
                    }}
                    className="px-4.5 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
                  >
                    {isEditing
                      ? updateOrderMutation.isPending
                        ? 'Updating Order...'
                        : 'Save Changes'
                      : createOrderMutation.isPending
                      ? 'Placing Order...'
                      : 'Place Order Now'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
