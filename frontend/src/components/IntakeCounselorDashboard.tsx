'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

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

      <div className="mb-6 pb-5 border-b border-gray-200">
        <p className="text-xs text-gray-400 mb-0.5">{dateLabel}</p>
        <h2 className="text-xl font-semibold text-gray-900">Good day, {firstName}.</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* PERMA wellbeing overview */}
          <PermaDistributionWidget />

          {/* Needs action */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                Needs Assignment
                {needsAction.length > 0 && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium normal-case tracking-normal">
                    {needsAction.length}
                  </span>
                )}
              </p>
              <Link href="/appointment-requests" className="text-xs text-[#1a5228] hover:underline">View all</Link>
            </div>
            {needsAction.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-36 text-center">
                <CheckCircle size={22} className="text-green-400 mb-2" />
                <p className="text-sm text-gray-600 font-medium">All requests assigned</p>
                <p className="text-xs text-gray-400 mt-1">No unassigned appointments right now.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {needsAction.slice(0, 6).map((a: any, i: number) => (
                  <div key={i} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-800">{a.student_name || 'Student'}</p>
                        {a.risk_level && ['RED', 'CRITICAL'].includes(a.risk_level.toUpperCase()) && (
                          <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {fmtDate(a.preferred_date || a.created_at)} · {a.method || 'in-person'}
                      </p>
                    </div>
                    <Link href="/appointment-requests">
                      <button className="text-xs px-2.5 py-1 text-white rounded-lg transition-colors flex-shrink-0"
                        style={{ backgroundColor: '#1a5228' }}>
                        Assign
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's confirmed sessions */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Today's Sessions</p>
              <Link href="/appointments" className="text-xs text-[#1a5228] hover:underline">View all</Link>
            </div>
            {todayConfirmed.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-36 text-center">
                <p className="text-sm text-gray-600 font-medium">No sessions today</p>
                <p className="text-xs text-gray-400 mt-1">Confirmed appointments will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {todayConfirmed.slice(0, 6).map((a: any, i: number) => (
                  <div key={i} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{a.student_name || 'Student'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {fmtTime(a.preferred_date || a.scheduled_start)} · {a.counselor_name || 'Counselor TBD'}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 font-medium">
                      Confirmed
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </DashboardLayout>
  );
}
