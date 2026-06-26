'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { AlertTriangle, Users, ClipboardList, GitBranch } from 'lucide-react';

interface SupervisionStats {
  total_cases: number;
  active_cases: number;
  high_risk: number;
  pending_referrals: number;
}

export default function SupervisionPage() {
  const [stats, setStats] = useState<SupervisionStats | null>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [referralSummary, setReferralSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [casesRes, referralRes] = await Promise.all([
        fetch(api('/api/cases'), { headers }),
        fetch(api('/api/referrals/summary'), { headers }),
      ]);

      if (casesRes.ok) {
        const d = await casesRes.json();
        const allCases: any[] = d.cases || [];
        setCases(allCases);
        setStats({
          total_cases: allCases.length,
          active_cases: allCases.filter((c) => c.case_status === 'ACTIVE' || c.client_status === 'ACTIVE').length,
          high_risk: allCases.filter((c) => c.risk_level === 'RED').length,
          pending_referrals: 0,
        });
      }

      if (referralRes.ok) {
        const r = await referralRes.json();
        setReferralSummary(r);
        setStats((s) => s ? { ...s, pending_referrals: r.pending_warm_handoffs || 0 } : s);
      }
    } finally {
      setLoading(false);
    }
  };

  const riskBadge = (level: string) => {
    if (level === 'RED') return 'bg-red-100 text-red-800';
    if (level === 'YELLOW') return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-blue-800';
  };

  return (
    <DashboardPageWrapper title="Supervision Dashboard" subtitle="Clinical oversight and caseload monitoring">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Cases', value: stats?.total_cases ?? 0, icon: <ClipboardList size={18} />, color: 'text-blue-600' },
              { label: 'Active Cases', value: stats?.active_cases ?? 0, icon: <Users size={18} />, color: 'text-green-600' },
              { label: 'High-Risk (RED)', value: stats?.high_risk ?? 0, icon: <AlertTriangle size={18} />, color: 'text-red-600' },
              { label: 'Pending Handoffs', value: stats?.pending_referrals ?? 0, icon: <GitBranch size={18} />, color: 'text-orange-600' },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                <div className={`mb-2 ${s.color}`}>{s.icon}</div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Referral summary */}
          {referralSummary && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-4">Referral Overview</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: 'CPS', value: referralSummary.by_type?.CPS ?? 0 },
                  { label: 'External', value: referralSummary.by_type?.EXTERNAL ?? 0 },
                  { label: 'Internal', value: referralSummary.by_type?.INTERNAL ?? 0 },
                ].map((r) => (
                  <div key={r.label} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-50">{r.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{r.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cases table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Active Caseload</h3>
            </div>
            {cases.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">No cases found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {['Case #', 'Student ID', 'Risk', 'Status', 'Case Status', 'Created'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cases.slice(0, 20).map((c) => (
                    <tr key={c._id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 font-medium text-blue-600 text-xs">{c.case_number || c._id?.slice(-6)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs font-mono">{c.student_id?.slice(-8)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskBadge(c.risk_level)}`}>
                          {c.risk_level || 'GREEN'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{c.client_status || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{c.case_status || c.status || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {cases.length > 20 && (
              <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400">
                Showing 20 of {cases.length} cases
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardPageWrapper>
  );
}
