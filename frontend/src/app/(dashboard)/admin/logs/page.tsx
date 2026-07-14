"use client";

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface LogEntry { _id?: string; action: string; module: string; timestamp: string; entity_id?: string; }

function logColor(action: string): string {
  if (action?.includes('fail') || action?.includes('error') || action?.includes('delete')) return '#f87171';
  if (action?.includes('update') || action?.includes('change')) return '#fbbf24';
  return '#4ade80';
}

export default function LogsPage() {
  const [logs, setLogs]       = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api('/api/auth/audit-logs'), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setLogs(Array.isArray(d) ? d : d.logs || []); }
    } finally { setLoading(false); }
  };

  const modules  = ['all', ...Array.from(new Set(logs.map(l => l.module)))];
  const filtered = filter === 'all' ? logs : logs.filter(l => l.module === filter);

  return (
    <DashboardPageWrapper title="System Logs" subtitle="Application event log">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">

        <div className="flex items-center gap-3">
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg outline-none"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
            {modules.map(m => <option key={m} value={m}>{m === 'all' ? 'All modules' : m}</option>)}
          </select>
          <button onClick={fetchLogs} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition disabled:opacity-50"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <span className="text-xs ml-auto" style={{ color: 'var(--color-text-muted)' }}>{filtered.length} entries</span>
        </div>

        {/* Terminal-style log viewer — intentionally dark background for readability */}
        <div className="rounded-lg p-4 font-mono text-xs overflow-auto max-h-[28rem] space-y-1"
          style={{ background: '#0a0a0a' }}>
          {loading && <p style={{ color: '#6b7280' }}>Loading…</p>}
          {!loading && filtered.length === 0 && <p style={{ color: '#6b7280' }}>No entries.</p>}
          {filtered.map((log, i) => (
            <div key={log._id || i} style={{ color: logColor(log.action) }}>
              <span style={{ color: '#6b7280' }}>[{new Date(log.timestamp).toISOString()}]</span>{' '}
              <span style={{ color: '#60a5fa' }}>[{log.module?.toUpperCase()}]</span>{' '}
              {log.action}
              {log.entity_id && <span style={{ color: '#6b7280' }}> — {log.entity_id.slice(-8)}</span>}
            </div>
          ))}
        </div>

      </div>
    </DashboardPageWrapper>
  );
}
