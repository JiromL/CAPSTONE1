'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { AlertTriangle, Users, ClipboardList, GitBranch, Loader2 } from 'lucide-react';

interface SupervisionStats {
  total_cases: number;
  active_cases: number;
  high_risk: number;
  pending_referrals: number;
}

function riskBadgeStyle(level: string): React.CSSProperties {
  if (level === 'RED')    return { background: 'var(--color-danger-surface)',  color: 'var(--color-danger)'  };
  if (level === 'YELLOW') return { background: 'var(--color-warning-surface)', color: 'var(--color-warning)' };
  return { background: 'var(--color-success-surface)', color: 'var(--color-success)' };
}

export default function SupervisionPage() {
  const [stats, setStats]                 = useState<SupervisionStats | null>(null);
  const [cases, setCases]                 = useState<any[]>([]);
  const [referralSummary, setReferralSummary] = useState<any>(null);
  const [loading, setLoading]             = useState(true);

  useEffect(() => { loadData(); }, []);

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
          active_cases: allCases.filter(c => c.case_status === 'ACTIVE' || c.client_status === 'ACTIVE').length,
          high_risk: allCases.filter(c => c.risk_level === 'RED').length,
          pending_referrals: 0,
        });
      }
      if (referralRes.ok) {
        const r = await referralRes.json();
        setReferralSummary(r);
        setStats(s => s ? { ...s, pending_referrals: r.pending_warm_handoffs || 0 } : s);
      }
    } finally { setLoading(false); }
  };

  const TH = ({ children }: { children: React.ReactNode }) => (
    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide"
      style={{ color: 'var(--color-text-muted)' }}>{children}</th>
  );

  return (
    <DashboardPageWrapper title="Supervision Dashboard" subtitle="Clinical oversight and caseload monitoring">
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : (
        <div className="space-y-5">

          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Cases',     value: stats?.total_cases ?? 0,       icon: <ClipboardList size={18} />, color: 'var(--color-primary)' },
              { label: 'Active Cases',    value: stats?.active_cases ?? 0,      icon: <Users size={18} />,         color: 'var(--color-success)' },
              { label: 'High-Risk (RED)', value: stats?.high_risk ?? 0,         icon: <AlertTriangle size={18} />, color: 'var(--color-danger)' },
              { label: 'Pending Handoffs',value: stats?.pending_referrals ?? 0, icon: <GitBranch size={18} />,    color: 'var(--color-warning)' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl shadow-card p-5"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="mb-2" style={{ color: s.color }}>{s.icon}</div>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{s.value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Referral summary */}
          {referralSummary && (
            <div className="rounded-2xl shadow-card p-5"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Referral Overview</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: 'CPS',      value: referralSummary.by_type?.CPS ?? 0 },
                  { label: 'External', value: referralSummary.by_type?.EXTERNAL ?? 0 },
                  { label: 'Internal', value: referralSummary.by_type?.INTERNAL ?? 0 },
                ].map(r => (
                  <div key={r.label} className="p-3 rounded-lg" style={{ background: 'var(--color-bg)' }}>
                    <p className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{r.value}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{r.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cases table */}
          <div className="rounded-2xl shadow-card overflow-hidden"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Active Caseload</h3>
            </div>
            {cases.length === 0 ? (
              <div className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No cases found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                    <tr>
                      {['Case #', 'Student ID', 'Risk', 'Status', 'Case Status', 'Created'].map(h => <TH key={h}>{h}</TH>)}
                    </tr>
                  </thead>
                  <tbody>
                    {cases.slice(0, 20).map(c => (
                      <tr key={c._id} className="transition"
                        style={{ borderBottom: '1px solid var(--color-border)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td className="px-4 py-3 font-medium text-xs" style={{ color: 'var(--color-primary)' }}>{c.case_number || c._id?.slice(-6)}</td>
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>{c.student_id?.slice(-8)}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={riskBadgeStyle(c.risk_level)}>
                            {c.risk_level || 'GREEN'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{c.client_status || '—'}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{c.case_status || c.status || '—'}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {c.created_at ? new Date(c.created_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {cases.length > 20 && (
              <div className="px-4 py-2 text-xs" style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                Showing 20 of {cases.length} cases
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardPageWrapper>
  );
}
