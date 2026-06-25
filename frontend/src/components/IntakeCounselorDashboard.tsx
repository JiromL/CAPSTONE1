'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Loader2, CheckCircle, AlertCircle, ClipboardList, CalendarClock, ChevronRight } from 'lucide-react';

const PERMA_BARS: { label: string; color: string }[] = [
  { label: 'Excelling',  color: 'bg-green-500'  },
  { label: 'Thriving',   color: 'bg-teal-500'   },
  { label: 'Surviving',  color: 'bg-yellow-500' },
  { label: 'Struggling', color: 'bg-orange-500' },
  { label: 'In Crisis',  color: 'bg-red-500'    },
];

function PermaDistributionWidget() {
  const [data, setData] = useState<{ total_students_tracked: number; distribution: Record<string, number> } | null>(null);
  const [notConnected, setNotConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(api('/api/mhbot/stats/perma-distribution'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (r.status === 401) { setNotConnected(true); return null; }
        return r.ok ? r.json() : null;
      })
      .then(d => { if (d) setData(d); })
      .catch(() => setNotConnected(true));
  }, []);

  const dist = data?.distribution ?? {};
  const total = data?.total_students_tracked ?? 0;
  const maxCount = Math.max(1, ...Object.values(dist));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Student Wellbeing Overview</p>
        {total > 0 && <span className="text-xs text-gray-400">{total} tracked</span>}
      </div>
      {notConnected || (!data && !notConnected) ? (
        <p className="text-xs text-gray-400 text-center py-8">
          {notConnected ? 'Connect MHBot to see wellbeing data.' : 'Loading…'}
        </p>
      ) : (
        <div className="space-y-2.5">
          {PERMA_BARS.map(({ label, color }) => {
            const count = dist[label] ?? 0;
            if (count === 0 && dist['No Data'] === total) return null;
            return (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20 flex-shrink-0">{label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${color} transition-all`}
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600 w-4 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PERMA_TREND_COLORS: Record<string, { bg: string; text: string }> = {
  'Excelling':  { bg: 'bg-green-500',  text: 'text-green-700'  },
  'Thriving':   { bg: 'bg-teal-500',   text: 'text-teal-700'   },
  'Surviving':  { bg: 'bg-yellow-500', text: 'text-yellow-700' },
  'Struggling': { bg: 'bg-orange-500', text: 'text-orange-700' },
  'In Crisis':  { bg: 'bg-red-500',    text: 'text-red-700'    },
  'No Data':    { bg: 'bg-gray-300',   text: 'text-gray-500'   },
};
const TREND_LABELS = ['Excelling', 'Thriving', 'Surviving', 'Struggling', 'In Crisis'];

function PermaTrendsWidget() {
  const [data, setData] = useState<{ months: string[]; monthly: Record<string, Record<string, number>> } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(api('/api/mhbot/stats/perma-trends'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const months = data.months ?? [];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Wellbeing Trends — Last 6 Months</p>
      <div className="space-y-3">
        {months.map(month => {
          const counts = data.monthly[month] ?? {};
          const total = TREND_LABELS.reduce((s, l) => s + (counts[l] ?? 0), 0);
          const label = new Date(month + '-15').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          return (
            <div key={month} className="flex items-start gap-3">
              <span className="text-xs text-gray-400 w-12 flex-shrink-0 pt-0.5">{label}</span>
              <div className="flex-1 space-y-1">
                {total === 0 ? (
                  <span className="text-xs text-gray-300 italic">No data</span>
                ) : (
                  TREND_LABELS.filter(l => counts[l] > 0).map(l => {
                    const c = counts[l] ?? 0;
                    const pct = total > 0 ? (c / total) * 100 : 0;
                    const col = PERMA_TREND_COLORS[l] ?? PERMA_TREND_COLORS['No Data'];
                    return (
                      <div key={l} className="flex items-center gap-2">
                        <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden flex-shrink-0">
                          <div className={`h-1.5 rounded-full ${col.bg}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-[10px] font-medium ${col.text}`}>{l}: {c}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DashboardProps { user: any; onLogout: () => void; }

export function IntakeCounselorDashboard({ user, onLogout }: DashboardProps) {
  const [appts, setAppts]           = useState<any[]>([]);
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
          setAppts(d.appointments || []);
        }
      } finally { setLoading(false); }
    })();
  }, [mounted]);

  const menuItems = getMenuItemsByRole(user.role);
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Counselor';

  const needsAction = appts.filter((a: any) =>
    ['REQUESTED', 'PENDING_APPROVAL'].includes((a.status || '').toUpperCase())
  );
  const todayStr = new Date().toDateString();
  const todayConfirmed = appts.filter((a: any) => {
    const dt = a.preferred_date || a.scheduled_start || '';
    try { return new Date(dt).toDateString() === todayStr &&
      ['CONFIRMED', 'APPROVED', 'MATCHED'].includes((a.status || '').toUpperCase()); }
    catch { return false; }
  });

  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return '—'; }
  };
  const fmtTime = (s: string) => {
    try { return new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); } catch { return ''; }
  };

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="" activeSection="dashboard">

      <div className="mb-5 pb-4 border-b border-gray-200">
        <p className="text-xs text-gray-400 mb-0.5">{dateLabel}</p>
        <h2 className="text-xl font-semibold text-gray-900">Good day, {firstName}.</h2>
      </div>

      {/* Quick action strip */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Appointment Requests', href: '/appointment-requests', icon: ClipboardList,
            count: needsAction.length, countColor: 'bg-orange-100 text-orange-600' },
          { label: 'Intake Tracker',       href: '/new-intakes',          icon: CalendarClock,
            count: null, countColor: '' },
          { label: 'My Availability',      href: '/availability',         icon: CalendarClock,
            count: null, countColor: '' },
        ].map(({ label, href, icon: Icon, count, countColor }) => (
          <Link key={href} href={href}
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-[#1a5228]/40 hover:bg-green-50/40 transition group">
            <div className="w-8 h-8 rounded-lg bg-[#1a5228]/8 flex items-center justify-center flex-shrink-0">
              <Icon size={15} className="text-[#1a5228]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700 leading-tight truncate">{label}</p>
              {count != null && count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${countColor}`}>{count} pending</span>
              )}
            </div>
            <ChevronRight size={13} className="text-gray-300 group-hover:text-[#1a5228] transition flex-shrink-0" />
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Pending confirmation */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Pending Confirmation</p>
                {needsAction.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-bold">
                    {needsAction.length}
                  </span>
                )}
              </div>
              <Link href="/appointment-requests" className="text-xs text-[#1a5228] hover:underline font-medium">View all</Link>
            </div>
            {needsAction.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <CheckCircle size={20} className="text-green-400 mb-2" />
                <p className="text-sm text-gray-600 font-medium">All slots confirmed</p>
                <p className="text-xs text-gray-400 mt-0.5">No pending confirmations right now.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {needsAction.slice(0, 5).map((a: any, i: number) => (
                  <div key={i} className="py-2.5 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0 text-xs font-bold text-orange-600">
                      {(a.student_name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-800 truncate">{a.student_name || 'Student'}</p>
                        {a.risk_level && ['RED', 'CRITICAL'].includes(a.risk_level.toUpperCase()) && (
                          <AlertCircle size={11} className="text-red-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {fmtDate(a.preferred_date || a.created_at)} · {(a.method || 'in-person').replace(/-/g, ' ')}
                      </p>
                    </div>
                    <Link href="/appointment-requests">
                      <button className="text-xs px-2.5 py-1 bg-[#1a5228] text-white rounded-lg hover:bg-[#16451f] transition flex-shrink-0">
                        Confirm
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's intakes */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Today's Intakes</p>
              <Link href="/appointment-requests" className="text-xs text-[#1a5228] hover:underline font-medium">View all</Link>
            </div>
            {todayConfirmed.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <p className="text-sm text-gray-600 font-medium">No intakes scheduled today</p>
                <p className="text-xs text-gray-400 mt-0.5">Confirmed appointments appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {todayConfirmed.slice(0, 5).map((a: any, i: number) => (
                  <div key={i} className="py-2.5 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#1a5228]/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#1a5228]">
                      {(a.student_name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{a.student_name || 'Student'}</p>
                      <p className="text-xs text-gray-400">{fmtTime(a.preferred_date || a.scheduled_start)}</p>
                    </div>
                    <Link href="/appointment-requests">
                      <button className="text-xs px-2.5 py-1 bg-[#1a5228] text-white rounded-lg hover:bg-[#16451f] transition flex-shrink-0">
                        Conduct
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PERMA wellbeing overview */}
          <PermaDistributionWidget />

          {/* PERMA trends over time */}
          <PermaTrendsWidget />

        </div>
      )}
    </DashboardLayout>
  );
}
