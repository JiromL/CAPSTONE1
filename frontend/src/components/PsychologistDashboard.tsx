'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { fetchDashboardData } from '@/utils/dashboard-api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { ArrowRight, Loader2, Shield } from 'lucide-react';

interface DashboardProps { user: any; onLogout: () => void; }

const RISK_BADGE: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
  RED:      'bg-orange-100 text-orange-700 border-orange-200',
  YELLOW:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  GREEN:    'bg-green-100 text-green-700 border-green-200',
};

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

  const menuItems     = getMenuItemsByRole(user.role);
  const summary       = dashboardData?.summary || {};
  const alerts        = dashboardData?.alerts || [];
  const cases         = dashboardData?.recent_cases || [];
  const firstName     = user.first_name || user.name?.split(' ')[0] || 'Psychologist';
  const criticalCount = cases.filter((c: any) => c.risk_level === 'CRITICAL').length;
  const highRiskCount = cases.filter((c: any) => ['CRITICAL','RED'].includes(c.risk_level)).length;

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="" activeSection="dashboard">

      <div className="mb-6 pb-5 border-b border-gray-200">
        <p className="text-xs text-gray-400 mb-0.5">{todayStr}</p>
        <h2 className="text-xl font-semibold text-gray-900">Good day, {firstName}.</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stat strip */}
          <div className="flex items-center gap-8 flex-wrap">
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.assigned_cases ?? cases.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Active caseload</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Critical cases</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <p className="text-2xl font-bold text-orange-500">{highRiskCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">High-risk (RED+)</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.high_risk_alerts ?? alerts.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Pending alerts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Quick links */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Pages</p>
              <div className="divide-y divide-gray-100">
                <Link href="/high-risk" className="flex items-center justify-between py-2.5 text-sm text-gray-700 hover:text-[#1a5228] transition-colors group">
                  <span>High-Risk Monitoring</span>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-[#1a5228] transition-colors" />
                </Link>
                <Link href="/cases" className="flex items-center justify-between py-2.5 text-sm text-gray-700 hover:text-[#1a5228] transition-colors group">
                  <span>All Cases</span>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-[#1a5228] transition-colors" />
                </Link>
                <Link href="/counseling-cases" className="flex items-center justify-between py-2.5 text-sm text-gray-700 hover:text-[#1a5228] transition-colors group">
                  <span>Counseling Cases</span>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-[#1a5228] transition-colors" />
                </Link>
                <Link href="/appointments" className="flex items-center justify-between py-2.5 text-sm text-gray-700 hover:text-[#1a5228] transition-colors group">
                  <span>Appointments</span>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-[#1a5228] transition-colors" />
                </Link>
                <Link href="/assessments" className="flex items-center justify-between py-2.5 text-sm text-gray-700 hover:text-[#1a5228] transition-colors group">
                  <span>Assessments</span>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-[#1a5228] transition-colors" />
                </Link>
              </div>
            </div>

            {/* Alerts */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Alerts</p>
                {alerts.length > 0 && (
                  <Link href="/high-risk" className="text-xs text-[#1a5228] hover:underline">View all</Link>
                )}
              </div>
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <Shield size={22} className="text-green-400 mb-2" />
                  <p className="text-sm text-gray-600 font-medium">No active alerts</p>
                  <p className="text-xs text-gray-400 mt-1">All cases within normal range.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {alerts.slice(0, 5).map((a: any, i: number) => (
                    <div key={i} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">ID: {a.counseling_id || 'N/A'}</p>
                        <p className="text-xs text-red-500 mt-0.5">{a.risk_level}</p>
                      </div>
                      <Link href={`/cases/${a.case_id}`}>
                        <button className="text-xs px-2.5 py-1 text-white rounded-lg transition-colors"
                          style={{ backgroundColor: '#1a5228' }}>
                          Review
                        </button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent cases */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Recent Cases</p>
                <Link href="/cases" className="text-xs text-[#1a5228] hover:underline">View all</Link>
              </div>
              {cases.length === 0 ? (
                <p className="text-sm text-gray-500">No recent cases.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {cases.slice(0, 5).map((c: any, i: number) => (
                    <div key={i} className="py-2.5 flex items-center justify-between">
                      <p className="text-sm text-gray-800">ID: {c.counseling_id || 'N/A'}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${RISK_BADGE[c.risk_level] || RISK_BADGE.GREEN}`}>
                        {c.risk_level || 'GREEN'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
