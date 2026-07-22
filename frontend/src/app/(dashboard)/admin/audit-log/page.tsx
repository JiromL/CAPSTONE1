"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface AuditLog {
  _id: string; action: string; module: string; entity_id?: string;
  user_id?: string; actor_name?: string; timestamp: string; new_values?: Record<string, unknown>;
}

const IC = 'outline-none transition';
const ICS: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

const PER_PAGE = 50;

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
  const [logs, setLogs]           = useState<AuditLog[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [search]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (dateFrom) params.set('from_date', dateFrom);
      if (dateTo) params.set('to_date', dateTo);
      const res = await fetch(api(`/api/auth/audit-logs?${params}`), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const items: AuditLog[] = Array.isArray(data) ? data : (data.logs || []);
      setLogs(items);
      setTotal(data.total ?? items.length);
      setTotalPages(data.total_pages ?? 1);
      setError(null);
    } catch (err: unknown) {
      setError(`Failed to load audit logs: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

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
              <input type="text" placeholder="Search by action or module…" value={search}
                onChange={e => setSearch(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg ${IC}`} style={ICS} />
            </div>
            <button onClick={() => fetchLogs()}
              className="flex items-center gap-2 px-4 py-2 text-white text-sm rounded-lg transition"
              style={{ background: 'var(--color-text-primary)' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>From</label>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className={`text-xs rounded-lg px-2.5 py-1.5 ${IC}`} style={ICS} />
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>To</label>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className={`text-xs rounded-lg px-2.5 py-1.5 ${IC}`} style={ICS} />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
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
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No audit logs found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                  <tr>{['Timestamp', 'Module', 'Action', 'Actor', 'Entity ID', 'Changes'].map(h => <TH key={h}>{h}</TH>)}</tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log._id} className="transition"
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {new Date(log.timestamp).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
                      </td>
                      <td className="px-4 py-3 font-medium capitalize text-xs" style={{ color: 'var(--color-text-primary)' }}>{log.module}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={actionBadgeStyle(log.action)}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {log.actor_name || formatId(log.user_id)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        <span title={log.entity_id || ''}>{formatId(log.entity_id)}</span>
                      </td>
                      <td className="px-4 py-3 text-xs max-w-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {log.new_values ? JSON.stringify(log.new_values).slice(0, 60) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {total > 0
              ? <>{(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of <strong style={{ color: 'var(--color-text-secondary)' }}>{total}</strong> entries</>
              : 'No entries'}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg transition disabled:opacity-40"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <ChevronLeft size={15} />
              </button>
              <span className="text-xs px-2 tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                {page} / {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}
                className="p-1.5 rounded-lg transition disabled:opacity-40"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>

      </div>
    </DashboardPageWrapper>
  );
}
