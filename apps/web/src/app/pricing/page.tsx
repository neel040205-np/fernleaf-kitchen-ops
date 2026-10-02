'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '../../components/layout/AppLayout';
import { fetchApi } from '../../lib/api';
import { Tags, Plus, Edit2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function PricingPage() {
  const queryClient = useQueryClient();
  const [selectedTierId, setSelectedTierId] = useState<string>('');

  const { data: tiers, isLoading: tiersLoading } = useQuery({
    queryKey: ['tiers'],
    queryFn: async () => {
      const data = await fetchApi('/pricing/tiers');
      if (data && data.length > 0 && !selectedTierId) {
        setSelectedTierId(data[0].id);
      }
      return data;
    },
  });

  const { data: selectedTier, isLoading: tierDetailLoading } = useQuery({
    queryKey: ['tierDetail', selectedTierId],
    queryFn: () => fetchApi(`/pricing/tiers/${selectedTierId}`),
    enabled: !!selectedTierId,
  });

  const { data: dishes } = useQuery({
    queryKey: ['dishes'],
    queryFn: () => fetchApi('/catalogue/dishes'),
  });

  const setOverrideMutation = useMutation({
    mutationFn: (override: { dishId: string; tierId: string; priceCents: number }) =>
      fetchApi('/pricing/dish-override', {
        method: 'PUT',
        body: JSON.stringify(override),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tierDetail', selectedTierId] });
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
    },
  });

  const formatUsd = (cents?: number) => (cents ? `$${(cents / 100).toFixed(2)}` : '$0.00');

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Price Tier Engine</h1>
          <p className="text-sm text-slate-500 mt-1">Manage corporate pricing tiers, derived prices, and dish price overrides.</p>
        </div>

        {/* Tiers List Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers?.map((tier: any) => (
            <div
              key={tier.id}
              onClick={() => setSelectedTierId(tier.id)}
              className={`p-5 rounded-xl border cursor-pointer transition ${
                selectedTierId === tier.id
                  ? 'bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base">{tier.name}</h3>
                {tier.isDefault && (
                  <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    DEFAULT SYSTEM TIER
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {tier.derivationType === 'NONE'
                  ? 'Manual Prices'
                  : tier.derivationType === 'MULTIPLIER_OF_COST'
                  ? `Derived: Cost × ${tier.multiplier}`
                  : `Derived: Base Tier + ${Math.round(((tier.multiplier || 1) - 1) * 100)}%`}
              </p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>{tier._count?.companies || 0} Companies Assigned</span>
                <span className="font-semibold text-slate-900">{tier._count?.dishPrices || 0} Prices Set</span>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Tier Overview Table */}
        {selectedTier && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedTier.name} Tier Price Overview</h2>
                <p className="text-xs text-slate-500">
                  Staff overrides take priority. Derived prices automatically round UP to the next 5 cents.
                </p>
              </div>
            </div>

            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="p-3">Dish Name</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Base Cost Price</th>
                  <th className="p-3">Resolved Tier Price</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Quick Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dishes?.map((dish: any) => {
                  const existingPrice = selectedTier.dishPrices?.find((dp: any) => dp.dishId === dish.id);
                  const resolvedPriceCents = existingPrice?.priceCents || 0;

                  return (
                    <tr key={dish.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-3 font-semibold text-slate-900">{dish.name}</td>
                      <td className="p-3 font-mono text-xs text-slate-500">{dish.sku}</td>
                      <td className="p-3 text-slate-700">{formatUsd(dish.costPriceCents)}</td>
                      <td className="p-3 font-bold text-emerald-700">{formatUsd(resolvedPriceCents)}</td>
                      <td className="p-3">
                        {existingPrice?.isOverride ? (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            MANUAL OVERRIDE
                          </span>
                        ) : existingPrice ? (
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            DERIVED / SET
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded flex items-center gap-1 w-max">
                            <AlertCircle className="w-3 h-3" /> NO PRICE SET
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            const newPriceStr = prompt(
                              `Enter price in USD for ${dish.name} on ${selectedTier.name} (e.g. 13.50):`,
                              resolvedPriceCents ? (resolvedPriceCents / 100).toFixed(2) : '12.00',
                            );
                            if (newPriceStr) {
                              const cents = Math.round(parseFloat(newPriceStr) * 100);
                              setOverrideMutation.mutate({
                                dishId: dish.id,
                                tierId: selectedTier.id,
                                priceCents: cents,
                              });
                            }
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded border border-slate-300 transition"
                        >
                          Edit Override
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
