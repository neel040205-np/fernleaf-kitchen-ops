'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '../../components/layout/AppLayout';
import { fetchApi } from '../../lib/api';
import { Building2, Plus, Globe, MapPin, Clock, Truck, ShieldAlert } from 'lucide-react';

export default function CompaniesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    billingContact: '',
    domain: '',
    priceTierId: '',
    defaultDeliveryTime: '12:00',
    deliveryLeadMinutes: 60,
    defaultPackaging: 'Standard Box',
    addressLine: '',
    city: '',
    postalCode: '',
  });

  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => fetchApi('/companies'),
  });

  const { data: tiers } = useQuery({
    queryKey: ['tiers'],
    queryFn: () => fetchApi('/pricing/tiers'),
  });

  const createCompanyMutation = useMutation({
    mutationFn: (newCompany: any) =>
      fetchApi('/companies', {
        method: 'POST',
        body: JSON.stringify(newCompany),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setIsModalOpen(false);
    },
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Corporate Clients & Companies</h1>
            <p className="text-sm text-slate-500 mt-1">Manage corporate accounts, email domains, delivery defaults, and address locations.</p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg flex items-center gap-2 shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> Add New Company
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {companies?.map((comp: any) => (
            <div key={comp.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{comp.name}</h3>
                  <p className="text-xs text-slate-500">Billing: {comp.billingContact}</p>
                </div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200">
                  {comp.priceTier?.name || 'Default Tier'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 text-slate-700">
                  <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono font-medium">{comp.domains?.map((d: any) => d.domain).join(', ')}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Default Time: <strong>{comp.defaultDeliveryTime}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Truck className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Lead Time: <strong>{comp.deliveryLeadMinutes}m</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span>Packaging: <strong>{comp.defaultPackaging}</strong></span>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Delivery Locations:</p>
                <div className="space-y-1.5">
                  {comp.addresses?.map((addr: any) => (
                    <div key={addr.id} className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs flex items-center gap-2 text-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{addr.addressLine}, {addr.city} ({addr.postalCode})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base">Add Corporate Client Company</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 font-bold">
                  ✕
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createCompanyMutation.mutate({
                    name: form.name,
                    billingContact: form.billingContact,
                    domains: [form.domain],
                    priceTierId: form.priceTierId || undefined,
                    defaultDeliveryTime: form.defaultDeliveryTime,
                    deliveryLeadMinutes: parseInt(String(form.deliveryLeadMinutes), 10),
                    defaultPackaging: form.defaultPackaging,
                    addresses: form.addressLine
                      ? [{ addressLine: form.addressLine, city: form.city, postalCode: form.postalCode }]
                      : undefined,
                  });
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Acme Corp"
                    className="w-full p-2.5 rounded border border-slate-300 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Corporate Domain</label>
                    <input
                      type="text"
                      required
                      value={form.domain}
                      onChange={(e) => setForm({ ...form, domain: e.target.value })}
                      placeholder="acme.com"
                      className="w-full p-2.5 rounded border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Billing Contact Email</label>
                    <input
                      type="email"
                      required
                      value={form.billingContact}
                      onChange={(e) => setForm({ ...form, billingContact: e.target.value })}
                      placeholder="billing@acme.com"
                      className="w-full p-2.5 rounded border border-slate-300 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Price Tier</label>
                    <select
                      value={form.priceTierId}
                      onChange={(e) => setForm({ ...form, priceTierId: e.target.value })}
                      className="w-full p-2.5 rounded border border-slate-300 text-sm"
                    >
                      <option value="">Default Tier</option>
                      {tiers?.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Default Delivery Time</label>
                    <input
                      type="text"
                      value={form.defaultDeliveryTime}
                      onChange={(e) => setForm({ ...form, defaultDeliveryTime: e.target.value })}
                      placeholder="12:30"
                      className="w-full p-2.5 rounded border border-slate-300 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Delivery Address</label>
                  <input
                    type="text"
                    value={form.addressLine}
                    onChange={(e) => setForm({ ...form, addressLine: e.target.value })}
                    placeholder="100 Innovation Way, Suite 400"
                    className="w-full p-2.5 rounded border border-slate-300 text-sm mb-2"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="City"
                      className="w-full p-2.5 rounded border border-slate-300 text-sm"
                    />
                    <input
                      type="text"
                      value={form.postalCode}
                      onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                      placeholder="Postal Code"
                      className="w-full p-2.5 rounded border border-slate-300 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-semibold">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createCompanyMutation.isPending}
                    className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700"
                  >
                    {createCompanyMutation.isPending ? 'Saving...' : 'Create Company'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
