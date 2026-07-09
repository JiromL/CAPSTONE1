'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Loader2, Users, CalendarDays, BarChart3, Megaphone, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtTime(s: string) {
  try { return new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); }
  catch { return '—'; }
}
function fmtShortDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const APT_COLORS = [
  'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
  'bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200 border-violet-200 dark:border-violet-800',
  'bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-800',
  'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800',
  'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800',
];
function counselorColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return APT_COLORS[Math.abs(h) % APT_COLORS.length];
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, highlight, action }: {
  label: string; value?: string | number; sub?: string;
  highlight?: boolean; action?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 flex flex-col gap-2 min-h-[110px] hover:shadow-md transition-shadow">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      {value !== undefined && (
        <p className={`text-3xl font-bold leading-none tracking-tight ${highlight ? 'text-[#2563eb]' : 'text-gray-900'}`}>
          {value}
        </p>
      )}
      {sub && <p className="text-xs text-gray-400 leading-snug">{sub}</p>}
      {action}
    </div>
  );
}

// ─── Appointments Calendar ───────────────────────────────────────────────────

function AppointmentsCalendar({ appts }: { appts: any[] }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + weekOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const byDay: Record<string, any[]> = {};
  weekDays.forEach(d => { byDay[d.toDateString()] = []; });
  appts.forEach(a => {
    const raw = a.preferred_date || a.scheduled_start || '';
    if (!raw) return;
    try {
      const dt = new Date(raw);
      const key = dt.toDateString();
      if (byDay[key]) byDay[key].push({ ...a, _dt: dt });
    } catch { /* skip */ }
  });
  weekDays.forEach(d => byDay[d.toDateString()].sort((a, b) => a._dt - b._dt));

  const today = new Date().toDateString();
  const totalThisWeek = Object.values(byDay).reduce((s, arr) => s + arr.length, 0);

  const weekLabel = `${fmtShortDate(weekDays[0])} – ${fmtShortDate(weekDays[6])}`;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 shadow-sm rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
            <CalendarDays size={15} className="text-[#2563eb]" />
            All Appointments
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{weekLabel} · {totalThisWeek} appointment{totalThisWeek !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekOffset(o => o - 1)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronLeft size={15} />
          </button>
          <button onClick={() => setWeekOffset(0)}
            className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Today
          </button>
          <button onClick={() => setWeekOffset(o => o + 1)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === today;
              return (
                <div key={i} className={`px-2 py-2.5 text-center border-r border-gray-100 dark:border-gray-800 last:border-r-0 ${isToday ? 'bg-blue-50/60 dark:bg-blue-900/10' : ''}`}>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{WEEKDAYS[d.getDay()]}</p>
                  <p className={`text-sm font-semibold mt-0.5 ${isToday ? 'text-[#2563eb] dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {d.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Appointment slots */}
          <div className="grid grid-cols-7 min-h-[140px]">
            {weekDays.map((d, i) => {
              const dayAppts = byDay[d.toDateString()] || [];
              const isToday = d.toDateString() === today;
              return (
                <div key={i}
                  className={`border-r border-gray-100 dark:border-gray-800 last:border-r-0 p-2 space-y-1.5 ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''}`}>
                  {dayAppts.length === 0 ? (
                    <p className="text-[10px] text-gray-300 dark:text-gray-700 text-center pt-4">—</p>
                  ) : dayAppts.map((a, j) => {
                    const cls = counselorColor(a.counselor_name || '');
                    return (
                      <Link key={j} href={a.case_id ? `/cases/${a.case_id}` : '/appointments'}
                        className={`block text-[10px] px-1.5 py-1 rounded-md border ${cls} hover:opacity-80 transition-opacity`}>
                        <p className="font-semibold truncate">{fmtTime(a.preferred_date || a.scheduled_start)}</p>
                        <p className="truncate opacity-80">{a.student_name || 'Student'}</p>
                        <p className="truncate opacity-60">{a.counselor_name || ''}</p>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend note */}
      <div className="px-5 py-2.5 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 dark:text-gray-500">
        Each color represents a counselor/psychologist. Click any appointment to open the case.
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

interface DashboardProps { user: any; onLogout: () => void; }

export function AdminDashboard({ user, onLogout }: DashboardProps) {
  const [summary, setSummary]     = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [appts, setAppts]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [mounted, setMounted]     = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const loadAll = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      const [sumRes, logsRes, annRes, apptRes] = await Promise.all([
        fetch(api('/api/analytics/summary'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(api('/api/auth/audit-logs'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(api('/api/announcements?limit=1'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(api('/api/appointments/dashboard/role-view'), { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (sumRes.ok)  setSummary(await sumRes.json());
      if (logsRes.ok) setAuditLogs((await logsRes.json()).slice(0, 8));
      if (annRes.ok)  setAnnouncements((await annRes.json()).announcements || []);
      if (apptRes.ok) {
        const d = await apptRes.json();
        setAppts(d.appointments || []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (mounted) loadAll(); }, [mounted, loadAll]);

  const menuItems  = getMenuItemsByRole(user.role);
  const firstName  = user.first_name || user.name?.split(' ')[0] || 'Admin';
  const highRisk   = summary?.high_risk_cases ?? 0;
  const staffCount = (summary?.total_counselors ?? 0) + (summary?.total_psychologists ?? 0);
  const latestAnn  = announcements[0];

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const QUICK_ACTIONS = [
    { href: '/admin/users',   label: 'Manage Users',        icon: Users,        primary: true  },
    { href: '/announcements', label: 'Create Announcement', icon: Megaphone,    primary: false },
    { href: '/appointments',  label: 'Manage Schedules',    icon: CalendarDays, primary: false },
    { href: '/admin/reports/export', label: 'View Reports', icon: BarChart3,    primary: false },
  ];

  function fmtAuditAction(log: any) {
    const entity = (log.entity_type || '').replace(/_/g, ' ');
    const action = (log.action || '').replace(/_/g, ' ');
    return `${action} ${entity}`.trim();
  }
  function fmtAuditTarget(log: any) {
    if (log.entity_type === 'session_note') return 'Session Note';
    if (log.entity_type === 'appointment')  return 'Appointment';
    if (log.entity_type === 'case')         return 'Case';
    if (log.entity_type === 'user')         return 'User Account';
    if (log.entity_type === 'analytics')    return 'Analytics';
    return log.entity_id ? `#${String(log.entity_id).slice(-6)}` : '—';
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="" activeSection="dashboard">
      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Page header ── */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">System Overview</h2>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{dateLabel}</p>
          </div>

          {/* ── High-risk alert ── */}
          {highRisk > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm">
              <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
              <span className="text-red-800 dark:text-red-300">
                <strong>{highRisk}</strong> high-risk case{highRisk !== 1 ? 's' : ''} require attention.
              </span>
              <Link href="/high-risk" className="ml-auto text-xs font-semibold text-red-700 dark:text-red-400 underline underline-offset-2">Review</Link>
            </div>
          )}

          {/* ── Quick actions ── */}
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map(({ href, label, icon: Icon, primary }) => (
              <Link key={href} href={href}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  primary
                    ? 'bg-[#2563eb] hover:bg-blue-700 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-[#2563eb] hover:text-[#2563eb] dark:hover:text-blue-400'
                }`}>
                <Icon size={14} />
                {label}
              </Link>
            ))}
          </div>

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              label="System Activity"
              value={summary?.week_appointments ?? '—'}
              sub="Sessions logged this week"
            />
            <StatCard
              label="User Management"
              value={staffCount || '—'}
              sub={`Staff accounts · ${summary?.pending_appointments ?? 0} pending approval`}
            />
            <StatCard
              label="Appointments This Month"
              value={summary?.week_appointments != null ? summary.week_appointments * 4 : '—'}
              sub="Across all departments"
            />
            <StatCard
              label="Active Cases"
              value={summary?.active_cases ?? '—'}
              sub={`${highRisk > 0 ? `${highRisk} high-risk · ` : ''}${summary?.closed_cases ?? 0} closed`}
            />
            <StatCard
              label="Staff Availability"
              value={staffCount || '—'}
              highlight
              sub="Counselors & psychologists on staff"
            />
            <StatCard
              label="Announcements"
              sub={latestAnn ? `"${latestAnn.title || latestAnn.content?.slice(0, 60)}"` : 'No active announcements'}
              action={
                <Link href="/announcements" className="text-xs font-semibold text-[#2563eb] dark:text-blue-400 hover:underline mt-auto">
                  + New Announcement
                </Link>
              }
            />
          </div>

          {/* ── Calendar ── */}
          <AppointmentsCalendar appts={appts.filter(a =>
            a.counselor_name && a.counselor_name !== 'Not Assigned' &&
            ['CONFIRMED','APPROVED','CHECKED_IN','MATCHED'].includes((a.status || '').toUpperCase())
          )} />

          {/* ── Recent System Activity ── */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 shadow-sm rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">Recent System Activity</p>
              <Link href="/admin/audit-log" className="text-xs text-[#2563eb] dark:text-blue-400 hover:underline font-medium">View all</Link>
            </div>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10 px-5">No recent activity.</p>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_2fr_1fr_90px] px-5 pb-2 gap-4">
                  {['ACTOR', 'ACTION', 'TARGET', 'TIME'].map(h => (
                    <p key={h} className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{h}</p>
                  ))}
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {auditLogs.map((log, i) => (
                    <div key={i} className="grid grid-cols-[1fr_2fr_1fr_90px] items-center px-5 py-3 gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <span className="text-sm text-gray-700 dark:text-gray-200 truncate">
                        {log.actor_name || log.user_id?.slice(-6) || 'System'}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-300 truncate capitalize">
                        {fmtAuditAction(log)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {fmtAuditTarget(log)}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums text-right">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>
      )}
    </DashboardLayout>
  );
}
