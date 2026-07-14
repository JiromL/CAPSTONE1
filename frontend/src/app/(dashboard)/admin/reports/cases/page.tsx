"use client";

import { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface AnalyticsSummary {
  total_cases: number; active_cases: number; closed_cases: number;
  high_risk_cases: number; week_appointments: number;
  pending_appointments: number; month_assessments: number;
}
interface MonthlyCase { label: string; short: string; new_cases: number; closed_cases: number; }

const TH = ({ children }: { children: React.ReactNode }) => (
  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide"
    style={{ color: 'var(--color-text-muted)' }}>{children}</th>
);

export default function CasesReportPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const [summaryRes, monthlyRes] = await Promise.all([
        fetch(api('/api/analytics/summary'), { headers }),
        fetch(api('/api/analytics/cases/monthly'), { headers }),
      ]);
      if (!summaryRes.ok) throw new Error(`Analytics summary: ${summaryRes.status}`);
      setSummary(await summaryRes.json());
      if (monthlyRes.ok) { const d = await monthlyRes.json(); setMonthly(d.months || []); }
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load case data');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const statCards = summary ? [
    { label: 'Total Cases',   value: summary.total_cases,      accent: 'var(--color-primary)' },
    { label: 'Active / Open', value: summary.active_cases,     accent: 'var(--color-primary)' },
    { label: 'Closed',        value: summary.closed_cases,     accent: 'var(--color-text-muted)' },
    { label: 'High Risk',     value: summary.high_risk_cases,  accent: 'var(--color-danger)' },
  ] : [];

  return (
    <DashboardPageWrapper title="Case Statistics" subtitle="Summary of cases by status">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Case data pulled from the CPS system database</p>
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition disabled:opacity-50"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg text-sm"
            style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}

        {loading && !summary ? (
          <div className="py-20 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading case statistics…</div>
        ) : summary ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statCards.map(card => (
                <div key={card.label} className="rounded-2xl p-5"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: `4px solid ${card.accent}` }}>
                  <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-secondary)' }}>{card.label}</p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{card.value.toLocaleString()}</p>
                </div>
              ))}
            </div>

            {monthly.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Monthly Case Breakdown (Last 6 Months)</h2>
                </div>
                <table className="w-full text-sm">
                  <thead style={{ background: 'var(--color-bg)' }}>
                    <tr>{['Month', 'New Cases', 'Closed Cases', 'Net Change'].map(h => <TH key={h}>{h}</TH>)}</tr>
                  </thead>
                  <tbody>
                    {monthly.map(row => {
                      const net = row.new_cases - row.closed_cases;
                      return (
                        <tr key={row.label} className="transition"
                          style={{ borderTop: '1px solid var(--color-border)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td className="px-6 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{row.label}</td>
                          <td className="px-6 py-3" style={{ color: 'var(--color-text-secondary)' }}>{row.new_cases}</td>
                          <td className="px-6 py-3" style={{ color: 'var(--color-text-secondary)' }}>{row.closed_cases}</td>
                          <td className="px-6 py-3 font-medium"
                            style={{ color: net > 0 ? 'var(--color-danger)' : net < 0 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                            {net > 0 ? `+${net}` : net}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </div>
    </DashboardPageWrapper>
  );
}
