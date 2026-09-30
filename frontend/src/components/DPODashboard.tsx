'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { DashboardGreeting } from './DashboardGreeting';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { AnnouncementsPanel } from './AnnouncementsPanel';

interface DashboardProps { user: any; onLogout: () => void; }

export function DPODashboard({ user, onLogout }: DashboardProps) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    (async () => {
      try {
        const r = await fetch(api('/api/analytics/summary'), { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) setSummary(await r.json());
      } finally { setLoading(false); }
    })();
  }, [mounted]);

  const menuItems     = getMenuItemsByRole(user.role);
  const firstName     = user.first_name || user.name?.split(' ')[0] || 'DPO';
  const highRisk      = summary?.high_risk_cases ?? 0;
  const clinicalStaff = (summary?.total_counselors ?? 0) + (summary?.total_psychologists ?? 0);


  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="" activeSection="dashboard" titleInPage>

      <DashboardGreeting firstName={firstName} subtitle="Here’s today’s data privacy overview." />

      {loading ? (
        <div className="flex items-center justify-center h-40 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
        </div>
      ) : (
        <div className="space-y-5 animate-fade-up" style={{ animationDelay: '60ms' }}>

          {highRisk > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
              <AlertCircle size={15} className="flex-shrink-0" style={{ color: 'var(--color-danger)' }} />
              <span style={{ color: 'var(--color-danger)' }}>
                <strong>{highRisk}</strong> high-risk case{highRisk !== 1 ? 's' : ''} active.
              </span>
              <Link href="/high-risk" className="ml-auto text-xs font-semibold underline underline-offset-2" style={{ color: 'var(--color-danger)' }}>Review</Link>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* System snapshot */}
            <div className="rounded-2xl border shadow-card p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: 'var(--color-text-muted)' }}>System Snapshot</p>
              <div className="space-y-0.5">
                {[
                  { label: 'Active cases',            value: summary?.active_cases ?? '—',        danger: false },
                  { label: 'High-risk (RED/CRITICAL)', value: highRisk,                            danger: highRisk > 0 },
                  { label: 'Appointments this week',   value: summary?.week_appointments ?? '—',   danger: false },
                  { label: 'Total counselors',         value: summary?.total_counselors ?? '—',    danger: false },
                  { label: 'Total psychologists',      value: summary?.total_psychologists ?? '—', danger: false },
                  { label: 'Clinical staff total',     value: clinicalStaff || '—',                danger: false },
                  { label: 'Students served',          value: summary?.total_students ?? '—',      danger: false },
                ].map(({ label, value, danger }) => (
                  <div key={label} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                    <span className="text-sm font-semibold" style={{ color: danger ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              {/* Data governance */}
              <div className="rounded-2xl border shadow-card p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--color-text-muted)' }}>Data Governance</p>
                <div>
                  {[
                    { href: '/admin/audit-log',     label: 'Audit Logs' },
                    { href: '/admin/users',          label: 'User Management' },
                    { href: '/admin/reports/export', label: 'Data Export' },
                    { href: '/documentation',        label: 'Documentation' },
                    { href: '/announcements',        label: 'Announcements' },
                  ].map(({ href, label }, i) => (
                    <Link key={href} href={href}
                      className="flex items-center justify-between py-2.5 text-sm transition-colors group"
                      style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none', color: 'var(--color-text-secondary)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}>
                      <span>{label}</span>
                      <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--color-text-muted)' }} />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Clinical oversight */}
              <div className="rounded-2xl border shadow-card p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--color-text-muted)' }}>Clinical Oversight</p>
                <div>
                  {[
                    { href: '/high-risk',            label: 'High-Risk Cases' },
                    { href: '/cases',                label: 'All Cases' },
                    { href: '/admin/analytics',      label: 'Analytics Dashboard' },
                    { href: '/appointment-requests', label: 'Appointments' },
                  ].map(({ href, label }, i) => (
                    <Link key={href} href={href}
                      className="flex items-center justify-between py-2.5 text-sm transition-colors group"
                      style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none', color: 'var(--color-text-secondary)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}>
                      <span>{label}</span>
                      <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--color-text-muted)' }} />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

          </div>
          <AnnouncementsPanel />
        </div>
      )}
    </DashboardLayout>
  );
}
