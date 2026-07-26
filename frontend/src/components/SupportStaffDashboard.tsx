'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Loader2, ListChecks, CalendarDays, ChevronLeft, ChevronRight, MoreHorizontal, UserPlus, ClipboardList } from 'lucide-react';
import { AnnouncementsPanel } from './AnnouncementsPanel';

interface DashboardProps { user: any; onLogout: () => void; }

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

function getSessionMode(a: any): string {
  const method = (a.method || a.session_method || '').toLowerCase();
  if (/online|zoom|meet|virtual/i.test(method)) return 'Online';
  return 'In-Person';
}

function SessionStatusBadge({ status }: { status: string }) {
  const s = (status || '').toUpperCase();
  if (s === 'COMPLETED') return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full border" style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)', borderColor: 'var(--color-success)' }}>Completed</span>
  );
  if (s === 'CHECKED_IN') return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full border" style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}>In Session</span>
  );
  if (s === 'CANCELLED' || s === 'NO_SHOW') return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>Cancelled</span>
  );
  return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full border" style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>Confirmed</span>
  );
}

function TodayScheduleTable({ appts }: { appts: any[] }) {
  const sorted = [...appts].sort((a, b) =>
    new Date(a.preferred_date || a.scheduled_start || 0).getTime() -
    new Date(b.preferred_date || b.scheduled_start || 0).getTime()
  );

  return (
    <div className="rounded-2xl border shadow-card overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={15} style={{ color: 'var(--color-primary)' }} />
          <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Today's Schedule</p>
        </div>
        <Link href="/appointments" className="text-xs font-medium transition-opacity hover:opacity-75" style={{ color: 'var(--color-primary)' }}>View all</Link>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-36 text-center px-5 pb-5">
          <CalendarDays size={22} className="mb-2" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>No sessions today</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Confirmed appointments will appear here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[80px_1fr_100px_120px_36px] px-5 pb-2 gap-3">
            {['TIME', 'STUDENT', 'MODE', 'STATUS', ''].map((h, i) => (
              <p key={i} className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>{h}</p>
            ))}
          </div>
          <div>
            {sorted.map((a: any, i: number) => (
              <div key={i}
                className="grid grid-cols-[80px_1fr_100px_120px_36px] items-center px-5 py-3.5 gap-3 transition-colors"
                style={{ borderTop: '1px solid var(--color-border)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{fmtTime(a.preferred_date || a.scheduled_start || '')}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{a.student_name || 'Student'}</p>
                  {a.counselor_name && a.counselor_name !== 'Not Assigned' && (
                    <p className="text-xs truncate" style={{ color: 'var(--color-primary)' }}>{a.counselor_name}</p>
                  )}
                </div>
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{getSessionMode(a)}</span>
                <SessionStatusBadge status={a.status} />
                <Link href={a.case_id ? `/cases/${a.case_id}` : '/appointments'}
                  className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                  <MoreHorizontal size={15} />
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
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
                  opacity: isToday ? 1 : 1,
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

export function SupportStaffDashboard({ user, onLogout }: DashboardProps) {
  const [allAppts, setAllAppts]       = useState<any[]>([]);
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [todayList, setTodayList]     = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [mounted, setMounted]         = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    (async () => {
      try {
        const r = await fetch(api('/api/appointments/dashboard/role-view'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) {
          const d = await r.json();
          const appts: any[] = d.appointments || [];
          setAllAppts(appts);
          setPendingList(appts.filter((a: any) => ['REQUESTED','PENDING_APPROVAL'].includes((a.status||'').toUpperCase())).slice(0, 6));
          const todayStr = new Date().toDateString();
          setTodayList(appts.filter((a: any) => {
            const dt = a.preferred_date || a.scheduled_start || '';
            try { return new Date(dt).toDateString() === todayStr &&
              ['CONFIRMED','APPROVED','MATCHED','CHECKED_IN'].includes((a.status||'').toUpperCase()); }
            catch { return false; }
          }));
        }
      } finally { setLoading(false); }
    })();
  }, [mounted]);

  const menuItems = getMenuItemsByRole(user.role);
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Staff';

  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' }); } catch { return '—'; }
  };

  const METHOD_LABEL: Record<string, string> = {
    'in-person': 'In-person', 'walk_in': 'Walk-in', 'online': 'Online',
    'gmeet': 'Google Meet', 'zoom': 'Zoom', 'phone': 'Phone',
  };

  const todayDateStr = new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila',
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="" activeSection="dashboard">

      <div className="mb-6 pb-5 animate-fade-up" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>{todayDateStr}</p>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Good day, {firstName}.</h2>
      </div>

      {/* Quick action strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 animate-fade-up">
        {[
          { label: 'Today', value: loading ? '–' : todayList.length, color: 'var(--color-primary)', icon: CalendarDays, href: null },
          { label: 'Pending', value: loading ? '–' : pendingList.length, color: pendingList.length > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)', icon: ListChecks, href: null },
          { label: 'Walk-In Intake', value: null, color: 'var(--color-primary)', icon: UserPlus, href: '/staff/walkin-intake' },
          { label: 'Manage Requests', value: null, color: 'var(--color-primary)', icon: ClipboardList, href: '/appointment-requests' },
        ].map(({ label, value, color, icon: Icon, href }) => (
          href ? (
            <Link key={label} href={href}
              className="flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-primary-surface)'; }}
              onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-surface)'; }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-primary-surface)' }}>
                <Icon size={15} style={{ color: 'var(--color-primary)' }} />
              </div>
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
            </Link>
          ) : (
            <div key={label} className="rounded-2xl border px-4 py-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
              <p className="text-2xl font-bold tabular-nums mt-0.5" style={{ color }}>{value}</p>
            </div>
          )
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
        </div>
      ) : (
        <div className="space-y-5 animate-fade-up" style={{ animationDelay: '60ms' }}>

          <TodayScheduleTable appts={todayList} />

          {/* Pending assignments */}
          <div className="rounded-2xl border shadow-card p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold tracking-widest uppercase flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                Pending Assignments
                {pendingList.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-bold normal-case tracking-normal" style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning)' }}>
                    {pendingList.length}
                  </span>
                )}
              </p>
              <Link href="/appointment-requests" className="text-xs font-medium transition-opacity hover:opacity-75" style={{ color: 'var(--color-primary)' }}>View all</Link>
            </div>
            {pendingList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 text-center">
                <ListChecks size={22} className="mb-2" style={{ color: 'var(--color-success)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Queue is clear!</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>All appointments have been assigned.</p>
              </div>
            ) : (
              <div>
                {pendingList.map((req: any, i: number) => (
                  <div key={i} className="py-2.5 flex items-center justify-between" style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{req.student_name || 'Student'}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {fmtDate(req.preferred_date || req.created_at)} · {METHOD_LABEL[req.method] || req.method || 'In-person'}
                      </p>
                    </div>
                    <Link href="/appointment-requests"
                      className="text-xs px-2.5 py-1 text-white rounded-lg transition-opacity hover:opacity-90"
                      style={{ background: 'var(--color-primary)' }}>
                      Assign
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <AppointmentsCalendar appts={allAppts.filter(a =>
            a.counselor_name && a.counselor_name !== 'Not Assigned' &&
            ['CONFIRMED','APPROVED','CHECKED_IN','MATCHED'].includes((a.status || '').toUpperCase())
          )} />

          <div className="lg:col-span-2">
            <AnnouncementsPanel />
          </div>

        </div>
      )}
    </DashboardLayout>
  );
}
