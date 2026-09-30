'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { DashboardGreeting } from './DashboardGreeting';
import { useState, useEffect } from 'react';
import { fetchDashboardData } from '@/utils/dashboard-api';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Loader2, Shield, MoreHorizontal, Calendar, AlertTriangle, FileText } from 'lucide-react';
import { AnnouncementsPanel } from './AnnouncementsPanel';

interface AttentionCase {
  _id: string; student_name: string; case_status: string; risk_level: string; reason: string;
}

function getRiskColor(c: AttentionCase): string {
  if (c.case_status?.toUpperCase() === 'PENDING_TERMINATION') return 'var(--color-danger)';
  const r = (c.risk_level || '').toUpperCase();
  if (r === 'CRITICAL') return 'var(--color-danger)';
  if (r === 'RED') return 'var(--color-warning)';
  return 'var(--color-text-muted)';
}

function CasesNeedingAttention() {
  const [cases, setCases] = useState<AttentionCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(api('/api/cases?limit=50'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        const all: any[] = d.cases || d || [];
        const attention: AttentionCase[] = [];
        for (const c of all) {
          const status = (c.case_status || '').toUpperCase();
          const risk = (c.risk_level || '').toUpperCase();
          if (status === 'PENDING_TERMINATION') {
            const terminationType = (c.termination_type || '').replace(/_/g, ' ').toLowerCase() || 'pending closure';
            attention.push({ _id: c._id, student_name: c.student_name || 'Student', case_status: c.case_status, risk_level: c.risk_level, reason: terminationType });
          } else if (risk === 'CRITICAL' || risk === 'RED') {
            attention.push({ _id: c._id, student_name: c.student_name || 'Student', case_status: c.case_status, risk_level: c.risk_level, reason: `${c.risk_level} risk` });
          }
        }
        setCases(attention.slice(0, 6));
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-2xl border shadow-card p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} style={{ color: 'var(--color-warning)' }} />
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Cases Needing Attention</p>
        </div>
        <Link href="/cases" className="text-xs font-medium transition-opacity hover:opacity-75" style={{ color: 'var(--color-primary)' }}>View all</Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
        </div>
      ) : fetchError ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <AlertTriangle size={18} className="mb-2" style={{ color: 'var(--color-warning)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Could not load cases</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Check your connection and refresh.</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <Shield size={22} className="mb-2" style={{ color: 'var(--color-success)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>All cases on track</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>No cases require immediate attention.</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {cases.map(c => (
            <div key={c._id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{c.student_name}</p>
                <p className="text-xs mt-0.5 font-medium" style={{ color: getRiskColor(c) }}>{c.reason}</p>
              </div>
              <Link href={`/cases/${c._id}`}
                className="flex-shrink-0 text-xs px-2.5 py-1 text-white rounded-lg transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                View
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface PendingNote {
  appointment_id: string;
  case_id: string | null;
  student_name: string;
  scheduled_start: string;
}

function PendingNotesPanel() {
  const [items, setItems] = useState<PendingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(api('/api/appointments/dashboard/pending-notes'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setItems(d.pending || []))
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, []);

  const fmtDate = (s: string) => {
    try {
      return new Date(s).toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila', month: 'short', day: 'numeric',
      });
    } catch { return '—'; }
  };

  return (
    <div className="rounded-2xl border shadow-card p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText size={14} style={{ color: 'var(--color-warning)' }} />
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Pending Session Notes</p>
        </div>
        <Link href="/cases" className="text-xs font-medium transition-opacity hover:opacity-75" style={{ color: 'var(--color-primary)' }}>View cases</Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
        </div>
      ) : err ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <AlertTriangle size={18} className="mb-2" style={{ color: 'var(--color-warning)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Could not load pending notes</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <FileText size={22} className="mb-2" style={{ color: 'var(--color-success)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>All notes up to date</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>No completed sessions are missing a note.</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {items.map(item => (
            <div key={item.appointment_id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{item.student_name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Session on {fmtDate(item.scheduled_start)}</p>
              </div>
              <Link
                href={item.case_id ? `/cases/${item.case_id}` : '/cases'}
                className="flex-shrink-0 text-xs px-2.5 py-1 text-white rounded-lg transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-warning)' }}>
                Add Note
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DashboardProps { user: any; onLogout: () => void; }

function getSessionType(a: any): string {
  const purpose = (a.purpose || '').toLowerCase();
  if (purpose === 'intake_interview') return 'Intake';
  if (purpose === 'follow_up') return 'Follow-up';
  if (purpose === 'counseling') return 'Counseling';
  if (purpose === 'others') return 'General';
  const ref = (a.referral_type || '').toUpperCase();
  if (ref === 'WALKIN') return 'Walk-in';
  if (ref.includes('EMERGENCY') || ref.includes('CRISIS')) return 'Crisis';
  if (ref.includes('FOLLOW')) return 'Follow-up';
  if (ref === 'INTAKE' || ref === 'EVALUATION') return 'Intake';
  const status = (a.status || '').toUpperCase();
  if (status === 'FOLLOW_UP') return 'Follow-up';
  if (status === 'EVALUATION') return 'Intake';
  return 'Counseling';
}

const SESSION_TYPE_COLORS: Record<string, string> = {
  'Counseling': '#3B82F6',
  'Follow-up':  '#8B5CF6',
  'Intake':     '#14B8A6',
  'Crisis':     '#EF4444',
  'Walk-in':    '#F97316',
  'General':    '#6366F1',
};

function SessionStatusBadge({ status }: { status: string }) {
  const s = (status || '').toUpperCase();
  if (s === 'COMPLETED') return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full border" style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)', borderColor: 'var(--color-success)' }}>Completed</span>
  );
  if (s === 'CHECKED_IN') return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full border" style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}>In Session</span>
  );
  if (s === 'CANCELLED') return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>Cancelled</span>
  );
  if (s === 'NO_SHOW') return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger)' }}>No-show</span>
  );
  if (s === 'CONFIRMED') return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full border" style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)', borderColor: 'var(--color-success)' }}>Confirmed</span>
  );
  if (s === 'SCHEDULED') return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full border" style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>Scheduled</span>
  );
  return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full border" style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>{status}</span>
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

export function CounselorDashboard({ user, onLogout }: DashboardProps) {
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
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Counselor';

  const fmtTime = (s: string) => {
    try { return new Date(s).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }); } catch { return '—'; }
  };


  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="" activeSection="dashboard" titleInPage>

      <DashboardGreeting firstName={firstName} subtitle="Here’s your caseload and schedule for today." />

      {loading ? (
        <div className="flex items-center justify-center h-40 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fade-up" style={{ animationDelay: '60ms' }}>
          <div className="lg:col-span-2">
            <TodayScheduleTable appts={todayAppts} fmtTime={fmtTime} />
          </div>
          <PendingNotesPanel />
          <CasesNeedingAttention />
          <div className="lg:col-span-2">
            <AnnouncementsPanel />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
