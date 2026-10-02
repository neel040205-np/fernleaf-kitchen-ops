'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { fetchApi } from '../../lib/api';
import { ChefHat, ShieldCheck, Truck, UserCheck, AlertCircle } from 'lucide-react';

const TEST_ACCOUNTS = [
  { role: 'Admin', email: 'admin@test.com', password: 'Test@1234', icon: ShieldCheck, color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  { role: 'Kitchen', email: 'kitchen@test.com', password: 'Test@1234', icon: ChefHat, color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { role: 'Dispatch', email: 'dispatch@test.com', password: 'Test@1234', icon: Truck, color: 'bg-sky-50 border-sky-200 text-sky-700' },
  { role: 'Driver', email: 'driver@test.com', password: 'Test@1234', icon: UserCheck, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await fetchApi<{ accessToken: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      login(data.accessToken, data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (acc: typeof TEST_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError(null);
    setLoading(true);

    try {
      const data = await fetchApi<{ accessToken: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: acc.email, password: acc.password }),
      });

      login(data.accessToken, data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-black text-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-600/30">
            F
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Fernleaf Kitchen</h1>
          <p className="text-sm text-slate-500">Operations & Admin Portal</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@test.com"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="border-t border-slate-200 pt-5 space-y-3">
          <p className="text-xs font-semibold text-slate-500 text-center uppercase tracking-wider">
            One-Click Test Account Sign In
          </p>
          <div className="grid grid-cols-2 gap-2">
            {TEST_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickLogin(acc)}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2 hover:opacity-90 transition ${acc.color}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <div>
                    <p className="text-xs font-bold leading-none">{acc.role}</p>
                    <p className="text-[10px] opacity-75 truncate">{acc.email}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
