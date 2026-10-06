'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronRight, Clock, Loader2, ShieldCheck, TrendingDown, EyeOff } from 'lucide-react';
import { api } from '@/utils/api';
import { PERMA_COLOR } from '@/utils/perma';

// EMA insights (backend: services/ema_insights.py). Chart rules follow the dataviz guide:
// one axis, thin marks, solid hairline grids, text in text tokens (color sits on a swatch
// beside it), a legend for 2+ series, and every value also readable as text.

interface Pending { student_id: string; name: string; college: string; crisis_at: string; latest_crisis_at: string; crisis_count: number; hours_waiting: number; overdue: boolean; case_id: string | null }
interface Declining { student_id: string; name: string; college: string; from_month: string; from_score: number; from_label: string; to_month: string; to_score: number; to_label: string; drop: number; case_id: string | null }
interface Summary { students: number; before: number; after: number; change: number; before_label: string; after_label: string }
interface Understated { student_id: string; name: string; college: string; triage_label: string; latest_label: string; missed_by_latest: boolean; reason: string }
interface Insights {
  min_group: number;
  crisis_followup: { pending: Pending[]; overdue_count: number; overdue_hours: number; reviews_count: number; median_review_hours: number | null; within_24h_pct: number | null };
  declining: Declining[];
  before_after: { suppressed: true; students: number; min_group: number } | ({ suppressed: false; overall: Summary; improved: number; same: number; worse: number; colleges_hidden: number; windows: { before_days: number; after_days: number }; by_college: (Summary & { college: string })[] });
  perma_profile: { suppressed: true; students: number; min_group: number } | { suppressed: false; students: number; areas: { key: string; area: string; score: number }[] };
  triage_vs_latest: { triage_at_risk: number; latest_at_risk: number; triage_in_crisis: number; latest_in_crisis: number; understated: Understated[]; missed_count: number };
}

const ink = { primary: 'var(--color-text-primary)', secondary: 'var(--color-text-secondary)', muted: 'var(--color-text-muted)' };

function fmtWait(hours: number) {
  if (hours < 24) return `${Math.round(hours)} h`;
  const d = Math.floor(hours / 24), h = Math.round(hours % 24);
  return h ? `${d} d ${h} h` : `${d} d`;
}
function fmtMonth(key: string) {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' });
}

export function LabelChip({ label }: { label: string | null | undefined }) {
  if (!label) return <span style={{ color: ink.muted }}>—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap" style={{ color: ink.primary }}>
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PERMA_COLOR[label] }} aria-hidden />
      {label}
    </span>
  );
}

function Card({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: ink.primary }}>{title}</h3>
          {subtitle && <p className="text-xs mt-0.5 max-w-prose" style={{ color: ink.muted }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Withheld({ students, min }: { students: number; min: number }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-xs" style={{ background: 'var(--color-bg)', color: ink.secondary }}>
      <EyeOff size={14} className="flex-shrink-0 mt-0.5" style={{ color: ink.muted }} />
      <p>Shown once at least {min} students have enough data, so no one can be identified. Right now: {students}.</p>
    </div>
  );
}

/** Stat tile: label, value, one line of context. Status tone only when the number means something is wrong. */
function Stat({ label, value, note, icon, alert }: { label: string; value: string | number; note: string; icon: React.ReactNode; alert?: boolean }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1" style={{
      background: alert ? 'var(--color-danger-surface)' : 'var(--color-surface)',
      border: `1px solid ${alert ? 'var(--color-danger)' : 'var(--color-border)'}`,
    }}>
      <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: alert ? 'var(--color-danger-text)' : ink.muted }}>
        {icon}{label}
      </p>
      <p className="text-2xl font-semibold leading-tight" style={{ color: ink.primary }}>{value}</p>
      <p className="text-xs" style={{ color: ink.muted }}>{note}</p>
    </div>
  );
}

// ── Before vs after counseling: dumbbell on one 1–5 axis ─────────────────────

function Dumbbell({ rows }: { rows: { name: string; before: number; after: number; students: number }[] }) {
  const W = 560, rowH = 40, top = 22, left = 132, right = 40;
  const H = top + rows.length * rowH + 8;
  const x = (v: number) => left + ((v - 1) / 4) * (W - left - right);
  const ticks = [1, 2, 3, 4, 5];
  const names: Record<number, string> = { 1: 'In Crisis', 2: 'Struggling', 3: 'Surviving', 4: 'Thriving', 5: 'Excelling' };
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[480px]" role="img"
        aria-label={rows.map(r => `${r.name}: ${r.before.toFixed(2)} before, ${r.after.toFixed(2)} after`).join('; ')}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={top - 6} y2={H - 4} stroke="var(--color-border)" strokeWidth={1} />
            <text x={x(t)} y={top - 10} textAnchor="middle" fontSize={10} fill={ink.muted}>{t} {names[t]}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const cy = top + i * rowH + rowH / 2;
          const up = r.after >= r.before;
          return (
            <g key={r.name}>
              <title>{`${r.name} (${r.students} students): ${r.before.toFixed(2)} → ${r.after.toFixed(2)}`}</title>
              <rect x={0} y={cy - rowH / 2} width={W} height={rowH} fill="transparent" />
              <text x={left - 12} y={cy + 4} textAnchor="end" fontSize={12} fill={ink.primary}>{r.name}</text>
              <line x1={x(r.before)} x2={x(r.after)} y1={cy} y2={cy} stroke="var(--color-border-strong)" strokeWidth={2} strokeLinecap="round" />
              <circle cx={x(r.before)} cy={cy} r={5} fill="var(--color-surface)" stroke="var(--color-text-muted)" strokeWidth={2} />
              <circle cx={x(r.after)} cy={cy} r={6} fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth={2} />
              <text x={x(r.before) + (up ? -10 : 10)} y={cy + 4} textAnchor={up ? 'end' : 'start'} fontSize={11} fill={ink.muted}>
                {r.before.toFixed(2)}
              </text>
              <text x={x(r.after) + (up ? 12 : -12)} y={cy + 4} textAnchor={up ? 'start' : 'end'} fontSize={11} fontWeight={600} fill={ink.primary}>
                {r.after.toFixed(2)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex gap-4 text-xs mt-1" style={{ color: ink.secondary }}>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ border: '2px solid var(--color-text-muted)' }} />Before first session</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--color-primary)' }} />After</span>
      </div>
    </div>
  );
}

/** Part-to-whole: one 100% bar, 2px surface gaps between segments, legend with counts. */
function OutcomeBar({ improved, same, worse }: { improved: number; same: number; worse: number }) {
  const total = improved + same + worse;
  const parts = [
    { key: 'Improved', n: improved, color: PERMA_COLOR.Thriving },
    { key: 'About the same', n: same, color: PERMA_COLOR.Surviving },
    { key: 'Worse', n: worse, color: PERMA_COLOR.Struggling },
  ];
  return (
    <div className="space-y-2">
      <div className="flex h-3 w-full gap-[2px] rounded-full overflow-hidden" role="img"
        aria-label={parts.map(p => `${p.key}: ${p.n} of ${total}`).join(', ')}>
        {parts.filter(p => p.n > 0).map(p => (
          <div key={p.key} title={`${p.key}: ${p.n} of ${total}`} style={{ width: `${(p.n / total) * 100}%`, background: p.color }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: ink.secondary }}>
        {parts.map(p => (
          <span key={p.key} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} aria-hidden />
            {p.key} <strong style={{ color: ink.primary }}>{p.n}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Magnitude on one fixed 1–5 scale: single hue, ≤24px bars, value at the bar tip. */
function ProfileBars({ areas }: { areas: { key: string; area: string; score: number }[] }) {
  const lowest = Math.min(...areas.map(a => a.score));
  return (
    <div className="space-y-2.5">
      {areas.map(a => (
        <div key={a.key} className="grid items-center gap-3" style={{ gridTemplateColumns: '8.5rem 1fr 2.75rem' }}>
          <span className="text-xs" style={{ color: ink.secondary }}>
            {a.area}{a.score === lowest && <span style={{ color: ink.muted }}> · lowest</span>}
          </span>
          <div className="h-2.5 rounded-r" style={{ background: 'var(--color-bg)' }}>
            <div className="h-full rounded-r" title={`${a.area}: ${a.score.toFixed(2)} of 5`}
              style={{ width: `${(a.score / 5) * 100}%`, background: a.score === lowest ? 'var(--color-primary)' : 'var(--color-border-strong)' }} />
          </div>
          <span className="text-xs font-semibold tabular-nums text-right" style={{ color: ink.primary }}>{a.score.toFixed(2)}</span>
        </div>
      ))}
      <p className="text-[11px]" style={{ color: ink.muted }}>Positive score per area, 1–5, averaged per student over the last 90 days.</p>
    </div>
  );
}

const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide';
const td = 'px-3 py-2.5 align-top';

function CaseLink({ caseId }: { caseId: string | null }) {
  return caseId
    ? <Link href={`/cases/${caseId}`} className="inline-flex items-center gap-0.5 hover:underline" style={{ color: 'var(--color-primary-text)' }}>Open <ChevronRight size={11} /></Link>
    : <span style={{ color: ink.muted }}>No case</span>;
}

export function EmaInsights() {
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(api('/api/mhbot/analytics/insights'), { headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` } })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Could not load insights'); return d; })
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  if (error) return null;
  if (!data) {
    return <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} /></div>;
  }

  const cf = data.crisis_followup, tv = data.triage_vs_latest, ba = data.before_after, pp = data.perma_profile;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold" style={{ color: ink.primary }}>Care follow-up</h2>
        <p className="text-xs" style={{ color: ink.muted }}>Who needs a response now, and how quickly crises are reviewed.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Crises waiting for review" value={cf.pending.length} icon={<AlertTriangle size={13} />}
          alert={cf.overdue_count > 0}
          note={cf.overdue_count > 0 ? `${cf.overdue_count} waiting over ${cf.overdue_hours} hours` : 'None waiting over a day'} />
        <Stat label="Median time to review" icon={<Clock size={13} />}
          value={cf.median_review_hours === null ? '—' : fmtWait(cf.median_review_hours)}
          note={cf.reviews_count ? `${cf.within_24h_pct}% within a day · ${cf.reviews_count} reviews` : 'No crisis reviews yet'} />
        <Stat label="Students declining" value={data.declining.length} icon={<TrendingDown size={13} />}
          note="Monthly average down a full level" />
        <Stat label="Crises the latest label hides" icon={<ShieldCheck size={13} />}
          value={Math.max(0, tv.triage_in_crisis - tv.latest_in_crisis)}
          note={`In Crisis: ${tv.latest_in_crisis} by latest label, ${tv.triage_in_crisis} by triage`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Crises waiting for review" subtitle={`Longest waiting first. Over ${cf.overdue_hours} hours is overdue.`}>
          {cf.pending.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: ink.muted }}>Every In Crisis result has been reviewed.</p>
          ) : (
            <div className="overflow-x-auto -mx-3">
              <table className="w-full text-xs">
                <thead><tr style={{ color: ink.muted, borderBottom: '1px solid var(--color-border)' }}>
                  <th className={th}>Student</th><th className={th}>Unreviewed crises</th><th className={th}>Waiting since first</th><th className={th}>Case</th>
                </tr></thead>
                <tbody>
                  {cf.pending.map(p => (
                    <tr key={p.student_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className={td}>
                        <p className="font-medium" style={{ color: ink.primary }}>{p.name}</p>
                        <p style={{ color: ink.muted }}>{p.college || '—'}</p>
                      </td>
                      <td className={td} style={{ color: ink.secondary }}>
                        <span className="font-semibold" style={{ color: ink.primary }}>{p.crisis_count}</span>
                        <span className="tabular-nums"> · {p.crisis_count > 1 ? `${fmtDate(p.crisis_at)} – ${fmtDate(p.latest_crisis_at)}` : fmtDate(p.crisis_at)}</span>
                      </td>
                      <td className={td}>
                        <span className="tabular-nums font-semibold" style={{ color: ink.primary }}>{fmtWait(p.hours_waiting)}</span>
                        {p.overdue && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger-text)' }}>
                            <AlertTriangle size={10} /> Overdue
                          </span>
                        )}
                      </td>
                      <td className={td}><CaseLink caseId={p.case_id} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Risk the latest label understates"
          subtitle="Students whose most recent check-in looks better than their triage result, for example a good chat after a crisis earlier in the week.">
          {tv.understated.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: ink.muted }}>Latest labels match triage for every student.</p>
          ) : (
            <div className="overflow-x-auto -mx-3">
              <table className="w-full text-xs">
                <thead><tr style={{ color: ink.muted, borderBottom: '1px solid var(--color-border)' }}>
                  <th className={th}>Student</th><th className={th}>Latest label</th><th className={th}>Triage</th><th className={th}>Why</th>
                </tr></thead>
                <tbody>
                  {tv.understated.map(u => (
                    <tr key={u.student_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className={td}>
                        <p className="font-medium" style={{ color: ink.primary }}>{u.name}</p>
                        <p style={{ color: ink.muted }}>{u.college || '—'}</p>
                      </td>
                      <td className={td}><LabelChip label={u.latest_label} /></td>
                      <td className={td}><LabelChip label={u.triage_label} /></td>
                      <td className={td} style={{ color: ink.secondary }}>{u.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="pt-2">
        <h2 className="text-sm font-semibold" style={{ color: ink.primary }}>Outcomes</h2>
        <p className="text-xs" style={{ color: ink.muted }}>Group results hide any group with fewer than {data.min_group} students.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Before and after counseling"
          subtitle={ba.suppressed ? undefined : `Average daily EMA score ${ba.windows.before_days} days before each student's first completed session vs the ${ba.windows.after_days} days after.`}>
          {ba.suppressed ? <Withheld students={ba.students} min={ba.min_group} /> : (
            <div className="space-y-5">
              <Dumbbell rows={[
                { name: `All (${ba.overall.students})`, before: ba.overall.before, after: ba.overall.after, students: ba.overall.students },
                ...ba.by_college.map(c => ({ name: `${c.college} (${c.students})`, before: c.before, after: c.after, students: c.students })),
              ]} />
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: ink.secondary }}>
                  Change per student (half a level or more counts)
                </p>
                <OutcomeBar improved={ba.improved} same={ba.same} worse={ba.worse} />
              </div>
              {ba.colleges_hidden > 0 && (
                <p className="text-[11px]" style={{ color: ink.muted }}>
                  {ba.colleges_hidden} college{ba.colleges_hidden > 1 ? 's' : ''} not shown separately (fewer than {data.min_group} students each); they are included in All.
                </p>
              )}
            </div>
          )}
        </Card>

        <Card title="Campus PERMA profile" subtitle="Which wellbeing area is weakest across students, from EMA's numeric scores.">
          {pp.suppressed ? <Withheld students={pp.students} min={pp.min_group} /> : <ProfileBars areas={pp.areas} />}
        </Card>
      </div>

      <Card title="Declining students" subtitle="Monthly average EMA score fell by a full label level or more compared with the month before.">
        {data.declining.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: ink.muted }}>No student&apos;s monthly average dropped a full level.</p>
        ) : (
          <div className="overflow-x-auto -mx-3">
            <table className="w-full text-xs">
              <thead><tr style={{ color: ink.muted, borderBottom: '1px solid var(--color-border)' }}>
                <th className={th}>Student</th><th className={th}>From</th><th className={th}>To</th><th className={th}>Drop</th><th className={th}>Case</th>
              </tr></thead>
              <tbody>
                {data.declining.map(d => (
                  <tr key={d.student_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className={td}>
                      <p className="font-medium" style={{ color: ink.primary }}>{d.name}</p>
                      <p style={{ color: ink.muted }}>{d.college || '—'}</p>
                    </td>
                    <td className={td}><LabelChip label={d.from_label} /><p className="tabular-nums" style={{ color: ink.muted }}>{fmtMonth(d.from_month)} · {d.from_score.toFixed(2)}</p></td>
                    <td className={td}><LabelChip label={d.to_label} /><p className="tabular-nums" style={{ color: ink.muted }}>{fmtMonth(d.to_month)} · {d.to_score.toFixed(2)}</p></td>
                    <td className={`${td} tabular-nums font-semibold`} style={{ color: ink.primary }}>−{d.drop.toFixed(2)}</td>
                    <td className={td}><CaseLink caseId={d.case_id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
