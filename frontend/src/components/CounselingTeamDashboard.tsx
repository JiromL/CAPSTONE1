'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Loader2, ArrowRight } from 'lucide-react';

interface DashboardProps { user: any; onLogout: () => void; }

export function CounselingTeamDashboard({ user, onLogout }: DashboardProps) {
  const [appts, setAppts]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

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
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Team Member';
  const roleLabel = user.role?.toUpperCase() === 'CSC' ? 'CSC' : 'CSP';

  const todayStr = new Date().toDateString();
  const todayAppts = appts.filter((a: any) => {
    const dt = a.preferred_date || a.scheduled_start || '';
    try { return new Date(dt).toDateString() === todayStr &&
      ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN'].includes((a.status || '').toUpperCase()); }
    catch { return false; }
  });
  const pendingEval = appts.filter((a: any) =>
    (a.status || '').toUpperCase() === 'EVALUATION'
  );

  const fmtTime = (s: string) => {
    try { return new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); } catch { return ''; }
  };

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const LINKS = [
    { href: '/cases',                label: 'Cases' },
    { href: '/counseling-cases',     label: 'Counseling Cases' },
    { href: '/appointments',         label: 'Appointments' },
    { href: '/referrals',            label: 'Referrals' },
    { href: '/supervision',          label: 'Supervision' },
    { href: '/recurring-appointments', label: 'Recurring Sessions' },
    { href: '/assessments',          label: 'Assessments' },
    { href: '/mhbot',                label: 'MHBot / PERMA' },
  ];

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="" activeSection="dashboard">

      <div className="mb-6 pb-5 border-b border-gray-200">
        <p className="text-xs text-gray-400 mb-0.5">{dateLabel}</p>
        <h2 className="text-xl font-semibold text-gray-900">Good day, {firstName}.</h2>
        <p className="text-sm text-gray-400 mt-0.5">{roleLabel} — Client case support and coordination</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Today's sessions + pending evaluations */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Today's Sessions</p>
              <Link href="/appointments" className="text-xs text-[#1a5228] hover:underline">View all</Link>
            </div>
            {todayAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 text-center">
                <p className="text-sm text-gray-600 font-medium">No sessions today</p>
                <p className="text-xs text-gray-400 mt-1">Confirmed appointments will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {todayAppts.slice(0, 5).map((a: any, i: number) => (
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

            {pendingEval.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                    Awaiting Evaluation
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium normal-case tracking-normal">
                      {pendingEval.length}
                    </span>
                  </p>
                  <Link href="/appointment-requests" className="text-xs text-[#1a5228] hover:underline">Review</Link>
                </div>
                {pendingEval.slice(0, 3).map((a: any, i: number) => (
                  <div key={i} className="py-1.5 flex items-center justify-between">
                    <p className="text-sm text-gray-700">{a.student_name || 'Student'}</p>
                    <span className="text-xs text-amber-600">Evaluation pending</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick navigation */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Quick Access</p>
            <div className="divide-y divide-gray-100">
              {LINKS.map(({ href, label }) => (
                <Link key={href} href={href}
                  className="flex items-center justify-between py-2.5 text-sm text-gray-700 hover:text-[#1a5228] transition-colors group">
                  <span>{label}</span>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-[#1a5228] transition-colors" />
                </Link>
              ))}
            </div>
          </div>

        </div>
      )}
    </DashboardLayout>
  );
}
