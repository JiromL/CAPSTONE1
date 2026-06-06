"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { CheckInForm, CheckInHistory } from '@/components/CheckInForm';
import { useIntakeApi, useCheckInApi } from '@/utils/useApi';
import { AlertCircle, Loader, Plus, FileText, Target, Activity, Link2, Unlink, Loader2, Shield, X as XIcon } from 'lucide-react';
import { api } from '@/utils/api';
import { PermaBadge } from '@/components/PendingStudentsWithPerma';

interface SessionNote {
  note_id: string;
  session_date: string;
  session_type: string;
  note_content?: string;
  note_format?: 'SOAP' | 'freeform';
  soap?: { subjective?: string; objective?: string; assessment?: string; plan?: string };
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
  const act = async (action: 'approve' | 'reject') => {
    setBusy(true);
    await onAction(noteId, action, comment);
    setBusy(false);
  };
  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Supervisor Review</p>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={2}
        placeholder="Optional feedback comment…"
        className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-1 focus:ring-green-500"
      />
      <div className="flex gap-2">
        <button
          onClick={() => act('approve')}
          disabled={busy}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition disabled:opacity-50"
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
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-xs text-gray-400 mb-2">{hint}</p>
      <div className="flex gap-2 mb-2">
        <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), commit())}
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Add item…" />
        <button onClick={commit} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm"><Plus size={14} /></button>
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-center justify-between text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1">
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
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-xs text-gray-400 mb-2">{hint}</p>
      <div className="flex gap-2 mb-2">
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
          placeholder="Name" />
        <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          className="w-36 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
          placeholder="Phone" />
        <button onClick={commit} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm"><Plus size={14} /></button>
      </div>
      <ul className="space-y-1">
        {items.map((c, i) => (
          <li key={i} className="flex items-center justify-between text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1">
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
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-0.5">Professional / Crisis Contacts</p>
      <p className="text-xs text-gray-400 mb-2">Counselors, psychiatrists, crisis hotlines the client can reach out to.</p>
      <div className="flex gap-2 mb-2 flex-wrap">
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="flex-1 min-w-[120px] border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
          placeholder="Name" />
        <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
          className="w-32 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
          placeholder="Role / org" />
        <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          className="w-36 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
          placeholder="Phone / hotline" />
        <button onClick={commit} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm"><Plus size={14} /></button>
      </div>
      <ul className="space-y-1">
        {items.map((c, i) => (
          <li key={i} className="flex items-center justify-between text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1">
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
  const caseId = params.id as string;

  const { getCase, updateCaseStatus, loading: intakeLoading } = useIntakeApi();
  const { createCheckIn, getCheckInHistory, loading: checkInLoading } = useCheckInApi();

  const [currentUser, setCurrentUser] = useState<{ role?: string } | null>(null);
  const [caseData, setCaseData] = useState<any>(null);
  const [checkInHistory, setCheckInHistory] = useState<any[]>([]);
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'session-notes' | 'treatment-plan' | 'diagnoses' | 'safety-plan' | 'assessments' | 'check-ins' | 'perma'>('details');
  const [diagnoses, setDiagnoses] = useState<Array<{ code: string; description: string; type: string; system: string; added_at: string }>>([]);
  const [diagForm, setDiagForm] = useState({ code: '', description: '', type: 'primary', system: 'DSM-5' });
  const [savingDiag, setSavingDiag] = useState(false);
  const [permaHistory, setPermaHistory] = useState<Array<{ date: string; perma_label: string | null }>>([]);
  const [permaLoading, setPermaLoading] = useState(false);
  const [mhbotUsername, setMhbotUsername] = useState('');
  const [linkingMhbot, setLinkingMhbot] = useState(false);
  const [mhbotError, setMhbotError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteForm, setNoteForm] = useState({ ...emptyNote, session_date: '' });
  const [savingNote, setSavingNote] = useState(false);

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
    if (activeTab === 'perma') loadPermaHistory();
    if (activeTab === 'diagnoses') loadDiagnoses();
    if (activeTab === 'safety-plan' && !safetyPlanLoaded) loadSafetyPlan();
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

  const loadPermaHistory = async () => {
    if (!caseData) return;
    const student = caseData.student || {};
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
        setPermaHistory(d.history ?? []);
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

  const handleSaveNote = async () => {
    try {
      setSavingNote(true);
      const token = localStorage.getItem('token');
      const res = await fetch(api(`/api/counseling/case/${caseId}/session-note`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(noteForm),
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
    <DashboardPageWrapper
      title="Case Details"
      subtitle={caseData?.case_number ? `Case ${caseData.case_number}` : 'Loading…'}
    >
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
        <div className="mb-5 bg-white rounded-xl border border-gray-200 px-5 py-4 flex flex-wrap items-center gap-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0"
            style={{ backgroundColor: '#1a5228' }}>
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
                ? 'border-[#1a5228] text-[#1a5228]'
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
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
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
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
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
                          className="flex-shrink-0 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
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

          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
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
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-2">Presenting Issue</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">{caseData.presenting_issue}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Session Notes Tab ──────────────────────────────────── */}
      {activeTab === 'session-notes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">Session Notes</h3>
            <button
              onClick={() => setShowNoteForm(!showNoteForm)}
              className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              style={{ backgroundColor: '#1a5228' }}
              onMouseOver={e => (e.currentTarget.style.backgroundColor = '#14401e')}
              onMouseOut={e => (e.currentTarget.style.backgroundColor = '#1a5228')}
            >
              <Plus size={15} /> Add Note
            </button>
          </div>

          {showNoteForm && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-4">New Session Note</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Session Date & Time</label>
                  <input
                    type="datetime-local"
                    value={noteForm.session_date}
                    onChange={(e) => setNoteForm({ ...noteForm, session_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Session Type</label>
                  <select
                    value={noteForm.session_type}
                    onChange={(e) => setNoteForm({ ...noteForm, session_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                  >
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="CRISIS">Crisis</option>
                    <option value="FOLLOW_UP">Follow-up</option>
                    <option value="INTAKE">Intake</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Mood Rating (1–10)</label>
                  <input
                    type="number" min="1" max="10"
                    value={noteForm.mood_rating}
                    onChange={(e) => setNoteForm({ ...noteForm, mood_rating: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Symptom Severity</label>
                  <select
                    value={noteForm.symptom_severity}
                    onChange={(e) => setNoteForm({ ...noteForm, symptom_severity: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                  >
                    <option value="NONE">None</option>
                    <option value="MILD">Mild</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="SEVERE">Severe</option>
                  </select>
                </div>

                {/* Note format toggle */}
                <div className="md:col-span-2">
                  <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
                    {(['SOAP', 'freeform'] as const).map(fmt => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setNoteForm({ ...noteForm, note_format: fmt })}
                        className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${noteForm.note_format === fmt ? 'bg-white dark:bg-gray-700 text-green-700 dark:text-green-300 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        {fmt === 'SOAP' ? 'SOAP Template' : 'Freeform'}
                      </button>
                    ))}
                  </div>
                </div>

                {noteForm.note_format === 'SOAP' ? (
                  <>
                    {([
                      { key: 'soap_subjective', label: 'S — Subjective', hint: "Client's own words, feelings, and complaints" },
                      { key: 'soap_objective', label: 'O — Objective', hint: 'Observable data: behavior, appearance, test scores' },
                      { key: 'soap_assessment', label: 'A — Assessment', hint: 'Clinician interpretation, risk level, diagnosis impression' },
                      { key: 'soap_plan', label: 'P — Plan', hint: 'Next steps, homework, referrals, follow-up schedule' },
                    ] as const).map(({ key, label, hint }) => (
                      <div key={key} className="md:col-span-2">
                        <label className="block text-xs font-semibold text-green-700 dark:text-green-400 mb-0.5">{label}</label>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{hint}</p>
                        <textarea
                          value={noteForm[key] as string}
                          onChange={(e) => setNoteForm({ ...noteForm, [key]: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 text-sm border border-green-200 dark:border-green-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {(['topics_discussed', 'interventions', 'client_response', 'progress_on_goals'] as const).map((field) => (
                      <div key={field} className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </label>
                        <textarea
                          value={noteForm[field] as string}
                          onChange={(e) => setNoteForm({ ...noteForm, [field]: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                        />
                      </div>
                    ))}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Homework / Tasks Assigned</label>
                      <input
                        type="text"
                        value={noteForm.homework_assigned}
                        onChange={(e) => setNoteForm({ ...noteForm, homework_assigned: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                      />
                    </div>
                  </>
                )}
                <div className="md:col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="risk_flagged"
                    checked={noteForm.risk_flagged}
                    onChange={(e) => setNoteForm({ ...noteForm, risk_flagged: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="risk_flagged" className="text-sm font-medium text-red-700 dark:text-red-400">Flag as Risk Concern</label>
                </div>
                {noteForm.risk_flagged && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Risk Notes</label>
                    <textarea
                      value={noteForm.risk_notes}
                      onChange={(e) => setNoteForm({ ...noteForm, risk_notes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleSaveNote}
                  disabled={savingNote}
                  className="text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
                  style={{ backgroundColor: '#1a5228' }}
                >
                  {savingNote ? 'Saving…' : 'Save Note'}
                </button>
                <button
                  onClick={() => setShowNoteForm(false)}
                  className="px-5 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {sessionNotes.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <FileText size={28} className="mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">No session notes yet.</p>
              <p className="text-xs text-gray-500 mt-1">Click "Add Note" to record a session.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessionNotes.map((note) => (
                <div key={note.note_id} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                        {new Date(note.session_date).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{note.session_type}{note.counselor ? ` · ${note.counselor}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {note.risk_flagged && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Risk</span>
                      )}
                      {note.mood_rating && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Mood {note.mood_rating}/10</span>
                      )}
                      {note.symptom_severity && note.symptom_severity !== 'NONE' && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">{note.symptom_severity}</span>
                      )}
                      {note.supervisor_approved === true && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium rounded-full">✓ Approved</span>
                      )}
                      {note.supervisor_approved === false && note.supervisor_name && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-medium rounded-full">✗ Rejected</span>
                      )}
                      {note.supervisor_approved === false && !note.supervisor_name && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-medium rounded-full">Pending review</span>
                      )}
                    </div>
                  </div>
                  {/* SOAP format display */}
                  {note.note_format === 'SOAP' && note.soap && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                      {note.soap.subjective && (
                        <div>
                          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">S — Subjective</p>
                          <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{note.soap.subjective}</p>
                        </div>
                      )}
                      {note.soap.objective && (
                        <div>
                          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">O — Objective</p>
                          <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{note.soap.objective}</p>
                        </div>
                      )}
                      {note.soap.assessment && (
                        <div>
                          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">A — Assessment</p>
                          <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{note.soap.assessment}</p>
                        </div>
                      )}
                      {note.soap.plan && (
                        <div>
                          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">P — Plan</p>
                          <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{note.soap.plan}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Freeform format display */}
                  {note.note_format !== 'SOAP' && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                      {note.topics_discussed && (
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide">Topics</p>
                          <p className="text-sm text-gray-700 mt-0.5">{note.topics_discussed}</p>
                        </div>
                      )}
                      {note.interventions && (
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide">Interventions</p>
                          <p className="text-sm text-gray-700 mt-0.5">{note.interventions}</p>
                        </div>
                      )}
                      {note.client_response && (
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide">Client Response</p>
                          <p className="text-sm text-gray-700 mt-0.5">{note.client_response}</p>
                        </div>
                      )}
                      {note.progress_on_goals && (
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide">Progress on Goals</p>
                          <p className="text-sm text-gray-700 mt-0.5">{note.progress_on_goals}</p>
                        </div>
                      )}
                      {note.homework_assigned && (
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide">Homework</p>
                          <p className="text-sm text-gray-700 mt-0.5">{note.homework_assigned}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Supervisor comment if rejected */}
                  {note.supervisor_approved === false && note.supervisor_comment && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-300">
                      <span className="font-semibold">Feedback:</span> {note.supervisor_comment}
                    </div>
                  )}
                  {/* Supervisor sign-off actions */}
                  {['PSYCHOLOGIST', 'CSP', 'ADMIN'].includes(currentUser?.role || '') && !note.supervisor_approved && !note.supervisor_name && (
                    <SupervisorActions noteId={note.note_id} onAction={handleApproveNote} />
                  )}
                  {/* Approval info */}
                  {note.supervisor_approved && note.supervisor_name && (
                    <p className="mt-2 text-xs text-gray-400">
                      Approved by <span className="font-medium">{note.supervisor_name}</span>
                      {note.supervisor_action_at && ` · ${new Date(note.supervisor_action_at).toLocaleDateString()}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                {/* Goals */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Goals</label>
                    <button type="button" onClick={() => setTreatmentPlan(tp => ({ ...tp, goals: [...tp.goals, { goal: '', target_date: '', status: 'not_started' }] }))}
                      className="text-xs text-green-600 dark:text-green-400 hover:underline">+ Add Goal</button>
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
                      className="text-xs text-green-600 dark:text-green-400 hover:underline">+ Add</button>
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
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-5">
                {treatmentPlan.goals.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Goals</p>
                    <div className="space-y-1.5">
                      {treatmentPlan.goals.map((g, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${g.status === 'achieved' ? 'bg-green-500' : g.status === 'in_progress' ? 'bg-yellow-500' : 'bg-gray-300'}`} />
                          <span className="flex-1 text-gray-800 dark:text-gray-200">{g.goal}</span>
                          {g.target_date && <span className="text-xs text-gray-400">{new Date(g.target_date).toLocaleDateString()}</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.status === 'achieved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : g.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>{g.status.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {treatmentPlan.interventions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Interventions</p>
                    <div className="flex flex-wrap gap-2">
                      {treatmentPlan.interventions.map((iv, i) => <span key={i} className="text-xs px-2.5 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">{iv}</span>)}
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
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
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
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
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
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition">
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
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-10 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">No diagnoses recorded.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
              {diagnoses.map((d, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <span className="font-mono text-sm font-bold text-green-700 dark:text-green-400 w-20 flex-shrink-0">{d.code}</span>
                  <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{d.description}</span>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">{d.system}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${d.type === 'primary' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : d.type === 'rule_out' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>{d.type.replace('_', ' ')}</span>
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
                <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded">On file</span>
              )}
            </div>
            {safetyPlanExists && !editingSafetyPlan && (
              <button onClick={() => setEditingSafetyPlan(true)} className="text-xs text-green-600 dark:text-green-400 hover:underline">Edit</button>
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
                <div key={sec.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
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
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
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
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
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
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Means Restriction</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{safetyPlan.means_restriction || <span className="italic text-gray-400">Not recorded</span>}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
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
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Means Restriction
                </label>
                <p className="text-xs text-gray-400 mb-2">Describe agreed actions to limit access to lethal means.</p>
                <textarea
                  value={safetyPlan.means_restriction}
                  onChange={e => setSafetyPlan(p => ({ ...p, means_restriction: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g. Client agreed to have family remove firearms from home."
                />
              </div>

              {/* Follow-up + Signature */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Follow-Up Date</label>
                  <input
                    type="date"
                    value={safetyPlan.follow_up_date}
                    onChange={e => setSafetyPlan(p => ({ ...p, follow_up_date: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Counselor Name</label>
                  <input
                    type="text"
                    value={safetyPlan.counselor_signature}
                    onChange={e => setSafetyPlan(p => ({ ...p, counselor_signature: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4 flex items-start gap-3">
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
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
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
                              ? 'bg-green-600 border-green-600 text-white font-medium'
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
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition"
                >
                  {savingAssessment ? 'Saving…' : 'Save Assessment'}
                </button>
                <p className="text-xs text-gray-400">{Object.keys(assessmentResponses).length}/{assessmentTemplate.questions.length} answered</p>
              </div>
            </div>
          ) : (
            /* ── Pick assessment to record ── */
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
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
                    className="flex flex-col items-start px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-600 transition text-left"
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
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
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
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Assessment</label>
                  <select value={scheduleForm.assessment_type}
                    onChange={e => setScheduleForm(f => ({ ...f, assessment_type: e.target.value }))}
                    className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500">
                    <option value="PHQ9">PHQ-9 (Depression)</option>
                    <option value="GAD7">GAD-7 (Anxiety)</option>
                    <option value="PSS">PSS-10 (Stress)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Every (days)</label>
                  <input type="number" min={1} max={90} value={scheduleForm.interval_days}
                    onChange={e => setScheduleForm(f => ({ ...f, interval_days: parseInt(e.target.value) || 14 }))}
                    className="w-24 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">First due date</label>
                  <input type="date" value={scheduleForm.start_date}
                    onChange={e => setScheduleForm(f => ({ ...f, start_date: e.target.value }))}
                    className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="self-end">
                  <button onClick={handleAddSchedule} disabled={savingSchedule}
                    className={`px-4 py-1.5 rounded text-sm font-medium transition flex items-center gap-1.5 ${savingSchedule ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
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
                  <div key={s.schedule_id} className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
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
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <Activity size={14} className="text-green-500" /> MHBot Account
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
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={linkMhbot}
                    disabled={linkingMhbot || !mhbotUsername.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
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
          {caseData?.student?.mhbot_username && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">PERMA History</p>
              {permaLoading ? (
                <div className="flex justify-center py-8 text-gray-400">
                  <Loader2 size={18} className="animate-spin mr-2" /> Loading…
                </div>
              ) : permaHistory.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No PERMA records found</p>
              ) : (
                <div className="space-y-2">
                  {permaHistory.map((h, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(h.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <PermaBadge label={h.perma_label} />
                    </div>
                  ))}
                </div>
              )}
              {mhbotError && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle size={11} /> {mhbotError}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </DashboardPageWrapper>
  );
}
