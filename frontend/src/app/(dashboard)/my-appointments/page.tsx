'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import {
  Loader2, Plus, Video, X, RotateCcw, CheckCircle, AlertCircle,
  XCircle, Clock, Eye, QrCode,
} from 'lucide-react';
import Link from 'next/link';

interface Appointment {
  _id: string;
  status: string;
  purpose?: string;
  concern?: string;
  preferred_method?: string;
  requested_start?: string;
  scheduled_start?: string;
  counselor_name?: string;
  counseling_id?: string;
  meeting_link?: string;
  created_at: string;
  reschedule_count?: number;
}

// ── Tab definitions ─────────────────────────────────────────────────────────
const TABS = [
  { key: 'all',        label: 'All' },
  { key: 'applied',    label: 'Applied' },
  { key: 'confirmed',  label: 'Confirmed' },
  { key: 'rescheduled',label: 'Rescheduled' },
  { key: 'follow_up',  label: 'Follow-Up' },
  { key: 'cancelled',  label: 'Cancelled' },
  { key: 'completed',  label: 'Completed' },
] as const;

type TabKey = typeof TABS[number]['key'];

const TAB_STATUSES: Record<TabKey, string[]> = {
  all:         [],
  applied:     ['REQUESTED', 'PENDING_APPROVAL'],
  confirmed:   ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN'],
  rescheduled: ['RESCHEDULE_REQUESTED'],
  follow_up:   [],
  cancelled:   ['CANCELLED', 'DENIED', 'NO_SHOW'],
  completed:   ['COMPLETED'],
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  REQUESTED:            { label: 'Applied',            cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  PENDING_APPROVAL:     { label: 'Under Review',       cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  CONFIRMED:            { label: 'Confirmed',          cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  APPROVED:             { label: 'Confirmed',          cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  MATCHED:              { label: 'Confirmed',          cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  CHECKED_IN:           { label: 'Checked In',         cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  RESCHEDULE_REQUESTED: { label: 'Reschedule Pending', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  COMPLETED:            { label: 'Completed',          cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
  CANCELLED:            { label: 'Cancelled',          cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
  DENIED:               { label: 'Denied',             cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
  NO_SHOW:              { label: 'No Show',            cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
};

const INACTIVE = new Set(['CANCELLED', 'DENIED', 'COMPLETED', 'NO_SHOW']);

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
  if (!dt) return false;
  return new Date(dt) > new Date();
}

export default function MyAppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState<TabKey>('all');
  const [error, setError]               = useState<string | null>(null);

  // Cancel modal
  const [cancelTarget, setCancelTarget]   = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason]   = useState('');
  const [cancelling, setCancelling]       = useState(false);
  const [cancelError, setCancelError]     = useState('');

  // Reschedule modal
  const [reschedTarget, setReschedTarget] = useState<Appointment | null>(null);
  const [reschedDate, setReschedDate]     = useState('');
  const [reschedTime, setReschedTime]     = useState('');
  const [reschedReason, setReschedReason] = useState('');
  const [rescheduling, setRescheduling]   = useState(false);
  const [reschedError, setReschedError]   = useState('');

  // Detail modal
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api('/api/appointments/my-appointments'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 401) { router.replace('/login'); return; }
      if (r.ok) { const d = await r.json(); setAppointments(d.appointments || []); }
      else setError('Failed to load appointments.');
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = activeTab === 'all'
    ? appointments
    : appointments.filter(a => TAB_STATUSES[activeTab].includes(a.status));

  // Badge counts per tab
  const counts: Record<TabKey, number> = {
    all:         appointments.length,
    applied:     appointments.filter(a => TAB_STATUSES.applied.includes(a.status)).length,
    confirmed:   appointments.filter(a => TAB_STATUSES.confirmed.includes(a.status)).length,
    rescheduled: appointments.filter(a => TAB_STATUSES.rescheduled.includes(a.status)).length,
    follow_up:   0,
    cancelled:   appointments.filter(a => TAB_STATUSES.cancelled.includes(a.status)).length,
    completed:   appointments.filter(a => TAB_STATUSES.completed.includes(a.status)).length,
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
        body: JSON.stringify({ preferred_date: reschedDate, preferred_time: reschedTime, reason: reschedReason }),
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

  return (
    <DashboardPageWrapper title="My Appointments" subtitle="View and manage your counseling session requests">

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div />
        <Link href="/book-appointment">
          <button className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition">
            <Plus size={14} /> New Request
          </button>
        </Link>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-green-600 text-green-700 dark:text-green-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold leading-none ${
                activeTab === tab.key
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-gray-400">
            <Loader2 size={18} className="animate-spin" /> Loading…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-40 text-red-500 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Clock size={32} className="text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No appointments found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {activeTab === 'all' ? 'You have no appointments yet.' : `No ${activeTab.replace('_', '-')} appointments.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Preferred Date &amp; Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Purpose</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Platform</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ticket #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {filtered.map((appt, i) => {
                  const dt  = appt.scheduled_start || appt.requested_start;
                  const cfg = STATUS_BADGE[appt.status] ?? { label: appt.status, cls: 'bg-gray-100 text-gray-600' };
                  const active = !INACTIVE.has(appt.status);
                  const upcoming = isUpcoming(dt);
                  const canJoin = ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN'].includes(appt.status) && upcoming && appt.meeting_link;

                  return (
                    <tr key={appt._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{i + 1}.</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-900 dark:text-gray-100">{fmtDateTime(dt)}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{fmtPurpose(appt.purpose)}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmtPlatform(appt.preferred_method)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                        {appt.counseling_id || appt._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* View detail */}
                          <button onClick={() => setDetailAppt(appt)} title="View"
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
                            <Eye size={14} />
                          </button>
                          {/* Join session */}
                          {canJoin && (
                            <a href={appt.meeting_link} target="_blank" rel="noreferrer" title="Join Session"
                              className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 transition">
                              <Video size={14} />
                            </a>
                          )}
                          {/* Reschedule */}
                          {active && appt.status !== 'RESCHEDULE_REQUESTED' && (
                            <button onClick={() => { setReschedTarget(appt); setReschedDate(''); setReschedTime(''); setReschedReason(''); setReschedError(''); }} title="Reschedule"
                              className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition">
                              <RotateCcw size={14} />
                            </button>
                          )}
                          {/* Cancel */}
                          {active && (
                            <button onClick={() => { setCancelTarget(appt); setCancelReason(''); setCancelError(''); }} title="Cancel"
                              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detail Modal ──────────────────────────────────────────────────── */}
      {detailAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Appointment Details</h3>
              <button onClick={() => setDetailAppt(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                <X size={15} className="text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              {[
                ['Ticket #',   detailAppt.counseling_id || detailAppt._id.slice(-6).toUpperCase()],
                ['Status',     STATUS_BADGE[detailAppt.status]?.label ?? detailAppt.status],
                ['Date & Time', fmtDateTime(detailAppt.scheduled_start || detailAppt.requested_start)],
                ['Purpose',    fmtPurpose(detailAppt.purpose)],
                ['Platform',   fmtPlatform(detailAppt.preferred_method)],
                ['Counselor',  detailAppt.counselor_name || '—'],
                ['Concern',    detailAppt.concern || '—'],
              ].map(([label, val]) => (
                <div key={label} className="flex gap-3">
                  <span className="w-28 flex-shrink-0 text-gray-400 dark:text-gray-500 text-xs font-medium uppercase">{label}</span>
                  <span className="text-gray-900 dark:text-gray-100 flex-1 break-words">{val}</span>
                </div>
              ))}
              {detailAppt.meeting_link && (
                <div className="flex gap-3">
                  <span className="w-28 flex-shrink-0 text-gray-400 dark:text-gray-500 text-xs font-medium uppercase">Join Link</span>
                  <a href={detailAppt.meeting_link} target="_blank" rel="noreferrer"
                    className="text-green-600 dark:text-green-400 hover:underline flex items-center gap-1 text-sm">
                    <Video size={13} /> Join Session
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Modal ──────────────────────────────────────────────────── */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Cancel Appointment</h3>
              <button onClick={() => setCancelTarget(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                <X size={15} className="text-gray-400" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Are you sure you want to cancel this appointment? This action cannot be undone.
              </p>
              <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation (optional)"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-red-400 focus:outline-none resize-none mb-3" />
              {cancelError && <p className="text-xs text-red-500 mb-3">{cancelError}</p>}
              <div className="flex gap-2">
                <button onClick={() => setCancelTarget(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  Keep
                </button>
                <button onClick={handleCancel} disabled={cancelling}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2">
                  {cancelling && <Loader2 size={13} className="animate-spin" />}
                  Cancel Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reschedule Modal ──────────────────────────────────────────────── */}
      {reschedTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Request Reschedule</h3>
              <button onClick={() => setReschedTarget(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                <X size={15} className="text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">New Preferred Date</label>
                <input type="date" value={reschedDate} onChange={e => setReschedDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">New Preferred Time</label>
                <input type="time" value={reschedTime} onChange={e => setReschedTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Reason</label>
                <textarea value={reschedReason} onChange={e => setReschedReason(e.target.value)}
                  placeholder="Reason for rescheduling (optional)"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:outline-none resize-none" />
              </div>
              {reschedError && <p className="text-xs text-red-500">{reschedError}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setReschedTarget(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  Cancel
                </button>
                <button onClick={handleReschedule} disabled={rescheduling}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2">
                  {rescheduling && <Loader2 size={13} className="animate-spin" />}
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardPageWrapper>
  );
}
