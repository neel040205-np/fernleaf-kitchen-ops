'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '../../components/layout/AppLayout';
import { fetchApi } from '../../lib/api';
import { ChefHat, Flame, Clock, AlertTriangle, CheckCircle2, Play, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

export default function KitchenBoardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStation, setSelectedStation] = useState<string>('');

  const { data: boardData, isLoading } = useQuery({
    queryKey: ['kitchenBoard', selectedDate, selectedStation],
    queryFn: () => fetchApi(`/kitchen/board?date=${selectedDate}${selectedStation ? `&station=${selectedStation}` : ''}`),
    refetchInterval: 10000, // auto-refresh board every 10 seconds for real-time kitchen staff
  });

  const { data: refData } = useQuery({
    queryKey: ['refData'],
    queryFn: () => fetchApi('/catalogue/reference-data'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (update: { id: string; status: 'STARTED' | 'DONE' }) =>
      fetchApi(`/kitchen/units/${update.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: update.status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchenBoard'] });
    },
  });

  const forceCompleteMutation = useMutation({
    mutationFn: (orderId: string) =>
      fetchApi(`/kitchen/orders/${orderId}/force-complete`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchenBoard'] });
    },
  });

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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Kitchen Prep Board</h1>
            <p className="text-sm text-slate-500 mt-1">Real-time station prep units in Indian Standard Time (IST). Tracks cooking completion times, dispatch deadlines, and late items.</p>
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

        {/* Station Filter Tabs */}
        <div className="flex border-b border-slate-200 gap-3 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedStation('')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              selectedStation === '' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            All Stations ({boardData?.totalUnits || 0})
          </button>

          {refData?.stations?.map((st: any) => (
            <button
              key={st.id}
              onClick={() => setSelectedStation(st.name)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                selectedStation === st.name ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              {st.name}
            </button>
          ))}
        </div>

        {/* Prep Unit Cards Grid */}
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading kitchen board prep units...</div>
        ) : boardData?.units?.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 space-y-2">
            <ChefHat className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-bold text-slate-700">No prep units found for {selectedDate}</p>
            <p className="text-xs text-slate-400">Ensure confirmed orders exist for this delivery date.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {boardData?.units?.map((unit: any) => (
              <div
                key={unit.id}
                className={`p-5 rounded-xl border shadow-sm flex flex-col justify-between transition ${
                  unit.isLate
                    ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20'
                    : unit.status === 'DONE'
                    ? 'bg-emerald-50/40 border-emerald-200 opacity-80'
                    : unit.status === 'STARTED'
                    ? 'bg-sky-50/50 border-sky-300'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {unit.stationName}
                      </span>
                      <h3 className="font-extrabold text-slate-900 text-base mt-1">
                        {unit.orderLineCombination?.orderLine?.dishName}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {unit.order?.employee?.company?.name} • Order #{unit.order?.orderNumber}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 text-xs font-extrabold rounded-full ${
                        unit.status === 'DONE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : unit.status === 'STARTED'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {unit.status}
                    </span>
                  </div>

                  {/* Expected Cooking Completion & Logistics Timings Badge */}
                  <div className="p-3 bg-amber-50/90 border border-amber-200/80 rounded-lg text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-amber-950 text-xs flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Expected Cooking Completion (IST):
                      </span>
                      <span className="font-black text-amber-950 text-xs bg-amber-200/80 px-2 py-0.5 rounded-md shadow-xs">
                        {formatTime(unit.expectedCookingCompletionAt || unit.order?.plannedKitchenReadyAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-amber-200/50">
                      <span>Dispatch: <strong>{formatTime(unit.plannedDispatchReadyAt || unit.order?.plannedDispatchReadyAt)}</strong></span>
                      <span>Delivery: <strong>{unit.order?.deliveryTime || '12:00'} IST</strong></span>
                    </div>
                    <p className="text-[10px] text-amber-700 font-semibold">
                      • 1:30 (hr:min) before delivery | 0:30 (hr:min) before dispatch
                    </p>
                  </div>

                  {/* Combination Options details */}
                  <div className="p-3 bg-white/80 rounded-lg border border-slate-200/60 text-xs space-y-1">
                    <p className="font-semibold text-slate-800">Options Combination:</p>
                    <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
                      {unit.orderLineCombination?.options?.map((opt: any) => (
                        <li key={opt.id}>
                          {opt.optionGroupName}: <strong>{opt.optionName}</strong>
                          {opt.portionSize && ` (${opt.portionSize})`}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {unit.isLate && (
                    <div className="p-2 bg-rose-100/80 border border-rose-300 rounded text-rose-800 text-[11px] font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                      LATE / AT-RISK PREP UNIT
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
                  {unit.status === 'PENDING' && (
                    <button
                      onClick={() => updateStatusMutation.mutate({ id: unit.id, status: 'STARTED' })}
                      className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" /> Start Cooking
                    </button>
                  )}

                  {unit.status === 'STARTED' && (
                    <button
                      onClick={() => updateStatusMutation.mutate({ id: unit.id, status: 'DONE' })}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark Done
                    </button>
                  )}

                  {unit.status === 'DONE' && (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Ready for Dispatch
                    </span>
                  )}

                  {user?.role === 'ADMIN' && unit.status !== 'DONE' && (
                    <button
                      onClick={() => forceCompleteMutation.mutate(unit.orderId)}
                      title="Force Complete Order"
                      className="p-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold border border-rose-200 transition"
                    >
                      <ShieldAlert className="w-4 h-4" />
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
