'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '../../components/layout/AppLayout';
import { fetchApi } from '../../lib/api';
import {
  Truck,
  MapPin,
  Clock,
  UserCheck,
  Plus,
  X,
  UserPlus,
  Building2,
  Phone,
  ShieldCheck,
  ListFilter,
  Users,
} from 'lucide-react';

export default function DispatchBoardPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'board' | 'partners'>('board');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Add Delivery Partner Modal state
  const [isAddPartnerOpen, setIsAddPartnerOpen] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerCompanyId, setPartnerCompanyId] = useState('');
  const [partnerVehicle, setPartnerVehicle] = useState('Delivery Van #1');
  const [partnerPassword, setPartnerPassword] = useState('');
  const [formError, setFormError] = useState('');

  const { data: boardData, isLoading } = useQuery({
    queryKey: ['dispatchBoard', selectedDate],
    queryFn: () => fetchApi(`/dispatch/board?date=${selectedDate}`),
    refetchInterval: 10000,
  });

  const { data: deliveryPartners } = useQuery({
    queryKey: ['deliveryPartners'],
    queryFn: () => fetchApi('/dispatch/partners'),
  });

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => fetchApi('/companies'),
  });

  const createPartnerMutation = useMutation({
    mutationFn: (newPartner: any) =>
      fetchApi('/dispatch/partners', {
        method: 'POST',
        body: JSON.stringify(newPartner),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryPartners'] });
      queryClient.invalidateQueries({ queryKey: ['dispatchBoard'] });
      setIsAddPartnerOpen(false);
      resetPartnerForm();
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create delivery partner account');
    },
  });

  const assignPartnerMutation = useMutation({
    mutationFn: (update: { dropId: string; driverId: string }) =>
      fetchApi(`/dispatch/drops/${update.dropId}/assign-driver`, {
        method: 'PUT',
        body: JSON.stringify({ driverId: update.driverId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatchBoard', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['deliveryPartners'] });
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

  const resetPartnerForm = () => {
    setPartnerName('');
    setPartnerEmail('');
    setPartnerPhone('');
    setPartnerCompanyId('');
    setPartnerVehicle('Delivery Van #1');
    setPartnerPassword('');
    setFormError('');
  };

  const handleAddPartnerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!partnerName.trim() || !partnerEmail.trim()) {
      setFormError('Please enter delivery partner name and email');
      return;
    }
    createPartnerMutation.mutate({
      name: partnerName.trim(),
      email: partnerEmail.trim(),
      phone: partnerPhone.trim() || undefined,
      companyId: partnerCompanyId || undefined,
      vehicleDetails: partnerVehicle.trim() || 'Delivery Vehicle',
      password: partnerPassword.trim() || 'Test@1234',
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Dispatch Board & Delivery Partners</h1>
            <p className="text-sm text-slate-500 mt-1">
              Assign delivery partners to corporate companies & orders. Delivery partners log in via email/password to track deliveries.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddPartnerOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Delivery Partner</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('board')}
            className={`px-4 py-2.5 font-bold text-xs border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'board'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Today's Dispatch Drops</span>
          </button>
          <button
            onClick={() => setActiveTab('partners')}
            className={`px-4 py-2.5 font-bold text-xs border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'partners'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Delivery Partners Directory ({deliveryPartners?.length || 0})</span>
          </button>
        </div>

        {/* Add Delivery Partner Modal */}
        {isAddPartnerOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                  <span>Register New Delivery Partner</span>
                </div>
                <button
                  onClick={() => setIsAddPartnerOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddPartnerSubmit} className="p-5 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-bold">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Partner Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. SpeedEx Logistics / Alex Partner"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address (Login ID) *</label>
                  <input
                    type="email"
                    placeholder="e.g. partner@speedex.com"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+1 (555) 019-2831"
                      value={partnerPhone}
                      onChange={(e) => setPartnerPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle / Transport</label>
                    <input
                      type="text"
                      placeholder="e.g. Refrigerated Van #3"
                      value={partnerVehicle}
                      onChange={(e) => setPartnerVehicle(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Company (Optional)</label>
                  <select
                    value={partnerCompanyId}
                    onChange={(e) => setPartnerCompanyId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- All Companies / Dynamic --</option>
                    {companies?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Login Password</label>
                  <input
                    type="password"
                    placeholder="Defaults to Test@1234 if empty"
                    value={partnerPassword}
                    onChange={(e) => setPartnerPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Delivery partner logs in with this email and password to track deliveries.</p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddPartnerOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createPartnerMutation.isPending}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition disabled:opacity-50 cursor-pointer"
                  >
                    {createPartnerMutation.isPending ? 'Creating Partner...' : 'Create Partner'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tab 1: Dispatch Drops Board */}
        {activeTab === 'board' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase">Select Delivery Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold focus:outline-hidden bg-white"
                />
              </div>
              <span className="text-xs text-slate-500 font-semibold">
                Unassigned Drops: <strong className="text-amber-600">{boardData?.unassignedCount || 0}</strong>
              </span>
            </div>

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

                    {/* Delivery Partner Assignment */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-700">
                        <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Assigned Partner: <strong>{drop.deliveryPartner?.name || drop.driver?.name || 'Unassigned'}</strong>
                        </span>
                      </div>

                      <select
                        value={drop.driverId || drop.deliveryPartner?.userId || ''}
                        onChange={(e) => assignPartnerMutation.mutate({ dropId: drop.id, driverId: e.target.value })}
                        className="p-2 rounded-md border border-slate-300 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 max-w-full cursor-pointer"
                      >
                        <option value="">-- Assign Delivery Partner --</option>
                        {deliveryPartners?.map((dp: any) => (
                          <option key={dp.id} value={dp.user?.id || dp.userId}>
                            {dp.name} ({dp.company?.name || 'General'}) - {dp.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status Actions */}
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
        )}

        {/* Tab 2: Delivery Partners Directory */}
        {activeTab === 'partners' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-sm">Delivery Partners Records</h3>
              <span className="text-xs text-slate-500 font-semibold">{deliveryPartners?.length || 0} Registered Partners</span>
            </div>

            {deliveryPartners?.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">No delivery partners registered yet</p>
                <p className="text-xs text-slate-400">Click "Add Delivery Partner" above to register riders with email & password login.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-3.5">Partner Name</th>
                    <th className="p-3.5">Login Email</th>
                    <th className="p-3.5">Phone Number</th>
                    <th className="p-3.5">Assigned Company</th>
                    <th className="p-3.5">Vehicle Details</th>
                    <th className="p-3.5">Active Orders</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deliveryPartners?.map((dp: any) => (
                    <tr key={dp.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-3.5 font-bold text-slate-900">{dp.name}</td>
                      <td className="p-3.5 text-slate-700 font-mono">{dp.email}</td>
                      <td className="p-3.5 text-slate-600">{dp.phone || 'N/A'}</td>
                      <td className="p-3.5 font-semibold text-emerald-800">
                        {dp.company?.name || <span className="text-slate-400 font-normal">All Companies</span>}
                      </td>
                      <td className="p-3.5 text-slate-600">{dp.vehicleDetails || 'Standard Box'}</td>
                      <td className="p-3.5 font-bold text-slate-900">{dp.assignedOrders?.length || 0} Orders</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-emerald-100 text-emerald-800">
                          {dp.status || 'ACTIVE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
