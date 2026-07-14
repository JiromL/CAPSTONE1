'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Loader2, ArrowRight, AlertTriangle } from 'lucide-react';

interface DashboardProps { user: any; onLogout: () => void; }

export function CounselingTeamDashboard({ user, onLogout }: DashboardProps) {
  const [appts, setAppts]   = useState<any[]>([]);
  const [cases, setCases]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    (async () => {
      try {
        const [r, cr] = await Promise.all([
          fetch(api('/api/appointments/dashboard/role-view'), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(api('/api/cases'), { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (r.ok) { const d = await r.json(); setAppts(d.appointments || []); }
        if (cr.ok) { const cd = await cr.json(); setCases(cd.cases || []); }
      } finally { setLoading(false); }
    })();
  }, [mounted]);

  const menuItems = getMenuItemsByRole(user.role);
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Team Member';
  const roleLabel = user.role?.toUpperCase() === 'COUNSELOR' ? 'Counselor' : 'Psychologist';

  const todayStr = new Date().toDateString();
  const todayAppts = appts.filter((a: any) => {
    const dt = a.preferred_date || a.scheduled_start || '';
    try { return new Date(dt).toDateString() === todayStr &&
      ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN'].includes((a.status || '').toUpperCase()); }
    catch { return false; }
  });
  const pendingEval = appts.filter((a: any) =>
    (a.status || '').toUpperCase() === 'EVALUATION'
  );

  const fmtTime = (s: string) => {
    try { return new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); } catch { return ''; }
  };

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const isPsych = user.role?.toUpperCase() === 'PSYCHOLOGIST';
  const LINKS = [
    { href: '/cases',        label: 'My Cases' },
    ...(isPsych ? [{ href: '/high-risk', label: 'High-Risk Monitoring' }] : []),
    { href: '/appointments', label: 'My Schedule' },
    { href: '/mhbot',        label: 'MHBot / PERMA' },
  ];

  const newCases = cases
    .filter((c: any) => c.status === 'NEW' || c.status === 'ACTIVE')
    .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 5);

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="" activeSection="dashboard">

      <div className="mb-6 pb-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>{dateLabel}</p>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Good day, {firstName}.</h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{roleLabel} — Client case support and coordination</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : (
        <>
        {/* New case assignments banner */}
        {newCases.length > 0 && (
          <div className="mb-5 bg-[#2563eb]/5 border border-[#2563eb]/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-[#2563eb]" />
                <p className="text-xs font-semibold text-[#2563eb] uppercase tracking-wider">
                  New Cases Assigned to You ({newCases.length})
                </p>
              </div>
              <Link href="/cases" className="text-xs text-[#2563eb] underline underline-offset-2">
                View all cases
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {newCases.map((c: any, i: number) => (
                <Link key={i} href="/cases"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 border border-[#2563eb]/10 hover:border-[#2563eb]/30 transition-colors"
                  style={{ background: 'var(--color-surface)' }}>
                  {c.risk_level && c.risk_level !== 'GREEN' && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                      style={
                        c.risk_level === 'CRITICAL' ? { background: '#fee2e2', color: '#7f1d1d' } :
                        c.risk_level === 'RED'      ? { background: '#fef2f2', color: '#b91c1c' } :
                                                      { background: '#fffbeb', color: '#b45309' }
                      }>
                      {c.risk_level}
                    </span>
                  )}
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{c.student_name || 'Student'}</p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Today's sessions + pending evaluations */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Today's Sessions</p>
              <Link href="/appointments" className="text-xs text-[#2563eb] hover:underline">View all</Link>
            </div>
            {todayAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 text-center">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>No sessions today</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Confirmed appointments will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {todayAppts.slice(0, 5).map((a: any, i: number) => (
                  <div key={i} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{a.student_name || 'Student'}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {fmtTime(a.preferred_date || a.scheduled_start)} · {a.counselor_name || 'Counselor TBD'}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'var(--color-success-surface)', color: 'var(--color-success-text)', border: '1px solid var(--color-success)' }}>
                      Confirmed
                    </span>
                  </div>
                ))}
              </div>
            )}

            {pendingEval.length > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                    Session Done — Decide Next Step
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium normal-case tracking-normal">
                      {pendingEval.length}
                    </span>
                  </p>
                  <Link href="/appointment-requests" className="text-xs text-[#2563eb] hover:underline">Review</Link>
                </div>
                {pendingEval.slice(0, 3).map((a: any, i: number) => (
                  <div key={i} className="py-1.5 flex items-center justify-between">
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{a.student_name || 'Student'}</p>
                    <span className="text-xs text-amber-600">Follow-up / close needed</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick navigation */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-muted)' }}>Quick Access</p>
            <div className="divide-y divide-gray-100">
              {LINKS.map(({ href, label }) => (
                <Link key={href} href={href}
                  className="flex items-center justify-between py-2.5 text-sm transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-primary-text)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-secondary)'; }}>
                  <span>{label}</span>
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </div>

        </div>
        </>
      )}
    </DashboardLayout>
  );
}
