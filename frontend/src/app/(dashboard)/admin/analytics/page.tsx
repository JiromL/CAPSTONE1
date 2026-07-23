'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  AlertTriangle, FileText, RefreshCw, Loader2, Download,
  Users, Clock, ChevronRight, Activity, Brain, TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/utils/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Summary {
  total_cases: number; active_cases: number; closed_cases: number;
  high_risk_cases: number; total_students: number;
  total_counselors: number; total_psychologists: number;
  week_appointments: number; pending_appointments: number; month_assessments: number;
}
interface MonthlyAppt  { short: string; label: string; total: number; completed: number; cancelled: number; no_show: number; }
interface MonthlyCase  { short: string; label: string; new_cases: number; closed_cases: number; high_risk: number; }
interface StaffMember  { name: string; role: string; active_cases: number; week_completed: number; }
interface ApptStats    { completion_rate: number; no_show_rate: number; avg_wait_days: number; total_appointments: number; completed: number; no_shows: number; cancelled: number; }
interface DayCount     { day: string; count: number; }
interface HourCount    { hour: string; count: number; }
interface RiskDist     { [key: string]: number; }
interface ConcernItem  { concern: string; count: number; }
interface ScoreTrend   { short: string; label: string; phq9: number | null; gad7: number | null; }
interface AssessmentType { _id: string; count: number; avg_score: number; risk_breakdown: Record<string, number>; }
interface IntakeFunnel { intake_started: number; intake_completed: number; cases_created: number; intake_completion_rate: number; case_creation_rate: number; }
interface ReferralSummary { total_referrals: number; pending: number; completed: number; referral_types: { type: string; count: number }[]; }
interface CpsSummary   { new_clients: { total: number; this_month: number }; counseling_cases: { total: number; active: number }; checkins: { total_clients: number; checkins_this_month: number }; }
interface ApptBreakdown {
  method_distribution: Record<string, number>;
  type_distribution:   Record<string, number>;
  monthly: { short: string; f2f: number; online: number; intake: number; counseling: number }[];
}
interface StudentDemographics {
  college_distribution:    { college: string; count: number }[];
  year_level_distribution: { year_level: string; count: number }[];
  total_students: number; students_served: number; utilization_rate: number;
}
interface CasesPipeline {
  pipeline:             { stage: string; count: number }[];
  source_distribution:  { source: string; count: number }[];
  endorsement_routing:  Record<string, number>;
  top_diagnoses:        { name: string; count: number }[];
  stuck_new_cases:      number;
}
interface SessionOutcomes {
  mood_monthly:               { short: string; avg_mood: number | null; session_count: number }[];
  risk_flagged_sessions:      number;
  total_sessions:             number;
  flagged_rate:               number;
  session_type_distribution:  { type: string; count: number }[];
  perma_label_distribution:   { label: string; count: number }[];
  noshows_at_risk:            number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const C = {
  primary: '#2352CC', green: '#059669', red: '#DC2626', amber: '#D97706',
  blue: '#3B82F6', purple: '#7C3AED', slate: '#64748B', teal: '#0D9488',
  rose: '#E11D48', orange: '#EA580C', cyan: '#0891B2',
};
const RISK_COLORS: Record<string, string> = {
  GREEN: C.green, YELLOW: C.amber, ORANGE: C.orange, RED: C.red,
  CRITICAL: '#7F1D1D', LOW: C.teal, MODERATE: C.blue, HIGH: C.red,
};
const PERMA_COLORS: Record<string, string> = {
  Thriving: C.green, Flourishing: '#16A34A', Doing_Well: C.teal,
  Managing: C.blue, Struggling: C.amber, 'At Risk': C.orange,
  'In Crisis': C.red,
};
const PIPELINE_ORDER = ['NEW', 'INTAKE_SCHEDULED', 'ACTIVE', 'PENDING_TERMINATION', 'CLOSED', 'CANCELLED'];
const PIPELINE_LABELS: Record<string, string> = {
  NEW: 'New', INTAKE_SCHEDULED: 'Intake Scheduled', ACTIVE: 'Active',
  PENDING_TERMINATION: 'Pending Close', CLOSED: 'Closed', CANCELLED: 'Cancelled',
};
const PIPELINE_COLORS: Record<string, string> = {
  NEW: C.blue, INTAKE_SCHEDULED: C.cyan, ACTIVE: C.green,
  PENDING_TERMINATION: C.amber, CLOSED: C.slate, CANCELLED: C.red + '99',
};

const TAB_LIST = [
  { key: 'overview',      label: 'Overview'          },
  { key: 'appointments',  label: 'Appointments'      },
  { key: 'cases',         label: 'Cases & Students'  },
  { key: 'staff',         label: 'Staff Workload'    },
  { key: 'outcomes',      label: 'Clinical Outcomes' },
  { key: 'ratings',       label: 'Session Ratings'   },
  { key: 'reports',       label: 'Reports & Export'  },
] as const;
type TabKey = typeof TAB_LIST[number]['key'];

const PERIODS = [
  { label: '30 days',   days: 30,  months: 3  },
  { label: '3 months',  days: 90,  months: 6  },
  { label: '6 months',  days: 180, months: 6  },
  { label: '1 year',    days: 365, months: 12 },
];

// ── Shared components ─────────────────────────────────────────────────────────

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
          {typeof p.value === 'number' ? p.value.toLocaleString('en-PH') : p.value}
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
        <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
        <p className="text-xl font-bold leading-tight mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : <div>{inner}</div>;
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

// simple donut with a centre label + side legend
function DonutCard({
  title, subtitle, data, colors, centerLabel, centerSub,
}: {
  title: string; subtitle?: string;
  data: { name: string; value: number }[];
  colors: string[]; centerLabel?: string; centerSub?: string;
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <Card title={title} subtitle={subtitle}>
      {total === 0 ? <Empty /> : (
        <div className="flex items-center gap-4">
          <div style={{ width: 140, flexShrink: 0, position: 'relative' }}>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
                  {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {centerLabel && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>{centerLabel}</span>
                {centerSub && <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{centerSub}</span>}
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2 min-w-0">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: colors[i % colors.length] }} />
                  <span className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{d.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>{d.value}</span>
                  <span className="text-xs w-9 text-right" style={{ color: 'var(--color-text-muted)' }}>
                    {total > 0 ? `${Math.round(d.value / total * 100)}%` : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────

function OverviewTab({ summary, monthlyAppts, monthlyCases, staff, pipeline, sessionOutcomes, isDark }: {
  summary: Summary | null;
  monthlyAppts: MonthlyAppt[];
  monthlyCases: MonthlyCase[];
  staff: StaffMember[];
  pipeline: CasesPipeline | null;
  sessionOutcomes: SessionOutcomes | null;
  isDark: boolean;
}) {
  const ct = useChartTheme(isDark);
  const maxCases = Math.max(...staff.map(s => s.active_cases), 1);

  const attentionItems = [
    summary?.pending_appointments && summary.pending_appointments > 0
      ? { text: `${summary.pending_appointments} appointment request${summary.pending_appointments !== 1 ? 's' : ''} awaiting assignment`, href: '/appointment-requests', color: C.amber }
      : null,
    summary?.high_risk_cases && summary.high_risk_cases > 0
      ? { text: `${summary.high_risk_cases} student${summary.high_risk_cases !== 1 ? 's' : ''} at RED or CRITICAL risk`, href: '/high-risk', color: C.red }
      : null,
    pipeline?.stuck_new_cases && pipeline.stuck_new_cases > 0
      ? { text: `${pipeline.stuck_new_cases} case${pipeline.stuck_new_cases !== 1 ? 's' : ''} in NEW status for more than 7 days — needs assignment`, href: '/cases', color: C.orange }
      : null,
    sessionOutcomes?.noshows_at_risk && sessionOutcomes.noshows_at_risk > 0
      ? { text: `${sessionOutcomes.noshows_at_risk} student${sessionOutcomes.noshows_at_risk !== 1 ? 's' : ''} with 2+ consecutive no-shows — at risk of auto-closure`, href: '/appointments', color: C.amber }
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
              className="flex items-center justify-between px-4 py-2.5 border-b last:border-b-0"
              style={{ borderColor: 'var(--color-warning)' }}>
              <span className="text-sm" style={{ color: 'var(--color-warning-text)' }}>{item.text}</span>
              <ChevronRight size={14} style={{ color: 'var(--color-warning)' }} />
            </Link>
          ))}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Kpi label="Active Cases"     value={summary.active_cases}     sub={`${summary.total_cases} total`}         icon={<FileText size={14}/>}      color={C.primary} />
          <Kpi label="High Risk"        value={summary.high_risk_cases}  sub="RED / CRITICAL"                          icon={<AlertTriangle size={14}/>} color={C.red}     href="/high-risk" />
          <Kpi label="Students"         value={summary.total_students}   sub="registered"                              icon={<Users size={14}/>}         color={C.blue}    />
          <Kpi label="Pending Requests" value={summary.pending_appointments} sub="awaiting approval"                   icon={<Clock size={14}/>}         color={C.amber}   href="/appointment-requests" />
          <Kpi label="Clinical Staff"   value={summary.total_counselors + summary.total_psychologists}
               sub={`${summary.total_counselors}CC · ${summary.total_psychologists}CP`}                                icon={<Activity size={14}/>}      color={C.teal}    />
        </div>
      )}

      {pipeline && pipeline.pipeline.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>Case Pipeline</p>
          <div className="flex items-stretch gap-0 overflow-x-auto">
            {pipeline.pipeline.filter(s => s.count > 0 || ['NEW','ACTIVE','CLOSED'].includes(s.stage)).map((s, i, arr) => {
              const color = PIPELINE_COLORS[s.stage] ?? C.slate;
              return (
                <React.Fragment key={s.stage}>
                  <div className="flex flex-col items-center flex-1 min-w-[80px]">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-1"
                      style={{ background: color + '20', color, border: `2px solid ${color}` }}>
                      {s.count}
                    </div>
                    <span className="text-xs text-center leading-tight" style={{ color: 'var(--color-text-muted)' }}>
                      {PIPELINE_LABELS[s.stage]}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="flex items-start pt-5 px-1" style={{ color: 'var(--color-border-strong)' }}>
                      <ChevronRight size={12} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
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
                <Bar dataKey="completed" name="Completed" stackId="a" fill={C.green} />
                <Bar dataKey="no_show"   name="No-show"   stackId="a" fill={C.amber} />
                <Bar dataKey="cancelled" name="Cancelled" stackId="a" fill={C.slate} radius={[3,3,0,0]} />
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
                    <span className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{s.name.split(' ')[0]}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded uppercase font-semibold"
                      style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                      {s.role === 'PSYCHOLOGIST' ? 'CP' : s.role === 'IC' ? 'IC' : 'CC'}
                    </span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <span className="text-xs font-semibold w-8 text-right" style={{ color: barColor }}>{s.active_cases}</span>
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

// ── Tab: Appointments ─────────────────────────────────────────────────────────

function AppointmentsTab({ apptStats, byDay, byHour, monthlyAppts, breakdown, isDark }: {
  apptStats: ApptStats | null;
  byDay: DayCount[]; byHour: HourCount[];
  monthlyAppts: MonthlyAppt[];
  breakdown: ApptBreakdown | null;
  isDark: boolean;
}) {
  const ct = useChartTheme(isDark);

  const methodData = breakdown
    ? Object.entries(breakdown.method_distribution).map(([k, v]) => ({ name: k, value: v }))
    : [];
  const typeData = breakdown
    ? Object.entries(breakdown.type_distribution).map(([k, v]) => ({ name: k, value: v }))
    : [];

  return (
    <div className="space-y-6">
      {apptStats && (
        <Card title="Performance Overview" subtitle={`Last 30 days — ${apptStats.total_appointments.toLocaleString('en-PH')} appointments total`}>
          <MetricRow items={[
            { label: 'Completion Rate', value: `${apptStats.completion_rate}%`,  accent: apptStats.completion_rate >= 75 ? C.green : C.amber },
            { label: 'No-Show Rate',    value: `${apptStats.no_show_rate}%`,     accent: apptStats.no_show_rate > 15 ? C.red : apptStats.no_show_rate > 8 ? C.amber : C.green },
            { label: 'Avg Wait Days',   value: `${apptStats.avg_wait_days}d`,    accent: apptStats.avg_wait_days > 7 ? C.red : C.primary },
            { label: 'Cancellations',   value: apptStats.cancelled,              accent: C.slate },
            { label: 'No-shows',        value: apptStats.no_shows,               accent: C.amber },
          ]} />
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DonutCard
          title="Session Mode"
          subtitle="How students prefer to meet — informs room and video capacity planning"
          data={methodData}
          colors={[C.primary, C.teal, C.blue, C.slate]}
          centerLabel={methodData.reduce((a, d) => a + d.value, 0).toString()}
          centerSub="total"
        />
        <DonutCard
          title="Appointment Type"
          subtitle="Balance between first-time intakes and ongoing counseling sessions"
          data={typeData}
          colors={[C.purple, C.green, C.blue, C.amber]}
          centerLabel={typeData.reduce((a, d) => a + d.value, 0).toString()}
          centerSub="total"
        />
      </div>

      {breakdown && breakdown.monthly.length > 0 && (
        <Card title="Session Mode Trend" subtitle="F2F vs Online demand over time — useful for scheduling in-person slots">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={breakdown.monthly} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
              <XAxis dataKey="short" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip isDark={isDark} />} />
              <Legend wrapperStyle={{ fontSize: 11, color: ct.text }} />
              <Line type="monotone" dataKey="f2f"    name="Face-to-Face" stroke={C.primary} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="online" name="Online"       stroke={C.teal}    strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card title="Monthly Volume & Outcomes" subtitle="Completed sessions vs. fallthrough — 12-month view">
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
        <Card title="Demand by Day of Week" subtitle="Which days should counselors prioritize availability?">
          {byDay.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byDay} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Bar dataKey="count" name="Appointments" fill={C.primary} radius={[3,3,0,0]}>
                  {byDay.map((entry, i) => {
                    const max = Math.max(...byDay.map(d => d.count));
                    return <Cell key={i} fill={entry.count === max ? C.blue : C.primary + '88'} />;
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
                    const max = Math.max(...byHour.map(h => h.count));
                    return <Cell key={i} fill={entry.count === max ? C.teal : C.teal + '88'} />;
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

// ── Tab: Cases & Students ─────────────────────────────────────────────────────

function CasesTab({ riskDist, concerns, scoreTrends, assessments, intake, demographics, pipeline, isDark }: {
  riskDist: RiskDist; concerns: ConcernItem[]; scoreTrends: ScoreTrend[];
  assessments: AssessmentType[]; intake: IntakeFunnel | null;
  demographics: StudentDemographics | null; pipeline: CasesPipeline | null;
  isDark: boolean;
}) {
  const ct = useChartTheme(isDark);
  const riskData = Object.entries(riskDist).filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k, value: v, fill: RISK_COLORS[k] ?? C.slate }));
  const totalRisk = riskData.reduce((a, d) => a + d.value, 0);
  const riskOrder = ['GREEN', 'YELLOW', 'ORANGE', 'RED', 'CRITICAL'];
  const sortedRisk = [...riskData].sort((a, b) => riskOrder.indexOf(a.name) - riskOrder.indexOf(b.name));

  return (
    <div className="space-y-6">

      {/* ── Student Reach ── */}
      {demographics && (
        <>
          <SectionLabel>Who Uses CPS Services</SectionLabel>
          {demographics.utilization_rate > 0 && (
            <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary-muted)' }}>
              <div className="text-center px-4 border-r" style={{ borderColor: 'var(--color-primary-muted)' }}>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>{demographics.utilization_rate}%</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-primary-text)' }}>service utilization</p>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-primary-text)' }}>
                <strong>{demographics.students_served.toLocaleString('en-PH')}</strong> of <strong>{demographics.total_students.toLocaleString('en-PH')}</strong> registered
                students have used CPS services at least once. Students not yet reached may benefit from targeted outreach.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="By College / Unit" subtitle="Which colleges are most represented? Are any underserved?">
              {demographics.college_distribution.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={Math.max(160, demographics.college_distribution.length * 28)}>
                  <BarChart data={demographics.college_distribution} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal={false} />
                    <XAxis type="number" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="college" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip content={<CustomTooltip isDark={isDark} />} />
                    <Bar dataKey="count" name="Students" fill={C.primary} radius={[0,3,3,0]}>
                      {demographics.college_distribution.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? C.primary : C.primary + '99'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card title="By Year Level" subtitle="Are senior students or freshmen seeking more support?">
              {demographics.year_level_distribution.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={demographics.year_level_distribution} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                    <XAxis dataKey="year_level" tick={{ fill: ct.text, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip isDark={isDark} />} />
                    <Bar dataKey="count" name="Students" fill={C.blue} radius={[3,3,0,0]}>
                      {demographics.year_level_distribution.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? C.blue : C.blue + '99'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </>
      )}

      {/* ── Risk & Clinical ── */}
      <SectionLabel>Risk & Clinical</SectionLabel>
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
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.fill }} />
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

        <Card title="PHQ-9 & GAD-7 Score Trends" subtitle="Monthly averages — a downward trend indicates improved wellbeing">
          {scoreTrends.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={scoreTrends} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="short" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 27]} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Legend wrapperStyle={{ fontSize: 11, color: ct.text }} />
                <Line type="monotone" dataKey="phq9" name="PHQ-9 Avg" stroke={C.primary} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="gad7" name="GAD-7 Avg" stroke={C.orange}  strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ── Presenting Concerns ── */}
      <Card title="Top Presenting Concerns" subtitle="Most common reasons students seek counseling — informs service planning and resource focus">
        {concerns.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={Math.max(200, concerns.slice(0, 12).length * 28)}>
            <BarChart data={concerns.slice(0, 12)} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal={false} />
              <XAxis type="number" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="concern" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} width={155} />
              <Tooltip content={<CustomTooltip isDark={isDark} />} />
              <Bar dataKey="count" name="Students" fill={C.purple} radius={[0,3,3,0]}>
                {concerns.slice(0, 12).map((_, i) => <Cell key={i} fill={i === 0 ? C.purple : C.purple + 'aa'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* ── Case Source & Diagnoses ── */}
      {pipeline && (
        <>
          <SectionLabel>Case Origin & Diagnoses</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DonutCard
              title="How Students Arrive"
              subtitle="Walk-in vs. online — guides outreach and intake channel investment"
              data={pipeline.source_distribution.map(s => ({ name: s.source, value: s.count }))}
              colors={[C.primary, C.teal, C.blue, C.slate]}
            />

            <Card title="Endorsement Routing" subtitle="Cases routed to Counselor vs. Psychologist — clinical complexity indicator">
              {Object.keys(pipeline.endorsement_routing).length === 0 ? <Empty /> : (
                <div className="space-y-3 pt-2">
                  {Object.entries(pipeline.endorsement_routing).map(([role, count]) => {
                    const total = Object.values(pipeline.endorsement_routing).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? Math.round(count / total * 100) : 0;
                    const color = role === 'PSYCHOLOGIST' ? C.purple : role === 'COUNSELOR' ? C.primary : C.teal;
                    return (
                      <div key={role}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                            {role === 'PSYCHOLOGIST' ? 'Clinical Psychologist (CP)' : role === 'COUNSELOR' ? 'Counselor (CC)' : role}
                          </span>
                          <span className="text-xs font-bold" style={{ color }}>
                            {count} · {pct}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-xs pt-1" style={{ color: 'var(--color-text-muted)' }}>
                    A high CP ratio suggests an increasingly clinical caseload.
                  </p>
                </div>
              )}
            </Card>
          </div>

          {pipeline.top_diagnoses.length > 0 && (
            <Card title="Top Clinical Diagnoses (ICD-10)" subtitle="Most frequently recorded diagnoses across active and closed cases">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <th className="pb-2 text-left font-semibold w-8 pr-3" style={{ color: 'var(--color-text-muted)' }}>#</th>
                      <th className="pb-2 text-left font-semibold" style={{ color: 'var(--color-text-muted)' }}>Diagnosis</th>
                      <th className="pb-2 text-right font-semibold" style={{ color: 'var(--color-text-muted)' }}>Cases</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipeline.top_diagnoses.map((d, i) => (
                      <tr key={d.name} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td className="py-2 pr-3 font-mono" style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                        <td className="py-2 font-medium" style={{ color: 'var(--color-text-primary)' }}>{d.name}</td>
                        <td className="py-2 text-right font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{d.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Intake Funnel & Assessments ── */}
      <SectionLabel>Intake & Assessments</SectionLabel>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Intake Funnel" subtitle="Conversion from inquiry to ongoing case">
          {!intake ? <Empty /> : (
            <div className="space-y-4">
              {[
                { label: 'Intake Packets Submitted', count: intake.intake_started,   pct: 100,                           color: C.primary },
                { label: 'Intakes Completed',        count: intake.intake_completed, pct: intake.intake_completion_rate, color: C.blue    },
                { label: 'Cases Created',            count: intake.cases_created,    pct: intake.case_creation_rate,    color: C.teal    },
              ].map(({ label, count, pct, color }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                    <span className="text-xs font-semibold" style={{ color }}>
                      {count.toLocaleString('en-PH')}{pct < 100 ? ` · ${Math.round(pct)}%` : ''}
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
                <tbody>
                  {assessments.slice(0, 8).map(a => {
                    const highRisk = (a.risk_breakdown?.HIGH ?? 0) + (a.risk_breakdown?.RED ?? 0) + (a.risk_breakdown?.CRITICAL ?? 0);
                    return (
                      <tr key={a._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td className="py-2 font-medium" style={{ color: 'var(--color-text-primary)' }}>{a._id || '—'}</td>
                        <td className="py-2" style={{ color: 'var(--color-text-secondary)' }}>{a.count}</td>
                        <td className="py-2" style={{ color: 'var(--color-text-secondary)' }}>{a.avg_score ? Math.round(a.avg_score) : '—'}</td>
                        <td className="py-2" style={{ color: highRisk > 0 ? C.red : 'var(--color-text-muted)' }}>{highRisk > 0 ? highRisk : '—'}</td>
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

// ── Tab: Staff Workload ───────────────────────────────────────────────────────

function StaffTab({ staff, referrals, isDark }: {
  staff: StaffMember[]; referrals: ReferralSummary | null; isDark: boolean;
}) {
  const ct = useChartTheme(isDark);
  const [sortBy, setSortBy] = useState<'cases' | 'sessions' | 'name'>('cases');
  const sorted = [...staff].sort((a, b) =>
    sortBy === 'cases' ? b.active_cases - a.active_cases :
    sortBy === 'sessions' ? b.week_completed - a.week_completed :
    a.name.localeCompare(b.name)
  );
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
                  {['Name', 'Role', 'Active Cases', 'Sessions (7d)', 'Capacity'].map(h => (
                    <th key={h} className={`pb-2.5 font-semibold text-xs ${h === 'Active Cases' || h === 'Sessions (7d)' ? 'text-right' : 'text-left'}`}
                      style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
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
                      <td className="py-3 text-right font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{s.active_cases}</td>
                      <td className="py-3 text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{s.week_completed}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
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
              Capacity % assumes {CAPACITY} cases maximum. Adjust based on institutional guidelines.
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
                <Bar dataKey="cases"    name="Active Cases"  fill={C.primary} radius={[0,3,3,0]} barSize={10} />
                <Bar dataKey="sessions" name="Sessions (7d)" fill={C.teal}    radius={[0,3,3,0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Referral Summary" subtitle="Student referrals to external or internal services">
          {!referrals ? <Empty text="No referral data" /> : (
            <div className="space-y-4">
              <MetricRow items={[
                { label: 'Total',     value: referrals.total_referrals, accent: C.primary },
                { label: 'Pending',   value: referrals.pending,         accent: C.amber   },
                { label: 'Completed', value: referrals.completed,       accent: C.green   },
              ]} />
              {referrals.referral_types.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>By Type</p>
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

// ── Tab: Clinical Outcomes ────────────────────────────────────────────────────

function OutcomesTab({ sessionOutcomes, isDark }: {
  sessionOutcomes: SessionOutcomes | null; isDark: boolean;
}) {
  const ct = useChartTheme(isDark);

  if (!sessionOutcomes) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl p-10 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <Brain size={36} className="mx-auto mb-3" style={{ color: 'var(--color-border-strong)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Clinical outcomes data unavailable</p>
          <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: 'var(--color-text-muted)' }}>
            This tab requires session notes with mood ratings and PERMA check-in data. Make sure the backend is running and session notes exist.
          </p>
        </div>
      </div>
    );
  }

  const permaData = sessionOutcomes.perma_label_distribution.map(d => ({
    name: d.label, value: d.count,
  }));
  const permaColors = permaData.map(d => PERMA_COLORS[d.name] ?? C.slate);

  const totalPerma = permaData.reduce((a, d) => a + d.value, 0);
  const wellbeingRisk = permaData
    .filter(d => ['Struggling', 'At Risk', 'In Crisis'].includes(d.name))
    .reduce((a, d) => a + d.value, 0);

  return (
    <div className="space-y-6">

      {/* ── Safety ── */}
      <SectionLabel>Safety & Risk Monitoring</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl p-4" style={{ background: sessionOutcomes.flagged_rate > 5 ? 'var(--color-danger-surface)' : 'var(--color-surface)', border: `1px solid ${sessionOutcomes.flagged_rate > 5 ? 'var(--color-danger)' : 'var(--color-border)'}` }}>
          <p className="text-xs font-medium mb-1" style={{ color: sessionOutcomes.flagged_rate > 5 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>Risk-Flagged Sessions</p>
          <p className="text-3xl font-bold" style={{ color: sessionOutcomes.flagged_rate > 5 ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>{sessionOutcomes.risk_flagged_sessions}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {sessionOutcomes.flagged_rate}% of {sessionOutcomes.total_sessions} sessions
          </p>
        </div>
        <div className="rounded-xl p-4" style={{ background: sessionOutcomes.noshows_at_risk > 0 ? 'var(--color-warning-surface)' : 'var(--color-surface)', border: `1px solid ${sessionOutcomes.noshows_at_risk > 0 ? 'var(--color-warning)' : 'var(--color-border)'}` }}>
          <p className="text-xs font-medium mb-1" style={{ color: sessionOutcomes.noshows_at_risk > 0 ? 'var(--color-warning-text)' : 'var(--color-text-muted)' }}>Students at No-Show Risk</p>
          <p className="text-3xl font-bold" style={{ color: sessionOutcomes.noshows_at_risk > 0 ? 'var(--color-warning)' : 'var(--color-text-primary)' }}>{sessionOutcomes.noshows_at_risk}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>2+ consecutive no-shows</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Total Sessions Documented</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{sessionOutcomes.total_sessions}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>session notes on record</p>
        </div>
      </div>

      {/* ── Mood Trend ── */}
      <Card
        title="Session Mood Trend"
        subtitle="Monthly average counselor-reported mood score (1–10). Upward trend signals improving wellbeing."
      >
        {sessionOutcomes.mood_monthly.every(m => m.avg_mood === null) ? (
          <Empty text="No mood ratings recorded yet" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={sessionOutcomes.mood_monthly} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
              <XAxis dataKey="short" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} domain={[1, 10]} ticks={[1,2,3,4,5,6,7,8,9,10]} />
              <Tooltip content={<CustomTooltip isDark={isDark} />} />
              <Legend wrapperStyle={{ fontSize: 11, color: ct.text }} />
              {/* Reference bands via a second bar won't work cleanly in recharts without ReferenceLine */}
              <Line type="monotone" dataKey="avg_mood" name="Avg Mood (1–10)" stroke={C.green} strokeWidth={2.5} dot={{ r: 4, fill: C.green }} connectNulls activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="session_count" name="Sessions" stroke={C.slate} strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 2 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* ── PERMA & Session Types ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          title="PERMA Wellbeing Distribution"
          subtitle="Latest wellbeing classification per student from EMA check-ins"
        >
          {totalPerma === 0 ? <Empty text="No PERMA data collected yet" /> : (
            <>
              {wellbeingRisk > 0 && (
                <div className="mb-3 p-2.5 rounded-lg text-xs" style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger)' }}>
                  <strong>{wellbeingRisk}</strong> student{wellbeingRisk !== 1 ? 's' : ''} currently Struggling, At Risk, or In Crisis
                </div>
              )}
              <div className="space-y-2">
                {permaData.map((d, i) => {
                  const color = permaColors[i];
                  const pct = totalPerma > 0 ? Math.round(d.value / totalPerma * 100) : 0;
                  return (
                    <div key={d.name} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-32 flex-shrink-0">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{d.name}</span>
                      </div>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <div className="flex items-center gap-1.5 w-16 flex-shrink-0">
                        <span className="text-xs font-semibold" style={{ color }}>{d.value}</span>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
                Based on most recent EMA entry per student. Students without a recent check-in are not shown.
              </p>
            </>
          )}
        </Card>

        <Card
          title="Session Type Distribution"
          subtitle="Individual vs. group vs. crisis — shows service delivery model"
        >
          {sessionOutcomes.session_type_distribution.length === 0 ? <Empty /> : (
            <>
              <div className="space-y-3 mb-4">
                {sessionOutcomes.session_type_distribution.map(t => {
                  const total = sessionOutcomes.session_type_distribution.reduce((a, b) => a + b.count, 0);
                  const pct = total > 0 ? Math.round(t.count / total * 100) : 0;
                  const colorMap: Record<string, string> = { INDIVIDUAL: C.primary, GROUP: C.teal, CRISIS: C.red, FAMILY: C.purple };
                  const color = colorMap[t.type] ?? C.slate;
                  return (
                    <div key={t.type}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                          {t.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs font-bold" style={{ color }}>{t.count} · {pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                A high CRISIS session count warrants review of crisis response capacity.
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Tab: Session Ratings ──────────────────────────────────────────────────────

const CAT_LABELS: Record<string, string> = {
  counselor_attitude:     'Counselor Attitude',
  online_communication:   'Communication',
  counseling_objectives:  'Session Objectives',
  techniques_used:        'Techniques Used',
  overall_experience:     'Overall Experience',
};

function Stars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} width="11" height="11" viewBox="0 0 12 12" fill={i < Math.round(value) ? '#F59E0B' : 'none'}
          stroke={i < Math.round(value) ? '#F59E0B' : 'var(--color-border)'} strokeWidth="1.2">
          <polygon points="6,1 7.5,4.5 11,5 8.5,7.5 9,11 6,9.5 3,11 3.5,7.5 1,5 4.5,4.5" />
        </svg>
      ))}
      <span className="text-xs font-semibold ml-1 tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
        {value > 0 ? value.toFixed(1) : '—'}
      </span>
    </span>
  );
}

function RatingsTab({ data, isDark }: { data: any; isDark: boolean }) {
  const [view, setView] = useState<'overall' | 'individual'>('overall');
  const [search, setSearch] = useState('');

  if (!data) return (
    <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'var(--color-text-muted)' }}>
      No evaluation data available for this period.
    </div>
  );

  const cats = Object.keys(CAT_LABELS);
  const avgs = data.averages || {};
  const individual: any[] = data.individual || [];

  const filtered = individual.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.counselor_name?.toLowerCase().includes(q)
      || r.liked_most?.toLowerCase().includes(q)
      || r.to_improve?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Ratings', value: data.total ?? 0, sub: null },
          { label: 'Completion Rate', value: `${data.completion_rate ?? 0}%`, sub: `${data.total_completed ?? 0} completed sessions` },
          { label: 'Overall Avg', value: data.overall_avg > 0 ? `${data.overall_avg}/5` : '—', sub: 'across all categories' },
          { label: 'Top Rated', value: (() => {
              const best = cats.reduce((a, b) => (avgs[a] || 0) >= (avgs[b] || 0) ? a : b, cats[0]);
              return avgs[best] > 0 ? CAT_LABELS[best] : '—';
            })(), sub: avgs[cats.reduce((a, b) => (avgs[a] || 0) >= (avgs[b] || 0) ? a : b, cats[0])] > 0
              ? `${avgs[cats.reduce((a, b) => (avgs[a] || 0) >= (avgs[b] || 0) ? a : b, cats[0])]}/5` : null },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-2xl px-4 py-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
            {sub && <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-1 p-0.5 rounded-lg self-start w-fit"
        style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
        {(['overall', 'individual'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className="px-4 py-1.5 text-xs font-medium rounded-md transition capitalize"
            style={{
              background: view === v ? 'var(--color-surface)' : 'transparent',
              color: view === v ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
            {v === 'overall' ? 'Overall' : 'Individual'}
          </button>
        ))}
      </div>

      {view === 'overall' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Category averages */}
          <Card title="Average Scores by Category" subtitle="Across all submitted evaluations">
            <div className="space-y-3">
              {cats.map(cat => {
                const val = avgs[cat] || 0;
                const pct = (val / 5) * 100;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{CAT_LABELS[cat]}</span>
                      <Stars value={val} />
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
                      <div className="h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: pct >= 80 ? '#22C55E' : pct >= 60 ? '#F59E0B' : '#EF4444' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Per-counselor averages */}
          <Card title="Overall Experience by Counselor" subtitle="Avg student rating per clinician">
            {(data.by_counselor || []).length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No data</p>
            ) : (
              <div className="space-y-2">
                {(data.by_counselor || []).map((c: any) => (
                  <div key={c.counselor_id} className="flex items-center justify-between py-2"
                    style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{c.name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{c.count} rating{c.count !== 1 ? 's' : ''}</p>
                    </div>
                    <Stars value={c.avg} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Monthly trend */}
          {(data.by_month || []).length > 1 && (
            <Card title="Satisfaction Trend" subtitle="Avg overall experience score per month">
              <div className="space-y-2">
                {(data.by_month || []).map((m: any) => {
                  const pct = (m.avg / 5) * 100;
                  return (
                    <div key={m.month}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{m.month}</span>
                        <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                          {m.avg}/5 <span style={{ color: 'var(--color-text-muted)' }}>({m.count})</span>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: '#6366F1' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {view === 'individual' && (
        <div className="space-y-4">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by counselor, comments…"
            className="w-full sm:w-80 px-3 py-2 text-sm rounded-xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', outline: 'none' }}
          />
          {filtered.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>No evaluations found.</p>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                      {['Counselor', 'Session Date', 'Attitude', 'Communication', 'Objectives', 'Techniques', 'Overall', 'Comments'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide"
                          style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r: any, i: number) => (
                      <tr key={r.appointment_id}
                        style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}>
                        <td className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: 'var(--color-text-primary)' }}>
                          {r.counselor_name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                          {r.session_date ? new Date(r.session_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>
                        {['counselor_attitude', 'online_communication', 'counseling_objectives', 'techniques_used', 'overall_experience'].map(cat => (
                          <td key={cat} className="px-4 py-3 whitespace-nowrap">
                            <Stars value={r[cat] || 0} />
                          </td>
                        ))}
                        <td className="px-4 py-3 max-w-xs">
                          {r.liked_most && (
                            <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                              <span className="font-medium" style={{ color: 'var(--color-success-text)' }}>+ </span>{r.liked_most}
                            </p>
                          )}
                          {r.to_improve && (
                            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              <span className="font-medium" style={{ color: 'var(--color-warning-text)' }}>↑ </span>{r.to_improve}
                            </p>
                          )}
                          {!r.liked_most && !r.to_improve && <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 text-xs" style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                {filtered.length} of {individual.length} evaluations
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab: Reports & Export ─────────────────────────────────────────────────────

function toCSV(rows: Record<string, string>[]): string {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  return [keys.join(','), ...rows.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
}
function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const REPORT_GROUPS = [
  {
    group: 'Appointments',
    color: C.primary,
    reports: [
      {
        id: 'service-requests',
        label: 'Service Request Register',
        desc: 'All incoming appointment requests — student details, source, intake counselor, action taken.',
        cols: 'Student Name · Student ID · College · Degree Program · Year Level · Source · Service Requested · Intake Counselor · Action Taken · CC Assigned · CP Assigned · Date of Request',
      },
      {
        id: 'scheduled-appointments',
        label: 'Scheduled Appointments',
        desc: 'Confirmed and approved upcoming appointments — counselor, session type, mode, scheduled date.',
        cols: 'Student Name · Student ID · College · Counselor · Session Type · Mode · Scheduled Date · Scheduled Time · Concern · Status',
      },
      {
        id: 'completed-sessions',
        label: 'Completed Sessions',
        desc: 'All sessions that have been marked completed — includes whether a post-session evaluation was submitted.',
        cols: 'Student Name · Student ID · College · Counselor · Session Type · Mode · Date · Concern · Completed Date · Has Evaluation',
      },
      {
        id: 'no-shows',
        label: 'No-Show Report',
        desc: 'Students who did not attend their scheduled appointment — for follow-up and attendance tracking.',
        cols: 'Student Name · Student ID · College · Counselor · Scheduled Date · Session Mode · Concern',
      },
      {
        id: 'cancellations',
        label: 'Cancellation Report',
        desc: 'Cancelled appointments with cancellation reason where available.',
        cols: 'Student Name · Student ID · College · Counselor · Date · Session Mode · Concern · Cancellation Reason',
      },
      {
        id: 'walk-in-sessions',
        label: 'Walk-in Sessions',
        desc: 'Drop-in / walk-in sessions only — excludes online and pre-booked appointments.',
        cols: 'Student Name · Student ID · College · Counselor · Date · Time · Concern · Status',
      },
    ],
  },
  {
    group: 'Counseling Cases',
    color: C.green,
    reports: [
      {
        id: 'active-caseload',
        label: 'Active Counseling Caseload',
        desc: 'All open counseling cases — counselor assignment, session count, risk level, case status.',
        cols: 'Counselor · Case Number · Student Name · Student ID · College · Degree Program · Target Sessions · Current Sessions · Risk Level · Case Status',
      },
      {
        id: 'closed-cases',
        label: 'Closed / Terminated Cases',
        desc: 'Cases that have been closed or terminated — opening date, closing date, sessions completed, closure reason.',
        cols: 'Case Number · Student Name · Student ID · College · Counselor · Opening Date · Closing Date · Sessions Completed · Closure Reason · Final Risk Level',
      },
    ],
  },
  {
    group: 'Referrals',
    color: C.purple,
    reports: [
      {
        id: 'referral-summary',
        label: 'Referral Summary',
        desc: 'Internal and external referrals — referring counselor, receiving counselor or role, reason, urgency, and status.',
        cols: 'Referral Date · Student Name · Student ID · College · Case Number · Referral Type · Referred By · Referred To · Reason · Urgency · Status',
      },
    ],
  },
  {
    group: 'Check-ins',
    color: C.amber,
    reports: [
      {
        id: 'checkin-log',
        label: 'Check-in Client Log',
        desc: 'Non-counseling clients under check-in monitoring — counselor, concern, check-in type, last check-in date.',
        cols: 'Counselor · Case Number · Student Name · Student ID · College · Concern · Check-in Type · Last Check-in · Status',
      },
    ],
  },
  {
    group: 'Counselor Reports',
    color: C.slate,
    reports: [
      {
        id: 'counselor-workload',
        label: 'Counselor Workload Summary',
        desc: 'Per-counselor session counts for the selected period — active cases, completed, no-shows, cancellations, pending.',
        cols: 'Counselor Name · Role · Active Cases · Total Sessions (Period) · Completed Sessions · No-Shows · Cancellations · Pending Sessions',
      },
    ],
  },
];

function ExportRow({
  report, dateFrom, dateTo, downloading, onDownload,
}: {
  report: typeof REPORT_GROUPS[0]['reports'][0];
  dateFrom: string; dateTo: string;
  downloading: string | null;
  onDownload: (id: string, label: string) => void;
}) {
  const busy = downloading === report.id;
  return (
    <div className="flex items-start justify-between gap-4 py-4 px-4 rounded-xl transition"
      style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{report.label}</p>
        <p className="text-xs mt-0.5 mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{report.desc}</p>
        <p className="text-xs font-mono" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>{report.cols}</p>
      </div>
      <button
        onClick={() => onDownload(report.id, report.label)}
        disabled={busy || !!downloading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition disabled:opacity-40 flex-shrink-0 mt-0.5"
        style={{ background: 'var(--color-primary)', color: '#fff' }}>
        {busy ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
        {busy ? 'Exporting…' : 'Export CSV'}
      </button>
    </div>
  );
}

function ReportsTab({ cpsSummary }: { cpsSummary: CpsSummary | null }) {
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [dlMsg, setDlMsg]             = useState<{ type: 'ok' | 'err'; id: string; text: string } | null>(null);

  const rangeLabel = dateFrom && dateTo
    ? `${dateFrom}_to_${dateTo}`
    : dateFrom ? `from_${dateFrom}` : 'all';

  const doExport = async (sheet: string, label: string) => {
    setDownloading(sheet); setDlMsg(null);
    try {
      const token = localStorage.getItem('token');
      const qs = new URLSearchParams({ sheet });
      if (dateFrom) qs.set('from', dateFrom);
      if (dateTo)   qs.set('to',   dateTo);
      const r = await fetch(api(`/api/reports/cps-export?${qs}`), { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Export failed'); }
      const data = await r.json();
      const rows = data.rows ?? [];
      if (!rows.length) {
        setDlMsg({ type: 'err', id: sheet, text: 'No records found for the selected date range.' });
        return;
      }
      downloadCSV(toCSV(rows), `${label.replace(/\W+/g, '_')}_${rangeLabel}.csv`);
      setDlMsg({ type: 'ok', id: sheet, text: `${rows.length.toLocaleString()} rows exported.` });
    } catch (e: unknown) {
      setDlMsg({ type: 'err', id: sheet, text: (e as Error).message });
    } finally { setDownloading(null); }
  };

  const clearRange = () => { setDateFrom(''); setDateTo(''); setDlMsg(null); };

  return (
    <div className="space-y-8">

      {/* Summary strip */}
      {cpsSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total Service Requests',    value: cpsSummary.new_clients.total,          sub: `${cpsSummary.new_clients.this_month} in last 30 days`,    color: C.primary },
            { label: 'Active Counseling Cases',   value: cpsSummary.counseling_cases.active,    sub: `${cpsSummary.counseling_cases.total} total (incl. closed)`, color: C.green   },
            { label: 'Check-in Clients',          value: cpsSummary.checkins.total_clients,     sub: `${cpsSummary.checkins.checkins_this_month} check-ins / 30d`, color: C.purple  },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="rounded-2xl px-4 py-4"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
              <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
              <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value.toLocaleString('en-PH')}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Date range filter */}
      <div className="rounded-2xl px-5 py-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>Date Range Filter</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>From</label>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setDlMsg(null); }}
              className="rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>To</label>
            <input type="date" value={dateTo} min={dateFrom} onChange={e => { setDateTo(e.target.value); setDlMsg(null); }}
              className="rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }} />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={clearRange}
              className="px-3 py-2 text-xs rounded-xl transition"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              Clear
            </button>
          )}
          {dateFrom && dateTo && (
            <span className="text-xs px-2.5 py-1.5 rounded-lg font-medium"
              style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)' }}>
              {dateFrom} → {dateTo}
            </span>
          )}
          {!dateFrom && !dateTo && (
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No filter — all records will be exported.</span>
          )}
        </div>
      </div>

      {/* Status toast */}
      {dlMsg && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
          style={{
            background: dlMsg.type === 'ok' ? 'var(--color-success-surface)' : 'var(--color-danger-surface)',
            border: `1px solid ${dlMsg.type === 'ok' ? 'rgba(5,150,105,0.25)' : 'rgba(220,38,38,0.25)'}`,
            color: dlMsg.type === 'ok' ? 'var(--color-success-text)' : 'var(--color-danger-text)',
          }}>
          <span>{dlMsg.type === 'ok' ? '✓' : '✗'}</span>
          <span className="font-medium">{dlMsg.type === 'ok' ? 'Export complete' : 'Export failed'}</span>
          <span style={{ opacity: 0.8 }}>— {dlMsg.text}</span>
          <button onClick={() => setDlMsg(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Report groups */}
      {REPORT_GROUPS.map(({ group, color, reports }) => (
        <div key={group}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{group}</p>
          </div>
          <div className="space-y-2">
            {reports.map(report => (
              <div key={report.id}>
                <ExportRow
                  report={report}
                  dateFrom={dateFrom} dateTo={dateTo}
                  downloading={downloading}
                  onDownload={doExport}
                />
                {dlMsg && dlMsg.id === report.id && (
                  <p className="text-[11px] mt-1 pl-4"
                    style={{ color: dlMsg.type === 'ok' ? 'var(--color-success-text)' : 'var(--color-danger-text)' }}>
                    {dlMsg.text}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Footer note + report page links */}
      <div className="pt-2 space-y-4">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          All exports are plain CSV — compatible with Microsoft Excel, Google Sheets, LibreOffice Calc, and SPSS.
          Column headers match the CPS tracking template format. Leave date range empty to export all records.
        </p>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Online Report Pages</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { href: '/admin/reports/cases',      label: 'Case Statistics',      desc: 'Monthly case volume — new, active, closed breakdown' },
              { href: '/admin/reports/users',      label: 'User Directory Report', desc: 'All registered users by role and account status' },
              { href: '/admin/reports/compliance', label: 'Compliance Report',     desc: 'Audit trail, data access logs, and privacy summary' },
              { href: '/staff/workload-report',    label: 'Staff Workload Report', desc: 'Per-counselor session schedule and productivity' },
            ].map(({ href, label, desc }) => (
              <Link key={href} href={href}
                className="flex items-center justify-between p-3 rounded-xl transition"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-bg)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
                </div>
                <ChevronRight size={15} className="flex-shrink-0 ml-3" style={{ color: 'var(--color-text-muted)' }} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AnalyticsDashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab]           = useState<TabKey>('overview');
  const [periodIdx, setPeriodIdx]           = useState(2);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);

  const [summary, setSummary]               = useState<Summary | null>(null);
  const [monthlyAppts, setMonthlyAppts]     = useState<MonthlyAppt[]>([]);
  const [monthlyCases, setMonthlyCases]     = useState<MonthlyCase[]>([]);
  const [staff, setStaff]                   = useState<StaffMember[]>([]);
  const [apptStats, setApptStats]           = useState<ApptStats | null>(null);
  const [byDay, setByDay]                   = useState<DayCount[]>([]);
  const [byHour, setByHour]                 = useState<HourCount[]>([]);
  const [riskDist, setRiskDist]             = useState<RiskDist>({});
  const [concerns, setConcerns]             = useState<ConcernItem[]>([]);
  const [scoreTrends, setScoreTrends]       = useState<ScoreTrend[]>([]);
  const [assessments, setAssessments]       = useState<AssessmentType[]>([]);
  const [intake, setIntake]                 = useState<IntakeFunnel | null>(null);
  const [referrals, setReferrals]           = useState<ReferralSummary | null>(null);
  const [cpsSummary, setCpsSummary]         = useState<CpsSummary | null>(null);
  const [apptBreakdown, setApptBreakdown]   = useState<ApptBreakdown | null>(null);
  const [demographics, setDemographics]     = useState<StudentDemographics | null>(null);
  const [casesPipeline, setCasesPipeline]   = useState<CasesPipeline | null>(null);
  const [sessionOutcomes, setSessionOutcomes] = useState<SessionOutcomes | null>(null);
  const [evalData, setEvalData] = useState<any>(null);

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
    const { days, months } = period;
    const [
      s, ma, mc, risk, workload, aStats, dayData,
      cData, sTrends, assess, funnel, ref, cps,
      breakdown, demo, pipeline, outcomes, evals,
    ] = await Promise.all([
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
      safe(`/api/analytics/appointments/breakdown?days=${days}&months=${months}`),
      safe('/api/analytics/students/demographics'),
      safe('/api/analytics/cases/pipeline'),
      safe(`/api/analytics/sessions/outcomes?months=${months}`),
      safe(`/api/analytics/evaluations/summary?days=${days}`),
    ]);
    if (s)         setSummary(s);
    if (ma)        setMonthlyAppts(ma.months ?? []);
    if (mc)        setMonthlyCases(mc.months ?? []);
    if (risk)      setRiskDist(risk.current_risk_distribution ?? {});
    if (workload)  setStaff(workload.staff_workload ?? []);
    if (aStats)    setApptStats(aStats);
    if (dayData)   { setByDay(dayData.by_day ?? []); setByHour(dayData.by_hour ?? []); }
    if (cData)     setConcerns(cData.concerns ?? []);
    if (sTrends)   setScoreTrends(sTrends.months ?? []);
    if (assess)    setAssessments(assess.assessment_types ?? []);
    if (funnel)    setIntake(funnel);
    if (ref)       setReferrals(ref);
    if (cps)       setCpsSummary(cps);
    if (breakdown) setApptBreakdown(breakdown);
    if (demo)      setDemographics(demo);
    if (pipeline)  setCasesPipeline(pipeline);
    setSessionOutcomes(outcomes ?? {
      mood_monthly: [], risk_flagged_sessions: 0, total_sessions: 0,
      flagged_rate: 0, session_type_distribution: [], perma_label_distribution: [], noshows_at_risk: 0,
    });
    if (evals) setEvalData(evals);
    setLoading(false);
    setRefreshing(false);
  }, [period]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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
      <div className="flex items-center gap-0 mb-6 overflow-x-auto border-b" style={{ borderColor: 'var(--color-border)' }}>
        {TAB_LIST.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="px-4 py-2.5 text-sm font-medium transition relative whitespace-nowrap flex-shrink-0"
            style={{ color: activeTab === t.key ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
            {t.label}
            {activeTab === t.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ background: 'var(--color-primary)' }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {activeTab === 'overview' && (
        <OverviewTab
          summary={summary} monthlyAppts={monthlyAppts} monthlyCases={monthlyCases}
          staff={staff} pipeline={casesPipeline} sessionOutcomes={sessionOutcomes} isDark={isDark}
        />
      )}
      {activeTab === 'appointments' && (
        <AppointmentsTab
          apptStats={apptStats} byDay={byDay} byHour={byHour}
          monthlyAppts={monthlyAppts} breakdown={apptBreakdown} isDark={isDark}
        />
      )}
      {activeTab === 'cases' && (
        <CasesTab
          riskDist={riskDist} concerns={concerns} scoreTrends={scoreTrends}
          assessments={assessments} intake={intake}
          demographics={demographics} pipeline={casesPipeline} isDark={isDark}
        />
      )}
      {activeTab === 'staff' && (
        <StaffTab staff={staff} referrals={referrals} isDark={isDark} />
      )}
      {activeTab === 'outcomes' && (
        <OutcomesTab sessionOutcomes={sessionOutcomes} isDark={isDark} />
      )}
      {activeTab === 'ratings' && (
        <RatingsTab data={evalData} isDark={isDark} />
      )}
      {activeTab === 'reports' && (
        <ReportsTab cpsSummary={cpsSummary} />
      )}
    </DashboardPageWrapper>
  );
}
