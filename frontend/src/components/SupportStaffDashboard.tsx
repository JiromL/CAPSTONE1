'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Loader2, ListChecks, CalendarDays, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface DashboardProps { user: any; onLogout: () => void; }

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

// ─── Today's Schedule table ──────────────────────────────────────────────────

function getSessionType(a: any): string {
  const ref = (a.referral_type || '').toUpperCase();
  if (ref === 'WALKIN') return 'Walk-in';
  if (ref.includes('EMERGENCY') || ref.includes('CRISIS')) return 'Crisis';
  if (ref.includes('FOLLOW')) return 'Follow-up';
  if (ref === 'INTAKE' || ref === 'EVALUATION') return 'Intake';
  const status = (a.status || '').toUpperCase();
  if (status === 'FOLLOW_UP') return 'Follow-up';
  if (status === 'EVALUATION') return 'Intake';
  return 'Individual';
}

function SessionStatusBadge({ status }: { status: string }) {
  const s = (status || '').toUpperCase();
  if (s === 'COMPLETED') return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800">Completed</span>
  );
  if (s === 'CHECKED_IN') return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800">In Session</span>
  );
  if (s === 'CANCELLED' || s === 'NO_SHOW') return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">Cancelled</span>
  );
  return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-[#2563eb] dark:text-blue-400 border border-blue-100 dark:border-blue-800">Upcoming</span>
  );
}

function TodayScheduleTable({ appts }: { appts: any[] }) {
  const sorted = [...appts].sort((a, b) =>
    new Date(a.preferred_date || a.scheduled_start || 0).getTime() -
    new Date(b.preferred_date || b.scheduled_start || 0).getTime()
  );

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 shadow-sm rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-[#2563eb]" />
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">Today's Schedule</p>
        </div>
        <Link href="/appointments" className="text-xs text-[#2563eb] dark:text-blue-400 hover:underline font-medium">View all</Link>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-36 text-center px-5 pb-5">
          <CalendarDays size={22} className="text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No sessions today</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Confirmed appointments will appear here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[80px_1fr_100px_120px_36px] px-5 pb-2 gap-3">
            {['TIME', 'STUDENT', 'TYPE', 'STATUS', ''].map((h, i) => (
              <p key={i} className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{h}</p>
            ))}
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {sorted.map((a: any, i: number) => (
              <div key={i} className="grid grid-cols-[80px_1fr_100px_120px_36px] items-center px-5 py-3.5 gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 tabular-nums">{fmtTime(a.preferred_date || a.scheduled_start || '')}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{a.student_name || 'Student'}</p>
                  {a.counselor_name && a.counselor_name !== 'Not Assigned' && (
                    <p className="text-xs text-[#2563eb] dark:text-blue-400 truncate">{a.counselor_name}</p>
                  )}
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{getSessionType(a)}</span>
                <SessionStatusBadge status={a.status} />
                <Link href={a.case_id ? `/cases/${a.case_id}` : '/appointments'}
                  className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
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
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {weekLabel} · {totalThisWeek} appointment{totalThisWeek !== 1 ? 's' : ''}
          </p>
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

          <div className="grid grid-cols-7 min-h-[140px]">
            {weekDays.map((d, i) => {
              const dayAppts = byDay[d.toDateString()] || [];
              const isToday = d.toDateString() === today;
              return (
                <div key={i} className={`border-r border-gray-100 dark:border-gray-800 last:border-r-0 p-2 space-y-1.5 ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''}`}>
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

      <div className="px-5 py-2.5 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 dark:text-gray-500">
        Each color represents a counselor/psychologist. Click any appointment to open the case.
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function SupportStaffDashboard({ user, onLogout }: DashboardProps) {
  const [allAppts, setAllAppts]     = useState<any[]>([]);
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [todayList, setTodayList]   = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [mounted, setMounted]       = useState(false);

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

          setPendingList(
            appts.filter((a: any) => ['REQUESTED','PENDING_APPROVAL'].includes((a.status||'').toUpperCase())).slice(0, 6)
          );

          const todayStr = new Date().toDateString();
          setTodayList(
            appts.filter((a: any) => {
              const dt = a.preferred_date || a.scheduled_start || '';
              try { return new Date(dt).toDateString() === todayStr &&
                ['CONFIRMED','APPROVED','MATCHED','CHECKED_IN'].includes((a.status||'').toUpperCase()); }
              catch { return false; }
            })
          );
        }
      } finally { setLoading(false); }
    })();
  }, [mounted]);

  const menuItems = getMenuItemsByRole(user.role);
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Staff';

  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return '—'; }
  };

  const METHOD_LABEL: Record<string, string> = {
    'in-person': 'In-person', 'walk_in': 'Walk-in', 'online': 'Online',
    'gmeet': 'Google Meet', 'zoom': 'Zoom', 'phone': 'Phone',
  };

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="" activeSection="dashboard">

      <div className="mb-6 pb-5 border-b border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 mb-0.5">{todayStr}</p>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Good day, {firstName}.</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-5">

          {/* Today's schedule table */}
          <TodayScheduleTable appts={todayList} />

          {/* Pending assignments */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 shadow-sm rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                Pending Assignments
                {pendingList.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-medium normal-case tracking-normal">
                    {pendingList.length}
                  </span>
                )}
              </p>
              <Link href="/appointment-requests" className="text-xs text-[#2563eb] dark:text-blue-400 hover:underline">View all</Link>
            </div>
            {pendingList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 text-center">
                <ListChecks size={22} className="text-green-400 mb-2" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Queue is clear!</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">All appointments have been assigned.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {pendingList.map((req: any, i: number) => (
                  <div key={i} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{req.student_name || 'Student'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {fmtDate(req.preferred_date || req.created_at)} · {METHOD_LABEL[req.method] || req.method || 'In-person'}
                      </p>
                    </div>
                    <Link href="/appointment-requests"
                      className="text-xs px-2.5 py-1 bg-[#2563eb] hover:bg-blue-700 text-white rounded-lg transition-colors">
                      Assign
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Full week calendar */}
          <AppointmentsCalendar appts={allAppts} />

        </div>
      )}
    </DashboardLayout>
  );
}
