'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { fetchDashboardData } from '@/utils/dashboard-api';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Loader2, Shield } from 'lucide-react';

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

const RISK_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  RED:      'bg-orange-400',
  YELLOW:   'bg-yellow-400',
  GREEN:    'bg-green-500',
};
const RISK_LABEL_CLS: Record<string, string> = {
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
  RED:      'bg-orange-50 text-orange-700 border-orange-200',
  YELLOW:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  GREEN:    'bg-green-50 text-green-700 border-green-200',
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

  const menuItems = getMenuItemsByRole(user.role);
  const alerts    = dashboardData?.alerts || [];
  const cases     = dashboardData?.recent_cases || [];
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Psychologist';

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

          {/* Alerts */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                High-Risk Alerts
                {alerts.length > 0 && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium normal-case tracking-normal">
                    {alerts.length}
                  </span>
                )}
              </p>
              {alerts.length > 0 && (
                <Link href="/high-risk" className="text-xs text-[#1a5228] hover:underline">View all</Link>
              )}
            </div>
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-36 text-center">
                <Shield size={22} className="text-green-400 mb-2" />
                <p className="text-sm text-gray-600 font-medium">No active alerts</p>
                <p className="text-xs text-gray-400 mt-1">All cases within normal range.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {alerts.slice(0, 6).map((a: any, i: number) => (
                  <div key={i} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {a.student_name || `ID: ${a.counseling_id || 'N/A'}`}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{a.counselor_name || 'Unassigned'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${RISK_LABEL_CLS[a.risk_level] || RISK_LABEL_CLS.GREEN}`}>
                        {a.risk_level || 'GREEN'}
                      </span>
                      <Link href={`/cases/${a.case_id}`}>
                        <button className="text-xs px-2.5 py-1 text-white rounded-lg transition-colors"
                          style={{ backgroundColor: '#1a5228' }}>Review</button>
                      </Link>
                    </div>
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
              <div className="flex flex-col items-center justify-center h-36 text-center">
                <p className="text-sm text-gray-600 font-medium">No recent cases</p>
                <p className="text-xs text-gray-400 mt-1">Cases assigned to you will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {cases.slice(0, 6).map((c: any, i: number) => (
                  <div key={i} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {c.student_name || `ID: ${c.counseling_id || 'N/A'}`}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{c.status || 'Active'}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${RISK_DOT[c.risk_level] || 'bg-gray-300'}`} />
                      <span className="text-xs text-gray-400">{c.risk_level || 'GREEN'}</span>
                    </div>
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
