'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { Users, Clock, CheckCircle, Trash2, TrendingUp, Loader2, RefreshCw } from 'lucide-react';

interface WaitlistEntry {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  reason: string;
  concern: string;
  preferred_method: string;
  position: number;
  status: string;
  notes: string;
  joined_at: string;
  promoted_at: string | null;
}

interface Stats { waiting: number; promoted: number; removed: number; total: number; }

const METHOD_LABELS: Record<string, string> = {
  in_person: 'In-Person', zoom: 'Zoom', google_meet: 'Google Meet', phone: 'Phone',
};

const IC = 'input resize-none';
const IC_S: React.CSSProperties = { border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' };
const onFIn  = (e: React.FocusEvent<HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-surface)'; };
const onFOut = (e: React.FocusEvent<HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; };

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'waiting' | 'promoted' | 'removed'>('waiting');
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [promoteNotes, setPromoteNotes] = useState('');
  const [showPromoteModal, setShowPromoteModal] = useState<WaitlistEntry | null>(null);
  const [toast, setToast] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function load() {
    setLoading(true);
    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };
    const [listRes, statsRes] = await Promise.all([
      fetch(api(`/api/waitlist/?status=${tab}`), { headers: h }),
      fetch(api('/api/waitlist/stats'), { headers: h }),
    ]);
    if (listRes.ok) setEntries((await listRes.json()).waitlist ?? []);
    if (statsRes.ok) setStats(await statsRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [tab]);

  async function promote(entry: WaitlistEntry) {
    setActionId(entry.id);
    const token = localStorage.getItem('token');
    const res = await fetch(api(`/api/waitlist/${entry.id}/promote`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: promoteNotes }),
    });
    const data = await res.json();
    setActionId(null); setShowPromoteModal(null); setPromoteNotes('');
    showToast(res.ok ? `${entry.student_name} has been notified — slot available!` : data.error || 'Failed to promote');
    if (res.ok) load();
  }

  async function remove(id: string) {
    setConfirmRemoveId(null); setActionId(id);
    const token = localStorage.getItem('token');
    const res = await fetch(api(`/api/waitlist/${id}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setActionId(null);
    showToast(res.ok ? 'Removed from waitlist' : 'Failed to remove');
    if (res.ok) load();
  }

  const STAT_CARDS = [
    { label: 'Waiting',  value: stats?.waiting,  icon: Clock,        color: 'var(--color-warning)' },
    { label: 'Promoted', value: stats?.promoted, icon: CheckCircle,  color: 'var(--color-success)' },
    { label: 'Removed',  value: stats?.removed,  icon: Trash2,       color: 'var(--color-text-muted)' },
    { label: 'Total',    value: stats?.total,    icon: Users,        color: 'var(--color-primary)' },
  ];

  return (
    <DashboardPageWrapper title="Waitlist" subtitle="Students waiting for an available counseling slot">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 text-sm px-4 py-2.5 rounded-lg shadow-lg animate-scale-in"
          style={{ background: 'var(--color-text-primary)', color: 'var(--color-surface)' }}>
          {toast}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {STAT_CARDS.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="border rounded-xl shadow-card px-4 py-3 flex items-center gap-3"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <Icon size={16} style={{ color }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
                <p className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs + Refresh */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--color-bg)' }}>
          {(['waiting', 'promoted', 'removed'] as const).map(t => {
            const active = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)}
                className="px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize"
                style={active
                  ? { background: 'var(--color-surface)', color: 'var(--color-text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                  : { color: 'var(--color-text-muted)' }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                {t}
              </button>
            );
          })}
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-sm transition"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
          <Users size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No {tab} entries</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div key={entry.id} className="border rounded-xl shadow-card p-4 flex items-start justify-between gap-4"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-start gap-4 min-w-0">
                {tab === 'waiting' && (
                  <div className="w-9 h-9 rounded-full font-bold text-sm flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)' }}>
                    #{entry.position}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{entry.student_name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{entry.student_email}</p>
                  {entry.concern && (
                    <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      <span className="font-medium">Concern:</span> {entry.concern}
                    </p>
                  )}
                  {entry.reason && (
                    <p className="text-xs mt-0.5 italic" style={{ color: 'var(--color-text-muted)' }}>"{entry.reason}"</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <span>{METHOD_LABELS[entry.preferred_method] ?? entry.preferred_method}</span>
                    <span>·</span>
                    <span>Joined {new Date(entry.joined_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}</span>
                    {entry.promoted_at && (
                      <>
                        <span>·</span>
                        <span style={{ color: 'var(--color-success)' }}>Promoted {new Date(entry.promoted_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {tab === 'waiting' && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setShowPromoteModal(entry)} disabled={actionId === entry.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition disabled:opacity-50 hover:opacity-90"
                    style={{ background: 'var(--color-primary)' }}>
                    <TrendingUp size={12} /> Promote
                  </button>
                  {confirmRemoveId === entry.id ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => remove(entry.id)}
                        className="text-xs px-2.5 py-1 rounded-lg font-semibold text-white"
                        style={{ background: 'var(--color-danger)' }}>Remove</button>
                      <button onClick={() => setConfirmRemoveId(null)}
                        className="text-xs px-2.5 py-1 border rounded-lg transition"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmRemoveId(entry.id)} disabled={actionId === entry.id}
                      className="text-xs px-2.5 py-1 border rounded-lg transition disabled:opacity-50"
                      style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-danger-surface)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Promote Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl shadow-2xl w-full max-w-md p-6 animate-scale-in" style={{ background: 'var(--color-surface)' }}>
            <h3 className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Promote Student</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Notify <strong>{showPromoteModal.student_name}</strong> that a slot is available. They will receive an in-app notification to book their appointment.
            </p>
            <textarea value={promoteNotes} onChange={e => setPromoteNotes(e.target.value)}
              placeholder="Optional notes for the student…" rows={3}
              className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => { setShowPromoteModal(null); setPromoteNotes(''); }}
                className="px-4 py-2 text-sm border rounded-lg transition"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                Cancel
              </button>
              <button onClick={() => promote(showPromoteModal)} disabled={actionId === showPromoteModal.id}
                className="px-4 py-2 text-sm text-white font-medium rounded-lg disabled:opacity-50 flex items-center gap-2 transition hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                {actionId === showPromoteModal.id && <Loader2 size={13} className="animate-spin" />}
                Notify Student
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardPageWrapper>
  );
}
