"use client";

import { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, Users } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface UserEntry {
  _id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string | null;
  department: string;
}

const ROLE_ORDER = ['ADMIN', 'DPO', 'PSYCHOLOGIST', 'COUNSELOR', 'IC', 'STAFF', 'STUDENT'];

const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  DPO: 'bg-purple-100 text-purple-800',
  PSYCHOLOGIST: 'bg-blue-100 text-blue-800',
  COUNSELOR: 'bg-green-100 text-green-800',
  IC: 'bg-yellow-100 text-yellow-800',
  STAFF: 'bg-gray-100 text-gray-700',
  STUDENT: 'bg-sky-100 text-sky-800',
};

export default function UsersReportPage() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(api('/api/users/all'), { headers });
      if (!res.ok) throw new Error(`Failed to load users: ${res.status}`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Compute counts per role
  const roleCounts = ROLE_ORDER.map((role) => {
    const all = users.filter((u) => u.role === role);
    const active = all.filter((u) => u.is_active).length;
    return { role, total: all.length, active, inactive: all.length - active };
  });

  const totalUsers = users.length;
  const totalActive = users.filter((u) => u.is_active).length;

  return (
    <DashboardPageWrapper title="User Activity Report" subtitle="User counts and role distribution">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">User data from the CPS system database</p>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading && !users.length ? (
          <div className="py-20 text-center text-sm text-gray-400">Loading user statistics…</div>
        ) : (
          <>
            {/* Top summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 p-5" style={{ borderLeftWidth: 4, borderLeftColor: '#2563eb' }}>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">{totalUsers}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 p-5" style={{ borderLeftWidth: 4, borderLeftColor: '#16a34a' }}>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Active</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">{totalActive}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 p-5" style={{ borderLeftWidth: 4, borderLeftColor: '#6b7280' }}>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Inactive</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">{totalUsers - totalActive}</p>
              </div>
            </div>

            {/* Role breakdown table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <Users size={16} className="text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Users by Role</h2>
              </div>
              {users.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">No users found.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {['Role', 'Total', 'Active', 'Inactive', '% of Total'].map((h) => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {roleCounts.filter((r) => r.total > 0).map((row) => (
                      <tr key={row.role} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOR[row.role] || 'bg-gray-100 text-gray-700'}`}>{row.role}</span>
                        </td>
                        <td className="px-6 py-3 font-semibold text-gray-900 dark:text-gray-50">{row.total}</td>
                        <td className="px-6 py-3 text-blue-700">{row.active}</td>
                        <td className="px-6 py-3 text-gray-500">{row.inactive}</td>
                        <td className="px-6 py-3 text-gray-600 dark:text-gray-400">
                          {totalUsers > 0 ? `${((row.total / totalUsers) * 100).toFixed(1)}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
