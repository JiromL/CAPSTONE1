'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { fetchDashboardData } from '@/utils/dashboard-api';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { AlertTriangle, Users, Activity, ChevronRight, Loader2, Calendar, FileText, Shield } from 'lucide-react';

interface DashboardProps { user: any; onLogout: () => void; }

const RISK_BADGE: Record<string, string> = {
  CRITICAL: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700',
  RED:      'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700',
  YELLOW:   'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
  GREEN:    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700',
};

function KpiCard({ label, value, sub, iconBg, icon, accent }: any) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className={`text-2xl font-bold leading-tight ${accent || 'text-gray-900 dark:text-white'}`}>{value}</p>
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

export function PsychologistDashboard({ user, onLogout }: DashboardProps) {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading]             = useState(true);
  const [mounted, setMounted]             = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    (async () => {
      try {
        const data = await fetchDashboardData(token).catch(() => null);
        if (data) setDashboardData(data);
      } finally { setLoading(false); }
    })();
  }, [mounted]);

  const menuItems   = getMenuItemsByRole(user.role);
  const summary     = dashboardData?.summary || {};
  const alerts      = dashboardData?.alerts || [];
  const cases       = dashboardData?.recent_cases || [];
  const firstName   = user.first_name || user.name?.split(' ')[0] || 'Psychologist';

  const criticalCount = cases.filter((c: any) => c.risk_level === 'CRITICAL').length;
  const highRiskCount = cases.filter((c: any) => ['CRITICAL','RED'].includes(c.risk_level)).length;

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="Clinical oversight" activeSection="dashboard">

      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Welcome, {firstName}.</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Clinical caseload and high-risk overview.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
          <Loader2 size={20} className="animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <KpiCard label="Assigned Cases"   value={summary.assigned_cases ?? cases.length}   sub="active caseload"  iconBg="bg-green-50 dark:bg-green-900/30" icon={<Users size={16} className="text-green-600 dark:text-green-400"/>} />
            <KpiCard label="Critical Cases"   value={criticalCount}   sub="immediate review needed" iconBg="bg-red-50 dark:bg-red-900/30"    icon={<AlertTriangle size={16} className="text-red-600 dark:text-red-400"/>} accent="text-red-600 dark:text-red-400" />
            <KpiCard label="High-Risk Total"  value={highRiskCount}   sub="RED + CRITICAL"          iconBg="bg-orange-50 dark:bg-orange-900/30" icon={<Shield size={16} className="text-orange-600 dark:text-orange-400"/>} />
            <KpiCard label="High-Risk Alerts" value={summary.high_risk_alerts ?? alerts.length} sub="pending action" iconBg="bg-yellow-50 dark:bg-yellow-900/30" icon={<Activity size={16} className="text-yellow-600 dark:text-yellow-400"/>} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Quick Access</p>
              <div className="space-y-2">
                <ActionCard href="/high-risk"              label="High-Risk Monitoring" iconBg="bg-red-50 dark:bg-red-900/30"      icon={<AlertTriangle size={13} className="text-red-600"/>} />
                <ActionCard href="/cases"                  label="All Cases"            iconBg="bg-green-50 dark:bg-green-900/30" icon={<FileText size={13} className="text-green-600"/>} />
                <ActionCard href="/counseling-cases"       label="Counseling Cases"     iconBg="bg-blue-50 dark:bg-blue-900/30"   icon={<Users size={13} className="text-blue-600"/>} />
                <ActionCard href="/appointments"           label="Appointments"         iconBg="bg-green-50 dark:bg-green-900/30" icon={<Calendar size={13} className="text-green-600"/>} />
                <ActionCard href="/assessments"            label="Assessments"          iconBg="bg-teal-50 dark:bg-teal-900/30"   icon={<Activity size={13} className="text-teal-600"/>} />
              </div>
            </div>

            {/* High-Risk Alerts */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Alerts</p>
                {alerts.length > 0 && <Link href="/high-risk" className="text-xs text-green-600 dark:text-green-400 hover:underline">View all</Link>}
              </div>
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <Shield size={24} className="text-green-500 mb-2" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">No active alerts</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">All cases are within normal range.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.slice(0, 5).map((a: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg">
                      <div>
                        <p className="text-xs font-medium text-red-800 dark:text-red-200">ID: {a.counseling_id || 'N/A'}</p>
                        <p className="text-xs text-red-600 dark:text-red-400">{a.risk_level}</p>
                      </div>
                      <Link href={`/cases/${a.case_id}`}>
                        <button className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">Review</button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Cases */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Recent Cases</p>
                <Link href="/cases" className="text-xs text-green-600 dark:text-green-400 hover:underline">View all</Link>
              </div>
              {cases.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No recent cases.</p>
              ) : (
                <div className="space-y-2">
                  {cases.slice(0, 5).map((c: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <p className="text-xs font-medium text-gray-900 dark:text-white">ID: {c.counseling_id || 'N/A'}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${RISK_BADGE[c.risk_level] || RISK_BADGE.GREEN}`}>
                        {c.risk_level || 'GREEN'}
                      </span>
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
