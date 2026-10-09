'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronDown, ChevronRight, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { api } from '@/utils/api';
import { PERMA_COLOR } from '@/utils/perma';
import { LabelChip } from './EmaInsights';
import { ClearCrisisButton } from './PermaTriage';

// The EMA page for counselors, psychologists and intake counselors (backend: GET /mhbot/my-students).
// One question: which of my students need me, and why. Campus analytics stay with the case manager.

interface Need { level: 'urgent' | 'high' | 'medium' | 'info'; text: string }
interface Student {
  student_id: string; name: string; college: string; year_level: string;
  label: string | null; latest_label: string | null; last_checkin: string | null; days_silent: number | null;
  stale: boolean; crisis_pending_review: boolean; needs: Need[]; trend: (number | null)[]; case_id: string | null;
}

const ink = { primary: 'var(--color-text-primary)', secondary: 'var(--color-text-secondary)', muted: 'var(--color-text-muted)' };

const LABEL_HELP: [string, string][] = [
  ['Excelling', 'Doing very well.'],
  ['Thriving', 'Doing well.'],
  ['Surviving', 'Getting by; worth a gentle check in sessions.'],
  ['Struggling', 'Having a hard time. Consider reaching out before the next session.'],
  ['In Crisis', 'May not be safe. Follow up the same day, then mark the crisis reviewed with a short note.'],
];

function lastSeen(s: Student) {
  if (s.days_silent === null) return 'No check-in yet';
  if (s.days_silent === 0) return 'Today';
  if (s.days_silent === 1) return 'Yesterday';
  return `${s.days_silent} days ago`;
}

/** Last 14 days, one dot per day with check-ins (that day's average, 1 In Crisis to 5 Excelling). */
function Trend({ points, name }: { points: (number | null)[]; name: string }) {
  const W = 112, H = 28, x = (i: number) => 4 + (i / (points.length - 1)) * (W - 8), y = (v: number) => H - 4 - ((v - 1) / 4) * (H - 8);
  const segs: string[] = [];
  points.forEach((v, i) => { if (v !== null) segs.push(`${segs.length && points[i - 1] !== null ? 'L' : 'M'}${x(i)},${y(v)}`); });
  const shown = points.filter(v => v !== null).length;
  const label = shown ? `${name}, last 14 days: ${shown} days with check-ins, latest daily score ${points.filter(v => v !== null).at(-1)} of 5`
    : `${name}: no check-ins in the last 14 days`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <title>{label}</title>
      <line x1={4} x2={W - 4} y1={y(3)} y2={y(3)} stroke="var(--color-border)" strokeWidth={1} />
      <path d={segs.join(' ')} fill="none" stroke="var(--color-text-muted)" strokeWidth={1.5} strokeLinejoin="round" />
      {points.map((v, i) => v !== null && (
        <circle key={i} cx={x(i)} cy={y(v)} r={2.5} stroke="var(--color-surface)" strokeWidth={1}
          fill={v < 1.5 ? PERMA_COLOR['In Crisis'] : v < 2.5 ? PERMA_COLOR.Struggling : v < 3.5 ? PERMA_COLOR.Surviving : PERMA_COLOR.Thriving} />
      ))}
    </svg>
  );
}

function NeedLine({ need }: { need: Need }) {
  const urgent = need.level === 'urgent';
  return (
    <li className="flex items-start gap-1.5 text-sm" style={{ color: urgent ? 'var(--color-danger-text)' : need.level === 'info' ? ink.muted : ink.secondary }}>
      {urgent ? <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
        : <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: 'var(--color-border-strong)' }} aria-hidden="true" />}
      <span className={urgent ? 'font-semibold' : ''}>{need.text}</span>
    </li>
  );
}

export function MyEmaStudents() {
  const [data, setData] = useState<{ students: Student[]; needs_attention: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch(api('/api/mhbot/my-students'), { headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not load your students');
      setData(d);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load your students'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return <div role="status" className="flex items-center justify-center h-48 gap-2 text-sm" style={{ color: ink.muted }}>
      <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} aria-hidden="true" /> Loading your students…
    </div>;
  }
  if (error || !data) {
    return <div role="alert" className="card p-6">
      <p className="text-sm font-semibold" style={{ color: ink.primary }}>We couldn&apos;t load your students</p>
      <p className="text-sm mt-1" style={{ color: ink.secondary }}>{error || 'Please try again.'}</p>
      <button onClick={load} className="btn-ghost mt-4"><RefreshCw size={14} aria-hidden="true" /> Try again</button>
    </div>;
  }

  const attention = data.students.filter(s => s.needs.some(n => n.level !== 'info'));

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold" style={{ color: ink.primary }}>
            {data.total === 0 ? 'None of your students use EMA yet'
              : data.needs_attention === 0 ? 'None of your students need attention right now'
              : `${data.needs_attention} of your ${data.total} students ${data.needs_attention === 1 ? 'needs' : 'need'} attention`}
          </p>
          <p className="text-sm mt-1" style={{ color: ink.secondary }}>
            From their EMA wellbeing check-ins. Only students in your care are shown.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-ghost">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" /> Refresh
        </button>
      </div>

      {attention.length > 0 && (
        <section aria-labelledby="attention-title" className="space-y-3">
          <h2 id="attention-title" className="type-section-title" style={{ color: ink.primary }}>Needs your attention</h2>
          {attention.map(s => (
            <article key={s.student_id} className="card p-5"
              style={s.crisis_pending_review ? { borderColor: 'var(--color-danger)', boxShadow: 'var(--shadow-card)' } : undefined}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold" style={{ color: ink.primary }}>{s.name}</p>
                  <p className="text-xs" style={{ color: ink.muted }}>{[s.college, s.year_level].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="text-sm"><LabelChip label={s.label} /></div>
              </div>
              <ul className="mt-3 space-y-1">{s.needs.map((n, i) => <NeedLine key={i} need={n} />)}</ul>
              <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-xs" style={{ color: ink.muted }}>Last check-in: {lastSeen(s)}</span>
                <div className="flex-1" />
                {s.crisis_pending_review && <ClearCrisisButton studentId={s.student_id} onCleared={load} />}
                {s.case_id && (
                  <Link href={`/cases/${s.case_id}`} className="btn-ghost">Open case <ChevronRight size={14} aria-hidden="true" /></Link>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      <section aria-labelledby="all-title">
        <h2 id="all-title" className="type-section-title mb-3" style={{ color: ink.primary }}>All your students on EMA</h2>
        {data.students.length === 0 ? (
          <p className="text-sm" style={{ color: ink.muted }}>Students appear here once they link EMA in CPS.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs" style={{ color: ink.muted, borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left font-medium px-4 py-2.5">Student</th>
                <th className="text-left font-medium px-4 py-2.5">This week</th>
                <th className="text-left font-medium px-4 py-2.5">Last 14 days</th>
                <th className="text-left font-medium px-4 py-2.5">Last check-in</th>
                <th className="px-4 py-2.5"><span className="sr-only">Case</span></th>
              </tr></thead>
              <tbody>
                {data.students.map(s => (
                  <tr key={s.student_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-2.5 font-medium" style={{ color: ink.primary }}>{s.name}</td>
                    <td className="px-4 py-2.5"><LabelChip label={s.label} /></td>
                    <td className="px-4 py-1.5"><Trend points={s.trend} name={s.name} /></td>
                    <td className="px-4 py-2.5" style={{ color: s.days_silent !== null && s.days_silent >= 7 ? 'var(--color-warning-text)' : ink.secondary }}>{lastSeen(s)}</td>
                    <td className="px-4 py-2.5 text-right">
                      {s.case_id && <Link href={`/cases/${s.case_id}`} className="text-xs font-medium hover:underline" style={{ color: 'var(--color-primary-text)' }}>Open case</Link>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs mt-2" style={{ color: ink.muted }}>
          &ldquo;This week&rdquo; is the hardest result in the last 7 days, so one bad day is not hidden by a good chat later.
          Students can chat with EMA several times a day; each day counts once.
        </p>
      </section>

      <section className="card">
        <button onClick={() => setHelpOpen(o => !o)} aria-expanded={helpOpen}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium" style={{ color: ink.primary }}>
          <span className="inline-flex items-center gap-2"><ShieldCheck size={15} aria-hidden="true" style={{ color: 'var(--color-primary-text)' }} /> What the labels mean</span>
          <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${helpOpen ? 'rotate-180' : ''}`} />
        </button>
        {helpOpen && (
          <dl className="px-5 pb-5 grid gap-2.5 text-sm">
            {LABEL_HELP.map(([label, text]) => (
              <div key={label} className="grid gap-3 items-baseline" style={{ gridTemplateColumns: '7.5rem 1fr' }}>
                <dt><LabelChip label={label} /></dt>
                <dd style={{ color: ink.secondary }}>{text}</dd>
              </div>
            ))}
            <p className="text-xs mt-2" style={{ color: ink.muted }}>
              An In Crisis result stays flagged until someone reviews it, even if later chats look better. The case manager sees every student and is alerted too.
            </p>
          </dl>
        )}
      </section>
    </div>
  );
}
