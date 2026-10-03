'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '../../components/layout/AppLayout';
import { fetchApi } from '../../lib/api';
import { Truck, MapPin, Clock, UserCheck, Plus, X, UserPlus } from 'lucide-react';

export default function DispatchBoardPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [newDriverPassword, setNewDriverPassword] = useState('');
  const [formError, setFormError] = useState('');

  const { data: boardData, isLoading } = useQuery({
    queryKey: ['dispatchBoard', selectedDate],
    queryFn: () => fetchApi(`/dispatch/board?date=${selectedDate}`),
    refetchInterval: 10000,
  });

  const { data: drivers } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => fetchApi('/dispatch/drivers'),
  });

  const createDriverMutation = useMutation({
    mutationFn: (newDriver: { name: string; email: string; password?: string }) =>
      fetchApi('/dispatch/drivers', {
        method: 'POST',
        body: JSON.stringify(newDriver),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setIsAddDriverOpen(false);
      setNewDriverName('');
      setNewDriverEmail('');
      setNewDriverPassword('');
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create driver account');
    },
  });

  const assignDriverMutation = useMutation({
    mutationFn: (update: { dropId: string; driverId: string }) =>
      fetchApi(`/dispatch/drops/${update.dropId}/assign-driver`, {
        method: 'PUT',
        body: JSON.stringify({ driverId: update.driverId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatchBoard', selectedDate] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (update: { dropId: string; status: string }) =>
      fetchApi(`/dispatch/drops/${update.dropId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: update.status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatchBoard', selectedDate] });
    },
  });

  const handleAddDriverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!newDriverName.trim() || !newDriverEmail.trim()) {
      setFormError('Please enter rider name and email');
      return;
    }
    createDriverMutation.mutate({
      name: newDriverName.trim(),
      email: newDriverEmail.trim(),
      password: newDriverPassword.trim() || 'Test@1234',
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Dispatch Board & Drop Grouping</h1>
            <p className="text-sm text-slate-500 mt-1">
              Group orders into drops by company, address, and delivery time. Assign delivery partners/riders and track status.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddDriverOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Rider</span>
            </button>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700 uppercase">Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-semibold focus:outline-hidden bg-white"
              />
            </div>
          </div>
        </div>

        {/* Add Rider Modal */}
        {isAddDriverOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                  <span>Create New Delivery Partner / Rider</span>
                </div>
                <button
                  onClick={() => setIsAddDriverOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddDriverSubmit} className="p-5 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rider Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Alex Rider"
                    value={newDriverName}
                    onChange={(e) => setNewDriverName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rider Email Address *</label>
                  <input
                    type="email"
                    placeholder="e.g. alex.rider@delivery.com"
                    value={newDriverEmail}
                    onChange={(e) => setNewDriverEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password</label>
                  <input
                    type="password"
                    placeholder="Defaults to Test@1234 if empty"
                    value={newDriverPassword}
                    onChange={(e) => setNewDriverPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Rider uses this email and password to log in to the Driver Mobile View.</p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddDriverOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createDriverMutation.isPending}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition disabled:opacity-50 cursor-pointer"
                  >
                    {createDriverMutation.isPending ? 'Creating...' : 'Create Rider'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
              <div key={drop.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
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
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Assigned Driver: <strong>{drop.driver?.name || 'Unassigned'}</strong></span>
                  </div>

                  <select
                    value={drop.driverId || ''}
                    onChange={(e) => assignDriverMutation.mutate({ dropId: drop.id, driverId: e.target.value })}
                    className="p-2 rounded-md border border-slate-300 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 max-w-full cursor-pointer"
                  >
                    <option value="">-- Select Rider / Driver --</option>
                    {drivers?.map((driver: any) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} ({driver.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Drop Status Actions */}
                <div className="pt-2 flex items-center gap-2">
                  {drop.status === 'PENDING' && (
                    <button
                      onClick={() => updateStatusMutation.mutate({ dropId: drop.id, status: 'DISPATCH_READY' })}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                    >
                      Mark Dispatch Ready
                    </button>
                  )}

                  {drop.status === 'DISPATCH_READY' && (
                    <button
                      onClick={() => updateStatusMutation.mutate({ dropId: drop.id, status: 'OUT_FOR_DELIVERY' })}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
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
