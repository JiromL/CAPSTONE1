'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Loader2, CheckCircle, AlertCircle, ClipboardList, CalendarClock, ChevronRight } from 'lucide-react';

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
            className="flex items-center gap-3 bg-white border border-gray-100 shadow-sm rounded-2xl px-4 py-3 hover:border-[#2563eb]/40 hover:bg-blue-50/40 transition group">
            <div className="w-8 h-8 rounded-lg bg-[#2563eb]/8 flex items-center justify-center flex-shrink-0">
              <Icon size={15} className="text-[#2563eb]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700 leading-tight truncate">{label}</p>
              {count != null && count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${countColor}`}>{count} pending</span>
              )}
            </div>
            <ChevronRight size={13} className="text-gray-300 group-hover:text-[#2563eb] transition flex-shrink-0" />
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
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Pending Confirmation</p>
                {needsAction.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-bold">
                    {needsAction.length}
                  </span>
                )}
              </div>
              <Link href="/appointment-requests" className="text-xs text-[#2563eb] hover:underline font-medium">View all</Link>
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
                      <button className="text-xs px-2.5 py-1 bg-[#2563eb] text-white rounded-lg hover:bg-blue-700 transition flex-shrink-0">
                        Review →
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's intakes */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Today's Intakes</p>
              <Link href="/appointment-requests" className="text-xs text-[#2563eb] hover:underline font-medium">View all</Link>
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
                    <div className="w-7 h-7 rounded-full bg-[#2563eb]/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#2563eb]">
                      {(a.student_name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{a.student_name || 'Student'}</p>
                      <p className="text-xs text-gray-400">{fmtTime(a.preferred_date || a.scheduled_start)}</p>
                    </div>
                    <Link href="/appointment-requests">
                      <button className="text-xs px-2.5 py-1 bg-[#2563eb] text-white rounded-lg hover:bg-blue-700 transition flex-shrink-0">
                        Conduct
                      </button>
                    </Link>
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
