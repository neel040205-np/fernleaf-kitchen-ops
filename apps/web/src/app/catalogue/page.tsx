'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '../../components/layout/AppLayout';
import { fetchApi } from '../../lib/api';
import {
  UtensilsCrossed,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Flame,
  Snowflake,
  Search,
  Filter,
  EyeOff,
  Edit2,
  Sparkles,
  Layers,
  Building2,
} from 'lucide-react';

export default function CataloguePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'dishes' | 'optionGroups' | 'categories' | 'hiding'>('dishes');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterStationId, setFilterStationId] = useState('');

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
    temperature: 'HOT',
    costPriceCents: 400,
    minOrderQuantity: 1,
    standardPriceCents: 1200,
    stationId: '',
    imageUrl: '',
  });

  // Hiding Modal state
  const [hidingCompanyId, setHidingCompanyId] = useState('');

  const { data: dishesData, isLoading: dishesLoading } = useQuery({
    queryKey: ['dishes', searchTerm, filterCategoryId, filterStationId],
    queryFn: () =>
      fetchApi(
        `/catalogue/dishes?search=${encodeURIComponent(searchTerm)}&categoryId=${filterCategoryId}&stationId=${filterStationId}`,
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

  const deactivateDishMutation = useMutation({
    mutationFn: (dishId: string) =>
      fetchApi(`/catalogue/dishes/${dishId}`, {
        method: 'DELETE',
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

  const toggleDishHidingMutation = useMutation({
    mutationFn: (payload: { companyId: string; dishId: string }) =>
      fetchApi('/catalogue/hiding/dish', {
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
      costPriceCents: 400,
      minOrderQuantity: 1,
      standardPriceCents: 1200,
      stationId: '',
      imageUrl: '',
    });
  };

  const openEditDishModal = (dish: any) => {
    setEditingDishId(dish.id);
    setDishForm({
      name: dish.name,
      description: dish.description,
      sku: dish.sku,
      categoryId: dish.categoryId,
      temperature: dish.temperature,
      costPriceCents: dish.costPriceCents,
      minOrderQuantity: dish.minOrderQuantity || 1,
      standardPriceCents: 1200,
      stationId: dish.stationId || '',
      imageUrl: dish.imageUrl || '',
    });
    setIsDishModalOpen(true);
  };

  const formatUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Catalogue & Menu Management</h1>
            <p className="text-sm text-slate-500 mt-1">Manage dishes, option groups, categories, company hiding rules, and employee previews.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-semibold text-sm rounded-lg flex items-center gap-2 transition"
            >
              <Eye className="w-4 h-4" /> Employee Menu Preview
            </button>
            <button
              onClick={() => {
                resetDishForm();
                setIsDishModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg flex items-center gap-2 shadow-sm transition"
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

        {/* Dishes Tab with Search & Filters */}
        {activeTab === 'dishes' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 text-xs">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by name, description, SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 uppercase">Category:</span>
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
                <span className="font-semibold text-slate-700 uppercase">Station:</span>
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

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {dishesLoading ? (
                <div className="p-8 text-center text-slate-500">Loading dishes...</div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="p-4">Dish</th>
                      <th className="p-4">SKU</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Cost Price</th>
                      <th className="p-4">Station</th>
                      <th className="p-4">Temp</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dishesData?.dishes?.map((dish: any) => (
                      <tr key={dish.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 font-semibold text-slate-900">
                          <div>
                            <p>{dish.name}</p>
                            <p className="text-xs text-slate-400 font-normal line-clamp-1">{dish.description}</p>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-xs text-slate-600">{dish.sku}</td>
                        <td className="p-4 text-slate-700">{dish.category?.name || 'Unassigned'}</td>
                        <td className="p-4 font-semibold text-slate-900">{formatUsd(dish.costPriceCents)}</td>
                        <td className="p-4 text-slate-600">{dish.station?.name || 'Unassigned'}</td>
                        <td className="p-4">
                          {dish.temperature === 'HOT' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold">
                              <Flame className="w-3 h-3" /> HOT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded font-semibold">
                              <Snowflake className="w-3 h-3" /> COLD
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {dish.isActive ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                              <CheckCircle className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-semibold">
                              <XCircle className="w-3 h-3" /> Deactivated
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => openEditDishModal(dish)}
                            className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition"
                          >
                            Edit
                          </button>
                          {dish.isActive && (
                            <button
                              onClick={() => deactivateDishMutation.mutate(dish.id)}
                              className="px-2.5 py-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 transition"
                            >
                              Deactivate
                            </button>
                          )}
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
                <button onClick={() => setIsPreviewOpen(false)} className="text-slate-400 font-bold">
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

        {/* Create / Edit Dish Modal */}
        {isDishModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base">
                  {editingDishId ? 'Edit Dish in Catalogue' : 'Add New Dish to Catalogue'}
                </h3>
                <button onClick={() => setIsDishModalOpen(false)} className="text-slate-400 font-bold">
                  ✕
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editingDishId) {
                    updateDishMutation.mutate({
                      id: editingDishId,
                      data: {
                        name: dishForm.name,
                        description: dishForm.description,
                        sku: dishForm.sku,
                        categoryId: dishForm.categoryId,
                        temperature: dishForm.temperature,
                        costPriceCents: dishForm.costPriceCents,
                        minOrderQuantity: dishForm.minOrderQuantity,
                        stationId: dishForm.stationId || undefined,
                        imageUrl: dishForm.imageUrl || undefined,
                      },
                    });
                  } else {
                    createDishMutation.mutate(dishForm);
                  }
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dish Name</label>
                  <input
                    type="text"
                    required
                    value={dishForm.name}
                    onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                    placeholder="Paneer Tikka Bowl"
                    className="w-full p-2.5 rounded border border-slate-300 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">SKU Number</label>
                    <input
                      type="text"
                      required
                      value={dishForm.sku}
                      onChange={(e) => setDishForm({ ...dishForm, sku: e.target.value })}
                      placeholder="BWL-102"
                      className="w-full p-2.5 rounded border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      required
                      value={dishForm.categoryId}
                      onChange={(e) => setDishForm({ ...dishForm, categoryId: e.target.value })}
                      className="w-full p-2.5 rounded border border-slate-300 text-sm"
                    >
                      <option value="">Select Category</option>
                      {categories?.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    required
                    value={dishForm.description}
                    onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
                    rows={2}
                    className="w-full p-2.5 rounded border border-slate-300 text-sm"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Cost Price (Cents)</label>
                    <input
                      type="number"
                      required
                      value={dishForm.costPriceCents}
                      onChange={(e) => setDishForm({ ...dishForm, costPriceCents: parseInt(e.target.value, 10) })}
                      className="w-full p-2.5 rounded border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Temperature</label>
                    <select
                      value={dishForm.temperature}
                      onChange={(e) => setDishForm({ ...dishForm, temperature: e.target.value as any })}
                      className="w-full p-2.5 rounded border border-slate-300 text-sm"
                    >
                      <option value="HOT">HOT</option>
                      <option value="COLD">COLD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Min Order Qty</label>
                    <input
                      type="number"
                      value={dishForm.minOrderQuantity}
                      onChange={(e) => setDishForm({ ...dishForm, minOrderQuantity: parseInt(e.target.value, 10) })}
                      className="w-full p-2.5 rounded border border-slate-300 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button type="button" onClick={() => setIsDishModalOpen(false)} className="px-4 py-2 text-slate-600 font-semibold">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createDishMutation.isPending || updateDishMutation.isPending}
                    className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700"
                  >
                    {editingDishId ? 'Update Dish' : 'Create Dish'}
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
