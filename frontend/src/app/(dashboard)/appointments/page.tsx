'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import {
  Loader2, Eye, Video, RotateCcw, Star, ExternalLink, RefreshCw,
  Archive, CheckCircle, History, X, AlertCircle, CalendarDays,
} from 'lucide-react';

interface Appointment {
  appointment_id: string;
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
  { key: 'evaluation', label: 'Post-Session',  icon: Star },
  { key: 'past',       label: 'Completed',     icon: History },
  { key: 'cancelled',  label: 'Cancelled',     icon: X },
] as const;
type TabKey = typeof TABS[number]['key'];

const TAB_STATUSES: Record<TabKey, string[]> = {
  active:     ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN', 'PENDING_APPROVAL', 'RESCHEDULE_REQUESTED'],
  evaluation: ['EVALUATION'],
  past:       ['COMPLETED', 'FOLLOW_UP', 'REFERRAL'],
  cancelled:  ['CANCELLED', 'DENIED', 'NO_SHOW'],
};

const PURPOSE_LABEL: Record<string, string> = {
  intake_interview:       'Initial Consultation',
  follow_up:              'Follow-up Session',
  follow_up_counselling:  'Follow-up Session',
  counseling:             'Counseling Session',
  others:                 'General Session',
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING_APPROVAL:     { label: 'Under Review',      cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  APPROVED:             { label: 'Confirmed',          cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  MATCHED:              { label: 'Confirmed',          cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  CONFIRMED:            { label: 'Confirmed',          cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  CHECKED_IN:           { label: 'Checked In',         cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  RESCHEDULE_REQUESTED: { label: 'Reschedule Pending', cls: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  EVALUATION:           { label: 'Post-Session',       cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-300' },
  FOLLOW_UP:            { label: 'Follow-Up',          cls: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' },
  REFERRAL:             { label: 'Referral',           cls: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' },
  COMPLETED:            { label: 'Completed',          cls: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
  CANCELLED:            { label: 'Cancelled',          cls: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
  DENIED:               { label: 'Denied',             cls: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
  NO_SHOW:              { label: 'No Show',            cls: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
};

const RISK_CLS: Record<string, string> = {
  GREEN:    'bg-green-100 text-green-700',
  YELLOW:   'bg-yellow-100 text-yellow-700',
  RED:      'bg-red-100 text-red-700',
  CRITICAL: 'bg-red-200 text-red-900 font-semibold',
};

function fmtDate(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtTime(d?: string, t?: string) {
  if (t) return t;
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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

  // Follow-up scheduling modal
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

  const [intakeSummary, setIntakeSummary] = useState<any>(null);
  const [intakePacket,  setIntakePacket]  = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api('/api/appointments/dashboard/role-view'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 401) { router.replace('/login'); return; }
      if (r.ok) { setDashboard(await r.json()); }
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
    if (['STAFF', 'ADMIN', 'IC'].includes(role)) {
      router.replace('/appointment-requests');
    }
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

  const filtered = apts.filter(a => TAB_STATUSES[activeTab].includes(a.status));

  const counts = Object.fromEntries(
    TABS.map(t => [t.key, apts.filter(a => TAB_STATUSES[t.key as TabKey].includes(a.status)).length])
  ) as Record<TabKey, number>;

  const canManage = dashboard?.can_manage_sessions ?? false;

  const doAction = async (aptId: string, endpoint: string, body?: object) => {
    setActioningId(aptId);
    setActionMsg(null);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/appointments/${aptId}/${endpoint}`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (r.ok) {
        const msgs: Record<string, string> = {
          'set-evaluation': 'Session marked done.',
          'set-follow-up':  'Marked as Follow-Up.',
          'set-referral':   'Marked as Referral.',
          'complete':       'Marked as Completed.',
          'mark-no-show':   'Marked as No Show.',
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
    setSubmittingFollowUp(true);
    setFollowUpMsg(null);
    try {
      const token = localStorage.getItem('token');
      const scheduledStart = new Date(`${followUpDate}T${followUpTime}:00`).toISOString();
      const r = await fetch(api(`/api/appointments/${followUpTarget.appointment_id}/set-follow-up`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_start: scheduledStart, office: followUpOffice, notes: followUpNotes }),
      });
      if (r.ok) {
        setFollowUpMsg({ type: 'ok', text: 'Follow-up session scheduled.' });
        setTimeout(() => { setFollowUpTarget(null); load(); }, 1200);
      } else {
        const e = await r.json();
        setFollowUpMsg({ type: 'err', text: e.error || 'Failed to schedule follow-up.' });
      }
    } finally { setSubmittingFollowUp(false); }
  };

  if (loading) {
    return (
      <DashboardPageWrapper title="My Sessions" subtitle="Appointments assigned to you">
        <div className="flex items-center justify-center h-52 gap-2 text-gray-400">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="My Sessions" subtitle="Appointments assigned to you">

      {/* Summary strip */}
      {dashboard?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total',        value: dashboard.summary.total_appointments ?? apts.length, cls: 'text-gray-800' },
            { label: 'Confirmed',    value: dashboard.summary.confirmed ?? 0,                    cls: 'text-[#1a5228]' },
            { label: 'Post-Session', value: dashboard.summary.awaiting_evaluation ?? 0,          cls: 'text-amber-600' },
            { label: 'Follow-Up',    value: (dashboard.summary.follow_up ?? 0) + (dashboard.summary.referral ?? 0), cls: 'text-indigo-600' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">{c.label}</p>
              <p className={`text-2xl font-semibold ${c.cls}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Post-session reminder banner */}
      {counts.evaluation > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm">
          <Star size={15} className="text-amber-500 flex-shrink-0" />
          <span className="text-amber-800 font-medium">
            {counts.evaluation} session{counts.evaluation > 1 ? 's' : ''} waiting for your decision — set Follow-Up, Referral, or Complete.
          </span>
          <button onClick={() => setActiveTab('evaluation')}
            className="ml-auto text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900">
            Review
          </button>
        </div>
      )}

      {/* Card panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Tabs */}
        <div className="flex items-end overflow-x-auto border-b border-gray-100 px-2 pt-1.5 gap-0.5 scrollbar-hide">
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const cnt = counts[tab.key];
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium rounded-t-lg transition-all whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-[#1a5228]/5 text-[#1a5228] border-b-2 border-[#1a5228]'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}>
                {tab.label}
                {cnt > 0 && (
                  <span className={`text-[10px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-1 ${
                    isActive ? 'bg-[#1a5228] text-white' : 'bg-gray-200 text-gray-600'
                  }`}>{cnt}</span>
                )}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <CalendarDays size={18} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">No sessions here</p>
            <p className="text-xs text-gray-400 mt-1">
              {activeTab === 'active' ? 'No confirmed sessions at the moment.' : `No ${TABS.find(t => t.key === activeTab)?.label.toLowerCase()} sessions.`}
            </p>
          </div>
        ) : (
          <>
            <div className="p-4 space-y-3">
              {filtered.map((apt) => {
                const cfg         = STATUS_BADGE[apt.status] ?? { label: apt.status, cls: 'bg-gray-100 text-gray-600' };
                const isEval      = apt.status === 'EVALUATION';
                const isConfirmed = ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN'].includes(apt.status);
                const isHighRisk  = apt.risk_level && ['RED', 'CRITICAL'].includes(apt.risk_level.toUpperCase());
                const aptId       = apt.appointment_id;

                const cardCls = isHighRisk ? 'border-red-200 bg-red-50/20'
                              : isEval     ? 'border-amber-100 bg-amber-50/10'
                              : isConfirmed ? 'border-green-100 bg-white hover:border-green-200'
                              : 'border-gray-200 bg-white hover:border-gray-300';

                return (
                  <div key={aptId} className={`rounded-xl border p-4 transition-all ${cardCls}`}>
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">

                        {/* Badges */}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${cfg.cls}`}>
                            {cfg.label}
                          </span>
                          {apt.risk_level && apt.risk_level !== 'GREEN' && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${RISK_CLS[apt.risk_level.toUpperCase()] ?? ''}`}>
                              ⚠ {apt.risk_level}
                            </span>
                          )}
                        </div>

                        {/* Student name */}
                        <p className="font-semibold text-gray-900 text-sm">{apt.student_name}</p>

                        {/* Purpose + concern */}
                        <p className="text-xs text-gray-500 mt-0.5">
                          {fmtPurpose(apt.purpose)}
                          {apt.concern && <span className="text-gray-400"> · &ldquo;{apt.concern}&rdquo;</span>}
                        </p>

                        {/* Date + method */}
                        {apt.preferred_date && (
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <CalendarDays size={11} />
                              {fmtDate(apt.preferred_date)}{apt.preferred_time ? ` ${fmtTime(apt.preferred_date, apt.preferred_time)}` : ''}
                            </span>
                            <span>{fmtMethod(apt.method)}</span>
                          </div>
                        )}

                        {/* Student email + ID */}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {apt.student_email}
                          {apt.student_id_number && <span className="ml-2 text-gray-300">· {apt.student_id_number}</span>}
                        </p>

                        {/* Actions */}
                        {canManage && (
                          <div className="flex items-center gap-2 mt-3 flex-wrap">

                            {/* View detail */}
                            <button onClick={() => setDetailAppt(apt)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-lg transition">
                              <Eye size={11} /> View
                            </button>

                            {/* Join session */}
                            {apt.meeting_link && isConfirmed && (
                              <a href={apt.meeting_link} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1 text-xs text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 rounded-lg transition font-semibold">
                                <Video size={11} /> Join
                              </a>
                            )}

                            {/* Confirmed actions */}
                            {isConfirmed && (
                              <>
                                <button onClick={() => doAction(aptId, 'set-evaluation')}
                                  disabled={actioningId === aptId}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition">
                                  {actioningId === aptId ? <Loader2 size={11} className="animate-spin" /> : <Star size={11} />}
                                  Session Done
                                </button>
                                <button onClick={() => { setNoShowTarget(apt); setNoShowReason(''); }}
                                  className="flex items-center gap-1 px-2.5 py-1 border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 text-xs rounded-lg transition">
                                  No Show
                                </button>
                              </>
                            )}

                            {/* Post-session actions */}
                            {isEval && (
                              pendingAction?.aptId === aptId ? (
                                <div className="flex items-end gap-2">
                                  <div>
                                    <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Referral Notes</p>
                                    <textarea rows={1} value={pendingAction.notes}
                                      onChange={e => setPendingAction(p => p ? { ...p, notes: e.target.value } : p)}
                                      placeholder="Optional notes…"
                                      className="w-40 border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-green-500 resize-none" />
                                  </div>
                                  <button onClick={() => doAction(aptId, 'set-referral', { notes: pendingAction.notes })}
                                    disabled={actioningId === aptId}
                                    className="px-2.5 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition">
                                    {actioningId === aptId ? <Loader2 size={11} className="animate-spin" /> : 'Confirm'}
                                  </button>
                                  <button onClick={() => setPendingAction(null)}
                                    className="px-2.5 py-1 border border-gray-200 text-xs text-gray-500 rounded-lg hover:bg-gray-50 transition">
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button onClick={() => { setFollowUpTarget(apt); setFollowUpDate(''); setFollowUpTime(''); setFollowUpOffice(apt.meeting_link ? '' : ''); setFollowUpNotes(''); setFollowUpMsg(null); }}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-lg transition">
                                    <RefreshCw size={11} /> Schedule Follow-Up
                                  </button>
                                  <button onClick={() => setPendingAction({ aptId, action: 'referral', notes: '' })}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-lg transition">
                                    <ExternalLink size={11} /> Referral
                                  </button>
                                  <button onClick={() => doAction(aptId, 'complete')}
                                    disabled={actioningId === aptId}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 text-xs font-semibold rounded-lg transition disabled:opacity-50">
                                    {actioningId === aptId ? <Loader2 size={11} className="animate-spin" /> : <Archive size={11} />}
                                    Complete & Close
                                  </button>
                                </>
                              )
                            )}

                            {actionMsg?.id === aptId && !pendingAction && (
                              <p className={`text-xs ${actionMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
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
            <div className="px-5 py-3.5 bg-gray-50/60 border-t border-gray-100">
              <p className="text-xs text-gray-400">Showing <strong className="text-gray-600">{filtered.length}</strong> session{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          </>
        )}
      </div>

      {/* ── Detail Modal ──────────────────────────────────────────── */}
      {detailAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-sm text-gray-900">Session Details</h3>
              <button onClick={() => setDetailAppt(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={14} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Student</p>
                  <p className="text-sm font-medium text-gray-800">{detailAppt.student_name}</p>
                  <p className="text-xs text-gray-400">{detailAppt.student_email}</p>
                  {detailAppt.student_id_number && <p className="text-xs text-gray-400">{detailAppt.student_id_number}</p>}
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Status</p>
                  <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-medium ${(STATUS_BADGE[detailAppt.status] ?? { cls: 'bg-gray-100 text-gray-600' }).cls}`}>
                    {(STATUS_BADGE[detailAppt.status] ?? { label: detailAppt.status }).label}
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Date &amp; Time</p>
                <p className="text-sm text-gray-800">{fmtDate(detailAppt.preferred_date)} {fmtTime(detailAppt.preferred_date, detailAppt.preferred_time)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Session Type</p>
                  <p className="text-sm text-gray-800">{fmtPurpose(detailAppt.purpose)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Mode</p>
                  <p className="text-sm text-gray-800">{fmtMethod(detailAppt.method)}</p>
                </div>
              </div>
              {detailAppt.concern && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Concern</p>
                  <p className="text-sm text-gray-700">{detailAppt.concern}</p>
                </div>
              )}
              {detailAppt.risk_level && detailAppt.risk_level !== 'GREEN' && (
                <div className={`rounded-lg px-3 py-2 flex items-center gap-2 ${RISK_CLS[detailAppt.risk_level]}`}>
                  <AlertCircle size={14} />
                  <span className="text-xs font-semibold">Risk Level: {detailAppt.risk_level}</span>
                </div>
              )}
              {detailAppt.meeting_link && (
                <a href={detailAppt.meeting_link} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 hover:bg-green-100 transition font-medium">
                  <Video size={14} /> Join Session
                </a>
              )}

              {/* ── Intake / Triage Summary ── */}
              {intakeSummary && (intakeSummary.phq9_score != null || intakeSummary.gad7_score != null || intakeSummary.triage_decision) && (
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                    IC Triage Summary
                  </p>
                  <div className="p-3 space-y-2">
                    {(intakeSummary.phq9_score != null || intakeSummary.gad7_score != null) && (
                      <div className="grid grid-cols-2 gap-2">
                        {intakeSummary.phq9_score != null && (
                          <div className="bg-gray-50 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-gray-400 font-semibold">PHQ-9</p>
                            <p className="text-lg font-bold text-gray-900">{intakeSummary.phq9_score}<span className="text-xs text-gray-400">/27</span></p>
                          </div>
                        )}
                        {intakeSummary.gad7_score != null && (
                          <div className="bg-gray-50 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-gray-400 font-semibold">GAD-7</p>
                            <p className="text-lg font-bold text-gray-900">{intakeSummary.gad7_score}<span className="text-xs text-gray-400">/21</span></p>
                          </div>
                        )}
                      </div>
                    )}
                    {intakeSummary.triage_decision && (
                      <div className="text-xs text-gray-600">
                        <span className="font-semibold text-gray-500">Decision: </span>
                        {intakeSummary.triage_decision === 'ENDORSE_CC' && 'Endorsed to Counselor (CC)'}
                        {intakeSummary.triage_decision === 'ENDORSE_CP' && 'Endorsed to Psychologist (CP)'}
                        {intakeSummary.triage_decision === 'CLOSE_AT_INTAKE' && 'Closed at Intake'}
                      </div>
                    )}
                    {intakeSummary.endorsement_notes && (
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-[10px] text-gray-400 mb-0.5">IC Notes</p>
                        <p className="text-xs text-gray-700">{intakeSummary.endorsement_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── PHQ-4 Pre-Screen (from intake packet) ── */}
              {intakePacket?.phq4_summary && (
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                    PHQ-4 Pre-Screen
                  </p>
                  <div className="grid grid-cols-3 gap-2 p-3">
                    {[
                      { l: 'PHQ-2', s: intakePacket.phq4_summary.phq2_score, max: 6, risk: intakePacket.phq4_summary.phq2_at_risk },
                      { l: 'GAD-2', s: intakePacket.phq4_summary.gad2_score, max: 6, risk: intakePacket.phq4_summary.gad2_at_risk },
                      { l: 'Total', s: intakePacket.phq4_summary.total_score, max: 12, risk: intakePacket.phq4_summary.total_score >= 6 },
                    ].map(x => (
                      <div key={x.l} className={`rounded-lg p-2 text-center ${x.risk ? 'bg-red-50' : 'bg-green-50'}`}>
                        <p className="text-[10px] text-gray-500">{x.l}</p>
                        <p className={`text-base font-bold ${x.risk ? 'text-red-700' : 'text-green-700'}`}>
                          {x.s}<span className="text-[10px] font-normal text-gray-400">/{x.max}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Background info from ICF ── */}
              {intakePacket?.icf?.presenting_concern && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Presenting Concern (ICF)</p>
                  <p className="text-xs text-gray-700">{intakePacket.icf.presenting_concern}</p>
                </div>
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
      )}

      {/* ── No Show Modal ─────────────────────────────────────────── */}
      {noShowTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-sm text-gray-900">Mark as No Show</h3>
              <button onClick={() => setNoShowTarget(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={14} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Confirm that <strong>{noShowTarget.student_name}</strong> did not attend this session.
              </p>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Remarks <span className="font-normal normal-case text-gray-400">(optional)</span>
                </label>
                <textarea value={noShowReason} onChange={e => setNoShowReason(e.target.value)}
                  rows={2} placeholder="Any notes about this no-show…"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-red-300 focus:border-red-300 focus:outline-none resize-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setNoShowTarget(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button disabled={submittingNoShow}
                  onClick={async () => {
                    setSubmittingNoShow(true);
                    await doAction(noShowTarget.appointment_id, 'mark-no-show', { reason: noShowReason });
                    setNoShowTarget(null);
                    setSubmittingNoShow(false);
                  }}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2">
                  {submittingNoShow && <Loader2 size={13} className="animate-spin" />}
                  Confirm No Show
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Follow-Up Scheduling Modal ────────────────────────────── */}
      {followUpTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-sm text-gray-900">Schedule Follow-Up Session</h3>
                <p className="text-xs text-gray-400 mt-0.5">{followUpTarget.student_name}</p>
              </div>
              <button onClick={() => setFollowUpTarget(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={14} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                A new confirmed session will be created and linked to the same case. The student will see it in their upcoming sessions.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Date <span className="text-red-400">*</span></label>
                  <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Time <span className="text-red-400">*</span></label>
                  <input type="time" value={followUpTime} onChange={e => setFollowUpTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Office / Location <span className="font-normal normal-case text-gray-400">(optional)</span></label>
                <input type="text" value={followUpOffice} onChange={e => setFollowUpOffice(e.target.value)}
                  placeholder="e.g. Room 203, CPS Office"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 placeholder-gray-400 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Notes <span className="font-normal normal-case text-gray-400">(optional)</span></label>
                <textarea value={followUpNotes} onChange={e => setFollowUpNotes(e.target.value)}
                  rows={2} placeholder="Session notes or focus areas…"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 placeholder-gray-400 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 focus:outline-none resize-none" />
              </div>
              {followUpMsg && (
                <p className={`text-xs ${followUpMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{followUpMsg.text}</p>
              )}
              <div className="flex gap-2">
                <button onClick={() => setFollowUpTarget(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button onClick={doFollowUp}
                  disabled={submittingFollowUp || !followUpDate || !followUpTime}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2">
                  {submittingFollowUp && <Loader2 size={13} className="animate-spin" />}
                  Schedule Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardPageWrapper>
  );
}
