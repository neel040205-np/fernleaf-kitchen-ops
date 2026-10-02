'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '../../components/layout/AppLayout';
import { fetchApi } from '../../lib/api';
import { Truck, MapPin, Clock, CheckCircle2, Camera, PhoneCall, AlertCircle } from 'lucide-react';

export default function DriverPage() {
  const queryClient = useQueryClient();
  const [selectedDrop, setSelectedDrop] = useState<any>(null);
  const [driverNote, setDriverNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const { data: myDrops, isLoading } = useQuery({
    queryKey: ['myDrops'],
    queryFn: () => fetchApi('/dispatch/driver/my-drops'),
    refetchInterval: 10000,
  });

  const markDeliveredMutation = useMutation({
    mutationFn: (payload: { dropId: string; driverNote?: string; photoUrl?: string }) =>
      fetchApi(`/dispatch/driver/drops/${payload.dropId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ driverNote: payload.driverNote, photoUrl: payload.photoUrl }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDrops'] });
      setSelectedDrop(null);
      setDriverNote('');
      setPhotoUrl('');
    },
  });

  return (
    <AppLayout>
      <div className="max-w-md mx-auto space-y-5 pb-12">
        <div className="bg-emerald-800 text-white p-5 rounded-2xl shadow-lg space-y-1">
          <div className="flex items-center gap-2 text-emerald-200">
            <Truck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Driver Mobile Dashboard</span>
          </div>
          <h1 className="text-xl font-black">Today's Assigned Delivery Drops</h1>
          <p className="text-xs text-emerald-200">Deliveries sorted by target delivery time.</p>
        </div>

        {/* Drops List */}
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading your deliveries...</div>
        ) : myDrops?.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-bold text-slate-800 text-base">All Caught Up!</p>
            <p className="text-xs text-slate-400">No active delivery drops assigned to you for today.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myDrops?.map((drop: any) => (
              <div
                key={drop.id}
                className={`p-5 rounded-2xl border shadow-sm space-y-3 bg-white transition ${
                  drop.status === 'DELIVERED' ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      Time: {drop.deliveryTime}
                    </span>
                    <h3 className="font-black text-slate-900 text-lg mt-1">{drop.company?.name}</h3>
                  </div>

                  <span
                    className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                      drop.status === 'DELIVERED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : drop.status === 'OUT_FOR_DELIVERY'
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {drop.status}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex items-start gap-2 font-medium text-slate-800">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>
                      {drop.address?.addressLine}, {drop.address?.city} ({drop.address?.postalCode})
                    </span>
                  </div>
                  {drop.company?.driverInstructions && (
                    <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200 mt-2 font-medium">
                      Standing Instructions: "{drop.company.driverInstructions}"
                    </div>
                  )}
                </div>

                {drop.status !== 'DELIVERED' ? (
                  <button
                    onClick={() => setSelectedDrop(drop)}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Complete & Mark Delivered
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center justify-between">
                    <span>Delivered On-Time: {drop.isOnTime ? 'YES' : 'NO (Late)'}</span>
                    <span>{new Date(drop.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Complete Delivery Modal */}
        {selectedDrop && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base">Complete Delivery</h3>
                <button onClick={() => setSelectedDrop(null)} className="text-slate-400 font-bold">
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="font-semibold text-slate-700">Delivering to: {selectedDrop.company?.name}</p>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Driver Note (Optional)</label>
                  <textarea
                    rows={2}
                    value={driverNote}
                    onChange={(e) => setDriverNote(e.target.value)}
                    placeholder="Left with security guard at front desk..."
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Photo Proof URL (Optional)</label>
                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setSelectedDrop(null)} className="px-4 py-2 text-slate-600 font-semibold text-xs">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={markDeliveredMutation.isPending}
                  onClick={() =>
                    markDeliveredMutation.mutate({
                      dropId: selectedDrop.id,
                      driverNote,
                      photoUrl,
                    })
                  }
                  className="px-5 py-2.5 bg-emerald-600 text-white font-black text-xs rounded-xl hover:bg-emerald-700 shadow-md"
                >
                  {markDeliveredMutation.isPending ? 'Saving...' : 'Confirm Delivery'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
