'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import {
  Calendar, Clock, MapPin, User, CheckCircle, XCircle, AlertCircle,
  Loader2, Video, Repeat, X, Edit, ChevronDown, ChevronUp, Mail, FileText,
} from 'lucide-react';

interface Appointment {
  _id: string;
  appointment_type: string;
  status: string;
  requested_start?: string;
  scheduled_start?: string;
  requested_end?: string;
  duration_minutes?: number;
  counselor_name?: string;
  counselor_email?: string;
  location?: string;
  notes?: string;
  created_at: string;
  meeting_link?: string;
  preferred_method?: string;
  concern?: string;
  purpose?: string;
  is_recurring?: boolean;
  recurrence?: string;
  recurrence_index?: number;
  recurrence_total?: number;
  counseling_id?: string;
}

interface Draft {
  purpose: string;
  otherPurpose?: string;
  preferredDate?: string;
  preferredTime?: string;
  concern?: string;
}

interface CheckInCase {
  _id: string;
  client_status: string;
  concern?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  CONFIRMED:        { label: 'Confirmed',     color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',    icon: <CheckCircle size={13} /> },
  REQUESTED:        { label: 'Pending',        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <AlertCircle size={13} /> },
  PENDING_APPROVAL: { label: 'Under Review',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',        icon: <AlertCircle size={13} /> },
  APPROVED:         { label: 'Approved',       color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: <CheckCircle size={13} /> },
  MATCHED:          { label: 'Matched',        color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: <CheckCircle size={13} /> },
  COMPLETED:        { label: 'Completed',      color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',           icon: <CheckCircle size={13} /> },
  CANCELLED:        { label: 'Cancelled',      color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',            icon: <XCircle size={13} /> },
  DENIED:           { label: 'Denied',         color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',            icon: <XCircle size={13} /> },
  NO_SHOW:          { label: 'No Show',        color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400', icon: <XCircle size={13} /> },
};

const INACTIVE = new Set(['CANCELLED', 'DENIED', 'COMPLETED', 'NO_SHOW']);

function getApptDatetime(appt: Appointment): string | undefined {
  return appt.scheduled_start || appt.requested_start;
}

function formatDate(dt: string | undefined) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function formatTime(dt: string | undefined) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
function isUpcoming(dt: string | undefined) {
  if (!dt) return false;
  return new Date(dt) > new Date();
}
function formatTypeName(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function formatMethodName(method: string) {
  if (method === 'in_person') return 'In Person';
  if (method === 'google_meet') return 'Google Meet';
  if (method === 'zoom') return 'Zoom';
  return method;
}

export default function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [checkInCase, setCheckInCase] = useState<CheckInCase | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cancel/reschedule state
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setError('Not authenticated'); setLoading(false); return; }

    const raw = localStorage.getItem('bookAppointmentDraft');
    if (raw) { try { setDraft(JSON.parse(raw)); } catch {} }

    Promise.all([
      fetch(api('/api/appointments/my-appointments'), { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : Promise.reject()),
      fetch(api('/api/cases/my-current'), { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null),
    ])
      .then(([apptData, caseData]) => {
        setAppointments(apptData.appointments || []);
        if (caseData?.case?.client_status === 'CHECK_IN_ONLY') {
          setCheckInCase(caseData.case);
        }
      })
      .catch(() => setError('Failed to load appointments.'))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = appointments.filter(a => isUpcoming(getApptDatetime(a)) && !INACTIVE.has(a.status));
  const past     = appointments.filter(a => !isUpcoming(getApptDatetime(a)) || INACTIVE.has(a.status));

  async function handleCancel() {
    if (!cancelTarget) return;
    setActionLoading(true);
    setActionError('');
    const token = localStorage.getItem('token')!;
    try {
      const r = await fetch(api(`/api/appointments/${cancelTarget._id}/cancel`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason || 'No reason provided' }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Failed'); }
      setAppointments(prev => prev.map(a => a._id === cancelTarget._id ? { ...a, status: 'CANCELLED' } : a));
      setCancelTarget(null);
      setCancelReason('');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to cancel');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReschedule() {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTime) return;
    setActionLoading(true);
    setActionError('');
    const token = localStorage.getItem('token')!;
    try {
      const start = new Date(`${rescheduleDate}T${rescheduleTime}`);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const r = await fetch(api(`/api/appointments/${rescheduleTarget._id}/reschedule`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requested_start: start.toISOString(), requested_end: end.toISOString(), reason: 'Rescheduled by student' }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Failed'); }
      const updated = await r.json();
      setAppointments(prev => prev.map(a => a._id === rescheduleTarget._id
        ? { ...a, status: 'REQUESTED', requested_start: updated.requested_start || a.requested_start }
        : a
      ));
      setRescheduleTarget(null);
      setRescheduleDate('');
      setRescheduleTime('');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to reschedule');
    } finally {
      setActionLoading(false);
    }
  }

  function dismissDraft() {
    localStorage.removeItem('bookAppointmentDraft');
    setDraft(null);
  }

  return (
    <DashboardPageWrapper title="My Appointments" subtitle="Your scheduled and past counseling sessions">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Check-in task banner */}
        {checkInCase && (
          <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
            <AlertCircle size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Check-in required</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Your case status is Check-In Only{checkInCase.concern ? ` · ${checkInCase.concern}` : ''}. Please submit your check-in.
              </p>
            </div>
            <Link
              href="/check-ins-student"
              className="flex-shrink-0 px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
            >
              Submit
            </Link>
          </div>
        )}

        {/* Draft card */}
        {draft && (
          <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
            <Calendar size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Draft appointment</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                Purpose: {draft.purpose === 'others' ? draft.otherPurpose : draft.purpose}
                {draft.preferredDate ? ` · ${draft.preferredDate}` : ''}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link
                href="/book-appointment"
                className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Resume
              </Link>
              <button
                onClick={dismissDraft}
                className="px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-lg transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={24} className="animate-spin mr-2" /> Loading…
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && appointments.length === 0 && !draft && !checkInCase && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Calendar size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">No appointments yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Your scheduled sessions will appear here.</p>
            <Link
              href="/counseling"
              className="inline-block mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Upcoming</h2>
            <div className="space-y-3">
              {upcoming.map(appt => (
                <AppointmentCard
                  key={appt._id}
                  appt={appt}
                  highlight
                  onCancel={() => { setCancelTarget(appt); setActionError(''); }}
                  onReschedule={() => { setRescheduleTarget(appt); setActionError(''); }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Past */}
        {past.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Past</h2>
            <div className="space-y-3">
              {past.map(appt => <AppointmentCard key={appt._id} appt={appt} />)}
            </div>
          </section>
        )}
      </div>

      {/* Cancel modal */}
      {cancelTarget && (
        <Modal
          title="Cancel Appointment"
          onClose={() => { setCancelTarget(null); setCancelReason(''); setActionError(''); }}
        >
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Are you sure you want to cancel your{' '}
            <strong>{formatTypeName(cancelTarget.appointment_type)}</strong> appointment on{' '}
            <strong>{formatDate(getApptDatetime(cancelTarget))}</strong>?
          </p>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (optional)</label>
          <textarea
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            placeholder="Let us know why you're cancelling"
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          {actionError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{actionError}</p>}
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => { setCancelTarget(null); setCancelReason(''); setActionError(''); }}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-50 hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50"
            >
              Keep
            </button>
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50"
            >
              {actionLoading ? 'Cancelling…' : 'Cancel Appointment'}
            </button>
          </div>
        </Modal>
      )}

      {/* Reschedule modal */}
      {rescheduleTarget && (
        <Modal
          title="Reschedule Appointment"
          onClose={() => { setRescheduleTarget(null); setRescheduleDate(''); setRescheduleTime(''); setActionError(''); }}
        >
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Choose a new time for your <strong>{formatTypeName(rescheduleTarget.appointment_type)}</strong> appointment.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Date</label>
              <input
                type="date"
                value={rescheduleDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setRescheduleDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Time</label>
              <input
                type="time"
                value={rescheduleTime}
                onChange={e => setRescheduleTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          {actionError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{actionError}</p>}
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => { setRescheduleTarget(null); setRescheduleDate(''); setRescheduleTime(''); setActionError(''); }}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-50 hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50"
            >
              Keep Current
            </button>
            <button
              onClick={handleReschedule}
              disabled={actionLoading || !rescheduleDate || !rescheduleTime}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-50"
            >
              {actionLoading ? 'Saving…' : 'Reschedule'}
            </button>
          </div>
        </Modal>
      )}
    </DashboardPageWrapper>
  );
}

function AppointmentCard({
  appt, highlight, onCancel, onReschedule,
}: {
  appt: Appointment;
  highlight?: boolean;
  onCancel?: () => void;
  onReschedule?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[appt.status] ?? { label: appt.status, color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: null };
  const canAct = onCancel && !INACTIVE.has(appt.status);
  const dt = getApptDatetime(appt);

  const hasDetails = !!(appt.concern || appt.purpose || appt.preferred_method || appt.counselor_email || appt.notes || appt.counseling_id);

  return (
    <div className={`rounded-xl border ${highlight
      ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30'
      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
    }`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{formatTypeName(appt.appointment_type)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Booked {new Date(appt.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {appt.counseling_id ? ` · ${appt.counseling_id}` : ''}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${cfg.color}`}>
            {cfg.icon} {cfg.label}
          </span>
        </div>

        {/* Core details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Calendar size={14} className="text-gray-400 flex-shrink-0" />
            <span>{formatDate(dt)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Clock size={14} className="text-gray-400 flex-shrink-0" />
            <span>{formatTime(dt)}{appt.duration_minutes ? ` · ${appt.duration_minutes} min` : ''}</span>
          </div>
          {appt.counselor_name && appt.counselor_name !== 'Unknown Counselor' && (
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <User size={14} className="text-gray-400 flex-shrink-0" />
              <span>{appt.counselor_name}</span>
            </div>
          )}
          {appt.location && (
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <MapPin size={14} className="text-gray-400 flex-shrink-0" />
              <span>{appt.location}</span>
            </div>
          )}
        </div>

        {appt.is_recurring && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400">
            <Repeat size={11} />
            Session {appt.recurrence_index} of {appt.recurrence_total} · {appt.recurrence === 'weekly' ? 'Weekly' : 'Bi-weekly'}
          </div>
        )}

        {/* Expanded details */}
        {expanded && hasDetails && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2.5">
            {appt.concern && (
              <div className="flex gap-2 text-sm">
                <span className="text-gray-400 dark:text-gray-500 w-24 flex-shrink-0 text-xs pt-0.5">Concern</span>
                <span className="text-gray-700 dark:text-gray-300">{appt.concern}</span>
              </div>
            )}
            {appt.purpose && appt.purpose !== appt.concern && (
              <div className="flex gap-2 text-sm">
                <span className="text-gray-400 dark:text-gray-500 w-24 flex-shrink-0 text-xs pt-0.5">Purpose</span>
                <span className="text-gray-700 dark:text-gray-300 capitalize">{appt.purpose}</span>
              </div>
            )}
            {appt.preferred_method && (
              <div className="flex gap-2 text-sm">
                <span className="text-gray-400 dark:text-gray-500 w-24 flex-shrink-0 text-xs pt-0.5">Format</span>
                <span className="text-gray-700 dark:text-gray-300">{formatMethodName(appt.preferred_method)}</span>
              </div>
            )}
            {appt.counselor_email && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400 dark:text-gray-500 w-24 flex-shrink-0 text-xs pt-0.5">Counselor</span>
                <a
                  href={`mailto:${appt.counselor_email}`}
                  className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Mail size={12} /> {appt.counselor_email}
                </a>
              </div>
            )}
            {appt.notes && (
              <div className="flex gap-2 text-sm">
                <span className="text-gray-400 dark:text-gray-500 w-24 flex-shrink-0 text-xs pt-0.5 flex items-center gap-1"><FileText size={12}/> Notes</span>
                <span className="text-gray-700 dark:text-gray-300">{appt.notes}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions row */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 flex-wrap">
          {appt.meeting_link && isUpcoming(dt) && (
            <a
              href={appt.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Video size={13} /> Join Session
            </a>
          )}
          {canAct && (
            <>
              <button
                onClick={onReschedule}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Edit size={13} /> Reschedule
              </button>
              <button
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
              >
                <X size={13} /> Cancel
              </button>
            </>
          )}
          {hasDetails && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="ml-auto inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              {expanded ? <><ChevronUp size={13} /> Hide details</> : <><ChevronDown size={13} /> View details</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
