'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '../../components/layout/AppLayout';
import { fetchApi } from '../../lib/api';
import { dollarsToCents, centsToDollarsStr, formatUsd } from '../../lib/money';
import {
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Flame,
  Snowflake,
  Search,
  EyeOff,
  Edit2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Image as ImageIcon,
  Tag,
  ShieldAlert,
  ChefHat,
} from 'lucide-react';

export default function CataloguePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'dishes' | 'optionGroups' | 'categories' | 'hiding'>('dishes');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterStationId, setFilterStationId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Preview Modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  // Create/Edit Dish Modal state
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [dishForm, setDishForm] = useState({
    name: '',
    description: '',
    sku: '',
    categoryId: '',
    temperature: 'HOT' as 'HOT' | 'COLD',
    costPriceDollars: '4.50',
    minOrderQuantity: 1,
    standardPriceDollars: '12.00',
    stationId: '',
    imageUrl: '',
    isActive: true,
    allergens: [] as string[],
    dietaryTags: [] as string[],
    optionGroupIds: [] as string[],
  });

  // Hiding Modal state
  const [hidingCompanyId, setHidingCompanyId] = useState('');

  const { data: dishesData, isLoading: dishesLoading } = useQuery({
    queryKey: ['dishes', searchTerm, filterCategoryId, filterStationId, statusFilter],
    queryFn: () =>
      fetchApi(
        `/catalogue/dishes?search=${encodeURIComponent(searchTerm)}&categoryId=${filterCategoryId}&stationId=${filterStationId}&includeInactive=true`,
      ),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchApi('/catalogue/categories'),
  });

  const { data: optionGroups } = useQuery({
    queryKey: ['optionGroups'],
    queryFn: () => fetchApi('/catalogue/option-groups'),
  });

  const { data: refData } = useQuery({
    queryKey: ['refData'],
    queryFn: () => fetchApi('/catalogue/reference-data'),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => fetchApi('/employees'),
  });

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => fetchApi('/companies'),
  });

  const { data: companyDetail } = useQuery({
    queryKey: ['companyDetail', hidingCompanyId],
    queryFn: () => fetchApi(`/companies/${hidingCompanyId}`),
    enabled: !!hidingCompanyId && activeTab === 'hiding',
  });

  const { data: previewData, isFetching: previewLoading } = useQuery({
    queryKey: ['menuPreview', selectedEmployeeId],
    queryFn: () => fetchApi(`/orders/menu-preview?employeeId=${selectedEmployeeId}`),
    enabled: !!selectedEmployeeId && isPreviewOpen,
  });

  const createDishMutation = useMutation({
    mutationFn: (newDish: any) =>
      fetchApi('/catalogue/dishes', {
        method: 'POST',
        body: JSON.stringify(newDish),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
      setIsDishModalOpen(false);
      resetDishForm();
    },
  });

  const updateDishMutation = useMutation({
    mutationFn: (updatePayload: { id: string; data: any }) =>
      fetchApi(`/catalogue/dishes/${updatePayload.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatePayload.data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
      setIsDishModalOpen(false);
      resetDishForm();
    },
  });

  const toggleDishStatusMutation = useMutation({
    mutationFn: (payload: { id: string; isActive?: boolean }) =>
      fetchApi(`/catalogue/dishes/${payload.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: payload.isActive }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
    },
  });

  const toggleCategoryHidingMutation = useMutation({
    mutationFn: (payload: { companyId: string; categoryId: string }) =>
      fetchApi('/catalogue/hiding/category', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyDetail', hidingCompanyId] });
    },
  });

  const resetDishForm = () => {
    setEditingDishId(null);
    setDishForm({
      name: '',
      description: '',
      sku: '',
      categoryId: '',
      temperature: 'HOT',
      costPriceDollars: '4.50',
      minOrderQuantity: 1,
      standardPriceDollars: '12.00',
      stationId: '',
      imageUrl: '',
      isActive: true,
      allergens: [],
      dietaryTags: [],
      optionGroupIds: [],
    });
  };

  const openEditDishModal = (dish: any) => {
    setEditingDishId(dish.id);
    const defaultTierPrice = dish.tierPrices?.find((tp: any) => tp.tier?.isDefault)?.priceCents;
    const stdPriceDollars = defaultTierPrice !== undefined ? centsToDollarsStr(defaultTierPrice) : '12.00';

    setDishForm({
      name: dish.name || '',
      description: dish.description || '',
      sku: dish.sku || '',
      categoryId: dish.categoryId || '',
      temperature: dish.temperature || 'HOT',
      costPriceDollars: centsToDollarsStr(dish.costPriceCents || 0),
      minOrderQuantity: dish.minOrderQuantity || 1,
      standardPriceDollars: stdPriceDollars,
      stationId: dish.stationId || '',
      imageUrl: dish.imageUrl || '',
      isActive: dish.isActive !== undefined ? dish.isActive : true,
      allergens: Array.isArray(dish.allergens) ? dish.allergens : [],
      dietaryTags: Array.isArray(dish.dietaryTags) ? dish.dietaryTags : [],
      optionGroupIds: dish.optionGroups ? dish.optionGroups.map((og: any) => og.optionGroupId) : [],
    });
    setIsDishModalOpen(true);
  };

  const toggleOptionGroup = (ogId: string) => {
    setDishForm((prev) => {
      const exists = prev.optionGroupIds.includes(ogId);
      return {
        ...prev,
        optionGroupIds: exists
          ? prev.optionGroupIds.filter((id) => id !== ogId)
          : [...prev.optionGroupIds, ogId],
      };
    });
  };

  const toggleAllergen = (allergenName: string) => {
    setDishForm((prev) => {
      const exists = prev.allergens.includes(allergenName);
      return {
        ...prev,
        allergens: exists
          ? prev.allergens.filter((a) => a !== allergenName)
          : [...prev.allergens, allergenName],
      };
    });
  };

  const toggleDietaryTag = (tagName: string) => {
    setDishForm((prev) => {
      const exists = prev.dietaryTags.includes(tagName);
      return {
        ...prev,
        dietaryTags: exists
          ? prev.dietaryTags.filter((t) => t !== tagName)
          : [...prev.dietaryTags, tagName],
      };
    });
  };

  const filteredDishes = (dishesData?.dishes || []).filter((dish: any) => {
    if (statusFilter === 'active') return dish.isActive;
    if (statusFilter === 'inactive') return !dish.isActive;
    return true;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Catalogue & Menu Management</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage food dishes, active status toggles, reusable option groups, pricing tiers, and company hiding rules.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-semibold text-sm rounded-lg flex items-center gap-2 transition shadow-sm"
            >
              <Eye className="w-4 h-4" /> Employee Menu Preview
            </button>
            <button
              onClick={() => {
                resetDishForm();
                setIsDishModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg flex items-center gap-2 shadow-md transition"
            >
              <Plus className="w-4 h-4" /> Add New Dish
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-6">
          <button
            onClick={() => setActiveTab('dishes')}
            className={`pb-3 text-sm font-bold border-b-2 transition ${
              activeTab === 'dishes'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Dishes ({dishesData?.total || 0})
          </button>
          <button
            onClick={() => setActiveTab('optionGroups')}
            className={`pb-3 text-sm font-bold border-b-2 transition ${
              activeTab === 'optionGroups'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Option Groups ({optionGroups?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`pb-3 text-sm font-bold border-b-2 transition ${
              activeTab === 'categories'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Categories ({categories?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('hiding')}
            className={`pb-3 text-sm font-bold border-b-2 transition ${
              activeTab === 'hiding'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Company Menu Hiding Rules
          </button>
        </div>

        {/* Dishes Tab */}
        {activeTab === 'dishes' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by name, description, SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-50 focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-600 uppercase">Category:</span>
                  <select
                    value={filterCategoryId}
                    onChange={(e) => setFilterCategoryId(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none"
                  >
                    <option value="">All Categories</option>
                    {categories?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-600 uppercase">Station:</span>
                  <select
                    value={filterStationId}
                    onChange={(e) => setFilterStationId(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none"
                  >
                    <option value="">All Stations</option>
                    {refData?.stations?.map((st: any) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Filter Toggle Pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                    statusFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Statuses
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                    statusFilter === 'active'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Active Only
                </button>
                <button
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                    statusFilter === 'inactive'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" /> Deactivated Only
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {dishesLoading ? (
                <div className="p-8 text-center text-slate-500">Loading dishes...</div>
              ) : filteredDishes.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No dishes found matching your current filter criteria.
                </div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="p-4">Dish</th>
                      <th className="p-4">SKU</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Cost Price (₹)</th>
                      <th className="p-4">Station</th>
                      <th className="p-4">Temp</th>
                      <th className="p-4">Status Toggle</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDishes.map((dish: any) => (
                      <tr
                        key={dish.id}
                        className={`hover:bg-slate-50/70 transition ${
                          !dish.isActive ? 'bg-slate-50/40 opacity-75' : ''
                        }`}
                      >
                        <td className="p-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-3">
                            {dish.imageUrl ? (
                              <img
                                src={dish.imageUrl}
                                alt={dish.name}
                                className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                <ChefHat className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-900">{dish.name}</p>
                              <p className="text-xs text-slate-400 font-normal line-clamp-1">{dish.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-xs text-slate-600">{dish.sku}</td>
                        <td className="p-4 text-slate-700">{dish.category?.name || 'Unassigned'}</td>
                        <td className="p-4 font-bold text-slate-900">{formatUsd(dish.costPriceCents)}</td>
                        <td className="p-4 text-slate-600">{dish.station?.name || 'Unassigned'}</td>
                        <td className="p-4">
                          {dish.temperature === 'HOT' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded font-semibold border border-amber-200">
                              <Flame className="w-3 h-3 text-amber-600" /> HOT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded font-semibold border border-sky-200">
                              <Snowflake className="w-3 h-3 text-sky-600" /> COLD
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() =>
                              toggleDishStatusMutation.mutate({
                                id: dish.id,
                                isActive: !dish.isActive,
                              })
                            }
                            disabled={toggleDishStatusMutation.isPending}
                            title="Click to toggle food active status"
                            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold transition border cursor-pointer ${
                              dish.isActive
                                ? 'text-emerald-800 bg-emerald-50 border-emerald-300 hover:bg-emerald-100'
                                : 'text-slate-600 bg-slate-100 border-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {dish.isActive ? (
                              <>
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Active
                              </>
                            ) : (
                              <>
                                <span className="w-2 h-2 rounded-full bg-slate-400" />
                                Deactivated
                              </>
                            )}
                          </button>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => openEditDishModal(dish)}
                            className="px-3 py-1.5 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition inline-flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() =>
                              toggleDishStatusMutation.mutate({
                                id: dish.id,
                                isActive: !dish.isActive,
                              })
                            }
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition inline-flex items-center gap-1 ${
                              dish.isActive
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {dish.isActive ? (
                              <>
                                <XCircle className="w-3.5 h-3.5" /> Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" /> Activate
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Option Groups Tab */}
        {activeTab === 'optionGroups' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {optionGroups?.map((og: any) => (
              <div key={og.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{og.name}</h3>
                    <p className="text-xs text-slate-500">
                      {og.isRequired ? 'Required Group' : 'Optional Group'} • {og.usesPortions ? 'Uses Portion Sizes (Regular/Large)' : 'Standard Pricing'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
                    Order #{og.displayOrder}
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Options:</p>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {og.options?.map((opt: any) => (
                      <li key={opt.id} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                        <span className="font-medium text-slate-900">{opt.name}</span>
                        <span className="font-semibold text-slate-700">Cost: {formatUsd(opt.costPriceCents)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories?.map((cat: any) => (
              <div key={cat.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-base">{cat.name}</h3>
                  {cat.isSecret && <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">SECRET</span>}
                </div>
                <p className="text-xs text-slate-500">Contains {cat._count?.dishes || 0} dishes</p>
              </div>
            ))}
          </div>
        )}

        {/* Company Menu Hiding Config Tab */}
        {activeTab === 'hiding' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">Configure Company-Specific Hidden Items & Categories</h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Company
              </label>
              <select
                value={hidingCompanyId}
                onChange={(e) => setHidingCompanyId(e.target.value)}
                className="w-full max-w-md p-2.5 rounded-lg border border-slate-300 text-sm"
              >
                <option value="">-- Choose Company --</option>
                {companies?.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {companyDetail && (
              <div className="space-y-6 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">Hidden Categories for {companyDetail.name}:</h3>
                  <div className="flex flex-wrap gap-2">
                    {categories?.map((cat: any) => {
                      const isHidden = companyDetail.hiddenCategories?.some((hc: any) => hc.categoryId === cat.id);
                      return (
                        <button
                          key={cat.id}
                          onClick={() =>
                            toggleCategoryHidingMutation.mutate({
                              companyId: companyDetail.id,
                              categoryId: cat.id,
                            })
                          }
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 ${
                            isHidden
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {isHidden ? <EyeOff className="w-3.5 h-3.5 text-rose-600" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                          {cat.name} {isHidden && '(Hidden)'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Employee Menu Preview Modal */}
        {isPreviewOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Sparkles className="w-5 h-5" />
                  <h2 className="text-lg font-bold text-slate-900">Employee Menu Live Preview</h2>
                </div>
                <button onClick={() => setIsPreviewOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">
                  ✕
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Employee to Preview
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees?.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.email} - {emp.company?.name})
                    </option>
                  ))}
                </select>
              </div>

              {selectedEmployeeId && (
                <div className="flex-1 overflow-y-auto space-y-4 border border-slate-200 p-4 rounded-xl bg-slate-50">
                  {previewLoading ? (
                    <p className="text-sm text-slate-500 text-center py-4">Resolving tier pricing & hiding rules...</p>
                  ) : previewData ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-white border border-indigo-100 rounded-lg text-xs space-y-1">
                        <p className="font-bold text-indigo-900">
                          Viewing menu for: {previewData.employee.name} ({previewData.employee.companyName})
                        </p>
                        <p className="text-slate-500">
                          Price Tier Applied: <strong className="text-slate-700">{previewData.resolvedTierId}</strong>
                        </p>
                      </div>

                      {previewData.categories?.map((cat: any) => (
                        <div key={cat.id} className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                          <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-1">{cat.name}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {cat.dishes?.map((dish: any) => (
                              <div key={dish.id} className="p-3 border border-slate-100 rounded-lg bg-slate-50/50 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between">
                                    <p className="font-bold text-slate-900 text-xs">{dish.name}</p>
                                    <span className="font-bold text-emerald-700 text-xs">{formatUsd(dish.resolvedPriceCents)}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{dish.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Create / Edit Dish Modal */}
        {isDishModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-slate-900 text-lg">
                    {editingDishId ? 'Edit Dish in Catalogue' : 'Add New Dish to Catalogue'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setDishForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                      dishForm.isActive
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-600 border-slate-300'
                    }`}
                  >
                    {dishForm.isActive ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                    {dishForm.isActive ? 'Active' : 'Deactivated'}
                  </button>
                </div>
                <button
                  onClick={() => setIsDishModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const costCents = dollarsToCents(dishForm.costPriceDollars);
                  const standardCents = dollarsToCents(dishForm.standardPriceDollars);

                  if (editingDishId) {
                    updateDishMutation.mutate({
                      id: editingDishId,
                      data: {
                        name: dishForm.name,
                        description: dishForm.description,
                        sku: dishForm.sku,
                        categoryId: dishForm.categoryId,
                        temperature: dishForm.temperature,
                        costPriceCents: costCents,
                        minOrderQuantity: dishForm.minOrderQuantity,
                        stationId: dishForm.stationId || undefined,
                        imageUrl: dishForm.imageUrl || undefined,
                        isActive: dishForm.isActive,
                        allergens: dishForm.allergens,
                        dietaryTags: dishForm.dietaryTags,
                        optionGroupIds: dishForm.optionGroupIds,
                        standardPriceCents: standardCents,
                      },
                    });
                  } else {
                    createDishMutation.mutate({
                      ...dishForm,
                      costPriceCents: costCents,
                      standardPriceCents: standardCents,
                    });
                  }
                }}
                className="space-y-4 text-xs overflow-y-auto flex-1 pr-1"
              >
                {/* Name & SKU */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Dish Name *</label>
                    <input
                      type="text"
                      required
                      value={dishForm.name}
                      onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                      placeholder="Paneer Tikka Bowl"
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-50 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">SKU Code *</label>
                    <input
                      type="text"
                      required
                      value={dishForm.sku}
                      onChange={(e) => setDishForm({ ...dishForm, sku: e.target.value })}
                      placeholder="BWL-102"
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-50 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Category & Station */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                    <select
                      required
                      value={dishForm.categoryId}
                      onChange={(e) => setDishForm({ ...dishForm, categoryId: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none"
                    >
                      <option value="">Select Category</option>
                      {categories?.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kitchen Prep Station</label>
                    <select
                      value={dishForm.stationId}
                      onChange={(e) => setDishForm({ ...dishForm, stationId: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none"
                    >
                      <option value="">Unassigned Station</option>
                      {refData?.stations?.map((st: any) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description *</label>
                  <textarea
                    required
                    value={dishForm.description}
                    onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
                    rows={2}
                    placeholder="Rich description of ingredients and preparation method..."
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-50 focus:border-emerald-500"
                  />
                </div>

                {/* Financials & Temperature */}
                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Cost Price (₹) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                      <input
                        type="text"
                        required
                        value={dishForm.costPriceDollars}
                        onChange={(e) => setDishForm({ ...dishForm, costPriceDollars: e.target.value })}
                        placeholder="60.00"
                        className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Standard Tier Price (₹) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                      <input
                        type="text"
                        required
                        value={dishForm.standardPriceDollars}
                        onChange={(e) => setDishForm({ ...dishForm, standardPriceDollars: e.target.value })}
                        placeholder="12.00"
                        className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Temperature</label>
                    <select
                      value={dishForm.temperature}
                      onChange={(e) => setDishForm({ ...dishForm, temperature: e.target.value as any })}
                      className="w-full p-2 rounded-lg border border-slate-300 text-sm"
                    >
                      <option value="HOT">HOT</option>
                      <option value="COLD">COLD</option>
                    </select>
                  </div>
                </div>

                {/* Image URL with Preview */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dish Image URL</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="url"
                        value={dishForm.imageUrl}
                        onChange={(e) => setDishForm({ ...dishForm, imageUrl: e.target.value })}
                        placeholder="https://images.unsplash.com/photo-..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none"
                      />
                    </div>
                    {dishForm.imageUrl && (
                      <img
                        src={dishForm.imageUrl}
                        alt="Preview"
                        className="w-9 h-9 object-cover rounded-lg border border-slate-200"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Option Groups Multi-Select */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Attach Option Groups (Add-ons)</label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    {optionGroups?.map((og: any) => {
                      const isSelected = dishForm.optionGroupIds.includes(og.id);
                      return (
                        <label
                          key={og.id}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer border transition text-xs ${
                            isSelected ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold' : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOptionGroup(og.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{og.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Allergens Selection */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Allergens
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {refData?.allergens?.map((alg: any) => {
                      const isSelected = dishForm.allergens.includes(alg.name);
                      return (
                        <button
                          type="button"
                          key={alg.id}
                          onClick={() => toggleAllergen(alg.name)}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold border transition ${
                            isSelected
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {alg.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dietary Tags Selection */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" /> Dietary Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {refData?.dietaryTags?.map((tag: any) => {
                      const isSelected = dishForm.dietaryTags.includes(tag.name);
                      return (
                        <button
                          type="button"
                          key={tag.id}
                          onClick={() => toggleDietaryTag(tag.name)}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold border transition ${
                            isSelected
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsDishModalOpen(false)}
                    className="px-4 py-2 text-slate-600 font-semibold hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createDishMutation.isPending || updateDishMutation.isPending}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition"
                  >
                    {editingDishId ? 'Save Changes' : 'Create Dish'}
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
