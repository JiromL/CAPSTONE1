'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import {
  Calendar, Clock, MapPin, User, CheckCircle, XCircle, AlertCircle,
  Loader2, Video, Repeat, X, Edit, ChevronDown, ChevronUp, Mail, FileText, QrCode, Printer,
  MessageSquare, Star,
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
  reschedule_count?: number;
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
  APPROVED:         { label: 'Approved',       color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle size={13} /> },
  MATCHED:          { label: 'Matched',        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle size={13} /> },
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
        ? { ...a, status: 'REQUESTED', requested_start: updated.requested_start || a.requested_start, reschedule_count: updated.reschedule_count ?? (a.reschedule_count ?? 0) + 1 }
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
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="space-y-2">
                    <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                  </div>
                  <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-3.5 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                  <div className="h-3.5 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                  <div className="h-3.5 w-3/4 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                </div>
              </div>
            ))}
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
              className="inline-block mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
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
              {past.map(appt => (
                <AppointmentCard
                  key={appt._id}
                  appt={appt}
                  onCancel={!INACTIVE.has(appt.status) ? () => { setCancelTarget(appt); setActionError(''); } : undefined}
                />
              ))}
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
          {cancelTarget && !isUpcoming(getApptDatetime(cancelTarget)) && (
            <div className="mb-4 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
              This appointment's preferred date has already passed but was never confirmed by CPS. Cancelling it will allow you to book a new appointment.
            </div>
          )}
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
          {(rescheduleTarget.reschedule_count ?? 0) >= 2 && (
            <div className="flex gap-2 p-3 mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
              <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                You've rescheduled this appointment {rescheduleTarget.reschedule_count} time{rescheduleTarget.reschedule_count !== 1 ? 's' : ''}. Frequent rescheduling may be noted by your counselor. If you're having trouble committing to a time, consider contacting the CPS office directly.
              </p>
            </div>
          )}
          {rescheduleTarget.appointment_type?.toLowerCase().includes('initial') && (rescheduleTarget.reschedule_count ?? 0) < 2 && (
            <div className="flex gap-2 p-3 mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
              <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>Initial assessments are important.</strong> Rescheduling delays your access to counseling services. Please only reschedule if absolutely necessary.
              </p>
            </div>
          )}
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
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Time</label>
              <input
                type="time"
                value={rescheduleTime}
                onChange={e => setRescheduleTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
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
              className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white transition disabled:opacity-50"
            >
              {actionLoading ? 'Saving…' : 'Reschedule'}
            </button>
          </div>
        </Modal>
      )}
    </DashboardPageWrapper>
  );
}

function QrModal({ apptId, onClose }: { apptId: string; onClose: () => void }) {
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [expires, setExpires] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(api(`/api/qr/appointment/${apptId}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.qr_image) {
          setQrSrc(d.qr_image);
          setExpires(d.expires_at);
        } else {
          setErr(d.error || 'Could not generate QR code');
        }
      })
      .catch(() => setErr('Failed to fetch QR code'));
  }, [apptId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Check-In QR Code</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
        </div>
        {err ? (
          <p className="text-sm text-red-600 dark:text-red-400 text-center py-6">{err}</p>
        ) : !qrSrc ? (
          <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-green-500" /></div>
        ) : (
          <>
            <img src={qrSrc} alt="Check-in QR Code" className="w-full rounded-lg border border-gray-200 dark:border-gray-700" />
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
              Show this to staff at the office to check in.
              {expires && <><br />Valid until {new Date(expires).toLocaleTimeString()}</>}
            </p>
          </>
        )}
      </div>
    </div>
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
  const [showQr, setShowQr] = useState(false);
  const [showCheckins, setShowCheckins] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const cfg = STATUS_CONFIG[appt.status] ?? { label: appt.status, color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: null };
  const isActive = !INACTIVE.has(appt.status);
  const canCancel = !!(onCancel && isActive);
  const dt = getApptDatetime(appt);

  // Reschedule guards
  const rescheduleCount = appt.reschedule_count ?? 0;
  const within24h = dt ? (new Date(dt).getTime() - Date.now()) / 3600000 < 24 : false;
  const canReschedule = !!(onReschedule && isActive && !within24h);
  const rescheduleWarning = rescheduleCount >= 2;
  const isInitialAssessment = appt.appointment_type?.toLowerCase().includes('initial');

  const hasDetails = !!(appt.concern || appt.purpose || appt.counselor_email || appt.notes || appt.counseling_id);

  return (
    <div className={`rounded-xl border ${highlight
      ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30'
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
          {/* Location: show actual location, or "CPS Office" for in-person, or video platform */}
          {appt.location ? (
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <MapPin size={14} className="text-gray-400 flex-shrink-0" />
              <span>{appt.location}</span>
            </div>
          ) : (appt.preferred_method === 'in_person' || appt.preferred_method === 'in-person') ? (
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <MapPin size={14} className="text-gray-400 flex-shrink-0" />
              <span>CPS Office</span>
            </div>
          ) : appt.preferred_method === 'zoom' ? (
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Video size={14} className="text-gray-400 flex-shrink-0" />
              <span>Zoom {appt.meeting_link ? '' : '· Link pending confirmation'}</span>
            </div>
          ) : appt.preferred_method === 'google_meet' || appt.preferred_method === 'google-meet' ? (
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Video size={14} className="text-gray-400 flex-shrink-0" />
              <span>Google Meet {appt.meeting_link ? '' : '· Link pending confirmation'}</span>
            </div>
          ) : null}
        </div>

        {appt.is_recurring && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
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
            {appt.counselor_email && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400 dark:text-gray-500 w-24 flex-shrink-0 text-xs pt-0.5">Counselor</span>
                <a
                  href={`mailto:${appt.counselor_email}`}
                  className="flex items-center gap-1 text-green-600 dark:text-green-400 hover:underline"
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
            <div className="flex items-center gap-1.5 flex-wrap">
              <a
                href={appt.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <Video size={13} /> Join Session
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(appt.meeting_link!)}
                title="Copy link"
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Copy link
              </button>
              <a
                href={appt.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:underline truncate max-w-[180px]"
                title={appt.meeting_link}
              >
                {appt.meeting_link}
              </a>
            </div>
          )}
          {['CONFIRMED', 'APPROVED'].includes(appt.status) && isUpcoming(dt) && (
            <button
              onClick={() => setShowQr(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <QrCode size={13} /> Check-In QR
            </button>
          )}
          {showQr && <QrModal apptId={appt._id} onClose={() => setShowQr(false)} />}

          {/* Print slip */}
          <Link
            href={`/appointment-slip/${appt._id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Printer size={13} /> Confirmation Slip
          </Link>

          {/* Reschedule button or 24h block notice */}
          {isActive && onReschedule && (
            within24h ? (
              <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                <Clock size={12} /> Cannot reschedule within 24h of session
              </span>
            ) : (
              <button
                onClick={onReschedule}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Edit size={13} /> Reschedule
              </button>
            )
          )}

          {/* Cancel button */}
          {canCancel && (
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
            >
              <X size={13} /> Cancel
            </button>
          )}

          {/* Check-in button — available on all active + completed appointments */}
          {appt.status !== 'CANCELLED' && appt.status !== 'DENIED' && (
            <button
              onClick={() => setShowCheckins(v => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition-colors"
            >
              <MessageSquare size={13} /> {showCheckins ? 'Hide Check-ins' : 'Check-ins'}
            </button>
          )}

          {/* Feedback button — only on completed */}
          {appt.status === 'COMPLETED' && (
            <button
              onClick={() => setShowFeedback(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors"
            >
              <Star size={13} /> Leave Feedback
            </button>
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

        {/* Check-in section */}
        {showCheckins && <CheckInSection appointmentId={appt._id} />}
      </div>

      {/* Feedback modal */}
      {showFeedback && <FeedbackModal appointmentId={appt._id} onClose={() => setShowFeedback(false)} />}
    </div>
  );
}

const STATUS_OPTS = [
  { value: 'DOING_WELL', label: 'Doing well', emoji: '😊' },
  { value: 'MANAGING', label: 'Managing', emoji: '😐' },
  { value: 'STRUGGLING', label: 'Struggling', emoji: '😔' },
  { value: 'IN_CRISIS', label: 'In crisis', emoji: '😰' },
];

function CheckInSection({ appointmentId }: { appointmentId: string }) {
  const [checkins, setCheckins] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [status, setStatus] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(api(`/api/check-ins/for-appointment/${appointmentId}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : { check_ins: [] })
      .then(d => setCheckins(d.check_ins || []))
      .finally(() => setLoadingList(false));
  }, [appointmentId, submitted]);

  async function handleSubmit() {
    if (!status || !rating) { setError('Please select a status and rating.'); return; }
    setSubmitting(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api('/api/check-ins/student/self-checkin'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: appointmentId, status, wellness_rating: rating, notes }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Failed'); }
      setStatus(''); setRating(null); setNotes(''); setSubmitted(v => !v);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Daily Check-in</p>

      {/* Submit form */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">How are you feeling today?</p>
        <div className="flex gap-2 flex-wrap mb-3">
          {STATUS_OPTS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                status === opt.value
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-green-400'
              }`}
            >
              {opt.emoji} {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-500 dark:text-gray-400 w-20">Wellness</span>
          <div className="flex gap-1">
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                  rating === n
                    ? 'bg-green-600 text-white'
                    : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-green-400'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Optional note for your counselor…"
          rows={2}
          className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
        />
        {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-2 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Check-in'}
        </button>
      </div>

      {/* History */}
      {loadingList ? (
        <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-gray-400" /></div>
      ) : checkins.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">No check-ins yet — submit your first one above.</p>
      ) : (
        <div className="space-y-2">
          {checkins.map(c => {
            const opt = STATUS_OPTS.find(o => o.value === c.status);
            return (
              <div key={c._id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <span className="text-lg leading-none mt-0.5">{opt?.emoji ?? '📝'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{opt?.label ?? c.status}</span>
                    {c.wellness_rating && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">· {c.wellness_rating}/10</span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                      {c.submitted_at ? new Date(c.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  {c.notes && <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{c.notes}</p>}
                  {c.staff_notes && (
                    <p className="text-xs text-green-700 dark:text-green-400 mt-1 italic">CPS: {c.staff_notes}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FeedbackModal({ appointmentId, onClose }: { appointmentId: string; onClose: () => void }) {
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!rating) { setError('Please select a rating.'); return; }
    setSubmitting(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api('/api/engagement/feedback'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'COUNSELING_SESSION', rating, message, appointment_id: appointmentId }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Failed'); }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Session Feedback" onClose={onClose}>
      {done ? (
        <div className="text-center py-4">
          <CheckCircle size={32} className="text-green-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">Thank you for your feedback!</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Your response helps us improve our services.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors">Close</button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">How would you rate your counseling session?</p>
          <div className="flex gap-2 justify-center mb-4">
            {[1,2,3,4,5].map(n => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className={`w-10 h-10 rounded-lg text-lg transition-colors ${
                  rating && rating >= n ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'
                } hover:text-amber-400`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Share anything about your experience (optional)…"
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
          {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-50 hover:bg-gray-200 dark:hover:bg-gray-600 transition">Skip</button>
            <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white transition disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </>
      )}
    </Modal>
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
