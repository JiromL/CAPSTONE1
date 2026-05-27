'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Calendar, Users, ClipboardList, ChevronRight, Loader2, UserPlus, ListChecks, RefreshCw, Clock } from 'lucide-react';

interface DashboardProps { user: any; onLogout: () => void; }

function KpiCard({ label, value, sub, iconBg, icon, urgent }: any) {
  return (
    <div className={`bg-white dark:bg-gray-900 border rounded-xl p-4 flex items-start gap-3 ${urgent ? 'border-orange-200 dark:border-orange-700' : 'border-gray-200 dark:border-gray-700'}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className={`text-2xl font-bold leading-tight ${urgent ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ActionCard({ href, label, desc, iconBg, icon, badge }: any) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 rounded-xl hover:border-green-300 dark:hover:border-green-700 transition-colors cursor-pointer group">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
          {desc && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{desc}</p>}
        </div>
        {badge != null && badge > 0 && (
          <span className="text-xs font-bold bg-orange-500 text-white rounded-full min-w-5 h-5 flex items-center justify-center px-1">{badge}</span>
        )}
        <ChevronRight size={13} className="text-gray-400 group-hover:text-green-500 flex-shrink-0" />
      </div>
    </Link>
  );
}

export function SupportStaffDashboard({ user, onLogout }: DashboardProps) {
  const [summary, setSummary]       = useState<any>(null);
  const [pendingList, setPendingList] = useState<any[]>([]);
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
          // Generic dashboard returns a flat appointments array
          const appts = d.appointments || [];
          const pending = appts.filter((a: any) => ['REQUESTED','PENDING_APPROVAL'].includes((a.status||'').toUpperCase()));
          setSummary({ total: appts.length, pending: pending.length });
          setPendingList(pending.slice(0, 5));
        }
      } finally { setLoading(false); }
    })();
  }, [mounted]);

  const menuItems = getMenuItemsByRole(user.role);
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Staff';

  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleDateString('en-US',{month:'short',day:'numeric'}); } catch { return '—'; }
  };

  const METHOD_LABEL: Record<string, string> = {
    'in-person': 'In-person', 'walk_in': 'Walk-in', 'online': 'Online',
    'gmeet': 'Google Meet', 'zoom': 'Zoom', 'phone': 'Phone',
  };

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="Appointment & office management" activeSection="dashboard">

      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Welcome, {firstName}.</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Here's today's operational overview.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
          <Loader2 size={20} className="animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <KpiCard label="Pending Requests" value={summary?.pending ?? 0}  sub="need assignment" iconBg="bg-orange-50 dark:bg-orange-900/30" icon={<ClipboardList size={16} className="text-orange-600 dark:text-orange-400"/>} urgent />
            <KpiCard label="All Appointments" value={summary?.total ?? 0}    sub="in system"       iconBg="bg-green-50 dark:bg-green-900/30" icon={<Calendar size={16} className="text-green-600 dark:text-green-400"/>} />
            <KpiCard label="Waitlist"         value={0}                       sub="view waitlist"   iconBg="bg-blue-50 dark:bg-blue-900/30"   icon={<Clock size={16} className="text-blue-600 dark:text-blue-400"/>} />
            <KpiCard label="Reschedule"       value={0}                       sub="requests"        iconBg="bg-teal-50 dark:bg-teal-900/30"   icon={<RefreshCw size={16} className="text-teal-600 dark:text-teal-400"/>} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Quick Actions</p>
              <div className="space-y-2">
                <ActionCard href="/new-intakes"                   label="Walk-In Intake"          desc="Register a walk-in student"       iconBg="bg-green-50 dark:bg-green-900/30"  icon={<UserPlus size={14} className="text-green-600"/>} />
                <ActionCard href="/appointment-requests"          label="Appointment Requests"    desc="Assign counselors"                iconBg="bg-orange-50 dark:bg-orange-900/30"  icon={<Calendar size={14} className="text-orange-600"/>} badge={summary?.pending} />
                <ActionCard href="/reschedule-requests"           label="Reschedule Requests"     desc="Handle rescheduling"              iconBg="bg-teal-50 dark:bg-teal-900/30"      icon={<RefreshCw size={14} className="text-teal-600"/>} />
                <ActionCard href="/waitlist"                      label="Waitlist"                desc="Manage waitlist queue"            iconBg="bg-blue-50 dark:bg-blue-900/30"      icon={<Clock size={14} className="text-blue-600"/>} />
                <ActionCard href="/staff/batch-assign"            label="Batch Assign"            desc="Assign multiple at once"          iconBg="bg-purple-50 dark:bg-purple-900/30"  icon={<ListChecks size={14} className="text-purple-600"/>} />
                <ActionCard href="/check-in-tracking"             label="Check-In Tracking"       desc="Monitor client check-ins"         iconBg="bg-green-50 dark:bg-green-900/30"    icon={<Users size={14} className="text-green-600"/>} />
              </div>
            </div>

            {/* Pending appointment requests */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pending Assignments</p>
                <Link href="/appointment-requests" className="text-xs text-green-600 dark:text-green-400 hover:underline">View all</Link>
              </div>
              {pendingList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-36 text-center">
                  <ListChecks size={28} className="text-green-500 mb-2" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Queue is clear!</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">All appointments have been assigned.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingList.map((req: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-lg">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                        <Calendar size={12} className="text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{req.student_name || 'Student'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {fmtDate(req.preferred_date || req.created_at)} · {METHOD_LABEL[req.method] || req.method || 'in-person'}
                        </p>
                        <span className="inline-block mt-1 text-xs px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
                          {req.status}
                        </span>
                      </div>
                      <Link href="/appointment-requests">
                        <button className="text-xs px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex-shrink-0">Assign</button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Secondary tools */}
          <div className="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">More Tools</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <ActionCard href="/staff/workload-report"        label="Workload Report"       iconBg="bg-blue-50 dark:bg-blue-900/30"   icon={<ClipboardList size={13} className="text-blue-600"/>} />
              <ActionCard href="/staff/reassignment-suggestions" label="Reassign Suggestions" iconBg="bg-purple-50 dark:bg-purple-900/30" icon={<RefreshCw size={13} className="text-purple-600"/>} />
              <ActionCard href="/availability"                 label="Calendar Settings"     iconBg="bg-teal-50 dark:bg-teal-900/30"   icon={<Calendar size={13} className="text-teal-600"/>} />
              <ActionCard href="/tasks"                        label="My Tasks"              iconBg="bg-gray-100 dark:bg-gray-800"     icon={<ListChecks size={13} className="text-gray-600"/>} />
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
