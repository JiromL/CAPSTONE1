"use client";

import { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface AnalyticsSummary {
  total_cases: number;
  active_cases: number;
  closed_cases: number;
  high_risk_cases: number;
  week_appointments: number;
  pending_appointments: number;
  month_assessments: number;
}

interface MonthlyCase {
  label: string;
  short: string;
  new_cases: number;
  closed_cases: number;
}

export default function CasesReportPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [summaryRes, monthlyRes] = await Promise.all([
        fetch(api('/api/analytics/summary'), { headers }),
        fetch(api('/api/analytics/cases/monthly'), { headers }),
      ]);

      if (!summaryRes.ok) throw new Error(`Analytics summary: ${summaryRes.status}`);
      const summaryData = await summaryRes.json();
      setSummary(summaryData);

      if (monthlyRes.ok) {
        const monthlyData = await monthlyRes.json();
        setMonthly(monthlyData.months || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load case data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const statCards = summary
    ? [
        { label: 'Total Cases', value: summary.total_cases, color: 'border-l-4', accent: '#2563eb' },
        { label: 'Active / Open', value: summary.active_cases, color: 'border-l-4', accent: '#2563eb' },
        { label: 'Closed', value: summary.closed_cases, color: 'border-l-4', accent: '#6b7280' },
        { label: 'High Risk', value: summary.high_risk_cases, color: 'border-l-4', accent: '#dc2626' },
      ]
    : [];

  return (
    <DashboardPageWrapper title="Case Statistics" subtitle="Summary of cases by status">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Case data pulled from the CPS system database</p>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading && !summary ? (
          <div className="py-20 text-center text-sm text-gray-400">Loading case statistics…</div>
        ) : summary ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5"
                  style={{ borderLeftWidth: 4, borderLeftColor: card.accent }}
                >
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">{card.value.toLocaleString()}</p>
                </div>
              ))}
            </div>

            {/* Monthly Breakdown Table */}
            {monthly.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Monthly Case Breakdown (Last 6 Months)</h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {['Month', 'New Cases', 'Closed Cases', 'Net Change'].map((h) => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {monthly.map((row) => {
                      const net = row.new_cases - row.closed_cases;
                      return (
                        <tr key={row.label} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-3 font-medium text-gray-900 dark:text-gray-50">{row.label}</td>
                          <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{row.new_cases}</td>
                          <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{row.closed_cases}</td>
                          <td className={`px-6 py-3 font-medium ${net > 0 ? 'text-red-600' : net < 0 ? 'text-green-600' : 'text-gray-500'}`}>
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
