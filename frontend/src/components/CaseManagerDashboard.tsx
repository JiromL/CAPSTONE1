'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardPageWrapper } from './DashboardPageWrapper';
import { api } from '@/utils/api';
import { AlertTriangle, Users, ClipboardList, ArrowRight, RefreshCw } from 'lucide-react';

interface DashboardProps { user: any; onLogout: () => void; }

const CRISIS_LABELS = ['Struggling', 'In Crisis'];

export function CaseManagerDashboard({ user, onLogout }: DashboardProps) {
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Manager';
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const [dist, setDist] = useState<Record<string, number> | null>(null);
  const [caseCount, setCaseCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [emaError, setEmaError] = useState(false);

  const load = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [distRes, casesRes] = await Promise.all([
        fetch(api('/api/mhbot/stats/perma-distribution'), { headers }),
        fetch(api('/api/cases?limit=1'), { headers }),
      ]);

      if (distRes.ok) {
        const d = await distRes.json();
        setDist(d.distribution || {});
      } else {
        setEmaError(true);
      }

      if (casesRes.ok) {
        const d = await casesRes.json();
        setCaseCount(d.total ?? d.count ?? (d.cases?.length ?? null));
      }
    } catch {
      setEmaError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const flaggedCount = dist
    ? CRISIS_LABELS.reduce((sum, l) => sum + (dist[l] ?? 0), 0)
    : null;

  const stats = [
    { label: 'Flagged Students', value: flaggedCount, color: 'text-red-600', note: 'Struggling + In Crisis' },
    { label: 'Active Cases', value: caseCount, color: 'text-gray-900', note: 'all open cases' },
    { label: 'Struggling', value: dist?.['Struggling'] ?? null, color: 'text-orange-500', note: 'EMA label' },
    { label: 'In Crisis', value: dist?.['In Crisis'] ?? null, color: 'text-red-600', note: 'EMA label' },
  ];

  return (
    <DashboardPageWrapper title="Dashboard" subtitle="">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="pb-4 border-b border-gray-200">
          <p className="text-xs text-gray-400 mb-0.5">{todayStr}</p>
          <h2 className="text-xl font-semibold text-gray-900">Good day, {firstName}.</h2>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-4">
              {loading ? (
                <div className="h-8 w-16 bg-gray-100 rounded animate-pulse mb-1" />
              ) : (
                <p className={`text-2xl font-bold ${s.color}`}>{s.value ?? '—'}</p>
              )}
              <p className="text-xs font-medium text-gray-700 mt-0.5">{s.label}</p>
              <p className="text-xs text-gray-400">{s.note}</p>
            </div>
          ))}
        </div>

        {emaError && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <AlertTriangle size={14} className="flex-shrink-0" />
            EMA stats unavailable — connect EMA on the EMA page to see PERMA distribution.
          </div>
        )}

        {/* Distribution bar */}
        {dist && !emaError && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-800">EMA Well-being Distribution</p>
              <button onClick={load} className="text-gray-400 hover:text-gray-600 transition">
                <RefreshCw size={14} />
              </button>
            </div>
            <div className="space-y-2.5">
              {[
                { label: 'Excelling',  color: 'bg-emerald-500' },
                { label: 'Thriving',   color: 'bg-green-400'   },
                { label: 'Surviving',  color: 'bg-yellow-400'  },
                { label: 'Struggling', color: 'bg-orange-500'  },
                { label: 'In Crisis',  color: 'bg-red-600'     },
              ].map(({ label, color }) => {
                const total = Object.values(dist).reduce((a, b) => a + b, 0);
                const count = dist[label] ?? 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span className="w-20 text-xs text-gray-600 text-right flex-shrink-0">{label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-xs text-gray-500 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Quick Access</p>
          <div className="divide-y divide-gray-100">
            {[
              { href: '/case-manager/queue', label: 'CM Queue', icon: AlertTriangle, note: 'Struggling & In Crisis students' },
              { href: '/cases',              label: 'All Cases',  icon: ClipboardList, note: 'View and manage cases' },
              { href: '/high-risk',          label: 'High-Risk',  icon: Users, note: 'Escalated cases' },
            ].map(({ href, label, icon: Icon, note }) => (
              <Link key={href} href={href} className="flex items-center justify-between py-3 text-sm text-gray-700 hover:text-[#1a5228] transition-colors group">
                <div className="flex items-center gap-2.5">
                  <Icon size={15} className="text-gray-400 group-hover:text-[#1a5228] transition-colors" />
                  <div>
                    <p className="font-medium leading-tight">{label}</p>
                    <p className="text-xs text-gray-400">{note}</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-[#1a5228] transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
