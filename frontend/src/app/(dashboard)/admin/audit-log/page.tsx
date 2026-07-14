"use client";

import { useState, useEffect } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface AuditLog {
  _id: string; action: string; module: string; entity_id?: string;
  user_id?: string; timestamp: string; new_values?: Record<string, unknown>;
}

const IC = 'outline-none transition';
const ICS: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

function actionBadgeStyle(action: string): React.CSSProperties {
  if (action?.includes('delete') || action?.includes('fail'))
    return { background: 'var(--color-danger-surface)', color: 'var(--color-danger)' };
  if (action?.includes('update') || action?.includes('edit'))
    return { background: 'var(--color-warning-surface)', color: 'var(--color-warning-text)' };
  if (action?.includes('create') || action?.includes('login') || action?.includes('verify'))
    return { background: 'var(--color-success-surface)', color: 'var(--color-success)' };
  return { background: 'var(--color-bg)', color: 'var(--color-text-secondary)' };
}

export default function AuditLogPage() {
  const [logs, setLogs]         = useState<AuditLog[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api('/api/auth/audit-logs'), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : data.logs || []);
      setError(null);
    } catch (err: unknown) {
      setError(`Failed to load audit logs: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    const matchesSearch =
      l.action?.toLowerCase().includes(q) || l.module?.toLowerCase().includes(q) ||
      l.entity_id?.toLowerCase().includes(q) || l.user_id?.toLowerCase().includes(q);
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const ts = new Date(l.timestamp).getTime();
      if (dateFrom) matchesDate = matchesDate && ts >= new Date(dateFrom).getTime();
      if (dateTo) {
        const toEnd = new Date(dateTo); toEnd.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && ts <= toEnd.getTime();
      }
    }
    return matchesSearch && matchesDate;
  });

  const formatId = (id?: string) => !id ? '—' : id.length <= 12 ? id : `${id.slice(0, 8)}…${id.slice(-4)}`;

  const TH = ({ children }: { children: React.ReactNode }) => (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
      style={{ color: 'var(--color-text-muted)' }}>{children}</th>
  );

  return (
    <DashboardPageWrapper title="Audit Log" subtitle="System activity trail">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input type="text" placeholder="Search by action, module, or ID…" value={search}
                onChange={e => setSearch(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg ${IC}`} style={ICS} />
            </div>
            <button onClick={fetchLogs}
              className="flex items-center gap-2 px-4 py-2 text-white text-sm rounded-lg transition"
              style={{ background: 'var(--color-text-primary)' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className={`text-xs rounded-lg px-2.5 py-1.5 ${IC}`} style={ICS} />
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className={`text-xs rounded-lg px-2.5 py-1.5 ${IC}`} style={ICS} />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-xs transition hover:underline" style={{ color: 'var(--color-text-muted)' }}>
                Clear
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg text-sm"
            style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
            {error}
          </div>
        )}

        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No audit logs found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                <tr>{['Timestamp', 'Module', 'Action', 'Entity ID', 'User ID', 'Changes'].map(h => <TH key={h}>{h}</TH>)}</tr>
              </thead>
              <tbody>
                {filtered.map(log => (
                  <tr key={log._id} className="transition"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium capitalize text-xs" style={{ color: 'var(--color-text-primary)' }}>{log.module}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={actionBadgeStyle(log.action)}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      <span title={log.entity_id || ''}>{formatId(log.entity_id)}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      <span title={log.user_id || ''}>{formatId(log.user_id)}</span>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {log.new_values ? JSON.stringify(log.new_values).slice(0, 60) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Showing {filtered.length} of {logs.length} entries
        </p>
      </div>
    </DashboardPageWrapper>
  );
}
