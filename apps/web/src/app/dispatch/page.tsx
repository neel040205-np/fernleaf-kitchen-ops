'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '../../components/layout/AppLayout';
import { fetchApi } from '../../lib/api';
import { Truck, MapPin, Clock, UserCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function DispatchBoardPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: boardData, isLoading } = useQuery({
    queryKey: ['dispatchBoard', selectedDate],
    queryFn: () => fetchApi(`/dispatch/board?date=${selectedDate}`),
    refetchInterval: 10000,
  });

  const { data: employees } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => fetchApi('/employees'),
  });

  const assignDriverMutation = useMutation({
    mutationFn: (update: { dropId: string; driverId: string }) =>
      fetchApi(`/dispatch/drops/${update.dropId}/assign-driver`, {
        method: 'PUT',
        body: JSON.stringify({ driverId: update.driverId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatchBoard'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (update: { dropId: string; status: string }) =>
      fetchApi(`/dispatch/drops/${update.dropId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: update.status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatchBoard'] });
    },
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Dispatch Board & Drop Grouping</h1>
            <p className="text-sm text-slate-500 mt-1">Group orders into drops by company, address, and delivery time. Assign drivers and track status.</p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-700 uppercase">Delivery Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-semibold focus:outline-none"
            />
          </div>
        </div>

        {/* Dispatch Drops List */}
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading dispatch board...</div>
        ) : boardData?.drops?.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 space-y-2">
            <Truck className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-bold text-slate-700">No delivery drops found for {selectedDate}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {boardData?.drops?.map((drop: any) => (
              <div key={drop.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
                      DROP GROUP ({drop.orders?.length || 0} Orders)
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-lg mt-1">{drop.company?.name}</h3>
                  </div>

                  <span
                    className={`px-3 py-1 text-xs font-extrabold rounded-full ${
                      drop.status === 'DELIVERED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : drop.status === 'OUT_FOR_DELIVERY'
                        ? 'bg-sky-100 text-sky-800'
                        : drop.status === 'DISPATCH_READY'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {drop.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Delivery Target Time: <strong>{drop.deliveryTime}</strong></span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-700">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>
                      {drop.address?.addressLine}, {drop.address?.city} ({drop.address?.postalCode})
                    </span>
                  </div>
                </div>

                {/* Driver Assignment */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Assigned Driver: <strong>{drop.driver?.name || 'Unassigned'}</strong></span>
                  </div>

                  <select
                    value={drop.driverId || ''}
                    onChange={(e) => assignDriverMutation.mutate({ dropId: drop.id, driverId: e.target.value })}
                    className="p-1.5 rounded border border-slate-300 text-xs focus:outline-none"
                  >
                    <option value="">-- Assign Driver --</option>
                    {/* Filter for driver users */}
                    <option value="driver-user-id-placeholder">John Driver (driver@test.com)</option>
                  </select>
                </div>

                {/* Drop Status Actions */}
                <div className="pt-2 flex items-center gap-2">
                  {drop.status === 'PENDING' && (
                    <button
                      onClick={() => updateStatusMutation.mutate({ dropId: drop.id, status: 'DISPATCH_READY' })}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      Mark Dispatch Ready
                    </button>
                  )}

                  {drop.status === 'DISPATCH_READY' && (
                    <button
                      onClick={() => updateStatusMutation.mutate({ dropId: drop.id, status: 'OUT_FOR_DELIVERY' })}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      Send Out for Delivery
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
