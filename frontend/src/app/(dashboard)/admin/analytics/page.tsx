'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  AlertTriangle, Calendar, FileText, RefreshCw, Loader2,
  Download, Users, TrendingUp, Clock, CheckCircle,
  XCircle, BarChart2, ChevronRight, Activity,
} from 'lucide-react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/utils/api';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Summary {
  total_cases: number; active_cases: number; closed_cases: number;
  high_risk_cases: number; total_students: number;
  total_counselors: number; total_psychologists: number;
  week_appointments: number; pending_appointments: number; month_assessments: number;
}
interface MonthlyAppt { short: string; label: string; total: number; completed: number; cancelled: number; no_show: number; }
interface MonthlyCase { short: string; label: string; new_cases: number; closed_cases: number; high_risk: number; }
interface StaffMember  { name: string; role: string; active_cases: number; week_completed: number; }
interface ApptStats    { completion_rate: number; no_show_rate: number; avg_wait_days: number; total_appointments: number; completed: number; no_shows: number; cancelled: number; }
interface DayCount     { day: string; count: number; }
interface HourCount    { hour: string; count: number; }
interface RiskDist     { [key: string]: number; }
interface ConcernItem  { concern: string; count: number; }
interface ScoreTrend   { short: string; label: string; phq9: number | null; gad7: number | null; }
interface AssessmentType { _id: string; count: number; avg_score: number; risk_breakdown: Record<string, number>; }
interface IntakeFunnel { intake_started: number; intake_completed: number; cases_created: number; intake_completion_rate: number; case_creation_rate: number; }
interface ReferralSummary { total_referrals: number; pending: number; completed: number; referral_types: { type: string; count: number }[]; status_breakdown: Record<string, number>; }
interface CpsSummary   { new_clients: { total: number; this_month: number }; counseling_cases: { total: number; active: number }; checkins: { total_clients: number; checkins_this_month: number }; }

// ── Constants ──────────────────────────────────────────────────────────────────

const C = {
  primary: '#2352CC', green: '#059669', red: '#DC2626', amber: '#D97706',
  blue: '#3B82F6', purple: '#7C3AED', slate: '#64748B', teal: '#0D9488',
  rose: '#E11D48', orange: '#EA580C',
};
const RISK_COLORS: Record<string, string> = {
  GREEN: C.green, YELLOW: C.amber, ORANGE: C.orange, RED: C.red,
  CRITICAL: '#7F1D1D', LOW: C.teal, MODERATE: C.blue, HIGH: C.red,
};
const TAB_LIST = [
  { key: 'overview',      label: 'Overview' },
  { key: 'appointments',  label: 'Appointments' },
  { key: 'cases',         label: 'Cases & Students' },
  { key: 'staff',         label: 'Staff Workload' },
  { key: 'reports',       label: 'Reports & Export' },
] as const;
type TabKey = typeof TAB_LIST[number]['key'];

const PERIODS = [
  { label: '30 days', days: 30, months: 3 },
  { label: '3 months', days: 90, months: 6 },
  { label: '6 months', days: 180, months: 6 },
  { label: '1 year', days: 365, months: 12 },
];

// ── Shared micro-components ────────────────────────────────────────────────────

function useChartTheme(isDark: boolean) {
  return {
    grid:    isDark ? '#1F2640' : '#E4E7F0',
    text:    isDark ? '#94A3B8' : '#6B7280',
    tooltip: isDark ? { bg: '#111827', border: '#1F2640', text: '#F1F5F9', sub: '#94A3B8' }
                    : { bg: '#ffffff', border: '#E4E7F0', text: '#0D1526',  sub: '#64748B' },
  };
}

function CustomTooltip({ active, payload, label, isDark }: {
  active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string; isDark: boolean;
}) {
  const t = useChartTheme(isDark).tooltip;
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, padding: '10px 14px', minWidth: 120 }}>
      {label && <p style={{ color: t.sub, fontSize: 11, marginBottom: 6, fontWeight: 500 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: t.text, fontSize: 12, marginBottom: 2 }}>
          <span style={{ color: p.color, fontWeight: 600 }}>{p.name}: </span>
          {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

function Kpi({ label, value, sub, icon, color, href }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; href?: string;
}) {
  const inner = (
    <div className="rounded-xl p-4 flex items-start gap-3 h-full"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: color + '18' }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium leading-snug" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
        <p className="text-xl font-bold leading-tight mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>}
      </div>
    </div>
  );
  return href
    ? <Link href={href} className="block">{inner}</Link>
    : <div className="block">{inner}</div>;
}

function Card({ title, subtitle, children, loading, action }: {
  title: string; subtitle?: string; children: React.ReactNode;
  loading?: boolean; action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {loading
        ? <div className="flex items-center justify-center h-44" style={{ color: 'var(--color-border-strong)' }}><Loader2 size={20} className="animate-spin" /></div>
        : children}
    </div>
  );
}

function Empty({ text = 'No data for this period' }: { text?: string }) {
  return <div className="flex items-center justify-center h-44 text-sm" style={{ color: 'var(--color-text-muted)' }}>{text}</div>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>
      {children}
    </p>
  );
}

function MetricRow({ items }: { items: { label: string; value: string | number; accent?: string }[] }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map(({ label, value, accent }) => (
        <div key={label} className="rounded-lg p-3 text-center" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
          <p className="text-lg font-bold" style={{ color: accent ?? 'var(--color-text-primary)' }}>{value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Tab: Overview ──────────────────────────────────────────────────────────────

function OverviewTab({ summary, monthlyAppts, monthlyCases, staff, isDark }: {
  summary: Summary | null;
  monthlyAppts: MonthlyAppt[];
  monthlyCases: MonthlyCase[];
  staff: StaffMember[];
  isDark: boolean;
}) {
  const ct = useChartTheme(isDark);
  const maxCases = Math.max(...staff.map(s => s.active_cases), 1);
  const attentionItems = [
    summary?.pending_appointments && summary.pending_appointments > 0
      ? { text: `${summary.pending_appointments} appointment request${summary.pending_appointments !== 1 ? 's' : ''} awaiting assignment`, href: '/appointment-requests', color: C.amber }
      : null,
    summary?.high_risk_cases && summary.high_risk_cases > 0
      ? { text: `${summary.high_risk_cases} student${summary.high_risk_cases !== 1 ? 's' : ''} flagged RED or CRITICAL risk`, href: '/high-risk', color: C.red }
      : null,
  ].filter(Boolean) as { text: string; href: string; color: string }[];

  return (
    <div className="space-y-6">
      {attentionItems.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid var(--color-warning)`, background: 'var(--color-warning-surface)' }}>
          <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: 'var(--color-warning)' }}>
            <AlertTriangle size={14} style={{ color: 'var(--color-warning)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--color-warning-text)' }}>Needs Attention</span>
          </div>
          {attentionItems.map((item) => (
            <Link key={item.text} href={item.href}
              className="flex items-center justify-between px-4 py-2.5 group border-b last:border-b-0"
              style={{ borderColor: 'var(--color-warning)' }}>
              <span className="text-sm" style={{ color: 'var(--color-warning-text)' }}>{item.text}</span>
              <ChevronRight size={14} style={{ color: 'var(--color-warning)' }} />
            </Link>
          ))}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Kpi label="Active Cases"    value={summary.active_cases}     sub={`${summary.total_cases} total`}           icon={<FileText size={14}/>}       color={C.primary} />
          <Kpi label="High Risk"       value={summary.high_risk_cases}  sub="RED / CRITICAL"                           icon={<AlertTriangle size={14}/>}   color={C.red}     href="/high-risk" />
          <Kpi label="Students"        value={summary.total_students}   sub="registered"                               icon={<Users size={14}/>}           color={C.blue}    />
          <Kpi label="Pending Requests" value={summary.pending_appointments} sub="awaiting approval"                   icon={<Clock size={14}/>}           color={C.amber}   href="/appointment-requests" />
          <Kpi label="Clinical Staff"  value={summary.total_counselors + summary.total_psychologists}
               sub={`${summary.total_counselors} counselors · ${summary.total_psychologists} psych`}                   icon={<Activity size={14}/>}        color={C.teal}    />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Monthly Appointment Outcomes" subtitle="Are sessions being completed or falling through?">
          {monthlyAppts.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyAppts} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                <XAxis dataKey="short" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Legend wrapperStyle={{ fontSize: 11, color: ct.text }} />
                <Bar dataKey="completed" name="Completed" stackId="a" fill={C.green}  />
                <Bar dataKey="no_show"   name="No-show"   stackId="a" fill={C.amber}  />
                <Bar dataKey="cancelled" name="Cancelled" stackId="a" fill={C.slate}  radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Case Activity" subtitle="Is the caseload growing, stabilizing, or reducing?">
          {monthlyCases.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyCases} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="short" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Legend wrapperStyle={{ fontSize: 11, color: ct.text }} />
                <Line type="monotone" dataKey="new_cases"    name="New"       stroke={C.primary} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="closed_cases" name="Closed"    stroke={C.green}   strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="high_risk"    name="High Risk" stroke={C.red}     strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {staff.length > 0 && (
        <Card title="Staff Utilization" subtitle="Active caseload per counselor — who is at capacity?">
          <div className="space-y-2.5">
            {staff.slice(0, 10).map(s => {
              const pct = Math.min(Math.round((s.active_cases / maxCases) * 100), 100);
              const barColor = pct >= 80 ? C.red : pct >= 60 ? C.amber : C.green;
              return (
                <div key={s.name} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-40 flex-shrink-0">
                    <span className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {s.name.split(' ')[0]}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold"
                      style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                      {s.role === 'PSYCHOLOGIST' ? 'PSY' : s.role === 'IC' ? 'IC' : 'CC'}
                    </span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <span className="text-xs font-semibold w-8 text-right" style={{ color: barColor }}>
                      {s.active_cases}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
            Bar width is relative to highest individual caseload.
          </p>
        </Card>
      )}
    </div>
  );
}

// ── Tab: Appointments ──────────────────────────────────────────────────────────

function AppointmentsTab({ apptStats, byDay, byHour, monthlyAppts, isDark }: {
  apptStats: ApptStats | null; byDay: DayCount[]; byHour: HourCount[];
  monthlyAppts: MonthlyAppt[]; isDark: boolean;
}) {
  const ct = useChartTheme(isDark);
  return (
    <div className="space-y-6">
      {apptStats && (
        <Card title="Performance Overview" subtitle={`Last 30 days — ${apptStats.total_appointments.toLocaleString()} appointments total`}>
          <MetricRow items={[
            { label: 'Completion Rate', value: `${apptStats.completion_rate}%`,  accent: apptStats.completion_rate >= 75 ? C.green : C.amber },
            { label: 'No-Show Rate',    value: `${apptStats.no_show_rate}%`,     accent: apptStats.no_show_rate > 15 ? C.red : apptStats.no_show_rate > 8 ? C.amber : C.green },
            { label: 'Avg Wait Days',   value: `${apptStats.avg_wait_days}d`,    accent: apptStats.avg_wait_days > 7 ? C.red : C.primary },
            { label: 'Cancellations',   value: apptStats.cancelled,              accent: C.slate },
            { label: 'No-shows',        value: apptStats.no_shows,               accent: C.amber },
          ]} />
        </Card>
      )}

      <Card title="Monthly Volume & Outcomes" subtitle="12-month view — completed sessions vs. fallthrough">
        {monthlyAppts.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyAppts} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
              <XAxis dataKey="short" tick={{ fill: ct.text, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip isDark={isDark} />} />
              <Legend wrapperStyle={{ fontSize: 11, color: ct.text }} />
              <Bar dataKey="completed" name="Completed" stackId="a" fill={C.green} />
              <Bar dataKey="no_show"   name="No-show"   stackId="a" fill={C.amber} />
              <Bar dataKey="cancelled" name="Cancelled" stackId="a" fill={C.slate} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Demand by Day of Week" subtitle="Which days have the highest appointment load?">
          {byDay.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byDay} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Bar dataKey="count" name="Appointments" fill={C.primary} radius={[3,3,0,0]}>
                  {byDay.map((entry, i) => {
                    const maxCount = Math.max(...byDay.map(d => d.count));
                    return <Cell key={i} fill={entry.count === maxCount ? C.blue : C.primary + '99'} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Demand by Hour (PHT)" subtitle="When should counselors be available to meet peak demand?">
          {byHour.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byHour} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: ct.text, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Bar dataKey="count" name="Appointments" fill={C.teal} radius={[3,3,0,0]}>
                  {byHour.map((entry, i) => {
                    const maxCount = Math.max(...byHour.map(h => h.count));
                    return <Cell key={i} fill={entry.count === maxCount ? C.teal : C.teal + '88'} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Tab: Cases & Students ──────────────────────────────────────────────────────

function CasesTab({ riskDist, concerns, scoreTrends, assessments, intake, isDark }: {
  riskDist: RiskDist; concerns: ConcernItem[]; scoreTrends: ScoreTrend[];
  assessments: AssessmentType[]; intake: IntakeFunnel | null; isDark: boolean;
}) {
  const ct = useChartTheme(isDark);
  const riskData = Object.entries(riskDist)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k, value: v, fill: RISK_COLORS[k] ?? C.slate }));
  const totalRisk = riskData.reduce((a, d) => a + d.value, 0);

  const riskOrder = ['GREEN', 'YELLOW', 'ORANGE', 'RED', 'CRITICAL'];
  const sortedRisk = [...riskData].sort((a, b) => riskOrder.indexOf(a.name) - riskOrder.indexOf(b.name));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Risk Level Distribution" subtitle="Active caseload by clinical severity">
          {riskData.length === 0 ? <Empty text="No active cases" /> : (
            <div className="flex gap-4 items-center">
              <div style={{ width: 160, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={riskData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                      {riskData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip isDark={isDark} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {sortedRisk.map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.fill }} />
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>{d.value}</span>
                      <span className="text-xs w-10 text-right" style={{ color: 'var(--color-text-muted)' }}>
                        {totalRisk > 0 ? `${Math.round(d.value / totalRisk * 100)}%` : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card title="PHQ-9 & GAD-7 Score Trends" subtitle="Monthly averages — lower is better">
          {scoreTrends.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={scoreTrends} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="short" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 27]} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Legend wrapperStyle={{ fontSize: 11, color: ct.text }} />
                <Line type="monotone" dataKey="phq9" name="PHQ-9 Avg" stroke={C.primary} strokeWidth={2} dot={{ r: 3 }} connectNulls activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="gad7" name="GAD-7 Avg" stroke={C.orange}  strokeWidth={2} dot={{ r: 3 }} connectNulls activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card title="Top Presenting Concerns" subtitle="Most common reasons students seek counseling services">
        {concerns.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={Math.max(200, concerns.slice(0, 12).length * 28)}>
            <BarChart data={concerns.slice(0, 12)} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal={false} />
              <XAxis type="number" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="concern" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} width={155} />
              <Tooltip content={<CustomTooltip isDark={isDark} />} />
              <Bar dataKey="count" name="Students" fill={C.purple} radius={[0,3,3,0]}>
                {concerns.slice(0, 12).map((_, i) => (
                  <Cell key={i} fill={i === 0 ? C.purple : C.purple + 'aa'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Intake Funnel" subtitle="From inquiry to ongoing case">
          {!intake ? <Empty /> : (
            <div className="space-y-4">
              {[
                { label: 'Intake Packets Submitted', count: intake.intake_started, pct: 100, color: C.primary },
                { label: 'Intakes Completed',         count: intake.intake_completed, pct: intake.intake_completion_rate, color: C.blue },
                { label: 'Cases Created',             count: intake.cases_created,   pct: intake.case_creation_rate,    color: C.teal },
              ].map(({ label, count, pct, color }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                    <span className="text-xs font-semibold" style={{ color }}>
                      {count.toLocaleString()} {pct < 100 ? `· ${Math.round(pct)}%` : ''}
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Assessment Summary" subtitle="All-time totals by assessment type">
          {assessments.length === 0 ? <Empty /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {['Type', 'Count', 'Avg Score', 'High Risk'].map(h => (
                      <th key={h} className="pb-2 text-left font-semibold" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {assessments.slice(0, 8).map(a => {
                    const highRiskCount = (a.risk_breakdown?.HIGH ?? 0) + (a.risk_breakdown?.RED ?? 0) + (a.risk_breakdown?.CRITICAL ?? 0);
                    return (
                      <tr key={a._id}>
                        <td className="py-2 font-medium" style={{ color: 'var(--color-text-primary)' }}>{a._id || '—'}</td>
                        <td className="py-2" style={{ color: 'var(--color-text-secondary)' }}>{a.count}</td>
                        <td className="py-2" style={{ color: 'var(--color-text-secondary)' }}>{a.avg_score ? Math.round(a.avg_score) : '—'}</td>
                        <td className="py-2" style={{ color: highRiskCount > 0 ? C.red : 'var(--color-text-muted)' }}>
                          {highRiskCount > 0 ? highRiskCount : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Tab: Staff Workload ────────────────────────────────────────────────────────

function StaffTab({ staff, referrals, isDark }: {
  staff: StaffMember[]; referrals: ReferralSummary | null; isDark: boolean;
}) {
  const ct = useChartTheme(isDark);
  const [sortBy, setSortBy] = useState<'cases' | 'sessions' | 'name'>('cases');

  const sorted = [...staff].sort((a, b) => {
    if (sortBy === 'cases')    return b.active_cases - a.active_cases;
    if (sortBy === 'sessions') return b.week_completed - a.week_completed;
    return a.name.localeCompare(b.name);
  });

  const maxCases = Math.max(...staff.map(s => s.active_cases), 1);
  const CAPACITY = 25;

  return (
    <div className="space-y-6">
      <Card
        title="Counselor & Psychologist Workload"
        subtitle="Active caseload and sessions completed this week"
        action={
          <div className="flex gap-1">
            {(['cases', 'sessions', 'name'] as const).map(k => (
              <button key={k} onClick={() => setSortBy(k)}
                className="px-2.5 py-1 text-xs rounded-md transition"
                style={{
                  background: sortBy === k ? 'var(--color-primary)' : 'var(--color-bg)',
                  color:      sortBy === k ? '#fff' : 'var(--color-text-secondary)',
                  border:     `1px solid ${sortBy === k ? 'var(--color-primary)' : 'var(--color-border)'}`,
                }}>
                {k === 'cases' ? 'By Cases' : k === 'sessions' ? 'By Sessions' : 'By Name'}
              </button>
            ))}
          </div>
        }
      >
        {staff.length === 0 ? <Empty text="No staff data" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left pb-2.5 font-semibold text-xs" style={{ color: 'var(--color-text-muted)' }}>Name</th>
                  <th className="text-left pb-2.5 font-semibold text-xs" style={{ color: 'var(--color-text-muted)' }}>Role</th>
                  <th className="text-right pb-2.5 font-semibold text-xs" style={{ color: 'var(--color-text-muted)' }}>Active Cases</th>
                  <th className="text-right pb-2.5 font-semibold text-xs" style={{ color: 'var(--color-text-muted)' }}>Sessions (7d)</th>
                  <th className="text-left pb-2.5 font-semibold text-xs pl-4" style={{ color: 'var(--color-text-muted)' }}>Capacity</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(s => {
                  const pct = Math.min(Math.round((s.active_cases / CAPACITY) * 100), 100);
                  const barColor = pct >= 90 ? C.red : pct >= 70 ? C.amber : C.green;
                  return (
                    <tr key={s.name} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{s.name}</td>
                      <td className="py-3 text-xs">
                        <span className="px-2 py-0.5 rounded uppercase font-semibold"
                          style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                          {s.role}
                        </span>
                      </td>
                      <td className="py-3 text-right font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
                        {s.active_cases}
                      </td>
                      <td className="py-3 text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                        {s.week_completed}
                      </td>
                      <td className="py-3 pl-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                          </div>
                          <span className="text-xs font-medium w-8" style={{ color: barColor }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
              Capacity % assumes a {CAPACITY}-case maximum per clinician. Adjust based on your institution's guidelines.
            </p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Caseload Distribution" subtitle="Comparative view across clinical staff">
          {staff.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={Math.max(180, sorted.slice(0, 8).length * 32)}>
              <BarChart data={sorted.slice(0, 8).map(s => ({ name: s.name.split(' ')[0], cases: s.active_cases, sessions: s.week_completed }))}
                layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal={false} />
                <XAxis type="number" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Legend wrapperStyle={{ fontSize: 11, color: ct.text }} />
                <Bar dataKey="cases"    name="Active Cases"    fill={C.primary} radius={[0,3,3,0]} barSize={10} />
                <Bar dataKey="sessions" name="Sessions (7d)"   fill={C.teal}    radius={[0,3,3,0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Referral Summary" subtitle="Student referrals to external or internal services">
          {!referrals ? <Empty text="No referral data" /> : (
            <div className="space-y-4">
              <MetricRow items={[
                { label: 'Total',     value: referrals.total_referrals, accent: C.primary },
                { label: 'Pending',   value: referrals.pending,         accent: C.amber },
                { label: 'Completed', value: referrals.completed,       accent: C.green },
              ]} />
              {referrals.referral_types.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>BY TYPE</p>
                  <div className="space-y-1.5">
                    {referrals.referral_types.slice(0, 6).map(t => (
                      <div key={t.type} className="flex items-center justify-between text-xs">
                        <span style={{ color: 'var(--color-text-secondary)' }}>{t.type || 'Unspecified'}</span>
                        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{t.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Tab: Reports & Export ──────────────────────────────────────────────────────

function toCSV(rows: Record<string, string>[]): string {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  return [keys.join(','), ...rows.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
}
function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function ReportsTab({ cpsSummary }: { cpsSummary: CpsSummary | null }) {
  const [month, setMonth] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [dlMsg, setDlMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const download = async (sheet: string, label: string) => {
    setDownloading(sheet);
    setDlMsg(null);
    try {
      const token = localStorage.getItem('token');
      const qs = new URLSearchParams({ sheet });
      if (month) qs.set('month', month);
      const r = await fetch(api(`/api/reports/cps-export?${qs}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Export failed'); }
      const data = await r.json();
      const rows = data.rows ?? [];
      if (!rows.length) { setDlMsg({ type: 'err', text: `No data${month ? ` for ${month}` : ''}.` }); return; }
      downloadCSV(toCSV(rows), `${label.replace(/\s+/g, '_')}_${month || 'all'}.csv`);
      setDlMsg({ type: 'ok', text: `Downloaded ${rows.length} rows.` });
    } catch (e: unknown) {
      setDlMsg({ type: 'err', text: (e as Error).message });
    } finally {
      setDownloading(null);
    }
  };

  const downloadAppointments = async () => {
    setDownloading('appointments');
    setDlMsg(null);
    try {
      const token = localStorage.getItem('token');
      const qs = month ? `?month=${month}` : '';
      const r = await fetch(api(`/api/reports/appointments-csv${qs}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Export failed'); }
      const data = await r.json();
      const rows = data.rows ?? [];
      if (!rows.length) { setDlMsg({ type: 'err', text: `No appointment data${month ? ` for ${month}` : ''}.` }); return; }
      downloadCSV(toCSV(rows), `Appointments_${month || 'all'}.csv`);
      setDlMsg({ type: 'ok', text: `Downloaded ${rows.length} rows.` });
    } catch (e: unknown) {
      setDlMsg({ type: 'err', text: (e as Error).message });
    } finally {
      setDownloading(null);
    }
  };

  const exports = [
    { id: 'new-clients',       label: 'New Clients',                         desc: 'Service requests — date, source, student details, intake counselor, status' },
    { id: 'counseling-cases',  label: 'Existing Clients (Counseling)',        desc: 'Active counseling caseload — counselor, sessions, risk level, status' },
    { id: 'checkins',          label: 'Non-Counseling Clients (Check-in)',    desc: 'Check-in-only clients — counselor, concern, last check-in, status' },
  ];

  return (
    <div className="space-y-6">
      {cpsSummary && (
        <div>
          <SectionLabel>CPS Client Tracking Overview</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'New Client Requests', value: cpsSummary.new_clients.total, sub: `${cpsSummary.new_clients.this_month} this month`, color: C.green },
              { label: 'Counseling Cases (Active)', value: cpsSummary.counseling_cases.active, sub: `${cpsSummary.counseling_cases.total} total`, color: C.primary },
              { label: 'Check-in Clients', value: cpsSummary.checkins.total_clients, sub: `${cpsSummary.checkins.checkins_this_month} check-ins this month`, color: C.purple },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
                <p className="text-2xl font-bold" style={{ color }}>{value.toLocaleString()}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionLabel>Data Export</SectionLabel>
        <div className="rounded-xl p-5 space-y-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Filter by month (optional)
              </label>
              <input type="month" value={month} onChange={e => { setMonth(e.target.value); setDlMsg(null); }}
                className="rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }} />
            </div>
            {month && (
              <button onClick={() => setMonth('')}
                className="mt-5 text-xs px-2 py-1.5 rounded-lg"
                style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                Clear
              </button>
            )}
          </div>

          <div className="space-y-3">
            {exports.map(({ id, label, desc }) => (
              <div key={id} className="flex items-center justify-between gap-4 p-3 rounded-lg"
                style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
                </div>
                <button onClick={() => download(id, label)}
                  disabled={downloading === id}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition disabled:opacity-50 flex-shrink-0"
                  style={{ background: 'var(--color-primary)', color: '#fff' }}>
                  {downloading === id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  {downloading === id ? 'Exporting…' : 'Export CSV'}
                </button>
              </div>
            ))}

            <div className="flex items-center justify-between gap-4 p-3 rounded-lg"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>All Appointments</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Appointment log — date, student, counselor, type, method, status, concern
                </p>
              </div>
              <button onClick={downloadAppointments}
                disabled={downloading === 'appointments'}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition disabled:opacity-50 flex-shrink-0"
                style={{ background: 'var(--color-primary)', color: '#fff' }}>
                {downloading === 'appointments' ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                {downloading === 'appointments' ? 'Exporting…' : 'Export CSV'}
              </button>
            </div>
          </div>

          {dlMsg && (
            <p className="text-xs" style={{ color: dlMsg.type === 'ok' ? C.green : C.red }}>
              {dlMsg.type === 'ok' ? '✓ ' : '✗ '}{dlMsg.text}
            </p>
          )}

          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Exports are plain CSV files compatible with Microsoft Excel, Google Sheets, and SPSS.
            Leave the month filter empty to export all records.
          </p>
        </div>
      </div>

      <div>
        <SectionLabel>Detailed Report Pages</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { href: '/admin/reports/cases',      label: 'Case Statistics',     desc: 'Monthly case volume table with new/closed breakdown' },
            { href: '/admin/reports/users',      label: 'User Report',         desc: 'Registered users by role and account status' },
            { href: '/admin/reports/compliance', label: 'Compliance Report',   desc: 'Audit trail, data access, and privacy compliance summary' },
            { href: '/staff/workload-report',    label: 'Staff Workload Report', desc: 'Detailed per-counselor schedule and session counts' },
          ].map(({ href, label, desc }) => (
            <Link key={href} href={href}
              className="flex items-center justify-between p-3 rounded-lg transition group"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-bg)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
              </div>
              <ChevronRight size={16} className="flex-shrink-0 ml-2" style={{ color: 'var(--color-text-muted)' }} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AnalyticsDashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab]         = useState<TabKey>('overview');
  const [periodIdx, setPeriodIdx]         = useState(2);           // default: last 6 months
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const loadedTabs                         = useRef(new Set<TabKey>(['overview']));

  // ── Data state ──
  const [summary, setSummary]             = useState<Summary | null>(null);
  const [monthlyAppts, setMonthlyAppts]   = useState<MonthlyAppt[]>([]);
  const [monthlyCases, setMonthlyCases]   = useState<MonthlyCase[]>([]);
  const [staff, setStaff]                 = useState<StaffMember[]>([]);
  const [apptStats, setApptStats]         = useState<ApptStats | null>(null);
  const [byDay, setByDay]                 = useState<DayCount[]>([]);
  const [byHour, setByHour]               = useState<HourCount[]>([]);
  const [riskDist, setRiskDist]           = useState<RiskDist>({});
  const [concerns, setConcerns]           = useState<ConcernItem[]>([]);
  const [scoreTrends, setScoreTrends]     = useState<ScoreTrend[]>([]);
  const [assessments, setAssessments]     = useState<AssessmentType[]>([]);
  const [intake, setIntake]               = useState<IntakeFunnel | null>(null);
  const [referrals, setReferrals]         = useState<ReferralSummary | null>(null);
  const [cpsSummary, setCpsSummary]       = useState<CpsSummary | null>(null);

  const period = PERIODS[periodIdx];

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const safe = async (url: string) => {
      try { const r = await fetch(api(url), { headers: h }); return r.ok ? r.json() : null; }
      catch { return null; }
    };
    const days   = period.days;
    const months = period.months;
    const [s, ma, mc, risk, workload, aStats, dayData, cData, sTrends, assess, funnel, ref, cps] = await Promise.all([
      safe('/api/analytics/summary'),
      safe(`/api/analytics/appointments/monthly?months=${months}`),
      safe(`/api/analytics/cases/monthly?months=${months}`),
      safe('/api/analytics/risk/trends'),
      safe('/api/analytics/staff/workload'),
      safe(`/api/analytics/appointments/statistics?days=${days}`),
      safe(`/api/analytics/appointments/by-day?days=${days}`),
      safe('/api/analytics/concerns/distribution'),
      safe('/api/analytics/assessments/score-trends'),
      safe('/api/analytics/assessments/distribution'),
      safe('/api/analytics/intake/conversion'),
      safe('/api/analytics/referrals/summary'),
      safe('/api/reports/cps-summary'),
    ]);
    if (s)        setSummary(s);
    if (ma)       setMonthlyAppts(ma.months ?? []);
    if (mc)       setMonthlyCases(mc.months ?? []);
    if (risk)     setRiskDist(risk.current_risk_distribution ?? {});
    if (workload) setStaff(workload.staff_workload ?? []);
    if (aStats)   setApptStats(aStats);
    if (dayData)  { setByDay(dayData.by_day ?? []); setByHour(dayData.by_hour ?? []); }
    if (cData)    setConcerns(cData.concerns ?? []);
    if (sTrends)  setScoreTrends(sTrends.months ?? []);
    if (assess)   setAssessments(assess.assessment_types ?? []);
    if (funnel)   setIntake(funnel);
    if (ref)      setReferrals(ref);
    if (cps)      setCpsSummary(cps);
    setLoading(false);
    setRefreshing(false);
  }, [period.days, period.months]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    loadedTabs.current.add(tab);
  };

  if (loading) {
    return (
      <DashboardPageWrapper title="Analytics & Reports" subtitle="System-wide metrics and data exports">
        <div className="flex items-center justify-center h-80 gap-2" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={24} className="animate-spin" /> Loading analytics…
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Analytics & Reports" subtitle="System-wide metrics and data exports">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* Period selector */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
          {PERIODS.map((p, i) => (
            <button key={p.label} onClick={() => setPeriodIdx(i)}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition"
              style={{
                background: periodIdx === i ? 'var(--color-surface)' : 'transparent',
                color:      periodIdx === i ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                boxShadow:  periodIdx === i ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}>
              {p.label}
            </button>
          ))}
        </div>
        <button onClick={() => fetchAll(true)} disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition disabled:opacity-50"
          style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-0 mb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {TAB_LIST.map(t => (
          <button key={t.key} onClick={() => handleTabChange(t.key)}
            className="px-4 py-2.5 text-sm font-medium transition relative"
            style={{ color: activeTab === t.key ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
            {t.label}
            {activeTab === t.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ background: 'var(--color-primary)' }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'overview' && (
        <OverviewTab
          summary={summary}
          monthlyAppts={monthlyAppts}
          monthlyCases={monthlyCases}
          staff={staff}
          isDark={isDark}
        />
      )}
      {activeTab === 'appointments' && (
        <AppointmentsTab
          apptStats={apptStats}
          byDay={byDay}
          byHour={byHour}
          monthlyAppts={monthlyAppts}
          isDark={isDark}
        />
      )}
      {activeTab === 'cases' && (
        <CasesTab
          riskDist={riskDist}
          concerns={concerns}
          scoreTrends={scoreTrends}
          assessments={assessments}
          intake={intake}
          isDark={isDark}
        />
      )}
      {activeTab === 'staff' && (
        <StaffTab
          staff={staff}
          referrals={referrals}
          isDark={isDark}
        />
      )}
      {activeTab === 'reports' && (
        <ReportsTab cpsSummary={cpsSummary} />
      )}
    </DashboardPageWrapper>
  );
}
