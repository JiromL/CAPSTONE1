'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { fetchDashboardData } from '@/utils/dashboard-api';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Users, AlertTriangle, Calendar, FileText, ChevronRight, Loader2, Activity } from 'lucide-react';

interface DashboardProps { user: any; onLogout: () => void; }

const RISK_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700',
  RED:      'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700',
  YELLOW:   'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
  GREEN:    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700',
};

function KpiCard({ label, value, sub, iconBg, icon }: any) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ActionCard({ href, label, iconBg, icon }: any) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 rounded-xl hover:border-green-300 dark:hover:border-green-700 transition-colors cursor-pointer group">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>{icon}</div>
        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{label}</span>
        <ChevronRight size={13} className="text-gray-400 group-hover:text-green-500 flex-shrink-0" />
      </div>
    </Link>
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
          const today = new Date().toDateString();
          const confirmed = (d.appointments?.confirmed || []).filter((a: any) => {
            const dt = a.preferred_date || a.requested_start || '';
            try { return new Date(dt).toDateString() === today; } catch { return false; }
          });
          setTodayAppts(confirmed.slice(0, 5));
        }
      } finally { setLoading(false); }
    })();
  }, [mounted]);

  const menuItems    = getMenuItemsByRole(user.role);
  const summary      = dashboardData?.summary || {};
  const alerts       = dashboardData?.alerts || [];
  const recentCases  = dashboardData?.recent_cases || [];
  const firstName    = user.first_name || user.name?.split(' ')[0] || 'Counselor';

  const fmtTime = (s: string) => { try { return new Date(s).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true}); } catch { return '—'; } };

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="Session management overview" activeSection="dashboard">

      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Welcome, {firstName}.</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Here's your caseload at a glance.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
          <Loader2 size={20} className="animate-spin" /> Loading…
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <KpiCard label="Assigned Cases"     value={summary.assigned_cases ?? 0}    sub="active"          iconBg="bg-green-50 dark:bg-green-900/30" icon={<Users size={16} className="text-green-600 dark:text-green-400"/>} />
            <KpiCard label="Recent Assessments" value={summary.recent_assessments ?? 0} sub="last 30 days"   iconBg="bg-blue-50 dark:bg-blue-900/30"   icon={<Activity size={16} className="text-blue-600 dark:text-blue-400"/>} />
            <KpiCard label="High-Risk Alerts"   value={summary.high_risk_alerts ?? alerts.length} sub="need attention" iconBg="bg-red-50 dark:bg-red-900/30" icon={<AlertTriangle size={16} className="text-red-600 dark:text-red-400"/>} />
            <KpiCard label="Today's Sessions"   value={todayAppts.length}              sub="confirmed"       iconBg="bg-green-50 dark:bg-green-900/30"  icon={<Calendar size={16} className="text-green-600 dark:text-green-400"/>} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Quick Access</p>
              <div className="space-y-2">
                <ActionCard href="/cases"                   label="My Cases"             iconBg="bg-green-50 dark:bg-green-900/30" icon={<FileText size={13} className="text-green-600"/>} />
                <ActionCard href="/appointments"            label="Appointments"         iconBg="bg-blue-50 dark:bg-blue-900/30"   icon={<Calendar size={13} className="text-blue-600"/>} />
                <ActionCard href="/assessments"             label="Assessments"          iconBg="bg-teal-50 dark:bg-teal-900/30"   icon={<Activity size={13} className="text-teal-600"/>} />
                <ActionCard href="/check-ins"               label="Check-Ins"            iconBg="bg-green-50 dark:bg-green-900/30" icon={<Users size={13} className="text-green-600"/>} />
                <ActionCard href="/counselor/schedule"      label="My Schedule"          iconBg="bg-purple-50 dark:bg-purple-900/30" icon={<Calendar size={13} className="text-purple-600"/>} />
              </div>
            </div>

            {/* Today's Appointments */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Today's Sessions</p>
              {todayAppts.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No sessions scheduled for today.</p>
              ) : (
                <div className="space-y-2">
                  {todayAppts.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                        <Calendar size={13} className="text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{a.student_name || 'Student'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{fmtTime(a.preferred_date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* High-Risk Alerts / Recent Cases */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                {alerts.length > 0 ? 'High-Risk Alerts' : 'Recent Cases'}
              </p>
              {alerts.length > 0 ? (
                <div className="space-y-2">
                  {alerts.slice(0, 4).map((a: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg">
                      <div>
                        <p className="text-xs font-medium text-red-800 dark:text-red-200">ID: {a.counseling_id || 'N/A'}</p>
                        <p className="text-xs text-red-600 dark:text-red-400">{a.risk_level}</p>
                      </div>
                      <Link href={`/cases/${a.case_id}`}>
                        <button className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">View</button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : recentCases.length > 0 ? (
                <div className="space-y-2">
                  {recentCases.slice(0, 4).map((c: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-900 dark:text-white">ID: {c.counseling_id || 'N/A'}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${RISK_COLORS[c.risk_level] || RISK_COLORS.GREEN}`}>
                        {c.risk_level || 'GREEN'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No cases to display.</p>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
