'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import {
  Loader2, Eye, Video, RotateCcw, Star, ExternalLink, RefreshCw,
  Archive, CheckCircle, History, X, AlertCircle, AlertTriangle, CalendarDays,
  Search, ArrowUpDown, NotebookPen,
} from 'lucide-react';

interface Appointment {
  appointment_id: string;
  case_id?: string;
  student_name: string;
  student_email: string;
  student_id_number?: string;
  counselor_name?: string;
  status: string;
  purpose?: string;
  concern?: string;
  method?: string;
  preferred_date?: string;
  preferred_time?: string;
  meeting_link?: string;
  risk_level?: string;
}

interface DashboardData {
  role: string;
  user_name: string;
  appointments?: Appointment[];
  summary?: Record<string, number>;
  can_manage_sessions?: boolean;
  can_assign_counselor?: boolean;
}

const TABS = [
  { key: 'active',     label: 'Active',       icon: CheckCircle },
  { key: 'reschedule', label: 'Reschedule',   icon: RotateCcw },
  { key: 'evaluation', label: 'Post-Session', icon: Star },
  { key: 'past',       label: 'Completed',    icon: History },
  { key: 'cancelled',  label: 'Cancelled',    icon: X },
] as const;
type TabKey = typeof TABS[number]['key'];

const TAB_STATUSES: Record<TabKey, string[]> = {
  active:     ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN', 'PENDING_APPROVAL'],
  reschedule: ['RESCHEDULE_REQUESTED', 'PENDING_STUDENT_APPROVAL'],
  evaluation: ['EVALUATION'],
  past:       ['COMPLETED', 'FOLLOW_UP', 'REFERRAL'],
  cancelled:  ['CANCELLED', 'DENIED', 'NO_SHOW'],
};

const PURPOSE_LABEL: Record<string, string> = {
  intake_interview: 'Initial Consultation', follow_up: 'Follow-up Session',
  follow_up_counselling: 'Follow-up Session', counseling: 'Counseling Session', others: 'General Session',
};

const STATUS_STYLE: Record<string, { label: string; bg: string; text: string; border: string }> = {
  PENDING_APPROVAL:         { label: 'Under Review',          bg: 'var(--color-warning-surface)', text: 'var(--color-warning)',  border: 'var(--color-warning)' },
  APPROVED:                 { label: 'Confirmed',              bg: 'var(--color-success-surface)', text: 'var(--color-success)',  border: 'var(--color-success)' },
  MATCHED:                  { label: 'Confirmed',              bg: 'var(--color-success-surface)', text: 'var(--color-success)',  border: 'var(--color-success)' },
  CONFIRMED:                { label: 'Confirmed',              bg: 'var(--color-success-surface)', text: 'var(--color-success)',  border: 'var(--color-success)' },
  CHECKED_IN:               { label: 'Checked In',             bg: 'var(--color-primary-surface)', text: 'var(--color-primary)', border: 'var(--color-primary)' },
  RESCHEDULE_REQUESTED:     { label: 'Reschedule Pending',     bg: 'var(--color-warning-surface)', text: 'var(--color-warning)',  border: 'var(--color-warning)' },
  PENDING_STUDENT_APPROVAL: { label: 'Awaiting Confirmation',  bg: 'var(--color-primary-surface)', text: 'var(--color-primary)', border: 'var(--color-primary)' },
  EVALUATION:               { label: 'Post-Session',           bg: 'var(--color-warning-surface)', text: 'var(--color-warning)',  border: 'var(--color-warning)' },
  FOLLOW_UP:                { label: 'Follow-Up',              bg: '#EEF2FF', text: '#4F46E5', border: '#A5B4FC' },
  REFERRAL:                 { label: 'Referral',               bg: '#F5F3FF', text: '#7C3AED', border: '#C4B5FD' },
  COMPLETED:                { label: 'Completed',              bg: 'var(--color-bg)', text: 'var(--color-text-muted)', border: 'var(--color-border)' },
  CANCELLED:                { label: 'Cancelled',              bg: 'var(--color-danger-surface)', text: 'var(--color-danger)', border: 'var(--color-danger)' },
  DENIED:                   { label: 'Denied',                 bg: 'var(--color-danger-surface)', text: 'var(--color-danger)', border: 'var(--color-danger)' },
  NO_SHOW:                  { label: 'No Show',                bg: 'var(--color-danger-surface)', text: 'var(--color-danger)', border: 'var(--color-danger)' },
};

function riskStyle(level: string): React.CSSProperties {
  switch (level.toUpperCase()) {
    case 'GREEN':    return { background: 'var(--color-success-surface)', color: 'var(--color-success)' };
    case 'YELLOW':   return { background: 'var(--color-warning-surface)', color: 'var(--color-warning)' };
    case 'RED':      return { background: 'var(--color-danger-surface)',  color: 'var(--color-danger)' };
    case 'CRITICAL': return { background: 'var(--color-danger-surface)',  color: 'var(--color-danger)', fontWeight: 700 };
    default:         return { background: 'var(--color-bg)', color: 'var(--color-text-muted)' };
  }
}

function fmtDate(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtTime(d?: string, t?: string) {
  if (t) return t;
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true });
}
function fmtPurpose(p?: string) {
  if (!p) return '—';
  return PURPOSE_LABEL[p] ?? p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function fmtMethod(m?: string) {
  if (!m) return '—';
  if (m === 'in-person' || m === 'in_person') return 'Face to Face';
  if (m === 'google-meet' || m === 'google_meet') return 'Google Meet';
  return m.charAt(0).toUpperCase() + m.slice(1);
}

const IC = 'w-full px-3 py-2 text-sm rounded-lg outline-none transition';
const IC_S: React.CSSProperties = { border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' };
const onFIn  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-surface)'; };
const onFOut = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; };

export default function AppointmentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ id: string; type: 'ok' | 'err'; text: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<{ aptId: string; action: 'referral'; notes: string } | null>(null);
  const [followUpTarget, setFollowUpTarget] = useState<Appointment | null>(null);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [followUpOffice, setFollowUpOffice] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpMsg, setFollowUpMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);
  const [noShowTarget, setNoShowTarget] = useState<Appointment | null>(null);
  const [noShowReason, setNoShowReason] = useState('');
  const [submittingNoShow, setSubmittingNoShow] = useState(false);
  const [noShowTermAlert, setNoShowTermAlert] = useState<{ caseId: string | null; studentName: string } | null>(null);
  const [schedTarget, setSchedTarget] = useState<Appointment | null>(null);
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');
  const [schedOffice, setSchedOffice] = useState('');
  const [schedMethod, setSchedMethod] = useState('in_person');
  const [schedMsg, setSchedMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [submittingSched, setSubmittingSched] = useState(false);
  const [schedMode, setSchedMode] = useState<'slots' | 'manual'>('slots');
  const [schedMySlots, setSchedMySlots] = useState<{ time: string; method: string }[]>([]);
  const [loadingMySlots, setLoadingMySlots] = useState(false);
  const [intakeSummary, setIntakeSummary] = useState<any>(null);
  const [intakePacket, setIntakePacket] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'risk'>('date-asc');
  const [riskFilter, setRiskFilter] = useState<'all' | 'high'>('all');
  const [mineOnly, setMineOnly] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api('/api/appointments/dashboard/role-view'), { headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 401) { router.replace('/login'); return; }
      if (r.ok) setDashboard(await r.json());
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userData || !token) { router.replace('/login'); return; }
    setUser(JSON.parse(userData));
    load();
  }, []);

  useEffect(() => {
    if (!user) return;
    const role = user.role?.toUpperCase();
    if (['STAFF', 'ADMIN', 'IC'].includes(role)) router.replace('/appointment-requests');
  }, [user]);

  useEffect(() => {
    if (!detailAppt) { setIntakeSummary(null); setIntakePacket(null); return; }
    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };
    const id = detailAppt.appointment_id;
    Promise.all([
      fetch(api(`/api/intake/${id}`), { headers: h }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(api(`/api/intake/packet/${id}`), { headers: h }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([s, p]) => { setIntakeSummary(s); setIntakePacket(p); });
  }, [detailAppt]);

  const apts = Array.isArray(dashboard?.appointments) ? dashboard!.appointments! : [];
  const counts = Object.fromEntries(TABS.map(t => [t.key, apts.filter(a => TAB_STATUSES[t.key as TabKey].includes(a.status)).length])) as Record<TabKey, number>;
  const visibleTabs = TABS.filter(tab => tab.key !== 'reschedule' || counts.reschedule > 0);
  const displayTab = (activeTab === 'reschedule' && counts.reschedule === 0) ? 'active' : activeTab;
  const filtered = apts.filter(a => TAB_STATUSES[displayTab].includes(a.status));
  const canManage = dashboard?.can_manage_sessions ?? false;

  const RISK_ORDER: Record<string, number> = { CRITICAL: 0, RED: 1, YELLOW: 2, GREEN: 3 };
  const displayed = filtered
    .filter(a => {
      if (search && !a.student_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (riskFilter === 'high' && !['RED', 'CRITICAL'].includes((a.risk_level ?? '').toUpperCase())) return false;
      if (mineOnly && a.counselor_name && dashboard?.user_name && !a.counselor_name.toLowerCase().includes(dashboard.user_name.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'risk') {
        const ra = RISK_ORDER[(a.risk_level ?? '').toUpperCase()] ?? 4;
        const rb = RISK_ORDER[(b.risk_level ?? '').toUpperCase()] ?? 4;
        return ra - rb;
      }
      const da = a.preferred_date ? new Date(a.preferred_date).getTime() : (sortBy === 'date-asc' ? Infinity : -Infinity);
      const db2 = b.preferred_date ? new Date(b.preferred_date).getTime() : (sortBy === 'date-asc' ? Infinity : -Infinity);
      return sortBy === 'date-asc' ? da - db2 : db2 - da;
    });

  const doAction = async (aptId: string, endpoint: string, body?: object) => {
    setActioningId(aptId); setActionMsg(null);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/appointments/${aptId}/${endpoint}`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (r.ok) {
        const msgs: Record<string, string> = {
          'set-evaluation': 'Session marked done.', 'set-follow-up': 'Marked as Follow-Up.',
          'set-referral': 'Marked as Referral.', 'complete': 'Marked as Completed.', 'mark-no-show': 'Marked as No Show.',
        };
        setActionMsg({ id: aptId, type: 'ok', text: msgs[endpoint] ?? 'Done.' });
        setPendingAction(null);
        setTimeout(() => load(), 900);
      } else {
        const e = await r.json();
        setActionMsg({ id: aptId, type: 'err', text: e.error || 'Failed.' });
      }
    } finally { setActioningId(null); }
  };

  const doFollowUp = async () => {
    if (!followUpTarget || !followUpDate || !followUpTime) return;
    setSubmittingFollowUp(true); setFollowUpMsg(null);
    try {
      const token = localStorage.getItem('token');
      const scheduledStart = new Date(`${followUpDate}T${followUpTime}:00`).toISOString();
      const r = await fetch(api(`/api/appointments/${followUpTarget.appointment_id}/set-follow-up`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_start: scheduledStart, office: followUpOffice, notes: followUpNotes }),
      });
      if (r.ok) { setFollowUpMsg({ type: 'ok', text: 'Follow-up session scheduled.' }); setTimeout(() => { setFollowUpTarget(null); load(); }, 1200); }
      else { const e = await r.json(); setFollowUpMsg({ type: 'err', text: e.error || 'Failed to schedule follow-up.' }); }
    } finally { setSubmittingFollowUp(false); }
  };

  const loadMySlots = async (date: string) => {
    if (!date) return;
    setLoadingMySlots(true); setSchedMySlots([]);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/availability/my-slots?date=${date}`), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setSchedMySlots(d.slots || []); }
    } finally { setLoadingMySlots(false); }
  };

  const doSchedule = async () => {
    if (!schedTarget || !schedDate || !schedTime) return;
    setSubmittingSched(true); setSchedMsg(null);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/appointments/${schedTarget.appointment_id}/schedule`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: schedDate, time: schedTime, office: schedOffice, method: schedMethod }),
      });
      if (r.ok) { setSchedMsg({ type: 'ok', text: 'Session scheduled.' }); setTimeout(() => { setSchedTarget(null); load(); }, 1200); }
      else { const e = await r.json(); setSchedMsg({ type: 'err', text: e.error || 'Failed to schedule.' }); }
    } finally { setSubmittingSched(false); }
  };

  if (loading) {
    return (
      <DashboardPageWrapper title="My Appointments" subtitle="Sessions assigned to you">
        <div className="flex items-center justify-center h-52 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="My Appointments" subtitle="Sessions assigned to you">

      {/* Summary strip */}
      {dashboard?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total',        value: dashboard.summary.total_appointments ?? apts.length, color: 'var(--color-text-primary)' },
            { label: 'Confirmed',    value: dashboard.summary.confirmed ?? 0,                    color: 'var(--color-primary)' },
            { label: 'Post-Session', value: dashboard.summary.awaiting_evaluation ?? 0,          color: 'var(--color-warning)' },
            { label: 'Follow-Up',    value: (dashboard.summary.follow_up ?? 0) + (dashboard.summary.referral ?? 0), color: '#4F46E5' },
          ].map(c => (
            <div key={c.label} className="rounded-2xl border shadow-card px-4 py-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{c.label}</p>
              <p className="text-2xl font-semibold" style={{ color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Post-session banner */}
      {counts.evaluation > 0 && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4 text-sm border"
          style={{ background: 'var(--color-warning-surface)', borderColor: 'var(--color-warning)' }}>
          <Star size={15} className="flex-shrink-0" style={{ color: 'var(--color-warning)' }} />
          <span className="font-medium" style={{ color: 'var(--color-warning)' }}>
            {counts.evaluation} session{counts.evaluation > 1 ? 's' : ''} waiting for your decision — set Follow-Up, Referral, or Complete.
          </span>
          <button onClick={() => setActiveTab('evaluation')}
            className="ml-auto text-xs font-semibold underline underline-offset-2 transition hover:opacity-70"
            style={{ color: 'var(--color-warning)' }}>
            Review
          </button>
        </div>
      )}

      {/* Card panel */}
      <div className="rounded-xl shadow-card border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

        {/* Tabs */}
        <div className="flex items-end overflow-x-auto px-2 pt-1.5 gap-0.5 scrollbar-hide" style={{ borderBottom: '1px solid var(--color-border)' }}>
          {visibleTabs.map(tab => {
            const isActive = displayTab === tab.key;
            const cnt = counts[tab.key];
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium rounded-t-lg transition-all whitespace-nowrap flex-shrink-0"
                style={isActive
                  ? { background: 'var(--color-primary-surface)', color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)' }
                  : { color: 'var(--color-text-muted)' }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                {tab.label}
                {cnt > 0 && (
                  <span className="text-[10px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-1"
                    style={isActive
                      ? { background: 'var(--color-primary)', color: 'white' }
                      : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 px-3 py-2.5 flex-wrap" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
          <div className="relative flex-1 min-w-[140px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search student…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg outline-none"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
            />
          </div>
          <div className="relative flex items-center">
            <ArrowUpDown size={11} className="absolute left-2.5 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="pl-7 pr-2 py-1.5 text-xs rounded-lg outline-none appearance-none cursor-pointer"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>
              <option value="date-asc">Soonest first</option>
              <option value="date-desc">Latest first</option>
              <option value="risk">Risk level</option>
            </select>
          </div>
          <button onClick={() => setRiskFilter(r => r === 'all' ? 'high' : 'all')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition whitespace-nowrap"
            style={riskFilter === 'high'
              ? { background: 'var(--color-danger-surface)', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }
              : { background: 'var(--color-surface)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
            <AlertTriangle size={11} /> High Risk
          </button>
          <button onClick={() => setMineOnly(v => !v)}
            aria-label={mineOnly ? 'Show all appointments' : 'Show only my appointments'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition whitespace-nowrap"
            style={mineOnly
              ? { background: 'var(--color-primary-surface)', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }
              : { background: 'var(--color-surface)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
            Mine only
          </button>
        </div>

        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 text-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--color-bg)' }}>
              <CalendarDays size={18} style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {filtered.length === 0 ? 'No sessions here' : 'No matches'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {filtered.length === 0
                ? (activeTab === 'active' ? 'No confirmed sessions at the moment.' : `No ${TABS.find(t => t.key === activeTab)?.label.toLowerCase()} sessions.`)
                : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          <>
            <div className="p-4 space-y-3">
              {displayed.map((apt) => {
                const cfg = STATUS_STYLE[apt.status] ?? { label: apt.status, bg: 'var(--color-bg)', text: 'var(--color-text-muted)', border: 'var(--color-border)' };
                const isEval = apt.status === 'EVALUATION';
                const isConfirmed = ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN'].includes(apt.status);
                const isPendingStudentApproval = apt.status === 'PENDING_STUDENT_APPROVAL';
                const isHighRisk = apt.risk_level && ['RED', 'CRITICAL'].includes(apt.risk_level.toUpperCase());
                const aptId = apt.appointment_id;

                const cardBorderColor = isHighRisk ? 'var(--color-danger)'
                  : isEval ? 'var(--color-warning)'
                  : isPendingStudentApproval ? 'var(--color-primary)'
                  : isConfirmed ? 'var(--color-success)'
                  : 'var(--color-border)';
                const cardBg = isHighRisk ? 'rgba(239,68,68,0.04)'
                  : isEval ? 'rgba(245,158,11,0.04)'
                  : isPendingStudentApproval ? 'var(--color-primary-surface)'
                  : 'var(--color-surface)';

                return (
                  <div key={aptId} className="rounded-xl border p-4 transition-colors"
                    style={{ border: `1px solid ${cardBorderColor}`, background: cardBg }}>
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium border"
                            style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}>
                            {cfg.label}
                          </span>
                          {apt.risk_level && apt.risk_level !== 'GREEN' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border"
                              style={{ ...riskStyle(apt.risk_level), borderColor: 'transparent' }}>
                              ⚠ {apt.risk_level}
                            </span>
                          )}
                        </div>

                        <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{apt.student_name}</p>

                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                          {fmtPurpose(apt.purpose)}
                          {apt.concern && <span style={{ color: 'var(--color-text-muted)' }}> · &ldquo;{apt.concern}&rdquo;</span>}
                        </p>

                        {apt.preferred_date && (
                          <div className="flex items-center gap-3 mt-1 text-xs flex-wrap" style={{ color: 'var(--color-text-secondary)' }}>
                            <span className="flex items-center gap-1">
                              <CalendarDays size={11} />
                              {fmtDate(apt.preferred_date)}{apt.preferred_time ? ` ${fmtTime(apt.preferred_date, apt.preferred_time)}` : ''}
                            </span>
                            <span>{fmtMethod(apt.method)}</span>
                          </div>
                        )}

                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {apt.student_email}
                          {apt.student_id_number && <span className="ml-2">· {apt.student_id_number}</span>}
                        </p>

                        {canManage && (
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <button onClick={() => setDetailAppt(apt)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition"
                              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              <Eye size={11} /> View
                            </button>

                            {isConfirmed && !apt.preferred_date && (
                              <button onClick={() => { setSchedTarget(apt); setSchedDate(''); setSchedTime(''); setSchedOffice(''); setSchedMethod('in_person'); setSchedMsg(null); setSchedMode('slots'); setSchedMySlots([]); }}
                                className="flex items-center gap-1 px-2.5 py-1 text-white text-xs font-semibold rounded-lg transition hover:opacity-90"
                                style={{ background: 'var(--color-primary)' }}>
                                <CalendarDays size={11} /> Set Schedule
                              </button>
                            )}

                            {isPendingStudentApproval && (
                              <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
                                <CheckCircle size={11} /> Schedule proposed — waiting for student
                              </span>
                            )}

                            {apt.meeting_link && isConfirmed && (
                              <a href={apt.meeting_link} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition font-semibold"
                                style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)', borderColor: 'var(--color-success)' }}>
                                <Video size={11} /> Join
                              </a>
                            )}

                            {isConfirmed && !isPendingStudentApproval && (
                              <>
                                {apt.case_id && (
                                  <a href={`/cases/${apt.case_id}?tab=session-notes`}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition"
                                    style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
                                    <NotebookPen size={11} /> Session Notes
                                  </a>
                                )}
                                <button onClick={() => doAction(aptId, 'set-evaluation')} disabled={actioningId === aptId}
                                  className="flex items-center gap-1 px-2.5 py-1 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 hover:opacity-90"
                                  style={{ background: 'var(--color-warning)' }}>
                                  {actioningId === aptId ? <Loader2 size={11} className="animate-spin" /> : <Star size={11} />}
                                  Session Done
                                </button>
                                <button onClick={() => { setNoShowTarget(apt); setNoShowReason(''); }}
                                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition"
                                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-danger)'; e.currentTarget.style.color = 'var(--color-danger)'; e.currentTarget.style.background = 'var(--color-danger-surface)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent'; }}>
                                  No Show
                                </button>
                              </>
                            )}

                            {isEval && apt.case_id && (
                              <a href={`/cases/${apt.case_id}?tab=session-notes`}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition"
                                style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
                                <NotebookPen size={11} /> Write Note
                              </a>
                            )}

                            {isEval && (
                              pendingAction?.aptId === aptId ? (
                                <div className="flex items-end gap-2">
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>Referral Notes</p>
                                    <textarea rows={1} value={pendingAction.notes}
                                      onChange={e => setPendingAction(p => p ? { ...p, notes: e.target.value } : p)}
                                      placeholder="Optional notes…"
                                      className="w-40 rounded-lg px-2 py-1 text-xs resize-none outline-none"
                                      style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }} />
                                  </div>
                                  <button onClick={() => doAction(aptId, 'set-referral', { notes: pendingAction.notes })} disabled={actioningId === aptId}
                                    className="px-2.5 py-1 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 hover:opacity-90"
                                    style={{ background: 'var(--color-primary)' }}>
                                    {actioningId === aptId ? <Loader2 size={11} className="animate-spin" /> : 'Confirm'}
                                  </button>
                                  <button onClick={() => setPendingAction(null)}
                                    className="px-2.5 py-1 border text-xs rounded-lg transition"
                                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>Cancel</button>
                                </div>
                              ) : (
                                <>
                                  <button onClick={() => { setFollowUpTarget(apt); setFollowUpDate(''); setFollowUpTime(''); setFollowUpOffice(''); setFollowUpNotes(''); setFollowUpMsg(null); }}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition"
                                    style={{ background: '#EEF2FF', color: '#4F46E5', borderColor: '#A5B4FC' }}>
                                    <RefreshCw size={11} /> Schedule Follow-Up
                                  </button>
                                  <button onClick={() => setPendingAction({ aptId, action: 'referral', notes: '' })}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition"
                                    style={{ background: '#F5F3FF', color: '#7C3AED', borderColor: '#C4B5FD' }}>
                                    <ExternalLink size={11} /> Referral
                                  </button>
                                  <button onClick={() => doAction(aptId, 'complete')} disabled={actioningId === aptId}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition disabled:opacity-50"
                                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                    {actioningId === aptId ? <Loader2 size={11} className="animate-spin" /> : <Archive size={11} />}
                                    Complete & Close
                                  </button>
                                </>
                              )
                            )}

                            {actionMsg?.id === aptId && !pendingAction && (
                              <p className="text-xs" style={{ color: actionMsg.type === 'ok' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                {actionMsg.text}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3.5" style={{ background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Showing <strong style={{ color: 'var(--color-text-secondary)' }}>{displayed.length}</strong>
                {displayed.length !== filtered.length && <span> of {filtered.length}</span>} session{displayed.length !== 1 ? 's' : ''}
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {detailAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in" style={{ background: 'var(--color-surface)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Session Details</h3>
              <button onClick={() => setDetailAppt(null)} className="p-1.5 rounded-lg transition"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X size={14} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg p-3" style={{ background: 'var(--color-bg)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Student</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{detailAppt.student_name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{detailAppt.student_email}</p>
                  {detailAppt.student_id_number && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{detailAppt.student_id_number}</p>}
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--color-bg)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Status</p>
                  {(() => { const s = STATUS_STYLE[detailAppt.status] ?? { label: detailAppt.status, bg: 'var(--color-bg)', text: 'var(--color-text-muted)', border: 'var(--color-border)' }; return (
                    <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-medium border" style={{ background: s.bg, color: s.text, borderColor: s.border }}>{s.label}</span>
                  ); })()}
                </div>
              </div>
              {[
                { title: 'Date & Time', content: `${fmtDate(detailAppt.preferred_date)} ${fmtTime(detailAppt.preferred_date, detailAppt.preferred_time)}` },
              ].map(({ title, content }) => (
                <div key={title} className="rounded-lg p-3" style={{ background: 'var(--color-bg)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>{title}</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{content}</p>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg p-3" style={{ background: 'var(--color-bg)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Session Type</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{fmtPurpose(detailAppt.purpose)}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--color-bg)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Mode</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{fmtMethod(detailAppt.method)}</p>
                </div>
              </div>
              {detailAppt.concern && (
                <div className="rounded-lg p-3" style={{ background: 'var(--color-bg)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Concern</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{detailAppt.concern}</p>
                </div>
              )}
              {detailAppt.risk_level && detailAppt.risk_level !== 'GREEN' && (
                <div className="rounded-lg px-3 py-2 flex items-center gap-2 border" style={{ ...riskStyle(detailAppt.risk_level), borderColor: 'transparent' }}>
                  <AlertCircle size={14} />
                  <span className="text-xs font-semibold">Risk Level: {detailAppt.risk_level}</span>
                </div>
              )}
              {detailAppt.meeting_link && (
                <a href={detailAppt.meeting_link} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition border"
                  style={{ background: 'var(--color-success-surface)', borderColor: 'var(--color-success)', color: 'var(--color-success)' }}>
                  <Video size={14} /> Join Session
                </a>
              )}

              {/* IC Triage Summary */}
              {intakeSummary && (intakeSummary.phq9_score != null || intakeSummary.gad7_score != null || intakeSummary.triage_decision) && (
                <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide" style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                    IC Triage Summary
                  </p>
                  <div className="p-3 space-y-2">
                    {(intakeSummary.phq9_score != null || intakeSummary.gad7_score != null) && (
                      <div className="grid grid-cols-2 gap-2">
                        {intakeSummary.phq9_score != null && (
                          <div className="rounded-lg p-2 text-center" style={{ background: 'var(--color-bg)' }}>
                            <p className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>PHQ-9</p>
                            <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{intakeSummary.phq9_score}<span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>/27</span></p>
                          </div>
                        )}
                        {intakeSummary.gad7_score != null && (
                          <div className="rounded-lg p-2 text-center" style={{ background: 'var(--color-bg)' }}>
                            <p className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>GAD-7</p>
                            <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{intakeSummary.gad7_score}<span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>/21</span></p>
                          </div>
                        )}
                      </div>
                    )}
                    {intakeSummary.triage_decision && (
                      <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        <span className="font-semibold" style={{ color: 'var(--color-text-muted)' }}>Decision: </span>
                        {intakeSummary.triage_decision === 'ENDORSE_CC' && 'Endorsed to Counselor (CC)'}
                        {intakeSummary.triage_decision === 'ENDORSE_CP' && 'Endorsed to Psychologist (CP)'}
                        {intakeSummary.triage_decision === 'CLOSE_AT_INTAKE' && 'Closed at Intake'}
                      </div>
                    )}
                    {intakeSummary.endorsement_notes && (
                      <div className="rounded-lg p-2" style={{ background: 'var(--color-bg)' }}>
                        <p className="text-[10px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>IC Notes</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{intakeSummary.endorsement_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PHQ-4 Pre-Screen */}
              {intakePacket?.phq4_summary && (
                <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide" style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                    PHQ-4 Pre-Screen
                  </p>
                  <div className="grid grid-cols-3 gap-2 p-3">
                    {[
                      { l: 'PHQ-2', s: intakePacket.phq4_summary.phq2_score, max: 6,  risk: intakePacket.phq4_summary.phq2_at_risk },
                      { l: 'GAD-2', s: intakePacket.phq4_summary.gad2_score, max: 6,  risk: intakePacket.phq4_summary.gad2_at_risk },
                      { l: 'Total', s: intakePacket.phq4_summary.total_score, max: 12, risk: intakePacket.phq4_summary.total_score >= 6 },
                    ].map(x => (
                      <div key={x.l} className="rounded-lg p-2 text-center"
                        style={{ background: x.risk ? 'var(--color-danger-surface)' : 'var(--color-success-surface)' }}>
                        <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{x.l}</p>
                        <p className="text-base font-bold" style={{ color: x.risk ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                          {x.s}<span className="text-[10px] font-normal" style={{ color: 'var(--color-text-muted)' }}>/{x.max}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {intakePacket?.icf?.presenting_concern && (
                <div className="rounded-lg p-3" style={{ background: 'var(--color-bg)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Presenting Concern (ICF)</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{intakePacket.icf.presenting_concern}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 flex justify-end" style={{ borderTop: '1px solid var(--color-border)' }}>
              <button onClick={() => setDetailAppt(null)}
                className="px-4 py-2 text-sm rounded-lg border transition"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── No Show Modal ── */}
      {noShowTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in" style={{ background: 'var(--color-surface)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Mark as No Show</h3>
              <button onClick={() => setNoShowTarget(null)} className="p-1.5 rounded-lg transition"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X size={14} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Confirm that <strong>{noShowTarget.student_name}</strong> did not attend this session.
              </p>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Remarks <span className="font-normal normal-case" style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
                </label>
                <textarea value={noShowReason} onChange={e => setNoShowReason(e.target.value)}
                  rows={2} placeholder="Any notes about this no-show…"
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none transition resize-none"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                  onFocus={onFIn} onBlur={onFOut} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setNoShowTarget(null)}
                  className="flex-1 px-4 py-2 border text-sm rounded-lg transition"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  Cancel
                </button>
                <button disabled={submittingNoShow}
                  onClick={async () => {
                    setSubmittingNoShow(true);
                    const token = localStorage.getItem('token');
                    const r = await fetch(api(`/api/appointments/${noShowTarget.appointment_id}/mark-no-show`), {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ reason: noShowReason }),
                    });
                    if (r.ok) {
                      const d = await r.json();
                      setActionMsg({ id: noShowTarget.appointment_id, type: 'ok', text: 'Marked as No Show.' });
                      setPendingAction(null);
                      if (d.auto_terminated) setNoShowTermAlert({ caseId: noShowTarget.case_id ?? null, studentName: noShowTarget.student_name ?? 'Student' });
                      setTimeout(() => load(), 900);
                    } else {
                      const e = await r.json();
                      setActionMsg({ id: noShowTarget.appointment_id, type: 'err', text: e.error || 'Failed.' });
                    }
                    setNoShowTarget(null); setNoShowReason(''); setSubmittingNoShow(false);
                  }}
                  className="flex-1 px-4 py-2 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90"
                  style={{ background: 'var(--color-danger)' }}>
                  {submittingNoShow && <Loader2 size={13} className="animate-spin" />}
                  Confirm No Show
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── No-Show Termination Alert ── */}
      {noShowTermAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in" style={{ background: 'var(--color-surface)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-danger)', background: 'var(--color-danger-surface)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-danger)' }}>Case Flagged for Termination</h3>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <strong>{noShowTermAlert.studentName}</strong> has now missed 3 consecutive sessions.
                Per CPS protocol, this case has been flagged for administrative termination.
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Go to the case page to review and confirm the closure. The student will be notified when you confirm.
              </p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setNoShowTermAlert(null)}
                  className="flex-1 px-4 py-2 border text-sm rounded-lg transition"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  Dismiss
                </button>
                {noShowTermAlert.caseId && (
                  <a href={`/cases/${noShowTermAlert.caseId}`} onClick={() => setNoShowTermAlert(null)}
                    className="flex-1 px-4 py-2 text-white text-sm font-medium rounded-lg transition text-center hover:opacity-90"
                    style={{ background: 'var(--color-danger)' }}>
                    View Case
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Follow-Up Modal ── */}
      {followUpTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in" style={{ background: 'var(--color-surface)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Schedule Follow-Up Session</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{followUpTarget.student_name}</p>
              </div>
              <button onClick={() => setFollowUpTarget(null)} className="p-1.5 rounded-lg transition"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X size={14} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs rounded-lg px-3 py-2 border" style={{ color: '#4F46E5', background: '#EEF2FF', borderColor: '#A5B4FC' }}>
                A new confirmed session will be created and linked to the same case. The student will see it in their upcoming sessions.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Date <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                  <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Time <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                  <input type="time" value={followUpTime} onChange={e => setFollowUpTime(e.target.value)} className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Office / Location <span className="font-normal normal-case" style={{ color: 'var(--color-text-muted)' }}>(optional)</span></label>
                <input type="text" value={followUpOffice} onChange={e => setFollowUpOffice(e.target.value)}
                  placeholder="e.g. Room 203, CPS Office" className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Notes <span className="font-normal normal-case" style={{ color: 'var(--color-text-muted)' }}>(optional)</span></label>
                <textarea value={followUpNotes} onChange={e => setFollowUpNotes(e.target.value)}
                  rows={2} placeholder="Session notes or focus areas…"
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none transition resize-none"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                  onFocus={onFIn} onBlur={onFOut} />
              </div>
              {followUpMsg && (
                <p className="text-xs" style={{ color: followUpMsg.type === 'ok' ? 'var(--color-success)' : 'var(--color-danger)' }}>{followUpMsg.text}</p>
              )}
              <div className="flex gap-2">
                <button onClick={() => setFollowUpTarget(null)}
                  className="flex-1 px-4 py-2 border text-sm rounded-lg transition"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  Cancel
                </button>
                <button onClick={doFollowUp} disabled={submittingFollowUp || !followUpDate || !followUpTime}
                  className="flex-1 px-4 py-2 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90"
                  style={{ background: '#4F46E5' }}>
                  {submittingFollowUp && <Loader2 size={13} className="animate-spin" />}
                  Schedule Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Set Schedule Modal ── */}
      {schedTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in" style={{ background: 'var(--color-surface)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Set Session Schedule</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{schedTarget.student_name}</p>
              </div>
              <button onClick={() => setSchedTarget(null)} className="p-1.5 rounded-lg transition"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X size={14} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>

            {/* Mode toggle */}
            <div className="flex" style={{ borderBottom: '1px solid var(--color-border)' }}>
              {(['slots', 'manual'] as const).map(m => {
                const active = schedMode === m;
                return (
                  <button key={m} onClick={() => setSchedMode(m)}
                    className="flex-1 py-2.5 text-xs font-semibold transition"
                    style={active
                      ? { color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)', background: 'var(--color-primary-surface)' }
                      : { color: 'var(--color-text-muted)' }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                    {m === 'slots' ? 'My Available Slots' : 'Manual Entry'}
                  </button>
                );
              })}
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Endorsed session for {schedTarget.student_name}. Proposing a schedule will notify the student for confirmation.
              </p>

              {schedMode === 'slots' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Pick a date</label>
                    <input type="date" value={schedDate}
                      onChange={e => { setSchedDate(e.target.value); setSchedTime(''); loadMySlots(e.target.value); }}
                      min={new Date().toISOString().split('T')[0]}
                      className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
                  </div>
                  {schedDate && (
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Available slots</label>
                      {loadingMySlots ? (
                        <div className="flex items-center gap-2 text-xs py-3" style={{ color: 'var(--color-text-muted)' }}>
                          <Loader2 size={12} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading your slots…
                        </div>
                      ) : schedMySlots.length === 0 ? (
                        <p className="text-xs py-2" style={{ color: 'var(--color-text-muted)' }}>No available slots on this day. Try another date or use Manual Entry.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {schedMySlots.map(s => {
                            const sel = schedTime === s.time;
                            return (
                              <button key={s.time}
                                onClick={() => { setSchedTime(s.time); if (s.method) setSchedMethod(s.method === 'online' ? 'google_meet' : 'in_person'); }}
                                className="py-2 rounded-lg text-xs font-medium border transition"
                                style={sel
                                  ? { background: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)' }
                                  : { background: 'var(--color-surface)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}
                                onMouseEnter={e => { if (!sel) e.currentTarget.style.borderColor = 'var(--color-success)'; }}
                                onMouseLeave={e => { if (!sel) e.currentTarget.style.borderColor = 'var(--color-border)'; }}>
                                {s.time}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Date</label>
                    <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Time</label>
                    <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Method</label>
                <select value={schedMethod} onChange={e => setSchedMethod(e.target.value)} className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut}>
                  <option value="in_person">Face to Face</option>
                  <option value="google_meet">Google Meet</option>
                  <option value="zoom">Zoom</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Room / Office <span style={{ color: 'var(--color-text-muted)' }}>(optional)</span></label>
                <input type="text" value={schedOffice} onChange={e => setSchedOffice(e.target.value)}
                  placeholder="e.g. CPS Room 301" className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
              </div>
              {schedMsg && (
                <p className="text-xs" style={{ color: schedMsg.type === 'ok' ? 'var(--color-success)' : 'var(--color-danger)' }}>{schedMsg.text}</p>
              )}
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => setSchedTarget(null)}
                className="flex-1 px-4 py-2 border text-sm rounded-lg transition"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                Cancel
              </button>
              <button onClick={doSchedule} disabled={submittingSched || !schedDate || !schedTime}
                className="flex-1 px-4 py-2 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                {submittingSched && <Loader2 size={13} className="animate-spin" />}
                Propose Schedule
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardPageWrapper>
  );
}
