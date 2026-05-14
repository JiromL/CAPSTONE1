"use client";

import { useState, useEffect } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import PageShell from '@/components/PageShell';
import { api } from '@/utils/api';

interface AuditLog {
  _id: string;
  action: string;
  module: string;
  entity_id?: string;
  user_id?: string;
  timestamp: string;
  new_values?: Record<string, any>;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api('/api/auth/audit-logs'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : data.logs || []);
      setError(null);
    } catch (err: any) {
      setError(`Failed to load audit logs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.action?.toLowerCase().includes(q) ||
      l.module?.toLowerCase().includes(q) ||
      l.entity_id?.toLowerCase().includes(q) ||
      l.user_id?.toLowerCase().includes(q)
    );
  });

  const actionColor = (action: string) => {
    if (action?.includes('delete') || action?.includes('fail')) return 'bg-red-100 text-red-800';
    if (action?.includes('update') || action?.includes('edit')) return 'bg-yellow-100 text-yellow-800';
    if (action?.includes('create') || action?.includes('login') || action?.includes('verify')) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <PageShell title="Audit Log" subtitle="System activity trail">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by action, module, or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
            />
          </div>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 text-white text-sm rounded-lg transition"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No audit logs found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  {['Timestamp', 'Module', 'Action', 'Entity ID', 'User ID', 'Changes'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-50 capitalize text-xs">{log.module}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{log.entity_id?.slice(-8) || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{log.user_id?.slice(-8) || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                      {log.new_values ? JSON.stringify(log.new_values).slice(0, 60) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-gray-400">Showing {filtered.length} of {logs.length} entries</p>
      </div>
    </PageShell>
  );
}
