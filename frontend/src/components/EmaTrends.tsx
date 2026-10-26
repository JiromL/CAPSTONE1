'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Minus, Table2, TrendingDown, TrendingUp, BarChart3 } from 'lucide-react';
import { api } from '@/utils/api';
import { PERMA_COLOR, PERMA_ORDER } from '@/utils/perma';

// Campus EMA trends for admins, the DPO and the case manager (backend: GET /mhbot/analytics/history,
// built from the saved daily totals in services/ema_daily_stats.py). Totals only, never students.
// Chart rules follow the dataviz guide, like EmaInsights: one axis per chart, thin marks with a 2px
// surface gap, text in text tokens, a legend for 2+ series, and a table view of every number.

interface Point {
  start: string; end: string; days: number; partial: boolean;
  linked: number; with_data: number; checkin_rate: number;
  crisis_days: number; reviews: number; median_review_hours: number | null; within_target_pct: number | null;
  pending_review: number;
  labels: Record<string, number> | null; at_risk: number | null; in_crisis: number | null; at_risk_pct: number | null;
}
interface History {
  granularity: 'day' | 'week'; days: number; min_group: number; overdue_hours: number; points: Point[];
  totals: { crisis_days: number; reviews: number; median_review_hours: number | null; within_target_pct: number | null; checkin_rate: number };
}

const ink = { primary: 'var(--color-text-primary)', secondary: 'var(--color-text-secondary)', muted: 'var(--color-text-muted)' };
const RANGES = [{ days: 30, label: '30 days' }, { days: 90, label: '90 days' }, { days: 180, label: '6 months' }];
// Stacked from the baseline up, so the at-risk share reads straight off the axis
const STACK = [...PERMA_ORDER].reverse();

const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
const fmtHours = (h: number) => (h < 24 ? `${Math.round(h)} h` : `${(h / 24).toFixed(1)} d`);
function periodName(p: Point, g: History['granularity']) {
  const name = g === 'day' ? fmtDay(p.start) : `Week of ${fmtDay(p.start)}`;
  return p.partial ? `${name} (so far)` : name;
}

/** Tooltip box shared by the charts: values first, the period after. With `beside`, it sits
 *  next to a column (that many % away from x) instead of over it. */
function Tip({ x, beside, children }: { x: number; beside?: number; children: React.ReactNode }) {
  const pos = beside === undefined
    ? { left: `${Math.min(88, Math.max(12, x))}%`, transform: 'translateX(-50%)' }
    : x < 50 ? { left: `${x + beside}%` } : { right: `${100 - x + beside}%` };
  return (
    <div role="status" className="absolute top-0 z-10 pointer-events-none rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"
      style={{ ...pos, background: 'var(--color-text-primary)', color: 'var(--color-surface)', boxShadow: 'var(--shadow-card-md)' }}>
      {children}
    </div>
  );
}

/** Change between two values. Arrow + words carry the meaning; color only repeats it. */
function Change({ from, to, unit, worseWhen, since }: { from: number | null; to: number | null; unit: string; worseWhen: 'up' | 'down'; since: string }) {
  if (from === null || to === null) return <p className="text-xs" style={{ color: ink.muted }}>Not enough data to compare</p>;
  const diff = Math.round((to - from) * 10) / 10;
  if (diff === 0) return <p className="text-xs flex items-center gap-1" style={{ color: ink.muted }}><Minus size={12} aria-hidden /> No change since {since}</p>;
  const worse = (diff > 0) === (worseWhen === 'up');
  const Icon = diff > 0 ? TrendingUp : TrendingDown;
  return (
    <p className="text-xs flex items-center gap-1" style={{ color: worse ? 'var(--color-danger-text)' : 'var(--color-success-text)' }}>
      <Icon size={12} aria-hidden />
      {diff > 0 ? 'Up' : 'Down'} {Math.abs(diff)}{unit} since {since}
      <span className="sr-only">({worse ? 'worse' : 'better'})</span>
    </p>
  );
}

// ── Wellbeing mix: 100% stacked columns of triage labels ─────────────────────

function MixChart({ points, g, minGroup }: { points: Point[]; g: History['granularity']; minGroup: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 1040, H = 240, left = 40, right = 8, top = 10, bottom = 26;
  const band = (W - left - right) / Math.max(1, points.length);
  const bw = Math.min(36, band * 0.62);
  const y = (pct: number) => top + (1 - pct / 100) * (H - top - bottom);
  const every = Math.ceil(points.length / 8);
  const h = hover !== null ? points[hover] : null;

  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs" style={{ color: ink.secondary }} aria-label="Legend">
        {PERMA_ORDER.map(l => (
          <li key={l} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: PERMA_COLOR[l] }} aria-hidden />{l}
          </li>
        ))}
        <li className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: 'var(--color-bg)', backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 2px, var(--color-border-strong) 2px 3px)' }} aria-hidden />
          Hidden (fewer than {minGroup} students)
        </li>
      </ul>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
          aria-label={`Share of students on EMA by triage label, per ${g}. Latest: ${points.at(-1)?.at_risk_pct ?? '—'}% at risk. Hover or focus a column for counts.`}
          onMouseLeave={() => setHover(null)}>
          <defs>
            <pattern id="ema-hidden" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" fill="var(--color-bg)" />
              <line x1="0" y1="0" x2="0" y2="5" stroke="var(--color-border-strong)" strokeWidth={1.2} />
            </pattern>
          </defs>
          {[0, 50, 100].map(t => (
            <g key={t}>
              <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} stroke="var(--color-border)" strokeWidth={1} />
              <text x={left - 8} y={y(t) + 4} textAnchor="end" fontSize={10.5} fill={ink.muted}>{t}%</text>
            </g>
          ))}
          {points.map((p, i) => {
            const cx = left + band * i + band / 2;
            const x = cx - bw / 2;
            let acc = 0;
            return (
              <g key={p.start} opacity={hover === null || hover === i ? 1 : 0.45}>
                {p.labels && p.with_data ? STACK.map((l, si) => {
                  const pct = (100 * (p.labels![l] ?? 0)) / p.with_data;
                  if (!pct) return null;
                  const y0 = y(acc), y1 = y(acc + pct);
                  acc += pct;
                  const isTop = STACK.slice(si + 1).every(k => !(p.labels![k] ?? 0));
                  return <rect key={l} x={x} y={y1} width={bw} height={Math.max(0.5, y0 - y1 - 2)} rx={isTop ? 4 : 0} fill={PERMA_COLOR[l]} />;
                }) : <rect x={x} y={y(100)} width={bw} height={y(0) - y(100)} rx={4} fill="url(#ema-hidden)" />}
                {p.partial && <rect x={x - 2} y={y(100) - 2} width={bw + 4} height={y(0) - y(100) + 2} rx={5} fill="none" stroke="var(--color-border-strong)" strokeDasharray="3 3" />}
                {((i % every === 0 && points.length - 1 - i >= every) || i === points.length - 1) && (
                  <text x={cx} y={H - 8} textAnchor="middle" fontSize={10.5} fill={ink.muted}>{fmtDay(p.start)}</text>
                )}
                <rect x={left + band * i} y={top} width={band} height={H - top - bottom} fill="transparent" tabIndex={0}
                  aria-label={`${periodName(p, g)}: ${p.labels ? STACK.map(l => `${l} ${p.labels![l]}`).join(', ') : 'hidden'}`}
                  onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} className="outline-none" />
              </g>
            );
          })}
        </svg>
        {h && (
          <Tip x={((left + band * hover! + band / 2) / W) * 100} beside={((bw / 2 + 6) / W) * 100}>
            <p className="font-semibold mb-1">{periodName(h, g)}</p>
            {h.labels ? PERMA_ORDER.map(l => (
              <p key={l} className="flex items-center gap-1.5 tabular-nums">
                <span className="w-2 h-2 rounded-full" style={{ background: PERMA_COLOR[l] }} aria-hidden />
                <span style={{ opacity: 0.75 }}>{l}</span>
                <span className="ml-auto pl-3 font-semibold">{h.labels![l]} · {Math.round((100 * h.labels![l]) / h.with_data)}%</span>
              </p>
            )) : <p style={{ opacity: 0.75 }}>Fewer than {minGroup} students with results</p>}
          </Tip>
        )}
      </div>
    </div>
  );
}

// ── Small multiples: one measure each, own axis ──────────────────────────────

function MiniLine({ points, value, g, fmt, max, target, color = 'var(--color-primary)', label }: {
  points: Point[]; value: (p: Point) => number | null; g: History['granularity'];
  fmt: (v: number) => string; max: number; target?: { v: number; label: string }; color?: string; label: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 480, H = 150, left = 34, right = 10, top = 10, bottom = 22;
  const n = points.length;
  const x = (i: number) => left + (n > 1 ? (i / (n - 1)) * (W - left - right) : (W - left - right) / 2);
  const y = (v: number) => top + (1 - v / max) * (H - top - bottom);
  // Break the line where a value is hidden or missing
  const path = points.map((p, i) => {
    const v = value(p);
    if (v === null) return '';
    const prev = i > 0 ? value(points[i - 1]) : null;
    return `${prev === null ? 'M' : 'L'}${x(i)},${y(v)}`;
  }).join(' ');
  const h = hover !== null ? points[hover] : null;
  const hv = h ? value(h) : null;
  const pick = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1)))));
  };
  const lastI = points.map(value).findLastIndex(v => v !== null);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
        {[0, max / 2, max].map(t => (
          <g key={t}>
            <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} stroke="var(--color-border)" strokeWidth={1} />
            <text x={left - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill={ink.muted}>{fmt(t)}</text>
          </g>
        ))}
        {target && target.v <= max && (
          <g>
            <line x1={left} x2={W - right} y1={y(target.v)} y2={y(target.v)} stroke="var(--color-text-muted)" strokeWidth={1} strokeDasharray="4 4" />
            <text x={W - right} y={y(target.v) - 4} textAnchor="end" fontSize={10} fill={ink.muted}>{target.label}</text>
          </g>
        )}
        {[0, n - 1].map(i => n > 0 && (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i ? 'end' : 'start'} fontSize={10} fill={ink.muted}>{fmtDay(points[i].start)}</text>
        ))}
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => { const v = value(p); return v !== null && points.length <= 31 && !(hover === i) && i !== lastI ? <circle key={i} cx={x(i)} cy={y(v)} r={1.8} fill={color} /> : null; })}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={top} y2={y(0)} stroke="var(--color-border-strong)" strokeWidth={1} />}
        {[hover ?? lastI].map(i => {
          const v = i >= 0 ? value(points[i]) : null;
          return v !== null && <circle key="dot" cx={x(i)} cy={y(v)} r={4.5} fill={points[i].partial ? 'var(--color-surface)' : color} stroke={points[i].partial ? color : 'var(--color-surface)'} strokeWidth={2} />;
        })}
        <rect x={left} y={top} width={W - left - right} height={H - top - bottom} fill="transparent"
          onPointerMove={pick} onPointerLeave={() => setHover(null)} />
      </svg>
      {h && (
        <Tip x={(x(hover!) / W) * 100}>
          <span className="font-semibold">{hv === null ? 'Hidden' : fmt(hv)}</span> <span style={{ opacity: 0.75 }}>{periodName(h, g)}</span>
        </Tip>
      )}
    </div>
  );
}

function MiniBars({ points, value, g, unit, label }: { points: Point[]; value: (p: Point) => number; g: History['granularity']; unit: (v: number) => string; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 480, H = 150, left = 34, right = 10, top = 10, bottom = 22;
  const max = Math.max(4, ...points.map(value));
  const n = points.length;
  const band = (W - left - right) / Math.max(1, n);
  const bw = Math.max(2, Math.min(18, band - 2));
  const y = (v: number) => top + (1 - v / max) * (H - top - bottom);
  const h = hover !== null ? points[hover] : null;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label} onMouseLeave={() => setHover(null)}>
        {[0, Math.round(max / 2), max].map(t => (
          <g key={t}>
            <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} stroke="var(--color-border)" strokeWidth={1} />
            <text x={left - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill={ink.muted}>{t}</text>
          </g>
        ))}
        {n > 0 && [0, n - 1].map(i => (
          <text key={i} x={left + band * i + band / 2} y={H - 6} textAnchor={i ? 'end' : 'start'} fontSize={10} fill={ink.muted}>{fmtDay(points[i].start)}</text>
        ))}
        {points.map((p, i) => {
          const v = value(p);
          const cx = left + band * i + band / 2;
          return (
            <g key={p.start}>
              {v > 0 && <path d={`M${cx - bw / 2},${y(0)} V${y(v) + Math.min(3, (y(0) - y(v)) / 2)} q0,-3 3,-3 H${cx + bw / 2 - 3} q3,0 3,3 V${y(0)} Z`}
                fill="var(--perma-crisis)" opacity={hover === null || hover === i ? 1 : 0.45} />}
              <rect x={left + band * i} y={top} width={band} height={H - top - bottom} fill="transparent" onMouseEnter={() => setHover(i)} />
            </g>
          );
        })}
      </svg>
      {h && (
        <Tip x={((left + band * hover! + band / 2) / W) * 100}>
          <span className="font-semibold">{unit(value(h))}</span> <span style={{ opacity: 0.75 }}>{periodName(h, g)}</span>
        </Tip>
      )}
    </div>
  );
}

function Panel({ title, value, note, children }: { title: string; value: string; note: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl p-4 space-y-2" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div>
        <h3 className="text-xs font-medium" style={{ color: ink.muted }}>{title}</h3>
        <p className="text-2xl font-semibold leading-tight" style={{ color: ink.primary }}>{value}</p>
        {note}
      </div>
      {children}
    </section>
  );
}

function TableView({ data }: { data: History }) {
  const th = 'px-2.5 py-2 text-right font-medium whitespace-nowrap';
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--color-border)' }}>
      <table className="w-full text-xs tabular-nums">
        <thead><tr style={{ color: ink.muted, borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
          <th className="px-2.5 py-2 text-left font-medium">{data.granularity === 'day' ? 'Day' : 'Week of'}</th>
          {PERMA_ORDER.map(l => <th key={l} className={th}>{l}</th>)}
          <th className={th}>At risk</th><th className={th}>Checked in / day</th><th className={th}>Crisis days</th>
          <th className={th}>Reviews</th><th className={th}>Median review</th><th className={th}>Waiting review</th>
        </tr></thead>
        <tbody>
          {[...data.points].reverse().map(p => (
            <tr key={p.start} style={{ borderBottom: '1px solid var(--color-border)', color: ink.secondary }}>
              <td className="px-2.5 py-2 text-left whitespace-nowrap" style={{ color: ink.primary }}>{fmtDay(p.start)}{p.partial ? ' (so far)' : ''}</td>
              {PERMA_ORDER.map(l => <td key={l} className="px-2.5 py-2 text-right">{p.labels ? p.labels[l] : '—'}</td>)}
              <td className="px-2.5 py-2 text-right" style={{ color: ink.primary }}>{p.at_risk_pct === null ? '—' : `${p.at_risk_pct}%`}</td>
              <td className="px-2.5 py-2 text-right">{p.checkin_rate}%</td>
              <td className="px-2.5 py-2 text-right">{p.crisis_days}</td>
              <td className="px-2.5 py-2 text-right">{p.reviews}</td>
              <td className="px-2.5 py-2 text-right">{p.median_review_hours === null ? '—' : fmtHours(p.median_review_hours)}</td>
              <td className="px-2.5 py-2 text-right">{p.pending_review}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmaTrends() {
  const [days, setDays] = useState(90);
  const [view, setView] = useState<'charts' | 'table'>('charts');
  const [data, setData] = useState<History | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    fetch(api(`/api/mhbot/analytics/history?days=${days}`), { headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` } })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Could not load EMA trends'); return j; })
      .then(j => { if (live) { setData(j); setError(''); } })
      .catch(e => { if (live) setError(e.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [days, attempt]);
  const reload = useCallback((next: () => void) => { setLoading(true); setError(''); next(); }, []);

  const pts = data?.points ?? [];
  const g = data?.granularity ?? 'week';
  const firstRisk = pts.find(p => p.at_risk_pct !== null);
  const lastRisk = pts.findLast(p => p.at_risk_pct !== null);
  // Activity swings day to day, so compare the average of the first and second half of the
  // finished periods (the running one is incomplete)
  const done = pts.filter(p => !p.partial);
  const half = Math.floor(done.length / 2);
  const avg = (ps: Point[]) => (ps.length ? Math.round(ps.reduce((s, p) => s + p.checkin_rate, 0) / ps.length) : null);
  const [earlyCheckin, lateCheckin] = half ? [avg(done.slice(0, half)), avg(done.slice(-half))] : [null, null];
  const since = firstRisk ? fmtDay(firstRisk.start) : '';
  const maxRisk = Math.max(20, Math.ceil(Math.max(0, ...pts.map(p => p.at_risk_pct ?? 0)) / 10) * 10);
  const maxReview = Math.max(data ? data.overdue_hours * 1.5 : 36, ...pts.map(p => p.median_review_hours ?? 0));

  return (
    <section aria-labelledby="trends-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="trends-title" className="text-sm font-semibold" style={{ color: ink.primary }}>Trends</h2>
          <p className="text-xs mt-0.5 max-w-prose" style={{ color: ink.muted }}>
            How students on EMA are doing over time, from totals CPS saves every day. Each {g === 'day' ? 'day' : 'week'} shows triage as the care team saw it at its end.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div role="radiogroup" aria-label="Time range" className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
            {RANGES.map(r => (
              <button key={r.days} role="radio" aria-checked={days === r.days} onClick={() => days !== r.days && reload(() => setDays(r.days))}
                className="px-3 py-1 text-xs font-medium rounded-md transition"
                style={days === r.days ? { background: 'var(--color-surface)', color: ink.primary, boxShadow: 'var(--shadow-card-sm, 0 1px 2px rgba(0,0,0,.06))' } : { color: ink.secondary }}>
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={() => setView(v => (v === 'charts' ? 'table' : 'charts'))} className="btn-ghost text-xs inline-flex items-center gap-1.5"
            aria-pressed={view === 'table'}>
            {view === 'charts' ? <><Table2 size={13} aria-hidden /> Table</> : <><BarChart3 size={13} aria-hidden /> Charts</>}
          </button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="card p-5 space-y-2">
          <p className="text-sm" style={{ color: ink.secondary }}>{error}</p>
          <button onClick={() => reload(() => setAttempt(a => a + 1))} className="btn-ghost text-sm">Try again</button>
        </div>
      ) : !data ? (
        <div role="status" className="flex justify-center py-12"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} aria-hidden /></div>
      ) : pts.length === 0 ? (
        <p className="card p-6 text-sm text-center" style={{ color: ink.muted }}>No students have linked EMA in this period yet.</p>
      ) : (
        <div className="space-y-4" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }}>
          {view === 'table' ? <TableView data={data} /> : (<>
            <section className="rounded-xl p-5 space-y-1" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: ink.primary }}>Wellbeing mix</h3>
              <p className="text-xs pb-2 max-w-prose" style={{ color: ink.muted }}>
                Share of students on EMA by triage label. At-risk labels sit on the baseline so their share reads off the axis. The dashed column is still in progress.
              </p>
              <MixChart points={pts} g={g} minGroup={data.min_group} />
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Panel title="At risk now (Struggling or In Crisis)" value={lastRisk ? `${lastRisk.at_risk_pct}%` : '—'}
                note={<Change from={firstRisk?.at_risk_pct ?? null} to={lastRisk?.at_risk_pct ?? null} unit=" pts" worseWhen="up" since={since} />}>
                <MiniLine points={pts} g={g} value={p => p.at_risk_pct} max={maxRisk} fmt={v => `${Math.round(v)}%`} color="var(--perma-struggling)"
                  label={`At-risk share per ${g}`} />
              </Panel>
              <Panel title={`Students checking in each day (average per ${g})`} value={`${data.totals.checkin_rate}%`}
                note={<Change from={earlyCheckin} to={lateCheckin} unit=" pts" worseWhen="down" since="the first half of this period" />}>
                <MiniLine points={pts} g={g} value={p => p.checkin_rate} max={100} fmt={v => `${Math.round(v)}%`}
                  label={`Daily check-in rate per ${g}`} />
              </Panel>
              <Panel title="Crisis days (students with an In Crisis result, once per day)" value={String(data.totals.crisis_days)}
                note={<p className="text-xs" style={{ color: ink.muted }}>In the last {RANGES.find(r => r.days === days)?.label}</p>}>
                <MiniBars points={pts} g={g} value={p => p.crisis_days} unit={v => `${v} crisis day${v === 1 ? '' : 's'}`} label={`Crisis days per ${g}`} />
              </Panel>
              <Panel title="Time to review a crisis (median)" value={data.totals.median_review_hours === null ? '—' : fmtHours(data.totals.median_review_hours)}
                note={<p className="text-xs" style={{ color: data.totals.within_target_pct !== null && data.totals.within_target_pct < 90 ? 'var(--color-danger-text)' : ink.muted }}>
                  {data.totals.reviews
                    ? `${data.totals.within_target_pct}% of ${data.totals.reviews} reviews within ${data.overdue_hours} h`
                    : 'No crisis reviews in this period'}
                </p>}>
                <MiniLine points={pts} g={g} value={p => p.median_review_hours} max={Math.ceil(maxReview / 12) * 12} fmt={v => `${Math.round(v)}h`}
                  target={{ v: data.overdue_hours, label: `${data.overdue_hours} h target` }} label={`Median crisis review time per ${g}`} />
              </Panel>
            </div>
          </>)}
        </div>
      )}
    </section>
  );
}
