'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Loader2, CheckCircle, AlertCircle, ClipboardList, CalendarClock, ChevronRight, ShieldCheck } from 'lucide-react';
import { AnnouncementsPanel } from './AnnouncementsPanel';

interface DashboardProps { user: any; onLogout: () => void; }

export function IntakeCounselorDashboard({ user, onLogout }: DashboardProps) {
  const [appts, setAppts]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    (async () => {
      try {
        const r = await fetch(api('/api/appointments/dashboard/role-view'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) { const d = await r.json(); setAppts(d.appointments || []); }
      } finally { setLoading(false); }
    })();
  }, [mounted]);

  const menuItems = getMenuItemsByRole(user.role);
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Counselor';

  const needsAction = appts.filter((a: any) =>
    ['REQUESTED', 'PENDING_APPROVAL'].includes((a.status || '').toUpperCase())
  );
  const todayStr = new Date().toDateString();
  const todayConfirmed = appts.filter((a: any) => {
    const dt = a.preferred_date || a.scheduled_start || '';
    try { return new Date(dt).toDateString() === todayStr &&
      ['CONFIRMED', 'APPROVED', 'MATCHED'].includes((a.status || '').toUpperCase()); }
    catch { return false; }
  });

  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' }); } catch { return '—'; }
  };
  const fmtTime = (s: string) => {
    try { return new Date(s).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }); } catch { return ''; }
  };

  const dateLabel = new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila',
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="" activeSection="dashboard">

      <div className="mb-5 pb-4 animate-fade-up" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>{dateLabel}</p>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Good day, {firstName}.</h2>
      </div>

      {/* Quick action strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 animate-fade-up" style={{ animationDelay: '40ms' }}>
        {[
          { label: 'Intake Management', href: '/intake-management', icon: ClipboardList,
            count: needsAction.length,
            sublabel: needsAction.length > 0 ? `${needsAction.length} awaiting confirmation` : 'Manage your intake pipeline' },
          { label: 'QA', href: '/ic/qa', icon: ShieldCheck,
            count: null,
            sublabel: 'Verify, review & follow-up' },
          { label: 'My Availability', href: '/availability', icon: CalendarClock,
            count: null,
            sublabel: 'Manage your open slots' },
        ].map(({ label, href, icon: Icon, count, sublabel }) => (
          <Link key={href} href={href}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 border transition-all group"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-primary-surface)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-surface)'; }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-primary-surface)' }}>
              <Icon size={15} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-tight truncate" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
              {count != null && count > 0 ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning)' }}>{count} pending</span>
              ) : (
                <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>{sublabel}</p>
              )}
            </div>
            <ChevronRight size={13} className="flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--color-text-muted)' }} />
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fade-up" style={{ animationDelay: '80ms' }}>

          {/* Pending confirmation */}
          <div className="rounded-2xl border shadow-card p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Pending Confirmation</p>
                {needsAction.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning)' }}>
                    {needsAction.length}
                  </span>
                )}
              </div>
              <Link href="/intake-management" className="text-xs font-medium transition-opacity hover:opacity-75" style={{ color: 'var(--color-primary)' }}>View all</Link>
            </div>
            {needsAction.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <CheckCircle size={20} className="mb-2" style={{ color: 'var(--color-success)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>All slots confirmed</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>No pending confirmations right now.</p>
              </div>
            ) : (
              <div>
                {needsAction.slice(0, 5).map((a: any, i: number) => (
                  <div key={i} className="py-2.5 flex items-center gap-3" style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning)' }}>
                      {(a.student_name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{a.student_name || 'Student'}</p>
                        {a.risk_level && ['RED', 'CRITICAL'].includes(a.risk_level.toUpperCase()) && (
                          <AlertCircle size={11} className="flex-shrink-0" style={{ color: 'var(--color-danger)' }} />
                        )}
                      </div>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {fmtDate(a.preferred_date || a.created_at)} · {(a.method || 'in-person').replace(/-/g, ' ')}
                      </p>
                    </div>
                    <Link href="/intake-management">
                      <button className="text-xs px-2.5 py-1 text-white rounded-lg transition-opacity hover:opacity-90 flex-shrink-0"
                        style={{ background: 'var(--color-primary)' }}>
                        Review →
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's intakes */}
          <div className="rounded-2xl border shadow-card p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Today's Intakes</p>
              <Link href="/intake-management" className="text-xs font-medium transition-opacity hover:opacity-75" style={{ color: 'var(--color-primary)' }}>View all</Link>
            </div>
            {todayConfirmed.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>No intakes scheduled today</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Confirmed appointments appear here.</p>
              </div>
            ) : (
              <div>
                {todayConfirmed.slice(0, 5).map((a: any, i: number) => (
                  <div key={i} className="py-2.5 flex items-center gap-3" style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)' }}>
                      {(a.student_name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{a.student_name || 'Student'}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{fmtTime(a.preferred_date || a.scheduled_start)}</p>
                    </div>
                    <Link href={`/ic/intake/conduct/${a.appointment_id}`}>
                      <button className="text-xs px-2.5 py-1 text-white rounded-lg transition-opacity hover:opacity-90 flex-shrink-0"
                        style={{ background: 'var(--color-primary)' }}>
                        Start →
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <AnnouncementsPanel />
          </div>

        </div>
      )}
    </DashboardLayout>
  );
}
