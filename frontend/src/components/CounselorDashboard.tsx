'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { fetchDashboardData } from '@/utils/dashboard-api';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';

interface DashboardProps { user: any; onLogout: () => void; }

const RISK_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
  RED:      'bg-orange-100 text-orange-700 border-orange-200',
  YELLOW:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  GREEN:    'bg-green-100 text-green-700 border-green-200',
};

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
            const dt = a.preferred_date || a.scheduled_start || a.requested_start || '';
            try { return new Date(dt).toDateString() === today; } catch { return false; }
          });
          setTodayAppts(confirmed.slice(0, 5));
        }
      } finally { setLoading(false); }
    })();
  }, [mounted]);

  const menuItems   = getMenuItemsByRole(user.role);
  const summary     = dashboardData?.summary || {};
  const alerts      = dashboardData?.alerts || [];
  const recentCases = dashboardData?.recent_cases || [];
  const firstName   = user.first_name || user.name?.split(' ')[0] || 'Counselor';

  const fmtTime = (s: string) => { try { return new Date(s).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true}); } catch { return '—'; } };

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="" activeSection="dashboard">

      {/* Greeting */}
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
              <p className="text-2xl font-bold text-gray-900">{summary.assigned_cases ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Active cases</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{todayAppts.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Sessions today</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.high_risk_alerts ?? alerts.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">High-risk alerts</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.recent_assessments ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Assessments (30d)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Quick links */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Pages</p>
              <div className="divide-y divide-gray-100">
                <Link href="/cases" className="flex items-center justify-between py-2.5 text-sm text-gray-700 hover:text-[#1a5228] transition-colors group">
                  <span>My Cases</span>
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
                <Link href="/check-ins" className="flex items-center justify-between py-2.5 text-sm text-gray-700 hover:text-[#1a5228] transition-colors group">
                  <span>Check-Ins</span>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-[#1a5228] transition-colors" />
                </Link>
                <Link href="/counselor/schedule" className="flex items-center justify-between py-2.5 text-sm text-gray-700 hover:text-[#1a5228] transition-colors group">
                  <span>My Schedule</span>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-[#1a5228] transition-colors" />
                </Link>
              </div>
            </div>

            {/* Today's sessions */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Today's Sessions</p>
              {todayAppts.length === 0 ? (
                <p className="text-sm text-gray-500">No sessions scheduled for today.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {todayAppts.map((a, i) => (
                    <div key={i} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{a.student_name || 'Student'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{fmtTime(a.preferred_date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* High-risk alerts / recent cases */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                {alerts.length > 0 ? 'High-Risk Alerts' : 'Recent Cases'}
              </p>
              {alerts.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {alerts.slice(0, 4).map((a: any, i: number) => (
                    <div key={i} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">ID: {a.counseling_id || 'N/A'}</p>
                        <p className="text-xs text-red-500 mt-0.5">{a.risk_level}</p>
                      </div>
                      <Link href={`/cases/${a.case_id}`}>
                        <button className="text-xs px-2.5 py-1 text-white rounded-lg transition-colors"
                          style={{ backgroundColor: '#1a5228' }}>
                          View
                        </button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : recentCases.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {recentCases.slice(0, 4).map((c: any, i: number) => (
                    <div key={i} className="py-2.5 flex items-center justify-between">
                      <p className="text-sm text-gray-800">ID: {c.counseling_id || 'N/A'}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${RISK_COLORS[c.risk_level] || RISK_COLORS.GREEN}`}>
                        {c.risk_level || 'GREEN'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No cases to display.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
