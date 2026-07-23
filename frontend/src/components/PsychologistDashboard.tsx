'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { fetchDashboardData } from '@/utils/dashboard-api';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Loader2, Shield, MoreHorizontal, Calendar } from 'lucide-react';
import { AnnouncementsPanel } from './AnnouncementsPanel';

const PERMA_BARS: { label: string; color: string }[] = [
  { label: 'Excelling',  color: '#10B981' },
  { label: 'Thriving',   color: '#14B8A6' },
  { label: 'Surviving',  color: '#F59E0B' },
  { label: 'Struggling', color: '#F97316' },
  { label: 'In Crisis',  color: '#EF4444' },
];

function PermaDistributionWidget() {
  const [data, setData] = useState<{ total_students_tracked: number; distribution: Record<string, number> } | null>(null);
  const [notConnected, setNotConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(api('/api/mhbot/stats/perma-distribution'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (r.status === 401) { setNotConnected(true); return null; }
        return r.ok ? r.json() : null;
      })
      .then(d => { if (d) setData(d); })
      .catch(() => setNotConnected(true));
  }, []);

  const dist = data?.distribution ?? {};
  const total = data?.total_students_tracked ?? 0;
  const maxCount = Math.max(1, ...Object.values(dist));

  return (
    <div className="rounded-2xl border shadow-card p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Student Wellbeing Overview</p>
        {total > 0 && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{total} tracked</span>}
      </div>
      {notConnected || (!data && !notConnected) ? (
        <p className="text-xs text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
          {notConnected ? 'Connect MHBot to see wellbeing data.' : 'Loading…'}
        </p>
      ) : (
        <div className="space-y-2.5">
          {PERMA_BARS.map(({ label, color }) => {
            const count = dist[label] ?? 0;
            if (count === 0 && dist['No Data'] === total) return null;
            return (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs w-20 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background: 'var(--color-bg)' }}>
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(count / maxCount) * 100}%`, background: color }} />
                </div>
                <span className="text-xs font-medium w-4 text-right" style={{ color: 'var(--color-text-secondary)' }}>{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const TREND_LABELS = ['Excelling', 'Thriving', 'Surviving', 'Struggling', 'In Crisis'];
const TREND_COLORS: Record<string, string> = {
  'Excelling':  '#10B981',
  'Thriving':   '#14B8A6',
  'Surviving':  '#F59E0B',
  'Struggling': '#F97316',
  'In Crisis':  '#EF4444',
};

function PermaTrendsWidget() {
  const [data, setData] = useState<{ months: string[]; monthly: Record<string, Record<string, number>> } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(api('/api/mhbot/stats/perma-trends'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {});
  }, []);

  if (!data) return null;
  const months = data.months ?? [];

  return (
    <div className="rounded-2xl border shadow-card p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: 'var(--color-text-muted)' }}>Wellbeing Trends — Last 6 Months</p>
      <div className="space-y-3">
        {months.map(month => {
          const counts = data.monthly[month] ?? {};
          const total = TREND_LABELS.reduce((s, l) => s + (counts[l] ?? 0), 0);
          const label = new Date(month + '-15').toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', year: '2-digit' });
          return (
            <div key={month} className="flex items-start gap-3">
              <span className="text-xs w-12 flex-shrink-0 pt-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
              <div className="flex-1 space-y-1">
                {total === 0 ? (
                  <span className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>No data</span>
                ) : (
                  TREND_LABELS.filter(l => counts[l] > 0).map(l => {
                    const c = counts[l] ?? 0;
                    const pct = total > 0 ? (c / total) * 100 : 0;
                    const color = TREND_COLORS[l] ?? '#9CA3AF';
                    return (
                      <div key={l} className="flex items-center gap-2">
                        <div className="w-24 rounded-full h-1.5 overflow-hidden flex-shrink-0" style={{ background: 'var(--color-bg)' }}>
                          <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <span className="text-xs font-medium" style={{ color }}>{l}: {c}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DashboardProps { user: any; onLogout: () => void; }

function getSessionType(a: any): string {
  const ref = (a.referral_type || '').toUpperCase();
  if (ref === 'WALKIN') return 'Walk-in';
  if (ref.includes('EMERGENCY') || ref.includes('CRISIS')) return 'Crisis';
  if (ref.includes('FOLLOW')) return 'Follow-up';
  if (ref === 'INTAKE' || ref === 'EVALUATION') return 'Intake';
  const status = (a.status || '').toUpperCase();
  if (status === 'FOLLOW_UP') return 'Follow-up';
  if (status === 'EVALUATION') return 'Intake';
  if (status === 'REFERRAL') return 'Referral';
  return 'Individual';
}

const SESSION_TYPE_COLORS: Record<string, string> = {
  'Individual': '#3B82F6', 'Follow-up': '#8B5CF6', 'Intake': '#14B8A6',
  'Crisis': '#EF4444', 'Walk-in': '#F97316', 'Referral': '#6366F1',
};

function SessionStatusBadge({ status }: { status: string }) {
  const s = (status || '').toUpperCase();
  if (s === 'COMPLETED') return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full border" style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)', borderColor: 'var(--color-success)' }}>Completed</span>
  );
  if (s === 'CHECKED_IN') return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full border" style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}>In Session</span>
  );
  if (s === 'CANCELLED' || s === 'NO_SHOW') return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>Cancelled</span>
  );
  return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full border" style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>Upcoming</span>
  );
}

function TodayScheduleTable({ appts, fmtTime }: { appts: any[]; fmtTime: (s: string) => string }) {
  const sorted = [...appts].sort((a, b) =>
    new Date(a.preferred_date || a.scheduled_start || 0).getTime() - new Date(b.preferred_date || b.scheduled_start || 0).getTime()
  );

  return (
    <div className="rounded-2xl border shadow-card overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Calendar size={15} style={{ color: 'var(--color-primary)' }} />
          <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Today's Schedule</p>
        </div>
        <Link href="/appointments" className="text-xs font-medium transition-opacity hover:opacity-75" style={{ color: 'var(--color-primary)' }}>View all</Link>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-36 text-center px-5 pb-5">
          <Calendar size={22} className="mb-2" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>No sessions today</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Confirmed appointments will appear here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[90px_1fr_110px_130px_36px] px-5 pb-2 gap-3">
            {['TIME', 'STUDENT', 'TYPE', 'STATUS', ''].map((h, i) => (
              <p key={i} className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>{h}</p>
            ))}
          </div>
          <div>
            {sorted.map((a: any, i: number) => {
              const time = fmtTime(a.preferred_date || a.scheduled_start || '');
              const type = getSessionType(a);
              return (
                <div key={i}
                  className="grid grid-cols-[90px_1fr_110px_130px_36px] items-center px-5 py-3.5 gap-3 transition-colors"
                  style={{ borderTop: '1px solid var(--color-border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{time}</span>
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{a.student_name || 'Student'}</span>
                  <span className="text-sm font-medium" style={{ color: SESSION_TYPE_COLORS[type] || 'var(--color-text-secondary)' }}>{type}</span>
                  <SessionStatusBadge status={a.status} />
                  <Link href={a.case_id ? `/cases/${a.case_id}` : '/appointments'}
                    className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                    <MoreHorizontal size={15} />
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const RISK_LABEL_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: 'var(--color-danger-surface)',  text: 'var(--color-danger)',  border: 'var(--color-danger)' },
  RED:      { bg: 'var(--color-warning-surface)', text: 'var(--color-warning)', border: 'var(--color-warning)' },
  YELLOW:   { bg: '#FEFCE8', text: '#CA8A04',  border: '#FDE047' },
  GREEN:    { bg: 'var(--color-success-surface)', text: 'var(--color-success)', border: 'var(--color-success)' },
};
const RISK_DOT: Record<string, string> = {
  CRITICAL: '#EF4444', RED: '#F97316', YELLOW: '#EAB308', GREEN: '#10B981',
};

export function PsychologistDashboard({ user, onLogout }: DashboardProps) {
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
          const todayStr = new Date().toDateString();
          const allAppts: any[] = d.appointments || [];
          const confirmed = allAppts.filter((a: any) => {
            const dt = a.preferred_date || a.scheduled_start || a.requested_start || '';
            try { return new Date(dt).toDateString() === todayStr &&
              ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN'].includes((a.status || '').toUpperCase()); }
            catch { return false; }
          });
          setTodayAppts(confirmed.slice(0, 6));
        }
      } finally { setLoading(false); }
    })();
  }, [mounted]);

  const menuItems = getMenuItemsByRole(user.role);
  const alerts    = dashboardData?.alerts || [];
  const cases     = dashboardData?.recent_cases || [];
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Psychologist';

  const fmtTime = (s: string) => {
    try { return new Date(s).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }); } catch { return '—'; }
  };

  const dateLabel = new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila',
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="" activeSection="dashboard">

      <div className="mb-6 pb-5 animate-fade-up" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>{dateLabel}</p>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Good day, {firstName}.</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fade-up" style={{ animationDelay: '60ms' }}>

          <PermaDistributionWidget />
          <PermaTrendsWidget />
          <TodayScheduleTable appts={todayAppts} fmtTime={fmtTime} />

          {/* High-Risk Alerts */}
          <div className="rounded-2xl border shadow-card p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold tracking-widest uppercase flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                High-Risk Alerts
                {alerts.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-bold normal-case tracking-normal" style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger)' }}>
                    {alerts.length}
                  </span>
                )}
              </p>
              {alerts.length > 0 && (
                <Link href="/high-risk" className="text-xs font-medium transition-opacity hover:opacity-75" style={{ color: 'var(--color-primary)' }}>View all</Link>
              )}
            </div>
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-36 text-center">
                <Shield size={22} className="mb-2" style={{ color: 'var(--color-success)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>No active alerts</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>All cases within normal range.</p>
              </div>
            ) : (
              <div>
                {alerts.slice(0, 6).map((a: any, i: number) => {
                  const riskStyle = RISK_LABEL_STYLES[(a.risk_level || '').toUpperCase()] || RISK_LABEL_STYLES.GREEN;
                  return (
                    <div key={i} className="py-2.5 flex items-center justify-between" style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {a.student_name || `ID: ${a.counseling_id || 'N/A'}`}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{a.counselor_name || 'Unassigned'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full border font-medium"
                          style={{ background: riskStyle.bg, color: riskStyle.text, borderColor: riskStyle.border }}>
                          {a.risk_level || 'GREEN'}
                        </span>
                        <Link href={`/cases/${a.case_id}`}>
                          <button className="text-xs px-2.5 py-1 text-white rounded-lg transition-opacity hover:opacity-90"
                            style={{ background: 'var(--color-primary)' }}>Review</button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent cases */}
          <div className="rounded-2xl border shadow-card p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Recent Cases</p>
              <Link href="/cases" className="text-xs font-medium transition-opacity hover:opacity-75" style={{ color: 'var(--color-primary)' }}>View all</Link>
            </div>
            {cases.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-36 text-center">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>No recent cases</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Cases assigned to you will appear here.</p>
              </div>
            ) : (
              <div>
                {cases.slice(0, 6).map((c: any, i: number) => (
                  <div key={i} className="py-2.5 flex items-center justify-between" style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {c.student_name || `ID: ${c.counseling_id || 'N/A'}`}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{c.status || 'Active'}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: RISK_DOT[(c.risk_level || '').toUpperCase()] || '#9CA3AF' }} />
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{c.risk_level || 'GREEN'}</span>
                    </div>
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
