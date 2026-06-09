'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import {
  Loader2, Eye, Video, RotateCcw, Star, RefreshCw, ExternalLink,
  Archive, Clock, CheckCircle, CalendarDays, Users, X, AlertCircle,
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
  { key: 'all',        label: 'All',            icon: Clock },
  { key: 'confirmed',  label: 'Confirmed',       icon: CheckCircle },
  { key: 'evaluation', label: 'For Evaluation',  icon: Star },
  { key: 'follow_up',  label: 'Follow-Up',       icon: RefreshCw },
  { key: 'referral',   label: 'Referral',        icon: Users },
  { key: 'completed',  label: 'Completed',       icon: Archive },
  { key: 'cancelled',  label: 'Cancelled',       icon: X },
] as const;
type TabKey = typeof TABS[number]['key'];

const TAB_STATUSES: Record<TabKey, string[]> = {
  all:        [],
  confirmed:  ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN', 'PENDING_APPROVAL'],
  evaluation: ['EVALUATION'],
  follow_up:  ['FOLLOW_UP'],
  referral:   ['REFERRAL'],
  completed:  ['COMPLETED'],
  cancelled:  ['CANCELLED', 'DENIED', 'NO_SHOW'],
};

const TAB_ACTIVE: Record<TabKey, string> = {
  all:        'bg-gray-100 text-gray-800 border-b-2 border-gray-500',
  confirmed:  'bg-green-50 text-[#1a5228] border-b-2 border-[#1a5228]',
  evaluation: 'bg-amber-50 text-amber-700 border-b-2 border-amber-500',
  follow_up:  'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500',
  referral:   'bg-purple-50 text-purple-700 border-b-2 border-purple-500',
  completed:  'bg-gray-100 text-gray-600 border-b-2 border-gray-400',
  cancelled:  'bg-red-50 text-red-600 border-b-2 border-red-400',
};

const TAB_ICON: Record<TabKey, string> = {
  all:        'text-gray-500',
  confirmed:  'text-[#1a5228]',
  evaluation: 'text-amber-600',
  follow_up:  'text-indigo-600',
  referral:   'text-purple-600',
  completed:  'text-gray-400',
  cancelled:  'text-red-500',
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING_APPROVAL: { label: 'Pending',        cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  APPROVED:         { label: 'Confirmed',       cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  MATCHED:          { label: 'Confirmed',       cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  CONFIRMED:        { label: 'Confirmed',       cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  CHECKED_IN:       { label: 'Checked In',      cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  EVALUATION:       { label: 'For Evaluation',  cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-300' },
  FOLLOW_UP:        { label: 'Follow-Up',       cls: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' },
  REFERRAL:         { label: 'Referral',        cls: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' },
  COMPLETED:        { label: 'Completed',       cls: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
  CANCELLED:        { label: 'Cancelled',       cls: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
  DENIED:           { label: 'Denied',          cls: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
  NO_SHOW:          { label: 'No Show',         cls: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
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
  return p ? p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';
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
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);

  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ id: string; type: 'ok' | 'err'; text: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<{ aptId: string; action: 'follow_up' | 'referral'; notes: string } | null>(null);

  // No-show modal
  const [noShowTarget, setNoShowTarget] = useState<Appointment | null>(null);
  const [noShowReason, setNoShowReason] = useState('');
  const [submittingNoShow, setSubmittingNoShow] = useState(false);

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

  // If role is staff/IC, redirect to the assignment page
  useEffect(() => {
    if (!user) return;
    const role = user.role?.toUpperCase();
    if (['STAFF', 'ADMIN', 'IC'].includes(role)) {
      router.replace('/appointment-requests');
    }
  }, [user]);

  const apts = Array.isArray(dashboard?.appointments) ? dashboard!.appointments! : [];

  const filtered = activeTab === 'all'
    ? apts
    : apts.filter(a => TAB_STATUSES[activeTab].includes(a.status));

  const counts = Object.fromEntries(
    TABS.map(t => [
      t.key,
      t.key === 'all' ? apts.length : apts.filter(a => TAB_STATUSES[t.key as TabKey].includes(a.status)).length,
    ])
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
          'set-evaluation': 'Session marked done — student will be prompted to evaluate.',
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
            { label: 'Total', value: dashboard.summary.total_appointments ?? apts.length, cls: 'text-gray-800' },
            { label: 'Confirmed', value: dashboard.summary.confirmed ?? 0, cls: 'text-[#1a5228]' },
            { label: 'For Evaluation', value: dashboard.summary.awaiting_evaluation ?? 0, cls: 'text-amber-600' },
            { label: 'Follow-Up', value: (dashboard.summary.follow_up ?? 0) + (dashboard.summary.referral ?? 0), cls: 'text-indigo-600' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">{c.label}</p>
              <p className={`text-2xl font-semibold ${c.cls}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Evaluation reminder */}
      {counts.evaluation > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm">
          <Star size={15} className="text-amber-500 flex-shrink-0" />
          <span className="text-amber-800 font-medium">
            {counts.evaluation} session{counts.evaluation > 1 ? 's' : ''} awaiting your decision — set Follow-Up, Referral, or Complete.
          </span>
          <button onClick={() => setActiveTab('evaluation')}
            className="ml-auto text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900">
            View
          </button>
        </div>
      )}

      {/* Tab + table card */}
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
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <CalendarDays size={22} className="text-gray-400" />
            </div>
            <p className="text-base font-medium text-gray-600">No records found</p>
            <p className="text-sm text-gray-400 mt-1">No sessions in this category.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-8">#</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Student</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Purpose</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Mode</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Risk</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    {canManage && (
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((apt, i) => {
                    const cfg = STATUS_BADGE[apt.status] ?? { label: apt.status, cls: 'bg-gray-100 text-gray-600' };
                    const isEval = apt.status === 'EVALUATION';
                    const isConfirmed = ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN'].includes(apt.status);
                    const aptId = apt.appointment_id;

                    return (
                      <tr key={aptId} className={`border-b border-gray-50 transition-colors ${
                        isEval ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-gray-50/80'
                      }`}>
                        <td className="px-5 py-4 text-gray-400 text-sm">{i + 1}.</td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900 text-sm">{apt.student_name}</p>
                          <p className="text-xs text-gray-400">{apt.student_email}</p>
                          {apt.student_id_number && <p className="text-xs text-gray-400">{apt.student_id_number}</p>}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-700">{fmtDate(apt.preferred_date)}</p>
                          <p className="text-xs text-gray-400">{fmtTime(apt.preferred_date, apt.preferred_time)}</p>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-700">{fmtPurpose(apt.purpose)}</td>
                        <td className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap">{fmtMethod(apt.method)}</td>
                        <td className="px-5 py-4">
                          {apt.risk_level && apt.risk_level !== 'GREEN' ? (
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${RISK_CLS[apt.risk_level] ?? 'bg-gray-100 text-gray-600'}`}>
                              {apt.risk_level}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <span className={`inline-flex items-center whitespace-nowrap text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>
                            {cfg.label}
                          </span>
                        </td>
                        {canManage && (
                          <td className="px-5 py-4 align-top">
                            <div className="space-y-1.5">
                              {/* View + Join */}
                              <div className="flex gap-1">
                                <button onClick={() => setDetailAppt(apt)} title="View"
                                  className="p-2 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
                                  <Eye size={16} />
                                </button>
                                {apt.meeting_link && isConfirmed && (
                                  <a href={apt.meeting_link} target="_blank" rel="noreferrer" title="Join"
                                    className="p-2 rounded-md hover:bg-green-50 text-green-600 transition">
                                    <Video size={16} />
                                  </a>
                                )}
                              </div>

                              {/* Session Done + No Show — CONFIRMED state */}
                              {isConfirmed && (
                                <div className="flex flex-col gap-1">
                                  <button
                                    onClick={() => doAction(aptId, 'set-evaluation')}
                                    disabled={actioningId === aptId}
                                    className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold rounded-md transition"
                                  >
                                    {actioningId === aptId ? <Loader2 size={11} className="animate-spin" /> : <Star size={11} />}
                                    Session Done
                                  </button>
                                  <button
                                    onClick={() => { setNoShowTarget(apt); setNoShowReason(''); }}
                                    className="inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-1 border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 text-xs rounded-md transition"
                                  >
                                    No Show
                                  </button>
                                </div>
                              )}

                              {/* EVALUATION state: Follow-Up / Referral / Complete */}
                              {isEval && (
                                pendingAction?.aptId === aptId ? (
                                  <div className="space-y-1 min-w-[180px]">
                                    <p className="text-xs font-semibold text-gray-500 uppercase">
                                      {pendingAction.action === 'follow_up' ? 'Follow-Up Notes' : 'Referral Notes'}
                                    </p>
                                    <textarea
                                      rows={2}
                                      value={pendingAction.notes}
                                      onChange={e => setPendingAction(p => p ? { ...p, notes: e.target.value } : p)}
                                      placeholder="Optional notes…"
                                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs bg-white focus:ring-1 focus:ring-green-500 resize-none"
                                    />
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => doAction(aptId, pendingAction.action === 'follow_up' ? 'set-follow-up' : 'set-referral', { notes: pendingAction.notes })}
                                        disabled={actioningId === aptId}
                                        className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded transition flex items-center justify-center gap-1"
                                      >
                                        {actioningId === aptId && <Loader2 size={11} className="animate-spin" />}
                                        Confirm
                                      </button>
                                      <button onClick={() => setPendingAction(null)}
                                        className="flex-1 py-1.5 border border-gray-200 text-xs text-gray-500 rounded hover:bg-gray-50 transition">
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={() => setPendingAction({ aptId, action: 'follow_up', notes: '' })}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-lg transition"
                                    >
                                      <RefreshCw size={12} /> Follow-Up
                                    </button>
                                    <button
                                      onClick={() => setPendingAction({ aptId, action: 'referral', notes: '' })}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-lg transition"
                                    >
                                      <ExternalLink size={12} /> Referral
                                    </button>
                                    <button
                                      onClick={() => doAction(aptId, 'complete')}
                                      disabled={actioningId === aptId}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                                    >
                                      {actioningId === aptId ? <Loader2 size={12} className="animate-spin" /> : <Archive size={12} />}
                                      Complete
                                    </button>
                                  </div>
                                )
                              )}

                              {/* Action feedback */}
                              {actionMsg?.id === aptId && !pendingAction && (
                                <p className={`text-xs ${actionMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                                  {actionMsg.text}
                                </p>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100">
              <p className="text-xs text-gray-400">Showing {filtered.length} {filtered.length === 1 ? 'record' : 'records'}</p>
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
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Purpose</p>
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
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Remarks <span className="font-normal normal-case text-gray-400">(optional)</span></label>
                <textarea value={noShowReason} onChange={e => setNoShowReason(e.target.value)}
                  rows={2} placeholder="Any notes about this no-show…"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-red-300 focus:border-red-300 focus:outline-none resize-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setNoShowTarget(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button
                  disabled={submittingNoShow}
                  onClick={async () => {
                    setSubmittingNoShow(true);
                    await doAction(noShowTarget.appointment_id, 'mark-no-show', { reason: noShowReason });
                    setNoShowTarget(null);
                    setSubmittingNoShow(false);
                  }}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2"
                >
                  {submittingNoShow && <Loader2 size={13} className="animate-spin" />}
                  Confirm No Show
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardPageWrapper>
  );
}
