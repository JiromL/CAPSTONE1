'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import {
  Loader2, Plus, Video, X, RotateCcw, Clock, Eye,
  CheckCircle, CalendarDays, Star, History, AlertCircle, FileText, MapPin,
} from 'lucide-react';
import Link from 'next/link';

interface Appointment {
  _id: string;
  appointment_id?: string;
  status: string;
  purpose?: string;
  concern?: string;
  preferred_method?: string;
  preferred_platform?: string;
  preferred_time?: string;
  requested_start?: string;
  scheduled_start?: string;
  counselor_id?: string;
  counselor_name?: string;
  counselor_role?: string;
  counseling_id?: string;
  meeting_link?: string;
  office?: string;
  created_at: string;
  evaluation?: object;
  reschedule_requested_by_role?: string;
  reschedule_requested_start?: string;
  reschedule_reason?: string;
}

const TABS = [
  { key: 'upcoming',   label: 'Upcoming',    icon: CalendarDays },
  { key: 'past',       label: 'Attended',    icon: History },
  { key: 'evaluation', label: 'Rate Session', icon: Star },
  { key: 'cancelled',  label: 'Cancelled',   icon: X },
] as const;

type TabKey = typeof TABS[number]['key'];

const ROLE_LABEL: Record<string, string> = {
  COUNSELOR:    'Counselor',
  PSYCHOLOGIST: 'Psychologist',
  IC:           'Intake Counselor',
  CASE_MANAGER: 'Case Manager',
};

const TAB_STATUSES: Record<TabKey, string[]> = {
  upcoming:   ['REQUESTED', 'PENDING_APPROVAL', 'CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN', 'RESCHEDULE_REQUESTED', 'PENDING_STUDENT_APPROVAL'],
  evaluation: ['EVALUATION'],
  past:       ['COMPLETED', 'FOLLOW_UP', 'REFERRAL'],
  cancelled:  ['CANCELLED', 'DENIED', 'NO_SHOW'],
};

type StatusConfig = { label: string; bg: string; text: string; ring: string };

const STATUS_CFG: Record<string, StatusConfig> = {
  REQUESTED:                { label: 'Pending review',     bg: 'var(--color-warning-surface)', text: 'var(--color-warning)',  ring: 'var(--color-warning)' },
  PENDING_APPROVAL:         { label: 'Pending review',     bg: 'var(--color-warning-surface)', text: 'var(--color-warning)',  ring: 'var(--color-warning)' },
  MATCHED:                  { label: 'Pending review',     bg: 'var(--color-warning-surface)', text: 'var(--color-warning)',  ring: 'var(--color-warning)' },
  CONFIRMED:                { label: 'Confirmed',          bg: 'var(--color-success-surface)', text: 'var(--color-success)',  ring: 'var(--color-success)' },
  APPROVED:                 { label: 'Confirmed',          bg: 'var(--color-success-surface)', text: 'var(--color-success)',  ring: 'var(--color-success)' },
  CHECKED_IN:               { label: 'Confirmed',          bg: 'var(--color-success-surface)', text: 'var(--color-success)',  ring: 'var(--color-success)' },
  RESCHEDULE_REQUESTED:     { label: 'Reschedule pending', bg: 'var(--color-primary-surface)', text: 'var(--color-primary)',  ring: 'var(--color-primary)' },
  PENDING_STUDENT_APPROVAL: { label: 'Action required',    bg: 'var(--color-primary-surface)', text: 'var(--color-primary)',  ring: 'var(--color-primary)' },
  EVALUATION:               { label: 'Rate your session',  bg: 'var(--color-warning-surface)', text: 'var(--color-warning)',  ring: 'var(--color-warning)' },
  FOLLOW_UP:                { label: 'Attended',           bg: 'var(--color-bg)',              text: 'var(--color-text-muted)', ring: 'var(--color-border)' },
  REFERRAL:                 { label: 'Attended',           bg: 'var(--color-bg)',              text: 'var(--color-text-muted)', ring: 'var(--color-border)' },
  COMPLETED:                { label: 'Attended',           bg: 'var(--color-bg)',              text: 'var(--color-text-muted)', ring: 'var(--color-border)' },
  CANCELLED:                { label: 'Cancelled',          bg: 'var(--color-danger-surface)',  text: 'var(--color-danger)',   ring: 'var(--color-danger)' },
  DENIED:                   { label: 'Cancelled',          bg: 'var(--color-danger-surface)',  text: 'var(--color-danger)',   ring: 'var(--color-danger)' },
  NO_SHOW:                  { label: 'Missed',             bg: 'var(--color-danger-surface)',  text: 'var(--color-danger)',   ring: 'var(--color-danger)' },
};

const INACTIVE = new Set(['CANCELLED', 'DENIED', 'COMPLETED', 'NO_SHOW']);

const PURPOSE_LABEL: Record<string, string> = {
  intake_interview:       'Initial Consultation',
  INTAKE_INTERVIEW:       'Initial Consultation',
  follow_up:              'Counseling Session',
  FOLLOW_UP:              'Counseling Session',
  follow_up_counselling:  'Counseling Session',
  FOLLOW_UP_COUNSELLING:  'Counseling Session',
  counseling:             'Counseling Session',
  COUNSELING:             'Counseling Session',
  others:                 'General Session',
  OTHERS:                 'General Session',
};

const EVAL_QUESTIONS = [
  { key: 'counselor_attitude',    label: 'Counselor Attitude' },
  { key: 'online_communication',  label: 'Accessibility of Communication' },
  { key: 'counseling_objectives', label: 'Accomplishment of Counseling Objectives' },
  { key: 'techniques_used',       label: 'Appropriateness of Techniques Used' },
  { key: 'overall_experience',    label: 'Overall Counseling Experience' },
];

function fmtDateTime(dt?: string) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true });
}
function fmtPurpose(p?: string) {
  if (!p) return '—';
  return p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function fmtPlatform(m?: string, platform?: string) {
  const effective = (m === 'online' && platform) ? platform : m;
  if (!effective) return '—';
  if (effective === 'in-person' || effective === 'in_person') return 'Face to Face';
  if (effective === 'google-meet' || effective === 'google_meet') return 'Google Meet';
  if (effective === 'zoom') return 'Zoom';
  if (effective === 'online') return 'Online';
  return effective.charAt(0).toUpperCase() + effective.slice(1);
}
function isUpcoming(dt?: string) { return dt ? new Date(dt) > new Date() : false; }
function isSameDay(dt?: string) {
  if (!dt) return false;
  const d = new Date(dt);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}


function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className="text-xl transition-colors"
          style={{ color: n <= value ? '#F59E0B' : 'var(--color-border)' }}
          onMouseEnter={e => { if (n > value) e.currentTarget.style.color = '#FCD34D'; }}
          onMouseLeave={e => { if (n > value) e.currentTarget.style.color = 'var(--color-border)'; }}>
          ★
        </button>
      ))}
    </div>
  );
}

export default function MyAppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState<TabKey>('upcoming');
  const [seenTabs, setSeenTabs]         = useState<Set<TabKey>>(() => {
    try {
      const stored = sessionStorage.getItem('appt_seen_tabs');
      const valid = new Set<TabKey>(['upcoming', 'evaluation', 'past', 'cancelled']);
      const parsed: TabKey[] = stored ? JSON.parse(stored).filter((k: string) => valid.has(k as TabKey)) : [];
      return parsed.length ? new Set(parsed) : new Set<TabKey>(['upcoming']);
    } catch { return new Set<TabKey>(['upcoming']); }
  });
  const [error, setError]               = useState<string | null>(null);

  const [cancelTarget, setCancelTarget]   = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason]   = useState('');
  const [cancelling, setCancelling]       = useState(false);
  const [cancelError, setCancelError]     = useState('');

  const [reschedTarget, setReschedTarget] = useState<Appointment | null>(null);
  const [reschedDate, setReschedDate]     = useState('');
  const [reschedTime, setReschedTime]     = useState('');
  const [reschedReason, setReschedReason] = useState('');
  const [rescheduling, setRescheduling]   = useState(false);
  const [reschedError, setReschedError]   = useState('');
  const [respondingId, setRespondingId]   = useState<string | null>(null);
  const [rescheduleSlots, setRescheduleSlots]               = useState<{ time: string }[]>([]);
  const [rescheduleLoadingSlots, setRescheduleLoadingSlots] = useState(false);
  const [rescheduleNextDate, setRescheduleNextDate]         = useState<string | null>(null);

  const [detailAppt, setDetailAppt]           = useState<Appointment | null>(null);
  const [formsStatus, setFormsStatus]         = useState<Record<string, boolean>>({});
  const [viewFormsPacket, setViewFormsPacket] = useState<any>(null);
  const [viewFormsLoading, setViewFormsLoading] = useState(false);

  const [evalTarget, setEvalTarget]       = useState<Appointment | null>(null);
  const [evalRatings, setEvalRatings]     = useState<Record<string, number>>({});
  const [evalLiked, setEvalLiked]         = useState('');
  const [evalImprove, setEvalImprove]     = useState('');
  const [submittingEval, setSubmittingEval] = useState(false);
  const [evalError, setEvalError]         = useState('');
  const [evalSuccess, setEvalSuccess]     = useState(false);


  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api('/api/appointments/my-appointments'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 401 || r.status === 404) { router.replace('/login'); return; }
      if (r.ok) {
        const d = await r.json();
        const apts: Appointment[] = d.appointments || [];
        setAppointments(apts);
        const intakeApts = apts.filter(a => a.purpose === 'intake_interview' && ['REQUESTED','PENDING_APPROVAL','CONFIRMED','APPROVED','MATCHED'].includes(a.status));
        if (intakeApts.length > 0) {
          const statuses: Record<string, boolean> = {};
          await Promise.all(intakeApts.map(async a => {
            const id = a.appointment_id || a._id;
            try {
              const pr = await fetch(api(`/api/intake/packet/${id}`), { headers: { Authorization: `Bearer ${token}` } });
              const data = pr.ok ? await pr.json() : null;
              statuses[id] = data?.submitted === true;
            } catch { statuses[id] = false; }
          }));
          setFormsStatus(statuses);
        }
      } else setError('Failed to load appointments.');
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!reschedDate) { setRescheduleSlots([]); setRescheduleNextDate(null); return; }
    setRescheduleLoadingSlots(true); setReschedTime(''); setRescheduleSlots([]); setRescheduleNextDate(null);
    const token = localStorage.getItem('token');
    const cid = (reschedTarget as any)?.counselor_id;
    const url = cid
      ? `/api/appointments/counselor-slots?counselor_id=${cid}&date=${reschedDate}`
      : `/api/availability/open-slots?date=${reschedDate}`;
    fetch(api(url), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        const raw: any[] = d.slots || [];
        setRescheduleSlots(raw.map(s => typeof s === 'string' ? { time: s } : { time: s.time ?? s }));
        setRescheduleNextDate(d.next_available_date || null);
      })
      .catch(() => setRescheduleSlots([]))
      .finally(() => setRescheduleLoadingSlots(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reschedDate, reschedTarget]);

  const EVAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  const needsEvaluation = (a: Appointment) => {
    if (a.evaluation) return false;
    const sessionDate = a.scheduled_start || a.requested_start;
    const tooOld = sessionDate && Date.now() - new Date(sessionDate).getTime() > EVAL_WINDOW_MS;
    if (tooOld) return false;
    return a.status === 'EVALUATION' || a.status === 'COMPLETED';
  };

  const filtered = activeTab === 'evaluation'
    ? appointments.filter(needsEvaluation)
    : appointments.filter(a => TAB_STATUSES[activeTab].includes(a.status));

  const counts = Object.fromEntries(
    TABS.map(t => [
      t.key,
      t.key === 'evaluation' ? appointments.filter(needsEvaluation).length :
                               appointments.filter(a => TAB_STATUSES[t.key as TabKey].includes(a.status)).length,
    ])
  ) as Record<TabKey, number>;

  const openViewForms = async (appt: Appointment) => {
    const id = appt.appointment_id || appt._id;
    const token = localStorage.getItem('token');
    setViewFormsLoading(true); setViewFormsPacket(null);
    try {
      const r = await fetch(api(`/api/intake/packet/${id}`), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setViewFormsPacket(await r.json());
    } finally { setViewFormsLoading(false); }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true); setCancelError('');
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/appointments/${cancelTarget._id}/cancel`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });
      if (r.ok) {
        setAppointments(prev => prev.map(a => a._id === cancelTarget._id ? { ...a, status: 'CANCELLED' } : a));
        setCancelTarget(null); setCancelReason('');
      } else { const d = await r.json(); setCancelError(d.error || 'Failed to cancel.'); }
    } catch { setCancelError('Network error.'); }
    finally { setCancelling(false); }
  };

  const handleReschedule = async () => {
    if (!reschedTarget || !reschedDate || !reschedTime) { setReschedError('Please select a date and time.'); return; }
    setRescheduling(true); setReschedError('');
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/appointments/${reschedTarget._id}/reschedule`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requested_start: `${reschedDate}T${reschedTime}:00`, reason: reschedReason }),
      });
      if (r.ok) {
        setAppointments(prev => prev.map(a => a._id === reschedTarget._id ? { ...a, status: 'RESCHEDULE_REQUESTED' } : a));
        setReschedTarget(null); setReschedDate(''); setReschedTime(''); setReschedReason('');
      } else { const d = await r.json(); setReschedError(d.error || 'Failed to request reschedule.'); }
    } catch { setReschedError('Network error.'); }
    finally { setRescheduling(false); }
  };

  const handleRespondReschedule = async (appt: Appointment, action: 'approve' | 'deny') => {
    setRespondingId(appt._id + action);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/appointments/reschedule-requests/${appt._id}/${action}`), {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        if (action === 'approve') {
          setAppointments(prev => prev.map(a => a._id === appt._id
            ? { ...a, status: 'CONFIRMED', scheduled_start: a.reschedule_requested_start, reschedule_requested_start: undefined, reschedule_requested_by_role: undefined, reschedule_reason: undefined }
            : a));
        } else {
          setAppointments(prev => prev.map(a => a._id === appt._id
            ? { ...a, status: 'CONFIRMED', reschedule_requested_start: undefined, reschedule_requested_by_role: undefined, reschedule_reason: undefined }
            : a));
        }
      }
    } catch { }
    finally { setRespondingId(null); }
  };

  const handleConfirmSchedule = async (appt: Appointment) => {
    setRespondingId(appt._id + 'confirm');
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/appointments/${appt._id}/confirm-schedule`), {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setAppointments(prev => prev.map(a => a._id === appt._id ? { ...a, status: 'CONFIRMED' } : a));
    } catch { }
    finally { setRespondingId(null); }
  };

  const handleEvalSubmit = async () => {
    if (!evalTarget) return;
    const missing = EVAL_QUESTIONS.find(q => !evalRatings[q.key]);
    if (missing) { setEvalError('Please rate all questions before submitting.'); return; }
    setSubmittingEval(true); setEvalError('');
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/appointments/${evalTarget._id}/submit-evaluation`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ratings: evalRatings, liked_most: evalLiked, to_improve: evalImprove }),
      });
      if (r.ok) {
        setEvalSuccess(true);
        setAppointments(prev => prev.map(a => a._id === evalTarget._id ? { ...a, status: 'COMPLETED', evaluation: { submitted: true } } : a));
        setTimeout(() => { setEvalTarget(null); setEvalSuccess(false); setEvalRatings({}); setEvalLiked(''); setEvalImprove(''); }, 1500);
      } else { const d = await r.json(); setEvalError(d.error || 'Failed to submit evaluation.'); }
    } catch { setEvalError('Network error.'); }
    finally { setSubmittingEval(false); }
  };

  return (
    <DashboardPageWrapper title="My Appointments" subtitle="View and manage your counseling sessions">

      {/* Page header */}
      <div className="flex items-center justify-end mb-5">
        <Link href="/book-appointment">
          <button className="flex items-center gap-1.5 px-4 py-2 text-white text-sm font-semibold rounded-xl transition-all hover:opacity-90 shadow-sm"
            style={{ background: 'var(--color-primary)' }}>
            <Plus size={14} /> Book a Session
          </button>
        </Link>
      </div>

      {/* Evaluation reminder banner */}
      {(() => {
        const pendingEval = appointments.filter(needsEvaluation).length;
        return pendingEval > 0 ? (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4 text-sm" style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' }}>
            <Star size={16} className="flex-shrink-0" style={{ color: 'var(--color-warning)' }} />
            <span className="font-medium" style={{ color: 'var(--color-warning)' }}>
              You have {pendingEval} session{pendingEval > 1 ? 's' : ''} ready to rate. Share your feedback!
            </span>
            <button onClick={() => setActiveTab('evaluation')}
              className="ml-auto text-xs font-semibold underline underline-offset-2" style={{ color: 'var(--color-warning)' }}>
              Rate now
            </button>
          </div>
        ) : null;
      })()}

      {/* Pending intake forms banner */}
      {Object.values(formsStatus).some(v => !v) && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4 text-sm" style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' }}>
          <FileText size={16} className="flex-shrink-0" style={{ color: 'var(--color-warning)' }} />
          <span className="font-medium" style={{ color: 'var(--color-warning)' }}>Your Initial Consultation has incomplete required forms — please fill them out before your session.</span>
          <button onClick={() => setActiveTab('upcoming')}
            className="ml-auto text-xs font-semibold underline underline-offset-2" style={{ color: 'var(--color-warning)' }}>
            View appointment
          </button>
        </div>
      )}

      {/* No-show policy notice */}
      {(() => {
        const noShowCount = appointments.filter(a => a.status === 'NO_SHOW').length;
        if (noShowCount === 0) return null;
        if (noShowCount === 1) return (
          <div className="flex items-start gap-3 rounded-xl px-4 py-3 mb-4 text-sm" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary)' }}>
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }} />
            <p style={{ color: 'var(--color-primary)' }}>Missed a session? Things happen — your counselor will reach out to reschedule.</p>
          </div>
        );
        return (
          <div className="flex items-start gap-3 rounded-xl px-4 py-3 mb-4 text-sm" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
            <div>
              <p className="font-medium" style={{ color: 'var(--color-danger)' }}>
                You have {noShowCount} missed session{noShowCount > 1 ? 's' : ''} on record.
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-danger)' }}>
                Per clinic policy, 3 consecutive missed sessions may result in automatic case closure.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Tab bar + card */}
      <div className="rounded-2xl border shadow-card overflow-hidden animate-fade-up" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

        {/* Tabs */}
        <div className="flex items-end overflow-x-auto px-2 pt-2 gap-0.5 scrollbar-hide" style={{ borderBottom: '1px solid var(--color-border)' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const cnt = counts[tab.key];
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => {
                setActiveTab(tab.key);
                setSeenTabs(prev => {
                  const next = new Set([...prev, tab.key]);
                  try { sessionStorage.setItem('appt_seen_tabs', JSON.stringify([...next])); } catch {}
                  return next;
                });
              }}
                className="flex flex-col items-center gap-1 px-4 py-3 text-sm font-medium rounded-t-xl transition-all whitespace-nowrap relative flex-shrink-0"
                style={isActive
                  ? { color: 'var(--color-primary)', borderBottom: `2px solid var(--color-primary)`, background: 'var(--color-primary-surface)' }
                  : { color: 'var(--color-text-muted)' }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                <Icon size={18} style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
                <span>{tab.label}</span>
                {cnt > 0 && !seenTabs.has(tab.key) && (
                  <span className="absolute -top-1 -right-0.5 text-xs font-bold min-w-[17px] h-[17px] flex items-center justify-center rounded-full px-0.5 leading-none"
                    style={{ background: 'var(--color-text-primary)', color: 'white' }}>
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Section label */}
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
            {TABS.find(t => t.key === activeTab)?.label ?? 'Sessions'}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-44 gap-2 text-base" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading appointments…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-44 text-sm" style={{ color: 'var(--color-danger)' }}>{error}</div>
        ) : filtered.length === 0 ? (
          activeTab === 'evaluation' ? (
            <div className="flex flex-col items-center justify-center h-52 text-center px-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--color-bg)' }}>
                <Star size={22} style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <p className="text-base font-medium" style={{ color: 'var(--color-text-primary)' }}>No sessions to rate yet.</p>
              <p className="text-sm mt-1 max-w-xs" style={{ color: 'var(--color-text-muted)' }}>After each completed session, you'll be able to rate your experience here.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-52 text-center px-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--color-bg)' }}>
                <Clock size={22} style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <p className="text-base font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {activeTab === 'upcoming' ? 'No sessions yet.' : 'Nothing here.'}
              </p>
              <p className="text-sm mt-1 max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
                {activeTab === 'upcoming'
                  ? 'When you book a session, it will appear here. Everything you share stays private.'
                  : `You have no ${TABS.find(t => t.key === activeTab)?.label.toLowerCase()} sessions.`}
              </p>
              {activeTab === 'upcoming' && (
                <Link href="/book-appointment"
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-white text-sm font-semibold rounded-xl transition hover:opacity-90"
                  style={{ background: 'var(--color-primary)' }}>
                  <Plus size={14} /> Talk to Someone
                </Link>
              )}
            </div>
          )
        ) : (
          <>
            <div className="p-4 space-y-3">
              {filtered.map((appt) => {
                const dt  = appt.scheduled_start || appt.requested_start;
                const isTodayAppt = isSameDay(dt);
                const isWithin24h = dt ? (new Date(dt).getTime() - Date.now() < 24 * 60 * 60 * 1000 && new Date(dt).getTime() > Date.now()) : false;
                const isSlotReserved = appt.status === 'REQUESTED' && !!appt.preferred_time;
                const rawCfg = STATUS_CFG[appt.status] ?? { label: appt.status, bg: 'var(--color-bg)', text: 'var(--color-text-muted)', ring: 'var(--color-border)' };
                const cfg = isSlotReserved
                  ? { label: 'Slot Reserved', bg: 'var(--color-primary-surface)', text: 'var(--color-primary)', ring: 'var(--color-primary)' }
                  : rawCfg;
                const active = !INACTIVE.has(appt.status);
                const upcoming = isUpcoming(dt);
                const canJoin = ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN'].includes(appt.status) && upcoming && appt.meeting_link;
                const needsEval = activeTab === 'evaluation' && needsEvaluation(appt);
                const purposeLabel = PURPOSE_LABEL[appt.purpose || ''] || fmtPurpose(appt.purpose);
                const counselorProposedResched = appt.status === 'RESCHEDULE_REQUESTED' && appt.reschedule_requested_by_role && appt.reschedule_requested_by_role !== 'STUDENT';
                const awaitingConfirmation = appt.status === 'PENDING_STUDENT_APPROVAL';

                return (
                  <div key={appt._id}
                    className="rounded-2xl border p-4 transition-all"
                    style={{
                      background: needsEval ? 'var(--color-warning-surface)' : awaitingConfirmation ? 'var(--color-primary-surface)' : 'var(--color-surface)',
                      borderColor: needsEval ? 'var(--color-warning)' : awaitingConfirmation ? 'var(--color-primary)' : 'var(--color-border)',
                    }}>
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full font-semibold border"
                            style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.ring }}>
                            {cfg.label}
                          </span>
                          {isSlotReserved && (
                            <span className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>Awaiting IC confirmation</span>
                          )}
                          {counselorProposedResched && (
                            <span className="text-xs font-medium" style={{ color: 'var(--color-warning)' }}>Your counselor proposed a new time</span>
                          )}
                          {awaitingConfirmation && (
                            <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>Action required</span>
                          )}
                        </div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{purposeLabel}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs flex-wrap" style={{ color: 'var(--color-text-muted)' }}>
                          {dt && (
                            <span className="flex items-center gap-1">
                              <CalendarDays size={11} />{fmtDateTime(dt)}
                            </span>
                          )}
                          {fmtPlatform(appt.preferred_method, appt.preferred_platform) !== '—' && (
                            <span>{fmtPlatform(appt.preferred_method, appt.preferred_platform)}</span>
                          )}
                        </div>
                        {appt.counselor_name ? (
                          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            With <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{appt.counselor_name}</span>
                            {appt.counselor_role && ROLE_LABEL[appt.counselor_role] && (
                              <span className="ml-1" style={{ color: 'var(--color-text-muted)' }}>· {ROLE_LABEL[appt.counselor_role]}</span>
                            )}
                          </p>
                        ) : !['REQUESTED', 'PENDING_APPROVAL'].includes(appt.status) ? (
                          <p className="mt-1 text-xs italic" style={{ color: 'var(--color-text-muted)' }}>Counselor not yet assigned — we'll notify you soon</p>
                        ) : null}
                        {appt.office && (
                          <p className="mt-0.5 text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                            <MapPin size={10} /> {appt.office}
                          </p>
                        )}

                        {/* Status timeline */}
                        {['REQUESTED','PENDING_APPROVAL','MATCHED','CONFIRMED','APPROVED','CHECKED_IN','EVALUATION'].includes(appt.status) && (() => {
                          const step2 = ['CONFIRMED','APPROVED','CHECKED_IN','EVALUATION'].includes(appt.status);
                          const step3 = appt.status === 'EVALUATION';
                          const steps = [
                            { label: 'Requested', done: true },
                            { label: 'Confirmed',  done: step2 },
                            { label: 'Session',    done: step3 },
                          ];
                          return (
                            <div className="flex items-center mt-3 mb-1">
                              {steps.map((s, i) => (
                                <div key={s.label} className="flex items-center" style={{ flex: i < steps.length - 1 ? '1' : 'none' }}>
                                  <div className="flex flex-col items-center">
                                    <div className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                                      style={{ background: s.done ? 'var(--color-success)' : 'var(--color-border)', color: s.done ? 'white' : 'var(--color-text-muted)' }}>
                                      {s.done ? '✓' : i + 1}
                                    </div>
                                    <span className="text-xs mt-0.5 whitespace-nowrap" style={{ color: s.done ? 'var(--color-success)' : 'var(--color-text-muted)' }}>{s.label}</span>
                                  </div>
                                  {i < steps.length - 1 && (
                                    <div className="flex-1 h-px mx-1 mb-3" style={{ background: steps[i + 1].done ? 'var(--color-success)' : 'var(--color-border)' }} />
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })()}

                        {appt.status === 'RESCHEDULE_REQUESTED' && appt.reschedule_requested_start && (
                          <p className="mt-1 text-xs" style={{ color: 'var(--color-primary)' }}>Proposed new time: {fmtDateTime(appt.reschedule_requested_start)}</p>
                        )}

                        {/* QR check-in hint for confirmed in-person sessions */}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {canJoin && (
                          <a href={appt.meeting_link} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-xl transition hover:opacity-90"
                            style={{ background: 'var(--color-primary)' }}>
                            <Video size={12} /> Join Session
                          </a>
                        )}
                        {needsEval && (
                          <button
                            onClick={() => { setEvalTarget(appt); setEvalRatings({}); setEvalLiked(''); setEvalImprove(''); setEvalError(''); setEvalSuccess(false); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-semibold transition hover:opacity-90"
                            style={{ background: '#F59E0B' }}>
                            <Star size={12} /> Rate Session
                          </button>
                        )}
                        {appt.purpose === 'intake_interview' && formsStatus[appt.appointment_id || appt._id] === false && (
                          <Link href={`/book-appointment?resumeId=${appt.appointment_id || appt._id}`}>
                            <button className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl transition border hover:opacity-90"
                              style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}>
                              <FileText size={11} /> Complete Forms
                            </button>
                          </Link>
                        )}
                        {appt.purpose === 'intake_interview' && formsStatus[appt.appointment_id || appt._id] === true && (
                          <button onClick={() => openViewForms(appt)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl transition border hover:opacity-90"
                            style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)', borderColor: 'var(--color-success)' }}>
                            <Eye size={11} /> View Forms
                          </button>
                        )}
                        {awaitingConfirmation && (
                          <div className="flex flex-col gap-1.5 mt-1">
                            <p className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
                              Your counselor has proposed a schedule.
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleConfirmSchedule(appt)}
                                disabled={respondingId === appt._id + 'confirm'}
                                className="flex items-center gap-1 px-3 py-1.5 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50 hover:opacity-90"
                                style={{ background: 'var(--color-primary)' }}>
                                {respondingId === appt._id + 'confirm' ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                                Accept Schedule
                              </button>
                              <button
                                onClick={() => { setReschedTarget(appt); setReschedDate(''); setReschedTime(''); setReschedReason(''); setReschedError(''); }}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl transition border"
                                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
                                <RotateCcw size={11} /> Different Time
                              </button>
                            </div>
                          </div>
                        )}

                        {counselorProposedResched && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleRespondReschedule(appt, 'approve')}
                              disabled={!!respondingId}
                              className="flex items-center gap-1 px-2 py-1 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 hover:opacity-90"
                              style={{ background: 'var(--color-success)' }}>
                              {respondingId === appt._id + 'approve' ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                              Accept
                            </button>
                            <button
                              onClick={() => handleRespondReschedule(appt, 'deny')}
                              disabled={!!respondingId}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg transition disabled:opacity-50 border"
                              style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
                              {respondingId === appt._id + 'deny' ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                              Decline
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <button onClick={() => setDetailAppt(appt)} title="Details"
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--color-text-muted)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                            <Eye size={14} />
                          </button>
                          {active && !needsEval && !awaitingConfirmation && !['RESCHEDULE_REQUESTED', 'REQUESTED', 'PENDING_APPROVAL', 'MATCHED'].includes(appt.status) && (
                            <button
                              onClick={() => { setReschedTarget(appt); setReschedDate(''); setReschedTime(''); setReschedReason(''); setReschedError(''); }}
                              title="Request reschedule"
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: 'var(--color-text-muted)' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-surface)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                              <RotateCcw size={14} />
                            </button>
                          )}
                          {active && !needsEval && !awaitingConfirmation && (
                            (isTodayAppt || isWithin24h) ? (
                              <div className="relative group">
                                <button disabled className="p-1.5 rounded-lg cursor-not-allowed" style={{ color: 'var(--color-border)' }}>
                                  <X size={14} />
                                </button>
                                <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block z-10 w-56 text-white text-xs rounded-xl px-2.5 py-2 shadow-lg pointer-events-none"
                                  style={{ background: 'var(--color-text-primary)' }}>
                                  Cancellations within 24 hours must be done by calling CPS directly.
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setCancelTarget(appt); setCancelReason(''); setCancelError(''); }}
                                title="Cancel appointment"
                                className="p-1.5 rounded-lg transition-colors"
                                style={{ color: 'var(--color-text-muted)' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-danger-surface)'; e.currentTarget.style.color = 'var(--color-danger)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                                <X size={14} />
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)' }}>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Showing {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {detailAppt && (() => {
        const cfg = STATUS_CFG[detailAppt.status] ?? { label: detailAppt.status, bg: 'var(--color-bg)', text: 'var(--color-text-muted)', ring: 'var(--color-border)' };
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in" style={{ background: 'var(--color-surface)' }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Session Details</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Ref: {detailAppt.counseling_id || detailAppt._id.slice(-6).toUpperCase()}</p>
                </div>
                <button onClick={() => setDetailAppt(null)} className="p-1.5 rounded-lg transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <X size={14} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              </div>
              <div className="p-6 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Session Type', PURPOSE_LABEL[detailAppt.purpose || ''] || fmtPurpose(detailAppt.purpose)],
                    ['Mode', fmtPlatform(detailAppt.preferred_method, detailAppt.preferred_platform)],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl p-3" style={{ background: 'var(--color-bg)' }}>
                      <p className="text-xs font-semibold tracking-wide uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>{k}</p>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{v}</p>
                    </div>
                  ))}
                </div>
                {[
                  ['Date & Time', fmtDateTime(detailAppt.scheduled_start || detailAppt.requested_start)],
                  ['Assigned Counselor', detailAppt.counselor_name
                    ? `${detailAppt.counselor_name}${detailAppt.counselor_role && ROLE_LABEL[detailAppt.counselor_role] ? ` · ${ROLE_LABEL[detailAppt.counselor_role]}` : ''}`
                    : 'Not yet assigned'],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl p-3" style={{ background: 'var(--color-bg)' }}>
                    <p className="text-xs font-semibold tracking-wide uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>{k}</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{v}</p>
                  </div>
                ))}
                <div className="rounded-xl p-3" style={{ background: 'var(--color-bg)' }}>
                  <p className="text-xs font-semibold tracking-wide uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>Status</p>
                  <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-semibold border"
                    style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.ring }}>{cfg.label}</span>
                </div>
                {detailAppt.concern && (
                  <div className="rounded-xl p-3" style={{ background: 'var(--color-bg)' }}>
                    <p className="text-xs font-semibold tracking-wide uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>Concern</p>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{detailAppt.concern}</p>
                  </div>
                )}
                {detailAppt.office && (
                  <div className="rounded-xl border p-3 flex items-start gap-2" style={{ background: 'var(--color-warning-surface)', borderColor: 'var(--color-warning)' }}>
                    <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--color-warning)' }} />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-warning)' }}>Office / Room</p>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{detailAppt.office}</p>
                    </div>
                  </div>
                )}
                {detailAppt.meeting_link && (
                  <a href={detailAppt.meeting_link} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition border hover:opacity-90"
                    style={{ background: 'var(--color-success-surface)', borderColor: 'var(--color-success)', color: 'var(--color-success)' }}>
                    <Video size={14} /> Join Session
                  </a>
                )}
              </div>
              <div className="px-6 py-4 flex justify-end" style={{ borderTop: '1px solid var(--color-border)' }}>
                <button onClick={() => setDetailAppt(null)}
                  className="px-4 py-2 text-sm rounded-xl transition-colors border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Evaluation Modal */}
      {evalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto animate-scale-in" style={{ background: 'var(--color-surface)' }}>
            <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Evaluation Survey</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Please rate your counseling session experience</p>
              </div>
              <button onClick={() => setEvalTarget(null)} className="p-1.5 rounded-lg transition-colors"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X size={14} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>

            {evalSuccess ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--color-success-surface)' }}>
                  <CheckCircle size={28} style={{ color: 'var(--color-success)' }} />
                </div>
                <p className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Thank you for your feedback!</p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Your evaluation has been submitted.</p>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between text-xs px-1" style={{ color: 'var(--color-text-muted)' }}>
                  <span>1 – Not satisfied at all</span>
                  <span>5 – Extremely Satisfied</span>
                </div>

                {EVAL_QUESTIONS.map((q, i) => (
                  <div key={q.key} className="flex items-center justify-between gap-4 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <p className="text-sm flex-1" style={{ color: 'var(--color-text-secondary)' }}>{q.label}</p>
                    <StarRating value={evalRatings[q.key] || 0} onChange={v => setEvalRatings(prev => ({ ...prev, [q.key]: v }))} />
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    What did you like most about your experience?
                  </label>
                  <textarea value={evalLiked} onChange={e => setEvalLiked(e.target.value)}
                    rows={2} placeholder="Your answer..."
                    className="w-full px-3 py-2 text-sm rounded-xl outline-none transition-all resize-none"
                    style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                    onFocus={e => { e.target.style.borderColor = '#F59E0B'; e.target.style.boxShadow = '0 0 0 3px #FEF3C7'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    What do you want to improve in the counseling sessions?
                  </label>
                  <textarea value={evalImprove} onChange={e => setEvalImprove(e.target.value)}
                    rows={2} placeholder="Your answer..."
                    className="w-full px-3 py-2 text-sm rounded-xl outline-none transition-all resize-none"
                    style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                    onFocus={e => { e.target.style.borderColor = '#F59E0B'; e.target.style.boxShadow = '0 0 0 3px #FEF3C7'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>

                {evalError && (
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
                    <AlertCircle size={13} /> {evalError}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEvalTarget(null)}
                    className="flex-1 px-4 py-2 text-sm rounded-xl transition-colors border"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    Cancel
                  </button>
                  <button onClick={handleEvalSubmit} disabled={submittingEval}
                    className="flex-1 px-4 py-2 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90"
                    style={{ background: '#F59E0B' }}>
                    {submittingEval && <Loader2 size={13} className="animate-spin" />}
                    Submit Evaluation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in" style={{ background: 'var(--color-surface)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Cancel this session?</h3>
              <button onClick={() => setCancelTarget(null)} className="p-1.5 rounded-lg transition-colors"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X size={14} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>Your spot will be released. If things change, you can always book another session — we're here whenever you're ready.</p>
              <div>
                <label className="text-sm font-semibold block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Reason for cancelling <span className="font-normal">(optional)</span></label>
                <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                  placeholder="Let us know if there's anything we can do differently."
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none transition-all resize-none"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--color-danger)'; e.target.style.boxShadow = '0 0 0 3px var(--color-danger-surface)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              {cancelError && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{cancelError}</p>}
              <div className="flex gap-2">
                <button onClick={() => setCancelTarget(null)}
                  className="flex-1 px-4 py-2 text-sm font-semibold rounded-xl transition-colors border"
                  style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-surface)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  Keep my session
                </button>
                <button onClick={handleCancel} disabled={cancelling}
                  className="flex-1 px-4 py-2 text-sm rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90"
                  style={{ border: '1px solid var(--color-danger)', color: 'var(--color-danger)', background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-danger-surface)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  {cancelling && <Loader2 size={13} className="animate-spin" />}
                  Yes, cancel it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {reschedTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in" style={{ background: 'var(--color-surface)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Request Reschedule</h3>
              <button onClick={() => setReschedTarget(null)} className="p-1.5 rounded-lg transition-colors"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X size={14} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold tracking-wide uppercase block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>New Preferred Date</label>
                <input type="date" value={reschedDate} onChange={e => setReschedDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none transition-all"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px var(--color-primary-surface)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold tracking-wide uppercase block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>New Preferred Time</label>
                {!reschedDate ? (
                  <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>Select a date to see available slots.</p>
                ) : rescheduleLoadingSlots ? (
                  <div className="flex items-center gap-2 text-xs py-2" style={{ color: 'var(--color-text-muted)' }}>
                    <Loader2 size={13} className="animate-spin" /> Checking availability…
                  </div>
                ) : rescheduleSlots.length === 0 ? (
                  <div className="text-xs py-1" style={{ color: 'var(--color-text-secondary)' }}>
                    No slots available on this date.
                    {rescheduleNextDate && (
                      <span className="ml-1 font-medium" style={{ color: 'var(--color-primary)' }}>
                        Next available: <button type="button" onClick={() => setReschedDate(rescheduleNextDate)} className="underline underline-offset-2">{rescheduleNextDate}</button>
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {rescheduleSlots.map((s, i) => {
                      const selected = reschedTime === s.time;
                      return (
                        <button key={i} type="button" onClick={() => setReschedTime(s.time)}
                          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all"
                          style={{
                            border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            background: selected ? 'var(--color-primary-surface)' : 'var(--color-surface)',
                            color: selected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                          }}>
                          <Clock size={13} style={{ color: selected ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
                          <span className="font-bold tabular-nums">{fmtTime(s.time)}</span>
                          {selected && <span className="ml-auto text-xs font-bold">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold tracking-wide uppercase block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Reason <span className="font-normal normal-case" style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
                </label>
                <textarea value={reschedReason} onChange={e => setReschedReason(e.target.value)}
                  placeholder="Why do you need to reschedule?"
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none transition-all resize-none"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px var(--color-primary-surface)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              {reschedError && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{reschedError}</p>}
              <div className="flex gap-2">
                <button onClick={() => setReschedTarget(null)}
                  className="flex-1 px-4 py-2 text-sm rounded-xl transition-colors border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  Go Back
                </button>
                <button onClick={handleReschedule} disabled={rescheduling}
                  className="flex-1 px-4 py-2 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90"
                  style={{ background: 'var(--color-primary)' }}>
                  {rescheduling && <Loader2 size={13} className="animate-spin" />}
                  Request New Time
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Forms modal */}
      {(viewFormsPacket || viewFormsLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] animate-scale-in" style={{ background: 'var(--color-surface)' }}>
            <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>Submitted Intake Forms</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Read-only — submitted before your session</p>
              </div>
              <button onClick={() => setViewFormsPacket(null)} className="text-xl leading-none transition-colors" style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>×</button>
            </div>

            {viewFormsLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6 text-sm">
                {viewFormsPacket?.icf && (
                  <div>
                    <p className="font-bold text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--color-primary)' }}>Intake Consultation Form (ICF)</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {[
                        ['First Name', viewFormsPacket.icf.first_name], ['Last Name', viewFormsPacket.icf.last_name],
                        ['Email', viewFormsPacket.icf.email], ['Student ID', viewFormsPacket.icf.student_id],
                        ['Phone', viewFormsPacket.icf.phone], ['College', viewFormsPacket.icf.college],
                        ['Program', viewFormsPacket.icf.program],
                        ['Referral', viewFormsPacket.icf.referral_source === 'referred' ? `Referred by ${viewFormsPacket.icf.referred_by}` : 'Self-referred'],
                        ['Emergency Contact', viewFormsPacket.icf.emergency_contact_name],
                        ['EC Relationship', viewFormsPacket.icf.emergency_contact_relationship],
                        ['EC Phone', viewFormsPacket.icf.emergency_contact_phone],
                      ].filter(([, v]) => v).map(([label, val]) => (
                        <div key={label as string}>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label as string}</p>
                          <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{val as string}</p>
                        </div>
                      ))}
                    </div>
                    {viewFormsPacket.icf.presenting_concern && (
                      <div className="mt-3">
                        <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Presenting Concern</p>
                        <p className="text-sm rounded-xl px-3 py-2 border" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>{viewFormsPacket.icf.presenting_concern}</p>
                      </div>
                    )}
                  </div>
                )}

                {viewFormsPacket?.spif && (
                  <div>
                    <p className="font-bold text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--color-primary)' }}>Student Profile & Information Form (SPIF)</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {[
                        ['Birthdate', viewFormsPacket.spif.birthdate], ['Gender', viewFormsPacket.spif.gender],
                        ['Religion', viewFormsPacket.spif.religion],
                        ['Nationality', viewFormsPacket.spif.nationality], ['Address', viewFormsPacket.spif.address],
                        ['Living With', viewFormsPacket.spif.living_with], ['Birth Order', viewFormsPacket.spif.birth_order],
                        ['No. of Siblings', viewFormsPacket.spif.number_of_siblings], ['Sleep (hrs/night)', viewFormsPacket.spif.sleep_hours],
                        ['Exercise', viewFormsPacket.spif.exercise_frequency], ['Substance Use', viewFormsPacket.spif.substance_use],
                      ].filter(([, v]) => v !== undefined && v !== '' && v !== null).map(([label, val]) => (
                        <div key={label as string}>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label as string}</p>
                          <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{String(val)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {viewFormsPacket?.phq4_responses?.length === 4 && (
                  <div>
                    <p className="font-bold text-xs uppercase tracking-wide mb-3" style={{ color: '#8B5CF6' }}>Wellness Pre-Screen (PHQ-4)</p>
                    <div className="space-y-2">
                      {[
                        'Little interest or pleasure in doing things',
                        'Feeling down, depressed, or hopeless',
                        'Feeling nervous, anxious, or on edge',
                        'Not being able to stop or control worrying',
                      ].map((question, i) => {
                        const labels = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'];
                        const val = viewFormsPacket.phq4_responses[i];
                        return (
                          <div key={i} className="flex items-start justify-between gap-4 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <p className="text-xs flex-1" style={{ color: 'var(--color-text-secondary)' }}>{question}</p>
                            <span className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--color-text-primary)' }}>{labels[val] ?? '—'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="px-6 pb-5 pt-3 flex-shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
              <button onClick={() => setViewFormsPacket(null)}
                className="w-full py-2.5 text-sm rounded-xl transition-colors border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}


    </DashboardPageWrapper>
  );
}
