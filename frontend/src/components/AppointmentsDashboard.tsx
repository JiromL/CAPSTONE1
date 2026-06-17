'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock, CheckCircle, AlertCircle, UserCheck, MessageSquare,
  ChevronDown, ChevronUp, Plus, X, Search, Loader2, RefreshCw,
  ExternalLink, Archive, Star, CalendarDays, Users, Send, Filter,
  XCircle, ThumbsUp, MapPin, RotateCcw, ClipboardList, Pencil,
  FileText, Eye,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/utils/api';
import { PermaBadge, PERMA_CONFIG } from '@/components/PendingStudentsWithPerma';

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
  office?: string;
  reschedule_requested_by_role?: string;
  reschedule_requested_start?: string;
  intake_source?: string;
  mhbot_username?: string;
  case_id?: string;
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
  { key: 'new',        label: 'New Requests' },
  { key: 'confirmed',  label: 'Confirmed' },
  { key: 'evaluation', label: 'Post-Session' },
  { key: 'followup',   label: 'Follow-Up' },
  { key: 'done',       label: 'Closed' },
] as const;
type TabKey = typeof TABS[number]['key'];

const TAB_STATUSES: Record<TabKey, string[]> = {
  new:        ['REQUESTED', 'PENDING_APPROVAL'],
  confirmed:  ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN', 'RESCHEDULE_REQUESTED'],
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
const PURPOSE_LABEL: Record<string, string> = {
  intake_interview:       'Initial Consultation',
  follow_up:              'Follow-up Session',
  follow_up_counselling:  'Follow-up Session',
  counseling:             'Counseling Session',
  others:                 'General Session',
};

function fmtPurpose(p?: string) {
  if (!p) return '—';
  return PURPOSE_LABEL[p] ?? p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
// Format "First Last" → "LAST, First"
function fmtStaffName(name?: string) {
  if (!name || name === 'Not Assigned') return name ?? '—';
  const parts = name.trim().split(' ');
  if (parts.length < 2) return name.toUpperCase();
  const last = parts[parts.length - 1].toUpperCase();
  const first = parts.slice(0, -1).join(' ');
  return `${last}, ${first}`;
}
const ROLE_LABEL: Record<string, string> = {
  IC: 'Intake Counselor', INTAKE_COUNSELOR: 'Intake Counselor',
  COUNSELOR: 'Counselor', PSYCHOLOGIST: 'Psychologist',
  STAFF: 'Staff', ADMIN: 'Admin', DPO: 'DPO',
};

// ── Main component ─────────────────────────────────────────────────────────────
export default function AppointmentsDashboard() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [counselors, setCounselors] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('new');
  const [search, setSearch]       = useState('');

  // Assign counselor modal
  const [assignTarget, setAssignTarget] = useState<Appointment | null>(null);
  const [assignForm, setAssignForm]     = useState({ counselorId: '', date: '', time: '', office: '' });
  const [assigningId, setAssigningId]   = useState<string | null>(null);
  const [assignMsg, setAssignMsg]       = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [freeSlots, setFreeSlots]       = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Session actions
  const [pendingAction, setPendingAction] = useState<{ aptId: string; action: 'referral'; notes: string } | null>(null);
  const [actioningId, setActioningId]     = useState<string | null>(null);
  const [actionMsg, setActionMsg]         = useState<{ id: string; type: 'ok' | 'err'; text: string } | null>(null);

  // Follow-up scheduling modal
  const [followUpTarget, setFollowUpTarget]     = useState<Appointment | null>(null);
  const [followUpDate, setFollowUpDate]         = useState('');
  const [followUpTime, setFollowUpTime]         = useState('');
  const [followUpOffice, setFollowUpOffice]     = useState('');
  const [followUpNotes, setFollowUpNotes]       = useState('');
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);
  const [followUpMsg, setFollowUpMsg]           = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Intake packet viewer/editor (IC role)
  const [formsTarget, setFormsTarget]       = useState<Appointment | null>(null);
  const [formsPacket, setFormsPacket]       = useState<any>(null);
  const [formsIntake, setFormsIntake]       = useState<any>(null);
  const [formsLoading, setFormsLoading]     = useState(false);
  const [formsEditing, setFormsEditing]     = useState(false);
  const [formsDraftIcf, setFormsDraftIcf]   = useState<Record<string, any>>({});
  const [formsDraftSpif, setFormsDraftSpif] = useState<Record<string, any>>({});
  const [formsDraftPhq4, setFormsDraftPhq4] = useState<(number|null)[]>([null,null,null,null]);
  const [formsSaving, setFormsSaving]       = useState(false);
  const [formsMsg, setFormsMsg]             = useState('');

  // Edit appointment modal (staff correction)
  const [editTarget, setEditTarget]         = useState<Appointment | null>(null);
  const [editCounselor, setEditCounselor]   = useState('');
  const [editDate, setEditDate]             = useState('');
  const [editTime, setEditTime]             = useState('');
  const [editOffice, setEditOffice]         = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editMsg, setEditMsg]               = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Counselor-initiated reschedule modal
  const [reschedTarget, setReschedTarget]   = useState<Appointment | null>(null);
  const [reschedDate, setReschedDate]       = useState('');
  const [reschedTime, setReschedTime]       = useState('');
  const [reschedReason, setReschedReason]   = useState('');
  const [submittingResched, setSubmittingResched] = useState(false);
  const [reschedMsg, setReschedMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

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

  // Close at intake
  const [closeIntakeTarget, setCloseIntakeTarget] = useState<Appointment | null>(null);
  const [closeIntakeReason, setCloseIntakeReason] = useState('');
  const [closingIntake, setClosingIntake]         = useState(false);
  const [closeIntakeMsg, setCloseIntakeMsg]       = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // IC slot confirmation
  const [confirmingSlotId, setConfirmingSlotId]   = useState<string | null>(null);

  // PERMA labels for appointments
  const [permaLabels, setPermaLabels] = useState<Record<string, string | null>>({});

  // Termination modal (complete with type)
  const [terminationTarget, setTerminationTarget] = useState<Appointment | null>(null);
  const [terminationType, setTerminationType]     = useState('MUTUAL');
  const [terminationNotes, setTerminationNotes]   = useState('');
  const [submittingTermination, setSubmittingTermination] = useState(false);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const r = await fetch(api('/api/appointments/dashboard/role-view'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 401 || r.status === 422) {
        ['token', 'user'].forEach(k => localStorage.removeItem(k));
        window.location.href = '/login';
        return;
      }
      if (r.status === 404) {
        const d = await r.json().catch(() => ({}));
        if (d.error?.toLowerCase().includes('user not found')) {
          ['token', 'user'].forEach(k => localStorage.removeItem(k));
          window.location.href = '/login';
          return;
        }
      }
      if (!r.ok) throw new Error('Failed to load appointments');
      const data = await r.json();
      setDashboard(data);
      if (data.can_assign_counselor) fetchCounselors(token!);
      fetchPermaLabels(data.appointments ?? []);
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

  const fetchPermaLabels = async (apts: Appointment[]) => {
    const usernames = apts.map(a => a.mhbot_username).filter(Boolean) as string[];
    if (usernames.length === 0) return;
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api('/api/mhbot/batch-labels'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames }),
      });
      if (r.ok) {
        const d = await r.json();
        setPermaLabels(d.labels ?? {});
      }
    } catch {}
  };

  const fetchFreeSlots = async (counselorId: string, date: string) => {
    if (!counselorId || !date) { setFreeSlots([]); return; }
    setLoadingSlots(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/availability/free-slots?counselor_id=${counselorId}&date=${date}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      setFreeSlots(d.slots ?? []);
    } catch {
      setFreeSlots([]);
    } finally {
      setLoadingSlots(false);
    }
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
        body: JSON.stringify({
          counselor_id: assignForm.counselorId,
          scheduled_start: start.toISOString(),
          scheduled_end: end.toISOString(),
          ...(assignForm.office ? { office: assignForm.office } : {}),
        }),
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

  const confirmIntakeSlot = async (aptId: string) => {
    setConfirmingSlotId(aptId);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/appointments/${aptId}/confirm-intake`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (r.ok) {
        setActionMsg({ id: aptId, type: 'ok', text: 'Appointment confirmed — student will be notified.' });
        setTimeout(() => { setActionMsg(null); fetchDashboard(); }, 1500);
      } else {
        const e = await r.json();
        setActionMsg({ id: aptId, type: 'err', text: e.error || 'Failed to confirm.' });
      }
    } finally { setConfirmingSlotId(null); }
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

  const doCloseAtIntake = async () => {
    if (!closeIntakeTarget) return;
    setClosingIntake(true);
    setCloseIntakeMsg(null);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/appointments/${closeIntakeTarget.appointment_id}/close-at-intake`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: closeIntakeReason }),
      });
      if (r.ok) {
        setCloseIntakeMsg({ type: 'ok', text: 'Case closed at intake successfully.' });
        setTimeout(() => { setCloseIntakeTarget(null); setCloseIntakeReason(''); fetchDashboard(); }, 1200);
      } else {
        const e = await r.json();
        setCloseIntakeMsg({ type: 'err', text: e.error || 'Failed to close.' });
      }
    } finally { setClosingIntake(false); }
  };

  const doCompleteWithTermination = async () => {
    if (!terminationTarget) return;
    setSubmittingTermination(true);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/appointments/${terminationTarget.appointment_id}/complete-with-termination`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ termination_type: terminationType, notes: terminationNotes }),
      });
      if (r.ok) {
        setTerminationTarget(null);
        setTerminationType('MUTUAL');
        setTerminationNotes('');
        fetchDashboard();
      } else {
        const e = await r.json();
        alert(e.error || 'Failed to complete.');
      }
    } finally { setSubmittingTermination(false); }
  };

  const doFollowUp = async () => {
    if (!followUpTarget) return;
    if (!followUpDate || !followUpTime) { setFollowUpMsg({ type: 'err', text: 'Please select a date and time.' }); return; }
    setSubmittingFollowUp(true);
    setFollowUpMsg(null);
    const token = localStorage.getItem('token');
    try {
      const start = new Date(`${followUpDate}T${followUpTime}:00`);
      const r = await fetch(api(`/api/appointments/${followUpTarget.appointment_id}/set-follow-up`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_start: start.toISOString(),
          notes: followUpNotes,
          ...(followUpOffice ? { office: followUpOffice } : {}),
        }),
      });
      const d = await r.json();
      if (r.ok) {
        setFollowUpMsg({ type: 'ok', text: `Follow-up scheduled (${d.new_counseling_id}).` });
        setTimeout(() => { setFollowUpTarget(null); setFollowUpDate(''); setFollowUpTime(''); setFollowUpOffice(''); setFollowUpNotes(''); setFollowUpMsg(null); fetchDashboard(); }, 1200);
      } else {
        setFollowUpMsg({ type: 'err', text: d.error || 'Failed to schedule follow-up.' });
      }
    } finally { setSubmittingFollowUp(false); }
  };

  const doReschedule = async () => {
    if (!reschedTarget || !reschedDate || !reschedTime) { setReschedMsg({ type: 'err', text: 'Please select a date and time.' }); return; }
    setSubmittingResched(true); setReschedMsg(null);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/appointments/${reschedTarget.appointment_id}/reschedule`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requested_start: `${reschedDate}T${reschedTime}:00`, reason: reschedReason }),
      });
      const d = await r.json();
      if (r.ok) {
        setReschedMsg({ type: 'ok', text: 'Reschedule request sent to student.' });
        setTimeout(() => { setReschedTarget(null); setReschedDate(''); setReschedTime(''); setReschedReason(''); setReschedMsg(null); fetchDashboard(); }, 1200);
      } else {
        setReschedMsg({ type: 'err', text: d.error || 'Failed to request reschedule.' });
      }
    } finally { setSubmittingResched(false); }
  };

  const openForms = async (apt: Appointment) => {
    setFormsTarget(apt); setFormsPacket(null); setFormsIntake(null);
    setFormsEditing(false); setFormsMsg('');
    setFormsLoading(true);
    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };
    const id = apt.appointment_id;
    const [s, p] = await Promise.all([
      fetch(api(`/api/intake/${id}`), { headers: h }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(api(`/api/intake/packet/${id}`), { headers: h }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]);
    setFormsIntake(s); setFormsPacket(p);
    if (p) {
      setFormsDraftIcf(p.icf || {}); setFormsDraftSpif(p.spif || {});
      setFormsDraftPhq4(Array.isArray(p.phq4_responses) && p.phq4_responses.length === 4 ? p.phq4_responses : [null,null,null,null]);
    }
    setFormsLoading(false);
  };

  const saveForms = async () => {
    if (!formsTarget) return;
    setFormsSaving(true); setFormsMsg('');
    const token = localStorage.getItem('token');
    const phq4Send = formsDraftPhq4.every(v => v !== null) ? (formsDraftPhq4 as number[]) : [];
    try {
      const r = await fetch(api('/api/intake/packet'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'ic_entry', submitted_by_role: 'ic', appointment_id: formsTarget.appointment_id, icf: formsDraftIcf, spif: formsDraftSpif, phq4_responses: phq4Send }),
      });
      if (r.ok) {
        const pr = await fetch(api(`/api/intake/packet/${formsTarget.appointment_id}`), { headers: { Authorization: `Bearer ${token}` } });
        if (pr.ok) setFormsPacket(await pr.json());
        setFormsEditing(false); setFormsMsg('Forms saved.');
      } else {
        const d = await r.json(); setFormsMsg(d.error || 'Failed to save.');
      }
    } catch { setFormsMsg('Network error.'); }
    finally { setFormsSaving(false); setTimeout(() => setFormsMsg(''), 4000); }
  };

  const doEdit = async () => {
    if (!editTarget) return;
    setSubmittingEdit(true); setEditMsg(null);
    try {
      const token = localStorage.getItem('token');
      const body: Record<string, string> = {};
      if (editCounselor) body.counselor_id = editCounselor;
      if (editDate && editTime) { body.date = editDate; body.time = editTime; }
      if (editOffice !== undefined) body.office = editOffice;
      const r = await fetch(api(`/api/appointments/${editTarget.appointment_id}/edit`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (r.ok) {
        setEditMsg({ type: 'ok', text: 'Appointment updated.' });
        setTimeout(() => { setEditTarget(null); fetchDashboard(); }, 900);
      } else {
        setEditMsg({ type: 'err', text: d.error || 'Failed to update.' });
      }
    } finally { setSubmittingEdit(false); }
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
  const PERMA_PRIORITY: Record<string, number> = {
    'In Crisis': 1, 'Struggling': 2, 'Surviving': 3, 'Thriving': 4, 'Excelling': 5,
  };

  const apts = dashboard?.appointments ?? [];
  const sortedApts = [...apts].sort((a, b) => {
    const p: Record<string, number> = { REQUESTED: 0, PENDING_APPROVAL: 1, EVALUATION: 2, CONFIRMED: 3, APPROVED: 3, MATCHED: 3, CHECKED_IN: 3 };
    const statusDiff = (p[a.status] ?? 9) - (p[b.status] ?? 9);
    if (statusDiff !== 0) return statusDiff;
    // Secondary sort: PERMA priority (In Crisis first, no data last)
    const pa = PERMA_PRIORITY[permaLabels[a.mhbot_username ?? ''] ?? ''] ?? 6;
    const pb = PERMA_PRIORITY[permaLabels[b.mhbot_username ?? ''] ?? ''] ?? 6;
    return pa - pb;
  });

  const filtered = sortedApts.filter(a => {
    const matchTab = TAB_STATUSES[activeTab].includes(a.status);
    const t = search.toLowerCase();
    const matchSearch = !t || [a.student_name, a.student_email, a.counselor_name, a.purpose, isOA ? undefined : a.concern]
      .some(v => v?.toLowerCase().includes(t));
    return matchTab && matchSearch;
  });

  const counts = Object.fromEntries(
    TABS.map(t => [
      t.key,
      apts.filter(a => TAB_STATUSES[t.key as TabKey].includes(a.status)).length,
    ])
  ) as Record<TabKey, number>;

  const newCount       = counts.new;
  const evalCount      = counts.evaluation;
  const confirmedCount = counts.confirmed;
  const pendingReschedules = dashboard?.summary?.pending_reschedules ?? 0;
  const canAssign      = dashboard?.can_assign_counselor ?? false;
  const canManage      = dashboard?.can_manage_sessions ?? false;
  const showActions    = canAssign || canManage;
  const visibleTabs    = TABS.filter(t =>
    canManage ? true : t.key !== 'evaluation' && t.key !== 'followup'
  );
  const isIC           = dashboard?.role === 'IC' || dashboard?.role === 'INTAKE_COUNSELOR';
  const isOA           = dashboard?.role === 'STAFF';
  const intakeReady    = isIC ? apts.filter(a =>
    a.purpose === 'intake_interview' &&
    ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN'].includes(a.status)
  ) : [];
  const slotsPendingConfirm = isIC ? apts.filter(a =>
    a.status === 'REQUESTED' && !!a.counselor_id && !!a.preferred_time
  ) : [];

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
        <SummaryCard icon={Star}         label="Post-Session" value={evalCount}
          cls={evalCount > 0 ? 'text-amber-600' : 'text-gray-400'} highlight={evalCount > 0} />
      </div>

      {/* ── Action banners ────────────────────────────────────────────────── */}
      {isIC && slotsPendingConfirm.length > 0 && (
        <div className="flex items-center gap-3 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 text-sm">
          <CheckCircle size={14} className="text-sky-500 flex-shrink-0" />
          <span className="text-sky-800">
            <strong>{slotsPendingConfirm.length}</strong> slot booking{slotsPendingConfirm.length !== 1 ? 's' : ''} need your confirmation — students are waiting.
          </span>
          <button onClick={() => setActiveTab('new')}
            className="ml-auto text-xs font-semibold text-sky-700 underline underline-offset-2 hover:text-sky-900">
            Confirm Now
          </button>
        </div>
      )}
      {isIC && intakeReady.length > 0 && (
        <div className="flex items-center gap-3 bg-[#1a5228]/5 border border-[#1a5228]/20 rounded-xl px-4 py-3 text-sm">
          <ClipboardList size={14} className="text-[#1a5228] flex-shrink-0" />
          <span className="text-[#1a5228]">
            <strong>{intakeReady.length}</strong> intake interview{intakeReady.length !== 1 ? 's' : ''} confirmed — conduct the intake assessment to assign to a counselor.
          </span>
          <button onClick={() => setActiveTab('confirmed')}
            className="ml-auto text-xs font-semibold text-[#1a5228] underline underline-offset-2 hover:text-green-900">
            Go to Confirmed
          </button>
        </div>
      )}
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
            <strong>{evalCount}</strong> session{evalCount !== 1 ? 's' : ''} completed — decide next step: follow-up, referral, or close.
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
          {visibleTabs.map(tab => {
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

        {/* Cards */}
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
            <div className="p-4 space-y-3">
              {filtered.map((apt) => {
                const badgeCls    = STATUS_BADGE[apt.status] ?? 'bg-gray-100 text-gray-500 ring-1 ring-gray-200';
                const isNew       = apt.status === 'REQUESTED' || apt.status === 'PENDING_APPROVAL';
                const isConfirmed = ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN', 'RESCHEDULE_REQUESTED'].includes(apt.status);
                const isEval      = apt.status === 'EVALUATION';
                const isHighRisk  = apt.risk_level && ['RED', 'CRITICAL'].includes(apt.risk_level.toUpperCase());
                const permaLabel  = apt.mhbot_username ? (permaLabels[apt.mhbot_username] ?? null) : null;
                const isInCrisis  = permaLabel === 'In Crisis';
                const cardCls     = isInCrisis  ? 'border-red-300 bg-red-50/40'
                                  : isHighRisk  ? 'border-red-200 bg-red-50/20'
                                  : isNew       ? 'border-amber-200/70 bg-amber-50/20'
                                  : isEval      ? 'border-amber-100 bg-amber-50/10'
                                  : 'border-gray-200 bg-white hover:border-gray-300';

                return (
                  <React.Fragment key={apt.appointment_id}>
                    <div className={`rounded-xl border p-4 transition-all ${cardCls}`}>
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">

                          {/* Badges row */}
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${badgeCls}`}>
                              {STATUS_LABEL[apt.status] ?? apt.status.replace(/_/g, ' ')}
                            </span>
                            {apt.risk_level && apt.risk_level !== 'GREEN' && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${RISK_BADGE[apt.risk_level.toUpperCase()] ?? ''}`}>
                                ⚠ {apt.risk_level}
                              </span>
                            )}
                            {apt.status === 'RESCHEDULE_REQUESTED' && apt.reschedule_requested_by_role !== 'STUDENT' && (
                              <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Clock size={9} /> Awaiting student
                              </span>
                            )}
                          </div>

                          {/* Student name headline */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900 text-sm">{apt.student_name}</p>
                            {apt.mhbot_username && permaLabels[apt.mhbot_username] !== undefined && (
                              isInCrisis ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 ring-1 ring-red-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                  In Crisis
                                </span>
                              ) : permaLabel === 'Struggling' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                                  Struggling
                                </span>
                              ) : (
                                <PermaBadge label={permaLabel} />
                              )
                            )}
                          </div>

                          {/* Purpose + concern (hidden from OA per privacy policy) */}
                          <p className="text-xs text-gray-500 mt-0.5">
                            {fmtPurpose(apt.purpose)}
                            {apt.concern && !isOA && <span className="text-gray-400"> · &ldquo;{apt.concern}&rdquo;</span>}
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

                          {/* Assigned counselor */}
                          {apt.counselor_name && apt.counselor_name !== 'Not Assigned' ? (
                            <p className="mt-1 text-xs text-gray-600">Assigned to <span className="font-medium text-gray-800">{fmtStaffName(apt.counselor_name)}</span></p>
                          ) : (
                            <p className="mt-1 text-xs text-gray-400 italic">No counselor assigned yet</p>
                          )}

                          {/* Student email */}
                          <p className="text-xs text-gray-400 mt-0.5">{apt.student_email}</p>

                          {/* Office */}
                          {apt.office && (
                            <p className="mt-0.5 text-xs text-gray-500 flex items-center gap-1"><MapPin size={10} /> {apt.office}</p>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <button onClick={() => toggleCheckins(apt.appointment_id)}
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 px-2 py-1 rounded-lg transition border border-gray-200">
                              <MessageSquare size={11} />
                              {checkinData[apt.appointment_id] != null ? checkinData[apt.appointment_id].length : '—'}
                              {checkinRow === apt.appointment_id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            </button>

                            {showActions && (
                              <>
                                {canAssign && (
                                  <button onClick={() => {
                                    setEditTarget(apt);
                                    setEditCounselor('');
                                    setEditDate(apt.preferred_date ? apt.preferred_date.split('T')[0] : '');
                                    setEditTime(apt.preferred_time || '');
                                    setEditOffice(apt.office || '');
                                    setEditMsg(null);
                                  }}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-lg transition">
                                    <Pencil size={11} /> Edit
                                  </button>
                                )}

                                {isIC && isNew && apt.counselor_id && apt.preferred_time && (
                                  <button
                                    onClick={() => confirmIntakeSlot(apt.appointment_id)}
                                    disabled={confirmingSlotId === apt.appointment_id}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white rounded-lg transition disabled:opacity-50"
                                    style={{ backgroundColor: '#1a5228' }}>
                                    {confirmingSlotId === apt.appointment_id
                                      ? <Loader2 size={11} className="animate-spin" />
                                      : <CheckCircle size={11} />}
                                    Confirm Slot
                                  </button>
                                )}
                                {canAssign && isNew && !apt.counselor_id && (
                                  <button onClick={() => { setAssignTarget(apt); setFreeSlots([]); setAssignForm({ counselorId: '', date: apt.preferred_date ? apt.preferred_date.split('T')[0] : '', time: apt.preferred_time || '', office: '' }); setAssignMsg(null); }}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white rounded-lg transition"
                                    style={{ backgroundColor: '#1a5228' }}>
                                    <UserCheck size={12} /> Assign Counselor
                                  </button>
                                )}
                                {canAssign && isNew && apt.counselor_id && !isIC && (
                                  <button onClick={() => { setAssignTarget(apt); setFreeSlots([]); setAssignForm({ counselorId: '', date: apt.preferred_date ? apt.preferred_date.split('T')[0] : '', time: apt.preferred_time || '', office: '' }); setAssignMsg(null); }}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white rounded-lg transition"
                                    style={{ backgroundColor: '#1a5228' }}>
                                    <UserCheck size={12} /> Assign Counselor
                                  </button>
                                )}

                                {isConfirmed && apt.status !== 'RESCHEDULE_REQUESTED' && apt.purpose === 'intake_interview' && (dashboard?.role === 'IC' || dashboard?.role === 'INTAKE_COUNSELOR') && (
                                  <button onClick={() => router.push(`/ic/intake/conduct/${apt.appointment_id}`)}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white rounded-lg transition"
                                    style={{ backgroundColor: '#1a5228' }}>
                                    <ClipboardList size={11} /> Conduct Intake
                                  </button>
                                )}

                                {(dashboard?.role === 'IC' || dashboard?.role === 'INTAKE_COUNSELOR') && (
                                  apt.case_id
                                    ? <Link href={`/cases/${apt.case_id}?tab=intake-summary`}>
                                        <button className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 rounded-lg transition">
                                          <FileText size={11} /> Forms
                                        </button>
                                      </Link>
                                    : <button onClick={() => openForms(apt)}
                                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 rounded-lg transition">
                                        <FileText size={11} /> Forms
                                      </button>
                                )}

                                {isConfirmed && apt.status !== 'RESCHEDULE_REQUESTED' && canManage && (
                                  <>
                                    <button onClick={() => doSessionAction(apt.appointment_id, 'set-evaluation')}
                                      disabled={actioningId === apt.appointment_id}
                                      className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition">
                                      {actioningId === apt.appointment_id ? <Loader2 size={11} className="animate-spin" /> : <Star size={11} />}
                                      Session Done
                                    </button>
                                    <button onClick={() => { setReschedTarget(apt); setReschedDate(''); setReschedTime(''); setReschedReason(''); setReschedMsg(null); }}
                                      className="flex items-center gap-1 px-2.5 py-1 border border-sky-200 text-sky-600 hover:bg-sky-50 text-xs font-semibold rounded-lg transition">
                                      <RotateCcw size={11} /> Reschedule
                                    </button>
                                  </>
                                )}

                                {isEval && canManage && (
                                  pendingAction?.aptId === apt.appointment_id ? (
                                    <div className="flex items-end gap-2">
                                      <div>
                                        <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Referral Notes</p>
                                        <textarea rows={1} value={pendingAction.notes}
                                          onChange={e => setPendingAction(p => p ? { ...p, notes: e.target.value } : p)}
                                          placeholder="Optional notes…"
                                          className="w-40 border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-green-500 resize-none" />
                                      </div>
                                      <button onClick={() => doSessionAction(apt.appointment_id, 'set-referral', { notes: pendingAction.notes })}
                                        disabled={actioningId === apt.appointment_id}
                                        className="px-2.5 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition">
                                        {actioningId === apt.appointment_id ? <Loader2 size={11} className="animate-spin" /> : 'Confirm'}
                                      </button>
                                      <button onClick={() => setPendingAction(null)}
                                        className="px-2.5 py-1 border border-gray-200 text-xs text-gray-500 rounded-lg hover:bg-gray-50 transition">
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button onClick={() => { setFollowUpTarget(apt); setFollowUpDate(''); setFollowUpTime(''); setFollowUpOffice(apt.office || ''); setFollowUpNotes(''); setFollowUpMsg(null); }}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-lg transition">
                                        <RefreshCw size={11} /> Follow-Up
                                      </button>
                                      <button onClick={() => setPendingAction({ aptId: apt.appointment_id, action: 'referral', notes: '' })}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-lg transition">
                                        <ExternalLink size={11} /> Referral
                                      </button>
                                      <button onClick={() => { setTerminationTarget(apt); setTerminationType('MUTUAL'); setTerminationNotes(''); }}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 text-xs font-semibold rounded-lg transition">
                                        <Archive size={11} /> Complete & Close
                                      </button>
                                    </>
                                  )
                                )}

                                {actionMsg?.id === apt.appointment_id && !pendingAction && (
                                  <p className={`text-xs ${actionMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                                    {actionMsg.text}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Check-ins expansion */}
                    {checkinRow === apt.appointment_id && (
                      <div className="mt-1 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
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
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            <div className="px-5 py-3.5 bg-gray-50/60 border-t border-gray-100">
              <p className="text-xs text-gray-400">Showing <strong className="text-gray-600">{filtered.length}</strong> appointment{filtered.length !== 1 ? 's' : ''}</p>
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
              <button onClick={() => { setAssignTarget(null); setFreeSlots([]); }} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
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
                {assignTarget.concern && !isOA && (
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
                <select value={assignForm.counselorId}
                  onChange={e => {
                    const cid = e.target.value;
                    setAssignForm(f => ({ ...f, counselorId: cid }));
                    fetchFreeSlots(cid, assignForm.date);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none">
                  <option value="">Select a counselor…</option>
                  {counselors.map(c => (
                    <option key={c._id} value={c._id}>
                      {`${c.last_name?.toUpperCase()}, ${c.first_name}`}{c.role ? ` — ${ROLE_LABEL[c.role] ?? c.role}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Confirmed Date <span className="text-red-400 normal-case font-normal">*</span>
                  </label>
                  <input type="date" value={assignForm.date}
                    onChange={e => {
                      const d = e.target.value;
                      setAssignForm(f => ({ ...f, date: d }));
                      fetchFreeSlots(assignForm.counselorId, d);
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Time <span className="text-red-400 normal-case font-normal">*</span>
                    {loadingSlots && <span className="ml-1 text-gray-300 font-normal normal-case">loading…</span>}
                  </label>
                  {freeSlots.length > 0 ? (
                    <select value={assignForm.time} onChange={e => setAssignForm(f => ({ ...f, time: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none">
                      <option value="">Pick a free slot…</option>
                      {freeSlots.map(t => {
                        const [h, m] = t.split(':').map(Number);
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        const h12 = h % 12 || 12;
                        return <option key={t} value={t}>{h12}:{String(m).padStart(2,'0')} {ampm}</option>;
                      })}
                    </select>
                  ) : (
                    <div className="space-y-1">
                      <input type="time" step="1800" value={assignForm.time} onChange={e => setAssignForm(f => ({ ...f, time: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none" />
                      {assignForm.counselorId && assignForm.date && !loadingSlots && (
                        <p className="text-[10px] text-amber-500">No availability set — entering manually</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Office/Room — only for face-to-face sessions */}
              {(assignTarget?.method === 'in-person' || assignTarget?.method === 'in_person') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Office / Room
                  </label>
                  <input
                    type="text"
                    value={assignForm.office}
                    onChange={e => setAssignForm(f => ({ ...f, office: e.target.value }))}
                    placeholder="e.g. Room 203, CPS Office, Bldg. A"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">Let the student know where to go for their in-person session.</p>
                </div>
              )}

              {assignMsg && (
                <p className={`text-xs px-3 py-2 rounded-lg ${assignMsg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {assignMsg.text}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={() => { setAssignTarget(null); setFreeSlots([]); }}
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
                  {counselors.map(c => (
                    <option key={c._id} value={c._id}>
                      {`${c.last_name?.toUpperCase()}, ${c.first_name}`}{c.role ? ` — ${ROLE_LABEL[c.role] ?? c.role}` : ''}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-800 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none" />
                  <input type="time" step="1800" value={schedTime} onChange={e => setSchedTime(e.target.value)}
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

      {/* ── Counselor Reschedule Modal ───────────────────────────────────── */}
      {reschedTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Propose New Schedule</h3>
                <p className="text-xs text-gray-400 mt-0.5">Student: <strong>{reschedTarget.student_name}</strong></p>
              </div>
              <button onClick={() => setReschedTarget(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={14} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">New Date</label>
                <input type="date" value={reschedDate} onChange={e => setReschedDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a5228] focus:border-[#1a5228] focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">New Time</label>
                <input type="time" step="1800" value={reschedTime} onChange={e => setReschedTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a5228] focus:border-[#1a5228] focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Reason <span className="font-normal normal-case text-gray-400">(optional)</span></label>
                <textarea value={reschedReason} onChange={e => setReschedReason(e.target.value)}
                  rows={2} placeholder="Why is this session being rescheduled?"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a5228] focus:border-[#1a5228] focus:outline-none resize-none" />
              </div>
              {reschedMsg && (
                <p className={`text-xs px-3 py-2 rounded-lg ${reschedMsg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {reschedMsg.text}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setReschedTarget(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button onClick={doReschedule} disabled={submittingResched}
                  className="flex-1 px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2">
                  {submittingResched && <Loader2 size={13} className="animate-spin" />}
                  Send to Student
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Follow-Up Scheduling Modal ────────────────────────────────────── */}
      {followUpTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw size={18} className="text-indigo-500" />
              <h3 className="font-semibold text-sm text-gray-900">Schedule Follow-Up Session</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Student: <strong>{followUpTarget.student_name}</strong>
              {followUpTarget.counselor_name && followUpTarget.counselor_name !== 'Not Assigned' && (
                <> · Counselor: <strong>{followUpTarget.counselor_name}</strong></>
              )}
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date *</label>
                  <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Time *</label>
                  <input type="time" step="1800" value={followUpTime} onChange={e => setFollowUpTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 focus:outline-none" />
                </div>
              </div>
              {(followUpTarget.method === 'in-person' || followUpTarget.method === 'in_person') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Office / Room</label>
                  <input type="text" value={followUpOffice} onChange={e => setFollowUpOffice(e.target.value)}
                    placeholder="e.g. Room 203, CPS Office"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 focus:outline-none" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Session Notes (optional)</label>
                <textarea rows={2} value={followUpNotes} onChange={e => setFollowUpNotes(e.target.value)}
                  placeholder="Continuation goals, topics to cover…"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 focus:outline-none resize-none" />
              </div>
            </div>
            {followUpMsg && (
              <p className={`text-xs mt-3 ${followUpMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{followUpMsg.text}</p>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setFollowUpTarget(null)}
                className="px-4 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={doFollowUp} disabled={submittingFollowUp}
                className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center gap-1.5">
                {submittingFollowUp ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Schedule Follow-Up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Close at Intake Modal ──────────────────────────────────────────── */}
      {closeIntakeTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <XCircle size={18} className="text-red-500" />
              <h3 className="font-semibold text-sm text-gray-900">Close at Intake</h3>
            </div>
            <p className="text-xs text-gray-500 mb-1">Student: <strong>{closeIntakeTarget.student_name}</strong></p>
            <p className="text-xs text-gray-400 mb-4">
              This means the student does not need continuing sessions. The case will be closed and documented.
            </p>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Reason / notes</label>
            <textarea
              rows={3}
              value={closeIntakeReason}
              onChange={e => setCloseIntakeReason(e.target.value)}
              placeholder="e.g. Student concern resolved at intake, no further sessions required."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-red-400 resize-none mb-3"
            />
            {closeIntakeMsg && (
              <p className={`text-xs mb-3 ${closeIntakeMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                {closeIntakeMsg.text}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCloseIntakeTarget(null)}
                className="px-4 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={doCloseAtIntake} disabled={closingIntake}
                className="px-4 py-1.5 text-xs bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center gap-1.5">
                {closingIntake ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                Confirm Close at Intake
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Complete & Termination Type Modal ─────────────────────────────── */}
      {terminationTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <Archive size={18} className="text-gray-600" />
              <h3 className="font-semibold text-sm text-gray-900">Complete & Close Case</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Student: <strong>{terminationTarget.student_name}</strong>
            </p>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Termination Type</label>
            <select
              value={terminationType}
              onChange={e => setTerminationType(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-green-500 mb-3"
            >
              <option value="MUTUAL">Mutual — goals met, both agree</option>
              <option value="CLIENT_INITIATED_PLANNED">Client-Initiated (Planned) — client ready to stop</option>
              <option value="CLIENT_INITIATED_PREMATURE">Client-Initiated (Premature) — dropout / rupture</option>
              <option value="COUNSELOR_INITIATED">Counselor-Initiated — ethical necessity / limit of competence</option>
              <option value="ADMINISTRATIVE">Administrative — 3 no-shows / forced</option>
              <option value="CLINICAL_REFERRAL">Clinical Referral — warm handoff to external/higher care</option>
            </select>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Summary notes (optional)</label>
            <textarea
              rows={3}
              value={terminationNotes}
              onChange={e => setTerminationNotes(e.target.value)}
              placeholder="Document therapeutic gains, transition plan, or reason for closure…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-green-500 resize-none mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setTerminationTarget(null)}
                className="px-4 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={doCompleteWithTermination} disabled={submittingTermination}
                className="px-4 py-1.5 text-xs bg-[#1a5228] hover:bg-green-800 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center gap-1.5">
                {submittingTermination ? <Loader2 size={12} className="animate-spin" /> : <ThumbsUp size={12} />}
                Complete & Close Case
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Appointment Modal ──────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-sm text-gray-900">Edit Appointment</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editTarget.student_name}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={14} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Reassign counselor */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Reassign Counselor <span className="font-normal normal-case text-gray-400">(leave blank to keep current)</span>
                </label>
                <select value={editCounselor} onChange={e => setEditCounselor(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none">
                  <option value="">— Keep: {editTarget.counselor_name && editTarget.counselor_name !== 'Not Assigned' ? fmtStaffName(editTarget.counselor_name) : 'Unassigned'} —</option>
                  {counselors.map((c: any) => (
                    <option key={c._id} value={c._id}>{c.last_name?.toUpperCase()}, {c.first_name} ({c.role})</option>
                  ))}
                </select>
              </div>

              {/* Date + time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Date</label>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Time</label>
                  <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none" />
                </div>
              </div>

              {/* Office */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Office / Room</label>
                <input type="text" value={editOffice} onChange={e => setEditOffice(e.target.value)}
                  placeholder="e.g. Room 203, CPS Office"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 placeholder-gray-400 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none" />
              </div>

              {editMsg && (
                <p className={`text-xs px-3 py-2 rounded-lg ${editMsg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {editMsg.text}
                </p>
              )}

              <div className="flex gap-2">
                <button onClick={() => setEditTarget(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button onClick={doEdit} disabled={submittingEdit}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: '#1a5228' }}>
                  {submittingEdit && <Loader2 size={13} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Intake Forms Modal (IC) ─────────────────────────────────────── */}
      {formsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <FileText size={16} className="text-gray-500" />
                <div>
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Intake Forms — {formsTarget.student_name}</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {formsPacket ? `Submitted by ${formsPacket.submitted_by_role === 'ic' ? 'IC during interview' : formsPacket.submitted_by_role === 'oa' ? 'Office Assistant' : 'student online'}` : 'No forms submitted yet'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {formsPacket && !formsEditing && (
                  <button onClick={() => setFormsEditing(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <Pencil size={11} /> Edit
                  </button>
                )}
                <button onClick={() => { setFormsTarget(null); setFormsEditing(false); }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                  <X size={14} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {formsLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                </div>
              ) : (

                /* ── View mode ── */
                !formsEditing && formsPacket ? (
                  <div className="p-6 space-y-5 text-sm">
                    {formsPacket.icf && (
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Initial Contact Form (ICF)</p>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                          {[
                            ['Student', [formsPacket.icf.first_name, formsPacket.icf.middle_name, formsPacket.icf.last_name].filter(Boolean).join(' ')],
                            ['Email', formsPacket.icf.email || '—'],
                            ['Student ID', formsPacket.icf.student_id || '—'],
                            ['College/Program', [formsPacket.icf.college, formsPacket.icf.program, formsPacket.icf.year_level].filter(Boolean).join(' · ') || '—'],
                            ['Service', formsPacket.icf.service_requested?.replace(/_/g,' ') || '—'],
                            ['Referral', formsPacket.icf.referral_source || '—'],
                            ['Emergency Contact', [formsPacket.icf.emergency_contact_name, formsPacket.icf.emergency_contact_relationship, formsPacket.icf.emergency_contact_phone].filter(Boolean).join(' · ') || '—'],
                          ].map(([k,v]) => (
                            <div key={k as string}><span className="text-gray-400 text-xs">{k}:</span> <span className="font-medium text-gray-800 dark:text-gray-200">{v}</span></div>
                          ))}
                          <div className="col-span-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mt-1">
                            <p className="text-xs text-gray-400 mb-1">Presenting Concern</p>
                            <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{formsPacket.icf.presenting_concern || '—'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {formsPacket.spif && (
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Personal Background (SPIF-IF)</p>
                        <div className="grid grid-cols-3 gap-x-6 gap-y-2">
                          {[
                            ['Birthdate', formsPacket.spif.birthdate || '—'],
                            ['Gender', formsPacket.spif.gender || '—'],
                            ['Civil Status', formsPacket.spif.civil_status || '—'],
                            ['Family Setup', formsPacket.spif.family_composition?.replace(/_/g,' ') || '—'],
                            ['Living With', formsPacket.spif.living_with || '—'],
                            ['Medical', formsPacket.spif.existing_medical_conditions || 'None'],
                            ['Medications', formsPacket.spif.current_medications || 'None'],
                            ['Prev. Counseling', formsPacket.spif.previous_counseling ? 'Yes' : 'No'],
                            ['Prev. Psychiatric', formsPacket.spif.previous_psychiatric ? 'Yes' : 'No'],
                          ].map(([k,v]) => (
                            <div key={k as string}><span className="text-gray-400 text-xs">{k}:</span> <span className="font-medium text-gray-800 dark:text-gray-200">{v}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                    {formsPacket.phq4_summary && (
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">PHQ-4 Pre-Screen</p>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { l: 'PHQ-2 (Depression)', s: formsPacket.phq4_summary.phq2_score, max: 6, risk: formsPacket.phq4_summary.phq2_at_risk },
                            { l: 'GAD-2 (Anxiety)',    s: formsPacket.phq4_summary.gad2_score, max: 6, risk: formsPacket.phq4_summary.gad2_at_risk },
                            { l: 'PHQ-4 Total',         s: formsPacket.phq4_summary.total_score, max: 12, risk: formsPacket.phq4_summary.total_score >= 6 },
                          ].map(x => (
                            <div key={x.l} className={`rounded-xl p-3 text-center ${x.risk ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
                              <p className="text-xs text-gray-500 mb-0.5">{x.l}</p>
                              <p className={`text-xl font-bold ${x.risk ? 'text-red-700' : 'text-green-700'}`}>{x.s}<span className="text-xs font-normal text-gray-400">/{x.max}</span></p>
                              <p className={`text-[10px] font-semibold ${x.risk ? 'text-red-500' : 'text-green-600'}`}>{x.risk ? '⚠ Elevated' : '✓ Normal'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Triage summary */}
                    {formsIntake && (formsIntake.phq9_score != null || formsIntake.triage_decision) && (
                      <div className="border border-amber-100 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">Triage Results</p>
                        <div className="grid grid-cols-2 gap-3">
                          {formsIntake.phq9_score != null && <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-2"><p className="text-[10px] text-gray-400">PHQ-9</p><p className="text-lg font-bold text-gray-900 dark:text-white">{formsIntake.phq9_score}/27</p></div>}
                          {formsIntake.gad7_score != null && <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-2"><p className="text-[10px] text-gray-400">GAD-7</p><p className="text-lg font-bold text-gray-900 dark:text-white">{formsIntake.gad7_score}/21</p></div>}
                        </div>
                        {formsIntake.triage_decision && (
                          <p className="text-xs text-gray-700 dark:text-gray-300 mt-2"><span className="font-semibold">Decision:</span> {formsIntake.triage_decision === 'ENDORSE_CC' ? 'Endorsed to Counselor (CC)' : formsIntake.triage_decision === 'ENDORSE_CP' ? 'Endorsed to Psychologist (CP)' : 'Closed at Intake'}</p>
                        )}
                        {formsIntake.endorsement_notes && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">"{formsIntake.endorsement_notes}"</p>
                        )}
                      </div>
                    )}
                    {!formsPacket.icf && !formsPacket.spif && (
                      <p className="text-sm text-gray-400 text-center py-8">No intake forms submitted for this appointment.</p>
                    )}
                  </div>
                ) : (formsEditing || !formsPacket) ? (

                  /* ── Edit mode ── */
                  <div className="p-6 space-y-6 text-sm">
                    {/* ICF */}
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Initial Contact Form (ICF)</p>
                      <div className="grid grid-cols-2 gap-3">
                        {(['first_name','last_name','middle_name','email','student_id','college','program','year_level'] as string[]).map(k => (
                          <div key={k}>
                            <label className="block text-xs text-gray-500 mb-1 capitalize">{k.replace(/_/g,' ')}</label>
                            <input value={formsDraftIcf[k] || ''} onChange={e => setFormsDraftIcf(p => ({...p,[k]:e.target.value}))}
                              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#1a5228]/25 focus:outline-none dark:bg-gray-800 dark:text-white" />
                          </div>
                        ))}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Service Requested</label>
                          <select value={formsDraftIcf.service_requested || ''} onChange={e => setFormsDraftIcf(p => ({...p,service_requested:e.target.value}))}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#1a5228]/25 focus:outline-none bg-white dark:bg-gray-800 dark:text-white">
                            <option value="">—</option>
                            {['personal_counseling','academic_concerns','career_guidance','family_concerns','relationship_concerns','crisis_support','psychiatric_evaluation','other'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Referral Source</label>
                          <select value={formsDraftIcf.referral_source || ''} onChange={e => setFormsDraftIcf(p => ({...p,referral_source:e.target.value}))}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#1a5228]/25 focus:outline-none bg-white dark:bg-gray-800 dark:text-white">
                            <option value="">—</option>
                            {['self_referred','faculty_referred','parent_referred','friend_referred','online_referral','office_referred'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Presenting Concern</label>
                          <textarea rows={3} value={formsDraftIcf.presenting_concern || ''} onChange={e => setFormsDraftIcf(p => ({...p,presenting_concern:e.target.value}))}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#1a5228]/25 focus:outline-none resize-none dark:bg-gray-800 dark:text-white" />
                        </div>
                      </div>
                    </div>
                    {/* SPIF */}
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Personal Background (SPIF-IF)</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div><label className="block text-xs text-gray-500 mb-1">Birthdate</label><input type="date" value={formsDraftSpif.birthdate||''} onChange={e=>setFormsDraftSpif(p=>({...p,birthdate:e.target.value}))} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#1a5228]/25 focus:outline-none dark:bg-gray-800 dark:text-white"/></div>
                        {(['gender','civil_status','family_composition'] as string[]).map(k => (
                          <div key={k}><label className="block text-xs text-gray-500 mb-1 capitalize">{k.replace(/_/g,' ')}</label>
                            <input value={formsDraftSpif[k]||''} onChange={e=>setFormsDraftSpif(p=>({...p,[k]:e.target.value}))} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#1a5228]/25 focus:outline-none dark:bg-gray-800 dark:text-white"/>
                          </div>
                        ))}
                        {(['living_with','existing_medical_conditions','current_medications'] as string[]).map(k => (
                          <div key={k}><label className="block text-xs text-gray-500 mb-1 capitalize">{k.replace(/_/g,' ')}</label>
                            <input value={formsDraftSpif[k]||''} onChange={e=>setFormsDraftSpif(p=>({...p,[k]:e.target.value}))} placeholder="None" className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#1a5228]/25 focus:outline-none dark:bg-gray-800 dark:text-white"/>
                          </div>
                        ))}
                        <div className="col-span-3 grid grid-cols-2 gap-3">
                          {(['previous_counseling','previous_psychiatric'] as string[]).map(k=>(
                            <label key={k} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                              <input type="checkbox" checked={!!formsDraftSpif[k]} onChange={e=>setFormsDraftSpif(p=>({...p,[k]:e.target.checked}))} className="w-4 h-4 rounded border-gray-300 text-green-700"/>
                              <span className="text-xs text-gray-700 dark:text-gray-300 capitalize">{k.replace(/_/g,' ')}?</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* PHQ-4 */}
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">PHQ-4 Pre-Screen</p>
                      <div className="space-y-2">
                        {['Little interest or pleasure in doing things','Feeling down, depressed, or hopeless','Feeling nervous, anxious, or on edge','Not being able to stop or control worrying'].map((q,i)=>(
                          <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                            <span className="text-xs text-gray-400 w-3">{i+1}.</span>
                            <span className="flex-1 text-xs text-gray-700 dark:text-gray-300">{q}</span>
                            <div className="flex gap-1">
                              {[0,1,2,3].map(v=>(
                                <button key={v} onClick={()=>{const a=[...formsDraftPhq4];a[i]=a[i]===v?null:v;setFormsDraftPhq4(a)}}
                                  className={`w-8 h-8 rounded-lg text-xs font-semibold border-2 transition ${formsDraftPhq4[i]===v?'bg-[#1a5228] border-[#1a5228] text-white':'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#1a5228]/40 bg-white dark:bg-gray-900'}`}>
                                  {v}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {formsMsg && <p className={`text-xs font-medium ${formsMsg.includes('saved')||formsMsg.includes('saved') ? 'text-green-700 dark:text-green-400' : 'text-red-600'}`}>{formsMsg}</p>}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 text-sm text-gray-400">No forms submitted yet.</div>
                )
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              {formsEditing ? (
                <>
                  <button onClick={() => setFormsEditing(false)} className="text-xs text-gray-500 hover:text-gray-700 transition">Cancel</button>
                  <button onClick={saveForms} disabled={formsSaving}
                    className="flex items-center gap-2 px-5 py-2 bg-[#1a5228] text-white text-sm font-semibold rounded-xl hover:bg-green-800 disabled:opacity-50 transition">
                    {formsSaving ? <Loader2 size={13} className="animate-spin" /> : null}
                    {formsSaving ? 'Saving…' : 'Save Forms'}
                  </button>
                </>
              ) : !formsPacket ? (
                <>
                  <span />
                  <button onClick={() => setFormsEditing(true)}
                    className="flex items-center gap-2 px-5 py-2 bg-[#1a5228] text-white text-sm font-semibold rounded-xl hover:bg-green-800 transition">
                    Fill In Forms
                  </button>
                </>
              ) : (
                <>
                  <span />
                  <button onClick={() => setFormsTarget(null)}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    Close
                  </button>
                </>
              )}
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
