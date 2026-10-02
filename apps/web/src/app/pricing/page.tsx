'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '../../components/layout/AppLayout';
import { fetchApi } from '../../lib/api';
import { dollarsToCents, centsToDollarsStr, formatUsd } from '../../lib/money';
import {
  Tags,
  Plus,
  Edit2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Percent,
  Calculator,
  Building2,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

export default function PricingPage() {
  const queryClient = useQueryClient();
  const [selectedTierId, setSelectedTierId] = useState<string>('');

  // Modals state
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [tierForm, setTierForm] = useState({
    name: '',
    isDefault: false,
    derivationType: 'NONE' as 'NONE' | 'MULTIPLIER_OF_COST' | 'PERCENTAGE_OF_TIER',
    baseTierId: '',
    multiplier: '1.20',
  });

  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [selectedDishForOverride, setSelectedDishForOverride] = useState<any>(null);
  const [overridePriceDollars, setOverridePriceDollars] = useState('');

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

  const { data: selectedTier } = useQuery({
    queryKey: ['tierDetail', selectedTierId],
    queryFn: () => fetchApi(`/pricing/tiers/${selectedTierId}`),
    enabled: !!selectedTierId,
  });

  const { data: dishesData } = useQuery({
    queryKey: ['dishes'],
    queryFn: () => fetchApi('/catalogue/dishes?includeInactive=true'),
  });

  const dishesList = dishesData?.dishes || [];

  const createTierMutation = useMutation({
    mutationFn: (newTier: any) =>
      fetchApi('/pricing/tiers', {
        method: 'POST',
        body: JSON.stringify(newTier),
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['tiers'] });
      setIsTierModalOpen(false);
      setSelectedTierId(created.id);
      setTierForm({
        name: '',
        isDefault: false,
        derivationType: 'NONE',
        baseTierId: '',
        multiplier: '1.20',
      });
    },
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
      setIsOverrideModalOpen(false);
      setSelectedDishForOverride(null);
    },
  });

  // Calculate 5-cent ceiling rounded derived price
  const calculateDerivedPrice = (baseCents: number, mult: number): number => {
    if (!baseCents || baseCents <= 0 || !mult || mult <= 0) return 0;
    const raw = Math.ceil(baseCents * mult);
    const remainder = raw % 5;
    return remainder === 0 ? raw : raw + (5 - remainder);
  };

  const resolveDishPrice = (dish: any, tier: any): { priceCents: number; status: string; isOverride: boolean } => {
    if (!tier) return { priceCents: 0, status: 'NO_TIER', isOverride: false };

    const existingOverride = tier.dishPrices?.find((dp: any) => dp.dishId === dish.id);
    if (existingOverride && existingOverride.isOverride) {
      return { priceCents: existingOverride.priceCents, status: 'MANUAL OVERRIDE', isOverride: true };
    }

    if (tier.derivationType === 'MULTIPLIER_OF_COST' && tier.multiplier) {
      const derived = calculateDerivedPrice(dish.costPriceCents, tier.multiplier);
      return {
        priceCents: derived,
        status: `DERIVED (Cost × ${tier.multiplier})`,
        isOverride: false,
      };
    }

    if (tier.derivationType === 'PERCENTAGE_OF_TIER' && tier.baseTierId && tier.multiplier) {
      const defaultTier = tiers?.find((t: any) => t.id === tier.baseTierId || t.isDefault);
      const basePrice = defaultTier?.dishPrices?.find((dp: any) => dp.dishId === dish.id)?.priceCents || dish.costPriceCents;
      const derived = calculateDerivedPrice(basePrice, tier.multiplier);
      return {
        priceCents: derived,
        status: `DERIVED (${defaultTier?.name || 'Base'} × ${tier.multiplier})`,
        isOverride: false,
      };
    }

    if (existingOverride) {
      return { priceCents: existingOverride.priceCents, status: 'SET PRICE', isOverride: false };
    }

    return { priceCents: 0, status: 'NO PRICE SET', isOverride: false };
  };

  const openOverrideModal = (dish: any, currentResolvedCents: number) => {
    setSelectedDishForOverride(dish);
    setOverridePriceDollars(currentResolvedCents ? centsToDollarsStr(currentResolvedCents) : '12.00');
    setIsOverrideModalOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Price Tier Engine</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage corporate pricing tiers, derived prices (5-cent ceiling rounded), and dish price overrides.
            </p>
          </div>

          <button
            onClick={() => setIsTierModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg flex items-center gap-2 shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> Create New Price Tier
          </button>
        </div>

        {/* Price Tiers Cards */}
        {tiersLoading ? (
          <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
            Loading pricing tiers...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers?.map((tier: any) => (
              <div
                key={tier.id}
                onClick={() => setSelectedTierId(tier.id)}
                className={`p-5 rounded-xl border cursor-pointer transition relative ${
                  selectedTierId === tier.id
                    ? 'bg-emerald-50/70 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-slate-900 text-base line-clamp-1">{tier.name}</h3>
                  {tier.isDefault && (
                    <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                      DEFAULT TIER
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                  <Calculator className="w-3.5 h-3.5 text-slate-400" />
                  {tier.derivationType === 'NONE'
                    ? 'Manual Prices'
                    : tier.derivationType === 'MULTIPLIER_OF_COST'
                    ? `Derived: Cost × ${tier.multiplier}`
                    : `Derived: Base Tier × ${tier.multiplier}`}
                </p>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" /> {tier._count?.companies || 0} Companies
                  </span>
                  <span className="font-bold text-slate-900">{tier._count?.dishPrices || 0} Overrides</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected Tier Dish Price Overview Table */}
        {selectedTier && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Tags className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-bold text-slate-900">{selectedTier.name} Tier Price Matrix</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Derived prices dynamically round UP to the next 5 cents ($2.11 → $2.15). Manual overrides strictly supersede derivation rules.
                </p>
              </div>

              <span className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
                Total Dishes: <strong>{dishesList.length}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="p-3">Dish Name</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Base Cost Price</th>
                    <th className="p-3">Resolved Price ($)</th>
                    <th className="p-3">Gross Margin</th>
                    <th className="p-3">Pricing Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dishesList.map((dish: any) => {
                    const resolved = resolveDishPrice(dish, selectedTier);
                    const marginCents = resolved.priceCents > 0 ? resolved.priceCents - dish.costPriceCents : 0;
                    const marginPct =
                      resolved.priceCents > 0
                        ? Math.round((marginCents / resolved.priceCents) * 100)
                        : 0;

                    return (
                      <tr key={dish.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3 font-semibold text-slate-900">
                          <div>
                            <p>{dish.name}</p>
                            <p className="text-xs text-slate-400 font-normal">{dish.category?.name}</p>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-xs text-slate-500">{dish.sku}</td>
                        <td className="p-3 text-slate-700 font-medium">{formatUsd(dish.costPriceCents)}</td>
                        <td className="p-3 font-extrabold text-emerald-700 text-base">
                          {formatUsd(resolved.priceCents)}
                        </td>
                        <td className="p-3">
                          {resolved.priceCents > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                              {formatUsd(marginCents)} ({marginPct}%)
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          {resolved.isOverride ? (
                            <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-200">
                              MANUAL OVERRIDE
                            </span>
                          ) : resolved.priceCents > 0 ? (
                            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                              {resolved.status}
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-md flex items-center gap-1 w-max border border-rose-200">
                              <AlertCircle className="w-3 h-3" /> NO PRICE SET
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => openOverrideModal(dish, resolved.priceCents)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg border border-indigo-200 transition inline-flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Set Override
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Price Tier Modal */}
        {isTierModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base">Create New Price Tier</h3>
                <button
                  onClick={() => setIsTierModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const mult = parseFloat(tierForm.multiplier);
                  createTierMutation.mutate({
                    name: tierForm.name,
                    isDefault: tierForm.isDefault,
                    derivationType: tierForm.derivationType,
                    baseTierId: tierForm.baseTierId || undefined,
                    multiplier: isNaN(mult) ? undefined : mult,
                  });
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tier Name *</label>
                  <input
                    type="text"
                    required
                    value={tierForm.name}
                    onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                    placeholder="e.g., Premium Corporate Tier (+15%)"
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={tierForm.isDefault}
                    onChange={(e) => setTierForm({ ...tierForm, isDefault: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="isDefault" className="font-semibold text-slate-800 cursor-pointer">
                    Set as Default System Tier
                  </label>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price Derivation Rule</label>
                  <select
                    value={tierForm.derivationType}
                    onChange={(e) => setTierForm({ ...tierForm, derivationType: e.target.value as any })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none"
                  >
                    <option value="NONE">NONE (Manual Override Only)</option>
                    <option value="MULTIPLIER_OF_COST">MULTIPLIER OF COST (Cost × Multiplier)</option>
                    <option value="PERCENTAGE_OF_TIER">PERCENTAGE OF BASE TIER (Base Tier × Multiplier)</option>
                  </select>
                </div>

                {tierForm.derivationType === 'PERCENTAGE_OF_TIER' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Select Base Tier</label>
                    <select
                      value={tierForm.baseTierId}
                      onChange={(e) => setTierForm({ ...tierForm, baseTierId: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none"
                    >
                      <option value="">Default System Tier</option>
                      {tiers?.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {tierForm.derivationType !== 'NONE' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Multiplier (e.g., 1.20 = +20% markup, 0.90 = 10% discount)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={tierForm.multiplier}
                      onChange={(e) => setTierForm({ ...tierForm, multiplier: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-sm font-semibold"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsTierModalOpen(false)}
                    className="px-4 py-2 text-slate-600 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createTierMutation.isPending}
                    className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-sm"
                  >
                    Create Tier
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Dish Override Modal */}
        {isOverrideModalOpen && selectedDishForOverride && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base">
                  Set Price Override for {selectedDishForOverride.name}
                </h3>
                <button
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const cents = dollarsToCents(overridePriceDollars);
                  setOverrideMutation.mutate({
                    dishId: selectedDishForOverride.id,
                    tierId: selectedTier.id,
                    priceCents: cents,
                  });
                }}
                className="space-y-4 text-xs"
              >
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <p className="text-slate-600">
                    Tier: <strong className="text-slate-900">{selectedTier.name}</strong>
                  </p>
                  <p className="text-slate-600">
                    Base Cost Price:{' '}
                    <strong className="text-slate-900">{formatUsd(selectedDishForOverride.costPriceCents)}</strong>
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Override Price ($ USD) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-base">$</span>
                    <input
                      type="text"
                      required
                      value={overridePriceDollars}
                      onChange={(e) => setOverridePriceDollars(e.target.value)}
                      placeholder="13.50"
                      className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-slate-300 text-base font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-50 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsOverrideModalOpen(false)}
                    className="px-4 py-2 text-slate-600 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={setOverrideMutation.isPending}
                    className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-sm"
                  >
                    Save Override
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
