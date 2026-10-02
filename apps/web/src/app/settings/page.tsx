'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '../../components/layout/AppLayout';
import { fetchApi } from '../../lib/api';
import { Settings, Calendar, Clock, Plus, Trash2, CheckCircle2 } from 'lucide-react';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
  { id: 7, name: 'Sunday' },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [cutoffTime, setCutoffTime] = useState('16:00');
  const [cutoffWorkingDays, setCutoffWorkingDays] = useState(2);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayDesc, setHolidayDesc] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetchApi('/settings'),
  });

  useEffect(() => {
    if (settings) {
      if (settings.workingDays) setWorkingDays(settings.workingDays);
      if (settings.cutoffTime) setCutoffTime(settings.cutoffTime);
      if (settings.cutoffWorkingDays) setCutoffWorkingDays(settings.cutoffWorkingDays);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: (payload: any) =>
      fetchApi('/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      alert('Kitchen settings updated successfully!');
    },
  });

  const addHolidayMutation = useMutation({
    mutationFn: (payload: { date: string; description?: string }) =>
      fetchApi('/settings/holidays', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setHolidayDate('');
      setHolidayDesc('');
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/settings/holidays/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const toggleDay = (dayId: number) => {
    if (workingDays.includes(dayId)) {
      setWorkingDays(workingDays.filter((d) => d !== dayId));
    } else {
      setWorkingDays([...workingDays, dayId]);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Platform & Kitchen Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure kitchen working days, cut-off parameters, and official kitchen holidays.</p>
        </div>

        {/* Working Days & Cutoff Settings Form */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Kitchen Working Calendar & Cut-Off</h2>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Kitchen Operating Working Days
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const isChecked = workingDays.includes(day.id);
                return (
                  <button
                    type="button"
                    key={day.id}
                    onClick={() => toggleDay(day.id)}
                    className={`px-3.5 py-2 rounded-lg border text-xs font-bold transition ${
                      isChecked
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {day.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Cut-Off Time (HH:mm)
              </label>
              <input
                type="text"
                value={cutoffTime}
                onChange={(e) => setCutoffTime(e.target.value)}
                placeholder="16:00"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Cut-Off Kitchen Working Days Back
              </label>
              <input
                type="number"
                value={cutoffWorkingDays}
                onChange={(e) => setCutoffWorkingDays(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={() =>
                updateSettingsMutation.mutate({
                  workingDays,
                  cutoffTime,
                  cutoffWorkingDays,
                })
              }
              disabled={updateSettingsMutation.isPending}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-md transition disabled:opacity-50"
            >
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Kitchen Holidays Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Kitchen Official Holidays</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Holiday Date</label>
              <input
                type="date"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                className="w-full p-2.5 rounded border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={holidayDesc}
                onChange={(e) => setHolidayDesc(e.target.value)}
                placeholder="Thanksgiving / New Year"
                className="w-full p-2.5 rounded border border-slate-300"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                disabled={!holidayDate || addHolidayMutation.isPending}
                onClick={() => addHolidayMutation.mutate({ date: holidayDate, description: holidayDesc })}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition disabled:opacity-50"
              >
                Add Kitchen Holiday
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Configured Kitchen Holidays:</p>
            <ul className="space-y-1.5 text-xs">
              {settings?.holidays?.map((h: any) => (
                <li key={h.id} className="p-2.5 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
                  <span>
                    <strong>{new Date(h.date).toISOString().split('T')[0]}</strong> {h.description && `- ${h.description}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteHolidayMutation.mutate(h.id)}
                    className="text-rose-600 hover:text-rose-800 font-bold"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
