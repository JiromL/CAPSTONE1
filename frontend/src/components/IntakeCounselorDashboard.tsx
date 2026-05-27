'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { ClipboardList, Calendar, AlertCircle, CheckCircle, ChevronRight, Loader2, Users } from 'lucide-react';

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
          <span className="text-xs font-bold bg-red-500 text-white rounded-full min-w-5 h-5 flex items-center justify-center px-1">{badge}</span>
        )}
        <ChevronRight size={13} className="text-gray-400 group-hover:text-green-500 flex-shrink-0" />
      </div>
    </Link>
  );
}

export function IntakeCounselorDashboard({ user, onLogout }: DashboardProps) {
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
          setSummary(d.summary || {});
          setPendingList((d.pending_requests || []).slice(0, 5));
        }
      } finally { setLoading(false); }
    })();
  }, [mounted]);

  const menuItems = getMenuItemsByRole(user.role);
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Counselor';

  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleDateString('en-US',{month:'short',day:'numeric'}); } catch { return '—'; }
  };

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="Intake processing overview" activeSection="dashboard">

      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Welcome, {firstName}.</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Here's your intake queue at a glance.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
          <Loader2 size={20} className="animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <KpiCard label="Action Required" value={summary?.action_required ?? 0}        sub="need attention"      iconBg="bg-orange-50 dark:bg-orange-900/30" icon={<AlertCircle size={16} className="text-orange-600 dark:text-orange-400"/>} urgent />
            <KpiCard label="Unassigned"       value={summary?.unassigned_requests ?? 0}   sub="no counselor yet"    iconBg="bg-red-50 dark:bg-red-900/30"    icon={<ClipboardList size={16} className="text-red-600 dark:text-red-400"/>} />
            <KpiCard label="Awaiting Approval" value={summary?.awaiting_approval ?? 0}    sub="pending confirmation" iconBg="bg-green-50 dark:bg-green-900/30" icon={<Users size={16} className="text-green-600 dark:text-green-400"/>} />
            <KpiCard label="Scheduled Today"  value={0}                                   sub="see appointments"    iconBg="bg-green-50 dark:bg-green-900/30" icon={<Calendar size={16} className="text-green-600 dark:text-green-400"/>} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Quick Actions</p>
              <div className="space-y-2">
                <ActionCard href="/new-intakes"          label="New Intakes"           desc="Process incoming intake forms"  iconBg="bg-green-50 dark:bg-green-900/30" icon={<ClipboardList size={14} className="text-green-600"/>} badge={summary?.unassigned_requests} />
                <ActionCard href="/appointment-requests" label="Appointment Requests"  desc="Assign counselors to requests"  iconBg="bg-orange-50 dark:bg-orange-900/30" icon={<Calendar size={14} className="text-orange-600"/>}     badge={summary?.action_required} />
                <ActionCard href="/assessments"          label="Assessments"           desc="Review completed assessments"   iconBg="bg-blue-50 dark:bg-blue-900/30"   icon={<CheckCircle size={14} className="text-blue-600"/>} />
                <ActionCard href="/reminders"            label="Reminders"             desc="Follow-up reminders"            iconBg="bg-teal-50 dark:bg-teal-900/30"   icon={<AlertCircle size={14} className="text-teal-600"/>} />
                <ActionCard href="/mhbot"                label="MHBot / PERMA"         desc="Mental health tracking"         iconBg="bg-purple-50 dark:bg-purple-900/30" icon={<Users size={14} className="text-purple-600"/>} />
              </div>
            </div>

            {/* Pending requests */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pending Requests</p>
                <Link href="/appointment-requests" className="text-xs text-green-600 dark:text-green-400 hover:underline">View all</Link>
              </div>
              {pendingList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <CheckCircle size={24} className="text-green-500 mb-2" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">All clear!</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">No pending requests right now.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingList.map((req: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{req.student_name || 'Student'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(req.preferred_date || req.created_at)} · {req.method || 'in-person'}</p>
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
        </>
      )}
    </DashboardLayout>
  );
}
