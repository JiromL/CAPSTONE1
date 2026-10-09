'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronRight, Clock, Loader2, ShieldCheck, TrendingDown, EyeOff, MoonStar, UserX, CalendarCheck, Repeat, Activity, Users } from 'lucide-react';
import { api } from '@/utils/api';
import { PERMA_COLOR } from '@/utils/perma';

// EMA insights (backend: services/ema_insights.py). Chart rules follow the dataviz guide:
// one axis, thin marks, solid hairline grids, text in text tokens (color sits on a swatch
// beside it), a legend for 2+ series, and every value also readable as text.

interface Pending { student_id: string; name: string; college: string; crisis_at: string; latest_crisis_at: string; crisis_count: number; hours_waiting: number; overdue: boolean; case_id: string | null }
interface Declining { student_id: string; name: string; college: string; from_month: string; from_score: number; from_label: string; to_month: string; to_score: number; to_label: string; drop: number; case_id: string | null }
interface Summary { students: number; before: number; after: number; change: number; before_label: string; after_label: string }
interface Understated { student_id: string; name: string; college: string; triage_label: string; latest_label: string; missed_by_latest: boolean; reason: string }
interface Quiet { student_id: string; name: string; college: string; triage_label: string; last_label: string; last_checkin: string; days_silent: number; case_id: string | null }
interface NotInCare { student_id: string; name: string; college: string; triage_label: string; reason: string; case_id: string | null }
interface NotSeen { student_id: string; name: string; college: string; crisis_at: string; reviewed_at: string; days_since: number; case_id: string | null }
type Withheld = { suppressed: true; students: number };
interface Cell { checkins: number; pct: number | null }
interface RecoveryGroup { suppressed: false; median_days: number; episodes: number; not_recovered: number; students: number }
interface Insights {
  min_group: number;
  scope: 'all' | 'own' | 'totals';
  names_hidden: boolean;
  students_in_scope: number;
  counts: { pending_crises: number; declining: number; understated: number; went_quiet: number; not_in_care: number; not_seen: number };
  crisis_followup: { pending: Pending[]; overdue_count: number; overdue_hours: number; reviews_count: number; median_review_hours: number | null; within_24h_pct: number | null };
  declining: Declining[];
  before_after: { suppressed: true; students: number; min_group: number } | ({ suppressed: false; overall: Summary; improved: number; same: number; worse: number; colleges_hidden: number; windows: { before_days: number; after_days: number }; by_college: (Summary & { college: string })[] });
  perma_profile: { suppressed: true; students: number; min_group: number } | { suppressed: false; students: number; areas: { key: string; area: string; score: number }[] };
  triage_vs_latest: { triage_at_risk: number; latest_at_risk: number; triage_in_crisis: number; latest_in_crisis: number; understated: Understated[]; missed_count: number };
  went_quiet: Quiet[];
  not_in_care: NotInCare[];
  crisis_to_session: { window_days: number; target_days: number; crises: number; seen: number; median_days: number | null; within_target_pct: number | null; not_seen: NotSeen[] };
  repeat_crises: (Withheld & { min_group: number; window_days: number }) | { suppressed: false; window_days: number; crises: number; students: number; repeated: number; pct: number };
  struggle_times: { days: number; min_cell: number; weekdays: string[]; bands: { name: string; hours: string }[]; grid: Cell[][]; overall_pct: number | null; suppressed: boolean };
  recovery: { days: number; min_group: number; with_session: Withheld | RecoveryGroup; without_session: Withheld | RecoveryGroup };
  year_levels: { rows: { year: string; students: number; at_risk: number; pct: number }[]; hidden_students: number; min_group: number };
  engagement: { linked: number; last7_pct: number | null; last30_pct: number | null; weeks: { week_start: string; pct: number; students: number }[] };
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

/** Shown instead of a named list for roles that see totals only (admin, DPO). */
function NamesHidden({ n, what }: { n: number; what: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-xs" style={{ background: 'var(--color-bg)', color: ink.secondary }}>
      <EyeOff size={14} className="flex-shrink-0 mt-0.5" style={{ color: ink.muted }} />
      <p><strong style={{ color: ink.primary }}>{n}</strong> {what}. Names are hidden for your role; the case manager and each student&apos;s own counselor see them.</p>
    </div>
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

function StudentCell({ name, college }: { name: string; college: string }) {
  return (
    <td className={td}>
      <p className="font-medium" style={{ color: ink.primary }}>{name}</p>
      <p style={{ color: ink.muted }}>{college || '—'}</p>
    </td>
  );
}

function fmtDays(d: number) { return d === 1 ? '1 day' : `${d} days`; }

function CaseLink({ caseId }: { caseId: string | null }) {
  return caseId
    ? <Link href={`/cases/${caseId}`} className="inline-flex items-center gap-0.5 hover:underline" style={{ color: 'var(--color-primary-text)' }}>Open <ChevronRight size={11} /></Link>
    : <span style={{ color: ink.muted }}>No case</span>;
}


// ── Patterns ─────────────────────────────────────────────────────────────────
// At-risk share is one measure, so every pattern chart uses one hue (the Struggling
// orange) mixed toward the surface: near-surface = little, full hue = a lot. Text stays in
// text tokens; values are also in tooltips, captions or a table.

const RISK = 'var(--perma-struggling)';
const riskFill = (pct: number, max: number) =>
  `color-mix(in srgb, ${RISK} ${Math.round(12 + 88 * (max ? pct / max : 0))}%, var(--color-surface))`;

/** Shared hover / focus readout. Values lead, the label follows. */
function useTip() {
  const [tip, setTip] = useState<{ x: number; y: number; value: string; label: string } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const show = (e: React.MouseEvent | React.FocusEvent, value: string, label: string) => {
    const r = box.current?.getBoundingClientRect();
    const t = (e.currentTarget as Element).getBoundingClientRect();
    if (r) setTip({ x: t.left - r.left + t.width / 2, y: t.top - r.top, value, label });
  };
  const node = tip && (
    <div role="status" className="absolute z-10 pointer-events-none -translate-x-1/2 -translate-y-full rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"
      style={{ left: tip.x, top: tip.y - 6, background: 'var(--color-text-primary)', color: 'var(--color-surface)', boxShadow: 'var(--shadow-card-md)' }}>
      <span className="font-semibold">{tip.value}</span> <span style={{ opacity: 0.75 }}>{tip.label}</span>
    </div>
  );
  return { box, show, hide: () => setTip(null), node };
}

function StruggleHeatmap({ data }: { data: Insights['struggle_times'] }) {
  const { box, show, hide, node } = useTip();
  const cells = data.grid.flatMap((row, d) => row.map((c, b) => ({ ...c, d, b })));
  const shown = cells.filter(c => c.pct !== null) as (Cell & { d: number; b: number; pct: number })[];
  const max = Math.max(...shown.map(c => c.pct), 1);
  const peak = shown.reduce((a, c) => (c.pct > a.pct ? c : a), shown[0]);
  const cols = `5.5rem repeat(${data.bands.length}, minmax(2.25rem, 1fr))`;
  return (
    <div className="space-y-3">
      <div ref={box} className="relative overflow-x-auto">
        <div className="grid gap-[2px] min-w-[420px]" style={{ gridTemplateColumns: cols }} role="table" aria-label="Share of check-ins that were Struggling or In Crisis, by weekday and time of day">
          <div role="row" className="contents">
            <span role="columnheader" />
            {data.bands.map(b => (
              <span key={b.name} role="columnheader" className="text-[11px] leading-tight text-center pb-1" style={{ color: ink.secondary }}>
                {b.name}<br /><span style={{ color: ink.muted }}>{b.hours}</span>
              </span>
            ))}
          </div>
          {data.weekdays.map((day, d) => (
            <div key={day} role="row" className="contents">
              <span role="rowheader" className="text-xs self-center" style={{ color: ink.secondary }}>{day}</span>
              {data.grid[d].map((c, b) => {
                const label = `${day}, ${data.bands[b].name.toLowerCase()} (${data.bands[b].hours})`;
                const value = c.pct === null ? 'Too few students' : `${c.pct}% at risk`;
                return (
                  <span key={b} role="cell" tabIndex={0} aria-label={`${label}: ${value}, ${c.checkins} student check-ins`}
                    onMouseEnter={e => show(e, value, `${label} · ${c.checkins} student check-ins`)} onMouseLeave={hide}
                    onFocus={e => show(e, value, `${label} · ${c.checkins} student check-ins`)} onBlur={hide}
                    className="h-9 rounded-[4px] outline-none transition-[filter] hover:brightness-95 focus-visible:ring-2"
                    style={{ background: c.pct === null ? 'var(--color-bg)' : riskFill(c.pct, max),
                             backgroundImage: c.pct === null ? 'repeating-linear-gradient(135deg, transparent 0 5px, var(--color-border) 5px 6px)' : undefined }} />
                );
              })}
            </div>
          ))}
        </div>
        {node}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs" style={{ color: ink.secondary }}>
        <span className="inline-flex items-center gap-2">
          <span>0%</span>
          <span className="w-28 h-2.5 rounded-full" style={{ background: `linear-gradient(90deg, ${riskFill(0, max)}, ${riskFill(max, max)})` }} aria-hidden />
          <span>{max}% at risk</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[3px]" style={{ background: 'var(--color-bg)', backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 3px, var(--color-border) 3px 4px)' }} aria-hidden />
          Fewer than {data.min_cell} student check-ins
        </span>
      </div>
      {peak && (
        <p className="text-xs" style={{ color: ink.muted }}>
          Highest: <strong style={{ color: ink.primary }}>{data.weekdays[peak.d]} {data.bands[peak.b].name.toLowerCase()}</strong> ({data.bands[peak.b].hours}), {peak.pct}% at risk.
          Overall {data.overall_pct}%. Philippine time, last {data.days} days.
        </p>
      )}
    </div>
  );
}

/** One horizontal bar per row on a shared 0–max scale, value at the tip. */
function HBars({ rows, max, unit }: { rows: { key: string; label: string; value: number | null; note: string }[]; max: number; unit: (v: number) => string }) {
  const { box, show, hide, node } = useTip();
  return (
    <div ref={box} className="relative space-y-2.5">
      {rows.map(r => (
        <div key={r.key} className="grid items-start gap-3" style={{ gridTemplateColumns: '7.5rem 1fr' }}>
          <span className="text-xs pt-0.5" style={{ color: ink.secondary }}>{r.label}</span>
          {r.value === null ? (
            <span className="text-xs" style={{ color: ink.muted }}>{r.note}</span>
          ) : (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div tabIndex={0} aria-label={`${r.label}: ${unit(r.value)}, ${r.note}`}
                  onMouseEnter={e => show(e, unit(r.value!), `${r.label} · ${r.note}`)} onMouseLeave={hide}
                  onFocus={e => show(e, unit(r.value!), `${r.label} · ${r.note}`)} onBlur={hide}
                  className="h-5 rounded-r-[4px] outline-none focus-visible:ring-2 flex-shrink-0"
                  style={{ width: `${Math.max(2, (r.value / max) * 72)}%`, background: RISK }} />
                <strong className="text-xs tabular-nums whitespace-nowrap" style={{ color: ink.primary }}>{unit(r.value)}</strong>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: ink.muted }}>{r.note}</p>
            </div>
          )}
        </div>
      ))}
      {node}
    </div>
  );
}

function EngagementLine({ weeks }: { weeks: Insights['engagement']['weeks'] }) {
  const [hover, setHover] = useState<number | null>(null);
  // Drawn at roughly its on-screen width so 11px text stays 11px in the full-width card
  const W = 1040, H = 220, left = 40, right = 48, top = 16, bottom = 28;
  const x = (i: number) => left + (weeks.length > 1 ? (i / (weeks.length - 1)) * (W - left - right) : 0);
  const y = (v: number) => top + (1 - v / 100) * (H - top - bottom);
  const path = weeks.map((w, i) => `${i ? 'L' : 'M'}${x(i)},${y(w.pct)}`).join(' ');
  const fmtWeek = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  const last = weeks.length - 1;
  const pick = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * (W - left - right);
    setHover(Math.max(0, Math.min(last, Math.round(px / ((W - left - right) / Math.max(1, last))))));
  };
  const h = hover !== null ? weeks[hover] : null;
  return (
    <div className="relative overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]" role="img"
        aria-label={`Weekly share of linked students who checked in: ${weeks.map(w => `${fmtWeek(w.week_start)} ${w.pct}%`).join(', ')}`}>
        {[0, 50, 100].map(t => (
          <g key={t}>
            <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} stroke="var(--color-border)" strokeWidth={1} />
            <text x={left - 8} y={y(t) + 4} textAnchor="end" fontSize={10.5} fill={ink.muted}>{t}%</text>
          </g>
        ))}
        {weeks.map((w, i) => (i % 3 === 0 || i === last) && (
          <text key={w.week_start} x={x(i)} y={H - 6} textAnchor="middle" fontSize={10.5} fill={ink.muted}>{fmtWeek(w.week_start)}</text>
        ))}
        <path d={`${path} L${x(last)},${y(0)} L${x(0)},${y(0)} Z`} fill="var(--color-primary)" fillOpacity={0.1} />
        <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {h && <line x1={x(hover!)} x2={x(hover!)} y1={top} y2={y(0)} stroke="var(--color-border-strong)" strokeWidth={1} />}
        {(h ? [hover!] : [last]).map(i => (
          <circle key={i} cx={x(i)} cy={y(weeks[i].pct)} r={4.5} fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth={2} />
        ))}
        {!h && <text x={x(last) + 8} y={y(weeks[last].pct) + 4} fontSize={11} fontWeight={600} fill={ink.primary}>{weeks[last].pct}%</text>}
        <rect x={left} y={top} width={W - left - right} height={H - top - bottom} fill="transparent"
          onPointerMove={pick} onPointerLeave={() => setHover(null)} />
      </svg>
      {h && (
        <div role="status" className="absolute top-0 pointer-events-none -translate-x-1/2 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"
          style={{ left: `${(x(hover!) / W) * 100}%`, background: 'var(--color-text-primary)', color: 'var(--color-surface)' }}>
          <span className="font-semibold">{h.pct}%</span> <span style={{ opacity: 0.75 }}>week of {fmtWeek(h.week_start)} · {h.students} linked</span>
        </div>
      )}
    </div>
  );
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
  const cs = data.crisis_to_session;
  const rc = data.repeat_crises, rv = data.recovery, en = data.engagement, yl = data.year_levels;
  const recRows = (['with_session', 'without_session'] as const).map(k => {
    const g = rv[k];
    const label = k === 'with_session' ? 'Had a session' : 'No session';
    return g.suppressed
      ? { key: k, label, value: null, note: `Hidden: fewer than ${rv.min_group} students (${g.students})` }
      : { key: k, label, value: g.median_days, note: `${g.episodes} recoveries, ${g.students} students${g.not_recovered ? ` · ${g.not_recovered} not yet` : ''}` };
  });
  const recMax = Math.max(...recRows.map(r => r.value ?? 0), 1);

  return (
    <div className="space-y-4">
      {data.scope !== 'all' && (
        <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-xs" style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary-text)' }}>
          <ShieldCheck size={14} className="flex-shrink-0 mt-0.5" />
          <p>
            {data.scope === 'own'
              ? <>Showing only <strong>students in your care</strong> ({data.students_in_scope} linked to EMA). Campus-wide lists are for the case manager.</>
              : <>Totals only. Individual students are hidden for your role, as the EMA privacy notice promises students.</>}
          </p>
        </div>
      )}
      <div>
        <h2 className="text-sm font-semibold" style={{ color: ink.primary }}>Care follow-up</h2>
        <p className="text-xs" style={{ color: ink.muted }}>Who needs a response now, and how quickly crises are reviewed.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Crises waiting for review" value={data.counts.pending_crises} icon={<AlertTriangle size={13} />}
          alert={cf.overdue_count > 0}
          note={cf.overdue_count > 0 ? `${cf.overdue_count} waiting over ${cf.overdue_hours} hours` : 'None waiting over a day'} />
        <Stat label="Median time to review" icon={<Clock size={13} />}
          value={cf.median_review_hours === null ? '—' : fmtWait(cf.median_review_hours)}
          note={cf.reviews_count ? `${cf.within_24h_pct}% within a day · ${cf.reviews_count} reviews` : 'No crisis reviews yet'} />
        <Stat label="Students declining" value={data.counts.declining} icon={<TrendingDown size={13} />}
          note="Monthly average down a full level" />
        <Stat label="Crises the latest label hides" icon={<ShieldCheck size={13} />}
          value={Math.max(0, tv.triage_in_crisis - tv.latest_in_crisis)}
          note={`In Crisis: ${tv.latest_in_crisis} by latest label, ${tv.triage_in_crisis} by triage`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Crises waiting for review" subtitle={`Longest waiting first. Over ${cf.overdue_hours} hours is overdue.`}>
          {data.names_hidden ? <NamesHidden n={data.counts.pending_crises} what="students have a crisis waiting for review" /> : cf.pending.length === 0 ? (
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
          {data.names_hidden ? <NamesHidden n={data.counts.understated} what="students' latest label understates their risk" /> : tv.understated.length === 0 ? (
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
        <h2 className="text-sm font-semibold" style={{ color: ink.primary }}>Closing the loop</h2>
        <p className="text-xs" style={{ color: ink.muted }}>Whether at-risk students actually reach care after an alert, not just whether the alert was reviewed.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label={`Seen within ${cs.target_days} days of a crisis`} icon={<CalendarCheck size={13} />}
          value={cs.within_target_pct === null ? '—' : `${cs.within_target_pct}%`}
          note={cs.median_days === null ? `No reviewed crises in the last ${cs.window_days} days`
            : `Median ${cs.median_days} days to a session · ${cs.seen} of ${cs.crises} crises, last ${cs.window_days} days`} />
        <Stat label="At-risk students gone quiet" value={data.counts.went_quiet} icon={<MoonStar size={13} />}
          alert={data.went_quiet.some(q => q.triage_label === 'In Crisis')}
          note="Struggling or In Crisis, no check-in for 7+ days" />
        <Stat label="At risk, not in care" value={data.counts.not_in_care} icon={<UserX size={13} />}
          note="No open case and nothing booked" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="At risk, not in care" subtitle="Struggling or In Crisis, with no open case and no session booked. The outreach list.">
          {data.names_hidden ? <NamesHidden n={data.counts.not_in_care} what="at-risk students have no open case or booking" /> : data.not_in_care.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: ink.muted }}>Every at-risk student has an open case or a booked session.</p>
          ) : (
            <div className="overflow-x-auto -mx-3">
              <table className="w-full text-xs">
                <thead><tr style={{ color: ink.muted, borderBottom: '1px solid var(--color-border)' }}>
                  <th className={th}>Student</th><th className={th}>Triage</th><th className={th}>Why</th><th className={th}>Case</th>
                </tr></thead>
                <tbody>
                  {data.not_in_care.map(r => (
                    <tr key={r.student_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <StudentCell name={r.name} college={r.college} />
                      <td className={td}><LabelChip label={r.triage_label} /></td>
                      <td className={td} style={{ color: ink.secondary }}>{r.reason}</td>
                      <td className={td}><CaseLink caseId={r.case_id} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="At-risk students gone quiet" subtitle="Their last result was concerning and they have not checked in since. Triage can only repeat that last result.">
          {data.names_hidden ? <NamesHidden n={data.counts.went_quiet} what="at-risk students have gone quiet" /> : data.went_quiet.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: ink.muted }}>Every at-risk student checked in during the last week.</p>
          ) : (
            <div className="overflow-x-auto -mx-3">
              <table className="w-full text-xs">
                <thead><tr style={{ color: ink.muted, borderBottom: '1px solid var(--color-border)' }}>
                  <th className={th}>Student</th><th className={th}>Triage</th><th className={th}>Silent for</th><th className={th}>Case</th>
                </tr></thead>
                <tbody>
                  {data.went_quiet.map(q => (
                    <tr key={q.student_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <StudentCell name={q.name} college={q.college} />
                      <td className={td}><LabelChip label={q.triage_label} /></td>
                      <td className={td}>
                        <span className="tabular-nums font-semibold" style={{ color: ink.primary }}>{fmtDays(q.days_silent)}</span>
                        <p style={{ color: ink.muted }}>Last: {q.last_label}, {fmtDate(q.last_checkin)}</p>
                      </td>
                      <td className={td}><CaseLink caseId={q.case_id} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card title="Crises not followed by a session"
        subtitle={`Reviewed crises from the last ${cs.window_days} days where the student has not had a completed session since. Most recent first.`}>
        {data.names_hidden ? <NamesHidden n={data.counts.not_seen} what="reviewed crises were not followed by a session" /> : cs.not_seen.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: ink.muted }}>Every reviewed crisis was followed by a session.</p>
        ) : (
          <div className="overflow-x-auto -mx-3">
            <table className="w-full text-xs">
              <thead><tr style={{ color: ink.muted, borderBottom: '1px solid var(--color-border)' }}>
                <th className={th}>Student</th><th className={th}>Crisis</th><th className={th}>Reviewed</th><th className={th}>No session for</th><th className={th}>Case</th>
              </tr></thead>
              <tbody>
                {cs.not_seen.map(r => (
                  <tr key={r.student_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <StudentCell name={r.name} college={r.college} />
                    <td className={`${td} tabular-nums`} style={{ color: ink.secondary }}>{fmtDate(r.crisis_at)}</td>
                    <td className={`${td} tabular-nums`} style={{ color: ink.secondary }}>{fmtDate(r.reviewed_at)}</td>
                    <td className={`${td} tabular-nums font-semibold`} style={{ color: ink.primary }}>{fmtDays(r.days_since)}</td>
                    <td className={td}><CaseLink caseId={r.case_id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
        {data.names_hidden ? <NamesHidden n={data.counts.declining} what="students' monthly average dropped a full level" /> : data.declining.length === 0 ? (
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

      <div className="pt-2">
        <h2 className="text-sm font-semibold" style={{ color: ink.primary }}>Patterns</h2>
        <p className="text-xs" style={{ color: ink.muted }}>When and for whom things get hard, and whether students keep using EMA. Groups under {data.min_group} students are hidden.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Checked in, last 7 days" icon={<Activity size={13} />}
          value={en.last7_pct === null ? '—' : `${en.last7_pct}%`}
          note={`Of ${en.linked} linked students · ${en.last30_pct ?? '—'}% in the last 30 days`} />
        <Stat label={`Crisis again within ${rc.window_days} days`} icon={<Repeat size={13} />}
          value={rc.suppressed ? '—' : `${rc.pct}%`}
          note={rc.suppressed ? `Hidden: fewer than ${rc.min_group} students so far` : `${rc.repeated} of ${rc.crises} reviewed crises · ${rc.students} students`} />
        <Stat label="At risk now, by year level" icon={<Users size={13} />}
          value={yl.rows.length ? `${yl.rows.reduce((a, r) => (r.pct > a.pct ? r : a), yl.rows[0]).year}` : '—'}
          note={yl.rows.length ? `Highest share: ${yl.rows.reduce((a, r) => (r.pct > a.pct ? r : a), yl.rows[0]).pct}% Struggling or In Crisis` : 'Not enough students yet'} />
      </div>

      <Card title="When students struggle"
        subtitle={`Share of students who had a Struggling or In Crisis result, by weekday and time of day. Each student counts once per day and time slot, however many times they chatted, and it is a share, so busy times don't look worse just for being busy.`}>
        {data.struggle_times.suppressed
          ? <Withheld students={0} min={data.min_group} />
          : <StruggleHeatmap data={data.struggle_times} />}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Recovery time"
          subtitle={`Median days from a Struggling or In Crisis result back to Surviving or better (last ${rv.days} days). Students who had a session often started in a worse place, so this compares groups, not cause and effect.`}>
          <HBars rows={recRows} max={recMax} unit={v => `${v} days`} />
        </Card>

        <Card title="At risk by year level" subtitle="Share of EMA-linked students whose triage label is Struggling or In Crisis.">
          {yl.rows.length === 0 ? <Withheld students={yl.hidden_students} min={yl.min_group} /> : (
            <>
              <HBars rows={yl.rows.map(r => ({ key: r.year, label: r.year, value: r.pct, note: `${r.at_risk} of ${r.students} students` }))}
                max={100} unit={v => `${v}%`} />
              {yl.hidden_students > 0 && (
                <p className="text-[11px] mt-3" style={{ color: ink.muted }}>{yl.hidden_students} students in smaller groups are not shown separately.</p>
              )}
            </>
          )}
        </Card>
      </div>

      <Card title="EMA engagement" subtitle="Share of linked students who checked in at least once each week, last 12 weeks. Triage is only as good as the check-ins behind it.">
        {en.weeks.length < 2
          ? <p className="text-sm py-6 text-center" style={{ color: ink.muted }}>Not enough weeks of data yet.</p>
          : <EngagementLine weeks={en.weeks} />}
      </Card>
    </div>
  );
}
