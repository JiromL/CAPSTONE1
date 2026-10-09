'use client';

import { TriageFlags, TriageReasons } from '@/components/PermaTriage';
import { EmaConsentCheckbox } from '@/components/EmaPrivacyNotice';
import { EmaInsights, LabelChip } from '@/components/EmaInsights';
import { PERMA_COLOR } from '@/utils/perma';
import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceArea,
} from 'recharts';
import {
  Activity, Wifi, WifiOff, RefreshCw, Loader2, Users,
  LogIn, LogOut, TrendingUp, AlertTriangle,
  ExternalLink, MessageSquare, Download, ChevronRight,
  CheckCircle2, Clock, XCircle, Building2, Brain,
} from 'lucide-react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { useTheme } from '@/context/ThemeContext';
import PendingStudentsWithPerma, { PermaBadge, PERMA_STYLES } from '@/components/PendingStudentsWithPerma';
import { api } from '@/utils/api';
import { todayPH } from '@/utils/dateUtils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthStatus { connected: boolean; mhbot_username?: string; expired?: boolean; chat_ready?: boolean; needs_relink?: boolean; }
interface AnalyticsSummary {
  total_tracked: number; active_last_30d: number; inactive_14d: number;
  at_risk_count: number; completion_rate: number;
  by_label: Record<string, number>;
}
interface TrendData {
  months: string[];
  buckets?: string[];
  scores?: Record<string, { avg: number; label: string; student_days: number } | null>;
  granularity?: TrendGranularity;
  data: Record<string, Record<string, number>>;
}
type TrendGranularity = 'day' | 'week' | 'month';
interface CollegeEntry {
  college: string; total: number; at_risk: number;
  Excelling: number; Thriving: number; Surviving: number;
  Struggling: number; 'In Crisis': number; 'No Data': number;
}
interface AttentionStudent {
  student_id: string; name: string; email: string; school_id: string;
  college: string; year_level: string; label: string | null;
  last_checkin: string | null; reason: 'at_risk' | 'inactive' | 'no_checkin';
  case_id: string | null; case_status: string | null;
}
interface PermaEntry { perma_label: string | null; date: string; }

// ── Constants ──────────────────────────────────────────────────────────────────

const LABEL_ORDER = ['Excelling', 'Thriving', 'Surviving', 'Struggling', 'In Crisis'] as const;
const PERMA_COLORS = PERMA_COLOR;   // validated, theme-aware (app/globals.css)
const EMA_URL = 'https://pchrd-ema.dlsu.edu.ph/app/login/';
const STUDENT_ROLES = ['STUDENT'];
const ADMIN_ROLES   = ['ADMIN', 'DPO', 'MANAGEMENT'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' });
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function fmtMonthKey(key: string) {
  const [y, m] = key.split('-');
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });
}

function fmtBucketKey(key: string, granularity: TrendGranularity) {
  if (granularity === 'day') {
    const d = new Date(key + 'T00:00:00');
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  }
  if (granularity === 'week') {
    const [, w] = key.split('-W');
    return `Wk ${parseInt(w)}`;
  }
  return fmtMonthKey(key);
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, isDark }: {
  active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string; isDark: boolean;
}) {
  if (!active || !payload?.length) return null;
  void isDark;
  const bg  = 'var(--color-surface)';
  const bdr = 'var(--color-border)';
  const txt = 'var(--color-text-primary)';
  const sub = 'var(--color-text-secondary)';
  return (
    <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 8, padding: '10px 14px', minWidth: 130 }}>
      {label && <p style={{ color: sub, fontSize: 11, marginBottom: 6, fontWeight: 500 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: txt, fontSize: 12, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 9999, background: p.color, flexShrink: 0 }} />
          <span style={{ color: sub }}>{p.name}</span>
          <span style={{ marginLeft: 'auto', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{p.value.toLocaleString('en-PH')}</span>
        </p>
      ))}
    </div>
  );
}

function KpiCard({ label, value, sub, icon, alert }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color?: string; accent?: boolean; alert?: boolean;
}) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1"
      style={{
        background: alert ? 'var(--color-danger-surface)' : 'var(--color-surface)',
        border: `1px solid ${alert ? 'var(--color-danger)' : 'var(--color-border)'}`,
      }}>
      <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: alert ? 'var(--color-danger-text)' : 'var(--color-text-muted)' }}>
        {icon}{label}
      </p>
      <p className="text-2xl font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>}
    </div>
  );
}

function SCard({ title, subtitle, children, loading }: {
  title: string; subtitle?: string; children: React.ReactNode; loading?: boolean;
}) {
  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="mb-4">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</p>}
      </div>
      {loading
        ? <div className="flex items-center justify-center h-44"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-border-strong)' }} /></div>
        : children}
    </div>
  );
}

function Empty({ text = 'No data for this period' }: { text?: string }) {
  return <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--color-text-muted)' }}>{text}</div>;
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────

function AnalyticsTab({
  summary, trend, colleges, attention, role, isDark, loading,
  granularity, onGranularityChange, trendLoading,
}: {
  summary: AnalyticsSummary | null;
  trend: TrendData | null;
  colleges: CollegeEntry[];
  attention: AttentionStudent[];
  role: string;
  isDark: boolean;
  loading: boolean;
  granularity: TrendGranularity;
  onGranularityChange: (g: TrendGranularity) => void;
  trendLoading: boolean;
}) {
  const isAdmin = ADMIN_ROLES.includes(role.toUpperCase());
  void isDark;
  const grid  = 'var(--color-border)';
  const tText = 'var(--color-text-muted)';

  // Distribution donut data
  const distData = LABEL_ORDER.map(l => ({
    name: l, value: summary?.by_label[l] ?? 0, fill: PERMA_COLORS[l],
  })).filter(d => d.value > 0);
  const totalDist = distData.reduce((a, d) => a + d.value, 0);

  // Trend line data
  const trendBuckets = trend?.buckets ?? trend?.months ?? [];
  const trendRows = trend
    ? trendBuckets.map(m => ({
        month: fmtBucketKey(m, granularity),
        ...LABEL_ORDER.reduce((acc, l) => ({ ...acc, [l]: trend.data[m]?.[l] ?? 0 }), {}),
      }))
    : [];

  // Attention export CSV
  const exportCSV = () => {
    const header = 'Name,Email,School ID,College,Year Level,EMA Label,Last Check-in,Case Status,Reason';
    const rows = attention.map(s => [
      s.name, s.email, s.school_id, s.college, s.year_level,
      s.label || 'No Data', s.last_checkin ? fmtDate(s.last_checkin) : '—',
      s.case_status || '—',
      s.reason === 'at_risk' ? 'At-Risk Label' : s.reason === 'inactive' ? 'Inactive (14d+)' : 'No Check-in',
    ].map(v => `"${v}"`).join(','));
    const csv = [header, ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `ema-attention-${todayPH()}.csv`;
    a.click();
  };

  const REASON_BADGE: Record<string, { label: string; bg: string; color: string }> = {
    at_risk:    { label: 'At risk',      bg: 'var(--color-danger-surface)',  color: 'var(--color-danger-text)' },
    inactive:   { label: 'Inactive 14d', bg: 'var(--color-warning-surface)', color: 'var(--color-warning-text)' },
    no_checkin: { label: 'No check-in',  bg: 'var(--color-bg)',              color: 'var(--color-text-muted)' },
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Students linked to EMA"
          value={summary?.total_tracked ?? '—'}
          sub="registered in CPS"
          icon={<Users size={14} />}
          color="#2352CC"
        />
        <KpiCard
          label="Checked in, last 30 days"
          value={summary ? `${summary.active_last_30d} (${summary.completion_rate}%)` : '—'}
          sub="checked in this month"
          icon={<CheckCircle2 size={14} />}
          accent={!!summary && summary.completion_rate >= 60}
        />
        <KpiCard
          label="Inactive 14+ days"
          value={summary?.inactive_14d ?? '—'}
          sub="no EMA check-in in two weeks"
          icon={<Clock size={14} />}
          color="#D97706"
          accent={!!summary && summary.inactive_14d > 0}
        />
        <KpiCard
          label="At risk now"
          value={summary?.at_risk_count ?? '—'}
          sub="Struggling or In Crisis (triage)"
          alert={!!summary && summary.at_risk_count > 0}
          icon={<AlertTriangle size={14} />}
          accent={!!summary && summary.at_risk_count > 0}
        />
      </div>

      {/* Care follow-up and outcomes */}
      <EmaInsights />

      <div className="pt-2">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Wellbeing over time</h2>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>How students are doing now and how check-ins change.</p>
      </div>

      {/* Distribution + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <SCard title="Where students are now" subtitle="Triage label per student (worst result in the last 7 days)">
          {!summary || totalDist === 0 ? <Empty text="No EMA data collected yet" /> : (
            <div className="space-y-4">
              <p className="text-3xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {totalDist} <span className="text-sm font-normal" style={{ color: 'var(--color-text-muted)' }}>students with a result</span>
              </p>
              <div className="flex-1 space-y-2 min-w-0">
                {LABEL_ORDER.map(l => {
                  const count = summary.by_label[l] ?? 0;
                  const pct = totalDist > 0 ? Math.round(count / totalDist * 100) : 0;
                  return (
                    <div key={l} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 w-28 flex-shrink-0">
                        <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: PERMA_COLORS[l] }} />
                        <span className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{l}</span>
                      </div>
                      <div className="flex-1 h-2.5 rounded-r" style={{ background: 'var(--color-bg)' }}>
                        <div className="h-full rounded-r" title={`${l}: ${count} (${pct}%)`} style={{ width: `${pct}%`, background: PERMA_COLORS[l] }} />
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 w-14 justify-end">
                        <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>{count}</span>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
                {(summary.by_label['No Data'] ?? 0) > 0 && (
                  <div className="flex items-center gap-2 pt-1.5" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <div className="flex items-center gap-1.5 w-28 flex-shrink-0">
                      <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: PERMA_COLORS['No Data'] }} />
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No Data</span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{summary.by_label['No Data']}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </SCard>

        <div className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Students by label</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Each student counts once per day, by their hardest result that day (students can chat with EMA many times a day)</p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
              {(['day', 'week', 'month'] as TrendGranularity[]).map(g => {
                const active = granularity === g;
                return (
                  <button key={g} onClick={() => onGranularityChange(g)}
                    className="px-2.5 py-1 rounded-md text-xs font-medium transition-all capitalize"
                    style={active
                      ? { background: 'var(--color-surface)', color: 'var(--color-text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }
                      : { color: 'var(--color-text-muted)' }}>
                    {g === 'day' ? 'Daily' : g === 'week' ? 'Weekly' : 'Monthly'}
                  </button>
                );
              })}
            </div>
          </div>
          {trendLoading ? (
            <div className="flex items-center justify-center h-44"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-border-strong)' }} /></div>
          ) : !trend || trendRows.length === 0 ? <Empty text="No snapshot history yet — sync first" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendRows} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid stroke={grid} strokeWidth={1} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: tText, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: tText, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip isDark={isDark} />} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" formatter={(v: string) => <span style={{ color: 'var(--color-text-secondary)' }}>{v}</span>} />
                {LABEL_ORDER.map(l => (
                  <Line key={l} type="linear" dataKey={l} name={l} isAnimationActive={false}
                    stroke={PERMA_COLORS[l]}
                    strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
                    dot={false}
                    activeDot={{ r: 5, fill: PERMA_COLORS[l], stroke: 'var(--color-surface)', strokeWidth: 2 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
          {trend?.scores && trendBuckets.some(b => trend.scores?.[b]) && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-[11px] mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                Average wellbeing score · each student-day counts once · 1 In Crisis to 5 Excelling
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {trendBuckets.slice(-8).map(b => {
                  const sc = trend.scores?.[b];
                  return (
                    <div key={b} className="flex-shrink-0 rounded-md px-2 py-1 text-center min-w-[56px]" style={{ background: 'var(--color-bg)' }}
                      title={sc ? `${sc.label} · ${sc.student_days} student-days` : 'No check-ins'}>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{fmtBucketKey(b, granularity)}</p>
                      <p className="text-xs font-semibold tabular-nums inline-flex items-center gap-1" style={{ color: sc ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                        {sc && <span className="w-1.5 h-1.5 rounded-full" style={{ background: PERMA_COLORS[sc.label] }} aria-hidden />}
                        {sc ? sc.avg.toFixed(2) : '—'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* College Breakdown (admin only) */}
      {isAdmin && colleges.length > 0 && (
        <SCard
          title="College Breakdown"
          subtitle="Linked students and how many are at risk, per college. Colleges with fewer than 5 students are combined."
        >
          <ResponsiveContainer width="100%" height={Math.max(180, colleges.length * 36)}>
            <BarChart data={colleges} layout="vertical" barGap={2} margin={{ top: 0, right: 60, left: 8, bottom: 0 }}>
              <CartesianGrid stroke={grid} strokeWidth={1} horizontal={false} />
              <XAxis type="number" tick={{ fill: tText, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="college" tick={{ fill: tText, fontSize: 10 }} axisLine={false} tickLine={false} width={115} />
              <Tooltip content={<ChartTooltip isDark={isDark} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="square" formatter={(v: string) => <span style={{ color: 'var(--color-text-secondary)' }}>{v}</span>} />
              <Bar dataKey="total"   name="Linked students" fill="var(--color-border-strong)" radius={[0, 4, 4, 0]} barSize={10} isAnimationActive={false} />
              <Bar dataKey="at_risk" name="At risk now"     fill={PERMA_COLORS['In Crisis']} radius={[0, 4, 4, 0]} barSize={10} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </SCard>
      )}

      {/* Students Needing Attention */}
      <div className="rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Students Needing Attention</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              At-risk labels · Inactive 14+ days · No check-in on record
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ background: attention.length > 0 ? 'var(--color-danger-surface)' : 'var(--color-bg)', color: attention.length > 0 ? 'var(--color-danger-text)' : 'var(--color-text-muted)' }}>
              {attention.length}
            </span>
            {attention.length > 0 && (
              <button onClick={exportCSV}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <Download size={12} /> Export CSV
              </button>
            )}
          </div>
        </div>

        {loading && attention.length === 0 ? (
          <div className="flex justify-center py-10"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} /></div>
        ) : attention.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: 'var(--color-success)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>All students are active and healthy</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>No attention items at this time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Student', 'College', 'EMA Status', 'Last Check-in', 'Days Ago', 'Case', 'Reason'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attention.map(s => {
                  const days = daysSince(s.last_checkin);
                  const rb = REASON_BADGE[s.reason];
                  return (
                    <tr key={s.student_id} style={{ borderBottom: '1px solid var(--color-border)' }}
                      className="hover:bg-[var(--color-bg)] transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{s.name || '—'}</p>
                        <p style={{ color: 'var(--color-text-muted)' }}>{s.school_id || s.email}</p>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                        {s.college || '—'}
                        {s.year_level && <span className="block" style={{ color: 'var(--color-text-muted)' }}>Year {s.year_level}</span>}
                      </td>
                      <td className="px-4 py-3"><LabelChip label={s.label} /></td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                        {fmtDate(s.last_checkin)}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-semibold"
                        style={{ color: days === null ? 'var(--color-text-muted)' : days > 14 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                        {days === null ? '—' : `${days}d`}
                      </td>
                      <td className="px-4 py-3">
                        {s.case_id ? (
                          <Link href={`/cases/${s.case_id}`}
                            className="inline-flex items-center gap-1 text-xs hover:underline"
                            style={{ color: 'var(--color-primary)' }}>
                            {s.case_status || 'View'} <ChevronRight size={10} />
                          </Link>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: rb.bg, color: rb.color }}>
                          {rb.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── At-Risk Tab ───────────────────────────────────────────────────────────────

function AtRiskTab({ isDark }: { isDark: boolean }) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hdrs = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    fetch(api('/api/mhbot/cm-queue'), { headers: hdrs })
      .then(r => r.ok ? r.json() : { students: [] })
      .then(d => setStudents(d.students || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} /></div>
  );

  if (students.length === 0) return (
    <div className="py-16 text-center rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: 'var(--color-success)' }} />
      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>No at-risk students</p>
      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>All tracked students are Surviving or above.</p>
    </div>
  );

  const crisisStudents   = students.filter(s => s.triage_label === 'In Crisis');
  const strugglingStudents = students.filter(s => s.triage_label === 'Struggling');

  const StudentCard = ({ s }: { s: any }) => {
    const days = daysSince(s.latest_date);
    const isCrisis = s.triage_label === 'In Crisis';
    return (
      <div className="flex items-start gap-4 p-4 rounded-xl border transition"
        style={{
          background: 'var(--color-surface)',
          // Crisis keeps a full-strength outline; the colored badge already marks Struggling
          borderColor: isCrisis ? PERMA_COLORS['In Crisis'] : 'var(--color-border)',
        }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{s.student_name || '—'}</span>
            <PermaBadge label={s.triage_label} />
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.school_id || s.student_email}</p>
          {s.college && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.college}</p>}
          <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
            Last check-in: {fmtDate(s.latest_date)}{days !== null ? ` · ${days}d ago` : ''}
            {s.latest_label && s.latest_label !== s.triage_label ? ` · latest result ${s.latest_label}` : ''}
          </p>
          <div className="mt-2 space-y-1.5">
            <TriageFlags flags={s.flags} />
            <TriageReasons reasons={s.reasons} />
          </div>
        </div>
        {s.case_id && (
          <Link href={`/cases/${s.case_id}`}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border flex-shrink-0"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-bg)' }}>
            View Case <ChevronRight size={11} />
          </Link>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs px-1" style={{ color: 'var(--color-text-muted)' }}>
        <AlertTriangle size={13} style={{ color: 'var(--color-warning)' }} />
        {students.length} student{students.length !== 1 ? 's' : ''} flagged — immediate follow-up recommended
      </div>

      {crisisStudents.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest px-1 flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: PERMA_COLORS['In Crisis'] }} aria-hidden />
            In Crisis ({crisisStudents.length})
          </p>
          {crisisStudents.map(s => <StudentCard key={s.student_id} s={s} />)}
        </div>
      )}

      {strugglingStudents.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest px-1 flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: PERMA_COLORS.Struggling }} aria-hidden />
            Struggling ({strugglingStudents.length})
          </p>
          {strugglingStudents.map(s => <StudentCard key={s.student_id} s={s} />)}
        </div>
      )}

      <p className="text-xs px-1" style={{ color: 'var(--color-text-muted)' }}>
        PH Crisis Hotlines: <strong>Hopeline 8804-4673</strong> · <strong>Crisis Line 0917-899-8727</strong>
      </p>
    </div>
  );
}

// ── EMA Chatbot embed ─────────────────────────────────────────────────────────

function EmaEmbed() {
  const [iframeKey, setIframeKey] = useState(0);
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <MessageSquare size={13} />
          <span>EMA Chatbot — <a href={EMA_URL} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--color-primary)' }}>pchrd-ema.dlsu.edu.ph</a></span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIframeKey(k => k + 1)}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-lg transition"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <RefreshCw size={12} /> Reload
          </button>
          <a href={EMA_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-lg transition"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}>
            <ExternalLink size={12} /> New tab
          </a>
        </div>
      </div>
      <p className="text-xs mb-3 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
        This opens EMA&apos;s own chat app inside this page — sign in below with the same EMA username and password you used to link your account. This is separate from the CPS login above.
      </p>
      <div className="flex-1 rounded-xl overflow-hidden border shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
        <iframe key={iframeKey} src={EMA_URL} title="EMA Chatbot" className="w-full h-full border-0" allow="microphone; camera" />
      </div>
    </div>
  );
}

// ── Connect card ──────────────────────────────────────────────────────────────

const IC   = 'w-full px-3 py-2 text-sm rounded-lg outline-none transition';
const IC_S: React.CSSProperties = { border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' };
const onFIn  = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-surface)'; };
const onFOut = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; };

function ConnectCard({ onLink }: { onLink: (username: string, password: string, consent: boolean) => Promise<string | null> }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent]   = useState(false);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    const error = await onLink(username.trim(), password, consent);
    if (error) setErr(error);
    setBusy(false);
  };

  return (
    <div className="max-w-sm mx-auto mt-6">
      <div className="rounded-2xl p-8 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--color-success-surface)' }}>
            <Activity size={22} style={{ color: 'var(--color-success)' }} />
          </div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Link EMA Account</h2>
          <p className="text-xs text-center mt-1" style={{ color: 'var(--color-text-muted)' }}>Enter your EMA username to link your wellbeing data</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>EMA Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="e.g. juan_dc" required className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>EMA Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Your EMA account password" required className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
          </div>
          <EmaConsentCheckbox checked={consent} onChange={setConsent} id="ema-connect-consent" />
          {err && <p className="text-xs rounded-lg px-3 py-2 border" style={{ color: 'var(--color-danger)', background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)' }}>{err}</p>}
          <button type="submit" disabled={busy || !username.trim() || !password || !consent}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
            {busy ? 'Linking…' : 'Link Account'}
          </button>
        </form>
        <p className="text-xs text-center mt-4" style={{ color: 'var(--color-text-muted)' }}>
          Your EMA username is your display name on the EMA app (not your email address). Your password is never stored. CPS keeps an encrypted sign-in key so the EMA chatbot opens already signed in.
        </p>
      </div>
    </div>
  );
}

// ── Student View ──────────────────────────────────────────────────────────────

const LABEL_SCORE: Record<string, number> = {
  'In Crisis': 1, Struggling: 2, Surviving: 3, Thriving: 4, Excelling: 5,
};

function StudentView({ username, onDisconnect }: { username: string; onDisconnect: () => void }) {
  const [loading, setLoading] = useState(true);
  const [label, setLabel]     = useState<string | null>(null);
  const [date, setDate]       = useState<string | null>(null);
  const [history, setHistory] = useState<PermaEntry[]>([]);
  const [range, setRange]     = useState<7 | 14 | 30>(14);
  const [err, setErr]         = useState('');
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(async (limit: number) => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/mhbot/my-perma?limit=${limit}`), { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (!r.ok || d.fetch_error) { setErr(d.fetch_error || d.error || 'Could not load PERMA data'); }
      else { setLabel(d.latest_label ?? null); setDate(d.latest_date ?? null); setHistory(d.history || []); setFromCache(!!d.from_cache); }
    } catch { setErr('Network error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(range); }, [load, range]);

  // Oldest-first for the line chart, mapped to a 1–5 wellbeing score
  const chartRows = [...history].reverse().map(h => ({
    date: fmtDate(h.date).replace(', ', ' '),
    score: h.perma_label ? LABEL_SCORE[h.perma_label] ?? null : null,
    label: h.perma_label || 'No Data',
  }));

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center justify-between p-3 rounded-xl border"
        style={{ background: 'var(--color-success-surface)', borderColor: 'var(--color-success)' }}>
        <div className="flex items-center gap-2">
          <Wifi size={14} style={{ color: 'var(--color-success)' }} />
          <p className="text-sm" style={{ color: 'var(--color-success)' }}>
            Connected as <span className="font-semibold">{username}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(range)} className="p-1.5 rounded transition" style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
            <RefreshCw size={13} />
          </button>
          <button onClick={onDisconnect}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border transition"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <LogOut size={11} /> Disconnect
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : err ? (
        <div className="p-4 rounded-xl border text-sm"
          style={{ background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>{err}</div>
      ) : (
        <>
          {fromCache && (
            <div className="flex items-center gap-2 p-3 rounded-xl border text-xs"
              style={{ background: 'var(--color-warning-surface)', borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}>
              <WifiOff size={13} className="flex-shrink-0" />
              Showing your last synced data — the live EMA server is unreachable right now.
            </div>
          )}
          <div className="border rounded-xl p-6 flex items-center gap-5"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-success-surface)' }}>
              <Activity size={24} style={{ color: 'var(--color-success)' }} />
            </div>
            <div>
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Your current EMA well-being</p>
              <PermaBadge label={label} />
              {date && <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>Last check-in: {fmtDate(date)}</p>}
              {!label && <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>No check-in yet — complete one on the EMA app.</p>}
            </div>
          </div>

          {label && (
            <div className="p-4 rounded-xl border" style={{ background: 'var(--color-primary-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {label === 'Excelling'  && "You're doing great! Your wellbeing is strong across all dimensions."}
                {label === 'Thriving'   && "You're in a generally positive mental state with minor concerns."}
                {label === 'Surviving'  && "You're coping but experiencing some difficulties. Your IC can help if needed."}
                {label === 'Struggling' && "You're experiencing significant challenges. A Case Manager will reach out to support you."}
                {label === 'In Crisis'  && "You've been flagged for immediate support. Please reach out to the CPS office directly if you need help now."}
              </p>
              {(label === 'Struggling' || label === 'In Crisis') && (
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  PH Crisis Hotlines: <strong>Hopeline 8804-4673</strong> · <strong>Crisis Line 0917-899-8727</strong>
                </p>
              )}
            </div>
          )}

          {history.length > 0 && (
            <div className="border rounded-xl p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} style={{ color: 'var(--color-text-muted)' }} />
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Your Wellbeing Trend</p>
                </div>
                <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                  {([7, 14, 30] as const).map(n => {
                    const active = range === n;
                    return (
                      <button key={n} onClick={() => setRange(n)}
                        className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                        style={active
                          ? { background: 'var(--color-surface)', color: 'var(--color-text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }
                          : { color: 'var(--color-text-muted)' }}>
                        {n}d
                      </button>
                    );
                  })}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartRows} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} axisLine={false} tickLine={false}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 9 }}
                    tickFormatter={(v: number) => ({ 1: 'Crisis', 2: 'Struggling', 3: 'Surviving', 4: 'Thriving', 5: 'Excelling' }[v] ?? '')}
                    width={64}
                  />
                  <Tooltip
                    formatter={((_v: number, _n: string, p: any) => [p?.payload?.label ?? '', 'Wellbeing']) as any}
                    contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  />
                  <ReferenceArea y1={1} y2={2.5} fill="#ef4444" fillOpacity={0.06} />
                  <Line type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={2}
                    dot={((props: any) => (
                      <circle key={`${props.cx}-${props.cy}`} cx={props.cx} cy={props.cy} r={3.5} fill={PERMA_COLORS[props.payload.label] || '#94A3B8'} stroke="none" />
                    )) as any}
                    connectNulls activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {history.length > 0 && (
            <div className="border rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <TrendingUp size={14} style={{ color: 'var(--color-text-muted)' }} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Check-in History</p>
              </div>
              {history.map((h, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3"
                  style={{ borderBottom: i < history.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{fmtDate(h.date)}</p>
                  <PermaBadge label={h.perma_label} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Staff View ────────────────────────────────────────────────────────────────

type StaffTab = 'analytics' | 'at-risk' | 'students' | 'chatbot';

function StaffView({ username, role, onDisconnect }: { username: string; role: string; onDisconnect: () => void }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [tab, setTab]           = useState<StaffTab>('analytics');
  const [summary, setSummary]   = useState<AnalyticsSummary | null>(null);
  const [trend, setTrend]       = useState<TrendData | null>(null);
  const [trendLoading, setTrendLoading] = useState(true);
  const [granularity, setGranularity]   = useState<TrendGranularity>('day');
  const [colleges, setColleges] = useState<CollegeEntry[]>([]);
  const [attention, setAttention] = useState<AttentionStudent[]>([]);
  const [loading, setLoading]   = useState(true);
  const [syncing, setSyncing]   = useState(false);
  const [syncMsg, setSyncMsg]   = useState('');
  const [serverUp, setServerUp] = useState<boolean | null>(null);

  const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const fetchTrend = useCallback(async (g: TrendGranularity) => {
    setTrendLoading(true);
    try {
      const r = await fetch(api(`/api/mhbot/analytics/trend?granularity=${g}`), { headers: hdrs() });
      if (r.ok) setTrend(await r.json());
    } catch {}
    finally { setTrendLoading(false); }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [summRes, collegeRes, attRes] = await Promise.all([
        fetch(api('/api/mhbot/analytics/summary'),   { headers: hdrs() }),
        fetch(api('/api/mhbot/analytics/college'),   { headers: hdrs() }),
        fetch(api('/api/mhbot/analytics/attention'), { headers: hdrs() }),
      ]);
      if (summRes.ok)    setSummary(await summRes.json());
      if (collegeRes.ok) setColleges((await collegeRes.json()).colleges || []);
      if (attRes.ok)     setAttention((await attRes.json()).students || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const checkServer = useCallback(async () => {
    try {
      const r = await fetch(api('/api/mhbot/health'));
      setServerUp(r.ok && (await r.json()).status === 'healthy');
    } catch { setServerUp(false); }
  }, []);

  const handleSync = async () => {
    setSyncing(true); setSyncMsg('');
    try {
      const r = await fetch(api('/api/mhbot/sync'), { method: 'POST', headers: hdrs() });
      if (r.ok) {
        const d = await r.json();
        setSyncMsg(`Synced ${d.synced} of ${d.total} students`);
        await Promise.all([fetchAnalytics(), fetchTrend(granularity)]);
      } else {
        setSyncMsg('Sync failed — check EMA connection');
      }
    } catch { setSyncMsg('Network error during sync'); }
    finally { setSyncing(false); setTimeout(() => setSyncMsg(''), 4000); }
  };

  useEffect(() => {
    fetchAnalytics();
    checkServer();
  }, [fetchAnalytics, checkServer]);

  useEffect(() => {
    fetchTrend(granularity);
  }, [fetchTrend, granularity]);

  const TAB_LABELS: { key: StaffTab; label: string }[] = [
    { key: 'analytics', label: 'Analytics'   },
    { key: 'at-risk',   label: 'At-Risk'     },
    { key: 'students',  label: 'Students'    },
    { key: 'chatbot',   label: 'Chatbot'     },
  ];

  const atRiskCount = summary?.at_risk_count ?? 0;

  return (
    <div className="space-y-4">

      {/* Connection bar */}
      <div className="flex items-center gap-3 p-3 rounded-xl border"
        style={{ background: 'var(--color-success-surface)', borderColor: 'var(--color-success)' }}>
        {serverUp === null
          ? <Loader2 size={14} className="animate-spin flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
          : serverUp
          ? <Wifi size={14} className="flex-shrink-0" style={{ color: 'var(--color-success)' }} />
          : <WifiOff size={14} className="flex-shrink-0" style={{ color: 'var(--color-danger)' }} />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>
            {username
              ? <>Connected as <span className="font-semibold">{username}</span></>
              : 'Connected to EMA via the shared CPS staff account'}
          </p>
          {serverUp === false && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-danger)' }}>EMA server unreachable — data may be stale</p>
          )}
          {syncMsg && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{syncMsg}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={handleSync} disabled={syncing}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition disabled:opacity-50"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-bg)' }}
            onMouseEnter={e => { if (!syncing) e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}>
            {syncing ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            {syncing ? 'Syncing…' : 'Sync EMA'}
          </button>
          <button onClick={onDisconnect}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <LogOut size={11} /> Disconnect
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
        {TAB_LABELS.map(({ key, label }) => {
          const active = tab === key;
          return (
            <button key={key} onClick={() => setTab(key)}
              className="relative px-4 py-1.5 rounded-md text-sm font-medium transition-all"
              style={active
                ? { background: 'var(--color-surface)', color: 'var(--color-text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                : { color: 'var(--color-text-muted)' }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
              {label}
              {key === 'at-risk' && atRiskCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[0.5625rem] font-bold flex items-center justify-center text-white"
                  style={{ background: 'var(--color-danger)' }}>
                  {atRiskCount > 9 ? '9+' : atRiskCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === 'analytics' && (
        <AnalyticsTab
          summary={summary}
          trend={trend}
          colleges={colleges}
          attention={attention}
          role={role}
          isDark={isDark}
          loading={loading}
          granularity={granularity}
          onGranularityChange={setGranularity}
          trendLoading={trendLoading}
        />
      )}

      {tab === 'at-risk' && <AtRiskTab isDark={isDark} />}
      {tab === 'students' && <PendingStudentsWithPerma />}
      {tab === 'chatbot'  && <EmaEmbed />}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EMAPage() {
  const [role, setRole]             = useState('');
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const token = () => localStorage.getItem('token');

  const checkAuth = async () => {
    setLoadingAuth(true);
    try {
      const r = await fetch(api('/api/mhbot/auth/status'), { headers: { Authorization: `Bearer ${token()}` } });
      setAuthStatus(await r.json());
    } catch { setAuthStatus({ connected: false }); }
    finally { setLoadingAuth(false); }
  };

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) { try { setRole(JSON.parse(raw).role || ''); } catch {} }
    checkAuth();
  }, []);

  const handleLink = async (username: string, password: string, consent: boolean): Promise<string | null> => {
    try {
      const r = await fetch(api('/api/mhbot/link-username'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, consent }),
      });
      const d = await r.json();
      if (r.ok) { setAuthStatus({ connected: true, chat_ready: true, mhbot_username: d.mhbot_username }); return null; }
      return d.error || 'Failed to link account';
    } catch { return 'Network error'; }
  };

  const handleDisconnect = async () => {
    await fetch(api('/api/mhbot/auth/logout'), { method: 'POST', headers: { Authorization: `Bearer ${token()}` } });
    setAuthStatus({ connected: false });
  };

  const isStudent = STUDENT_ROLES.includes(role.toUpperCase());

  if (loadingAuth) {
    return (
      <DashboardPageWrapper title="EMA" subtitle="PERMA well-being tracking">
        <div className="flex items-center justify-center h-48 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Checking connection…
        </div>
      </DashboardPageWrapper>
    );
  }

  // Students linked before the in-CPS chatbot have no saved EMA key yet; ask them to sign in once more
  if (!authStatus?.connected || (isStudent && authStatus.needs_relink)) {
    return (
      <DashboardPageWrapper
        title="EMA"
        subtitle={isStudent ? 'Link your EMA username to track your well-being' : 'Connect to EMA to access analytics and student PERMA data'}
      >
        <ConnectCard onLink={handleLink} />
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper
      title="EMA Analytics"
      subtitle={isStudent ? 'Your PERMA well-being'
        : ['COUNSELOR', 'PSYCHOLOGIST', 'IC'].includes(role.toUpperCase()) ? 'Wellbeing of the students in your care'
        : 'Student well-being monitoring & population health analytics'}
    >
      {isStudent
        ? <StudentView username={authStatus.mhbot_username!} onDisconnect={handleDisconnect} />
        : <StaffView   username={authStatus.mhbot_username!} role={role} onDisconnect={handleDisconnect} />}
    </DashboardPageWrapper>
  );
}
