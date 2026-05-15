"use client";

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api('/api/auth/audit-logs'), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setLogs(Array.isArray(d) ? d : d.logs || []); }
    } finally { setLoading(false); }
  };

  const modules = ['all', ...Array.from(new Set(logs.map((l) => l.module)))];
  const filtered = filter === 'all' ? logs : logs.filter((l) => l.module === filter);

  const color = (action: string) => {
    if (action?.includes('fail') || action?.includes('error') || action?.includes('delete')) return 'text-red-400';
    if (action?.includes('update') || action?.includes('change')) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <DashboardPageWrapper title="System Logs" subtitle="Application event log">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <div className="flex items-center gap-3">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50">
            {modules.map((m) => <option key={m} value={m}>{m === 'all' ? 'All modules' : m}</option>)}
          </select>
          <button onClick={fetchLogs} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} entries</span>
        </div>
        <div className="bg-black rounded-lg p-4 font-mono text-xs overflow-auto max-h-[28rem] space-y-1">
          {loading && <p className="text-gray-500">Loading…</p>}
          {!loading && filtered.length === 0 && <p className="text-gray-500">No entries.</p>}
          {filtered.map((log, i) => (
            <div key={log._id || i} className={color(log.action)}>
              <span className="text-gray-500">[{new Date(log.timestamp).toISOString()}]</span>{' '}
              <span className="text-blue-400">[{log.module?.toUpperCase()}]</span>{' '}
              {log.action}
              {log.entity_id && <span className="text-gray-500"> — {log.entity_id.slice(-8)}</span>}
            </div>
          ))}
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
