"use client";

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { CheckInForm, CheckInHistory } from '@/components/CheckInForm';
import { useIntakeApi, useCheckInApi } from '@/utils/useApi';
import { AlertCircle, Loader, Plus, FileText, Target, Activity, Link2, Unlink, Loader2, Shield, X as XIcon, ArrowLeft, Download, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { ClinicalExportModal } from '@/components/ClinicalExportModal';
import { PermaBadge } from '@/components/PendingStudentsWithPerma';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { StructuredSOAPForm, StructuredSOAPData, emptyStructuredSOAP } from '@/components/StructuredSOAPForm';
import { TerminationFormModal, TerminationFormData } from '@/components/TerminationFormModal';

interface SessionNote {
  note_id: string;
  session_date: string;
  session_type: string;
  note_content?: string;
  note_format?: 'SOAP' | 'freeform';
  soap?: { subjective?: string; objective?: string; assessment?: string; plan?: string };
  structured_soap?: import('@/components/StructuredSOAPForm').StructuredSOAPData;
  mood_rating?: number;
  symptom_severity?: string;
  risk_flagged?: boolean;
  risk_notes?: string;
  risk_level?: string;
  counselor?: string;
  topics_discussed?: string;
  interventions?: string;
  client_response?: string;
  homework_assigned?: string;
  progress_on_goals?: string;
  supervisor_approved?: boolean | null;
  supervisor_name?: string;
  supervisor_comment?: string;
  supervisor_action_at?: string;
}

const emptyNote = {
  session_date: '',
  session_type: 'INDIVIDUAL',
  note_format: 'SOAP' as 'SOAP' | 'freeform',
  // SOAP fields
  soap_subjective: '',
  soap_objective: '',
  soap_assessment: '',
  soap_plan: '',
  // Freeform fields (kept for backward compatibility)
  topics_discussed: '',
  interventions: '',
  client_response: '',
  homework_assigned: '',
  mood_rating: 5,
  symptom_severity: 'MILD',
  progress_on_goals: '',
  risk_flagged: false,
  risk_notes: '',
};

/* ── Supervisor sign-off helper ─────────────────────────────────────────── */

function SupervisorActions({ noteId, onAction }: {
  noteId: string;
  onAction: (noteId: string, action: 'approve' | 'reject', comment?: string) => Promise<void>;
}) {
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [rejectError, setRejectError] = useState('');

  const act = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !comment.trim()) {
      setRejectError('A feedback comment is required when rejecting a note.');
      return;
    }
    setRejectError('');
    setBusy(true);
    await onAction(noteId, action, comment);
    setBusy(false);
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Supervisor Review</p>
      <textarea
        value={comment}
        onChange={e => { setComment(e.target.value); if (rejectError) setRejectError(''); }}
        rows={2}
        placeholder="Feedback comment (required for rejection)…"
        className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-1 focus:ring-blue-500"
      />
      {rejectError && (
        <p className="text-xs text-red-500">{rejectError}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => act('approve')}
          disabled={busy}
          className="px-3 py-1.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-medium rounded transition disabled:opacity-50"
        >Approve</button>
        <button
          onClick={() => act('reject')}
          disabled={busy}
          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded transition disabled:opacity-50"
        >Reject</button>
      </div>
    </div>
  );
}

/* ── Safety Plan helper components ──────────────────────────────────────── */

function SafetyListSection({ label, hint, items, onAdd, onRemove }: {
  label: string; hint: string; items: string[];
  onAdd: (v: string) => void; onRemove: (i: number) => void;
}) {
  const [val, setVal] = useState('');
  const commit = () => { if (val.trim()) { onAdd(val.trim()); setVal(''); } };
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-lg p-4">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-xs text-gray-400 mb-2">{hint}</p>
      <div className="flex gap-2 mb-2">
        <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), commit())}
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Add item…" />
        <button onClick={commit} className="px-3 py-1.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded text-sm"><Plus size={14} /></button>
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={`${item}-${i}`} className="flex items-center justify-between text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1">
            <span>{item}</span>
            <button onClick={() => onRemove(i)} className="text-gray-300 hover:text-red-500 ml-2"><XIcon size={13} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContactSection({ label, hint, items, fields, onAdd, onRemove }: {
  label: string; hint: string;
  items: Array<{ name: string; phone: string }>;
  fields: string[];
  onAdd: (v: { name: string; phone: string }) => void;
  onRemove: (i: number) => void;
}) {
  const [form, setForm] = useState({ name: '', phone: '' });
  const commit = () => {
    if (form.name.trim()) { onAdd({ ...form }); setForm({ name: '', phone: '' }); }
  };
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-lg p-4">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-xs text-gray-400 mb-2">{hint}</p>
      <div className="flex gap-2 mb-2">
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          placeholder="Name" />
        <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          className="w-36 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          placeholder="Phone" />
        <button onClick={commit} className="px-3 py-1.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded text-sm"><Plus size={14} /></button>
      </div>
      <ul className="space-y-1">
        {items.map((c, i) => (
          <li key={`item-${i}`} className="flex items-center justify-between text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1">
            <span>{c.name} <span className="text-gray-400 text-xs ml-1">{c.phone}</span></span>
            <button onClick={() => onRemove(i)} className="text-gray-300 hover:text-red-500 ml-2"><XIcon size={13} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}



function ProfessionalContactSection({ items, onAdd, onRemove }: {
  items: Array<{ name: string; phone: string; role: string }>;
  onAdd: (v: { name: string; phone: string; role: string }) => void;
  onRemove: (i: number) => void;
}) {
  const [form, setForm] = useState({ name: '', phone: '', role: '' });
  const commit = () => {
    if (form.name.trim()) { onAdd({ ...form }); setForm({ name: '', phone: '', role: '' }); }
  };
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-lg p-4">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-0.5">Professional / Crisis Contacts</p>
      <p className="text-xs text-gray-400 mb-2">Counselors, psychiatrists, crisis hotlines the client can reach out to.</p>
      <div className="flex gap-2 mb-2 flex-wrap">
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="flex-1 min-w-[120px] border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          placeholder="Name" />
        <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
          className="w-32 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          placeholder="Role / org" />
        <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          className="w-36 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          placeholder="Phone / hotline" />
        <button onClick={commit} className="px-3 py-1.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded text-sm"><Plus size={14} /></button>
      </div>
      <ul className="space-y-1">
        {items.map((c, i) => (
          <li key={`item-${i}`} className="flex items-center justify-between text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1">
            <span>{c.name} <span className="text-gray-400 text-xs">{c.role}</span> <span className="text-gray-400 text-xs ml-1">{c.phone}</span></span>
            <button onClick={() => onRemove(i)} className="text-gray-300 hover:text-red-500 ml-2"><XIcon size={13} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CaseDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const caseId = params.id as string;

  const { getCase, updateCaseStatus, loading: intakeLoading } = useIntakeApi();
  const { createCheckIn, getCheckInHistory, loading: checkInLoading } = useCheckInApi();

  const [currentUser, setCurrentUser] = useState<{ role?: string } | null>(null);
  const [caseData, setCaseData] = useState<any>(null);
  const [checkInHistory, setCheckInHistory] = useState<any[]>([]);
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([]);
  const tabParam = searchParams.get('tab') as any;
  const [activeTab, setActiveTab] = useState<'details' | 'intake-summary' | 'session-notes' | 'treatment-plan' | 'diagnoses' | 'safety-plan' | 'assessments' | 'check-ins' | 'perma'>(tabParam || 'details');
  const [diagnoses, setDiagnoses] = useState<Array<{ code: string; description: string; type: string; system: string; added_at: string }>>([]);
  const [diagForm, setDiagForm] = useState({ code: '', description: '', type: 'primary', system: 'DSM-5' });
  const [savingDiag, setSavingDiag] = useState(false);
  const [permaHistory, setPermaHistory] = useState<Array<{ date: string; perma_label: string | null }>>([]);
  const [permaLoading, setPermaLoading] = useState(false);
  const [permaTrendDrop, setPermaTrendDrop] = useState<string | null>(null);
  const [mhbotUsername, setMhbotUsername] = useState('');
  const [linkingMhbot, setLinkingMhbot] = useState(false);
  const [mhbotError, setMhbotError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [intakeSummary, setIntakeSummary] = useState<any>(null);
  const [intakePacket, setIntakePacket] = useState<any>(null);
  const [intakeSummaryLoaded, setIntakeSummaryLoaded] = useState(false);

  const [intakeForm, setIntakeForm] = useState<any>(null);
  const [intakeFormDraft, setIntakeFormDraft] = useState<any>(null);
  const [intakeFormEditing, setIntakeFormEditing] = useState(false);
  const [intakeFormSaving, setIntakeFormSaving] = useState(false);
  const [intakeFormError, setIntakeFormError] = useState('');
  const [intakeFormSuccess, setIntakeFormSuccess] = useState(false);

  const [showExportModal, setShowExportModal] = useState(false);
  const [showTerminationForm, setShowTerminationForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteForm, setNoteForm] = useState({ ...emptyNote, session_date: '' });
  const [structuredSoap, setStructuredSoap] = useState<StructuredSOAPData>({ ...emptyStructuredSOAP });
  const [savingNote, setSavingNote] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteForm, setEditNoteForm] = useState<{ topics_discussed: string; interventions: string; client_response: string; homework_assigned: string; mood_rating: number; risk_flagged: boolean; risk_notes: string; change_reason: string }>({ topics_discussed: '', interventions: '', client_response: '', homework_assigned: '', mood_rating: 5, risk_flagged: false, risk_notes: '', change_reason: '' });
  const [savingEditNote, setSavingEditNote] = useState(false);

  const [caseAppointments, setCaseAppointments] = useState<Array<{
    _id: string; status: string; scheduled_at?: string; preferred_date?: string;
    counselor_name?: string; reference_id?: string;
  }>>([]);
  const [completingAppt, setCompletingAppt] = useState<string | null>(null);

  const [treatmentPlan, setTreatmentPlan] = useState<{
    goals: Array<{ goal: string; target_date: string; status: 'not_started' | 'in_progress' | 'achieved' }>;
    interventions: string[];
    progress_summary: string;
    estimated_duration: string;
    next_review_date: string;
  }>({ goals: [], interventions: [], progress_summary: '', estimated_duration: '', next_review_date: '' });
  const [editingPlan, setEditingPlan] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  const emptySafetyPlan = {
    warning_signs: [] as string[],
    internal_coping: [] as string[],
    social_distractions: [] as string[],
    social_contacts: [] as Array<{ name: string; phone: string }>,
    professional_contacts: [] as Array<{ name: string; phone: string; role: string }>,
    reasons_to_live: [] as string[],
    means_restriction: '',
    follow_up_date: '',
    counselor_signature: '',
  };
  const [safetyPlan, setSafetyPlan] = useState(emptySafetyPlan);
  const [safetyPlanExists, setSafetyPlanExists] = useState(false);
  const [editingSafetyPlan, setEditingSafetyPlan] = useState(false);
  const [savingSafetyPlan, setSavingSafetyPlan] = useState(false);
  const [safetyPlanLoaded, setSafetyPlanLoaded] = useState(false);

  const [assessmentSchedules, setAssessmentSchedules] = useState<Array<{
    schedule_id: string; assessment_type: string; interval_days: number; next_due: string; active: boolean;
  }>>([]);
  const [scheduleForm, setScheduleForm] = useState({ assessment_type: 'PHQ9', interval_days: 14, start_date: '' });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [schedulesLoaded, setSchedulesLoaded] = useState(false);

  // Assessment recording state
  interface AssessmentTemplate {
    assessment_type: string; name: string; instruction: string;
    questions: string[]; scale: Array<{ value: number; label: string }>;
    max_score: number; severity_guide: Array<{ range: string; label: string }>;
    reversed_items?: number[];
  }
  interface AssessmentRecord {
    _id: string; assessment_type: string; raw_score: number; max_score: number;
    severity: string; risk_level: string | null; created_at: string;
  }
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentRecord[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [recordingType, setRecordingType] = useState<string | null>(null);
  const [assessmentTemplate, setAssessmentTemplate] = useState<AssessmentTemplate | null>(null);
  const [assessmentResponses, setAssessmentResponses] = useState<Record<string, number>>({});
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<{ score: number; max: number; severity: string; risk: string | null } | null>(null);

  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setNoteForm((f) => ({ ...f, session_date: now.toISOString().slice(0, 16) }));
    loadCaseData();
    loadCaseAppointments();
  }, [caseId]);

  const loadCaseAppointments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api(`/api/appointments?case_id=${caseId}&limit=20`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const active = (data.appointments || []).filter((a: any) =>
          !['COMPLETED', 'CANCELLED', 'NO_SHOW', 'DENIED'].includes(a.status)
        );
        setCaseAppointments(active);
      }
    } catch (err) {
      console.error('Failed to load case appointments:', err);
    }
  };

  const handleCompleteAndDocument = async (appointmentId: string) => {
    setCompletingAppt(appointmentId);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/appointments/${appointmentId}/complete`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const e = await r.json();
        setError(e.error || 'Failed to mark appointment complete');
        return;
      }
      await loadCaseAppointments();
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setNoteForm({ ...emptyNote, session_date: now.toISOString().slice(0, 16) });
      setShowNoteForm(true);
      setActiveTab('session-notes');
      showSuccess('Appointment marked complete — fill in the session note below.');
    } catch (err: any) {
      setError(err.message || 'Failed to complete appointment');
    } finally {
      setCompletingAppt(null);
    }
  };

  const loadCaseData = async () => {
    try {
      setError(null);
      const raw = localStorage.getItem('user');
      if (raw) setCurrentUser(JSON.parse(raw));
      const [caseRes, historyRes] = await Promise.all([
        getCase(caseId),
        getCheckInHistory(caseId),
      ]);
      setCaseData(caseRes);
      setCheckInHistory(historyRes?.check_ins || []);
      if (caseRes?.treatment_plan) {
        const tp = caseRes.treatment_plan;
        if (typeof tp === 'object' && tp !== null) {
          setTreatmentPlan({ goals: tp.goals || [], interventions: tp.interventions || [], progress_summary: tp.progress_summary || '', estimated_duration: tp.estimated_duration || '', next_review_date: tp.next_review_date || '' });
        } else if (typeof tp === 'string' && tp) {
          setTreatmentPlan(prev => ({ ...prev, progress_summary: tp }));
        }
      }
      // Load PERMA history eagerly so trend and outcome tracking are available on details tab
      if (caseRes?.student?.mhbot_username) {
        loadPermaHistory(caseRes);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load case data');
    }
  };

  const loadSessionNotes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api(`/api/counseling/case/${caseId}/session-history`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessionNotes(data.sessions || data.notes || []);
      }
    } catch (err) {
      console.error('Failed to load session notes:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'session-notes') loadSessionNotes();
    if (activeTab === 'perma' && permaHistory.length === 0) loadPermaHistory();
    if (activeTab === 'diagnoses') loadDiagnoses();
    if (activeTab === 'safety-plan' && !safetyPlanLoaded) loadSafetyPlan();
    if (activeTab === 'intake-summary' && !intakeSummaryLoaded) loadIntakeSummary();
    if (activeTab === 'assessments') {
      if (!schedulesLoaded) loadAssessmentSchedules();
      if (!historyLoaded) loadAssessmentHistory();
    }
  }, [activeTab]);

  const loadSafetyPlan = async () => {
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/high-risk/case/${caseId}/safety-plan`), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const d = await r.json();
        setSafetyPlan({
          warning_signs: d.warning_signs || [],
          internal_coping: d.internal_coping || [],
          social_distractions: d.social_distractions || [],
          social_contacts: d.social_contacts || [],
          professional_contacts: d.professional_contacts || [],
          reasons_to_live: d.reasons_to_live || [],
          means_restriction: d.means_restriction || '',
          follow_up_date: d.follow_up_date || '',
          counselor_signature: d.counselor_signature || '',
        });
        setSafetyPlanExists(true);
      } else {
        setSafetyPlanExists(false);
        setEditingSafetyPlan(true);
      }
    } catch {
      setSafetyPlanExists(false);
      setEditingSafetyPlan(true);
    }
    setSafetyPlanLoaded(true);
  };

  const saveSafetyPlan = async () => {
    const token = localStorage.getItem('token');
    setSavingSafetyPlan(true);
    try {
      const r = await fetch(api(`/api/high-risk/case/${caseId}/safety-plan`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(safetyPlan),
      });
      if (r.ok) {
        setSafetyPlanExists(true);
        setEditingSafetyPlan(false);
        setSuccess('Safety plan saved.');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to save safety plan.');
      }
    } finally { setSavingSafetyPlan(false); }
  };

  const loadAssessmentSchedules = async () => {
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/assessments/case/${caseId}/schedule`), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setAssessmentSchedules(d.schedules || []); }
    } catch {}
    setSchedulesLoaded(true);
  };

  const handleAddSchedule = async () => {
    const token = localStorage.getItem('token');
    setSavingSchedule(true);
    try {
      const r = await fetch(api(`/api/assessments/case/${caseId}/schedule`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleForm),
      });
      if (r.ok) { await loadAssessmentSchedules(); setScheduleForm({ assessment_type: 'PHQ9', interval_days: 14, start_date: '' }); }
    } finally { setSavingSchedule(false); }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    const token = localStorage.getItem('token');
    await fetch(api(`/api/assessments/schedule/${scheduleId}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await loadAssessmentSchedules();
  };

  const loadAssessmentHistory = async () => {
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/assessments/case/${caseId}/history`), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setAssessmentHistory(d.assessments || []); }
    } catch {}
    setHistoryLoaded(true);
  };

  const startRecording = async (type: string) => {
    const token = localStorage.getItem('token');
    const key = type.toLowerCase().replace('9', '9').replace('7', '7');
    const path = type === 'PHQ9' ? 'phq9' : type === 'GAD7' ? 'gad7' : 'pss';
    try {
      const r = await fetch(api(`/api/assessments/${path}/template`), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const tmpl = await r.json();
        setAssessmentTemplate(tmpl);
        setAssessmentResponses({});
        setAssessmentResult(null);
        setRecordingType(type);
      }
    } catch { setError('Failed to load assessment template'); }
  };

  const handleSubmitAssessment = async () => {
    if (!assessmentTemplate) return;
    const total = assessmentTemplate.questions.length;
    for (let i = 0; i < total; i++) {
      if (assessmentResponses[String(i)] === undefined) {
        setError('Please answer all questions before submitting.'); return;
      }
    }
    setSavingAssessment(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/assessments/${caseId}/triage`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment_type: recordingType, responses: assessmentResponses }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to save');
      setAssessmentResult({ score: d.raw_score, max: d.max_score, severity: d.severity, risk: d.risk_level });
      setRecordingType(null);
      setAssessmentTemplate(null);
      await loadAssessmentHistory();
    } catch (err: any) {
      setError(err.message);
    } finally { setSavingAssessment(false); }
  };

  const addSafetyPlanItem = (field: keyof typeof safetyPlan, value: string | object) => {
    setSafetyPlan(prev => ({ ...prev, [field]: [...(prev[field] as any[]), value] }));
  };

  const removeSafetyPlanItem = (field: keyof typeof safetyPlan, index: number) => {
    setSafetyPlan(prev => ({ ...prev, [field]: (prev[field] as any[]).filter((_: any, i: number) => i !== index) }));
  };

  const loadDiagnoses = async () => {
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/cases/${caseId}/diagnoses`), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setDiagnoses(d.diagnoses || []); }
    } catch {}
  };

  const handleAddDiagnosis = async () => {
    if (!diagForm.code || !diagForm.description) return;
    const token = localStorage.getItem('token');
    setSavingDiag(true);
    try {
      const r = await fetch(api(`/api/cases/${caseId}/diagnoses`), {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(diagForm),
      });
      if (r.ok) {
        setDiagForm({ code: '', description: '', type: 'primary', system: 'DSM-5' });
        await loadDiagnoses();
      }
    } finally { setSavingDiag(false); }
  };

  const handleRemoveDiagnosis = async (index: number) => {
    const token = localStorage.getItem('token');
    await fetch(api(`/api/cases/${caseId}/diagnoses/${index}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await loadDiagnoses();
  };

  const loadIntakeSummary = async () => {
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/intake/case/${caseId}`), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const d = await r.json();
        setIntakeSummary(d);
        if (d.appointment_id) {
          const pr = await fetch(api(`/api/intake/packet/${d.appointment_id}`), { headers: { Authorization: `Bearer ${token}` } });
          if (pr.ok) setIntakePacket(await pr.json());
        }
      }
    } catch {}
    setIntakeSummaryLoaded(true);
    // Fetch case fresh to get intake_interview_form — avoids stale closure on caseData
    try {
      const token2 = localStorage.getItem('token');
      const cr = await fetch(api(`/api/cases/${caseId}`), { headers: { Authorization: `Bearer ${token2}` } });
      if (cr.ok) {
        const freshCase = await cr.json();
        setCaseData(freshCase);
        if (freshCase?.intake_interview_form) {
          setIntakeForm(freshCase.intake_interview_form);
          setIntakeFormDraft(freshCase.intake_interview_form);
          setIntakeFormEditing(false);
          return;
        }
      }
    } catch {}
    // No saved form yet — start blank in edit mode
    setIntakeFormDraft({});
    setIntakeFormEditing(true);
  };

  const handleSaveIntakeForm = async () => {
    if (!intakeFormDraft) return;
    // Validation
    const missingFields: string[] = [];
    const d = intakeFormDraft;
    if (!d.type_of_service) missingFields.push('Type of Service');
    if (!d.referral_source?.length) missingFields.push('Referral Source');
    if (!d.clinical_diagnosis) missingFields.push('Clinical Diagnosis');
    if (!d.general_appearance?.length) missingFields.push('General Appearance and Presentation');
    if (!d.communication_style?.length) missingFields.push('Communication Style');
    if (!d.general_disposition?.length) missingFields.push('General Disposition / Demeanor');
    if (!d.brief_description_remarks?.trim()) missingFields.push('Brief Description Remarks');
    if (!d.presenting_problem?.length) missingFields.push('Presenting Problem');
    if (!d.presenting_problem_remarks?.trim()) missingFields.push('Presenting Problem Remarks');
    if (!d.psychosocial_history?.length) missingFields.push('Psychosocial History');
    if (!d.psychosocial_remarks?.trim()) missingFields.push('Psychosocial Remarks');
    if (!d.interaction_relationship?.length) missingFields.push('Interaction and Relationship with Counselor');
    if (!d.affect_expression?.length) missingFields.push('Affect / Emotional Expression');
    if (!d.interaction_remarks?.trim()) missingFields.push('Interaction Remarks');
    if (!d.maladaptive_patterns?.length) missingFields.push('Maladaptive Patterns');
    if (!d.counseling_goal?.trim()) missingFields.push('Counseling/Psychotherapy Goal');
    if (!d.predisposing_factors?.length) missingFields.push('Predisposing Factors');
    if (!d.precipitating_factors?.length) missingFields.push('Precipitating Factors');
    if (!d.perpetuating_factors?.length) missingFields.push('Perpetuating Factors');
    if (!d.protective_factors?.length) missingFields.push('Protective Factors');
    if (!d.recommendation?.length) missingFields.push('Recommendation');

    if (missingFields.length > 0) {
      setIntakeFormError('Please complete all required fields before saving.');
      return;
    }
    setIntakeFormError('');
    setIntakeFormSaving(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/cases/${caseId}/intake-form`), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(intakeFormDraft),
      });
      if (!r.ok) throw new Error('Failed to save intake form');
      setIntakeForm(intakeFormDraft);
      setCaseData((prev: any) => prev ? { ...prev, intake_interview_form: intakeFormDraft } : prev);
      setIntakeFormEditing(false);
      setIntakeFormSuccess(true);
      setTimeout(() => setIntakeFormSuccess(false), 3000);
    } catch (err: any) {
      setIntakeFormError(err.message || 'Failed to save');
    } finally {
      setIntakeFormSaving(false);
    }
  };

  const LABEL_SCORE: Record<string, number> = {
    'Excelling': 5, 'Thriving': 4, 'Surviving': 3, 'Struggling': 2, 'In Crisis': 1,
  };

  function detectTrendDrop(history: Array<{ perma_label: string | null }>): string | null {
    const scored = history
      .filter(h => h.perma_label && LABEL_SCORE[h.perma_label])
      .slice(0, 5); // last 5 labelled entries
    if (scored.length < 2) return null;
    const latest = LABEL_SCORE[scored[0].perma_label!];
    const prev = LABEL_SCORE[scored[scored.length - 1].perma_label!];
    const drop = prev - latest;
    if (drop >= 2) return `${scored[scored.length - 1].perma_label} → ${scored[0].perma_label}`;
    return null;
  }

  const loadPermaHistory = async (caseDataOverride?: any) => {
    const cd = caseDataOverride ?? caseData;
    if (!cd) return;
    const student = cd.student || {};
    const username = student.mhbot_username;
    if (!username) return;
    setPermaLoading(true);
    setMhbotError('');
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/mhbot/perma/${encodeURIComponent(username)}?limit=20`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const d = await r.json();
        const history = d.history ?? [];
        setPermaHistory(history);
        setPermaTrendDrop(detectTrendDrop(history));
      } else {
        setMhbotError('Failed to fetch PERMA history');
      }
    } catch {
      setMhbotError('Network error fetching PERMA data');
    } finally {
      setPermaLoading(false);
    }
  };

  const linkMhbot = async () => {
    if (!mhbotUsername.trim()) return;
    setLinkingMhbot(true);
    setMhbotError('');
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/mhbot/case/${caseId}/link-mhbot`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mhbot_username: mhbotUsername.trim() }),
      });
      const d = await r.json();
      if (r.ok) {
        setMhbotUsername('');
        // Refresh case data to get updated mhbot_username on student
        const caseRes = await fetch(api(`/api/cases/${caseId}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (caseRes.ok) setCaseData(await caseRes.json());
        setPermaHistory([]);
        loadPermaHistory();
      } else {
        setMhbotError(d.error || 'Failed to link MHBot account');
      }
    } catch {
      setMhbotError('Network error');
    } finally {
      setLinkingMhbot(false);
    }
  };

  const unlinkMhbot = async () => {
    if (!confirm('Unlink this student from MHBot? PERMA history will no longer sync.')) return;
    setLinkingMhbot(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(api(`/api/mhbot/case/${caseId}/unlink-mhbot`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setPermaHistory([]);
      const caseRes = await fetch(api(`/api/cases/${caseId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (caseRes.ok) setCaseData(await caseRes.json());
    } catch {}
    finally { setLinkingMhbot(false); }
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleUpdateStatus = async (clientStatus: string) => {
    try {
      setError(null);
      await updateCaseStatus(caseId, clientStatus, 'Updated via case detail');
      await loadCaseData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateCheckIn = async (data: any) => {
    try {
      setError(null);
      await createCheckIn({ ...data, case_id: caseId });
      await loadCaseData();
      setActiveTab('check-ins');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTerminateCase = async (formData: TerminationFormData) => {
    const token = localStorage.getItem('token');
    const res = await fetch(api(`/api/cases/${caseId}/close`), {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to terminate case');
    }
    setShowTerminationForm(false);
    showSuccess('Case has been terminated and closed.');
    // Reload case data to reflect CLOSED status
    const r2 = await fetch(api(`/api/cases/${caseId}`), { headers: { Authorization: `Bearer ${token}` } });
    if (r2.ok) setCaseData(await r2.json());
  };

  const handleSaveNote = async () => {
    try {
      setSavingNote(true);
      const token = localStorage.getItem('token');
      const payload = noteForm.note_format === 'SOAP'
        ? { ...noteForm, structured_soap: structuredSoap }
        : noteForm;
      const res = await fetch(api(`/api/counseling/case/${caseId}/session-note`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save session note');
      }
      showSuccess('Session note saved');
      setShowNoteForm(false);
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setNoteForm({ ...emptyNote, session_date: now.toISOString().slice(0, 16) });
      setStructuredSoap({ ...emptyStructuredSOAP });
      await loadSessionNotes();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingNote(false);
    }
  };

  const handleApproveNote = async (noteId: string, action: 'approve' | 'reject', comment?: string) => {
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/counseling/session-note/${noteId}/approve`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment: comment || '' }),
      });
      if (r.ok) {
        showSuccess(`Note ${action}d.`);
        await loadSessionNotes();
      } else {
        const e = await r.json();
        setError(e.error || `Failed to ${action} note`);
      }
    } catch (e: any) { setError(e.message); }
  };

  const handleUpdateNote = async (noteId: string) => {
    try {
      setSavingEditNote(true);
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/case-management/session-notes/${noteId}`), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editNoteForm),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed to update note'); }
      showSuccess('Note updated');
      setEditingNoteId(null);
      await loadSessionNotes();
    } catch (e: any) { setError(e.message); }
    finally { setSavingEditNote(false); }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this session note? This action can be reversed by an admin.')) return;
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/case-management/session-notes/${noteId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed to delete note'); }
      showSuccess('Note deleted');
      await loadSessionNotes();
    } catch (e: any) { setError(e.message); }
  };

  const handleSaveTreatmentPlan = async () => {
    try {
      setSavingPlan(true);
      const token = localStorage.getItem('token');
      const res = await fetch(api(`/api/cases/${caseId}`), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ treatment_plan: treatmentPlan }),
      });
      if (!res.ok) throw new Error('Failed to save treatment plan');
      setEditingPlan(false);
      showSuccess('Treatment plan updated');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingPlan(false);
    }
  };

  if (!caseData && !error) {
    return (
      <DashboardPageWrapper title="Case Details" subtitle="">
        <div className="flex items-center justify-center p-8">
          <Loader size={24} className="animate-spin text-blue-600" />
        </div>
      </DashboardPageWrapper>
    );
  }

  const tabs = [
    { id: 'details' as const, label: 'Case Details' },
    { id: 'intake-summary' as const, label: 'Intake Summary' },
    { id: 'session-notes' as const, label: `Session Notes (${sessionNotes.length})` },
    { id: 'treatment-plan' as const, label: 'Treatment Plan' },
    { id: 'diagnoses' as const, label: `Diagnoses (${diagnoses.length})` },
    { id: 'safety-plan' as const, label: 'Safety Plan' },
    { id: 'assessments' as const, label: 'Assessments' },
    { id: 'check-ins' as const, label: `Check-Ins (${checkInHistory.length})` },
    { id: 'perma' as const,     label: 'PERMA / MHBot' },
  ];

  const RISK_BADGE: Record<string, string> = {
    GREEN:    'bg-green-50 text-green-700 ring-1 ring-green-200',
    YELLOW:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    RED:      'bg-red-50 text-red-700 ring-1 ring-red-200',
    CRITICAL: 'bg-red-100 text-red-900 ring-1 ring-red-300 font-semibold',
  };

  const studentName = caseData?.student?.name || caseData?.student_name || '—';
  const studentSchoolId = caseData?.student?.school_id || caseData?.student_id || '—';
  const studentEmail = caseData?.student?.email || '';
  const riskLevel = (caseData?.risk_level || 'GREEN').toUpperCase();

  return (
    <>
    <DashboardPageWrapper
      title="Case Details"
      subtitle={caseData?.case_number ? `Case ${caseData.case_number}` : 'Loading…'}
    >
      {/* Back navigation + Print */}
      <div className="mb-4 flex items-center justify-between">
        <Link href="/cases" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#2563eb] transition-colors">
          <ArrowLeft size={15} /> Back to Cases
        </Link>
        {caseData && (
          <a
            href={`/cases/${params.id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <FileText size={13} /> Print Case Summary
          </a>
        )}
      </div>

      {error && (
        <div className="mb-4 flex gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle className="text-red-600 flex-shrink-0" size={18} />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700 text-lg leading-none">×</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          {success}
        </div>
      )}

      {/* ── Student identity banner — always visible ─────────────── */}
      {caseData && (
        <div className="mb-5 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-wrap items-center gap-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0"
            style={{ backgroundColor: '#2563eb' }}>
            {studentName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-gray-900 leading-tight">{studentName}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{studentSchoolId}{studentEmail ? ` · ${studentEmail}` : ''}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex text-[11px] px-2.5 py-1 rounded-full font-medium ${RISK_BADGE[riskLevel] ?? RISK_BADGE['GREEN']}`}>
              {riskLevel === 'GREEN' ? 'Low Risk' : riskLevel === 'YELLOW' ? 'Moderate' : riskLevel === 'RED' ? 'High Risk' : 'Critical'}
            </span>
            <span className="inline-flex text-[11px] px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-200">
              {(caseData.client_status || caseData.case_status || 'ACTIVE').replace(/_/g, ' ')}
            </span>
            {caseData.case_number && (
              <span className="text-[11px] text-gray-400 font-mono">{caseData.case_number}</span>
            )}
            {!['CLOSED', 'closed'].includes(caseData.case_status || caseData.client_status || '') && (
              <button
                onClick={() => setShowTerminationForm(true)}
                className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-red-50 text-red-600 ring-1 ring-red-200 hover:bg-red-100 transition"
              >
                Terminate Case
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-0.5 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'border-[#2563eb] text-[#2563eb]'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Details Tab ─────────────────────────────────────────── */}
      {activeTab === 'details' && caseData && (
        <div className="space-y-6">

          {/* Trend drop warning banner */}
          {permaTrendDrop && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Wellbeing decline detected</p>
                <p className="text-xs text-amber-700 mt-0.5">Recent EMA history shows a significant drop: <strong>{permaTrendDrop}</strong>. Consider earlier follow-up.</p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-4">Case Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Student ID</p>
                <p className="font-medium text-gray-900 dark:text-gray-50 mt-0.5">{caseData.student_id}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Client Status</p>
                <span className="inline-block mt-0.5 px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium">
                  {caseData.client_status || 'N/A'}
                </span>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Risk Level</p>
                <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  caseData.risk_level === 'RED' ? 'bg-red-100 text-red-800' :
                  caseData.risk_level === 'YELLOW' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {caseData.risk_level || 'GREEN'}
                </span>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Created</p>
                <p className="font-medium text-gray-900 dark:text-gray-50 mt-0.5">
                  {caseData.created_at ? new Date(caseData.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              {caseData.target_sessions != null && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Sessions</p>
                  <p className="font-medium text-gray-900 dark:text-gray-50 mt-0.5">
                    {caseData.session_count || 0} / {caseData.target_sessions}
                  </p>
                </div>
              )}
              {caseData.transaction_type && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Transaction Type</p>
                  <p className="font-medium text-gray-900 dark:text-gray-50 mt-0.5">{caseData.transaction_type}</p>
                </div>
              )}
            </div>
          </div>

          {caseAppointments.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-4">Active Appointments</h3>
              <div className="space-y-3">
                {caseAppointments.map((appt) => {
                  const dateStr = appt.scheduled_at || appt.preferred_date;
                  const displayDate = dateStr
                    ? new Date(dateStr).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                    : 'No date set';
                  return (
                    <div key={appt._id} className="flex items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{displayDate}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {appt.reference_id && <span className="mr-2">{appt.reference_id}</span>}
                          <span className="capitalize">{appt.status.toLowerCase().replace(/_/g, ' ')}</span>
                        </p>
                      </div>
                      {['CONFIRMED', 'MATCHED', 'CHECKED_IN'].includes(appt.status) && (
                        <button
                          onClick={() => handleCompleteAndDocument(appt._id)}
                          disabled={completingAppt === appt._id}
                          className="flex-shrink-0 px-3 py-1.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
                        >
                          {completingAppt === appt._id ? 'Completing…' : 'Complete & Document'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-3">Update Client Status</h3>
            <select
              value={caseData.client_status || 'ACTIVE'}
              onChange={(e) => handleUpdateStatus(e.target.value)}
              disabled={intakeLoading}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
            >
              <option value="ACTIVE">ACTIVE — Ongoing Counseling</option>
              <option value="INACTIVE">INACTIVE — Not Receiving Services</option>
              <option value="CHECK_IN_ONLY">CHECK_IN_ONLY — Periodic Monitoring</option>
              <option value="WITH_MH_CHECK_IN">WITH_MH_CHECK_IN — Collaborative Care</option>
              <option value="UNDER_ACCOMMODATION">UNDER_ACCOMMODATION — SDFO</option>
              <option value="TERMINATION_PENDING">TERMINATION_PENDING — Closing Out</option>
            </select>
          </div>

          {caseData.presenting_issue && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-2">Presenting Issue</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">{caseData.presenting_issue}</p>
            </div>
          )}

          {/* Feature 5: Wellbeing Outcome Tracking */}
          {caseData.initial_perma_label && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Wellbeing Outcome</p>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">At intake</p>
                  <PermaBadge label={caseData.initial_perma_label} />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-gray-300 text-lg">→</div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">Current</p>
                  <PermaBadge label={permaHistory[0]?.perma_label ?? null} />
                </div>
                {permaHistory[0]?.perma_label && caseData.initial_perma_label && (() => {
                  const SCORE: Record<string, number> = { 'Excelling': 5, 'Thriving': 4, 'Surviving': 3, 'Struggling': 2, 'In Crisis': 1 };
                  const delta = (SCORE[permaHistory[0].perma_label!] ?? 0) - (SCORE[caseData.initial_perma_label] ?? 0);
                  if (delta === 0) return null;
                  return (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${delta > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {delta > 0 ? `↑ +${delta}` : `↓ ${delta}`} levels
                    </span>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Intake Summary Tab ────────────────────────────────── */}
      {activeTab === 'intake-summary' && (
        <div className="space-y-4">
          {!intakeSummaryLoaded && (
            <div className="flex items-center justify-center p-12">
              <Loader2 size={24} className="animate-spin text-[#2563eb]" />
            </div>
          )}
          {intakeSummaryLoaded && !intakeSummary && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <FileText size={32} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm font-medium text-gray-500">No intake record found for this case.</p>
              <p className="text-xs text-gray-400 mt-1">The intake may not have been completed yet.</p>
            </div>
          )}
          {intakeSummary && (() => {
            const icInterviewForm = caseData?.intake_interview_form;
            const phq9 = icInterviewForm?.phq9_score ?? intakeSummary.phq9_score;
            const gad7 = icInterviewForm?.gad7_score ?? intakeSummary.gad7_score;
            const decision = intakeSummary.triage_decision;
            const risk = (intakeSummary.risk_level || 'GREEN').toUpperCase();

            const RISK_CONFIG: Record<string, { bar: string; badge: string; label: string }> = {
              GREEN:    { bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',    label: 'Low Risk'      },
              YELLOW:   { bar: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 ring-amber-200',          label: 'Moderate Risk' },
              RED:      { bar: 'bg-red-500',     badge: 'bg-red-50 text-red-700 ring-red-200',                label: 'High Risk'     },
              CRITICAL: { bar: 'bg-red-700',     badge: 'bg-red-100 text-red-900 ring-red-300 font-bold',     label: 'Critical Risk' },
            };
            const riskCfg = RISK_CONFIG[risk] ?? RISK_CONFIG['GREEN'];

            const phq9Sev   = phq9 == null ? null : phq9 <= 4 ? { l: 'Minimal',           c: 'text-emerald-600' }
                            : phq9 <= 9    ? { l: 'Mild',               c: 'text-amber-600'   }
                            : phq9 <= 14   ? { l: 'Moderate',           c: 'text-orange-600'  }
                            : phq9 <= 19   ? { l: 'Moderately Severe',  c: 'text-red-600'     }
                            :                { l: 'Severe',             c: 'text-red-700'     };
            const gad7Sev   = gad7 == null ? null : gad7 <= 4 ? { l: 'Minimal',   c: 'text-emerald-600' }
                            : gad7 <= 9    ? { l: 'Mild',       c: 'text-amber-600'   }
                            : gad7 <= 14   ? { l: 'Moderate',   c: 'text-orange-600'  }
                            :                { l: 'Severe',     c: 'text-red-600'     };

            const DECISION_CONFIG: Record<string, { label: string; sub: string; cls: string; dot: string }> = {
              ENDORSE_CC:      { label: 'Endorsed to Counselor',     sub: 'CC', cls: 'border-blue-200 bg-blue-50/60',   dot: 'bg-blue-500'   },
              ENDORSE_CP:      { label: 'Endorsed to Psychologist',  sub: 'CP', cls: 'border-violet-200 bg-violet-50/60', dot: 'bg-violet-500' },
              CLOSE_AT_INTAKE: { label: 'Closed at Intake',          sub: '',   cls: 'border-gray-200 bg-gray-50',      dot: 'bg-gray-400'   },
            };
            const decisionCfg = DECISION_CONFIG[decision] ?? null;

            const icf  = intakePacket?.icf  || {};
            const spif = intakePacket?.spif || {};
            const phq4r = intakePacket?.phq4_responses || [];
            const phq2Score = phq4r.length >= 2 ? phq4r[0] + phq4r[1] : null;
            const gad2Score = phq4r.length >= 4 ? phq4r[2] + phq4r[3] : null;

            const fmtDt = (s: string) => {
              try { return new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }); }
              catch { return s; }
            };

            const ScoreBar = ({ value, max, thresholds }: { value: number | null; max: number; thresholds: number[] }) => {
              if (value == null) return <div className="h-2 rounded-full bg-gray-100 w-full" />;
              const pct = Math.min(100, (value / max) * 100);
              const zone = thresholds.filter(t => value > t).length;
              const barColors = ['bg-emerald-400', 'bg-amber-400', 'bg-orange-400', 'bg-red-500', 'bg-red-700'];
              return (
                <div className="h-2 rounded-full bg-gray-100 w-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${barColors[zone]}`} style={{ width: `${pct}%` }} />
                </div>
              );
            };

            return (
              <>
                {/* ── Top bar: export + metadata ── */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{intakeSummary.source === 'walkin' ? 'Walk-in intake' : 'Online booking'}</span>
                    {intakeSummary.triaged_at && (
                      <><span>·</span><span>Triaged {fmtDt(intakeSummary.triaged_at)}</span></>
                    )}
                  </div>
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-2xl border border-gray-100 shadow-sm text-gray-500 hover:border-[#2563eb] hover:text-[#2563eb] transition font-medium"
                  >
                    <Download size={12} /> Export PDF
                  </button>
                </div>

                {/* ── Triage outcome card ── */}
                {decisionCfg ? (
                  <div className={`rounded-xl border-2 p-5 ${decisionCfg.cls}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${decisionCfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Triage Decision</p>
                          {decisionCfg.sub && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/70 font-bold text-gray-500">{decisionCfg.sub}</span>
                          )}
                        </div>
                        <p className="text-base font-bold text-gray-900 mt-0.5">{decisionCfg.label}</p>
                        {intakeSummary.endorsement_notes && (
                          <p className="text-sm text-gray-600 mt-2 leading-relaxed border-t border-black/5 pt-2">{intakeSummary.endorsement_notes}</p>
                        )}
                      </div>
                      <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold ring-1 ${riskCfg.badge}`}>{riskCfg.label}</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                    Triage not yet completed
                  </div>
                )}

                {/* ── Clinical scores ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* PHQ-9 */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">PHQ-9</p>
                        <p className="text-[10px] text-gray-400">Depression</p>
                      </div>
                      {phq9 != null ? (
                        <div className="text-right">
                          <span className="text-2xl font-bold text-gray-900">{phq9}</span>
                          <span className="text-xs text-gray-400 ml-1">/ 27</span>
                        </div>
                      ) : <span className="text-sm text-gray-300">Not administered</span>}
                    </div>
                    <ScoreBar value={phq9} max={27} thresholds={[4, 9, 14, 19]} />
                    {phq9Sev && <p className={`text-xs font-semibold mt-1.5 ${phq9Sev.c}`}>{phq9Sev.l}</p>}
                    {phq9 == null && <div className="h-5" />}
                  </div>

                  {/* GAD-7 */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">GAD-7</p>
                        <p className="text-[10px] text-gray-400">Anxiety</p>
                      </div>
                      {gad7 != null ? (
                        <div className="text-right">
                          <span className="text-2xl font-bold text-gray-900">{gad7}</span>
                          <span className="text-xs text-gray-400 ml-1">/ 21</span>
                        </div>
                      ) : <span className="text-sm text-gray-300">Not administered</span>}
                    </div>
                    <ScoreBar value={gad7} max={21} thresholds={[4, 9, 14]} />
                    {gad7Sev && <p className={`text-xs font-semibold mt-1.5 ${gad7Sev.c}`}>{gad7Sev.l}</p>}
                    {gad7 == null && <div className="h-5" />}
                  </div>
                </div>

                {/* PHQ-4 pre-screen */}
                {phq4r.length >= 4 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">PHQ-4 Pre-Screen</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'PHQ-2', score: phq2Score, max: 6, threshold: 3, name: 'Depression screen' },
                        { label: 'GAD-2', score: gad2Score, max: 6, threshold: 3, name: 'Anxiety screen'    },
                        { label: 'Total', score: phq2Score != null && gad2Score != null ? phq2Score + gad2Score : null, max: 12, threshold: 6, name: 'Combined' },
                      ].map(({ label, score, max, threshold, name }) => (
                        <div key={label} className="text-center">
                          <p className="text-[10px] text-gray-400 mb-1">{name}</p>
                          <p className="text-xs font-bold text-gray-500 mb-0.5">{label}</p>
                          <p className="text-xl font-bold text-gray-900">{score ?? '—'}<span className="text-xs font-normal text-gray-400">/{max}</span></p>
                          {score != null && (
                            <span className={`text-[10px] font-semibold mt-0.5 inline-block ${score >= threshold ? 'text-red-500' : 'text-emerald-600'}`}>
                              {score >= threshold ? '⚑ Positive' : '✓ Negative'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Presenting concern */}
                {(icf.presenting_concern || intakeSummary.concern) && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Presenting Concern</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{icf.presenting_concern || intakeSummary.concern}</p>
                    {icf.service_requested && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-400">Service requested:</span>
                        <span className="text-xs font-medium text-gray-700 capitalize">{icf.service_requested.replace(/_/g, ' ')}</span>
                        {icf.referral_source && (
                          <><span className="text-gray-200">·</span>
                          <span className="text-xs text-gray-400">via <span className="text-gray-600 capitalize">{icf.referral_source.replace(/-/g, ' ')}</span></span></>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ICF + SPIF combined student background */}
                {(Object.keys(icf).length > 0 || Object.keys(spif).length > 0) && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Student Background</p>
                    </div>
                    <div className="p-5">
                      {/* Two-column field grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                        {[
                          { label: 'College / Unit',       val: icf.college },
                          { label: 'Program',              val: icf.program ?? icf.degree_program },
                          { label: 'Year Level',           val: icf.year_level },
                          { label: 'Gender',               val: spif.gender },
                          { label: 'Civil Status',         val: spif.civil_status ?? icf.civil_status },
                          { label: 'Birthdate',            val: spif.birthdate ? new Date(spif.birthdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null },
                          { label: 'Living With',          val: spif.living_with },
                          { label: 'Family Composition',   val: spif.family_composition },
                          { label: 'Birth Order',          val: spif.birth_order ? `${spif.birth_order} of ${spif.number_of_siblings ?? '?'}` : null },
                          { label: 'Prior Consultation',   val: icf.has_previous_consultation != null ? (icf.has_previous_consultation ? 'Yes' : 'No') : (spif.previous_counseling != null ? (spif.previous_counseling ? 'Yes' : 'No') : null) },
                          { label: 'Referral Source',      val: icf.referral_source?.replace(/-/g, ' ') },
                          { label: 'Nationality',          val: spif.nationality },
                        ].filter(f => f.val).map(({ label, val: v }) => (
                          <div key={label}>
                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                            <p className="text-sm text-gray-800 capitalize">{String(v)}</p>
                          </div>
                        ))}
                      </div>

                      {/* Full-width text fields */}
                      {[
                        { label: 'Current Address',            val: spif.address },
                        { label: 'Medical Conditions',         val: spif.existing_medical_conditions ?? icf.medication_history },
                        { label: 'Current Medications',        val: spif.current_medications },
                        { label: 'Previous Counseling Details',val: spif.previous_counseling_details ?? icf.family_background },
                        { label: 'Emergency Contact',          val: icf.emergency_contact_name ? `${icf.emergency_contact_name} (${icf.emergency_contact_relationship ?? '—'}) · ${icf.emergency_contact_phone ?? '—'}` : null },
                      ].filter(f => f.val).map(({ label, val: v }) => (
                        <div key={label} className="mt-4 pt-4 border-t border-gray-100 first:mt-3 first:pt-3">
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{String(v)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* ── IC Interview Documentation ─────────────────────── */}
          {intakeSummaryLoaded && (
            <ICInterviewSection
              caseData={caseData}
              intakeForm={intakeForm}
              intakeFormDraft={intakeFormDraft}
              setIntakeFormDraft={setIntakeFormDraft}
              intakeFormEditing={intakeFormEditing}
              setIntakeFormEditing={setIntakeFormEditing}
              intakeFormSaving={intakeFormSaving}
              intakeFormError={intakeFormError}
              intakeFormSuccess={intakeFormSuccess}
              onSave={handleSaveIntakeForm}
            />
          )}
        </div>
      )}

      {/* ── Session Notes Tab ──────────────────────────────────── */}
      {activeTab === 'session-notes' && (() => {
        const toggleNote = (id: string) => setExpandedNotes(prev => {
          const next = new Set(prev);
          next.has(id) ? next.delete(id) : next.add(id);
          return next;
        });

        const typeLabel: Record<string, string> = {
          INDIVIDUAL: 'Individual', CRISIS: 'Crisis', FOLLOW_UP: 'Follow-up', INTAKE: 'Intake',
        };
        const typeColor: Record<string, string> = {
          INDIVIDUAL: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
          CRISIS:     'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
          FOLLOW_UP:  'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
          INTAKE:     'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
        };
        const sevColor: Record<string, string> = {
          MILD:     'text-yellow-600 dark:text-yellow-400',
          MODERATE: 'text-orange-600 dark:text-orange-400',
          SEVERE:   'text-red-600 dark:text-red-400',
        };
        const moodBar = (r: number) => {
          const pct = (r / 10) * 100;
          const color = r <= 3 ? '#ef4444' : r <= 6 ? '#f59e0b' : '#10b981';
          return (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full transition-all" />
              </div>
              <span className="text-xs font-semibold tabular-nums" style={{ color }}>{r}/10</span>
            </div>
          );
        };

        const soapSections = [
          { key: 'S', label: 'Subjective', color: '#2563eb', bg: 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300' },
          { key: 'O', label: 'Objective',  color: '#7c3aed', bg: 'bg-violet-50 dark:bg-violet-900/20 text-violet-800 dark:text-violet-300' },
          { key: 'A', label: 'Assessment', color: '#d97706', bg: 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300' },
          { key: 'P', label: 'Plan',       color: '#059669', bg: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300' },
        ] as const;

        const avgMood = sessionNotes.filter(n => n.mood_rating).length
          ? (sessionNotes.reduce((s, n) => s + (n.mood_rating || 0), 0) / sessionNotes.filter(n => n.mood_rating).length).toFixed(1)
          : null;
        const riskCount = sessionNotes.filter(n => n.risk_flagged).length;

        return (
          <div className="space-y-5">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">Session Notes</h3>
                {sessionNotes.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {sessionNotes.length} session{sessionNotes.length !== 1 ? 's' : ''}
                    {avgMood && ` · avg mood ${avgMood}/10`}
                    {riskCount > 0 && ` · `}
                    {riskCount > 0 && <span className="text-red-500 font-medium">{riskCount} risk flag{riskCount !== 1 ? 's' : ''}</span>}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowNoteForm(!showNoteForm)}
                className="flex items-center gap-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={14} /> {showNoteForm ? 'Cancel' : 'Add Note'}
              </button>
            </div>

            {/* ── Add Note Form ── */}
            {showNoteForm && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">New Session Note</p>
                  <div className="flex items-center gap-1 p-0.5 bg-gray-200 dark:bg-gray-700 rounded-lg">
                    {(['SOAP', 'freeform'] as const).map(fmt => (
                      <button key={fmt} type="button"
                        onClick={() => setNoteForm({ ...noteForm, note_format: fmt })}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${noteForm.note_format === fmt ? 'bg-white dark:bg-gray-600 text-[#2563eb] shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                      >
                        {fmt === 'SOAP' ? 'SOAP' : 'Freeform'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date & Time</label>
                      <input type="datetime-local" value={noteForm.session_date}
                        onChange={(e) => setNoteForm({ ...noteForm, session_date: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-1 focus:ring-[#2563eb]" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Session Type</label>
                      <select value={noteForm.session_type}
                        onChange={(e) => setNoteForm({ ...noteForm, session_type: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-1 focus:ring-[#2563eb]">
                        <option value="INDIVIDUAL">Individual</option>
                        <option value="CRISIS">Crisis</option>
                        <option value="FOLLOW_UP">Follow-up</option>
                        <option value="INTAKE">Intake</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Mood (1–10)</label>
                      <input type="number" min="1" max="10" value={noteForm.mood_rating}
                        onChange={(e) => setNoteForm({ ...noteForm, mood_rating: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-1 focus:ring-[#2563eb]" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Severity</label>
                      <select value={noteForm.symptom_severity}
                        onChange={(e) => setNoteForm({ ...noteForm, symptom_severity: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-1 focus:ring-[#2563eb]">
                        <option value="NONE">None</option>
                        <option value="MILD">Mild</option>
                        <option value="MODERATE">Moderate</option>
                        <option value="SEVERE">Severe</option>
                      </select>
                    </div>
                  </div>

                  {noteForm.note_format === 'SOAP' ? (
                    <StructuredSOAPForm value={structuredSoap} onChange={setStructuredSoap} />
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {(['topics_discussed', 'interventions', 'client_response', 'progress_on_goals'] as const).map((field) => (
                        <div key={field}>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            {field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </label>
                          <textarea value={noteForm[field] as string}
                            onChange={(e) => setNoteForm({ ...noteForm, [field]: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-1 focus:ring-[#2563eb] resize-none" />
                        </div>
                      ))}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Homework / Tasks</label>
                        <input type="text" value={noteForm.homework_assigned}
                          onChange={(e) => setNoteForm({ ...noteForm, homework_assigned: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-1 focus:ring-[#2563eb]" />
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <input type="checkbox" checked={noteForm.risk_flagged}
                      onChange={(e) => setNoteForm({ ...noteForm, risk_flagged: e.target.checked })}
                      className="rounded border-gray-300 text-red-500 focus:ring-red-500" />
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">Flag as Risk Concern</span>
                  </label>
                  {noteForm.risk_flagged && (
                    <textarea value={noteForm.risk_notes}
                      onChange={(e) => setNoteForm({ ...noteForm, risk_notes: e.target.value })}
                      rows={2} placeholder="Describe the risk concern…"
                      className="w-full px-3 py-2 text-xs border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-1 focus:ring-red-400 resize-none" />
                  )}
                </div>
                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
                  <button onClick={handleSaveNote} disabled={savingNote}
                    className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                    {savingNote ? 'Saving…' : 'Save Note'}
                  </button>
                  <button onClick={() => setShowNoteForm(false)}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ── Notes list ── */}
            {sessionNotes.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
                <FileText size={28} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No session notes yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Click "Add Note" to document the first session.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessionNotes.map((note, idx) => {
                  const num = sessionNotes.length - idx;
                  const isExpanded = expandedNotes.has(note.note_id);
                  const stype = note.session_type || 'INDIVIDUAL';
                  const isRisk = note.risk_flagged;
                  const accentColor = isRisk ? '#ef4444' : stype === 'CRISIS' ? '#ef4444' : stype === 'FOLLOW_UP' ? '#7c3aed' : stype === 'INTAKE' ? '#0891b2' : '#2563eb';
                  const approvalStatus = note.supervisor_approved === true ? 'approved'
                    : (note.supervisor_approved === false && note.supervisor_name) ? 'rejected'
                    : (note.supervisor_approved === false && !note.supervisor_name) ? 'pending'
                    : null;

                  const fmtDate = (d: string) => {
                    try {
                      const dt = new Date(d);
                      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        + ' · ' + dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                    } catch { return d; }
                  };

                  const canEdit = ['COUNSELOR','PSYCHOLOGIST','IC','CASE_MANAGER'].includes(currentUser?.role || '');
                  const isEditingThis = editingNoteId === note.note_id;

                  return (
                    <div key={note.note_id}
                      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
                      style={{ borderLeft: `3px solid ${accentColor}` }}>

                      {/* ── Card header (always visible) ── */}
                      <div className="px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <button className="flex items-start gap-3 min-w-0 flex-1 text-left" onClick={() => toggleNote(note.note_id)}>
                            {/* Session number bubble */}
                            <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                              style={{ background: accentColor }}>
                              {num}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                                  {note.session_date ? fmtDate(note.session_date) : 'Date not set'}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor[stype] || typeColor['INDIVIDUAL']}`}>
                                  {typeLabel[stype] || stype}
                                </span>
                                {note.note_format === 'SOAP' && (
                                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">SOAP</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                {note.counselor && (
                                  <span className="text-xs text-gray-400">{note.counselor}</span>
                                )}
                                {note.mood_rating ? (
                                  <span className="text-xs text-gray-400">Mood <span className="font-semibold text-gray-700 dark:text-gray-200">{note.mood_rating}/10</span></span>
                                ) : null}
                                {note.symptom_severity && note.symptom_severity !== 'NONE' && (
                                  <span className={`text-xs font-medium ${sevColor[note.symptom_severity] || ''}`}>{note.symptom_severity}</span>
                                )}
                                {isRisk && (
                                  <span className="text-xs font-semibold text-red-500">⚠ Risk flagged</span>
                                )}
                              </div>
                            </div>
                          </button>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {approvalStatus === 'approved' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">✓ Approved</span>
                            )}
                            {approvalStatus === 'rejected' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium">✗ Rejected</span>
                            )}
                            {approvalStatus === 'pending' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">Pending review</span>
                            )}
                            {canEdit && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); if (isEditingThis) { setEditingNoteId(null); } else { setEditingNoteId(note.note_id); setEditNoteForm({ topics_discussed: note.topics_discussed || '', interventions: note.interventions || '', client_response: note.client_response || '', homework_assigned: note.homework_assigned || '', mood_rating: note.mood_rating || 5, risk_flagged: note.risk_flagged || false, risk_notes: note.risk_notes || '', change_reason: '' }); setExpandedNotes(prev => { const n = new Set(prev); n.add(note.note_id); return n; }); } }}
                                  className={`p-1.5 rounded-lg transition-colors ${isEditingThis ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                  title="Edit note"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.note_id); }}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  title="Delete note"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                            <button onClick={() => toggleNote(note.note_id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                              <ChevronDown size={15} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </div>
                        {/* Mood bar — always visible */}
                        {note.mood_rating ? (
                          <div className="mt-2.5 ml-10">
                            {moodBar(note.mood_rating)}
                          </div>
                        ) : null}
                      </div>

                      {/* ── Expanded content ── */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 dark:border-gray-700">
                          {/* SOAP structured */}
                          {note.note_format === 'SOAP' && note.structured_soap && (
                            <div className="p-5 space-y-4">
                              {note.structured_soap.counseling_goal && (
                                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Session Goal</p>
                                  <p className="text-sm text-gray-700 dark:text-gray-200">{note.structured_soap.counseling_goal}</p>
                                </div>
                              )}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {soapSections.map(({ key, label, color, bg }) => {
                                  const ss = note.structured_soap!;
                                  const items: string[] = key === 'S'
                                    ? [...(ss.s_mood||[]), ...(ss.s_concerns||[]), ...(ss.s_coping||[])]
                                    : key === 'O'
                                    ? [...(ss.o_appearance||[]), ...(ss.o_affect||[]), ...(ss.o_behavior||[]), ...(ss.o_speech_thought||[])]
                                    : key === 'A'
                                    ? [...(ss.a_main_issues||[]), ...(ss.a_progress?[ss.a_progress]:[]), ...(ss.a_risk_level?[`Risk: ${ss.a_risk_level}`]:[]), ...(ss.a_clinical_impression||[])]
                                    : [...(ss.p_interventions||[]), ...(ss.p_homework||[]), ...(ss.p_follow_up||[]), ...(ss.p_case_status||[])];
                                  const remarks = key === 'A' ? ss.a_remarks : key === 'P' ? ss.p_remarks : null;
                                  if (!items.length && !remarks) return null;
                                  return (
                                    <div key={key} className="rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                                      <div className="px-3 py-2 flex items-center gap-1.5" style={{ background: color + '12' }}>
                                        <span className="text-xs font-bold" style={{ color }}>{key}</span>
                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{label}</span>
                                      </div>
                                      <div className="px-3 py-2.5 space-y-1.5">
                                        {items.length > 0 && (
                                          <div className="flex flex-wrap gap-1">
                                            {items.map((item, i) => (
                                              <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${bg}`}>{item}</span>
                                            ))}
                                          </div>
                                        )}
                                        {remarks && <p className="text-xs text-gray-600 dark:text-gray-300 italic">{remarks}</p>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {/* Legacy SOAP */}
                          {note.note_format === 'SOAP' && note.soap && !note.structured_soap && (
                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                              {(['subjective','objective','assessment','plan'] as const).map(k => {
                                const v = note.soap![k]; if (!v) return null;
                                const labels: Record<string,{letter:string;label:string;color:string}> = {
                                  subjective: {letter:'S',label:'Subjective',color:'#2563eb'},
                                  objective:  {letter:'O',label:'Objective', color:'#7c3aed'},
                                  assessment: {letter:'A',label:'Assessment',color:'#d97706'},
                                  plan:       {letter:'P',label:'Plan',      color:'#059669'},
                                };
                                const { letter, label, color } = labels[k];
                                return (
                                  <div key={k} className="rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                                    <div className="px-3 py-2 flex items-center gap-1.5" style={{ background: color + '12' }}>
                                      <span className="text-xs font-bold" style={{ color }}>{letter}</span>
                                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{label}</span>
                                    </div>
                                    <p className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{v}</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {/* Freeform */}
                          {note.note_format !== 'SOAP' && (
                            <div className="p-5 space-y-3">
                              {[
                                { key: 'topics_discussed', label: 'Topics Discussed' },
                                { key: 'interventions', label: 'Interventions' },
                                { key: 'client_response', label: 'Client Response' },
                                { key: 'progress_on_goals', label: 'Progress on Goals' },
                                { key: 'homework_assigned', label: 'Homework / Tasks' },
                              ].map(({ key, label }) => {
                                const v = (note as any)[key]; if (!v) return null;
                                return (
                                  <div key={key}>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-200">{v}</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Risk notes */}
                          {note.risk_flagged && note.risk_notes && (
                            <div className="mx-5 mb-4 px-3 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg">
                              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-0.5">⚠ Risk Notes</p>
                              <p className="text-xs text-red-700 dark:text-red-300">{note.risk_notes}</p>
                            </div>
                          )}

                          {/* Inline edit form */}
                          {isEditingThis && (
                            <div className="border-t border-blue-100 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 p-5 space-y-3">
                              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-2">Editing Note</p>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Mood (1–10)</label>
                                  <input type="number" min="1" max="10" value={editNoteForm.mood_rating}
                                    onChange={e => setEditNoteForm({ ...editNoteForm, mood_rating: Number(e.target.value) })}
                                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-1 focus:ring-[#2563eb]" />
                                </div>
                                <div className="flex items-end pb-2">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={editNoteForm.risk_flagged}
                                      onChange={e => setEditNoteForm({ ...editNoteForm, risk_flagged: e.target.checked })}
                                      className="rounded border-gray-300 text-red-500 focus:ring-red-500" />
                                    <span className="text-xs font-medium text-red-600 dark:text-red-400">Risk Concern</span>
                                  </label>
                                </div>
                              </div>
                              {[
                                { key: 'topics_discussed' as const, label: 'Topics Discussed' },
                                { key: 'interventions' as const, label: 'Interventions' },
                                { key: 'client_response' as const, label: 'Client Response' },
                                { key: 'homework_assigned' as const, label: 'Homework / Tasks' },
                              ].map(({ key, label }) => (
                                <div key={key}>
                                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                                  <textarea value={editNoteForm[key] as string}
                                    onChange={e => setEditNoteForm({ ...editNoteForm, [key]: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-1 focus:ring-[#2563eb] resize-none" />
                                </div>
                              ))}
                              {editNoteForm.risk_flagged && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Risk Notes</label>
                                  <textarea value={editNoteForm.risk_notes}
                                    onChange={e => setEditNoteForm({ ...editNoteForm, risk_notes: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 text-xs border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-1 focus:ring-red-400 resize-none" />
                                </div>
                              )}
                              <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Reason for edit</label>
                                <input type="text" value={editNoteForm.change_reason} placeholder="e.g. Added missing intervention details"
                                  onChange={e => setEditNoteForm({ ...editNoteForm, change_reason: e.target.value })}
                                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-1 focus:ring-[#2563eb]" />
                              </div>
                              <div className="flex gap-2 pt-1">
                                <button onClick={() => handleUpdateNote(note.note_id)} disabled={savingEditNote}
                                  className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors">
                                  {savingEditNote ? 'Saving…' : 'Save Changes'}
                                </button>
                                <button onClick={() => setEditingNoteId(null)}
                                  className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Approval footer */}
                          {(approvalStatus || (['PSYCHOLOGIST','ADMIN'].includes(currentUser?.role || '') && !note.supervisor_approved && !note.supervisor_name)) && (
                            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between flex-wrap gap-2">
                              {note.supervisor_approved === false && note.supervisor_comment && (
                                <p className="text-xs text-red-600 dark:text-red-400"><span className="font-semibold">Feedback:</span> {note.supervisor_comment}</p>
                              )}
                              {note.supervisor_approved && note.supervisor_name && (
                                <p className="text-xs text-gray-400">
                                  Approved by <span className="font-medium text-gray-600 dark:text-gray-300">{note.supervisor_name}</span>
                                  {note.supervisor_action_at && ` · ${new Date(note.supervisor_action_at).toLocaleDateString()}`}
                                </p>
                              )}
                              {['PSYCHOLOGIST','ADMIN'].includes(currentUser?.role || '') && !note.supervisor_approved && !note.supervisor_name && (
                                <SupervisorActions noteId={note.note_id} onAction={handleApproveNote} />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Treatment Plan Tab ─────────────────────────────────── */}
      {activeTab === 'treatment-plan' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">Treatment Plan</h3>
            {!editingPlan && (
              <button
                onClick={() => setEditingPlan(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                <Target size={15} /> {treatmentPlan ? 'Edit Plan' : 'Create Plan'}
              </button>
            )}
          </div>

          <div className="space-y-4">
            {editingPlan ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 p-6 space-y-6">
                {/* Goals */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Goals</label>
                    <button type="button" onClick={() => setTreatmentPlan(tp => ({ ...tp, goals: [...tp.goals, { goal: '', target_date: '', status: 'not_started' }] }))}
                      className="text-xs text-[#2563eb] dark:text-blue-400 hover:underline">+ Add Goal</button>
                  </div>
                  <div className="space-y-2">
                    {treatmentPlan.goals.map((g, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <input type="text" value={g.goal} placeholder="Goal description"
                          onChange={e => setTreatmentPlan(tp => { const gs = [...tp.goals]; gs[i] = { ...gs[i], goal: e.target.value }; return { ...tp, goals: gs }; })}
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50" />
                        <input type="date" value={g.target_date}
                          onChange={e => setTreatmentPlan(tp => { const gs = [...tp.goals]; gs[i] = { ...gs[i], target_date: e.target.value }; return { ...tp, goals: gs }; })}
                          className="w-36 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50" />
                        <select value={g.status}
                          onChange={e => setTreatmentPlan(tp => { const gs = [...tp.goals]; gs[i] = { ...gs[i], status: e.target.value as any }; return { ...tp, goals: gs }; })}
                          className="w-32 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50">
                          <option value="not_started">Not started</option>
                          <option value="in_progress">In progress</option>
                          <option value="achieved">Achieved</option>
                        </select>
                        <button onClick={() => setTreatmentPlan(tp => ({ ...tp, goals: tp.goals.filter((_, j) => j !== i) }))}
                          className="text-red-400 hover:text-red-600 p-1"><XIcon size={14} /></button>
                      </div>
                    ))}
                    {treatmentPlan.goals.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500 italic">No goals added yet.</p>}
                  </div>
                </div>

                {/* Interventions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Interventions</label>
                    <button type="button" onClick={() => setTreatmentPlan(tp => ({ ...tp, interventions: [...tp.interventions, ''] }))}
                      className="text-xs text-[#2563eb] dark:text-blue-400 hover:underline">+ Add</button>
                  </div>
                  <div className="space-y-2">
                    {treatmentPlan.interventions.map((iv, i) => (
                      <div key={i} className="flex gap-2">
                        <input type="text" value={iv} placeholder="e.g. CBT, mindfulness, psychoeducation"
                          onChange={e => setTreatmentPlan(tp => { const ivs = [...tp.interventions]; ivs[i] = e.target.value; return { ...tp, interventions: ivs }; })}
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50" />
                        <button onClick={() => setTreatmentPlan(tp => ({ ...tp, interventions: tp.interventions.filter((_, j) => j !== i) }))}
                          className="text-red-400 hover:text-red-600 p-1"><XIcon size={14} /></button>
                      </div>
                    ))}
                    {treatmentPlan.interventions.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500 italic">No interventions listed.</p>}
                  </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Estimated Duration</label>
                    <input type="text" value={treatmentPlan.estimated_duration} placeholder="e.g. 12 sessions over 3 months"
                      onChange={e => setTreatmentPlan(tp => ({ ...tp, estimated_duration: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Next Review Date</label>
                    <input type="date" value={treatmentPlan.next_review_date}
                      onChange={e => setTreatmentPlan(tp => ({ ...tp, next_review_date: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Progress Summary</label>
                  <textarea value={treatmentPlan.progress_summary} rows={3} placeholder="Overall progress notes and clinical impressions…"
                    onChange={e => setTreatmentPlan(tp => ({ ...tp, progress_summary: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50" />
                </div>

                <div className="flex gap-3">
                  <button onClick={handleSaveTreatmentPlan} disabled={savingPlan}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition">
                    {savingPlan ? 'Saving…' : 'Save Plan'}
                  </button>
                  <button onClick={() => setEditingPlan(false)}
                    className="px-5 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    Cancel
                  </button>
                </div>
              </div>
            ) : treatmentPlan.goals.length > 0 || treatmentPlan.interventions.length > 0 || treatmentPlan.progress_summary ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 p-6 space-y-5">
                {treatmentPlan.goals.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Goals</p>
                    <div className="space-y-1.5">
                      {treatmentPlan.goals.map((g, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${g.status === 'achieved' ? 'bg-green-500' : g.status === 'in_progress' ? 'bg-yellow-500' : 'bg-gray-300'}`} />
                          <span className="flex-1 text-gray-800 dark:text-gray-200">{g.goal}</span>
                          {g.target_date && <span className="text-xs text-gray-400">{new Date(g.target_date).toLocaleDateString()}</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.status === 'achieved' ? 'bg-green-100 text-green-700 dark:bg-blue-900/30 dark:text-green-400' : g.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>{g.status.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {treatmentPlan.interventions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Interventions</p>
                    <div className="flex flex-wrap gap-2">
                      {treatmentPlan.interventions.map((iv, i) => <span key={i} className="text-xs px-2.5 py-1 bg-green-50 dark:bg-blue-900/30 text-green-700 dark:text-green-300 rounded-full">{iv}</span>)}
                    </div>
                  </div>
                )}
                {(treatmentPlan.estimated_duration || treatmentPlan.next_review_date) && (
                  <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
                    {treatmentPlan.estimated_duration && <span><span className="font-medium">Duration:</span> {treatmentPlan.estimated_duration}</span>}
                    {treatmentPlan.next_review_date && <span><span className="font-medium">Next review:</span> {new Date(treatmentPlan.next_review_date).toLocaleDateString()}</span>}
                  </div>
                )}
                {treatmentPlan.progress_summary && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Progress</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{treatmentPlan.progress_summary}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 p-12 text-center">
                <Target size={28} className="mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400">No treatment plan on file.</p>
                <p className="text-xs text-gray-500 mt-1">Click "Create Plan" to add goals, interventions, and a progress summary.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Diagnoses Tab ──────────────────────────────────────── */}
      {activeTab === 'diagnoses' && (
        <div className="space-y-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">Diagnoses</h3>

          {/* Add form */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 p-5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Add Diagnosis</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
                <input type="text" value={diagForm.code} placeholder="e.g. F41.1" onChange={e => setDiagForm(f => ({ ...f, code: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">System</label>
                <select value={diagForm.system} onChange={e => setDiagForm(f => ({ ...f, system: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50">
                  <option value="DSM-5">DSM-5</option>
                  <option value="ICD-10">ICD-10</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select value={diagForm.type} onChange={e => setDiagForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50">
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="rule_out">Rule Out</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={handleAddDiagnosis} disabled={savingDiag || !diagForm.code || !diagForm.description}
                  className="w-full px-4 py-2 bg-[#2563eb] hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition">
                  {savingDiag ? 'Adding…' : 'Add'}
                </button>
              </div>
              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <input type="text" value={diagForm.description} placeholder="e.g. Generalized Anxiety Disorder" onChange={e => setDiagForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50" />
              </div>
            </div>
          </div>

          {/* Diagnosis list */}
          {diagnoses.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 p-10 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">No diagnoses recorded.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
              {diagnoses.map((d, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <span className="font-mono text-sm font-bold text-[#2563eb] dark:text-blue-400 w-20 flex-shrink-0">{d.code}</span>
                  <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{d.description}</span>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">{d.system}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${d.type === 'primary' ? 'bg-green-100 text-green-700 dark:bg-blue-900/30 dark:text-green-400' : d.type === 'rule_out' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>{d.type.replace('_', ' ')}</span>
                  <button onClick={() => handleRemoveDiagnosis(i)} className="text-gray-300 hover:text-red-500 transition ml-1"><XIcon size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Safety Plan Tab ────────────────────────────────────── */}
      {activeTab === 'safety-plan' && (
        <div className="space-y-6 max-w-3xl">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-red-500" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {safetyPlanExists ? 'Safety Plan' : 'Create Safety Plan'}
              </h2>
              {safetyPlanExists && !editingSafetyPlan && (
                <span className="text-xs bg-green-100 text-green-700 dark:bg-blue-900/30 dark:text-green-400 px-2 py-0.5 rounded">On file</span>
              )}
            </div>
            {safetyPlanExists && !editingSafetyPlan && (
              <button onClick={() => setEditingSafetyPlan(true)} className="text-xs text-[#2563eb] dark:text-blue-400 hover:underline">Edit</button>
            )}
          </div>

          {!editingSafetyPlan ? (
            /* ── Read-only view ── */
            <div className="space-y-4">
              {[
                { label: 'Warning Signs', items: safetyPlan.warning_signs, color: 'orange' },
                { label: 'Internal Coping Strategies', items: safetyPlan.internal_coping, color: 'blue' },
                { label: 'Social Distractions', items: safetyPlan.social_distractions, color: 'purple' },
                { label: 'Reasons for Living', items: safetyPlan.reasons_to_live, color: 'green' },
              ].map(sec => (
                <div key={sec.label} className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{sec.label}</p>
                  {sec.items.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">None recorded</p>
                  ) : (
                    <ul className="space-y-1">
                      {sec.items.map((item, i) => (
                        <li key={i} className="text-sm text-gray-800 dark:text-gray-200 flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                          {item as string}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}

              {/* Social contacts */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Social Contacts (People to Call)</p>
                {safetyPlan.social_contacts.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">None recorded</p>
                ) : (
                  <div className="space-y-1">
                    {safetyPlan.social_contacts.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-gray-800 dark:text-gray-200">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-gray-400">{c.phone}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Professional contacts */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Professional / Crisis Contacts</p>
                {safetyPlan.professional_contacts.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">None recorded</p>
                ) : (
                  <div className="space-y-1">
                    {safetyPlan.professional_contacts.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-gray-800 dark:text-gray-200">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-gray-400 text-xs">{c.role}</span>
                        <span className="text-gray-400">{c.phone}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Means restriction + follow-up */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Means Restriction</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{safetyPlan.means_restriction || <span className="italic text-gray-400">Not recorded</span>}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Follow-Up Date</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{safetyPlan.follow_up_date || <span className="italic text-gray-400">Not set</span>}</p>
                </div>
              </div>

              {safetyPlan.counselor_signature && (
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-xs text-gray-500 dark:text-gray-400">
                  Counselor: <span className="font-medium text-gray-700 dark:text-gray-300">{safetyPlan.counselor_signature}</span>
                </div>
              )}
            </div>
          ) : (
            /* ── Edit form ── */
            <div className="space-y-5">
              {/* Simple list sections */}
              {([
                { field: 'warning_signs' as const, label: 'Warning Signs', hint: 'e.g. feeling hopeless, isolating, giving away possessions' },
                { field: 'internal_coping' as const, label: 'Internal Coping Strategies', hint: 'e.g. deep breathing, journaling, going for a walk' },
                { field: 'social_distractions' as const, label: 'Social Distractions', hint: 'e.g. watching a movie with family, calling a friend' },
                { field: 'reasons_to_live' as const, label: 'Reasons for Living', hint: 'e.g. family, pets, future goals' },
              ] as Array<{ field: keyof typeof safetyPlan; label: string; hint: string }>).map(sec => (
                <SafetyListSection
                  key={sec.field}
                  label={sec.label}
                  hint={sec.hint}
                  items={safetyPlan[sec.field] as string[]}
                  onAdd={val => addSafetyPlanItem(sec.field, val)}
                  onRemove={i => removeSafetyPlanItem(sec.field, i)}
                />
              ))}

              {/* Social contacts */}
              <ContactSection
                label="Social Contacts (People to Call)"
                hint="Friends or family the client can contact during a crisis"
                items={safetyPlan.social_contacts}
                fields={['name', 'phone']}
                onAdd={v => addSafetyPlanItem('social_contacts', v)}
                onRemove={i => removeSafetyPlanItem('social_contacts', i)}
              />

              {/* Professional contacts */}
              <ProfessionalContactSection
                items={safetyPlan.professional_contacts}
                onAdd={v => addSafetyPlanItem('professional_contacts', v)}
                onRemove={i => removeSafetyPlanItem('professional_contacts', i)}
              />

              {/* Means restriction */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-lg p-4">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Means Restriction
                </label>
                <p className="text-xs text-gray-400 mb-2">Describe agreed actions to limit access to lethal means.</p>
                <textarea
                  value={safetyPlan.means_restriction}
                  onChange={e => setSafetyPlan(p => ({ ...p, means_restriction: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. Client agreed to have family remove firearms from home."
                />
              </div>

              {/* Follow-up + Signature */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-lg p-4">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Follow-Up Date</label>
                  <input
                    type="date"
                    value={safetyPlan.follow_up_date}
                    onChange={e => setSafetyPlan(p => ({ ...p, follow_up_date: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-lg p-4">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Counselor Name</label>
                  <input
                    type="text"
                    value={safetyPlan.counselor_signature}
                    onChange={e => setSafetyPlan(p => ({ ...p, counselor_signature: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Counselor full name"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={saveSafetyPlan}
                  disabled={savingSafetyPlan}
                  className={`px-5 py-2 rounded text-sm font-semibold transition ${savingSafetyPlan ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                >
                  {savingSafetyPlan ? 'Saving…' : 'Save Safety Plan'}
                </button>
                {safetyPlanExists && (
                  <button onClick={() => setEditingSafetyPlan(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Assessments Tab ────────────────────────────────────── */}
      {activeTab === 'assessments' && (
        <div className="space-y-6 max-w-2xl">

          {/* ── Assessment result banner ── */}
          {assessmentResult && (
            <div className="bg-green-50 dark:bg-blue-900/20 border border-green-200 dark:border-blue-700 rounded-xl p-4 flex items-start gap-3">
              <Activity size={16} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">Assessment recorded</p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                  Score: <span className="font-bold">{assessmentResult.score}/{assessmentResult.max}</span>
                  <span className="mx-1.5">·</span>
                  Severity: <span className="font-bold">{assessmentResult.severity}</span>
                </p>
              </div>
              <button onClick={() => setAssessmentResult(null)} className="ml-auto text-green-400 hover:text-green-600"><XIcon size={14} /></button>
            </div>
          )}

          {/* ── Record assessment form ── */}
          {recordingType && assessmentTemplate ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{assessmentTemplate.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{assessmentTemplate.instruction}</p>
                </div>
                <button onClick={() => { setRecordingType(null); setAssessmentTemplate(null); }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"><XIcon size={16} /></button>
              </div>

              <div className="space-y-4">
                {assessmentTemplate.questions.map((q, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-sm text-gray-800 dark:text-gray-200 mb-2">
                      <span className="font-medium text-gray-500 dark:text-gray-400 mr-1.5">{i + 1}.</span>
                      {q}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {assessmentTemplate.scale.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAssessmentResponses(r => ({ ...r, [String(i)]: opt.value }))}
                          className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                            assessmentResponses[String(i)] === opt.value
                              ? 'bg-green-600 border-blue-600 text-white font-medium'
                              : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-green-400'
                          }`}
                        >
                          {opt.value} — {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSubmitAssessment}
                  disabled={savingAssessment || Object.keys(assessmentResponses).length < assessmentTemplate.questions.length}
                  className="px-5 py-2 bg-[#2563eb] hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition"
                >
                  {savingAssessment ? 'Saving…' : 'Save Assessment'}
                </button>
                <p className="text-xs text-gray-400">{Object.keys(assessmentResponses).length}/{assessmentTemplate.questions.length} answered</p>
              </div>
            </div>
          ) : (
            /* ── Pick assessment to record ── */
            <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Record Assessment</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Administer and record a standardized assessment for this client. Results are for clinical use only — not shared with the student.</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { type: 'PHQ9', label: 'PHQ-9', desc: 'Depression (27 pts)', color: 'blue' },
                  { type: 'GAD7', label: 'GAD-7', desc: 'Anxiety (21 pts)', color: 'purple' },
                  { type: 'PSS',  label: 'PSS-10', desc: 'Stress (40 pts)',  color: 'orange' },
                ].map(t => (
                  <button
                    key={t.type}
                    onClick={() => startRecording(t.type)}
                    className="flex flex-col items-start px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-blue-600 transition text-left"
                  >
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{t.label}</span>
                    <span className="text-xs text-gray-400 mt-0.5">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Assessment history ── */}
          <div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Assessment History</p>
            {!historyLoaded ? (
              <p className="text-sm text-gray-400 italic">Loading…</p>
            ) : assessmentHistory.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No assessments recorded yet.</p>
            ) : (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      <th className="text-left px-4 py-2">Date</th>
                      <th className="text-left px-4 py-2">Tool</th>
                      <th className="text-left px-4 py-2">Score</th>
                      <th className="text-left px-4 py-2">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {assessmentHistory.map(a => {
                      const severityColor =
                        a.severity === 'Severe' || a.severity === 'High stress' ? 'text-red-600 dark:text-red-400' :
                        a.severity === 'Moderately Severe' ? 'text-orange-600 dark:text-orange-400' :
                        a.severity === 'Moderate' || a.severity === 'Moderate stress' ? 'text-yellow-600 dark:text-yellow-400' :
                        a.severity === 'Mild' ? 'text-blue-600 dark:text-blue-400' :
                        'text-green-600 dark:text-green-400';
                      return (
                        <tr key={a._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                          <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-medium text-gray-900 dark:text-white">{a.assessment_type === 'PSS' ? 'PSS-10' : a.assessment_type.replace('9', '-9').replace('7', '-7')}</span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-gray-900 dark:text-white">
                            {a.raw_score}<span className="text-gray-400 text-xs">/{a.max_score ?? '?'}</span>
                          </td>
                          <td className={`px-4 py-2.5 font-medium ${severityColor}`}>{a.severity ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Repeating Schedules ── */}
          <div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Repeating Schedules</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Auto-queue assessments at regular intervals.</p>
            <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Assessment</label>
                  <select value={scheduleForm.assessment_type}
                    onChange={e => setScheduleForm(f => ({ ...f, assessment_type: e.target.value }))}
                    className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                    <option value="PHQ9">PHQ-9 (Depression)</option>
                    <option value="GAD7">GAD-7 (Anxiety)</option>
                    <option value="PSS">PSS-10 (Stress)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Every (days)</label>
                  <input type="number" min={1} max={90} value={scheduleForm.interval_days}
                    onChange={e => setScheduleForm(f => ({ ...f, interval_days: parseInt(e.target.value) || 14 }))}
                    className="w-24 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">First due date</label>
                  <input type="date" value={scheduleForm.start_date}
                    onChange={e => setScheduleForm(f => ({ ...f, start_date: e.target.value }))}
                    className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="self-end">
                  <button onClick={handleAddSchedule} disabled={savingSchedule}
                    className={`px-4 py-1.5 rounded text-sm font-medium transition flex items-center gap-1.5 ${savingSchedule ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed' : 'bg-[#2563eb] hover:bg-blue-700 text-white'}`}>
                    <Plus size={14} /> {savingSchedule ? 'Adding…' : 'Add'}
                  </button>
                </div>
              </div>
            </div>

            {assessmentSchedules.filter(s => s.active).length === 0 ? (
              <p className="text-sm text-gray-400 italic mt-3">No active schedules.</p>
            ) : (
              <div className="space-y-2 mt-3">
                {assessmentSchedules.filter(s => s.active).map(s => (
                  <div key={s.schedule_id} className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-lg px-4 py-3">
                    <div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{s.assessment_type}</span>
                      <span className="text-xs text-gray-500 ml-2">every {s.interval_days} days</span>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Next due: <span className="font-medium text-gray-700 dark:text-gray-300">
                          {new Date(s.next_due).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </p>
                    </div>
                    <button onClick={() => handleDeleteSchedule(s.schedule_id)}
                      className="text-xs text-red-500 hover:text-red-700 transition px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Check-Ins Tab ──────────────────────────────────────── */}
      {activeTab === 'check-ins' && (
        <div className="space-y-6">
          <CheckInForm caseId={caseId} onSubmit={handleCreateCheckIn} isLoading={checkInLoading} />
          {checkInHistory.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-4">Check-In History</h3>
              <CheckInHistory checkIns={checkInHistory} isLoading={checkInLoading} />
            </div>
          )}
        </div>
      )}

      {/* ── PERMA / MHBot Tab ──────────────────────────────────── */}
      {activeTab === 'perma' && (
        <div className="space-y-5 max-w-2xl">
          {/* Link / Unlink MHBot account */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-xl p-5">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <Activity size={14} className="text-[#2563eb]" /> MHBot Account
            </p>
            {caseData?.student?.mhbot_username ? (
              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Linked username</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white font-mono mt-0.5">
                    {caseData.student.mhbot_username}
                  </p>
                </div>
                <button
                  onClick={unlinkMhbot}
                  disabled={linkingMhbot}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition-colors"
                >
                  {linkingMhbot ? <Loader2 size={11} className="animate-spin" /> : <Unlink size={11} />}
                  Unlink
                </button>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Enter the student's MHBot username to pull PERMA history.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mhbotUsername}
                    onChange={e => setMhbotUsername(e.target.value)}
                    placeholder="e.g. ema_lVk"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={linkMhbot}
                    disabled={linkingMhbot || !mhbotUsername.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#2563eb] hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {linkingMhbot ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
                    Link
                  </button>
                </div>
                {mhbotError && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle size={11} /> {mhbotError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* PERMA history */}
          {caseData?.student?.mhbot_username && (() => {
            const LABEL_TO_SCORE: Record<string, number> = {
              'Excelling': 5, 'Thriving': 4, 'Surviving': 3, 'Struggling': 2, 'In Crisis': 1,
            };
            const SCORE_TO_LABEL: Record<number, string> = {
              5: 'Excelling', 4: 'Thriving', 3: 'Surviving', 2: 'Struggling', 1: 'In Crisis',
            };
            const SCORE_COLOR: Record<number, string> = {
              5: '#10b981', 4: '#22c55e', 3: '#f59e0b', 2: '#f97316', 1: '#ef4444',
            };
            const chartData = [...permaHistory]
              .filter(h => h.perma_label && LABEL_TO_SCORE[h.perma_label])
              .reverse()
              .map(h => ({
                dateRaw: h.date,
                date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                score: LABEL_TO_SCORE[h.perma_label!],
                label: h.perma_label!,
              }));

            const latestScore = chartData.length ? chartData[chartData.length - 1].score : null;
            const latestColor = latestScore ? SCORE_COLOR[latestScore] : '#2563eb';

            const CustomTooltip = ({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg rounded-lg px-3 py-2 text-xs">
                  <p className="text-gray-500 dark:text-gray-400 mb-0.5">
                    {new Date(d.dateRaw).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                  <p className="font-semibold" style={{ color: SCORE_COLOR[d.score] }}>{d.label}</p>
                </div>
              );
            };

            return (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">PERMA History</p>
                  {latestScore && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: latestColor + '18', color: latestColor }}>
                      Latest: {SCORE_TO_LABEL[latestScore]}
                    </span>
                  )}
                </div>
                {permaLoading ? (
                  <div className="flex justify-center py-12 text-gray-400">
                    <Loader2 size={18} className="animate-spin mr-2" /> Loading…
                  </div>
                ) : chartData.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No PERMA records found</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="permaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={latestColor} stopOpacity={0.15} />
                            <stop offset="95%" stopColor={latestColor} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                        <YAxis
                          domain={[1, 5]} ticks={[1, 2, 3, 4, 5]}
                          tickFormatter={(v: number) => SCORE_TO_LABEL[v] || ''}
                          tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                          width={62}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={3} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.4} />
                        <Area
                          type="monotone" dataKey="score"
                          stroke={latestColor} strokeWidth={2.5}
                          fill="url(#permaGrad)" dot={{ r: 4, fill: latestColor, strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, fill: latestColor, stroke: '#fff', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    {/* Recent entries table */}
                    <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-3 space-y-1.5">
                      {[...permaHistory].slice(0, 6).map((h, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(h.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </span>
                          <PermaBadge label={h.perma_label} />
                        </div>
                      ))}
                      {permaHistory.length > 6 && (
                        <p className="text-xs text-gray-400 text-center pt-1">+{permaHistory.length - 6} earlier entries</p>
                      )}
                    </div>
                  </>
                )}
                {mhbotError && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle size={11} /> {mhbotError}
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </DashboardPageWrapper>

    {showExportModal && intakeSummary && (
      <ClinicalExportModal
        intakeId={intakeSummary._id}
        appointmentId={intakeSummary.appointment_id ?? null}
        onClose={() => setShowExportModal(false)}
      />
    )}
    {showTerminationForm && (
      <TerminationFormModal
        studentName={studentName}
        onClose={() => setShowTerminationForm(false)}
        onSubmit={handleTerminateCase}
      />
    )}
    </>
  );
}

/* ── IC Interview Documentation Section ──────────────────────────────────── */

interface ICInterviewSectionProps {
  caseData: any;
  intakeForm: any;
  intakeFormDraft: any;
  setIntakeFormDraft: (v: any) => void;
  intakeFormEditing: boolean;
  setIntakeFormEditing: (v: boolean) => void;
  intakeFormSaving: boolean;
  intakeFormError: string;
  intakeFormSuccess: boolean;
  onSave: () => void;
}

function SectionBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
      <div className="px-5 py-3 bg-[#2563eb] text-white">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function RadioField({ label, name, options, value, onChange, required, hasError }: {
  label: string; name: string; options: string[]; value: string; onChange: (v: string) => void; required?: boolean; hasError?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className={`space-y-2 p-3 rounded-lg ${hasError ? 'border border-red-400 bg-red-50/30' : ''}`}>
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name={name} value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="w-4 h-4 text-[#2563eb] border-gray-300" />
            <span className="text-sm text-gray-700">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function CheckboxField({ label, name, options, value, onChange, required, hasOther }: {
  label: string; name: string; options: string[]; value: string[]; onChange: (v: string[]) => void;
  required?: boolean; hasOther?: boolean;
}) {
  const otherKey = `${name}_other`;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="grid grid-cols-1 gap-2">
        {options.map(opt => {
          const isOtherOpt = opt === 'Other:' || opt === 'Other';
          return (
            <label key={opt} className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" value={opt}
                checked={(value || []).includes(opt)}
                onChange={e => {
                  const arr = value || [];
                  onChange(e.target.checked ? [...arr, opt] : arr.filter((x: string) => x !== opt));
                }}
                className="w-4 h-4 mt-0.5 text-[#2563eb] border-gray-300 rounded" />
              {isOtherOpt ? (
                <span className="text-sm text-gray-700 flex items-center gap-2 flex-1">
                  Other:
                </span>
              ) : (
                <span className="text-sm text-gray-700">{opt}</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function CheckboxFieldWithOther({ label, name, options, value, otherValue, onChange, onOtherChange, required, hasError }: {
  label: string; name: string; options: string[]; value: string[]; otherValue: string;
  onChange: (v: string[]) => void; onOtherChange: (v: string) => void; required?: boolean; hasError?: boolean;
}) {
  const allOpts = [...options, 'Other:'];
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className={`grid grid-cols-1 gap-2 p-3 rounded-lg ${hasError ? 'border border-red-400 bg-red-50/30' : ''}`}>
        {allOpts.map(opt => {
          const isOther = opt === 'Other:';
          return (
            <label key={opt} className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" value={opt}
                checked={(value || []).includes(opt)}
                onChange={e => {
                  const arr = value || [];
                  onChange(e.target.checked ? [...arr, opt] : arr.filter((x: string) => x !== opt));
                }}
                className="w-4 h-4 mt-0.5 text-[#2563eb] border-gray-300 rounded" />
              {isOther ? (
                <span className="text-sm text-gray-700 flex items-center gap-2 flex-1">
                  Other:
                  {(value || []).includes('Other:') && (
                    <input type="text" value={otherValue}
                      onChange={e => onOtherChange(e.target.value)}
                      className="flex-1 text-sm border-b border-gray-300 focus:border-[#2563eb] outline-none px-1"
                      placeholder="Please specify..." />
                  )}
                </span>
              ) : (
                <span className="text-sm text-gray-700">{opt}</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function TextareaField({ label, fieldKey, value, onChange, placeholder, helperText, required, hasError }: {
  label: string; fieldKey: string; value: string; onChange: (v: string) => void;
  placeholder?: string; helperText?: string; required?: boolean; hasError?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {helperText && <p className="text-xs text-gray-400 mb-2 italic">{helperText}</p>}
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent outline-none resize-none ${hasError ? 'border-red-400' : 'border-gray-200'}`} />
    </div>
  );
}

function ReadBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#2563eb]/10 text-[#2563eb] mr-1.5 mb-1.5">
      {value}
    </span>
  );
}

function ReadSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
      <div className="px-5 py-3 bg-[#2563eb] text-white">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-5 space-y-3">{children}</div>
    </div>
  );
}

function ReadRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  );
}

/* ── PHQ-9 Section Component ──────────────────────────────────────────────── */

const PHQ9_QUESTIONS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
  'Trouble concentrating on things, such as reading the newspaper or watching television',
  'Moving or speaking so slowly that other people could have noticed. Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
  'Thoughts that you would be better off dead, or of hurting yourself in some way',
];

const GAD7_QUESTIONS = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it\'s hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid as if something awful might happen',
];

const RESPONSE_OPTS = [
  { val: 0, label: 'Not at all' },
  { val: 1, label: 'Several days' },
  { val: 2, label: 'More than half' },
  { val: 3, label: 'Nearly every day' },
];

function getPHQ9Severity(score: number): string {
  if (score <= 4) return 'Minimal';
  if (score <= 9) return 'Mild';
  if (score <= 14) return 'Moderate';
  if (score <= 19) return 'Moderately Severe';
  return 'Severe';
}

function getGAD7Severity(score: number): string {
  if (score <= 4) return 'Minimal';
  if (score <= 9) return 'Mild';
  if (score <= 14) return 'Moderate';
  return 'Severe';
}

function getSeverityClass(severity: string): string {
  switch (severity) {
    case 'Minimal': return 'bg-green-100 text-green-800';
    case 'Mild': return 'bg-yellow-100 text-yellow-800';
    case 'Moderate': return 'bg-orange-100 text-orange-800';
    case 'Moderately Severe': return 'bg-red-100 text-red-800';
    case 'Severe': return 'bg-red-200 text-red-900';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function PsychometricQuestionList({
  questions, responses, maxScore, getSeverity, onChange,
}: {
  questions: string[];
  responses: (number | null)[];
  maxScore: number;
  getSeverity: (score: number) => string;
  onChange: (responses: (number | null)[], score: number | null, severity: string | null) => void;
}) {
  const answered = responses.filter(r => r !== null && r !== undefined).length;
  const total = questions.length;
  const score = answered === total ? responses.reduce((s, v) => s! + v!, 0) as number : null;
  const severity = score !== null ? getSeverity(score) : null;

  const setResponse = (idx: number, val: number) => {
    const next = [...responses];
    next[idx] = val;
    const answeredNext = next.filter(r => r !== null && r !== undefined).length;
    const scoreNext = answeredNext === total ? next.reduce((s, v) => s! + v!, 0) as number : null;
    const sevNext = scoreNext !== null ? getSeverity(scoreNext) : null;
    onChange(next, scoreNext, sevNext);
  };

  return (
    <div className="space-y-4">
      {questions.map((q, idx) => (
        <div key={idx} className="flex items-start gap-3">
          <span className="text-xs text-gray-400 w-5 flex-shrink-0 mt-0.5">{idx + 1}.</span>
          <div className="flex-1">
            <p className="text-sm text-gray-700 mb-2">{q}</p>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              {RESPONSE_OPTS.map(opt => (
                <label key={opt.val} className="flex flex-col items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name={`q_${idx}_${maxScore}`}
                    checked={responses[idx] === opt.val}
                    onChange={() => setResponse(idx, opt.val)}
                    className="w-4 h-4 text-[#2563eb]"
                  />
                  <span className="text-xs text-gray-500 text-center leading-tight w-16">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      ))}
      {answered === total && score !== null && severity !== null && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center gap-3">
          <div>
            <span className="text-2xl font-bold text-gray-900">{score}</span>
            <span className="text-xs text-gray-400 ml-1">/ {maxScore}</span>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${getSeverityClass(severity)}`}>{severity}</span>
        </div>
      )}
      {answered < total && (
        <p className="text-xs text-gray-400 italic">{answered} of {total} questions answered</p>
      )}
    </div>
  );
}

function PHQ9Section({ responses, onChange }: {
  responses: (number | null)[];
  onChange: (responses: (number | null)[], score: number | null, severity: string | null) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-3">PHQ-9 — Depression Screen <span className="text-xs font-normal text-gray-400">(0–27)</span></p>
      <PsychometricQuestionList
        questions={PHQ9_QUESTIONS}
        responses={responses.length === 9 ? responses : new Array(9).fill(null)}
        maxScore={27}
        getSeverity={getPHQ9Severity}
        onChange={onChange}
      />
    </div>
  );
}

function GAD7Section({ responses, onChange }: {
  responses: (number | null)[];
  onChange: (responses: (number | null)[], score: number | null, severity: string | null) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-3">GAD-7 — Anxiety Screen <span className="text-xs font-normal text-gray-400">(0–21)</span></p>
      <PsychometricQuestionList
        questions={GAD7_QUESTIONS}
        responses={responses.length === 7 ? responses : new Array(7).fill(null)}
        maxScore={21}
        getSeverity={getGAD7Severity}
        onChange={onChange}
      />
    </div>
  );
}

/* ── Wizard step definitions ─────────────────────────────────────────────── */

const WIZARD_STEPS = [
  { label: 'Session Information',          short: 'Session Info' },
  { label: 'Clinical Diagnosis',           short: 'Diagnosis' },
  { label: 'Psychometric Screening',       short: 'PHQ-9 / GAD-7' },
  { label: 'Brief Description',            short: 'Description' },
  { label: 'Presenting Problem',           short: 'Presenting' },
  { label: 'Psychosocial History',         short: 'History' },
  { label: 'Interaction & Affect',         short: 'Interaction' },
  { label: 'Maladaptive Patterns',         short: 'Patterns' },
  { label: 'Counseling Goal',              short: 'Goal' },
  { label: 'Recommendation / Decision',    short: 'Recommendation' },
  { label: 'Signature / Attestation',      short: 'Signature' },
];

type StepStatus = 'empty' | 'partial' | 'complete' | 'error';

function getStepStatus(step: number, draft: any): StepStatus {
  const d = draft || {};
  const hasVal = (v: any) => v !== null && v !== undefined && v !== '';
  const hasArr = (v: any) => Array.isArray(v) && v.length > 0;
  switch (step) {
    case 0: {
      if (!hasVal(d.type_of_service)) return 'empty';
      if (hasArr(d.referral_source)) return 'complete';
      return 'partial';
    }
    case 1: {
      if (hasVal(d.clinical_diagnosis)) return 'complete';
      return 'empty';
    }
    case 2: {
      const phq = (d.phq9_responses || []).filter((r: any) => r !== null && r !== undefined).length;
      const gad = (d.gad7_responses || []).filter((r: any) => r !== null && r !== undefined).length;
      if (phq === 9 && gad === 7) return 'complete';
      if (phq > 0 || gad > 0) return 'partial';
      return 'empty';
    }
    case 3: {
      const fields = [
        hasArr(d.general_appearance),
        hasArr(d.communication_style),
        hasArr(d.general_disposition),
        hasVal(d.brief_description_remarks),
      ];
      const filled = fields.filter(Boolean).length;
      if (filled === 0) return 'empty';
      if (filled === fields.length) return 'complete';
      return 'partial';
    }
    case 4: {
      const fields = [hasArr(d.presenting_problem), hasVal(d.presenting_problem_remarks)];
      const filled = fields.filter(Boolean).length;
      if (filled === 0) return 'empty';
      if (filled === fields.length) return 'complete';
      return 'partial';
    }
    case 5: {
      const fields = [hasArr(d.psychosocial_history), hasVal(d.psychosocial_remarks)];
      const filled = fields.filter(Boolean).length;
      if (filled === 0) return 'empty';
      if (filled === fields.length) return 'complete';
      return 'partial';
    }
    case 6: {
      const fields = [
        hasArr(d.interaction_relationship),
        hasArr(d.affect_expression),
        hasVal(d.interaction_remarks),
      ];
      const filled = fields.filter(Boolean).length;
      if (filled === 0) return 'empty';
      if (filled === fields.length) return 'complete';
      return 'partial';
    }
    case 7: {
      if (hasArr(d.maladaptive_patterns)) return 'complete';
      return 'empty';
    }
    case 8: {
      if (hasVal(d.counseling_goal)) return 'complete';
      return 'empty';
    }
    case 9: {
      const fields = [
        hasArr(d.predisposing_factors),
        hasArr(d.precipitating_factors),
        hasArr(d.perpetuating_factors),
        hasArr(d.protective_factors),
        hasArr(d.recommendation),
      ];
      const filled = fields.filter(Boolean).length;
      if (filled === 0) return 'empty';
      if (filled === fields.length) return 'complete';
      return 'partial';
    }
    case 10: {
      if (hasVal(d.ic_name) && hasVal(d.ic_signature_date)) return 'complete';
      if (hasVal(d.ic_name) || hasVal(d.ic_signature_date)) return 'partial';
      return 'empty';
    }
    default: return 'empty';
  }
}

function StepStatusIcon({ status }: { status: StepStatus }) {
  if (status === 'complete') return <span className="text-[#2563eb] font-bold text-sm">✓</span>;
  if (status === 'partial') return <span className="text-orange-500 font-bold text-sm">●</span>;
  if (status === 'error') return <span className="text-red-500 font-bold text-sm">⚠</span>;
  return <span className="text-gray-300 text-sm">○</span>;
}

function ICInterviewSection({
  caseData, intakeForm, intakeFormDraft, setIntakeFormDraft,
  intakeFormEditing, setIntakeFormEditing,
  intakeFormSaving, intakeFormError, intakeFormSuccess, onSave
}: ICInterviewSectionProps) {
  const d = intakeFormDraft || {};
  const [currentStep, setCurrentStep] = useState(0);
  const [stepErrors, setStepErrors] = useState<Record<number, string[]>>({});
  const [showSaveSummary, setShowSaveSummary] = useState(false);

  const upd = (key: string, val: any) => setIntakeFormDraft({ ...d, [key]: val });

  /* Validate a single step, returning array of error messages */
  function validateStep(step: number, draft: any): string[] {
    const dv = draft || {};
    const errs: string[] = [];
    const hasVal = (v: any) => v !== null && v !== undefined && v !== '';
    const hasArr = (v: any) => Array.isArray(v) && v.length > 0;
    switch (step) {
      case 0:
        if (!hasVal(dv.type_of_service)) errs.push('Type of Service is required');
        break;
      case 3:
        if (!hasArr(dv.general_appearance)) errs.push('General Appearance is required');
        if (!hasArr(dv.communication_style)) errs.push('Communication Style is required');
        if (!hasArr(dv.general_disposition)) errs.push('General Disposition is required');
        if (!hasVal(dv.brief_description_remarks)) errs.push('Remarks are required');
        break;
      case 4:
        if (!hasArr(dv.presenting_problem)) errs.push('Presenting Problem is required');
        if (!hasVal(dv.presenting_problem_remarks)) errs.push('Remarks are required');
        break;
      case 5:
        if (!hasArr(dv.psychosocial_history)) errs.push('Psychosocial History is required');
        if (!hasVal(dv.psychosocial_remarks)) errs.push('Remarks are required');
        break;
      case 6:
        if (!hasArr(dv.interaction_relationship)) errs.push('Interaction and Relationship is required');
        if (!hasArr(dv.affect_expression)) errs.push('Affect / Emotional Expression is required');
        if (!hasVal(dv.interaction_remarks)) errs.push('Remarks are required');
        break;
      case 7:
        if (!hasArr(dv.maladaptive_patterns)) errs.push('Maladaptive Patterns is required');
        break;
      case 8:
        if (!hasVal(dv.counseling_goal)) errs.push('Counseling Goal is required');
        break;
      case 9:
        if (!hasArr(dv.recommendation)) errs.push('Recommendation is required');
        break;
      case 10:
        if (!hasVal(dv.ic_name)) errs.push('IC Name is required');
        if (!hasVal(dv.ic_signature_date)) errs.push('Signature Date is required');
        break;
    }
    return errs;
  }

  function handleNext() {
    const errs = validateStep(currentStep, d);
    if (errs.length > 0) {
      setStepErrors(prev => ({ ...prev, [currentStep]: errs }));
      return;
    }
    setStepErrors(prev => { const n = { ...prev }; delete n[currentStep]; return n; });
    setCurrentStep(s => Math.min(s + 1, WIZARD_STEPS.length - 1));
  }

  function handlePrev() {
    setCurrentStep(s => Math.max(s - 1, 0));
  }

  function handleSaveDraft() {
    setShowSaveSummary(false);
    onSave();
  }

  function handleSaveForm() {
    /* Full validation across all steps */
    const allStepsWithErrors: Record<number, string[]> = {};
    for (let i = 0; i < WIZARD_STEPS.length; i++) {
      const errs = validateStep(i, d);
      if (errs.length > 0) allStepsWithErrors[i] = errs;
    }
    if (Object.keys(allStepsWithErrors).length > 0) {
      setStepErrors(allStepsWithErrors);
      setShowSaveSummary(true);
      return;
    }
    setShowSaveSummary(false);
    onSave();
  }

  /* Collect missing fields for summary panel */
  const missingFields: { stepIndex: number; label: string }[] = [];
  for (let i = 0; i < WIZARD_STEPS.length; i++) {
    const errs = stepErrors[i] || [];
    errs.forEach(e => missingFields.push({ stepIndex: i, label: e }));
  }

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">IC Interview Documentation</h2>
        {intakeForm && !intakeFormEditing && (
          <button onClick={() => setIntakeFormEditing(true)}
            className="text-sm text-[#2563eb] font-medium hover:underline">
            Edit
          </button>
        )}
        {intakeForm && intakeFormEditing && (
          <button onClick={() => { setIntakeFormDraft(intakeForm); setIntakeFormEditing(false); setCurrentStep(0); setStepErrors({}); setShowSaveSummary(false); }}
            className="text-sm text-gray-500 hover:underline">
            Cancel
          </button>
        )}
      </div>

      {intakeForm && !intakeFormEditing ? (
        /* ── Read-only view ── */
        <div>
          {caseData?.intake_form_updated_at && (
            <p className="text-xs text-gray-400 mb-4">Last updated: {new Date(caseData.intake_form_updated_at).toLocaleString()}</p>
          )}
          <ReadSection title="Section 1: Session Information">
            {/* Booking info from caseData */}
            {(() => {
              const rawDate = caseData?.appointment_info?.date || caseData?.appointment_date || caseData?.scheduled_start;
              const fmtDate = rawDate
                ? new Date(rawDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : '—';
              const fmtTime = rawDate
                ? new Date(rawDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                : '—';
              const mode = caseData?.appointment_info?.method || caseData?.method || caseData?.appointment_method || '—';
              const studentId = caseData?.student?.school_id || '—';
              const college = caseData?.student?.college || caseData?.student?.course || '—';
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg mb-2">
                  {[
                    { label: 'Date', value: fmtDate },
                    { label: 'Time', value: fmtTime },
                    { label: 'Mode', value: mode },
                    { label: 'Student ID', value: studentId },
                    { label: 'College', value: college },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                      <p className="text-sm font-medium text-gray-700">{item.value || '—'}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
            <ReadRow label="Type of Service"><p>{intakeForm.type_of_service || '—'}</p></ReadRow>
            <ReadRow label="Referral Source">
              <div className="flex flex-wrap mt-1">
                {(intakeForm.referral_source || []).map((v: string) => <ReadBadge key={v} value={v} />)}
                {intakeForm.referral_source_other && <ReadBadge value={`Other: ${intakeForm.referral_source_other}`} />}
              </div>
            </ReadRow>
          </ReadSection>

          <ReadSection title="Section 2: Clinical Diagnosis">
            <ReadRow label="Clinical Diagnosis"><p>{intakeForm.clinical_diagnosis || '—'}</p></ReadRow>
          </ReadSection>

          <ReadSection title="Section 2A: Psychometric Screening">
            {/* PHQ-9 read-only */}
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">PHQ-9 — Depression Screen</p>
              {intakeForm.phq9_score != null ? (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-2xl font-bold text-gray-900">{intakeForm.phq9_score}</span>
                    <span className="text-xs text-gray-400 ml-1">/ 27</span>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    intakeForm.phq9_score <= 4 ? 'bg-green-100 text-green-800' :
                    intakeForm.phq9_score <= 9 ? 'bg-yellow-100 text-yellow-800' :
                    intakeForm.phq9_score <= 14 ? 'bg-orange-100 text-orange-800' :
                    intakeForm.phq9_score <= 19 ? 'bg-red-100 text-red-800' :
                    'bg-red-200 text-red-900'
                  }`}>{intakeForm.phq9_severity || (
                    intakeForm.phq9_score <= 4 ? 'Minimal' :
                    intakeForm.phq9_score <= 9 ? 'Mild' :
                    intakeForm.phq9_score <= 14 ? 'Moderate' :
                    intakeForm.phq9_score <= 19 ? 'Moderately Severe' : 'Severe'
                  )}</span>
                </div>
              ) : <p className="text-sm text-gray-400 italic">Not completed</p>}
            </div>
            {/* GAD-7 read-only */}
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">GAD-7 — Anxiety Screen</p>
              {intakeForm.gad7_score != null ? (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-2xl font-bold text-gray-900">{intakeForm.gad7_score}</span>
                    <span className="text-xs text-gray-400 ml-1">/ 21</span>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    intakeForm.gad7_score <= 4 ? 'bg-green-100 text-green-800' :
                    intakeForm.gad7_score <= 9 ? 'bg-yellow-100 text-yellow-800' :
                    intakeForm.gad7_score <= 14 ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>{intakeForm.gad7_severity || (
                    intakeForm.gad7_score <= 4 ? 'Minimal' :
                    intakeForm.gad7_score <= 9 ? 'Mild' :
                    intakeForm.gad7_score <= 14 ? 'Moderate' : 'Severe'
                  )}</span>
                </div>
              ) : <p className="text-sm text-gray-400 italic">Not completed</p>}
            </div>
          </ReadSection>

          <ReadSection title="Section 3: Brief Description of the Client">
            <ReadRow label="General Appearance and Presentation">
              <div className="flex flex-wrap mt-1">
                {(intakeForm.general_appearance || []).map((v: string) => <ReadBadge key={v} value={v} />)}
                {intakeForm.general_appearance_other && <ReadBadge value={`Other: ${intakeForm.general_appearance_other}`} />}
              </div>
            </ReadRow>
            <ReadRow label="Communication Style">
              <div className="flex flex-wrap mt-1">
                {(intakeForm.communication_style || []).map((v: string) => <ReadBadge key={v} value={v} />)}
                {intakeForm.communication_style_other && <ReadBadge value={`Other: ${intakeForm.communication_style_other}`} />}
              </div>
            </ReadRow>
            <ReadRow label="General Disposition / Demeanor">
              <div className="flex flex-wrap mt-1">
                {(intakeForm.general_disposition || []).map((v: string) => <ReadBadge key={v} value={v} />)}
                {intakeForm.general_disposition_other && <ReadBadge value={`Other: ${intakeForm.general_disposition_other}`} />}
              </div>
            </ReadRow>
            <ReadRow label="Remarks"><p className="whitespace-pre-wrap">{intakeForm.brief_description_remarks || '—'}</p></ReadRow>
          </ReadSection>

          <ReadSection title="Section 4: Presenting Problem">
            <ReadRow label="Presenting Problem">
              <div className="flex flex-wrap mt-1">
                {(intakeForm.presenting_problem || []).map((v: string) => <ReadBadge key={v} value={v} />)}
                {intakeForm.presenting_problem_other && <ReadBadge value={`Other: ${intakeForm.presenting_problem_other}`} />}
              </div>
            </ReadRow>
            <ReadRow label="Remarks"><p className="whitespace-pre-wrap">{intakeForm.presenting_problem_remarks || '—'}</p></ReadRow>
          </ReadSection>

          <ReadSection title="Section 5: Brief Psychosocial History">
            <ReadRow label="Psychosocial History">
              <div className="flex flex-wrap mt-1">
                {(intakeForm.psychosocial_history || []).map((v: string) => <ReadBadge key={v} value={v} />)}
                {intakeForm.psychosocial_other && <ReadBadge value={`Other: ${intakeForm.psychosocial_other}`} />}
              </div>
            </ReadRow>
            <ReadRow label="Remarks"><p className="whitespace-pre-wrap">{intakeForm.psychosocial_remarks || '—'}</p></ReadRow>
          </ReadSection>

          <ReadSection title="Section 6: Interaction, Relationship, and Affect During Intake">
            <ReadRow label="Interaction and Relationship with Counselor">
              <div className="flex flex-wrap mt-1">
                {(intakeForm.interaction_relationship || []).map((v: string) => <ReadBadge key={v} value={v} />)}
                {intakeForm.interaction_relationship_other && <ReadBadge value={`Other: ${intakeForm.interaction_relationship_other}`} />}
              </div>
            </ReadRow>
            <ReadRow label="Affect / Emotional Expression">
              <div className="flex flex-wrap mt-1">
                {(intakeForm.affect_expression || []).map((v: string) => <ReadBadge key={v} value={v} />)}
                {intakeForm.affect_expression_other && <ReadBadge value={`Other: ${intakeForm.affect_expression_other}`} />}
              </div>
            </ReadRow>
            <ReadRow label="Remarks"><p className="whitespace-pre-wrap">{intakeForm.interaction_remarks || '—'}</p></ReadRow>
          </ReadSection>

          <ReadSection title="Section 7: Maladaptive Patterns Observed or Reported">
            <ReadRow label="Maladaptive Patterns">
              <div className="flex flex-wrap mt-1">
                {(intakeForm.maladaptive_patterns || []).map((v: string) => <ReadBadge key={v} value={v} />)}
                {intakeForm.maladaptive_patterns_other && <ReadBadge value={`Other: ${intakeForm.maladaptive_patterns_other}`} />}
              </div>
            </ReadRow>
          </ReadSection>

          <ReadSection title="Section 8: Counseling / Psychotherapy Goal">
            <ReadRow label="Goal"><p className="whitespace-pre-wrap">{intakeForm.counseling_goal || '—'}</p></ReadRow>
          </ReadSection>

          <ReadSection title="Section 9: Conceptualization (4 P's Framework)">
            <ReadRow label="Predisposing Factors">
              <div className="flex flex-wrap mt-1">
                {(intakeForm.predisposing_factors || []).map((v: string) => <ReadBadge key={v} value={v} />)}
                {intakeForm.predisposing_other && <ReadBadge value={`Other: ${intakeForm.predisposing_other}`} />}
              </div>
            </ReadRow>
            <ReadRow label="Precipitating Factors">
              <div className="flex flex-wrap mt-1">
                {(intakeForm.precipitating_factors || []).map((v: string) => <ReadBadge key={v} value={v} />)}
                {intakeForm.precipitating_other && <ReadBadge value={`Other: ${intakeForm.precipitating_other}`} />}
              </div>
            </ReadRow>
            <ReadRow label="Perpetuating Factors">
              <div className="flex flex-wrap mt-1">
                {(intakeForm.perpetuating_factors || []).map((v: string) => <ReadBadge key={v} value={v} />)}
                {intakeForm.perpetuating_other && <ReadBadge value={`Other: ${intakeForm.perpetuating_other}`} />}
              </div>
            </ReadRow>
            <ReadRow label="Protective Factors">
              <div className="flex flex-wrap mt-1">
                {(intakeForm.protective_factors || []).map((v: string) => <ReadBadge key={v} value={v} />)}
                {intakeForm.protective_other && <ReadBadge value={`Other: ${intakeForm.protective_other}`} />}
              </div>
            </ReadRow>
          </ReadSection>

          <ReadSection title="Section 10: Recommendation for Treatment or Disposition">
            <ReadRow label="Recommendation">
              <div className="flex flex-wrap mt-1">
                {(intakeForm.recommendation || []).map((v: string) => <ReadBadge key={v} value={v} />)}
                {intakeForm.recommendation_other && <ReadBadge value={`Other: ${intakeForm.recommendation_other}`} />}
              </div>
            </ReadRow>
          </ReadSection>
        </div>
      ) : (
        /* ── Edit / New form — Wizard ── */
        <div>
          {/* Mobile progress bar */}
          <div className="sm:hidden mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">Step {currentStep + 1} of {WIZARD_STEPS.length}</span>
              <span className="text-xs text-gray-500">{WIZARD_STEPS[currentStep].label}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#2563eb] h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / WIZARD_STEPS.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex gap-6">
            {/* Sidebar */}
            <aside className="hidden sm:flex flex-col w-48 flex-shrink-0">
              <div className="sticky top-4 space-y-0.5">
                {WIZARD_STEPS.map((step, idx) => {
                  const status = stepErrors[idx]?.length > 0 ? 'error' : getStepStatus(idx, d);
                  const isActive = idx === currentStep;
                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentStep(idx)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive
                          ? 'bg-[#2563eb] text-white'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                        isActive ? 'bg-white text-[#2563eb]' : 'bg-gray-200 text-gray-600'
                      }`}>{idx + 1}</span>
                      <span className="text-xs font-medium leading-tight flex-1 min-w-0 truncate">{step.short}</span>
                      {!isActive && <StepStatusIcon status={status} />}
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Step content */}
            <div className="flex-1 min-w-0">
              {/* Step 0: Session Information */}
              {currentStep === 0 && (
                <SectionBox title="Step 1: Session Information">
                  {(() => {
                    const rawDate = caseData?.appointment_info?.date || caseData?.appointment_date || caseData?.scheduled_start;
                    const fmtDate = rawDate
                      ? new Date(rawDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                      : '—';
                    const fmtTime = rawDate
                      ? new Date(rawDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                      : '—';
                    const mode = caseData?.appointment_info?.method || caseData?.method || caseData?.appointment_method || '—';
                    const studentId = caseData?.student?.school_id || '—';
                    const college = caseData?.student?.college || caseData?.student?.course || '—';
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg mb-2">
                        {[
                          { label: 'Date', value: fmtDate },
                          { label: 'Time', value: fmtTime },
                          { label: 'Mode', value: mode },
                          { label: 'Student ID', value: studentId },
                          { label: 'College', value: college },
                        ].map(item => (
                          <div key={item.label}>
                            <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                            <p className="text-sm font-medium text-gray-700">{item.value || '—'}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  <div>
                    <RadioField label="Type of Service" name="type_of_service" required
                      options={['Initial Interview', 'Triage Interview', 'Intake Interview', 'Counseling/Psychotherapy Session', 'Testing', 'Termination']}
                      value={d.type_of_service || ''} onChange={v => upd('type_of_service', v)}
                      hasError={!!(stepErrors[0]?.some(e => e.includes('Type of Service')))} />
                    {stepErrors[0]?.some(e => e.includes('Type of Service')) && (
                      <p className="text-xs text-red-500 mt-1">This field is required</p>
                    )}
                  </div>
                  <CheckboxFieldWithOther label="Referral Source" name="referral_source" required
                    options={[
                      'Self – client initiated the counseling request independently',
                      'Faculty / Staff – referred by teaching or non-teaching personnel',
                      'Parent / Guardian – referral made by family member or guardian',
                      'Peer / Friend – encouraged by classmate or colleague',
                      'Supervisor / Manager – referral from workplace or internship site',
                      'Academic Department / Program Chair – referral through college office or adviser',
                      'DLSU Office / Support Unit (e.g., SDFO, OUR, OAS, HSO)',
                    ]}
                    value={d.referral_source || []} otherValue={d.referral_source_other || ''}
                    onChange={v => upd('referral_source', v)}
                    onOtherChange={v => upd('referral_source_other', v)} />
                </SectionBox>
              )}

              {/* Step 1: Clinical Diagnosis */}
              {currentStep === 1 && (
                <SectionBox title="Step 2: Clinical Diagnosis">
                  <RadioField label="Clinical Diagnosis (optional)" name="clinical_diagnosis"
                    options={[
                      'Clinically diagnosed (based on provided documentation or prior records)',
                      'Clinically diagnosed (as informed by the client)',
                      'No clinical diagnosis indicated / mentioned',
                      'Not disclosed / Unknown',
                    ]}
                    value={d.clinical_diagnosis || ''} onChange={v => upd('clinical_diagnosis', v)} />
                </SectionBox>
              )}

              {/* Step 2: Psychometric Screening */}
              {currentStep === 2 && (
                <SectionBox title="Step 3: Psychometric Screening">
                  <p className="text-xs text-gray-500 italic">Administer the PHQ-9 and GAD-7 screening tools. Score each item from 0 (Not at all) to 3 (Nearly every day). You may skip this step if screening was not conducted.</p>
                  <PHQ9Section
                    responses={d.phq9_responses || new Array(9).fill(null)}
                    onChange={(responses: (number | null)[], score: number | null, severity: string | null) => {
                      setIntakeFormDraft({ ...d, phq9_responses: responses, phq9_score: score, phq9_severity: severity });
                    }}
                  />
                  <div className="border-t border-gray-100 my-2" />
                  <GAD7Section
                    responses={d.gad7_responses || new Array(7).fill(null)}
                    onChange={(responses: (number | null)[], score: number | null, severity: string | null) => {
                      setIntakeFormDraft({ ...d, gad7_responses: responses, gad7_score: score, gad7_severity: severity });
                    }}
                  />
                </SectionBox>
              )}

              {/* Step 3: Brief Description */}
              {currentStep === 3 && (
                <SectionBox title="Step 4: Brief Description of the Client">
                  <p className="text-xs text-gray-500 italic">This section gives a quick overview of how the client appeared, communicated, and interacted during the intake session.</p>
                  <div>
                    <CheckboxFieldWithOther label="General Appearance and Presentation" name="general_appearance" required
                      options={[
                        'Appropriate and well-groomed – neat, tidy, and consistent with the setting',
                        'Neat / Casual – relaxed but presentable',
                        'Fatigued or tired-looking – appears low in energy or sleep-deprived',
                        'Disheveled / unkempt – clothing or hygiene suggests stress or neglect',
                        'Tearful / emotional – shows visible sadness or crying during the session',
                      ]}
                      value={d.general_appearance || []} otherValue={d.general_appearance_other || ''}
                      onChange={v => upd('general_appearance', v)}
                      onOtherChange={v => upd('general_appearance_other', v)}
                      hasError={!!(stepErrors[3]?.some(e => e.includes('General Appearance')))} />
                    {stepErrors[3]?.some(e => e.includes('General Appearance')) && (
                      <p className="text-xs text-red-500 mt-1">This field is required</p>
                    )}
                  </div>
                  <div>
                    <CheckboxFieldWithOther label="Communication Style" name="communication_style" required
                      options={[
                        'Clear and coherent – expresses ideas logically and understandably',
                        'Soft-spoken / hesitant – quiet voice, pauses often, or unsure when speaking',
                        'Rapid / pressured – talks quickly, difficult to interrupt, possibly anxious',
                        'Logical and goal-directed – stays on topic, communicates purposefully',
                        'Circumstantial / tangential – gives excessive details or goes off topic',
                        'Disorganized / incoherent – speech is confusing or hard to follow',
                      ]}
                      value={d.communication_style || []} otherValue={d.communication_style_other || ''}
                      onChange={v => upd('communication_style', v)}
                      onOtherChange={v => upd('communication_style_other', v)}
                      hasError={!!(stepErrors[3]?.some(e => e.includes('Communication Style')))} />
                    {stepErrors[3]?.some(e => e.includes('Communication Style')) && (
                      <p className="text-xs text-red-500 mt-1">This field is required</p>
                    )}
                  </div>
                  <div>
                    <CheckboxFieldWithOther label="General Disposition / Demeanor" name="general_disposition" required
                      options={[
                        'Calm and cooperative – open, responsive, and comfortable engaging',
                        'Anxious or tense – restless, nervous, or visibly uneasy',
                        'Sad or withdrawn – quiet, minimal expression, or emotionally distant',
                        'Angry or irritable – defensive tone or easily frustrated',
                        'Motivated and engaged – participative, eager to reflect and improve',
                        'Guarded or defensive – cautious, reluctant to share',
                        'Distracted or preoccupied – unfocused, thinking of something else',
                      ]}
                      value={d.general_disposition || []} otherValue={d.general_disposition_other || ''}
                      onChange={v => upd('general_disposition', v)}
                      onOtherChange={v => upd('general_disposition_other', v)}
                      hasError={!!(stepErrors[3]?.some(e => e.includes('General Disposition')))} />
                    {stepErrors[3]?.some(e => e.includes('General Disposition')) && (
                      <p className="text-xs text-red-500 mt-1">This field is required</p>
                    )}
                  </div>
                  <div>
                    <TextareaField label="Remarks" fieldKey="brief_description_remarks" required
                      value={d.brief_description_remarks || ''} onChange={v => upd('brief_description_remarks', v)}
                      helperText="Add other noteworthy observations about the client's presentation or behavior. Write 'None' if no additional remarks."
                      hasError={!!(stepErrors[3]?.some(e => e.includes('Remarks')))} />
                    {stepErrors[3]?.some(e => e.includes('Remarks')) && (
                      <p className="text-xs text-red-500 mt-1">This field is required</p>
                    )}
                  </div>
                </SectionBox>
              )}

              {/* Step 4: Presenting Problem */}
              {currentStep === 4 && (
                <SectionBox title="Step 5: Presenting Problem">
                  <p className="text-xs text-gray-500 italic">This section identifies the main concerns or reasons the client sought counseling, based on their own report and counselor's clarification.</p>
                  <div>
                    <CheckboxFieldWithOther label="Presenting Problem" name="presenting_problem" required
                      options={[
                        'Anxiety or fear – excessive worry, tension, or panic episodes',
                        'Depression or sadness – low mood, hopelessness, or loss of interest',
                        'Stress or burnout – feeling overwhelmed by academics or work',
                        'Relationship or family conflict – difficulties in communication or boundaries',
                        'Adjustment or transition issue – struggling to cope with life or school changes',
                        'Grief or loss – emotional pain following death, separation, or significant loss',
                        'Trauma-related distress – distress linked to a past adverse event',
                        'Identity or self-concept concern – confusion about personal values, gender, or direction',
                        'Motivation or focus difficulty – trouble concentrating or completing tasks',
                        'Health-related stress – emotional impact of physical conditions or fatigue',
                      ]}
                      value={d.presenting_problem || []} otherValue={d.presenting_problem_other || ''}
                      onChange={v => upd('presenting_problem', v)}
                      onOtherChange={v => upd('presenting_problem_other', v)}
                      hasError={!!(stepErrors[4]?.some(e => e.includes('Presenting Problem')))} />
                    {stepErrors[4]?.some(e => e.includes('Presenting Problem')) && (
                      <p className="text-xs text-red-500 mt-1">This field is required</p>
                    )}
                  </div>
                  <div>
                    <TextareaField label="Remarks" fieldKey="presenting_problem_remarks" required
                      value={d.presenting_problem_remarks || ''} onChange={v => upd('presenting_problem_remarks', v)}
                      helperText="Add other noteworthy details about the client's main concern. Write 'None' if no additional remarks."
                      hasError={!!(stepErrors[4]?.some(e => e.includes('Remarks')))} />
                    {stepErrors[4]?.some(e => e.includes('Remarks')) && (
                      <p className="text-xs text-red-500 mt-1">This field is required</p>
                    )}
                  </div>
                </SectionBox>
              )}

              {/* Step 5: Psychosocial History */}
              {currentStep === 5 && (
                <SectionBox title="Step 6: Brief Psychosocial History">
                  <p className="text-xs text-gray-500 italic">Provide background information relevant to the client's current concern. Check all that apply and add short notes where needed.</p>
                  <div>
                    <CheckboxFieldWithOther label="Psychosocial History" name="psychosocial_history" required
                      options={[
                        'Significant past experiences – history of trauma, loss, illness, or major life transitions that shaped current functioning',
                        'Family background – quality of family relationships, support, or sources of conflict',
                        'Coping styles and strategies – ways the client typically manages stress (e.g., avoidance, problem-solving, prayer, journaling)',
                        'Academic or work functioning – level of motivation, performance, or adjustment to demands',
                        'Peer and social relationships – quality of friendships, social supports, or experiences of isolation',
                        'Health and lifestyle – physical well-being, sleep, exercise, nutrition, or medical conditions',
                        'Previous counseling or therapy – prior experience with mental health services and outcomes',
                        'Substance use history – use of alcohol, nicotine, caffeine, or other substances',
                        'Faith or spirituality – beliefs or practices that influence coping and meaning-making',
                      ]}
                      value={d.psychosocial_history || []} otherValue={d.psychosocial_other || ''}
                      onChange={v => upd('psychosocial_history', v)}
                      onOtherChange={v => upd('psychosocial_other', v)}
                      hasError={!!(stepErrors[5]?.some(e => e.includes('Psychosocial History')))} />
                    {stepErrors[5]?.some(e => e.includes('Psychosocial History')) && (
                      <p className="text-xs text-red-500 mt-1">This field is required</p>
                    )}
                  </div>
                  <div>
                    <TextareaField label="Remarks" fieldKey="psychosocial_remarks" required
                      value={d.psychosocial_remarks || ''} onChange={v => upd('psychosocial_remarks', v)}
                      helperText="Add any significant details about the client's background. Write 'None' if the checklist already captures the psychosocial background."
                      hasError={!!(stepErrors[5]?.some(e => e.includes('Remarks')))} />
                    {stepErrors[5]?.some(e => e.includes('Remarks')) && (
                      <p className="text-xs text-red-500 mt-1">This field is required</p>
                    )}
                  </div>
                </SectionBox>
              )}

              {/* Step 6: Interaction & Affect */}
              {currentStep === 6 && (
                <SectionBox title="Step 7: Interaction, Relationship, and Affect During Intake">
                  <p className="text-xs text-gray-500 italic">Describe how the client related to the counselor, expressed emotions, and engaged during the intake session.</p>
                  <div>
                    <CheckboxFieldWithOther label="Interaction and Relationship with Counselor" name="interaction_relationship" required
                      options={[
                        'Engaged and cooperative – open, responsive, and actively participated in conversation',
                        'Warm and receptive – friendly and comfortable engaging in dialogue',
                        'Guarded or hesitant – cautious, reserved, or limited in responses',
                        'Calm and composed – steady demeanor and appropriate behavior',
                        'Withdrawn or avoidant – quiet, minimal eye contact, or reluctant to engage',
                        'Irritable or defensive – easily frustrated or resistant to feedback',
                        'Motivated and hopeful – shows readiness and willingness to improve',
                      ]}
                      value={d.interaction_relationship || []} otherValue={d.interaction_relationship_other || ''}
                      onChange={v => upd('interaction_relationship', v)}
                      onOtherChange={v => upd('interaction_relationship_other', v)}
                      hasError={!!(stepErrors[6]?.some(e => e.includes('Interaction and Relationship')))} />
                    {stepErrors[6]?.some(e => e.includes('Interaction and Relationship')) && (
                      <p className="text-xs text-red-500 mt-1">This field is required</p>
                    )}
                  </div>
                  <div>
                    <CheckboxFieldWithOther label="Affect / Emotional Expression" name="affect_expression" required
                      options={[
                        'Appropriate to content – emotion matches the topic being discussed',
                        'Anxious / tense – fidgety, restless, or visibly nervous',
                        'Depressed / sad – flat affect, tearful, or downcast tone',
                        'Irritable / frustrated – easily annoyed or impatient',
                        'Labile / fluctuating – sudden shifts in mood or expression',
                        'Flat / restricted – limited range of emotion or monotone tone',
                        'Euthymic / stable – balanced, calm, and consistent emotional tone',
                      ]}
                      value={d.affect_expression || []} otherValue={d.affect_expression_other || ''}
                      onChange={v => upd('affect_expression', v)}
                      onOtherChange={v => upd('affect_expression_other', v)}
                      hasError={!!(stepErrors[6]?.some(e => e.includes('Affect')))} />
                    {stepErrors[6]?.some(e => e.includes('Affect')) && (
                      <p className="text-xs text-red-500 mt-1">This field is required</p>
                    )}
                  </div>
                  <div>
                    <TextareaField label="Remarks" fieldKey="interaction_remarks" required
                      value={d.interaction_remarks || ''} onChange={v => upd('interaction_remarks', v)}
                      helperText="Add any significant details or observations about the client's interaction, relationship, or affect. Write 'None' if the checklist already captures this."
                      hasError={!!(stepErrors[6]?.some(e => e.includes('Remarks')))} />
                    {stepErrors[6]?.some(e => e.includes('Remarks')) && (
                      <p className="text-xs text-red-500 mt-1">This field is required</p>
                    )}
                  </div>
                </SectionBox>
              )}

              {/* Step 7: Maladaptive Patterns */}
              {currentStep === 7 && (
                <SectionBox title="Step 8: Maladaptive Patterns Observed or Reported">
                  <p className="text-xs text-gray-500 italic">Identify recurring thoughts, emotions, behaviors, or coping styles that may be contributing to the client's current concerns.</p>
                  <div>
                    <CheckboxFieldWithOther label="Maladaptive Patterns" name="maladaptive_patterns" required
                      options={[
                        'Avoidance behaviors – Tendency to avoid situations, tasks, or conversations that cause discomfort',
                        'Negative self-talk or self-criticism – Persistent self-blame, harsh internal dialogue, or low self-worth',
                        'Emotional suppression – Difficulty expressing or acknowledging emotions',
                        'Excessive worry or rumination – Repetitive overthinking, "what if" thinking, difficulty letting go',
                        'Perfectionism or fear of failure – Unrealistic standards, strong fear of making mistakes',
                        'Dependence on others for reassurance – Difficulty making decisions or coping independently',
                        'Impulsivity or difficulty with emotional regulation – Acting quickly when distressed',
                        'Maladaptive coping strategies – Coping styles that provide short-term relief but increase distress over time',
                        'Interpersonal difficulties – Recurrent conflicts, withdrawal, or difficulty setting boundaries',
                        'Trauma-related responses – Hypervigilance, emotional numbing, or heightened reactivity',
                        'Academic/work-related maladaptive patterns – Procrastination, disengagement, or chronic burnout patterns',
                        'No maladaptive patterns identified at intake',
                      ]}
                      value={d.maladaptive_patterns || []} otherValue={d.maladaptive_patterns_other || ''}
                      onChange={v => upd('maladaptive_patterns', v)}
                      onOtherChange={v => upd('maladaptive_patterns_other', v)}
                      hasError={!!(stepErrors[7]?.some(e => e.includes('Maladaptive')))} />
                    {stepErrors[7]?.some(e => e.includes('Maladaptive')) && (
                      <p className="text-xs text-red-500 mt-1">This field is required</p>
                    )}
                  </div>
                </SectionBox>
              )}

              {/* Step 8: Counseling Goal */}
              {currentStep === 8 && (
                <SectionBox title="Step 9: Counseling / Psychotherapy Goal">
                  <div>
                    <TextareaField label="Counseling/Psychotherapy Goal" fieldKey="counseling_goal" required
                      value={d.counseling_goal || ''} onChange={v => upd('counseling_goal', v)}
                      helperText="State the overall/long term goal using the SMART framework (Specific, Measurable, Attainable, Realistic and Time-bound)."
                      placeholder="e.g., Client will reduce the frequency and intensity of anxiety episodes by consistently using at least two adaptive coping strategies within 8 weeks."
                      hasError={!!(stepErrors[8]?.some(e => e.includes('Counseling Goal')))} />
                    {stepErrors[8]?.some(e => e.includes('Counseling Goal')) && (
                      <p className="text-xs text-red-500 mt-1">This field is required</p>
                    )}
                  </div>
                </SectionBox>
              )}

              {/* Step 9: Recommendation / Decision (includes 4 P's + Recommendation) */}
              {currentStep === 9 && (
                <SectionBox title="Step 10: Recommendation / Decision">
                  <p className="text-xs text-gray-500 italic">Summarize your clinical understanding using the 4 P's Model, then state your recommendation.</p>
                  <CheckboxFieldWithOther label="Predisposing Factors" name="predisposing_factors" required
                    options={[
                      'Family history of mental health or relational problems',
                      'Early childhood adversity or trauma',
                      'Personality traits (e.g., perfectionism, dependency, impulsivity)',
                      'Chronic medical condition or neurobiological vulnerability',
                      'Limited early emotional support or attachment disruption',
                      'Cultural, gender, or identity-related stress exposure',
                    ]}
                    value={d.predisposing_factors || []} otherValue={d.predisposing_other || ''}
                    onChange={v => upd('predisposing_factors', v)}
                    onOtherChange={v => upd('predisposing_other', v)} />
                  <CheckboxFieldWithOther label="Precipitating Factors" name="precipitating_factors" required
                    options={[
                      'Recent loss or separation',
                      'Academic or work stress / overload',
                      'Relationship conflict or breakup',
                      'Transition or adjustment (e.g., relocation, new role, course changes)',
                      'Health-related event or diagnosis',
                      'Traumatic or critical incident',
                    ]}
                    value={d.precipitating_factors || []} otherValue={d.precipitating_other || ''}
                    onChange={v => upd('precipitating_factors', v)}
                    onOtherChange={v => upd('precipitating_other', v)} />
                  <CheckboxFieldWithOther label="Perpetuating Factors" name="perpetuating_factors" required
                    options={[
                      'Maladaptive coping (avoidance, withdrawal, substance use)',
                      'Ongoing stressors (family, financial, workload)',
                      'Environmental barriers (limited support, unsafe environment)',
                      'Negative thinking patterns or self-criticism',
                      'Lack of insight or resistance to change',
                      'Poor self-care or sleep habits',
                    ]}
                    value={d.perpetuating_factors || []} otherValue={d.perpetuating_other || ''}
                    onChange={v => upd('perpetuating_factors', v)}
                    onOtherChange={v => upd('perpetuating_other', v)} />
                  <CheckboxFieldWithOther label="Protective Factors" name="protective_factors" required
                    options={[
                      'Supportive relationships or social network',
                      'Faith or spirituality',
                      'Academic or work engagement',
                      'Motivation to improve / willingness to seek help',
                      'Effective coping or problem-solving skills',
                      'Stable housing or financial situation',
                      'Access to mental health and community resources',
                    ]}
                    value={d.protective_factors || []} otherValue={d.protective_other || ''}
                    onChange={v => upd('protective_factors', v)}
                    onOtherChange={v => upd('protective_other', v)} />
                  <div className="border-t border-gray-100 pt-4">
                    <div>
                      <CheckboxFieldWithOther label="Recommendation for Treatment or Disposition" name="recommendation" required
                        options={[
                          'Continue Counseling / Psychotherapy – client to engage in ongoing sessions with same counselor/psychologist or team',
                          'Referral to CPS Psychologist (Testing / Assessment) – for further diagnostic or psychological evaluation',
                          'Referral to CPS Psychologist for Psychotherapy – referred for specialized, in-depth therapy within CPS',
                          'Referral to Psychiatrist / Physician – for medication evaluation or medical management',
                          'Crisis Intervention / Safety Plan Initiated – immediate response to safety or suicide risk concerns',
                          'Collaboration with Faculty / Staff (with consent) – coordinate support for academic or behavioral concerns',
                          'Referral to External Support / Agency – e.g., community mental health center, support group, or hotline',
                          'Follow-up Session Scheduled – next session date or frequency confirmed',
                        ]}
                        value={d.recommendation || []} otherValue={d.recommendation_other || ''}
                        onChange={v => upd('recommendation', v)}
                        onOtherChange={v => upd('recommendation_other', v)}
                        hasError={!!(stepErrors[9]?.some(e => e.includes('Recommendation')))} />
                      {stepErrors[9]?.some(e => e.includes('Recommendation')) && (
                        <p className="text-xs text-red-500 mt-1">This field is required</p>
                      )}
                    </div>
                  </div>
                </SectionBox>
              )}

              {/* Step 10: Signature / Attestation */}
              {currentStep === 10 && (
                <SectionBox title="Step 11: Signature / Attestation">
                  <p className="text-xs text-gray-500 italic">By completing this form, the IC affirms that the information recorded is accurate and was gathered during the intake session.</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IC Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={d.ic_name || ''}
                      onChange={e => upd('ic_name', e.target.value)}
                      placeholder="Full name of Intake Counselor"
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent outline-none ${
                        stepErrors[10]?.some(e => e.includes('IC Name')) ? 'border-red-400' : 'border-gray-200'
                      }`}
                    />
                    {stepErrors[10]?.some(e => e.includes('IC Name')) && (
                      <p className="text-xs text-red-500 mt-1">This field is required</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Signature Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={d.ic_signature_date || ''}
                      onChange={e => upd('ic_signature_date', e.target.value)}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent outline-none ${
                        stepErrors[10]?.some(e => e.includes('Signature Date')) ? 'border-red-400' : 'border-gray-200'
                      }`}
                    />
                    {stepErrors[10]?.some(e => e.includes('Signature Date')) && (
                      <p className="text-xs text-red-500 mt-1">This field is required</p>
                    )}
                  </div>
                </SectionBox>
              )}

              {/* Save validation summary */}
              {showSaveSummary && missingFields.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <p className="text-sm font-bold text-red-700 mb-2">Please complete the following before saving:</p>
                  <ul className="space-y-1">
                    {missingFields.map((f, i) => (
                      <li key={i}>
                        <button
                          onClick={() => setCurrentStep(f.stepIndex)}
                          className="text-sm text-red-600 underline hover:text-red-800">
                          Step {f.stepIndex + 1}: {f.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Status messages */}
              {intakeFormSuccess && <p className="text-sm text-blue-700 font-medium mb-3">Saved successfully.</p>}
              {intakeFormError && <p className="text-sm text-red-600 mb-3">{intakeFormError}</p>}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                  ← Previous
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveDraft}
                    disabled={intakeFormSaving}
                    className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition flex items-center gap-1.5">
                    {intakeFormSaving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : 'Save Draft'}
                  </button>
                  {currentStep < WIZARD_STEPS.length - 1 ? (
                    <button
                      onClick={handleNext}
                      className="px-5 py-2 bg-[#2563eb] text-white text-sm font-semibold rounded-lg hover:bg-[#16451f] transition">
                      Next →
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveForm}
                      disabled={intakeFormSaving}
                      className="px-5 py-2 bg-[#2563eb] text-white text-sm font-semibold rounded-lg hover:bg-[#16451f] disabled:opacity-50 transition flex items-center gap-2">
                      {intakeFormSaving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : 'Save Form'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
