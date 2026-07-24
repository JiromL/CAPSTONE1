'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell, LineChart, Line,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Area, AreaChart,
} from 'recharts';
import {
  Activity, Wifi, WifiOff, RefreshCw, Loader2, Users,
  LogIn, LogOut, Eye, EyeOff, TrendingUp, AlertTriangle,
  ExternalLink, MessageSquare, Download, ChevronRight,
  CheckCircle2, Clock, XCircle, Building2, Brain,
} from 'lucide-react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { useTheme } from '@/context/ThemeContext';
import PendingStudentsWithPerma, { PermaBadge, PERMA_STYLES } from '@/components/PendingStudentsWithPerma';
import { api } from '@/utils/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthStatus { connected: boolean; mhbot_username?: string; expired?: boolean; }
interface AnalyticsSummary {
  total_tracked: number; active_last_30d: number; inactive_14d: number;
  at_risk_count: number; completion_rate: number;
  by_label: Record<string, number>;
}
interface TrendData {
  months: string[];
  data: Record<string, Record<string, number>>;
}
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
const PERMA_COLORS: Record<string, string> = {
  Excelling:  '#059669',
  Thriving:   '#14B8A6',
  Surviving:  '#F59E0B',
  Struggling: '#F97316',
  'In Crisis':'#DC2626',
  'No Data':  '#94A3B8',
};
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

// ── Shared UI ─────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, isDark }: {
  active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string; isDark: boolean;
}) {
  if (!active || !payload?.length) return null;
  const bg  = isDark ? '#111827' : '#ffffff';
  const bdr = isDark ? '#1F2640' : '#E4E7F0';
  const txt = isDark ? '#F1F5F9' : '#0D1526';
  const sub = isDark ? '#94A3B8' : '#64748B';
  return (
    <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 8, padding: '10px 14px', minWidth: 130 }}>
      {label && <p style={{ color: sub, fontSize: 11, marginBottom: 6, fontWeight: 500 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: txt, fontSize: 12, marginBottom: 2 }}>
          <span style={{ color: p.color, fontWeight: 600 }}>{p.name}: </span>
          {p.value.toLocaleString('en-PH')}
        </p>
      ))}
    </div>
  );
}

function KpiCard({ label, value, sub, icon, color, accent }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; accent?: boolean;
}) {
  return (
    <div className="rounded-xl p-4 flex items-start gap-3"
      style={{
        background: accent ? `${color}12` : 'var(--color-surface)',
        border: `1px solid ${accent ? color + '40' : 'var(--color-border)'}`,
      }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: color + '20' }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
        <p className="text-xl font-bold leading-tight mt-0.5" style={{ color: accent ? color : 'var(--color-text-primary)' }}>{value}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>}
      </div>
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
}: {
  summary: AnalyticsSummary | null;
  trend: TrendData | null;
  colleges: CollegeEntry[];
  attention: AttentionStudent[];
  role: string;
  isDark: boolean;
  loading: boolean;
}) {
  const isAdmin = ADMIN_ROLES.includes(role.toUpperCase());
  const grid  = isDark ? '#1F2640' : '#E4E7F0';
  const tText = isDark ? '#94A3B8' : '#6B7280';

  // Distribution donut data
  const distData = LABEL_ORDER.map(l => ({
    name: l, value: summary?.by_label[l] ?? 0, fill: PERMA_COLORS[l],
  })).filter(d => d.value > 0);
  const totalDist = distData.reduce((a, d) => a + d.value, 0);

  // Trend line data
  const trendRows = trend
    ? trend.months.map(m => ({
        month: fmtMonthKey(m),
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
    a.download = `ema-attention-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const REASON_BADGE: Record<string, { label: string; bg: string; color: string }> = {
    at_risk:    { label: 'At-Risk',      bg: '#FEE2E2', color: '#DC2626' },
    inactive:   { label: 'Inactive 14d', bg: '#FEF3C7', color: '#D97706' },
    no_checkin: { label: 'No Check-in',  bg: '#F3F4F6', color: '#6B7280' },
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
          label="EMA-Linked Students"
          value={summary?.total_tracked ?? '—'}
          sub="registered in CPS"
          icon={<Users size={14} />}
          color="#2352CC"
        />
        <KpiCard
          label="Active (Last 30d)"
          value={summary ? `${summary.active_last_30d} (${summary.completion_rate}%)` : '—'}
          sub="checked in this month"
          icon={<CheckCircle2 size={14} />}
          color="#059669"
          accent={!!summary && summary.completion_rate >= 60}
        />
        <KpiCard
          label="Needs Attention"
          value={summary?.inactive_14d ?? '—'}
          sub="inactive 14+ days"
          icon={<Clock size={14} />}
          color="#D97706"
          accent={!!summary && summary.inactive_14d > 0}
        />
        <KpiCard
          label="At-Risk Students"
          value={summary?.at_risk_count ?? '—'}
          sub="Struggling or In Crisis"
          icon={<AlertTriangle size={14} />}
          color="#DC2626"
          accent={!!summary && summary.at_risk_count > 0}
        />
      </div>

      {/* Distribution + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <SCard title="EMA Wellbeing Distribution" subtitle="Latest check-in label per student">
          {!summary || totalDist === 0 ? <Empty text="No EMA data collected yet" /> : (
            <div className="flex items-center gap-5">
              <div style={{ width: 140, flexShrink: 0, position: 'relative' }}>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={distData} cx="50%" cy="50%" innerRadius={38} outerRadius={60}
                      paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
                      {distData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>{totalDist}</span>
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>students</span>
                </div>
              </div>
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
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PERMA_COLORS[l] }} />
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

        <SCard title="Mental Health Trend" subtitle="EMA check-ins per label over time (from saved snapshots)">
          {!trend || trendRows.length === 0 ? <Empty text="No snapshot history yet — sync first" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendRows} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: tText, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: tText, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip isDark={isDark} />} />
                <Legend wrapperStyle={{ fontSize: 10, color: tText }} />
                {LABEL_ORDER.map(l => (
                  <Area key={l} type="monotone" dataKey={l} name={l}
                    stroke={PERMA_COLORS[l]} fill={PERMA_COLORS[l] + '22'}
                    strokeWidth={l === 'In Crisis' || l === 'Struggling' ? 2 : 1.5}
                    dot={false} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </SCard>
      </div>

      {/* College Breakdown (admin only) */}
      {isAdmin && colleges.length > 0 && (
        <SCard
          title="College Breakdown"
          subtitle="EMA-linked students and at-risk count per college — identify underserved units"
        >
          <ResponsiveContainer width="100%" height={Math.max(180, colleges.length * 36)}>
            <BarChart data={colleges} layout="vertical" margin={{ top: 0, right: 60, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
              <XAxis type="number" tick={{ fill: tText, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="college" tick={{ fill: tText, fontSize: 10 }} axisLine={false} tickLine={false} width={115} />
              <Tooltip content={<ChartTooltip isDark={isDark} />} />
              <Legend wrapperStyle={{ fontSize: 10, color: tText }} />
              <Bar dataKey="total"   name="Total"   fill="#2352CC" radius={[0, 3, 3, 0]} barSize={9} />
              <Bar dataKey="at_risk" name="At-Risk"  fill="#DC2626" radius={[0, 3, 3, 0]} barSize={9} />
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
              style={{ background: attention.length > 0 ? '#FEE2E2' : 'var(--color-bg)', color: attention.length > 0 ? '#DC2626' : 'var(--color-text-muted)' }}>
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
                      <td className="px-4 py-3"><PermaBadge label={s.label} /></td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                        {fmtDate(s.last_checkin)}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-semibold"
                        style={{ color: days === null ? 'var(--color-text-muted)' : days > 30 ? '#DC2626' : days > 14 ? '#D97706' : 'var(--color-text-secondary)' }}>
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
                          style={{ background: isDark ? rb.color + '30' : rb.bg, color: rb.color }}>
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

  const crisisStudents   = students.filter(s => s.latest_label === 'In Crisis');
  const strugglingStudents = students.filter(s => s.latest_label === 'Struggling');

  const StudentCard = ({ s }: { s: any }) => {
    const days = daysSince(s.latest_date);
    const isCrisis = s.latest_label === 'In Crisis';
    return (
      <div className="flex items-start gap-4 p-4 rounded-xl border transition"
        style={{
          background: isCrisis ? (isDark ? '#7F1D1D20' : '#FEF2F2') : (isDark ? '#7C2D1220' : '#FFF7ED'),
          borderColor: isCrisis ? '#DC262660' : '#F9731660',
        }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{s.student_name || '—'}</span>
            <PermaBadge label={s.latest_label} />
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.school_id || s.student_email}</p>
          {s.college && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.college}</p>}
          <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
            Last check-in: {fmtDate(s.latest_date)}{days !== null ? ` · ${days}d ago` : ''}
          </p>
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
          <p className="text-xs font-semibold uppercase tracking-widest px-1" style={{ color: '#DC2626' }}>
            In Crisis ({crisisStudents.length})
          </p>
          {crisisStudents.map(s => <StudentCard key={s.student_id} s={s} />)}
        </div>
      )}

      {strugglingStudents.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest px-1" style={{ color: '#F97316' }}>
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

function ConnectCard({ expired, onLogin }: { expired?: boolean; onLogin: (u: string, p: string) => Promise<string | null> }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    const error = await onLogin(user, pass);
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
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Connect to EMA</h2>
          <p className="text-xs text-center mt-1" style={{ color: 'var(--color-text-muted)' }}>Sign in with your EMA account to continue</p>
          {expired && <p className="text-xs mt-2 text-center" style={{ color: 'var(--color-warning)' }}>Your previous session expired. Please log in again.</p>}
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>EMA Username</label>
            <input type="text" value={user} onChange={e => setUser(e.target.value)}
              placeholder="e.g. ema_lVk" required className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Password</label>
            <div className="relative">
              <input type={show ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)}
                placeholder="••••••••" required className={`${IC} pr-9`} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
              <button type="button" onClick={() => setShow(s => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 transition"
                style={{ color: 'var(--color-text-muted)' }}>
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          {err && <p className="text-xs rounded-lg px-3 py-2 border" style={{ color: 'var(--color-danger)', background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)' }}>{err}</p>}
          <button type="submit" disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
            {busy ? 'Connecting…' : 'Connect'}
          </button>
        </form>
        <p className="text-xs text-center mt-4" style={{ color: 'var(--color-text-muted)' }}>
          Your credentials are only used to obtain a session token and are not stored.
        </p>
      </div>
    </div>
  );
}

// ── Student View ──────────────────────────────────────────────────────────────

function StudentView({ username, onDisconnect }: { username: string; onDisconnect: () => void }) {
  const [loading, setLoading] = useState(true);
  const [label, setLabel]     = useState<string | null>(null);
  const [date, setDate]       = useState<string | null>(null);
  const [history, setHistory] = useState<PermaEntry[]>([]);
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api('/api/mhbot/my-perma?limit=10'), { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (!r.ok || d.fetch_error) { setErr(d.fetch_error || d.error || 'Could not load PERMA data'); }
      else { setLabel(d.latest_label ?? null); setDate(d.latest_date ?? null); setHistory(d.history || []); }
    } catch { setErr('Network error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

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
          <button onClick={load} className="p-1.5 rounded transition" style={{ color: 'var(--color-text-muted)' }}
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
  const [colleges, setColleges] = useState<CollegeEntry[]>([]);
  const [attention, setAttention] = useState<AttentionStudent[]>([]);
  const [loading, setLoading]   = useState(true);
  const [syncing, setSyncing]   = useState(false);
  const [syncMsg, setSyncMsg]   = useState('');
  const [serverUp, setServerUp] = useState<boolean | null>(null);

  const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [summRes, trendRes, collegeRes, attRes] = await Promise.all([
        fetch(api('/api/mhbot/analytics/summary'),   { headers: hdrs() }),
        fetch(api('/api/mhbot/analytics/trend'),     { headers: hdrs() }),
        fetch(api('/api/mhbot/analytics/college'),   { headers: hdrs() }),
        fetch(api('/api/mhbot/analytics/attention'), { headers: hdrs() }),
      ]);
      if (summRes.ok)    setSummary(await summRes.json());
      if (trendRes.ok)   setTrend(await trendRes.json());
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
        await fetchAnalytics();
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
            Connected as <span className="font-semibold">{username}</span>
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
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                  style={{ background: '#DC2626' }}>
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

  const handleLogin = async (username: string, password: string): Promise<string | null> => {
    try {
      const r = await fetch(api('/api/mhbot/auth/login'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json();
      if (r.ok) { setAuthStatus({ connected: true, mhbot_username: d.mhbot_username }); return null; }
      return d.error || 'Login failed';
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

  if (!authStatus?.connected) {
    return (
      <DashboardPageWrapper
        title="EMA"
        subtitle={isStudent ? 'Connect your EMA account to track your well-being' : 'Connect to EMA to access analytics and student PERMA data'}
      >
        <ConnectCard expired={authStatus?.expired} onLogin={handleLogin} />
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper
      title="EMA Analytics"
      subtitle={isStudent ? 'Your PERMA well-being' : 'Student well-being monitoring & population health analytics'}
    >
      {isStudent
        ? <StudentView username={authStatus.mhbot_username!} onDisconnect={handleDisconnect} />
        : <StaffView   username={authStatus.mhbot_username!} role={role} onDisconnect={handleDisconnect} />}
    </DashboardPageWrapper>
  );
}
