'use client';

import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import { Search, Loader2, AlertCircle, Link2 } from 'lucide-react';
import { PERMA_COLOR } from '@/utils/perma';

interface PermaStatus { label: string | null; date: string; }
interface PendingStudent {
  appointment_id: string; case_id: string; student_id: string;
  student_name: string; student_email: string; mhbot_username: string | null;
  requested_start: string; appointment_type: string; perma_status: PermaStatus | null;
}

type PermaLevel = 'Excelling' | 'Thriving' | 'Surviving' | 'Struggling' | 'In Crisis';

// Badge text and background use theme tokens; the dot carries the validated label color.
export const PERMA_STYLES: Record<PermaLevel, { bg: string; color: string; dot: string }> = {
  'Excelling':  { bg: 'var(--color-success-surface)', color: 'var(--color-success-text)',   dot: PERMA_COLOR.Excelling },
  'Thriving':   { bg: 'var(--color-success-surface)', color: 'var(--color-success-text)',   dot: PERMA_COLOR.Thriving },
  'Surviving':  { bg: 'var(--color-bg)',              color: 'var(--color-text-secondary)', dot: PERMA_COLOR.Surviving },
  'Struggling': { bg: 'var(--color-warning-surface)', color: 'var(--color-warning-text)',   dot: PERMA_COLOR.Struggling },
  'In Crisis':  { bg: 'var(--color-danger-surface)',  color: 'var(--color-danger-text)',    dot: PERMA_COLOR['In Crisis'] },
};

export function PermaBadge({ label }: { label: string | null }) {
  const cfg = label ? (PERMA_STYLES[label as PermaLevel] ?? null) : null;
  if (!cfg) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--color-text-muted)' }} />
      No data
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: cfg.bg, color: cfg.color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      {label}
    </span>
  );
}

export default function PendingStudentsWithPerma() {
  const [students, setStudents] = useState<PendingStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUsername, setSearchUsername] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { fetchStudents(); }, []);

  async function fetchStudents() {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api('/api/mhbot/students/pending'), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setStudents(d.students ?? []); }
      else setError('Failed to load pending students');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    if (!searchUsername.trim()) return;
    setSearching(true); setError(''); setLookupResult(null);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api('/api/mhbot/lookup'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: searchUsername }),
      });
      const d = await r.json();
      if (r.ok) setLookupResult(d);
      else setError(d.error || 'Username not found in MHBot');
    } catch { setError('Network error'); }
    finally { setSearching(false); }
  }

  async function linkAccount(caseId: string, username: string) {
    setLinkingId(caseId);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/mhbot/case/${caseId}/link-mhbot`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mhbot_username: username }),
      });
      const d = await r.json();
      if (r.ok) { fetchStudents(); setSearchUsername(''); setLookupResult(null); }
      else setError(d.error || 'Failed to link account');
    } catch { setError('Network error'); }
    finally { setLinkingId(null); }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Lookup MHBot Username</p>
        <form onSubmit={lookup} className="flex gap-2">
          <input
            type="text"
            value={searchUsername}
            onChange={e => setSearchUsername(e.target.value)}
            placeholder="e.g. ema_lVk"
            className="flex-1 px-3 py-2 text-sm rounded-lg outline-none"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
          />
          <button
            type="submit"
            disabled={searching || !searchUsername.trim()}
            className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition"
            style={{ background: 'var(--color-primary)' }}
            onMouseEnter={e => { if (!searching && searchUsername.trim()) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
            onMouseLeave={e => { if (!searching && searchUsername.trim()) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}
          >
            {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Lookup
          </button>
        </form>

        {error && (
          <div className="mt-3 flex items-start gap-2 text-sm" style={{ color: 'var(--color-danger)' }}>
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> {error}
          </div>
        )}

        {lookupResult && (
          <div className="mt-4 p-4 rounded-lg space-y-1.5" style={{ background: 'var(--color-bg)' }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{lookupResult.username}</p>
              <PermaBadge label={lookupResult.latest_label} />
            </div>
            {lookupResult.history?.slice(0, 4).map((h: any, i: number) => (
              <div key={i} className="flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <span>{h.perma_label || '—'}</span>
                <span>{new Date(h.date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Pending Appointments <span className="ml-1 text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>({students.length})</span>
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={20} className="animate-spin mr-2" /> Loading…
          </div>
        ) : students.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No pending appointments</div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {students.map(s => (
              <div key={s.appointment_id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{s.student_name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.student_email}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {s.appointment_type} · {new Date(s.requested_start).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {s.mhbot_username
                    ? <PermaBadge label={s.perma_status?.label ?? null} />
                    : lookupResult
                    ? (
                      <button
                        onClick={() => linkAccount(s.case_id, lookupResult.username)}
                        disabled={linkingId === s.case_id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition"
                        style={{ background: 'var(--color-primary)' }}
                        onMouseEnter={e => { if (linkingId !== s.case_id) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
                        onMouseLeave={e => { if (linkingId !== s.case_id) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}
                      >
                        {linkingId === s.case_id ? <Loader2 size={11} className="animate-spin" /> : <Link2 size={11} />}
                        Link {lookupResult.username}
                      </button>
                    )
                    : <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Not linked</span>
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
