'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import { api } from '@/utils/api';
import { PERMA_COLOR } from '@/utils/perma';

// Shared pieces for EMA triage: flag chips, the "mark crisis reviewed" form, and the
// per-student trend card. Triage rules live in backend/services/perma_triage.py.

export const LABEL_COLORS: Record<string, string> = PERMA_COLOR;   // validated, theme-aware

const FLAGS: Record<string, { text: string; tone: 'danger' | 'warning' | 'success' }> = {
  crisis_pending_review: { text: 'Crisis not yet reviewed', tone: 'danger' },
  persistent_struggle:   { text: 'Persistent struggle',     tone: 'warning' },
  unstable_mood:         { text: 'Unstable mood',           tone: 'warning' },
  crisis_reviewed:       { text: 'Crisis reviewed',         tone: 'success' },
};

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`, 'Content-Type': 'application/json' });

export function TriageFlags({ flags }: { flags?: string[] }) {
  if (!flags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {flags.map(f => {
        const meta = FLAGS[f];
        if (!meta) return null;
        return (
          <span key={f} className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: `var(--color-${meta.tone}-surface)`, color: `var(--color-${meta.tone}-text)` }}>
            {meta.text}
          </span>
        );
      })}
    </div>
  );
}

export function TriageReasons({ reasons }: { reasons?: string[] }) {
  if (!reasons?.length) return null;
  return (
    <ul className="text-xs space-y-0.5" style={{ color: 'var(--color-text-muted)' }}>
      {reasons.map(r => <li key={r}>· {r}</li>)}
    </ul>
  );
}

/** Inline form: the reviewer writes how the crisis was followed up, then the flag clears. */
export function ClearCrisisButton({ studentId, onCleared }: { studentId: string; onCleared: () => void }) {
  const [open, setOpen]     = useState(false);
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const submit = async () => {
    setSaving(true); setError('');
    try {
      const r = await fetch(api(`/api/mhbot/students/${studentId}/clear-crisis`), {
        method: 'POST', headers: auth(), body: JSON.stringify({ note }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Could not mark the crisis as reviewed');
      setOpen(false); setNote(''); onCleared();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not mark the crisis as reviewed'); }
    finally { setSaving(false); }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
        <ShieldCheck size={13} /> Mark crisis reviewed
      </button>
    );
  }
  return (
    <div className="w-full space-y-2 rounded-xl border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      <label htmlFor={`crisis-note-${studentId}`} className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
        How was this crisis followed up?
      </label>
      <textarea id={`crisis-note-${studentId}`} value={note} onChange={e => setNote(e.target.value)} rows={3}
        placeholder="e.g. Called the student, safe at home, follow-up session booked for Thursday."
        className="w-full text-sm px-3 py-2 rounded-lg outline-none resize-y"
        style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
      <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
        The student moves to Struggling with a &quot;Crisis reviewed&quot; flag for the rest of the week. A new In Crisis result flags them again.
      </p>
      {error && (
        <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-danger-text)' }}>
          <AlertCircle size={12} /> {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button onClick={() => { setOpen(false); setError(''); }} className="text-xs px-3 py-1.5 rounded-lg"
          style={{ color: 'var(--color-text-secondary)' }}>Cancel</button>
        <button onClick={submit} disabled={saving || note.trim().length < 10}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
          style={{ background: 'var(--color-primary)' }}>
          {saving && <Loader2 size={12} className="animate-spin" />} Mark reviewed
        </button>
      </div>
    </div>
  );
}

interface TrendData {
  triage: { label: string | null; flags: string[]; reasons: string[]; latest_label?: string; stale?: boolean; crisis_pending_review?: boolean } | null;
  daily: { date: string; score: number; label: string; checkins: number }[];
  monthly: { month: string; score: number; label: string; days: number }[];
  weakest_area: { area: string; score: number; checkins: number } | null;
  crisis_reviews: { cleared_at: string; note: string; cleared_by: string }[];
}

/** Case page card: triage result, 90-day daily trend, monthly averages, weakest PERMA area. */
export function PermaTrendCard({ studentId }: { studentId: string }) {
  const [data, setData]   = useState<TrendData | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    fetch(api(`/api/mhbot/students/${studentId}/perma-trend?days=90`), { headers: auth() })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Could not load EMA trend'); return d; })
      .then(setData)
      .catch(e => setError(e.message));
  };
  useEffect(load, [studentId]);

  if (error) return null;   // no access or no EMA link: the rest of the case page is unaffected
  if (!data) return null;
  const t = data.triage;
  if (!t?.label && !data.daily.length) return null;

  const months = data.monthly.slice(-3);
  // Fixed 1–5 scale so the bars read the same on every case
  const W = 100, H = 36;
  const pts = data.daily;
  const x = (i: number) => (pts.length < 2 ? W / 2 : (i / (pts.length - 1)) * W);
  const y = (score: number) => H - ((score - 1) / 4) * H;

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
            <TrendingUp size={15} style={{ color: 'var(--color-primary)' }} /> EMA wellbeing triage
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Worst result in the last week; an unreviewed crisis stays until someone marks it reviewed.
          </p>
        </div>
        {t?.label && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: `color-mix(in srgb, ${LABEL_COLORS[t.label]} 14%, transparent)`, color: 'var(--color-text-primary)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: LABEL_COLORS[t.label] }} />
            {t.label}{t.stale ? ' (no recent check-in)' : ''}
          </span>
        )}
      </div>

      {t && <TriageFlags flags={t.flags} />}
      {t && <TriageReasons reasons={t.reasons} />}
      {t?.crisis_pending_review && <ClearCrisisButton studentId={studentId} onCleared={load} />}

      {pts.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Daily score, last 90 days</p>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>1 In Crisis · 5 Excelling</p>
          </div>
          <svg viewBox={`-2 -3 ${W + 4} ${H + 6}`} className="w-full h-20" preserveAspectRatio="none" role="img"
            aria-label={`Daily EMA scores, latest ${pts[pts.length - 1].score} (${pts[pts.length - 1].label})`}>
            {[1, 2, 3, 4, 5].map(v => (
              <line key={v} x1={0} x2={W} y1={y(v)} y2={y(v)} stroke="var(--color-border)" strokeWidth={0.3} vectorEffect="non-scaling-stroke" />
            ))}
            <polyline fill="none" stroke="var(--color-primary)" strokeWidth={1.5} vectorEffect="non-scaling-stroke"
              points={pts.map((p, i) => `${x(i)},${y(p.score)}`).join(' ')} />
            {pts.map((p, i) => (
              <circle key={p.date} cx={x(i)} cy={y(p.score)} r={1.4} fill={LABEL_COLORS[p.label]}>
                <title>{`${p.date}: ${p.score} (${p.label}), ${p.checkins} check-in${p.checkins > 1 ? 's' : ''}`}</title>
              </circle>
            ))}
          </svg>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {months.map(m => (
          <div key={m.month} className="rounded-lg px-3 py-2" style={{ background: 'var(--color-bg)' }}>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {new Date(`${m.month}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })} average
            </p>
            <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
              {m.score.toFixed(2)} <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>{m.label}</span>
            </p>
          </div>
        ))}
        {data.weakest_area && (
          <div className="rounded-lg px-3 py-2" style={{ background: 'var(--color-bg)' }}>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Lowest area, 30 days</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {data.weakest_area.area} <span className="text-xs font-normal tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{data.weakest_area.score.toFixed(1)}</span>
            </p>
          </div>
        )}
      </div>

      {data.crisis_reviews.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Crisis reviews</p>
          {data.crisis_reviews.slice(0, 3).map(r => (
            <div key={r.cleared_at} className="text-xs rounded-lg px-3 py-2" style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
              <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{r.cleared_by}</span>
              <span style={{ color: 'var(--color-text-muted)' }}> · {new Date(r.cleared_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
              <p className="mt-0.5">{r.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
