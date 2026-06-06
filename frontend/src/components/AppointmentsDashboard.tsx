'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock, CheckCircle, AlertCircle, UserCheck, MessageSquare,
  ChevronDown, ChevronUp, Plus, X, Search, Loader2, RefreshCw,
  ExternalLink, Archive, Star, CalendarDays, Users, Send, Filter,
} from 'lucide-react';
import { api } from '@/utils/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Appointment {
  appointment_id: string;
  student_name: string;
  student_email: string;
  counselor_name: string;
  counselor_id?: string;
  status: string;
  purpose: string;
  concern: string;
  preferred_date: string;
  preferred_time?: string;
  method: string;
  created_at: string;
  risk_level?: string;
}

interface DashboardData {
  role: string;
  user_name: string;
  appointments?: Appointment[];
  summary?: any;
  can_assign_counselor?: boolean;
  can_manage_sessions?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'all',        label: 'All' },
  { key: 'new',        label: 'New Requests' },
  { key: 'confirmed',  label: 'Confirmed' },
  { key: 'evaluation', label: 'For Evaluation' },
  { key: 'followup',   label: 'Follow-Up / Referral' },
  { key: 'done',       label: 'Closed' },
] as const;
type TabKey = typeof TABS[number]['key'];

const TAB_STATUSES: Record<TabKey, string[]> = {
  all:        [],
  new:        ['REQUESTED', 'PENDING_APPROVAL'],
  confirmed:  ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN'],
  evaluation: ['EVALUATION'],
  followup:   ['FOLLOW_UP', 'REFERRAL'],
  done:       ['COMPLETED', 'CANCELLED', 'DENIED', 'NO_SHOW', 'RESCHEDULED'],
};

const STATUS_LABEL: Record<string, string> = {
  REQUESTED:            'New Request',
  PENDING_APPROVAL:     'Pending Approval',
  CONFIRMED:            'Confirmed',
  APPROVED:             'Confirmed',
  MATCHED:              'Confirmed',
  CHECKED_IN:           'Checked In',
  EVALUATION:           'For Evaluation',
  FOLLOW_UP:            'Follow-Up',
  REFERRAL:             'Referral',
  COMPLETED:            'Completed',
  CANCELLED:            'Cancelled',
  DENIED:               'Denied',
  NO_SHOW:              'No Show',
  RESCHEDULE_REQUESTED: 'Reschedule Pending',
  RESCHEDULED:          'Rescheduled',
};

const STATUS_BADGE: Record<string, string> = {
  REQUESTED:            'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  PENDING_APPROVAL:     'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  RESCHEDULE_REQUESTED: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  CONFIRMED:            'bg-green-50 text-green-700 ring-1 ring-green-200',
  APPROVED:             'bg-green-50 text-green-700 ring-1 ring-green-200',
  MATCHED:              'bg-green-50 text-green-700 ring-1 ring-green-200',
  CHECKED_IN:           'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  EVALUATION:           'bg-amber-50 text-amber-700 ring-1 ring-amber-300',
  FOLLOW_UP:            'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  REFERRAL:             'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  COMPLETED:            'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
  CANCELLED:            'bg-red-50 text-red-600 ring-1 ring-red-200',
  DENIED:               'bg-red-50 text-red-600 ring-1 ring-red-200',
  NO_SHOW:              'bg-red-50 text-red-600 ring-1 ring-red-200',
};

const RISK_BADGE: Record<string, string> = {
  YELLOW:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  RED:      'bg-red-50 text-red-700 ring-1 ring-red-200',
  CRITICAL: 'bg-red-100 text-red-900 ring-1 ring-red-300 font-semibold',
};

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return d; }
}
function fmtTime(d?: string, t?: string) {
  if (t) {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  }
  if (!d) return '';
  try {
    const dt = new Date(d);
    return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return ''; }
}
function fmtMethod(m?: string) {
  if (!m) return '—';
  if (m === 'in-person' || m === 'in_person') return 'Face to Face';
  if (m === 'google-meet' || m === 'google_meet') return 'Google Meet';
  return m.charAt(0).toUpperCase() + m.slice(1);
}
function fmtPurpose(p?: string) {
  return p ? p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AppointmentsDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [counselors, setCounselors] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [search, setSearch]       = useState('');

  // Assign counselor modal
  const [assignTarget, setAssignTarget] = useState<Appointment | null>(null);
  const [assignForm, setAssignForm]     = useState({ counselorId: '', date: '', time: '' });
  const [assigningId, setAssigningId]   = useState<string | null>(null);
  const [assignMsg, setAssignMsg]       = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Session actions
  const [pendingAction, setPendingAction] = useState<{ aptId: string; action: 'follow_up' | 'referral'; notes: string } | null>(null);
  const [actioningId, setActioningId]     = useState<string | null>(null);
  const [actionMsg, setActionMsg]         = useState<{ id: string; type: 'ok' | 'err'; text: string } | null>(null);

  // Check-ins expansion
  const [checkinRow, setCheckinRow]     = useState<string | null>(null);
  const [checkinData, setCheckinData]   = useState<Record<string, any[]>>({});

  // Schedule-for-student modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [studentQuery, setStudentQuery]           = useState('');
  const [studentResults, setStudentResults]       = useState<any[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent]     = useState<any | null>(null);
  const [schedPurpose, setSchedPurpose]           = useState('counseling');
  const [schedConcern, setSchedConcern]           = useState('');
  const [schedMethod, setSchedMethod]             = useState('in-person');
  const [schedCounselor, setSchedCounselor]       = useState('');
  const [schedDate, setSchedDate]                 = useState('');
  const [schedTime, setSchedTime]                 = useState('');
  const [submittingSchedule, setSubmittingSchedule] = useState(false);
  const [scheduleMsg, setScheduleMsg]             = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const r = await fetch(api('/api/appointments/dashboard/role-view'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error('Failed to fetch');
      const data = await r.json();
      setDashboard(data);
      if (data.can_assign_counselor) fetchCounselors(token!);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally { setLoading(false); }
  };

  const fetchCounselors = async (token: string) => {
    try {
      const r = await fetch(api('/api/users?role=COUNSELOR'), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setCounselors(d.users || []); }
    } catch {}
  };

  const handleAssign = async () => {
    if (!assignTarget) return;
    if (!assignForm.counselorId || !assignForm.date || !assignForm.time) {
      setAssignMsg({ type: 'err', text: 'Select counselor, date, and time.' });
      return;
    }
    setAssigningId(assignTarget.appointment_id);
    setAssignMsg(null);
    try {
      const token = localStorage.getItem('token');
      const start = new Date(`${assignForm.date}T${assignForm.time}:00`);
      const end   = new Date(start.getTime() + 60 * 60 * 1000);
      const r = await fetch(api(`/api/appointments/${assignTarget.appointment_id}/match-counselor`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ counselor_id: assignForm.counselorId, scheduled_start: start.toISOString(), scheduled_end: end.toISOString() }),
      });
      if (r.ok) {
        setAssignMsg({ type: 'ok', text: 'Counselor assigned and appointment confirmed.' });
        setTimeout(() => { setAssignTarget(null); fetchDashboard(); }, 1000);
      } else {
        const e = await r.json();
        setAssignMsg({ type: 'err', text: e.error || 'Failed to assign.' });
      }
    } finally { setAssigningId(null); }
  };

  const doSessionAction = async (aptId: string, endpoint: string, body?: object) => {
    setActioningId(aptId);
    setActionMsg(null);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/appointments/${aptId}/${endpoint}`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const msgs: Record<string, string> = {
        'set-evaluation': 'Marked as done — student will be prompted to evaluate.',
        'set-follow-up':  'Marked as Follow-Up.',
        'set-referral':   'Marked as Referral.',
        'complete':       'Marked as Completed.',
      };
      if (r.ok) {
        setActionMsg({ id: aptId, type: 'ok', text: msgs[endpoint] ?? 'Done.' });
        setPendingAction(null);
        setTimeout(() => fetchDashboard(), 800);
      } else {
        const e = await r.json();
        setActionMsg({ id: aptId, type: 'err', text: e.error || 'Action failed.' });
      }
    } finally { setActioningId(null); }
  };

  const toggleCheckins = async (aptId: string) => {
    if (checkinRow === aptId) { setCheckinRow(null); return; }
    setCheckinRow(aptId);
    if (!checkinData[aptId]) {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/check-ins/for-appointment/${aptId}`), { headers: { Authorization: `Bearer ${token}` } });
      const d = r.ok ? await r.json() : { check_ins: [] };
      setCheckinData(prev => ({ ...prev, [aptId]: d.check_ins || [] }));
    }
  };

  const searchStudents = async (q: string) => {
    setStudentQuery(q);
    if (q.trim().length < 2) { setStudentResults([]); return; }
    setSearchingStudents(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/users?role=STUDENT&q=${encodeURIComponent(q)}`), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setStudentResults(d.users || []); }
    } finally { setSearchingStudents(false); }
  };

  const handleScheduleSubmit = async () => {
    if (!selectedStudent) { setScheduleMsg({ type: 'err', text: 'Select a student first.' }); return; }
    setSubmittingSchedule(true); setScheduleMsg(null);
    try {
      const token = localStorage.getItem('token');
      const body: any = { student_id: selectedStudent._id, purpose: schedPurpose, concern: schedConcern, preferred_method: schedMethod };
      if (schedCounselor) body.counselor_id = schedCounselor;
      if (schedDate) body.preferred_date = schedDate;
      if (schedTime) body.preferred_time = schedTime;
      const r = await fetch(api('/api/appointments/staff/schedule-for-student'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (r.ok) {
        setScheduleMsg({ type: 'ok', text: `Appointment created (${d.status}).` });
        setTimeout(() => { setShowScheduleModal(false); resetScheduleForm(); fetchDashboard(); }, 1100);
      } else { setScheduleMsg({ type: 'err', text: d.error || 'Failed to create appointment.' }); }
    } finally { setSubmittingSchedule(false); }
  };

  const resetScheduleForm = () => {
    setSelectedStudent(null); setStudentQuery(''); setStudentResults([]);
    setSchedPurpose('counseling'); setSchedConcern(''); setSchedMethod('in-person');
    setSchedCounselor(''); setSchedDate(''); setSchedTime(''); setScheduleMsg(null);
  };

  // ── Derived data ──────────────────────────────────────────────────────────────
  const apts = dashboard?.appointments ?? [];
  const sortedApts = [...apts].sort((a, b) => {
    const p: Record<string, number> = { REQUESTED: 0, PENDING_APPROVAL: 1, EVALUATION: 2, CONFIRMED: 3, APPROVED: 3, MATCHED: 3, CHECKED_IN: 3 };
    return (p[a.status] ?? 9) - (p[b.status] ?? 9);
  });

  const filtered = sortedApts.filter(a => {
    const matchTab = activeTab === 'all' || TAB_STATUSES[activeTab].includes(a.status);
    const t = search.toLowerCase();
    const matchSearch = !t || [a.student_name, a.student_email, a.counselor_name, a.purpose, a.concern]
      .some(v => v?.toLowerCase().includes(t));
    return matchTab && matchSearch;
  });

  const counts = Object.fromEntries(
    TABS.map(t => [
      t.key,
      t.key === 'all' ? apts.length : apts.filter(a => TAB_STATUSES[t.key as TabKey].includes(a.status)).length,
    ])
  ) as Record<TabKey, number>;

  const newCount       = counts.new;
  const evalCount      = counts.evaluation;
  const confirmedCount = counts.confirmed;
  const pendingReschedules = dashboard?.summary?.pending_reschedules ?? 0;
  const canAssign      = dashboard?.can_assign_counselor ?? false;
  const canManage      = dashboard?.can_manage_sessions ?? false;
  const showActions    = canAssign || canManage;

  // ── Loading / Error ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 gap-2 text-gray-400 text-sm">
        <Loader2 size={16} className="animate-spin" /> Loading appointments…
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
        <AlertCircle size={14} /> {error || 'No data available.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Summary strip ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard icon={CalendarDays} label="Total" value={dashboard.summary?.total_appointments ?? apts.length} cls="text-gray-800" />
        <SummaryCard icon={AlertCircle}  label="New Requests" value={newCount}
          cls={newCount > 0 ? 'text-amber-600' : 'text-gray-400'} highlight={newCount > 0} />
        <SummaryCard icon={CheckCircle}  label="Confirmed" value={confirmedCount} cls="text-[#1a5228]" />
        <SummaryCard icon={Star}         label="For Evaluation" value={evalCount}
          cls={evalCount > 0 ? 'text-amber-600' : 'text-gray-400'} highlight={evalCount > 0} />
      </div>

      {/* ── Action banners ────────────────────────────────────────────────── */}
      {canAssign && newCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
          <span className="text-amber-800">
            <strong>{newCount}</strong> new appointment{newCount !== 1 ? 's' : ''} need a counselor assigned.
          </span>
          <button onClick={() => setActiveTab('new')}
            className="ml-auto text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900">
            Review
          </button>
        </div>
      )}
      {evalCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
          <Star size={14} className="text-amber-500 flex-shrink-0" />
          <span className="text-amber-800">
            <strong>{evalCount}</strong> appointment{evalCount !== 1 ? 's' : ''} awaiting Follow-Up, Referral, or Completion.
          </span>
          <button onClick={() => setActiveTab('evaluation')}
            className="ml-auto text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900">
            Review
          </button>
        </div>
      )}
      {pendingReschedules > 0 && (
        <a href="/reschedule-requests"
          className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm hover:bg-orange-100 transition">
          <RefreshCw size={14} className="text-orange-500 flex-shrink-0" />
          <span className="text-orange-800">
            <strong>{pendingReschedules}</strong> student{pendingReschedules !== 1 ? 's' : ''} requested to reschedule.
          </span>
          <span className="ml-auto text-xs font-semibold text-orange-700 underline underline-offset-2">Review →</span>
        </a>
      )}

      {/* ── Table card ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Appointments</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none w-44"
              />
            </div>
            <button
              onClick={() => { resetScheduleForm(); setShowScheduleModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition"
              style={{ backgroundColor: '#1a5228' }}
            >
              <Plus size={15} /> Schedule for Student
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-end overflow-x-auto border-b border-gray-100 px-2 pt-1.5 gap-0.5 scrollbar-hide">
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const cnt = counts[tab.key];
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium rounded-t-lg transition-all whitespace-nowrap relative flex-shrink-0 ${
                  isActive
                    ? 'bg-[#1a5228]/5 text-[#1a5228] border-b-2 border-[#1a5228]'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}>
                {tab.label}
                {cnt > 0 && (
                  <span className={`text-[10px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-1 ${
                    isActive ? 'bg-[#1a5228] text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <CalendarDays size={18} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">No appointments found</p>
            <p className="text-xs text-gray-400 mt-1">Try a different tab or search term.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-10">#</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider min-w-[160px]">Student</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider min-w-[140px]">Counselor</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider min-w-[160px]">Purpose</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider min-w-[130px]">Date / Time</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider min-w-[110px]">Mode</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider min-w-[130px]">Status</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider min-w-[90px]">Check-ins</th>
                    {showActions && <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider min-w-[160px]">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((apt, i) => {
                    const badgeCls = STATUS_BADGE[apt.status] ?? 'bg-gray-100 text-gray-500 ring-1 ring-gray-200';
                    const isNew      = apt.status === 'REQUESTED' || apt.status === 'PENDING_APPROVAL';
                    const isConfirmed = ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN'].includes(apt.status);
                    const isEval     = apt.status === 'EVALUATION';
                    const isHighRisk = apt.risk_level && ['RED', 'CRITICAL'].includes(apt.risk_level.toUpperCase());
                    const rowCls = isNew ? 'bg-amber-50/30 hover:bg-amber-50/60'
                      : isEval ? 'bg-amber-50/40 hover:bg-amber-50/70'
                      : isHighRisk ? 'bg-red-50/30 hover:bg-red-50/60'
                      : 'hover:bg-gray-50/60';

                    return (
                      <React.Fragment key={apt.appointment_id}>
                        <tr className={`border-b border-gray-100 transition-colors ${rowCls}`}>
                          <td className="px-5 py-4 text-gray-400 text-xs align-middle">{i + 1}.</td>
                          <td className="px-5 py-4 align-middle">
                            <p className="font-semibold text-gray-900 text-sm leading-snug">{apt.student_name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{apt.student_email}</p>
                          </td>
                          <td className="px-5 py-4 align-middle">
                            {apt.counselor_name && apt.counselor_name !== 'Not Assigned'
                              ? <span className="text-sm text-gray-700">{apt.counselor_name}</span>
                              : <span className="text-xs text-gray-300 italic">Unassigned</span>}
                          </td>
                          <td className="px-5 py-4 align-middle">
                            <p className="text-sm text-gray-700">{fmtPurpose(apt.purpose)}</p>
                            {apt.concern && (
                              <p className="text-xs text-gray-400 truncate max-w-[180px] mt-0.5">"{apt.concern}"</p>
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap align-middle">
                            <p className="text-sm text-gray-700">{fmtDate(apt.preferred_date)}</p>
                            {(apt.preferred_time || apt.preferred_date) && (
                              <p className="text-xs text-gray-400 mt-0.5">{fmtTime(apt.preferred_date, apt.preferred_time)}</p>
                            )}
                          </td>
                          <td className="px-5 py-4 align-middle">
                            <span className="inline-flex items-center whitespace-nowrap text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md font-medium">
                              {fmtMethod(apt.method)}
                            </span>
                          </td>
                          <td className="px-5 py-4 align-middle">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`inline-flex items-center whitespace-nowrap text-xs px-2 py-0.5 rounded-full font-medium ${badgeCls}`}>
                                {STATUS_LABEL[apt.status] ?? apt.status.replace(/_/g, ' ')}
                              </span>
                              {apt.risk_level && apt.risk_level !== 'GREEN' && (
                                <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${RISK_BADGE[apt.risk_level.toUpperCase()] ?? ''}`}>
                                  ⚠ {apt.risk_level}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 align-middle">
                            <button
                              onClick={() => toggleCheckins(apt.appointment_id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                            >
                              <MessageSquare size={13} />
                              {checkinData[apt.appointment_id]
                                ? checkinData[apt.appointment_id].length
                                : <span className="text-gray-400">View</span>}
                              {checkinRow === apt.appointment_id
                                ? <ChevronUp size={13} />
                                : <ChevronDown size={13} />}
                            </button>
                          </td>

                          {/* Actions */}
                          {showActions && (
                            <td className="px-5 py-4 align-middle">
                              <div className="space-y-1.5">
                                {/* Assign counselor */}
                                {canAssign && isNew && (
                                  <button
                                    onClick={() => {
                                      setAssignTarget(apt);
                                      setAssignForm({
                                        counselorId: '',
                                        date: apt.preferred_date ? apt.preferred_date.split('T')[0] : '',
                                        time: apt.preferred_time || '',
                                      });
                                      setAssignMsg(null);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition"
                                    style={{ backgroundColor: '#1a5228' }}
                                  >
                                    <UserCheck size={15} /> Assign Counselor
                                  </button>
                                )}

                                {/* Session done */}
                                {isConfirmed && (canAssign || canManage) && (
                                  <button
                                    onClick={() => doSessionAction(apt.appointment_id, 'set-evaluation')}
                                    disabled={actioningId === apt.appointment_id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
                                  >
                                    {actioningId === apt.appointment_id
                                      ? <Loader2 size={15} className="animate-spin" />
                                      : <Star size={15} />}
                                    Session Done
                                  </button>
                                )}

                                {/* Evaluation actions */}
                                {isEval && (canAssign || canManage) && (
                                  pendingAction?.aptId === apt.appointment_id ? (
                                    <div className="space-y-1 min-w-[160px]">
                                      <p className="text-[10px] font-semibold text-gray-500 uppercase">
                                        {pendingAction.action === 'follow_up' ? 'Follow-Up Notes' : 'Referral Notes'}
                                      </p>
                                      <textarea
                                        rows={2}
                                        value={pendingAction.notes}
                                        onChange={e => setPendingAction(p => p ? { ...p, notes: e.target.value } : p)}
                                        placeholder="Optional notes…"
                                        className="w-full border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-green-500 resize-none"
                                      />
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => doSessionAction(
                                            apt.appointment_id,
                                            pendingAction.action === 'follow_up' ? 'set-follow-up' : 'set-referral',
                                            { notes: pendingAction.notes }
                                          )}
                                          disabled={actioningId === apt.appointment_id}
                                          className="flex-1 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded transition flex items-center justify-center gap-1"
                                        >
                                          {actioningId === apt.appointment_id && <Loader2 size={15} className="animate-spin" />}
                                          Confirm
                                        </button>
                                        <button onClick={() => setPendingAction(null)}
                                          className="flex-1 py-1 border border-gray-200 text-xs text-gray-500 rounded hover:bg-gray-50 transition">
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-1">
                                      <button
                                        onClick={() => setPendingAction({ aptId: apt.appointment_id, action: 'follow_up', notes: '' })}
                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-lg transition"
                                      >
                                        <RefreshCw size={15} /> Follow-Up
                                      </button>
                                      <button
                                        onClick={() => setPendingAction({ aptId: apt.appointment_id, action: 'referral', notes: '' })}
                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-lg transition"
                                      >
                                        <ExternalLink size={15} /> Referral
                                      </button>
                                      <button
                                        onClick={() => doSessionAction(apt.appointment_id, 'complete')}
                                        disabled={actioningId === apt.appointment_id}
                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                                      >
                                        {actioningId === apt.appointment_id
                                          ? <Loader2 size={15} className="animate-spin" />
                                          : <Archive size={15} />}
                                        Complete
                                      </button>
                                    </div>
                                  )
                                )}

                                {/* Action feedback */}
                                {actionMsg?.id === apt.appointment_id && !pendingAction && (
                                  <p className={`text-xs ${actionMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                                    {actionMsg.text}
                                  </p>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>

                        {/* Check-ins expansion row */}
                        {checkinRow === apt.appointment_id && (
                          <tr className="bg-gray-50/60 border-b border-gray-100">
                            <td colSpan={showActions ? 9 : 8} className="px-8 py-3">
                              {!checkinData[apt.appointment_id] ? (
                                <span className="text-xs text-gray-400">Loading…</span>
                              ) : checkinData[apt.appointment_id].length === 0 ? (
                                <span className="text-xs text-gray-400 italic">No check-ins submitted yet.</span>
                              ) : (
                                <div className="space-y-1.5">
                                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Student Check-ins</p>
                                  {checkinData[apt.appointment_id].map((c: any) => {
                                    const emoji: Record<string, string> = { DOING_WELL: '😊', MANAGING: '😐', STRUGGLING: '😔', IN_CRISIS: '😰' };
                                    return (
                                      <div key={c._id} className="flex items-start gap-3 text-xs bg-white rounded-lg px-3 py-2 border border-gray-100">
                                        <span>{emoji[c.status] ?? '📝'}</span>
                                        <div className="flex-1">
                                          <span className="font-medium text-gray-800">{c.status?.replace(/_/g, ' ')}</span>
                                          {c.wellness_rating && <span className="text-gray-400 ml-2">· {c.wellness_rating}/10</span>}
                                          {c.notes && <p className="text-gray-500 mt-0.5">{c.notes}</p>}
                                        </div>
                                        <span className="text-gray-400 whitespace-nowrap">
                                          {c.submitted_at ? new Date(c.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3.5 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">Showing <strong className="text-gray-600">{filtered.length}</strong> of {apts.length} appointments</p>
              {filtered.length < apts.length && (
                <button onClick={() => setActiveTab('all')} className="text-xs text-[#1a5228] hover:underline">Show all</button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Assign Counselor Modal ────────────────────────────────────────── */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-sm text-gray-900">Assign Counselor</h3>
                <p className="text-xs text-gray-400 mt-0.5">{assignTarget.student_name}</p>
              </div>
              <button onClick={() => setAssignTarget(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={14} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Student info */}
              <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                <div className="flex gap-2">
                  <span className="text-gray-400 w-16">Purpose</span>
                  <span className="text-gray-700 font-medium">{fmtPurpose(assignTarget.purpose)}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-16">Preferred</span>
                  <span className="text-gray-700">{fmtDate(assignTarget.preferred_date)} {fmtTime(assignTarget.preferred_date, assignTarget.preferred_time)}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-16">Mode</span>
                  <span className="text-gray-700">{fmtMethod(assignTarget.method)}</span>
                </div>
                {assignTarget.concern && (
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-16">Concern</span>
                    <span className="text-gray-600 italic">"{assignTarget.concern}"</span>
                  </div>
                )}
              </div>

              {/* Counselor */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Counselor <span className="text-red-400 normal-case font-normal">*</span>
                </label>
                <select value={assignForm.counselorId} onChange={e => setAssignForm(f => ({ ...f, counselorId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none">
                  <option value="">Select a counselor…</option>
                  {counselors.map(c => (
                    <option key={c._id} value={c._id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Confirmed Date <span className="text-red-400 normal-case font-normal">*</span>
                  </label>
                  <input type="date" value={assignForm.date} onChange={e => setAssignForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Time <span className="text-red-400 normal-case font-normal">*</span>
                  </label>
                  <input type="time" value={assignForm.time} onChange={e => setAssignForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none" />
                </div>
              </div>

              {assignMsg && (
                <p className={`text-xs px-3 py-2 rounded-lg ${assignMsg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {assignMsg.text}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={() => setAssignTarget(null)}
                  className="flex-1 px-4 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button onClick={handleAssign}
                  disabled={assigningId === assignTarget.appointment_id || !assignForm.counselorId || !assignForm.date || !assignForm.time}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#1a5228' }}>
                  {assigningId === assignTarget.appointment_id
                    ? <><Loader2 size={14} className="animate-spin" /> Assigning…</>
                    : <><UserCheck size={14} /> Assign & Confirm</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Schedule for Student Modal ────────────────────────────────────── */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-sm text-gray-900">Schedule for Student</h3>
              <button onClick={() => { setShowScheduleModal(false); resetScheduleForm(); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={14} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Student search */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Student</label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                      <p className="text-xs text-gray-400">{selectedStudent.email}</p>
                    </div>
                    <button onClick={() => { setSelectedStudent(null); setStudentQuery(''); setStudentResults([]); }}
                      className="text-xs text-gray-400 hover:text-red-500 transition">Change</button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus-within:ring-2 focus-within:ring-[#1a5228]/30 focus-within:border-[#1a5228]">
                      <Search size={15} className="text-gray-400 flex-shrink-0" />
                      <input value={studentQuery} onChange={e => searchStudents(e.target.value)}
                        placeholder="Search by name or email…"
                        className="flex-1 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400" />
                      {searchingStudents && <Loader2 size={15} className="animate-spin text-gray-400" />}
                    </div>
                    {studentResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                        {studentResults.map(s => (
                          <button key={s._id} onClick={() => { setSelectedStudent(s); setStudentResults([]); setStudentQuery(''); }}
                            className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition border-b border-gray-50 last:border-0">
                            <p className="text-sm font-medium text-gray-900">{s.first_name} {s.last_name}</p>
                            <p className="text-xs text-gray-400">{s.email}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {studentQuery.length >= 2 && !searchingStudents && studentResults.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1 px-1">No students found.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Purpose</label>
                <select value={schedPurpose} onChange={e => setSchedPurpose(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-800 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none">
                  <option value="counseling">Counseling</option>
                  <option value="follow_up_counselling">Follow-up Counseling</option>
                  <option value="intake_interview">Intake Interview</option>
                  <option value="others">Others</option>
                </select>
              </div>

              {/* Concern */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Concern / Notes</label>
                <textarea value={schedConcern} onChange={e => setSchedConcern(e.target.value)}
                  placeholder="Brief description…" rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-800 placeholder-gray-300 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none resize-none" />
              </div>

              {/* Mode */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mode</label>
                <select value={schedMethod} onChange={e => setSchedMethod(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-800 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none">
                  <option value="in-person">Face to Face</option>
                  <option value="google-meet">Google Meet</option>
                  <option value="zoom">Zoom</option>
                </select>
              </div>

              {/* Optional fields */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <p className="text-xs text-gray-400">Optional — assign a counselor and time now, or leave blank to assign later.</p>
                <select value={schedCounselor} onChange={e => setSchedCounselor(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-800 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none">
                  <option value="">Assign counselor later…</option>
                  {counselors.map(c => <option key={c._id} value={c._id}>{c.first_name} {c.last_name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-800 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none" />
                  <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-800 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none" />
                </div>
              </div>

              {scheduleMsg && (
                <p className={`text-xs px-3 py-2 rounded-xl ${scheduleMsg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {scheduleMsg.text}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={() => { setShowScheduleModal(false); resetScheduleForm(); }}
                  className="flex-1 px-4 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button onClick={handleScheduleSubmit} disabled={submittingSchedule || !selectedStudent}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#1a5228' }}>
                  {submittingSchedule && <Loader2 size={14} className="animate-spin" />}
                  Create Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Summary card ──────────────────────────────────────────────────────────────
function SummaryCard({ icon: Icon, label, value, cls, highlight }: {
  icon: any; label: string; value: number; cls: string; highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border px-4 py-3 flex items-center gap-3 ${highlight ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200'}`}>
      <Icon size={18} className={cls} />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className={`text-xl font-semibold ${cls}`}>{value}</p>
      </div>
    </div>
  );
}
