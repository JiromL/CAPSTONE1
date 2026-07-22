'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardPageWrapper } from './DashboardPageWrapper';
import { api } from '@/utils/api';
import { AlertTriangle, Users, ClipboardList, ArrowRight, RefreshCw } from 'lucide-react';
import { AnnouncementsPanel } from './AnnouncementsPanel';

interface DashboardProps { user: any; onLogout: () => void; }

const CRISIS_LABELS = ['Struggling', 'In Crisis'];

const DIST_BARS = [
  { label: 'Excelling',  color: '#10B981' },
  { label: 'Thriving',   color: '#14B8A6' },
  { label: 'Surviving',  color: '#F59E0B' },
  { label: 'Struggling', color: '#F97316' },
  { label: 'In Crisis',  color: '#EF4444' },
];

export function CaseManagerDashboard({ user, onLogout }: DashboardProps) {
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Manager';
  const todayStr = new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila',
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
      if (distRes.ok) { const d = await distRes.json(); setDist(d.distribution || {}); }
      else { setEmaError(true); }
      if (casesRes.ok) { const d = await casesRes.json(); setCaseCount(d.total ?? d.count ?? (d.cases?.length ?? null)); }
    } catch { setEmaError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const flaggedCount = dist
    ? CRISIS_LABELS.reduce((sum, l) => sum + (dist[l] ?? 0), 0)
    : null;

  const stats = [
    { label: 'Flagged Students', value: flaggedCount, color: 'var(--color-danger)',   note: 'Struggling + In Crisis' },
    { label: 'Active Cases',     value: caseCount,    color: 'var(--color-text-primary)', note: 'all open cases' },
    { label: 'Struggling',       value: dist?.['Struggling'] ?? null, color: 'var(--color-warning)',  note: 'EMA label' },
    { label: 'In Crisis',        value: dist?.['In Crisis'] ?? null,  color: 'var(--color-danger)',   note: 'EMA label' },
  ];

  const totalDist = dist ? Object.values(dist).reduce((a, b) => a + b, 0) : 0;

  return (
    <DashboardPageWrapper title="Dashboard" subtitle="">
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">

        {/* Header */}
        <div className="pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>{todayStr}</p>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Good day, {firstName}.</h2>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border shadow-card px-4 py-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              {loading ? (
                <div className="h-8 w-16 rounded animate-pulse mb-1" style={{ background: 'var(--color-bg)' }} />
              ) : (
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value ?? '—'}</p>
              )}
              <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{s.label}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.note}</p>
            </div>
          ))}
        </div>

        {emaError && (
          <div className="flex items-center gap-2 p-3 rounded-lg text-xs" style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)', color: 'var(--color-warning)' }}>
            <AlertTriangle size={14} className="flex-shrink-0" />
            EMA stats unavailable — connect EMA on the EMA page to see PERMA distribution.
          </div>
        )}

        {/* Distribution bar */}
        {dist && !emaError && (
          <div className="rounded-2xl border shadow-card p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>EMA Well-being Distribution</p>
              <button onClick={load} aria-label="Refresh data" className="transition-opacity hover:opacity-75" style={{ color: 'var(--color-text-muted)' }}>
                <RefreshCw size={14} />
              </button>
            </div>
            <div className="space-y-2.5">
              {DIST_BARS.map(({ label, color }) => {
                const count = dist[label] ?? 0;
                const pct = totalDist > 0 ? Math.round((count / totalDist) * 100) : 0;
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span className="w-20 text-xs text-right flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                    <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background: 'var(--color-bg)' }}>
                      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="w-8 text-xs text-right" style={{ color: 'var(--color-text-muted)' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="rounded-2xl border shadow-card p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: 'var(--color-text-muted)' }}>Quick Access</p>
          <div>
            {[
              { href: '/case-manager/queue', label: 'CM Queue', icon: AlertTriangle, note: 'Struggling & In Crisis students' },
              { href: '/cases',              label: 'All Cases',  icon: ClipboardList, note: 'View and manage cases' },
              { href: '/high-risk',          label: 'High-Risk',  icon: Users, note: 'Escalated cases' },
            ].map(({ href, label, icon: Icon, note }, i) => (
              <Link key={href} href={href}
                className="flex items-center justify-between py-3 text-sm transition-colors group"
                style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}>
                <div className="flex items-center gap-2.5">
                  <Icon size={15} style={{ color: 'var(--color-text-muted)' }} />
                  <div>
                    <p className="font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{note}</p>
                  </div>
                </div>
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--color-text-muted)' }} />
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-5">
          <AnnouncementsPanel />
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
