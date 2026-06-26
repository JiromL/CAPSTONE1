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
  preferred_time?: string;
  requested_start?: string;
  scheduled_start?: string;
  counselor_name?: string;
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
  { key: 'evaluation', label: 'Rate Session', icon: Star },
  { key: 'past',       label: 'Completed',   icon: History },
  { key: 'cancelled',  label: 'Cancelled',   icon: X },
] as const;

type TabKey = typeof TABS[number]['key'];

const TAB_ACTIVE_CLS: Record<TabKey, string> = {
  upcoming:   'bg-blue-50 text-blue-700 border-b-2 border-blue-500',
  evaluation: 'bg-amber-50 text-amber-700 border-b-2 border-amber-500',
  past:       'bg-green-50 text-[#2563eb] border-b-2 border-[#2563eb]',
  cancelled:  'bg-red-50 text-red-600 border-b-2 border-red-500',
};

const TAB_ICON_CLS: Record<TabKey, string> = {
  upcoming:   'text-blue-600',
  evaluation: 'text-amber-600',
  past:       'text-[#2563eb]',
  cancelled:  'text-red-500',
};

const TAB_STATUSES: Record<TabKey, string[]> = {
  upcoming:   ['REQUESTED', 'PENDING_APPROVAL', 'CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN', 'RESCHEDULE_REQUESTED', 'PENDING_STUDENT_APPROVAL'],
  evaluation: ['EVALUATION'],
  past:       ['COMPLETED', 'FOLLOW_UP', 'REFERRAL'],
  cancelled:  ['CANCELLED', 'DENIED', 'NO_SHOW'],
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  REQUESTED:            { label: 'Pending',            cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  PENDING_APPROVAL:     { label: 'Under Review',       cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  CONFIRMED:            { label: 'Confirmed',          cls: 'bg-green-50 text-blue-700 ring-1 ring-green-200' },
  APPROVED:             { label: 'Confirmed',          cls: 'bg-green-50 text-blue-700 ring-1 ring-green-200' },
  MATCHED:              { label: 'Confirmed',          cls: 'bg-green-50 text-blue-700 ring-1 ring-green-200' },
  CHECKED_IN:           { label: 'Checked In',         cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  RESCHEDULE_REQUESTED:     { label: 'Reschedule Pending',    cls: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  PENDING_STUDENT_APPROVAL: { label: 'Confirm Schedule',       cls: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' },
  EVALUATION:           { label: 'For Evaluation',     cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-300' },
  FOLLOW_UP:            { label: 'Follow-Up',          cls: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' },
  REFERRAL:             { label: 'Referral',           cls: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' },
  COMPLETED:            { label: 'Completed',          cls: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
  CANCELLED:            { label: 'Cancelled',          cls: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
  DENIED:               { label: 'Denied',             cls: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
  NO_SHOW:              { label: 'No Show',            cls: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
};

const INACTIVE = new Set(['CANCELLED', 'DENIED', 'COMPLETED', 'NO_SHOW']);

const PURPOSE_LABEL: Record<string, string> = {
  intake_interview:       'Initial Consultation',
  follow_up:              'Follow-up Session',
  follow_up_counselling:  'Follow-up Session',
  counseling:             'Counseling Session',
  others:                 'General Session',
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
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
function fmtPurpose(p?: string) {
  if (!p) return '—';
  return p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function fmtPlatform(m?: string) {
  if (!m) return '—';
  if (m === 'in-person' || m === 'in_person') return 'Face to Face';
  if (m === 'google-meet' || m === 'google_meet') return 'Google Meet';
  if (m === 'zoom') return 'Zoom';
  return m;
}
function isUpcoming(dt?: string) {
  return dt ? new Date(dt) > new Date() : false;
}
function isSameDay(dt?: string) {
  if (!dt) return false;
  const d = new Date(dt);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}
function padId(id: string) {
  return id.replace(/\D/g, '').slice(-10).padStart(10, '0');
}
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`text-xl transition-colors ${n <= value ? 'text-amber-400' : 'text-gray-200 hover:text-amber-200'}`}>
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
  const [rescheduleSlots, setRescheduleSlots]           = useState<{ time: string; counselor_id: string; counselor_name: string }[]>([]);
  const [rescheduleLoadingSlots, setRescheduleLoadingSlots] = useState(false);
  const [rescheduleNextDate, setRescheduleNextDate]     = useState<string | null>(null);

  const [detailAppt, setDetailAppt]         = useState<Appointment | null>(null);
  const [formsStatus, setFormsStatus]       = useState<Record<string, boolean>>({});
  const [viewFormsPacket, setViewFormsPacket] = useState<any>(null);
  const [viewFormsLoading, setViewFormsLoading] = useState(false);

  // Evaluation modal
  const [evalTarget, setEvalTarget] = useState<Appointment | null>(null);
  const [evalRatings, setEvalRatings] = useState<Record<string, number>>({});
  const [evalLiked, setEvalLiked]   = useState('');
  const [evalImprove, setEvalImprove] = useState('');
  const [submittingEval, setSubmittingEval] = useState(false);
  const [evalError, setEvalError]   = useState('');
  const [evalSuccess, setEvalSuccess] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api('/api/appointments/my-appointments'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 401) { router.replace('/login'); return; }
      if (r.ok) {
        const d = await r.json();
        const apts: Appointment[] = d.appointments || [];
        setAppointments(apts);
        // Check intake packet status for intake_interview appointments
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
    setRescheduleLoadingSlots(true);
    setReschedTime('');
    setRescheduleSlots([]);
    setRescheduleNextDate(null);
    const token = localStorage.getItem('token');
    fetch(api(`/api/availability/open-slots?date=${reschedDate}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        setRescheduleSlots(d.slots || []);
        setRescheduleNextDate(d.next_available_date || null);
      })
      .catch(() => { setRescheduleSlots([]); })
      .finally(() => setRescheduleLoadingSlots(false));
  }, [reschedDate]);

  const needsEvaluation = (a: Appointment) =>
    a.status === 'EVALUATION' || (a.status === 'COMPLETED' && !a.evaluation);

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
      } else {
        const d = await r.json(); setCancelError(d.error || 'Failed to cancel.');
      }
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
      } else {
        const d = await r.json(); setReschedError(d.error || 'Failed to request reschedule.');
      }
    } catch { setReschedError('Network error.'); }
    finally { setRescheduling(false); }
  };

  const handleRespondReschedule = async (appt: Appointment, action: 'approve' | 'deny') => {
    setRespondingId(appt._id + action);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/appointments/reschedule-requests/${appt._id}/${action}`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        if (action === 'approve') {
          // Confirmed with the new proposed time applied
          setAppointments(prev => prev.map(a =>
            a._id === appt._id
              ? { ...a, status: 'CONFIRMED', scheduled_start: a.reschedule_requested_start, reschedule_requested_start: undefined, reschedule_requested_by_role: undefined, reschedule_reason: undefined }
              : a
          ));
        } else {
          // Denied — revert to CONFIRMED with original schedule, clear reschedule fields
          setAppointments(prev => prev.map(a =>
            a._id === appt._id
              ? { ...a, status: 'CONFIRMED', reschedule_requested_start: undefined, reschedule_requested_by_role: undefined, reschedule_reason: undefined }
              : a
          ));
        }
      }
    } catch { /* silent */ }
    finally { setRespondingId(null); }
  };

  const handleConfirmSchedule = async (appt: Appointment) => {
    setRespondingId(appt._id + 'confirm');
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/appointments/${appt._id}/confirm-schedule`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        setAppointments(prev => prev.map(a => a._id === appt._id ? { ...a, status: 'CONFIRMED' } : a));
      }
    } catch { /* silent */ }
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
        body: JSON.stringify({
          ratings: evalRatings,
          liked_most: evalLiked,
          to_improve: evalImprove,
        }),
      });
      if (r.ok) {
        setEvalSuccess(true);
        setAppointments(prev => prev.map(a => a._id === evalTarget._id ? { ...a, status: 'COMPLETED', evaluation: { submitted: true } } : a));
        setTimeout(() => { setEvalTarget(null); setEvalSuccess(false); setEvalRatings({}); setEvalLiked(''); setEvalImprove(''); }, 1500);
      } else {
        const d = await r.json(); setEvalError(d.error || 'Failed to submit evaluation.');
      }
    } catch { setEvalError('Network error.'); }
    finally { setSubmittingEval(false); }
  };

  return (
    <DashboardPageWrapper title="My Appointments" subtitle="View and manage your counseling sessions">

      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">My Counseling Sessions</h2>
          <p className="text-xs text-gray-400 mt-0.5">Track your sessions and take action on pending items</p>
        </div>
        <Link href="/book-appointment">
          <button className="flex items-center gap-1.5 px-4 py-2 bg-[#2563eb] hover:bg-blue-800 text-white text-sm font-medium rounded-lg transition shadow-sm">
            <Plus size={14} /> New Request
          </button>
        </Link>
      </div>

      {/* Evaluation reminder banner */}
      {(() => {
        const pendingEval = appointments.filter(needsEvaluation).length;
        return pendingEval > 0 ? (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm">
            <Star size={16} className="text-amber-500 flex-shrink-0" />
            <span className="text-amber-800 font-medium">
              You have {pendingEval} session{pendingEval > 1 ? 's' : ''} ready to rate. Share your feedback!
            </span>
            <button onClick={() => setActiveTab('evaluation')}
              className="ml-auto text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900">
              Rate now
            </button>
          </div>
        ) : null;
      })()}

      {/* Pending intake forms banner */}
      {Object.values(formsStatus).some(v => !v) && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm">
          <FileText size={16} className="text-amber-500 flex-shrink-0" />
          <span className="text-amber-800 font-medium">Your Initial Consultation has incomplete required forms — please fill them out before your session.</span>
          <button onClick={() => setActiveTab('upcoming')}
            className="ml-auto text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900">
            View appointment
          </button>
        </div>
      )}

      {/* Tab bar + table card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Tabs */}
        <div className="flex items-end overflow-x-auto border-b border-gray-200 px-2 pt-2 gap-0.5 scrollbar-hide">
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
                className={`flex flex-col items-center gap-1 px-4 py-3 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap relative flex-shrink-0 ${
                  isActive ? TAB_ACTIVE_CLS[tab.key] : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}>
                <Icon size={18} className={isActive ? TAB_ICON_CLS[tab.key] : 'text-gray-400'} />
                <span>{tab.label}</span>
                {cnt > 0 && !seenTabs.has(tab.key) && (
                  <span className="absolute -top-1 -right-0.5 text-[10px] font-bold min-w-[17px] h-[17px] flex items-center justify-center rounded-full px-0.5 leading-none bg-gray-700 text-white">
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Section label */}
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            {TABS.find(t => t.key === activeTab)?.label ?? 'Sessions'}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-44 gap-2 text-gray-400 text-base">
            <Loader2 size={18} className="animate-spin" /> Loading appointments…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-44 text-red-500 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Clock size={22} className="text-gray-400" />
            </div>
            <p className="text-base font-medium text-gray-600">No records found</p>
            <p className="text-sm text-gray-400 mt-1">
              {activeTab === 'upcoming'
                ? 'You have no upcoming sessions.'
                : activeTab === 'evaluation'
                ? 'No sessions waiting for your rating.'
                : `No ${TABS.find(t => t.key === activeTab)?.label.toLowerCase()} sessions.`}
            </p>
            {activeTab === 'upcoming' && (
              <Link href="/book-appointment"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563eb] hover:bg-blue-800 text-white text-sm font-semibold rounded-lg transition">
                <Plus size={14} /> Book an Appointment
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="p-4 space-y-3">
              {filtered.map((appt) => {
                const dt  = appt.scheduled_start || appt.requested_start;
                const isTodayAppt = isSameDay(dt);
                const isSlotReserved = appt.status === 'REQUESTED' && !!appt.preferred_time;
                const rawCfg = STATUS_BADGE[appt.status] ?? { label: appt.status, cls: 'bg-gray-100 text-gray-600' };
                const cfg = isSlotReserved
                  ? { label: 'Slot Reserved', cls: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' }
                  : rawCfg;
                const active = !INACTIVE.has(appt.status);
                const upcoming = isUpcoming(dt);
                const canJoin = ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN'].includes(appt.status) && upcoming && appt.meeting_link;
                const needsEval = activeTab === 'evaluation' && needsEvaluation(appt);
                const purposeLabel = PURPOSE_LABEL[appt.purpose || ''] || fmtPurpose(appt.purpose);
                const counselorProposedResched = appt.status === 'RESCHEDULE_REQUESTED' && appt.reschedule_requested_by_role && appt.reschedule_requested_by_role !== 'STUDENT';
                const awaitingConfirmation = appt.status === 'PENDING_STUDENT_APPROVAL';

                return (
                  <div key={appt._id} className={`rounded-xl border p-4 transition-all ${
                    needsEval           ? 'bg-amber-50 border-amber-200'
                    : awaitingConfirmation ? 'bg-sky-50 border-sky-200'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${cfg.cls}`}>
                            {cfg.label}
                          </span>
                          {isSlotReserved && (
                            <span className="text-xs text-sky-600 font-medium">Awaiting IC confirmation</span>
                          )}
                          {counselorProposedResched && (
                            <span className="text-xs text-orange-600 font-medium">Your counselor proposed a new time</span>
                          )}
                          {awaitingConfirmation && (
                            <span className="text-xs text-sky-700 font-semibold">Action required</span>
                          )}
                        </div>
                        <p className="font-semibold text-gray-900 text-sm">{purposeLabel}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                          {dt && (
                            <span className="flex items-center gap-1">
                              <CalendarDays size={11} />{fmtDateTime(dt)}
                            </span>
                          )}
                          <span>{fmtPlatform(appt.preferred_method)}</span>
                        </div>
                        {appt.counselor_name ? (
                          <p className="mt-1 text-xs text-gray-600">With <span className="font-medium text-gray-800">{appt.counselor_name}</span></p>
                        ) : (
                          <p className="mt-1 text-xs text-gray-400 italic">Counselor not yet assigned — we'll notify you soon</p>
                        )}
                        {appt.office && (
                          <p className="mt-0.5 text-xs text-gray-500 flex items-center gap-1"><MapPin size={10} /> {appt.office}</p>
                        )}
                        {appt.status === 'RESCHEDULE_REQUESTED' && appt.reschedule_requested_start && (
                          <p className="mt-1 text-xs text-sky-600">Proposed new time: {fmtDateTime(appt.reschedule_requested_start)}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {canJoin && (
                          <a href={appt.meeting_link} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563eb] hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition">
                            <Video size={12} /> Join Session
                          </a>
                        )}
                        {needsEval && (
                          <button
                            onClick={() => { setEvalTarget(appt); setEvalRatings({}); setEvalLiked(''); setEvalImprove(''); setEvalError(''); setEvalSuccess(false); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition">
                            <Star size={12} /> Rate Session
                          </button>
                        )}
                        {appt.purpose === 'intake_interview' && formsStatus[appt.appointment_id || appt._id] === false && (
                          <Link href={`/book-appointment?resumeId=${appt.appointment_id || appt._id}`}>
                            <button className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition">
                              <FileText size={11} /> Complete Forms
                            </button>
                          </Link>
                        )}
                        {appt.purpose === 'intake_interview' && formsStatus[appt.appointment_id || appt._id] === true && (
                          <button onClick={() => openViewForms(appt)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-green-50 border border-green-200 hover:bg-green-100 rounded-lg transition">
                            <Eye size={11} /> View Forms
                          </button>
                        )}
                        {awaitingConfirmation && (
                          <div className="flex flex-col gap-1.5 mt-1">
                            <p className="text-xs text-sky-700 font-medium">
                              Your counselor has proposed a schedule. Please confirm or request a different time.
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleConfirmSchedule(appt)}
                                disabled={respondingId === appt._id + 'confirm'}
                                className="flex items-center gap-1 px-3 py-1.5 bg-[#2563eb] hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition">
                                {respondingId === appt._id + 'confirm' ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                                Accept Schedule
                              </button>
                              <button
                                onClick={() => { setReschedTarget(appt); setReschedDate(''); setReschedTime(''); setReschedReason(''); setReschedError(''); }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-sky-300 text-sky-700 hover:bg-sky-50 text-xs font-semibold rounded-lg transition">
                                <RotateCcw size={11} /> Request Different Time
                              </button>
                            </div>
                          </div>
                        )}

                        {counselorProposedResched && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleRespondReschedule(appt, 'approve')}
                              disabled={!!respondingId}
                              className="flex items-center gap-1 px-2 py-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-semibold rounded-md transition">
                              {respondingId === appt._id + 'approve' ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                              Accept
                            </button>
                            <button
                              onClick={() => handleRespondReschedule(appt, 'deny')}
                              disabled={!!respondingId}
                              className="flex items-center gap-1 px-2 py-1 bg-red-100 hover:bg-red-200 disabled:opacity-50 text-red-700 text-xs font-semibold rounded-md transition">
                              {respondingId === appt._id + 'deny' ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                              Decline
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <button onClick={() => setDetailAppt(appt)} title="Details"
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
                            <Eye size={14} />
                          </button>
                          {active && !needsEval && !awaitingConfirmation && appt.status !== 'RESCHEDULE_REQUESTED' && (
                            <button
                              onClick={() => { setReschedTarget(appt); setReschedDate(''); setReschedTime(''); setReschedReason(''); setReschedError(''); }}
                              title="Request reschedule"
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition">
                              <RotateCcw size={14} />
                            </button>
                          )}
                          {active && !needsEval && !awaitingConfirmation && (
                            isTodayAppt ? (
                              <div className="relative group">
                                <button disabled
                                  className="p-1.5 rounded-lg text-gray-200 cursor-not-allowed">
                                  <X size={14} />
                                </button>
                                <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block z-10 w-52 bg-gray-900 text-white text-xs rounded-lg px-2.5 py-2 shadow-lg pointer-events-none">
                                  Same-day cancellations must be done in person or by calling CPS directly.
                                  <div className="absolute top-full right-3 border-4 border-transparent border-t-gray-900" />
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setCancelTarget(appt); setCancelReason(''); setCancelError(''); }}
                                title="Cancel appointment"
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
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
            <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100">
              <p className="text-sm text-gray-400">
                Showing {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Detail Modal ─────────────────────────────────────────────── */}
      {detailAppt && (() => {
        const cfg = STATUS_BADGE[detailAppt.status] ?? { label: detailAppt.status, cls: 'bg-gray-100 text-gray-600' };
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">Session Details</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Ref: {detailAppt.counseling_id || detailAppt._id.slice(-6).toUpperCase()}</p>
                </div>
                <button onClick={() => setDetailAppt(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                  <X size={14} className="text-gray-400" />
                </button>
              </div>
              <div className="p-6 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Session Type', PURPOSE_LABEL[detailAppt.purpose || ''] || fmtPurpose(detailAppt.purpose)],
                    ['Mode', fmtPlatform(detailAppt.preferred_method)],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{k}</p>
                      <p className="text-sm text-gray-800 font-medium">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Date &amp; Time</p>
                  <p className="text-sm text-gray-800 font-medium">{fmtDateTime(detailAppt.scheduled_start || detailAppt.requested_start)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Status</p>
                  <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>{cfg.label}</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Assigned Counselor</p>
                  <p className="text-sm text-gray-800 font-medium">{detailAppt.counselor_name || 'Not yet assigned'}</p>
                </div>
                {detailAppt.concern && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Concern</p>
                    <p className="text-sm text-gray-700">{detailAppt.concern}</p>
                  </div>
                )}
                {detailAppt.office && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                    <MapPin size={14} className="text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-0.5">Office / Room</p>
                      <p className="text-sm text-amber-900 font-medium">{detailAppt.office}</p>
                    </div>
                  </div>
                )}
                {detailAppt.meeting_link && (
                  <a href={detailAppt.meeting_link} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-blue-700 hover:bg-green-100 transition font-medium">
                    <Video size={14} /> Join Session
                  </a>
                )}
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                <button onClick={() => setDetailAppt(null)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Evaluation Modal ─────────────────────────────────────────── */}
      {evalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-semibold text-sm text-gray-900">Evaluation Survey</h3>
                <p className="text-xs text-gray-400 mt-0.5">Please rate your counseling session experience</p>
              </div>
              <button onClick={() => setEvalTarget(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={14} className="text-gray-400" />
              </button>
            </div>

            {evalSuccess ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-4">
                  <CheckCircle size={28} className="text-[#2563eb]" />
                </div>
                <p className="font-semibold text-gray-900 mb-1">Thank you for your feedback!</p>
                <p className="text-sm text-gray-500">Your evaluation has been submitted.</p>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Rating scale header */}
                <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                  <span>1 – Not satisfied at all</span>
                  <span>5 – Extremely Satisfied</span>
                </div>

                {/* Rating questions */}
                {EVAL_QUESTIONS.map(q => (
                  <div key={q.key} className="flex items-center justify-between gap-4 py-2 border-b border-gray-50">
                    <p className="text-sm text-gray-700 flex-1">{q.label}</p>
                    <StarRating
                      value={evalRatings[q.key] || 0}
                      onChange={v => setEvalRatings(prev => ({ ...prev, [q.key]: v }))}
                    />
                  </div>
                ))}

                {/* Text questions */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    What did you like most about your experience?
                  </label>
                  <textarea value={evalLiked} onChange={e => setEvalLiked(e.target.value)}
                    rows={2} placeholder="Your answer..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-300 focus:ring-2 focus:ring-amber-300 focus:border-amber-300 focus:outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    What do you want to improve in the counseling sessions?
                  </label>
                  <textarea value={evalImprove} onChange={e => setEvalImprove(e.target.value)}
                    rows={2} placeholder="Your answer..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-300 focus:ring-2 focus:ring-amber-300 focus:border-amber-300 focus:outline-none resize-none" />
                </div>

                {evalError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-600">
                    <AlertCircle size={13} /> {evalError}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEvalTarget(null)}
                    className="flex-1 px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition">
                    Cancel
                  </button>
                  <button onClick={handleEvalSubmit} disabled={submittingEval}
                    className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2">
                    {submittingEval && <Loader2 size={13} className="animate-spin" />}
                    Submit Evaluation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Cancel Modal ─────────────────────────────────────────────── */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-sm text-gray-900">Cancel Appointment</h3>
              <button onClick={() => setCancelTarget(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={14} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">Are you sure you want to cancel this appointment? This cannot be undone.</p>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Cancellation Remarks</label>
                <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                  placeholder="Optional — let us know why you're cancelling"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-red-300 focus:border-red-300 focus:outline-none resize-none" />
              </div>
              {cancelError && <p className="text-xs text-red-500">{cancelError}</p>}
              <div className="flex gap-2">
                <button onClick={() => setCancelTarget(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition">
                  Keep
                </button>
                <button onClick={handleCancel} disabled={cancelling}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2">
                  {cancelling && <Loader2 size={13} className="animate-spin" />}
                  Cancel Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reschedule Modal ─────────────────────────────────────────── */}
      {reschedTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-sm text-gray-900">Request Reschedule</h3>
              <button onClick={() => setReschedTarget(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={14} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">New Preferred Date</label>
                <input type="date" value={reschedDate} onChange={e => setReschedDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">New Preferred Time</label>
                {!reschedDate ? (
                  <p className="text-xs text-gray-400 italic">Select a date to see available slots.</p>
                ) : rescheduleLoadingSlots ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                    <Loader2 size={13} className="animate-spin" /> Checking availability…
                  </div>
                ) : rescheduleSlots.length === 0 ? (
                  <div className="text-xs text-gray-500 py-1">
                    No slots available on this date. Try a different date.
                    {rescheduleNextDate && (
                      <span className="ml-1 text-[#2563eb] font-medium">
                        Next available: <button type="button" onClick={() => setReschedDate(rescheduleNextDate)} className="underline underline-offset-2">{rescheduleNextDate}</button>
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {rescheduleSlots.map((s, i) => (
                      <button key={i} type="button"
                        onClick={() => setReschedTime(s.time)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 text-sm transition ${
                          reschedTime === s.time
                            ? 'border-[#2563eb] bg-[#2563eb]/5 text-[#2563eb]'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}>
                        <Clock size={13} className={reschedTime === s.time ? 'text-[#2563eb]' : 'text-gray-400'} />
                        <span className="font-bold tabular-nums">{fmtTime(s.time)}</span>
                        {reschedTime === s.time && <span className="ml-auto text-[10px] font-bold">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Reason <span className="font-normal normal-case text-gray-400">(optional)</span></label>
                <textarea value={reschedReason} onChange={e => setReschedReason(e.target.value)}
                  placeholder="Why do you need to reschedule?"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] focus:outline-none resize-none" />
              </div>
              {reschedError && <p className="text-xs text-red-500">{reschedError}</p>}
              <div className="flex gap-2">
                <button onClick={() => setReschedTarget(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button onClick={handleReschedule} disabled={rescheduling}
                  className="flex-1 px-4 py-2 bg-[#2563eb] hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2">
                  {rescheduling && <Loader2 size={13} className="animate-spin" />}
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Forms modal — read-only intake packet */}
      {(viewFormsPacket || viewFormsLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">Submitted Intake Forms</h2>
                <p className="text-xs text-gray-400 mt-0.5">Read-only — submitted before your session</p>
              </div>
              <button onClick={() => setViewFormsPacket(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            {viewFormsLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-400 gap-2 text-sm">
                <Loader2 size={16} className="animate-spin" /> Loading…
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6 text-sm">

                {/* ICF */}
                {viewFormsPacket?.icf && (
                  <div>
                    <p className="font-bold text-xs text-[#2563eb] uppercase tracking-wide mb-3">Intake Consultation Form (ICF)</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {[
                        ['First Name', viewFormsPacket.icf.first_name],
                        ['Last Name', viewFormsPacket.icf.last_name],
                        ['Email', viewFormsPacket.icf.email],
                        ['Student ID', viewFormsPacket.icf.student_id],
                        ['Phone', viewFormsPacket.icf.phone],
                        ['College', viewFormsPacket.icf.college],
                        ['Program', viewFormsPacket.icf.program],
                        ['Referral', viewFormsPacket.icf.referral_source === 'referred' ? `Referred by ${viewFormsPacket.icf.referred_by}` : 'Self-referred'],
                        ['Emergency Contact', viewFormsPacket.icf.emergency_contact_name],
                        ['EC Relationship', viewFormsPacket.icf.emergency_contact_relationship],
                        ['EC Phone', viewFormsPacket.icf.emergency_contact_phone],
                      ].filter(([, v]) => v).map(([label, val]) => (
                        <div key={label as string}>
                          <p className="text-xs text-gray-400">{label as string}</p>
                          <p className="text-sm text-gray-800">{val as string}</p>
                        </div>
                      ))}
                    </div>
                    {viewFormsPacket.icf.presenting_concern && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-400 mb-1">Presenting Concern</p>
                        <p className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">{viewFormsPacket.icf.presenting_concern}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* SPIF */}
                {viewFormsPacket?.spif && (
                  <div>
                    <p className="font-bold text-xs text-blue-700 uppercase tracking-wide mb-3">Student Profile & Information Form (SPIF)</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {[
                        ['Birthdate', viewFormsPacket.spif.birthdate],
                        ['Gender', viewFormsPacket.spif.gender],
                        ['Civil Status', viewFormsPacket.spif.civil_status],
                        ['Religion', viewFormsPacket.spif.religion],
                        ['Nationality', viewFormsPacket.spif.nationality],
                        ['Address', viewFormsPacket.spif.address],
                        ['Living With', viewFormsPacket.spif.living_with],
                        ['Birth Order', viewFormsPacket.spif.birth_order],
                        ['No. of Siblings', viewFormsPacket.spif.number_of_siblings],
                        ['Sleep (hrs/night)', viewFormsPacket.spif.sleep_hours],
                        ['Exercise', viewFormsPacket.spif.exercise_frequency],
                        ['Substance Use', viewFormsPacket.spif.substance_use],
                      ].filter(([, v]) => v !== undefined && v !== '' && v !== null).map(([label, val]) => (
                        <div key={label as string}>
                          <p className="text-xs text-gray-400">{label as string}</p>
                          <p className="text-sm text-gray-800">{String(val)}</p>
                        </div>
                      ))}
                    </div>
                    {[
                      ['Medical Conditions', viewFormsPacket.spif.existing_medical_conditions],
                      ['Current Medications', viewFormsPacket.spif.current_medications],
                      ['Previous Counseling', viewFormsPacket.spif.previous_counseling_details],
                      ['Previous Psychiatric', viewFormsPacket.spif.previous_psychiatric_details],
                      ['Family Mental Health History', viewFormsPacket.spif.family_mental_health_history],
                    ].filter(([, v]) => v).map(([label, val]) => (
                      <div key={label as string} className="mt-2">
                        <p className="text-xs text-gray-400 mb-0.5">{label as string}</p>
                        <p className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">{val as string}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* PHQ-4 — show answers only, no scores */}
                {viewFormsPacket?.phq4_responses?.length === 4 && (
                  <div>
                    <p className="font-bold text-xs text-purple-700 uppercase tracking-wide mb-3">Wellness Pre-Screen (PHQ-4)</p>
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
                          <div key={i} className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
                            <p className="text-xs text-gray-600 flex-1">{question}</p>
                            <span className="text-xs font-medium text-gray-800 flex-shrink-0">{labels[val] ?? '—'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            )}

            <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setViewFormsPacket(null)}
                className="w-full py-2.5 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50 transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardPageWrapper>
  );
}
