'use client';

import { useEffect, useState } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { Check, X, Clock, CalendarDays, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/utils/api';

interface RescheduleRequest {
  _id: string;
  appointment_id: string;
  student_id: string;
  student_name?: string;
  current_time?: string;
  requested_start: string;
  requested_end: string;
  reason?: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  appointment_type?: string;
}

type Tab = 'pending' | 'approved' | 'denied';

function fmtDate(s?: string) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
}
function fmtTime(s?: string) {
  if (!s) return '';
  try { return new Date(s).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }); }
  catch { return ''; }
}
function fmtAgo(s?: string) {
  if (!s) return '';
  try {
    const diff = Date.now() - new Date(s).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch { return ''; }
}

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'pending',  label: 'Pending',  icon: <Clock size={13} /> },
  { key: 'approved', label: 'Approved', icon: <Check size={13} /> },
  { key: 'denied',   label: 'Denied',   icon: <X    size={13} /> },
];

function StatusBadge({ status }: { status: string }) {
  const style: React.CSSProperties =
    status === 'pending'  ? { background: 'var(--color-warning-surface)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)' }
    : status === 'approved' ? { background: 'var(--color-success-surface)', color: 'var(--color-success)', border: '1px solid var(--color-success)' }
    : { background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' };
  return (
    <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full" style={style}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function RescheduleRequestsPage() {
  const [requests, setRequests]           = useState<RescheduleRequest[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [activeTab, setActiveTab]         = useState<Tab>('pending');
  const [selected, setSelected]           = useState<RescheduleRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api('/api/appointments/reschedule-requests'), { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`Failed to fetch (${r.status})`);
      const d = await r.json();
      setRequests(Array.isArray(d.requests) ? d.requests : []);
      setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  };

  const doAction = async (id: string, action: 'approve' | 'deny') => {
    setActionLoading(true); setActionMsg(null);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/appointments/reschedule-requests/${id}/${action}`), {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`Failed to ${action}`);
      setActionMsg({ type: 'ok', text: action === 'approve' ? 'Request approved.' : 'Request denied.' });
      setTimeout(() => { setSelected(null); setActionMsg(null); load(); }, 900);
    } catch (e) { setActionMsg({ type: 'err', text: e instanceof Error ? e.message : 'Action failed.' }); }
    finally { setActionLoading(false); }
  };

  const counts = Object.fromEntries(TABS.map(t => [t.key, requests.filter(r => r.status === t.key).length])) as Record<Tab, number>;
  const filtered = requests.filter(r => r.status === activeTab);
  const pendingCount = counts.pending;

  return (
    <DashboardPageWrapper
      title="Reschedule Requests"
      subtitle={pendingCount > 0 ? `${pendingCount} pending request${pendingCount !== 1 ? 's' : ''}` : 'No pending requests'}
    >
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm border"
            style={{ background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
            <X size={14} className="flex-shrink-0" /> {error}
          </div>
        )}

        <div className="border rounded-xl shadow-card overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Reschedule Requests</h2>
            <button onClick={load} className="flex items-center gap-1.5 text-xs transition"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex items-end px-2 pt-1.5 gap-0.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              const cnt = counts[tab.key];
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium rounded-t-lg transition-all whitespace-nowrap flex-shrink-0"
                  style={isActive
                    ? { background: 'var(--color-primary-surface)', color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)' }
                    : { color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                  {tab.icon}
                  {tab.label}
                  {cnt > 0 && (
                    <span className="text-[10px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-1"
                      style={isActive
                        ? { background: 'var(--color-primary)', color: 'white' }
                        : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
                      {cnt}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center h-40 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-44 text-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--color-bg)' }}>
                <CalendarDays size={18} style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {activeTab === 'pending' ? 'No pending requests' : `No ${activeTab} requests`}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>All caught up!</p>
            </div>
          ) : (
            <div>
              {filtered.map((req, i) => (
                <button key={req._id} onClick={() => { setSelected(req); setActionMsg(null); }}
                  className="w-full text-left px-5 py-4 transition"
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold mt-0.5"
                      style={{ background: 'var(--color-primary)' }}>
                      {(req.student_name || 'S').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{req.student_name || 'Unknown Student'}</p>
                        {req.appointment_type && (
                          <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                            {req.appointment_type.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <span className="px-2 py-1 rounded-lg" style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                          {fmtDate(req.current_time)} {fmtTime(req.current_time)}
                        </span>
                        <ArrowRight size={12} style={{ color: 'var(--color-border)' }} />
                        <span className="px-2 py-1 rounded-lg font-medium"
                          style={req.status === 'pending'
                            ? { background: 'var(--color-warning-surface)', color: 'var(--color-warning)' }
                            : req.status === 'approved'
                            ? { background: 'var(--color-success-surface)', color: 'var(--color-success)' }
                            : { background: 'var(--color-bg)', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                          {fmtDate(req.requested_start)} {fmtTime(req.requested_start)}
                        </span>
                      </div>
                      {req.reason && (
                        <p className="text-xs mt-1.5 truncate max-w-[360px]" style={{ color: 'var(--color-text-muted)' }}>"{req.reason}"</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <StatusBadge status={req.status} />
                      <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{fmtAgo(req.created_at)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="px-5 py-3" style={{ background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Showing <strong style={{ color: 'var(--color-text-secondary)' }}>{filtered.length}</strong> {activeTab} request{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setSelected(null)} />
          <div className="relative rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in" style={{ background: 'var(--color-surface)' }}>
            {/* Accent strip */}
            <div className="h-1.5 w-full"
              style={{ background: selected.status === 'pending' ? 'var(--color-warning)' : selected.status === 'approved' ? 'var(--color-success)' : 'var(--color-border)' }} />

            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Reschedule Request</p>
                  <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{selected.student_name || 'Unknown Student'}</h3>
                  {selected.appointment_type && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{selected.appointment_type.replace(/_/g, ' ')}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg transition"
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <X size={16} style={{ color: 'var(--color-text-muted)' }} />
                  </button>
                </div>
              </div>

              {/* Time change visual */}
              <div className="rounded-xl p-4 mb-5" style={{ background: 'var(--color-bg)' }}>
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>Schedule Change</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-lg px-3 py-2.5 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>Current</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{fmtDate(selected.current_time)}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{fmtTime(selected.current_time)}</p>
                  </div>
                  <ArrowRight size={16} style={{ color: 'var(--color-border)', flexShrink: 0 }} />
                  <div className="flex-1 rounded-lg px-3 py-2.5 border"
                    style={selected.status === 'approved'
                      ? { background: 'var(--color-success-surface)', borderColor: 'var(--color-success)' }
                      : selected.status === 'denied'
                      ? { background: 'var(--color-bg)', borderColor: 'var(--color-border)' }
                      : { background: 'var(--color-warning-surface)', borderColor: 'var(--color-warning)' }}>
                    <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>Requested</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{fmtDate(selected.requested_start)}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{fmtTime(selected.requested_start)}</p>
                  </div>
                </div>
              </div>

              {selected.reason && (
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Reason</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>"{selected.reason}"</p>
                </div>
              )}

              <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>Submitted {fmtAgo(selected.created_at)} · {fmtDate(selected.created_at)}</p>

              {actionMsg && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm mb-4 border"
                  style={actionMsg.type === 'ok'
                    ? { background: 'var(--color-success-surface)', color: 'var(--color-success)', borderColor: 'var(--color-success)' }
                    : { background: 'var(--color-danger-surface)',  color: 'var(--color-danger)',  borderColor: 'var(--color-danger)' }}>
                  {actionMsg.type === 'ok' ? <Check size={14} /> : <X size={14} />}
                  {actionMsg.text}
                </div>
              )}

              {selected.status === 'pending' ? (
                <div className="flex gap-2">
                  <button onClick={() => doAction(selected._id, 'deny')} disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl transition disabled:opacity-40 border"
                    style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-danger-surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                    Deny
                  </button>
                  <button onClick={() => doAction(selected._id, 'approve')} disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition disabled:opacity-40 hover:opacity-90"
                    style={{ background: 'var(--color-primary)' }}>
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Approve
                  </button>
                </div>
              ) : (
                <button onClick={() => setSelected(null)}
                  className="w-full px-4 py-2.5 text-sm font-medium rounded-xl transition border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardPageWrapper>
  );
}
