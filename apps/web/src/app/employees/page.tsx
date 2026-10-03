'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '../../components/layout/AppLayout';
import { fetchApi } from '../../lib/api';
import { Users, Upload, Plus, Check, X, AlertCircle, Download, FileSpreadsheet, FileText } from 'lucide-react';

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'csv'>('single');

  // Single Employee Form State
  const [singleForm, setSingleForm] = useState({
    companyId: '',
    name: '',
    email: '',
    canChooseAddress: false,
    canChangeDeliveryTime: false,
    canChangePackaging: false,
    allergies: '',
    dietaryPreferences: '',
  });
  const [singleError, setSingleError] = useState<string | null>(null);
  const [singleSuccess, setSingleSuccess] = useState<string | null>(null);

  // CSV Import State
  const [csvCompanyId, setCsvCompanyId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [parsedPreview, setParsedPreview] = useState<Array<Record<string, string>>>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [csvInputMethod, setCsvInputMethod] = useState<'upload' | 'paste'>('upload');
  const [csvResult, setCsvResult] = useState<any>(null);

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', selectedCompanyId],
    queryFn: () => fetchApi(`/employees${selectedCompanyId ? `?companyId=${selectedCompanyId}` : ''}`),
  });

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => fetchApi('/companies'),
  });

  const togglePermissionMutation = useMutation({
    mutationFn: (update: { id: string; field: string; value: boolean }) =>
      fetchApi(`/employees/${update.id}`, {
        method: 'PUT',
        body: JSON.stringify({ [update.field]: update.value }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const createSingleEmployeeMutation = useMutation({
    mutationFn: (payload: any) =>
      fetchApi('/employees', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      setSingleSuccess(`Successfully created employee ${data.name}!`);
      setSingleError(null);
      setSingleForm({
        companyId: singleForm.companyId,
        name: '',
        email: '',
        canChooseAddress: false,
        canChangeDeliveryTime: false,
        canChangePackaging: false,
        allergies: '',
        dietaryPreferences: '',
      });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err: any) => {
      setSingleError(err.message || 'Failed to create employee');
      setSingleSuccess(null);
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: (payload: { companyId: string; csvContent: string }) =>
      fetchApi('/employees/bulk-import', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      setCsvResult(data);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const sampleCsvTemplate = `name,email,canChooseAddress,canChangeDeliveryTime,canChangePackaging,allergies,dietaryPreferences
John Doe,john@acme.com,true,false,false,Nuts;Dairy,Vegan
Jane Smith,jane@acme.com,false,true,true,,Jain`;

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([sampleCsvTemplate], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'employees_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parsePreviewRows = (text: string) => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) {
      setParsedPreview([]);
      return;
    }
    const headers = lines[0].split(',').map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const vals = line.split(',').map((v) => v.trim());
      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = vals[idx] || '';
      });
      return rowObj;
    });
    setParsedPreview(rows);
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
      parsePreviewRows(text);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel') {
        handleFileChange(file);
      } else {
        alert('Please upload a valid .csv file.');
      }
    }
  };

  const openAddEmployeeModal = (tab: 'single' | 'csv') => {
    setActiveTab(tab);
    setSingleError(null);
    setSingleSuccess(null);
    setCsvResult(null);
    setIsModalOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Company Employees</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage corporate employees, staff permission flags, single employee onboarding, and CSV bulk imports.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => openAddEmployeeModal('single')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg flex items-center gap-2 shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Add Employee
            </button>

            <button
              onClick={() => openAddEmployeeModal('csv')}
              className="px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-semibold text-sm rounded-lg flex items-center gap-2 transition"
            >
              <Upload className="w-4 h-4" /> Bulk Import CSV
            </button>
          </div>
        </div>

        {/* Company Filter */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Filter by Company:</label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">All Companies</option>
            {companies?.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Employees Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading employees...</div>
          ) : employees?.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <Users className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-700">No employees found.</p>
              <p className="text-xs text-slate-400">Add an employee manually or import employees using a CSV file.</p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => openAddEmployeeModal('single')}
                  className="px-3.5 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-lg hover:bg-emerald-700"
                >
                  + Add Single Employee
                </button>
                <button
                  onClick={() => openAddEmployeeModal('csv')}
                  className="px-3.5 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-xs rounded-lg hover:bg-indigo-100"
                >
                  <Upload className="w-3.5 h-3.5 inline mr-1" /> Import CSV File
                </button>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Employee</th>
                  <th className="p-4">Company</th>
                  <th className="p-4">Choose Address</th>
                  <th className="p-4">Change Time</th>
                  <th className="p-4">Change Packaging</th>
                  <th className="p-4">Dietary & Allergies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees?.map((emp: any) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 font-semibold text-slate-900">
                      <div>
                        <p>{emp.name}</p>
                        <p className="text-xs text-slate-400 font-normal">{emp.email}</p>
                      </div>
                    </td>
                    <td className="p-4 text-slate-700 font-medium">{emp.company?.name}</td>

                    {/* Permission Flags */}
                    <td className="p-4">
                      <button
                        onClick={() =>
                          togglePermissionMutation.mutate({
                            id: emp.id,
                            field: 'canChooseAddress',
                            value: !emp.canChooseAddress,
                          })
                        }
                        className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                          emp.canChooseAddress ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {emp.canChooseAddress ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {emp.canChooseAddress ? 'Allowed' : 'Disabled'}
                      </button>
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() =>
                          togglePermissionMutation.mutate({
                            id: emp.id,
                            field: 'canChangeDeliveryTime',
                            value: !emp.canChangeDeliveryTime,
                          })
                        }
                        className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                          emp.canChangeDeliveryTime ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {emp.canChangeDeliveryTime ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {emp.canChangeDeliveryTime ? 'Allowed' : 'Disabled'}
                      </button>
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() =>
                          togglePermissionMutation.mutate({
                            id: emp.id,
                            field: 'canChangePackaging',
                            value: !emp.canChangePackaging,
                          })
                        }
                        className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                          emp.canChangePackaging ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {emp.canChangePackaging ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {emp.canChangePackaging ? 'Allowed' : 'Disabled'}
                      </button>
                    </td>

                    <td className="p-4 text-xs text-slate-600">
                      <div>
                        {emp.allergies?.length > 0 && (
                          <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-medium mr-1">
                            Allergies: {emp.allergies.join(', ')}
                          </span>
                        )}
                        {emp.dietaryPreferences?.length > 0 && (
                          <span className="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">
                            Diet: {emp.dietaryPreferences.join(', ')}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Add Employee & CSV Bulk Import Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-base">Add Employees</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('single')}
                  className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center transition flex items-center justify-center gap-2 ${
                    activeTab === 'single'
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" /> Single Employee Form
                </button>
                <button
                  onClick={() => setActiveTab('csv')}
                  className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center transition flex items-center justify-center gap-2 ${
                    activeTab === 'csv'
                      ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Import CSV File
                </button>
              </div>

              {/* TAB 1: Single Employee */}
              {activeTab === 'single' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!singleForm.companyId) {
                      setSingleError('Please select a company');
                      return;
                    }
                    createSingleEmployeeMutation.mutate({
                      companyId: singleForm.companyId,
                      name: singleForm.name,
                      email: singleForm.email,
                      canChooseAddress: singleForm.canChooseAddress,
                      canChangeDeliveryTime: singleForm.canChangeDeliveryTime,
                      canChangePackaging: singleForm.canChangePackaging,
                      allergies: singleForm.allergies
                        ? singleForm.allergies.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
                        : [],
                      dietaryPreferences: singleForm.dietaryPreferences
                        ? singleForm.dietaryPreferences.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
                        : [],
                    });
                  }}
                  className="space-y-4 overflow-y-auto pr-1 text-xs"
                >
                  {singleError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {singleError}
                    </div>
                  )}

                  {singleSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2 font-medium">
                      <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                      {singleSuccess}
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Company *</label>
                    <select
                      required
                      value={singleForm.companyId}
                      onChange={(e) => setSingleForm({ ...singleForm, companyId: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">-- Select Target Company --</option>
                      {companies?.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sarah Jenkins"
                        value={singleForm.name}
                        onChange={(e) => setSingleForm({ ...singleForm, name: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Corporate Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. sarah@acme.com"
                        value={singleForm.email}
                        onChange={(e) => setSingleForm({ ...singleForm, email: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>

                  {/* Staff Permission Flags */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-2">Staff Permissions & Flags</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={singleForm.canChooseAddress}
                          onChange={(e) => setSingleForm({ ...singleForm, canChooseAddress: e.target.checked })}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-medium text-slate-700">Choose Address</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={singleForm.canChangeDeliveryTime}
                          onChange={(e) => setSingleForm({ ...singleForm, canChangeDeliveryTime: e.target.checked })}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-medium text-slate-700">Change Time</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={singleForm.canChangePackaging}
                          onChange={(e) => setSingleForm({ ...singleForm, canChangePackaging: e.target.checked })}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-medium text-slate-700">Change Packaging</span>
                      </label>
                    </div>
                  </div>

                  {/* Dietary Preferences & Allergies */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Allergies <span className="font-normal text-slate-400">(separated by commas or semicolons)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Nuts, Dairy, Shellfish"
                        value={singleForm.allergies}
                        onChange={(e) => setSingleForm({ ...singleForm, allergies: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Dietary Preferences <span className="font-normal text-slate-400">(separated by commas or semicolons)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Vegan, Jain, Gluten-Free"
                        value={singleForm.dietaryPreferences}
                        onChange={(e) => setSingleForm({ ...singleForm, dietaryPreferences: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-300 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 text-slate-600 font-semibold"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={createSingleEmployeeMutation.isPending}
                      className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {createSingleEmployeeMutation.isPending ? 'Saving Employee...' : 'Add Employee'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: CSV File Import */}
              {activeTab === 'csv' && (
                <div className="space-y-4 overflow-y-auto pr-1 text-xs">
                  {/* Top Bar: Target Company & Sample Download */}
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100">
                    <div className="flex-1">
                      <label className="block font-semibold text-indigo-950 mb-1">Target Company *</label>
                      <select
                        value={csvCompanyId}
                        onChange={(e) => setCsvCompanyId(e.target.value)}
                        className="w-full p-2 rounded-lg border border-indigo-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">-- Select Target Company --</option>
                        {companies?.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadSampleCsv}
                      className="px-3.5 py-2 bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 font-semibold text-xs rounded-lg flex items-center gap-1.5 shrink-0 transition"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Sample CSV
                    </button>
                  </div>

                  {/* Mode Selector: Upload CSV File vs Paste Text */}
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
                    <span>Import Method:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="csvMode"
                        checked={csvInputMethod === 'upload'}
                        onChange={() => setCsvInputMethod('upload')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Upload .csv File</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="csvMode"
                        checked={csvInputMethod === 'paste'}
                        onChange={() => setCsvInputMethod('paste')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Paste Raw CSV Text</span>
                    </label>
                  </div>

                  {/* CSV File Upload Dropzone */}
                  {csvInputMethod === 'upload' && (
                    <div>
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2 ${
                          isDragOver
                            ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
                            : csvFileName
                            ? 'border-emerald-400 bg-emerald-50/30'
                            : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
                        }`}
                      >
                        <Upload className="w-8 h-8 text-indigo-500" />
                        <div>
                          <p className="font-bold text-slate-800 text-sm">
                            {csvFileName ? `Selected file: ${csvFileName}` : 'Drag & drop your CSV file here'}
                          </p>
                          <p className="text-slate-500 text-xs mt-0.5">
                            {csvFileName
                              ? 'Click below to change file or drop another file'
                              : 'Supports .csv files with name, email, permissions & allergies'}
                          </p>
                        </div>

                        <label className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg cursor-pointer transition">
                          Browse CSV File
                          <input
                            type="file"
                            accept=".csv,text/csv,application/vnd.ms-excel"
                            className="hidden"
                            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Paste Raw CSV Text Area */}
                  {csvInputMethod === 'paste' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700">Paste CSV Content</label>
                        <button
                          type="button"
                          onClick={() => {
                            setCsvText(sampleCsvTemplate);
                            parsePreviewRows(sampleCsvTemplate);
                          }}
                          className="text-indigo-600 font-semibold hover:underline"
                        >
                          Load Sample Text
                        </button>
                      </div>
                      <textarea
                        rows={6}
                        value={csvText}
                        onChange={(e) => {
                          setCsvText(e.target.value);
                          parsePreviewRows(e.target.value);
                        }}
                        placeholder="name,email,canChooseAddress,canChangeDeliveryTime,canChangePackaging,allergies,dietaryPreferences"
                        className="w-full p-2.5 font-mono text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  )}

                  {/* CSV File Parsing Preview */}
                  {parsedPreview.length > 0 && (
                    <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          Parsed Preview ({parsedPreview.length} employee row{parsedPreview.length > 1 ? 's' : ''})
                        </span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          Showing up to first 5 rows
                        </span>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                              <th className="p-2">Name</th>
                              <th className="p-2">Email</th>
                              <th className="p-2">Address Flag</th>
                              <th className="p-2">Time Flag</th>
                              <th className="p-2">Dietary / Allergies</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {parsedPreview.slice(0, 5).map((r, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-2 font-medium text-slate-900">{r.name || '-'}</td>
                                <td className="p-2 text-slate-700">{r.email || '-'}</td>
                                <td className="p-2 text-slate-600">{r.canChooseAddress || 'false'}</td>
                                <td className="p-2 text-slate-600">{r.canChangeDeliveryTime || 'false'}</td>
                                <td className="p-2 text-slate-600">
                                  {r.allergies || r.dietaryPreferences
                                    ? `${r.allergies ? `Alg: ${r.allergies}` : ''} ${
                                        r.dietaryPreferences ? `Diet: ${r.dietaryPreferences}` : ''
                                      }`
                                    : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* CSV Execution Result Report */}
                  {csvResult && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center gap-4 text-xs font-bold">
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md">
                          Imported: {csvResult.importedCount}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-md ${
                            csvResult.errorCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          Row Errors: {csvResult.errorCount}
                        </span>
                      </div>

                      {csvResult.errorCount > 0 && (
                        <div className="space-y-1.5 text-xs text-rose-700 border-t border-slate-200 pt-2.5">
                          <p className="font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Row-Level Error Report:
                          </p>
                          <ul className="list-disc list-inside space-y-1 bg-rose-50/70 p-2.5 rounded-lg border border-rose-200">
                            {csvResult.errors.map((err: any, idx: number) => (
                              <li key={idx}>
                                <strong>Row {err.row}</strong> ({err.email || 'N/A'}): {err.error}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Modal Footer */}
                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 text-slate-600 font-semibold"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      disabled={!csvCompanyId || !csvText || bulkImportMutation.isPending}
                      onClick={() => bulkImportMutation.mutate({ companyId: csvCompanyId, csvContent: csvText })}
                      className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {bulkImportMutation.isPending ? 'Processing Import...' : 'Run Bulk Import'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
