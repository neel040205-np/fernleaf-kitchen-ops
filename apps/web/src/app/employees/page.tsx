'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '../../components/layout/AppLayout';
import { fetchApi } from '../../lib/api';
import { Users, Upload, Plus, Check, X, AlertCircle } from 'lucide-react';

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvCompanyId, setCsvCompanyId] = useState('');
  const [csvText, setCsvText] = useState('');
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Company Employees</h1>
            <p className="text-sm text-slate-500 mt-1">Manage corporate employees, staff permission flags, and CSV bulk imports.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setCsvResult(null);
                setIsCsvModalOpen(true);
              }}
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

        {/* CSV Import Modal */}
        {isCsvModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base">Bulk Import Employees from CSV</h3>
                <button onClick={() => setIsCsvModalOpen(false)} className="text-slate-400 font-bold">
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Company</label>
                  <select
                    value={csvCompanyId}
                    onChange={(e) => setCsvCompanyId(e.target.value)}
                    className="w-full p-2.5 rounded border border-slate-300 text-sm"
                  >
                    <option value="">-- Select Company --</option>
                    {companies?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Paste CSV Content</label>
                    <button
                      type="button"
                      onClick={() => setCsvText(sampleCsvTemplate)}
                      className="text-indigo-600 font-semibold hover:underline"
                    >
                      Load Sample CSV
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder="name,email,canChooseAddress,canChangeDeliveryTime,canChangePackaging,allergies,dietaryPreferences"
                    className="w-full p-2.5 font-mono text-xs rounded border border-slate-300"
                  />
                </div>

                {csvResult && (
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <span className="text-emerald-700">Imported: {csvResult.importedCount}</span>
                      <span className="text-rose-700">Row Errors: {csvResult.errorCount}</span>
                    </div>

                    {csvResult.errorCount > 0 && (
                      <div className="space-y-1 text-xs text-rose-700 border-t border-slate-200 pt-2">
                        <p className="font-bold">Row-Level Error Report:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {csvResult.errors.map((err: any, idx: number) => (
                            <li key={idx}>
                              Row {err.row} ({err.email || 'N/A'}): {err.error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsCsvModalOpen(false)} className="px-4 py-2 text-slate-600 font-semibold text-xs">
                  Close
                </button>
                <button
                  type="button"
                  disabled={!csvCompanyId || !csvText || bulkImportMutation.isPending}
                  onClick={() => bulkImportMutation.mutate({ companyId: csvCompanyId, csvContent: csvText })}
                  className="px-4 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {bulkImportMutation.isPending ? 'Processing Import...' : 'Run Bulk Import'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
