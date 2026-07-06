'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, Users, AlertTriangle, Calendar, FileText,
  Activity, RefreshCw, Loader2, ChevronDown,
} from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/utils/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Summary {
  total_cases: number; active_cases: number; closed_cases: number;
  high_risk_cases: number; total_students: number;
  total_counselors: number; total_psychologists: number;
  week_appointments: number; pending_appointments: number; month_assessments: number;
}
interface ConcernItem { concern: string; count: number; }
interface ScoreTrend { short: string; label: string; phq9: number | null; gad7: number | null; phq9_count: number; gad7_count: number; }
interface DayCount { day: string; count: number; }
interface HourCount { hour: string; count: number; }
interface MonthlyAppt { short: string; label: string; total: number; completed: number; cancelled: number; no_show: number; }
interface MonthlyCase { short: string; label: string; new_cases: number; closed_cases: number; high_risk: number; }
interface RiskDist { [key: string]: number; }
interface StaffMember { name: string; role: string; active_cases: number; week_completed: number; }
interface ReferralType { type: string; count: number; }
interface ReferralSummary { total_referrals: number; pending: number; completed: number; referral_types: ReferralType[]; status_breakdown: Record<string, number>; }
interface IntakeFunnel { intake_started: number; intake_completed: number; cases_created: number; intake_completion_rate: number; case_creation_rate: number; }
interface AssessmentType { _id: string; count: number; avg_score: number; risk_breakdown: Record<string, number>; }
interface ApptStats { completion_rate: number; no_show_rate: number; avg_wait_days: number; total_appointments: number; completed: number; no_shows: number; cancelled: number; status_breakdown: Record<string, number>; }
interface CpsSummary { new_clients: { total: number; this_month: number }; counseling_cases: { total: number; active: number }; checkins: { total_clients: number; checkins_this_month: number }; }

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  indigo:  '#166534',
  green:   '#22c55e',
  red:     '#ef4444',
  yellow:  '#f59e0b',
  blue:    '#3b82f6',
  purple:  '#a855f7',
  orange:  '#f97316',
  teal:    '#14b8a6',
  pink:    '#ec4899',
  slate:   '#64748b',
};
const RISK_COLORS: Record<string, string> = {
  GREEN: C.green, YELLOW: C.yellow, ORANGE: C.orange, RED: C.red,
  CRITICAL: '#7f1d1d', LOW: C.teal, MODERATE: C.blue, HIGH: C.red,
};
const APPT_COLORS: Record<string, string> = {
  completed: C.green, COMPLETED: C.green,
  cancelled: C.slate, CANCELLED: C.slate,
  no_show: C.orange, NO_SHOW: C.orange,
  CONFIRMED: C.indigo, REQUESTED: C.yellow,
};

// ─── Theme helpers ────────────────────────────────────────────────────────────

function useChartTheme(isDark: boolean) {
  return {
    grid:    isDark ? '#374151' : '#e5e7eb',
    text:    isDark ? '#9ca3af' : '#6b7280',
    tooltip: isDark ? { bg: '#1f2937', border: '#374151', text: '#f9fafb' }
                    : { bg: '#ffffff', border: '#e5e7eb', text: '#111827' },
  };
}

function CustomTooltip({ active, payload, label, isDark }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string; isDark: boolean }) {
  const t = isDark ? { bg: '#1f2937', border: '#374151', text: '#f9fafb', sub: '#9ca3af' }
                   : { bg: '#ffffff', border: '#e5e7eb', text: '#111827', sub: '#6b7280' };
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ color: t.sub, fontSize: 11, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: t.text, fontSize: 13, marginBottom: 2 }}>
          <span style={{ color: p.color, fontWeight: 600 }}>{p.name}: </span>
          {p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, accent }: { label: string; value: string | number; sub?: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: accent + '1a' }}>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children, loading }: { title: string; subtitle?: string; children: React.ReactNode; loading?: boolean }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-xl p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-300 dark:text-gray-600">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : children}
    </div>
  );
}

function EmptyChart({ text = 'No data available' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-600 text-sm">{text}</div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsDashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const ct = useChartTheme(isDark);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [summary, setSummary]           = useState<Summary | null>(null);
  const [monthlyAppts, setMonthlyAppts] = useState<MonthlyAppt[]>([]);
  const [monthlyCases, setMonthlyCases] = useState<MonthlyCase[]>([]);
  const [riskDist, setRiskDist]         = useState<RiskDist>({});
  const [staff, setStaff]               = useState<StaffMember[]>([]);
  const [referrals, setReferrals]       = useState<ReferralSummary | null>(null);
  const [intake, setIntake]             = useState<IntakeFunnel | null>(null);
  const [assessments, setAssessments]   = useState<AssessmentType[]>([]);
  const [apptStats, setApptStats]       = useState<ApptStats | null>(null);
  const [concerns, setConcerns]         = useState<ConcernItem[]>([]);
  const [scoreTrends, setScoreTrends]   = useState<ScoreTrend[]>([]);
  const [byDay, setByDay]               = useState<DayCount[]>([]);
  const [byHour, setByHour]             = useState<HourCount[]>([]);
  const [cpsSummary, setCpsSummary]     = useState<CpsSummary | null>(null);

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const safe = async (url: string) => {
      try { const r = await fetch(api(url), { headers: h }); return r.ok ? r.json() : null; }
      catch { return null; }
    };

    const [s, ma, mc, risk, workload, ref, funnel, assess, aStats, cData, sTrends, dayData, cps] = await Promise.all([
      safe('/api/analytics/summary'),
      safe('/api/analytics/appointments/monthly'),
      safe('/api/analytics/cases/monthly'),
      safe('/api/analytics/risk/trends'),
      safe('/api/analytics/staff/workload'),
      safe('/api/analytics/referrals/summary'),
      safe('/api/analytics/intake/conversion'),
      safe('/api/analytics/assessments/distribution'),
      safe('/api/analytics/appointments/statistics'),
      safe('/api/analytics/concerns/distribution'),
      safe('/api/analytics/assessments/score-trends'),
      safe('/api/analytics/appointments/by-day'),
      safe('/api/reports/cps-summary'),
    ]);

    if (s)        setSummary(s);
    if (ma)       setMonthlyAppts(ma.months ?? []);
    if (mc)       setMonthlyCases(mc.months ?? []);
    if (risk)     setRiskDist(risk.current_risk_distribution ?? {});
    if (workload) setStaff(workload.staff_workload ?? []);
    if (ref)      setReferrals(ref);
    if (funnel)   setIntake(funnel);
    if (assess)   setAssessments(assess.assessment_types ?? []);
    if (aStats)   setApptStats(aStats);
    if (cData)    setConcerns(cData.concerns ?? []);
    if (sTrends)  setScoreTrends(sTrends.months ?? []);
    if (dayData)  { setByDay(dayData.by_day ?? []); setByHour(dayData.by_hour ?? []); }
    if (cps)      setCpsSummary(cps);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const riskPieData = Object.entries(riskDist)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k, value: v, fill: RISK_COLORS[k] ?? C.slate }));

  const apptStatusData = apptStats
    ? Object.entries(apptStats.status_breakdown ?? {})
        .filter(([, v]) => (v as number) > 0)
        .map(([k, v]) => ({ name: k.toLowerCase().replace('_', ' '), value: v as number, fill: APPT_COLORS[k] ?? C.slate }))
    : [];

  const referralPieData = referrals
    ? Object.entries(referrals.status_breakdown ?? {})
        .filter(([, v]) => (v as number) > 0)
        .map(([k, v]) => ({ name: k, value: v as number }))
    : [];

  const intakeFunnelData = intake ? [
    { stage: 'Started',   count: intake.intake_started },
    { stage: 'Completed', count: intake.intake_completed },
    { stage: 'Cases',     count: intake.cases_created },
  ] : [];

  const assessmentChartData = assessments.slice(0, 8).map(a => ({
    name: (a._id ?? 'Unknown').length > 14 ? (a._id ?? '').slice(0, 14) + '…' : (a._id ?? 'Unknown'),
    count: a.count,
    avg_score: Math.round(a.avg_score ?? 0),
  }));

  const staffChartData = staff.slice(0, 10).map(s => ({
    name: s.name?.split(' ')[0] ?? 'Staff',
    cases: s.active_cases,
    sessions: s.week_completed,
  }));

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardPageWrapper title="Analytics" subtitle="System-wide metrics and insights">
        <div className="flex items-center justify-center h-80 text-gray-400">
          <Loader2 size={28} className="animate-spin mr-2" /> Loading analytics…
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Analytics" subtitle="System-wide metrics and insights">

      {/* Header actions */}
      <div className="flex items-center justify-end mb-6">
        <button
          onClick={() => fetchAll(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <KpiCard label="Active Cases"      value={summary.active_cases}      sub={`${summary.closed_cases} closed`}                     icon={<FileText size={16}/>}      accent={C.indigo} />
          <KpiCard label="High Risk"         value={summary.high_risk_cases}   sub="RED / CRITICAL"                                        icon={<AlertTriangle size={16}/>} accent={C.red}    />
          <KpiCard label="Students"          value={summary.total_students}    sub="registered"                                            icon={<Users size={16}/>}         accent={C.blue}   />
          <KpiCard label="Clinical Staff"    value={summary.total_counselors + summary.total_psychologists} sub={`${summary.total_counselors}C · ${summary.total_psychologists}P`} icon={<Users size={16}/>} accent={C.teal} />
          <KpiCard label="Appts This Week"   value={summary.week_appointments} sub={`${summary.pending_appointments ?? 0} pending`}   icon={<Calendar size={16}/>}      accent={C.green}  />
          <KpiCard label="Assessments / Mo"  value={summary.month_assessments} sub="last 30 days"                                          icon={<Activity size={16}/>}      accent={C.purple} />
        </div>
      )}

      {/* ── CPS Client Overview ───────────────────────────────────────── */}
      {cpsSummary && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">CPS Client Overview</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Three-category client tracking summary</p>
            </div>
            <a href="/admin/reports/export"
              className="text-xs text-[#2563eb] dark:text-blue-400 hover:underline font-medium">
              Export spreadsheets →
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg p-4 bg-green-50 dark:bg-blue-900/20 border border-green-100 dark:border-blue-800/40">
              <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">New Client Requests</p>
              <p className="text-3xl font-bold text-green-800 dark:text-green-300">{cpsSummary.new_clients.total}</p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">{cpsSummary.new_clients.this_month} this month</p>
            </div>
            <div className="rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Existing Clients for Counseling</p>
              <p className="text-3xl font-bold text-blue-800 dark:text-blue-300">{cpsSummary.counseling_cases.active}</p>
              <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">{cpsSummary.counseling_cases.total} total cases</p>
            </div>
            <div className="rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40">
              <p className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">Non-counseling Check-in Clients</p>
              <p className="text-3xl font-bold text-purple-800 dark:text-purple-300">{cpsSummary.checkins.total_clients}</p>
              <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">{cpsSummary.checkins.checkins_this_month} check-ins this month</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Row 1: Case Trends + Risk Distribution ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        <ChartCard title="New Cases by Month" subtitle="Last 6 months — new intakes vs high-risk">
          {monthlyCases.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyCases} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="short" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Legend wrapperStyle={{ fontSize: 11, color: ct.text }} />
                <Line type="monotone" dataKey="new_cases"    name="New Cases"   stroke={C.indigo} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="closed_cases" name="Closed"      stroke={C.green}  strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="high_risk"    name="High Risk"   stroke={C.red}    strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Current Risk Distribution" subtitle="Active cases by risk level">
          {riskPieData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={riskPieData} cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={3} dataKey="value"
                >
                  {riskPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Legend
                  formatter={(v) => <span style={{ fontSize: 11, color: ct.text }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Row 2: Monthly Appointments + Status Breakdown ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        <ChartCard title="Monthly Appointments" subtitle="Completed · Cancelled · No-show">
          {monthlyAppts.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyAppts} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                <XAxis dataKey="short" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Legend wrapperStyle={{ fontSize: 11, color: ct.text }} />
                <Bar dataKey="completed" name="Completed" stackId="a" fill={C.green}  radius={[0,0,0,0]} />
                <Bar dataKey="cancelled" name="Cancelled" stackId="a" fill={C.slate}  />
                <Bar dataKey="no_show"   name="No-show"   stackId="a" fill={C.orange} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Appointment Status Breakdown" subtitle="All-time status distribution">
          {apptStatusData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={apptStatusData} cx="50%" cy="50%"
                  outerRadius={85} dataKey="value" paddingAngle={2}
                >
                  {apptStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Legend formatter={(v) => <span style={{ fontSize: 11, color: ct.text }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Row 3: Counselor Workload ──────────────────────────────────── */}
      <div className="mb-4">
        <ChartCard title="Counselor Workload" subtitle="Active cases and sessions completed this week per staff member">
          {staffChartData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={Math.max(180, staffChartData.length * 36)}>
              <BarChart data={staffChartData} layout="vertical" margin={{ top: 4, right: 24, left: 16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal={false} />
                <XAxis type="number" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} width={72} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Legend wrapperStyle={{ fontSize: 11, color: ct.text }} />
                <Bar dataKey="cases"    name="Active Cases" fill={C.indigo} radius={[0, 4, 4, 0]} />
                <Bar dataKey="sessions" name="Sessions (7d)" fill={C.teal}  radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Row 4: Referral Summary + Intake Funnel ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        <ChartCard title="Referral Status" subtitle="Breakdown by status">
          {referralPieData.length === 0 ? <EmptyChart /> : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={referralPieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" paddingAngle={3}>
                    {referralPieData.map((_, i) => (
                      <Cell key={i} fill={[C.indigo, C.green, C.yellow, C.red, C.teal, C.purple][i % 6]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                  <Legend formatter={(v) => <span style={{ fontSize: 11, color: ct.text }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
              {referrals?.referral_types && referrals.referral_types.length > 0 && (
                <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3 space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">By Type</p>
                  {referrals.referral_types.slice(0, 5).map(t => (
                    <div key={t.type} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400 truncate max-w-[70%]">{t.type || '—'}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{t.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </ChartCard>

        <ChartCard title="Intake Funnel" subtitle="Conversion from started → completed → case created">
          {intakeFunnelData.length === 0 ? <EmptyChart /> : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={intakeFunnelData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                  <XAxis dataKey="stage" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                  <Bar dataKey="count" name="Count" fill={C.indigo} radius={[6, 6, 0, 0]}>
                    {intakeFunnelData.map((_, i) => (
                      <Cell key={i} fill={[C.indigo, C.blue, C.teal][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {intake && (
                <div className="mt-3 grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Completion Rate</p>
                    <p className="text-lg font-bold text-[#2563eb] dark:text-blue-400">{intake.intake_completion_rate}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Case Creation Rate</p>
                    <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{intake.case_creation_rate}%</p>
                  </div>
                </div>
              )}
            </>
          )}
        </ChartCard>
      </div>

      {/* ── Row 5: Assessment Distribution ────────────────────────────── */}
      <div className="mb-4">
        <ChartCard title="Assessment Distribution" subtitle="Count and average score by assessment type">
          {assessmentChartData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={assessmentChartData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: ct.text, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left"  tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Legend wrapperStyle={{ fontSize: 11, color: ct.text }} />
                <Bar yAxisId="left"  dataKey="count"     name="Count"     fill={C.purple} radius={[4,4,0,0]} />
                <Bar yAxisId="right" dataKey="avg_score" name="Avg Score" fill={C.pink}   radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Row 6: Appointment KPIs ────────────────────────────────────── */}
      {apptStats && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Appointment Performance (Last 30 Days)</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Completion Rate',  value: `${apptStats.completion_rate}%`,  accent: C.green  },
              { label: 'No-Show Rate',     value: `${apptStats.no_show_rate}%`,     accent: C.orange },
              { label: 'Avg Wait Time',    value: `${apptStats.avg_wait_days}d`,    accent: C.blue   },
              { label: 'Total Sessions',   value: apptStats.total_appointments,     accent: C.indigo },
              { label: 'Cancellations',    value: apptStats.cancelled,              accent: C.slate  },
            ].map(({ label, value, accent }) => (
              <div key={label} className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                <p className="text-xl font-bold" style={{ color: accent }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* ── Row 7: Concern Distribution ───────────────────────────────── */}
      <div className="mt-4 mb-4">
        <ChartCard title="Top Presenting Concerns" subtitle="Most common concerns across intakes and appointments">
          {concerns.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={Math.max(200, concerns.slice(0, 12).length * 30)}>
              <BarChart data={concerns.slice(0, 12)} layout="vertical" margin={{ top: 4, right: 24, left: 16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal={false} />
                <XAxis type="number" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="concern" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} width={150} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Bar dataKey="count" name="Count" fill={C.purple} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Row 8: PHQ-9 / GAD-7 Score Trends ────────────────────────── */}
      <div className="mb-4">
        <ChartCard title="PHQ-9 / GAD-7 Score Trends" subtitle="Monthly average assessment scores (last 6 months)">
          {scoreTrends.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={scoreTrends} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="short" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Legend wrapperStyle={{ fontSize: 11, color: ct.text }} />
                <Line type="monotone" dataKey="phq9" name="PHQ-9 Avg" stroke={C.indigo} strokeWidth={2} dot={{ r: 3 }} connectNulls activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="gad7" name="GAD-7 Avg" stroke={C.orange} strokeWidth={2} dot={{ r: 3 }} connectNulls activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Row 9: Appointments by Day / Hour ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Appointments by Day of Week" subtitle="Volume distribution across weekdays">
          {byDay.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byDay} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Bar dataKey="count" name="Appointments" fill={C.blue} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Appointments by Hour" subtitle="Peak scheduling hours (PHT)">
          {byHour.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byHour} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: ct.text, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Bar dataKey="count" name="Appointments" fill={C.teal} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

    </DashboardPageWrapper>
  );
}
