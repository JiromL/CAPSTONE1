'use client';

import Link from 'next/link';
import { DashboardGreeting } from './DashboardGreeting';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Loader2, Users, CalendarDays, BarChart3, Megaphone, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

function fmtTime(s: string) {
  try { return new Date(s).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }); }
  catch { return '—'; }
}
function fmtShortDate(d: Date) {
  return d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' });
}
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const COUNSELOR_PALETTES = [
  { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' },
  { bg: '#F0FDFA', text: '#0F766E', border: '#99F6E4' },
  { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' },
];
function counselorPalette(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return COUNSELOR_PALETTES[Math.abs(h) % COUNSELOR_PALETTES.length];
}

function StatCard({ label, value, sub, highlight, action }: {
  label: string; value?: string | number; sub?: string;
  highlight?: boolean; action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border shadow-card p-5 flex flex-col gap-2 min-h-[110px] transition-shadow hover:shadow-card-md"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      {value !== undefined && (
        <p className="text-3xl font-bold leading-none tracking-tight" style={{ color: highlight ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
          {value}
        </p>
      )}
      {sub && <p className="text-xs leading-snug" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>}
      {action}
    </div>
  );
}

function AppointmentsCalendar({ appts }: { appts: any[] }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + weekOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
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
    } catch { }
  });
  weekDays.forEach(d => byDay[d.toDateString()].sort((a, b) => a._dt - b._dt));

  const today = new Date().toDateString();
  const totalThisWeek = Object.values(byDay).reduce((s, arr) => s + arr.length, 0);
  const weekLabel = `${fmtShortDate(weekDays[0])} – ${fmtShortDate(weekDays[6])}`;

  return (
    <div className="rounded-2xl border shadow-card overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <p className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <CalendarDays size={15} style={{ color: 'var(--color-primary)' }} />
            All Appointments
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {weekLabel} · {totalThisWeek} appointment{totalThisWeek !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekOffset(o => o - 1)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
            <ChevronLeft size={15} />
          </button>
          <button onClick={() => setWeekOffset(0)}
            className="text-xs px-2.5 py-1 rounded-lg transition-colors"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            Today
          </button>
          <button onClick={() => setWeekOffset(o => o + 1)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--color-border)' }}>
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === today;
              return (
                <div key={i} className="px-2 py-2.5 text-center" style={{
                  borderRight: i < 6 ? '1px solid var(--color-border)' : 'none',
                  background: isToday ? 'var(--color-primary-surface)' : 'transparent',
                }}>
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>{WEEKDAYS[d.getDay()]}</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
                    {d.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-7 min-h-[140px]">
            {weekDays.map((d, i) => {
              const dayAppts = byDay[d.toDateString()] || [];
              const isToday = d.toDateString() === today;
              return (
                <div key={i} className="p-2 space-y-1.5" style={{
                  borderRight: i < 6 ? '1px solid var(--color-border)' : 'none',
                  background: isToday ? 'var(--color-primary-surface)' : 'transparent',
                }}>
                  {dayAppts.length === 0 ? (
                    <p className="text-xs text-center pt-4" style={{ color: 'var(--color-text-muted)', opacity: 0.4 }}>—</p>
                  ) : dayAppts.map((a, j) => {
                    const pal = counselorPalette(a.counselor_name || '');
                    return (
                      <Link key={j} href={a.case_id ? `/cases/${a.case_id}` : '/appointments'}
                        className="block text-xs px-1.5 py-1 rounded-md border transition-opacity hover:opacity-80"
                        style={{ background: pal.bg, color: pal.text, borderColor: pal.border }}>
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

      <div className="px-5 py-2.5 text-xs" style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
        Each color represents a counselor/psychologist. Click any appointment to open the case.
      </div>
    </div>
  );
}

interface DashboardProps { user: any; onLogout: () => void; }

export function AdminDashboard({ user, onLogout }: DashboardProps) {
  const [summary, setSummary]         = useState<any>(null);
  const [auditLogs, setAuditLogs]     = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [appts, setAppts]             = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [mounted, setMounted]         = useState(false);

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
      if (logsRes.ok) { const d = await logsRes.json(); setAuditLogs((d.logs ?? d).slice(0, 8)); }
      if (annRes.ok)  setAnnouncements((await annRes.json()).announcements || []);
      if (apptRes.ok) { const d = await apptRes.json(); setAppts(d.appointments || []); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (mounted) loadAll(); }, [mounted, loadAll]);

  const menuItems  = getMenuItemsByRole(user.role);
  const firstName  = user.first_name || user.name?.split(' ')[0] || 'Admin';
  const highRisk   = summary?.high_risk_cases ?? 0;
  const staffCount = (summary?.total_counselors ?? 0) + (summary?.total_psychologists ?? 0);
  const latestAnn  = announcements[0];


  const QUICK_ACTIONS = [
    { href: '/admin/users',         label: 'Manage Users',        icon: Users,        primary: true  },
    { href: '/announcements',       label: 'Create Announcement', icon: Megaphone,    primary: false },
    { href: '/admin/holidays',      label: 'Holiday Calendar',    icon: CalendarDays, primary: false },
    { href: '/admin/reports/export',label: 'View Reports',        icon: BarChart3,    primary: false },
  ];

  function fmtAuditAction(log: any) {
    return `${(log.action || '').replace(/_/g, ' ')} ${(log.entity_type || '').replace(/_/g, ' ')}`.trim();
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
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="" activeSection="dashboard" titleInPage>
      {loading ? (
        <div className="flex items-center justify-center h-40 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
        </div>
      ) : (
        <div className="space-y-6 animate-fade-up">

          <DashboardGreeting firstName={firstName} subtitle="Here’s the system overview for today." />

          {/* High-risk alert banner */}
          {highRisk > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
              <AlertCircle size={15} className="flex-shrink-0" style={{ color: 'var(--color-danger)' }} />
              <span style={{ color: 'var(--color-danger)' }}>
                <strong>{highRisk}</strong> high-risk case{highRisk !== 1 ? 's' : ''} require attention.
              </span>
              <Link href="/high-risk" className="ml-auto text-xs font-semibold underline underline-offset-2" style={{ color: 'var(--color-danger)' }}>Review</Link>
            </div>
          )}

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map(({ href, label, icon: Icon, primary }) => (
              <Link key={href} href={href}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={primary
                  ? { background: 'var(--color-primary)', color: 'white' }
                  : { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => {
                  if (primary) { e.currentTarget.style.background = 'var(--color-primary-hover)'; }
                  else { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }
                }}
                onMouseLeave={e => {
                  if (primary) { e.currentTarget.style.background = 'var(--color-primary)'; }
                  else { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }
                }}>
                <Icon size={14} />
                {label}
              </Link>
            ))}
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="System Activity" value={summary?.week_appointments ?? '—'} sub="Sessions logged this week" />
            <StatCard label="User Management" value={staffCount || '—'} sub={`Staff accounts · ${summary?.pending_appointments ?? 0} pending approval`} />
            <StatCard label="Appointments This Month" value={summary?.week_appointments != null ? summary.week_appointments * 4 : '—'} sub="Across all departments" />
            <StatCard label="Active Cases" value={summary?.active_cases ?? '—'} sub={`${highRisk > 0 ? `${highRisk} high-risk · ` : ''}${summary?.closed_cases ?? 0} closed`} />
            <StatCard label="Staff Availability" value={staffCount || '—'} highlight sub="Counselors & psychologists on staff" />
            <StatCard
              label="Announcements"
              sub={latestAnn ? `"${latestAnn.title || latestAnn.content?.slice(0, 60)}"` : 'No active announcements'}
              action={
                <Link href="/announcements" className="text-xs font-semibold mt-auto transition-opacity hover:opacity-75" style={{ color: 'var(--color-primary)' }}>
                  + New Announcement
                </Link>
              }
            />
          </div>

          {/* Calendar */}
          <AppointmentsCalendar appts={appts.filter(a =>
            a.counselor_name && a.counselor_name !== 'Not Assigned' &&
            ['CONFIRMED','APPROVED','CHECKED_IN','MATCHED'].includes((a.status || '').toUpperCase())
          )} />

          {/* Recent System Activity */}
          <div className="rounded-2xl border shadow-card overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Recent System Activity</p>
              <Link href="/admin/audit-log" className="text-xs font-medium transition-opacity hover:opacity-75" style={{ color: 'var(--color-primary)' }}>View all</Link>
            </div>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-center py-10 px-5" style={{ color: 'var(--color-text-muted)' }}>No recent activity.</p>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_2fr_1fr_90px] px-5 pb-2 gap-4">
                  {['ACTOR', 'ACTION', 'TARGET', 'TIME'].map(h => (
                    <p key={h} className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>{h}</p>
                  ))}
                </div>
                <div>
                  {auditLogs.map((log, i) => (
                    <div key={i}
                      className="grid grid-cols-[1fr_2fr_1fr_90px] items-center px-5 py-3 gap-4 transition-colors"
                      style={{ borderTop: '1px solid var(--color-border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <span className="text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {log.actor_name || log.user_id?.slice(-6) || 'System'}
                      </span>
                      <span className="text-sm truncate capitalize" style={{ color: 'var(--color-text-secondary)' }}>
                        {fmtAuditAction(log)}
                      </span>
                      <span className="text-sm truncate" style={{ color: 'var(--color-text-secondary)' }}>
                        {fmtAuditTarget(log)}
                      </span>
                      <span className="text-xs tabular-nums text-right" style={{ color: 'var(--color-text-muted)' }}>
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }) : '—'}
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
