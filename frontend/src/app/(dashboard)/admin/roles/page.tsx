"use client";

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface User { _id: string; name: string; email: string; role: string; is_active: boolean; }

const VALID_ROLES = ['ADMIN', 'DPO', 'COUNSELOR', 'PSYCHOLOGIST', 'IC', 'STAFF', 'STUDENT'];
const roleColors: Record<string, string> = {
  ADMIN:'bg-red-100 text-red-800', DPO:'bg-purple-100 text-purple-800',
  COUNSELOR:'bg-blue-100 text-blue-800', PSYCHOLOGIST:'bg-green-100 text-green-800',
  IC:'bg-orange-100 text-orange-800', STAFF:'bg-yellow-100 text-yellow-800',
  STUDENT:'bg-green-100 text-green-800',
};

export default function RolesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api('/api/users/all'), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: `Failed to load users: ${err.message}` });
    } finally { setLoading(false); }
  };

  const updateRole = async (userId: string, newRole: string) => {
    setUpdating(userId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api(`/api/users/${userId}/role`), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, role: newRole } : u));
      setMessage({ type: 'success', text: 'Role updated' });
      setTimeout(() => setMessage(null), 2500);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally { setUpdating(null); }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (!filterRole || u.role === filterRole) &&
      (u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  });

  return (
    <DashboardPageWrapper title="Role Management" subtitle="Assign and manage user roles">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {message && (
          <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>{message.text}</div>
        )}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50" />
          </div>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50">
            <option value="">All Roles</option>
            {VALID_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {VALID_ROLES.map((role) => (
            <button key={role} onClick={() => setFilterRole(filterRole === role ? '' : role)}
              className={`p-3 rounded-lg border text-center transition ${filterRole === role ? 'border-gray-800 bg-gray-100 dark:bg-gray-700' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50'}`}>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{users.filter((u) => u.role === role).length}</p>
              <p className="text-xs text-gray-500">{role}</p>
            </button>
          ))}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? <div className="p-8 text-center text-sm text-gray-500">Loading…</div> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>{['User','Email','Current Role','Change Role'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-50">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-semibold">{user.name?.[0] || '?'}</div>
                        {user.name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role] || 'bg-gray-100 text-gray-700'}`}>{user.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <select value={user.role} onChange={(e) => updateRole(user._id, e.target.value)} disabled={updating === user._id}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 disabled:opacity-50">
                        {VALID_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-gray-400">{filtered.length} of {users.length} users</p>
      </div>
    </DashboardPageWrapper>
  );
}
