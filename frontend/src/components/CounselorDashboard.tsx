'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { fetchDashboardData } from '@/utils/dashboard-api';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Loader2, Shield, MoreHorizontal, Calendar, AlertTriangle } from 'lucide-react';

interface AttentionCase {
  _id: string;
  student_name: string;
  case_status: string;
  risk_level: string;
  reason: string;
}

function CasesNeedingAttention() {
  const [cases, setCases] = useState<AttentionCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(api('/api/cases?limit=50'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        const all: any[] = d.cases || d || [];
        const attention: AttentionCase[] = [];
        for (const c of all) {
          const status = (c.case_status || '').toUpperCase();
          const risk = (c.risk_level || '').toUpperCase();
          if (status === 'PENDING_TERMINATION') {
            attention.push({ _id: c._id, student_name: c.student_name || 'Student', case_status: c.case_status, risk_level: c.risk_level, reason: '3 consecutive no-shows' });
          } else if (risk === 'CRITICAL' || risk === 'RED') {
            attention.push({ _id: c._id, student_name: c.student_name || 'Student', case_status: c.case_status, risk_level: c.risk_level, reason: `${c.risk_level} risk` });
          }
        }
        setCases(attention.slice(0, 6));
      })
      .catch(() => { setFetchError(true); })
      .finally(() => setLoading(false));
  }, []);

  const reasonColor = (c: AttentionCase) => {
    if (c.case_status?.toUpperCase() === 'PENDING_TERMINATION') return 'text-red-600 dark:text-red-400';
    const r = (c.risk_level || '').toUpperCase();
    if (r === 'CRITICAL') return 'text-red-600 dark:text-red-400';
    if (r === 'RED') return 'text-orange-600 dark:text-orange-400';
    return 'text-gray-400';
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 shadow-sm rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500" />
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cases Needing Attention</p>
        </div>
        <Link href="/cases" className="text-xs text-[#2563eb] dark:text-blue-400 hover:underline font-medium">View all</Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-400 gap-2 text-xs">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : fetchError ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <AlertTriangle size={18} className="text-amber-400 mb-2" />
          <p className="text-sm text-gray-500">Could not load cases</p>
          <p className="text-xs text-gray-400 mt-0.5">Check your connection and refresh the page.</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <Shield size={22} className="text-green-400 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">All cases on track</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">No cases require immediate attention.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {cases.map(c => (
            <div key={c._id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{c.student_name}</p>
                <p className={`text-xs mt-0.5 font-medium ${reasonColor(c)}`}>{c.reason}</p>
              </div>
              <Link href={`/cases/${c._id}`}
                className="flex-shrink-0 text-xs px-2.5 py-1 text-white rounded-lg transition-colors"
                style={{ backgroundColor: '#2563eb' }}>
                View
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DashboardProps { user: any; onLogout: () => void; }

function getSessionType(a: any): string {
  const ref = (a.referral_type || '').toUpperCase();
  if (ref === 'WALKIN') return 'Walk-in';
  if (ref.includes('EMERGENCY') || ref.includes('CRISIS')) return 'Crisis';
  if (ref.includes('FOLLOW')) return 'Follow-up';
  if (ref === 'INTAKE' || ref === 'EVALUATION') return 'Intake';
  const status = (a.status || '').toUpperCase();
  if (status === 'FOLLOW_UP') return 'Follow-up';
  if (status === 'EVALUATION') return 'Intake';
  if (status === 'REFERRAL') return 'Referral';
  return 'Individual';
}

function SessionTypeBadge({ type }: { type: string }) {
  const cfg: Record<string, string> = {
    'Individual': 'text-blue-600 dark:text-blue-400',
    'Follow-up':  'text-purple-600 dark:text-purple-400',
    'Intake':     'text-teal-600 dark:text-teal-400',
    'Crisis':     'text-red-600 dark:text-red-400',
    'Walk-in':    'text-orange-600 dark:text-orange-400',
    'Referral':   'text-indigo-600 dark:text-indigo-400',
  };
  return <span className={`text-sm ${cfg[type] || 'text-gray-600 dark:text-gray-300'}`}>{type}</span>;
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

function TodayScheduleTable({ appts, fmtTime }: { appts: any[]; fmtTime: (s: string) => string }) {
  const sorted = [...appts].sort((a, b) => {
    const da = new Date(a.preferred_date || a.scheduled_start || 0).getTime();
    const db2 = new Date(b.preferred_date || b.scheduled_start || 0).getTime();
    return da - db2;
  });

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 shadow-sm rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-[#2563eb]" />
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">Today's Schedule</p>
        </div>
        <Link href="/appointments" className="text-xs text-[#2563eb] dark:text-blue-400 hover:underline font-medium">View all</Link>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-36 text-center px-5 pb-5">
          <Calendar size={22} className="text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No sessions today</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Your confirmed appointments will appear here.</p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[90px_1fr_110px_130px_36px] px-5 pb-2 gap-3">
            {['TIME', 'STUDENT', 'TYPE', 'STATUS', ''].map((h, i) => (
              <p key={i} className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{h}</p>
            ))}
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {sorted.map((a: any, i: number) => {
              const time = fmtTime(a.preferred_date || a.scheduled_start || '');
              const type = getSessionType(a);
              return (
                <div key={i} className="grid grid-cols-[90px_1fr_110px_130px_36px] items-center px-5 py-3.5 gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 tabular-nums">{time}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-200 truncate font-medium">{a.student_name || 'Student'}</span>
                  <SessionTypeBadge type={type} />
                  <SessionStatusBadge status={a.status} />
                  <Link href={a.case_id ? `/cases/${a.case_id}` : '/appointments'}
                    className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <MoreHorizontal size={15} />
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}


export function CounselorDashboard({ user, onLogout }: DashboardProps) {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [todayAppts, setTodayAppts]       = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [mounted, setMounted]             = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    (async () => {
      try {
        const [dash, apptRes] = await Promise.all([
          fetchDashboardData(token).catch(() => null),
          fetch(api('/api/appointments/dashboard/role-view'), { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (dash) setDashboardData(dash);
        if (apptRes.ok) {
          const d = await apptRes.json();
          const todayStr = new Date().toDateString();
          const allAppts: any[] = d.appointments || [];
          const confirmed = allAppts.filter((a: any) => {
            const dt = a.preferred_date || a.scheduled_start || a.requested_start || '';
            try { return new Date(dt).toDateString() === todayStr &&
              ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN'].includes((a.status || '').toUpperCase()); }
            catch { return false; }
          });
          setTodayAppts(confirmed.slice(0, 6));
        }
      } finally { setLoading(false); }
    })();
  }, [mounted]);

  const menuItems   = getMenuItemsByRole(user.role);
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Counselor';

  const fmtTime = (s: string) => {
    try { return new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); } catch { return '—'; }
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

          {/* Today's Schedule */}
          <TodayScheduleTable appts={todayAppts} fmtTime={fmtTime} />

          {/* Cases needing immediate attention */}
          <CasesNeedingAttention />

        </div>
      )}
    </DashboardLayout>
  );
}
