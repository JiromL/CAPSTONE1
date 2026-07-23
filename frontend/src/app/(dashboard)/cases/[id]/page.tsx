"use client";

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { CheckInForm, CheckInHistory } from '@/components/CheckInForm';
import { useIntakeApi, useCheckInApi } from '@/utils/useApi';
import { AlertCircle, Loader, Plus, FileText, Target, Activity, Link2, Unlink, Loader2, Shield, X as XIcon, ArrowLeft, Download, ChevronDown, Pencil, Trash2, CalendarPlus, UserPlus } from 'lucide-react';
import { getNoteTypeBadgeStyle, getRiskBadgeStyle } from '@/utils/badges';
import Link from 'next/link';
import { api } from '@/utils/api';
import { ClinicalExportModal } from '@/components/ClinicalExportModal';
import { PermaBadge } from '@/components/PendingStudentsWithPerma';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { StructuredSOAPForm, StructuredSOAPData, emptyStructuredSOAP } from '@/components/StructuredSOAPForm';
import { TerminationFormModal, TerminationFormData } from '@/components/TerminationFormModal';
import { ICInterviewWizard } from '@/components/ICInterviewWizard';

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
  is_deleted?: boolean;
  deleted_by_name?: string;
  deleted_at?: string;
}

const IC    = 'w-full px-3 py-2 text-sm rounded-lg outline-none transition';
const IC_XS = 'w-full px-3 py-2 text-xs rounded-lg outline-none transition';
const ICS: React.CSSProperties = { background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

function riskBadgeStyle(level: string): React.CSSProperties {
  const s = getRiskBadgeStyle(level);
  return { background: s.bg, color: s.text, boxShadow: `0 0 0 1px ${s.border}` };
}

function noteTypeStyle(type: string): React.CSSProperties {
  const s = getNoteTypeBadgeStyle(type);
  return { background: s.bg, color: s.text };
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
    <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid var(--color-border)' }}>
      <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Supervisor Review</p>
      <textarea
        value={comment}
        onChange={e => { setComment(e.target.value); if (rejectError) setRejectError(''); }}
        rows={2}
        placeholder="Feedback comment (required for rejection)…"
        className={IC_XS + ' resize-none'}
        style={ICS}
      />
      {rejectError && (
        <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{rejectError}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => act('approve')}
          disabled={busy}
          className="px-3 py-1.5 text-white text-xs font-medium rounded transition disabled:opacity-50 hover:opacity-90"
          style={{ background: 'var(--color-primary)' }}
        >Approve</button>
        <button
          onClick={() => act('reject')}
          disabled={busy}
          className="px-3 py-1.5 text-white text-xs font-medium rounded transition disabled:opacity-50 hover:opacity-90"
          style={{ background: 'var(--color-danger)' }}
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
    <div className="rounded-lg p-4 shadow-sm" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
      <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>
      <div className="flex gap-2 mb-2">
        <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), commit())}
          className="flex-1 px-3 py-1.5 text-sm rounded outline-none transition"
          style={ICS}
          placeholder="Add item…" />
        <button onClick={commit} className="px-3 py-1.5 text-white rounded text-sm hover:opacity-90 transition"
          style={{ background: 'var(--color-primary)' }}><Plus size={14} /></button>
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={`${item}-${i}`} className="flex items-center justify-between text-sm rounded px-2 py-1"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}>
            <span>{item}</span>
            <button onClick={() => onRemove(i)} className="ml-2 transition"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-danger)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}><XIcon size={13} /></button>
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
    <div className="rounded-lg p-4 shadow-sm" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
      <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>
      <div className="flex gap-2 mb-2">
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="flex-1 px-3 py-1.5 text-sm rounded outline-none transition"
          style={ICS} placeholder="Name" />
        <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          className="w-36 px-3 py-1.5 text-sm rounded outline-none transition"
          style={ICS} placeholder="Phone" />
        <button onClick={commit} className="px-3 py-1.5 text-white rounded text-sm hover:opacity-90 transition"
          style={{ background: 'var(--color-primary)' }}><Plus size={14} /></button>
      </div>
      <ul className="space-y-1">
        {items.map((c, i) => (
          <li key={`item-${i}`} className="flex items-center justify-between text-sm rounded px-2 py-1"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}>
            <span>{c.name} <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>{c.phone}</span></span>
            <button onClick={() => onRemove(i)} className="ml-2 transition"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-danger)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}><XIcon size={13} /></button>
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
    <div className="rounded-lg p-4 shadow-sm" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>Professional / Crisis Contacts</p>
      <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Counselors, psychiatrists, crisis hotlines the client can reach out to.</p>
      <div className="flex gap-2 mb-2 flex-wrap">
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="flex-1 min-w-[120px] px-3 py-1.5 text-sm rounded outline-none transition"
          style={ICS} placeholder="Name" />
        <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
          className="w-32 px-3 py-1.5 text-sm rounded outline-none transition"
          style={ICS} placeholder="Role / org" />
        <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          className="w-36 px-3 py-1.5 text-sm rounded outline-none transition"
          style={ICS} placeholder="Phone / hotline" />
        <button onClick={commit} className="px-3 py-1.5 text-white rounded text-sm hover:opacity-90 transition"
          style={{ background: 'var(--color-primary)' }}><Plus size={14} /></button>
      </div>
      <ul className="space-y-1">
        {items.map((c, i) => (
          <li key={`item-${i}`} className="flex items-center justify-between text-sm rounded px-2 py-1"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}>
            <span>{c.name} <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{c.role}</span> <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>{c.phone}</span></span>
            <button onClick={() => onRemove(i)} className="ml-2 transition"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-danger)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}><XIcon size={13} /></button>
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

  const [currentUser, setCurrentUser] = useState<{ role?: string; first_name?: string; last_name?: string; email?: string } | null>(null);
  const [caseData, setCaseData] = useState<any>(null);
  const [checkInHistory, setCheckInHistory] = useState<any[]>([]);
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([]);
  const tabParam = searchParams.get('tab') as any;
  const [activeTab, setActiveTab] = useState<'overview' | 'intake' | 'clinical-record' | 'wellbeing' | 'history'>(() => {
    const legacyMap: Record<string, 'overview' | 'intake' | 'clinical-record' | 'wellbeing' | 'history'> = {
      'details': 'overview', 'session-notes': 'clinical-record', 'treatment-plan': 'clinical-record',
      'diagnoses': 'clinical-record', 'safety-plan': 'clinical-record', 'assessments': 'wellbeing',
      'perma': 'wellbeing', 'intake-summary': 'intake', 'check-ins': 'history',
    };
    return legacyMap[tabParam || ''] || 'overview';
  });
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
  const [showEditTriageModal, setShowEditTriageModal] = useState(false);
  const [editTriageDecision, setEditTriageDecision] = useState('');
  const [editTriageRisk, setEditTriageRisk] = useState('');
  const [editTriageNotes, setEditTriageNotes] = useState('');
  const [savingEditTriage, setSavingEditTriage] = useState(false);
  const [editTriageError, setEditTriageError] = useState('');
  const [showTerminationForm, setShowTerminationForm] = useState(false);
  const [showClosureChecklist, setShowClosureChecklist] = useState(false);
  const [closureChecks, setClosureChecks] = useState({ notes: false, referrals: false, notified: false });
  const [confirmingNoShowTerm, setConfirmingNoShowTerm] = useState(false);
  const [reopeningCase, setReopeningCase] = useState(false);
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

  const [showScheduleModal, setShowScheduleModal]   = useState(false);
  const [scheduleNotes, setScheduleNotes]           = useState('');
  const [scheduleOffice, setScheduleOffice]         = useState('');
  const [schedulingSession, setSchedulingSession]   = useState(false);
  const [scheduleMsg, setScheduleMsg]               = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [sessionCount, setSessionCount]             = useState<{ completed: number; limit: number; remaining: number } | null>(null);

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

  type ReferralLoad = { counselor_id: string; name: string; utilization: 'LOW' | 'MEDIUM' | 'HIGH'; active_cases: number; active_appointments: number; this_week: number; };
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralRole, setReferralRole] = useState<'PSYCHOLOGIST' | 'COUNSELOR'>('PSYCHOLOGIST');
  const [referralTargetId, setReferralTargetId] = useState('');
  const [referralReason, setReferralReason] = useState('');
  const [referralSubmitting, setReferralSubmitting] = useState(false);
  const [referralMsg, setReferralMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [referralWorkload, setReferralWorkload] = useState<ReferralLoad[]>([]);
  const [referralWorkloadLoading, setReferralWorkloadLoading] = useState(false);
  const [recommendedReferralId, setRecommendedReferralId] = useState<string | null>(null);

  const EXT_OFFICES = [
    'Health Services Office (HSO)',
    'Student Discipline and Formation Office (SDFO)',
    'Office for Academic Services (OAS)',
    'Office of the Registrar',
    'Office of Student Affairs and Services',
    'Career and Placement Office',
    'Financial Assistance Office',
    'Other',
  ];
  const [showExtReferralModal, setShowExtReferralModal] = useState(false);
  const [extReferralOffice, setExtReferralOffice] = useState('');
  const [extReferralCustomOffice, setExtReferralCustomOffice] = useState('');
  const [extReferralConcern, setExtReferralConcern] = useState('');
  const [extReferralRequest, setExtReferralRequest] = useState('');

  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setNoteForm((f) => ({ ...f, session_date: now.toISOString().slice(0, 16) }));
    loadCaseData();
    loadCaseAppointments();
    loadSessionCount();
  }, [caseId]);

  // Warn before leaving when a note form has unsaved content
  useEffect(() => {
    if (!showNoteForm) return;
    const hasContent = noteForm.soap_subjective || noteForm.soap_objective || noteForm.soap_assessment || noteForm.soap_plan || noteForm.topics_discussed;
    if (!hasContent) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [showNoteForm, noteForm.soap_subjective, noteForm.soap_objective, noteForm.soap_assessment, noteForm.soap_plan, noteForm.topics_discussed]);

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

  const loadSessionCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/cases/${caseId}/session-count`), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setSessionCount(await r.json());
    } catch {}
  };

  const loadReferralWorkload = async (role: 'PSYCHOLOGIST' | 'COUNSELOR') => {
    setReferralWorkloadLoading(true);
    setReferralWorkload([]);
    setReferralTargetId('');
    setRecommendedReferralId(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api(`/api/appointments/ic-counselor-workload?role=${role}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        const list: ReferralLoad[] = d.counselors || [];
        setReferralWorkload(list);
        const rec = d.recommended_id || null;
        setRecommendedReferralId(rec);
        if (rec) setReferralTargetId(rec);
      }
    } catch {}
    finally { setReferralWorkloadLoading(false); }
  };

  const generateExternalReferralLetter = () => {
    const student = caseData?.student || {};
    const studentName = student.name || caseData?.student_name || '—';
    const schoolId = student.school_id || '—';
    const college = student.college || '—';
    const course = student.course || '—';
    const yearLevel = student.year_level ? `${student.year_level} Year` : '';
    const counselorName = `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim() || caseData?.counselor_name || '—';
    const officeName = extReferralOffice === 'Other' ? extReferralCustomOffice : extReferralOffice;
    const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    const refNum = `CPS-${new Date().getFullYear()}-${(caseData?.case_number || Math.random().toString(36).slice(2, 6)).toString().toUpperCase()}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Referral Letter – ${studentName}</title>
<style>
  @page { size: letter portrait; margin: 0.85in 1in 1in; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, 'Helvetica Neue', sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.6; background: #fff; }

  .letterhead { border-bottom: 3px solid #004B8D; padding-bottom: 12px; margin-bottom: 22px; }
  .lh-dept { font-size: 12.5pt; font-weight: 700; color: #004B8D; text-transform: uppercase; letter-spacing: 0.5px; }
  .lh-univ { font-size: 10pt; color: #333; margin-top: 2px; }
  .lh-contact { font-size: 8.5pt; color: #777; margin-top: 3px; }

  .doc-meta { margin-bottom: 20px; font-size: 10.5pt; }
  .doc-meta table { border-collapse: collapse; }
  .doc-meta td { padding: 2px 0; vertical-align: top; }
  .doc-meta td:first-child { width: 120px; color: #555; }

  .memo-header { border: 1px solid #c5d8ed; border-radius: 4px; overflow: hidden; margin-bottom: 22px; }
  .memo-row { display: flex; padding: 8px 14px; font-size: 10.5pt; border-bottom: 1px solid #ddeaf5; }
  .memo-row:last-child { border-bottom: none; background: #f0f5fb; }
  .memo-label { width: 76px; font-weight: 700; color: #004B8D; flex-shrink: 0; letter-spacing: 0.3px; }
  .memo-value { color: #1a1a1a; }
  .memo-value strong { font-weight: 700; }

  .student-table { width: 100%; border-collapse: collapse; margin: 0 0 22px; font-size: 10pt; }
  .student-table caption { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #004B8D; text-align: left; caption-side: top; padding-bottom: 5px; }
  .student-table th, .student-table td { border: 1px solid #c5d8ed; padding: 6px 10px; text-align: left; }
  .student-table th { background: #f0f5fb; color: #555; font-weight: 600; width: 150px; font-size: 9.5pt; }
  .student-table td { color: #1a1a1a; font-weight: 500; }

  .body { font-size: 11pt; line-height: 1.72; margin-bottom: 14px; text-align: justify; }

  .section-head { font-size: 9.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #004B8D; margin: 20px 0 6px; padding-bottom: 3px; border-bottom: 1px solid #c5d8ed; }
  .indented { padding: 8px 12px; border-left: 3px solid #c5d8ed; background: #f8fafc; color: #333; font-size: 10.5pt; line-height: 1.65; margin-bottom: 14px; }

  .sig-block { margin-top: 32px; }
  .sig-line { margin-top: 48px; border-top: 1.5px solid #1a1a1a; display: inline-block; min-width: 230px; padding-top: 5px; }
  .sig-line strong { font-size: 11pt; display: block; }
  .sig-line span { font-size: 9.5pt; color: #555; display: block; line-height: 1.55; }

  .footer { margin-top: 36px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 8pt; color: #999; line-height: 1.55; }

  .toolbar { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #004B8D; color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 10px 28px; font-family: Arial, sans-serif; font-size: 13px; box-shadow: 0 2px 8px rgba(0,0,0,0.18); }
  .toolbar-title { font-weight: 600; opacity: 0.9; }
  .toolbar-btn { background: #fff; color: #004B8D; border: none; padding: 6px 18px; border-radius: 4px; font-size: 12.5px; font-weight: 700; cursor: pointer; letter-spacing: 0.2px; }
  .page-wrap { max-width: 7.5in; margin: 0 auto; padding: 68px 0.5in 0.5in; }
  @media print {
    .toolbar { display: none; }
    .page-wrap { max-width: none; margin: 0; padding: 0; }
  }
</style>
</head>
<body>

<div class="toolbar">
  <span class="toolbar-title">Referral Letter &mdash; ${studentName}</span>
  <button class="toolbar-btn" onclick="window.print()">Print / Save as PDF</button>
</div>

<div class="page-wrap">

  <div class="letterhead">
    <div class="lh-dept">Counseling and Psychological Services</div>
    <div class="lh-univ">De La Salle University &ndash; Manila</div>
    <div class="lh-contact">2401 Taft Avenue, Malate, Manila 1004 &nbsp;&middot;&nbsp; cps@dlsu.edu.ph</div>
  </div>

  <div class="doc-meta">
    <table>
      <tr><td>Date:</td><td>${today}</td></tr>
      <tr><td>Reference No.:</td><td>${refNum}</td></tr>
    </table>
  </div>

  <div class="memo-header">
    <div class="memo-row">
      <span class="memo-label">TO</span>
      <span class="memo-value">The Head / Designate, <strong>${officeName}</strong><br>De La Salle University &ndash; Manila</span>
    </div>
    <div class="memo-row">
      <span class="memo-label">FROM</span>
      <span class="memo-value"><strong>${counselorName}</strong><br>Counselor, Counseling and Psychological Services</span>
    </div>
    <div class="memo-row">
      <span class="memo-label">RE</span>
      <span class="memo-value"><strong>Student Referral</strong></span>
    </div>
  </div>

  <table class="student-table">
    <caption>Student Information</caption>
    <tr><th>Full Name</th><td>${studentName}</td></tr>
    ${schoolId !== '—' ? `<tr><th>ID Number</th><td>${schoolId}</td></tr>` : ''}
    ${college !== '—' ? `<tr><th>College</th><td>${college}</td></tr>` : ''}
    ${course !== '—' ? `<tr><th>Program / Course</th><td>${course}</td></tr>` : ''}
    ${yearLevel ? `<tr><th>Year Level</th><td>${yearLevel}</td></tr>` : ''}
  </table>

  <p class="body">This is to formally refer the above-named student to your office for appropriate assistance and support.</p>

  ${extReferralConcern.trim() ? `
  <div class="section-head">Nature of Concern</div>
  <div class="indented">${extReferralConcern.trim().replace(/\n/g, '<br>')}</div>` : ''}

  ${extReferralRequest.trim() ? `
  <div class="section-head">Specific Request / Recommendation</div>
  <div class="indented">${extReferralRequest.trim().replace(/\n/g, '<br>')}</div>` : ''}

  <p class="body">Your assistance and coordination on this matter are greatly appreciated. Should you require further information, please do not hesitate to contact the Counseling and Psychological Services at <em>cps@dlsu.edu.ph</em>.</p>

  <div class="sig-block">
    <p class="body">Respectfully,</p>
    <div class="sig-line">
      <strong>${counselorName}</strong>
      <span>Counselor</span>
      <span>Counseling and Psychological Services</span>
      <span>De La Salle University &ndash; Manila</span>
    </div>
  </div>

  <div class="footer">
    <strong>CONFIDENTIALITY NOTICE:</strong> This referral letter contains privileged and confidential information intended solely for the use of the addressee named above. Any unauthorized disclosure, copying, distribution, or action taken in reliance on its contents is strictly prohibited. If you have received this document in error, please notify the Counseling and Psychological Services immediately.
  </div>

</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  const handleReferToPs = async () => {
    if (!referralTargetId) return;
    setReferralSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api('/api/referrals/initiate'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referral_type: 'INTERNAL',
          case_id: caseId,
          assigned_to_user: referralTargetId,
          notes: referralReason,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setReferralMsg({ type: 'err', text: d.error || 'Failed to initiate referral.' }); return; }
      setReferralMsg({ type: 'ok', text: 'Referral to psychologist submitted successfully.' });
      setTimeout(() => { setShowReferralModal(false); setReferralMsg(null); }, 2000);
    } catch (e: any) {
      setReferralMsg({ type: 'err', text: e.message || 'Network error.' });
    } finally { setReferralSubmitting(false); }
  };

  const handleScheduleSession = async () => {
    setSchedulingSession(true); setScheduleMsg(null);
    try {
      const token = localStorage.getItem('token');
      const lastAppt = caseAppointments[0] || (await (await fetch(api(`/api/appointments?case_id=${caseId}&limit=1&status=COMPLETED`), { headers: { Authorization: `Bearer ${token}` } })).json())?.appointments?.[0];
      if (!lastAppt) { setScheduleMsg({ type: 'err', text: 'No completed appointment found for this case.' }); return; }
      const r = await fetch(api(`/api/appointments/${lastAppt._id}/set-follow-up`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: scheduleNotes, office: scheduleOffice }),
      });
      const d = await r.json();
      if (!r.ok) { setScheduleMsg({ type: 'err', text: d.error || 'Failed to notify student.' }); return; }
      setScheduleMsg({ type: 'ok', text: 'Student notified to pick a time from your available slots.' });
      await loadCaseAppointments();
      await loadSessionCount();
      setTimeout(() => { setShowScheduleModal(false); setScheduleNotes(''); setScheduleOffice(''); setScheduleMsg(null); }, 1800);
    } catch (e: any) {
      setScheduleMsg({ type: 'err', text: e.message || 'Network error.' });
    } finally { setSchedulingSession(false); }
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
      setActiveTab('clinical-record');
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
        loadPermaHistory(caseRes, true);
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
        const notes = (data.sessions || data.notes || []);
        notes.sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
        setSessionNotes(notes);
      }
    } catch (err) {
      console.error('Failed to load session notes:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'clinical-record') {
      loadSessionNotes();
      loadDiagnoses();
      if (!safetyPlanLoaded) loadSafetyPlan();
    }
    if (activeTab === 'wellbeing') {
      if (permaHistory.length === 0) loadPermaHistory();
      if (!schedulesLoaded) loadAssessmentSchedules();
      if (!historyLoaded) loadAssessmentHistory();
    }
    if (activeTab === 'intake' && !intakeSummaryLoaded) loadIntakeSummary();
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
    // Fetch case fresh to get intake_interview_form before mounting the wizard.
    // setIntakeSummaryLoaded(true) must fire AFTER intakeForm is set so initDraft()
    // in ICInterviewWizard receives the existing form on its first render.
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
          setIntakeSummaryLoaded(true);
          return;
        }
      }
    } catch {}
    // No saved form yet — start blank in edit mode
    setIntakeFormDraft({});
    setIntakeFormEditing(true);
    setIntakeSummaryLoaded(true);
  };

  const handleSaveIntakeForm = async () => {
    await handleSaveFromWizard(intakeFormDraft, true);
  };

  const handleSaveFromWizard = async (draft: any, _isFinal: boolean) => {
    if (!draft) return;
    setIntakeFormDraft(draft);
    setIntakeFormError('');
    setIntakeFormSaving(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/cases/${caseId}/intake-form`), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!r.ok) throw new Error('Failed to save intake form');
      setIntakeForm(draft);
      setCaseData((prev: any) => prev ? { ...prev, intake_interview_form: draft } : prev);
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

  const loadPermaHistory = async (caseDataOverride?: any, silent = false) => {
    const cd = caseDataOverride ?? caseData;
    if (!cd) return;
    const student = cd.student || {};
    const username = student.mhbot_username;
    if (!username) return;
    setPermaLoading(true);
    if (!silent) setMhbotError('');
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
      } else if (!silent) {
        setMhbotError('Failed to fetch PERMA history');
      }
    } catch {
      if (!silent) setMhbotError('Network error fetching PERMA data');
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

  const handleEditTriage = async () => {
    if (!intakeSummary?._id || !editTriageDecision) return;
    if (editTriageDecision === 'CLOSE_AT_INTAKE' && !editTriageNotes.trim()) {
      setEditTriageError('Closure notes are required when closing at intake.');
      return;
    }
    setSavingEditTriage(true);
    setEditTriageError('');
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/intake/${intakeSummary._id}/triage`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triage_decision: editTriageDecision,
          endorsement_notes: editTriageNotes,
          risk_override: editTriageRisk || undefined,
          phq9_responses: intakeSummary.phq9_responses || [],
          gad7_responses: intakeSummary.gad7_responses || [],
        }),
      });
      const d = await r.json();
      if (!r.ok) { setEditTriageError(d.error || 'Failed to update triage'); return; }
      setShowEditTriageModal(false);
      showSuccess('Triage decision updated.');
      setIntakeSummaryLoaded(false);
      await loadIntakeSummary();
    } catch (e: any) {
      setEditTriageError(e.message || 'Network error');
    } finally {
      setSavingEditTriage(false);
    }
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
      setActiveTab('history');
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

  const handleConfirmNoShowTermination = async () => {
    setConfirmingNoShowTerm(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api(`/api/cases/${caseId}/confirm-no-show-termination`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to confirm termination');
        return;
      }
      showSuccess('Case closed. Student has been notified.');
      const r2 = await fetch(api(`/api/cases/${caseId}`), { headers: { Authorization: `Bearer ${token}` } });
      if (r2.ok) setCaseData(await r2.json());
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setConfirmingNoShowTerm(false);
    }
  };

  const handleReopenCase = async () => {
    setReopeningCase(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api(`/api/cases/${caseId}/reopen`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Returning client — case reopened by staff.' }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to reopen case');
        return;
      }
      showSuccess('Case reopened. Student has been notified.');
      const r2 = await fetch(api(`/api/cases/${caseId}`), { headers: { Authorization: `Bearer ${token}` } });
      if (r2.ok) setCaseData(await r2.json());
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setReopeningCase(false);
    }
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
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      </DashboardPageWrapper>
    );
  }

  const isIC = currentUser?.role === 'IC';

  const tabs = [
    { id: 'overview' as const,        label: 'Overview' },
    { id: 'intake' as const,          label: 'Intake' },
    { id: 'clinical-record' as const, label: sessionNotes.length > 0 ? `Clinical Record (${sessionNotes.length})` : 'Clinical Record' },
    { id: 'wellbeing' as const,       label: 'Wellbeing' },
    { id: 'history' as const,         label: checkInHistory.length > 0 ? `History (${checkInHistory.length})` : 'History' },
  ];


  const studentName = caseData?.student?.name || caseData?.student_name || '—';
  const studentSchoolId = caseData?.student?.school_id || caseData?.student_id || '—';
  const studentEmail = caseData?.student?.email || '';
  const riskLevel = (caseData?.risk_level || 'GREEN').toUpperCase();

  return (
    <>
    <DashboardPageWrapper
      title="Case Details"
      subtitle={caseData?.case_number ? `Case ${caseData.case_number}` : studentName !== '—' ? studentName : ''}
    >
      {/* Back navigation + Print */}
      <div className="mb-4 flex items-center justify-between">
        <Link href="/cases" className="inline-flex items-center gap-1.5 text-sm transition"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}>
          <ArrowLeft size={15} /> Back to Cases
        </Link>
        {caseData && (
          <a
            href={`/cases/${params.id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <FileText size={13} /> Print Case Summary
          </a>
        )}
        {caseData && ['COUNSELOR', 'PSYCHOLOGIST', 'IC'].includes(currentUser?.role?.toUpperCase() || '') && (
          <button
            onClick={() => { setShowExtReferralModal(true); setExtReferralOffice(''); setExtReferralCustomOffice(''); setExtReferralConcern(''); setExtReferralRequest(''); }}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Download size={13} /> External Referral Letter
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 flex gap-3 rounded-lg p-4"
          style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
          <AlertCircle className="flex-shrink-0" size={18} style={{ color: 'var(--color-danger)' }} />
          <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-lg leading-none"
            style={{ color: 'var(--color-danger)' }}>×</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded text-sm"
          style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)', color: 'var(--color-success)' }}>
          {success}
        </div>
      )}

      {/* ── Student identity banner — always visible ─────────────── */}
      {caseData && (
        <div className="mb-5 rounded-2xl shadow-card px-5 py-4 flex flex-wrap items-center gap-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0"
            style={{ background: 'var(--color-primary)' }}>
            {studentName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-base font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>{studentName}</p>
              {caseData?.is_minor && <span className="flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>Minor</span>}
            </div>
            <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--color-text-secondary)' }}>{studentSchoolId}{studentEmail ? ` · ${studentEmail}` : ''}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex text-[11px] px-2.5 py-1 rounded-full font-medium" style={riskBadgeStyle(riskLevel)}>
              {riskLevel === 'GREEN' ? 'Low Risk' : riskLevel === 'YELLOW' ? 'Moderate' : riskLevel === 'RED' ? 'High Risk' : 'Critical'}
            </span>
            <span className="inline-flex text-[11px] px-2.5 py-1 rounded-full font-medium"
              style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)' }}>
              {(caseData.client_status || caseData.case_status || 'ACTIVE').replace(/_/g, ' ')}
            </span>
            {caseData.case_number && (
              <span className="text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}>{caseData.case_number}</span>
            )}
            {!['CLOSED', 'closed'].includes(caseData.case_status || caseData.client_status || '') && (
              <>
                <button
                  onClick={() => { setShowScheduleModal(true); setScheduleMsg(null); }}
                  className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium transition hover:opacity-80"
                  style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)', boxShadow: '0 0 0 1px var(--color-success)' }}
                >
                  <CalendarPlus size={11} /> Schedule Session
                </button>
                {sessionCount && sessionCount.completed > 0 && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                    style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)', boxShadow: '0 0 0 1px var(--color-border)' }}>
                    {sessionCount.completed} session{sessionCount.completed !== 1 ? 's' : ''} completed
                  </span>
                )}
                {currentUser?.role?.toUpperCase() === 'COUNSELOR' && (
                  <button
                    onClick={() => { setShowReferralModal(true); setReferralMsg(null); setReferralReason(''); setReferralRole('PSYCHOLOGIST'); loadReferralWorkload('PSYCHOLOGIST'); }}
                    className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium transition hover:opacity-80"
                    style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning)', boxShadow: '0 0 0 1px var(--color-warning)' }}
                  >
                    <UserPlus size={11} /> Internal Referral
                  </button>
                )}
                <button
                  onClick={() => { setClosureChecks({ notes: false, referrals: false, notified: false }); setShowClosureChecklist(true); }}
                  className="text-[11px] px-2.5 py-1 rounded-full font-medium transition hover:opacity-80"
                  style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger)', boxShadow: '0 0 0 1px var(--color-danger)' }}
                >
                  Close Case
                </button>
              </>
            )}
            {['CLOSED', 'closed', 'CANCELLED', 'cancelled'].includes(caseData.case_status || caseData.client_status || '') &&
              ['IC', 'COUNSELOR', 'PSYCHOLOGIST', 'CASE_MANAGER', 'ADMIN', 'DPO'].includes(currentUser?.role || '') && (
              <button
                onClick={handleReopenCase}
                disabled={reopeningCase}
                className="text-[11px] px-2.5 py-1 rounded-full font-medium transition hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)', boxShadow: '0 0 0 1px var(--color-success)' }}
              >
                {reopeningCase ? 'Reopening…' : 'Reopen Case'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── 3 Consecutive No-Show Banner ──────────────────────────────────── */}
      {caseData?.case_status === 'PENDING_TERMINATION' && caseData?.termination_type === 'ADMINISTRATIVE' && (
        <div className="mb-4 flex items-start gap-3 rounded-xl px-4 py-3.5"
          style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-danger)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-danger)' }}>
              3 Consecutive No-Shows — Administrative Termination Required
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-danger)' }}>
              This student has missed {caseData.consecutive_no_shows ?? 3} consecutive sessions.
              Per CPS protocol, please review and confirm case closure. The student will be notified automatically.
            </p>
          </div>
          <button
            onClick={handleConfirmNoShowTermination}
            disabled={confirmingNoShowTerm}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition disabled:opacity-50 hover:opacity-90"
            style={{ background: 'var(--color-danger)' }}
          >
            {confirmingNoShowTerm && <Loader2 size={12} className="animate-spin" />}
            Confirm Termination
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-0.5 border-b overflow-x-auto" style={{ borderColor: 'var(--color-border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition"
            style={activeTab === tab.id
              ? { color: 'var(--color-primary)', borderBottomColor: 'var(--color-primary)' }
              : { color: 'var(--color-text-secondary)', borderBottomColor: 'transparent' }}
            onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.color = 'var(--color-text-primary)'; }}
            onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────────── */}
      {activeTab === 'overview' && caseData && (
        <div className="space-y-6">

          {/* Trend drop warning banner */}
          {permaTrendDrop && (
            <div className="flex items-start gap-2 rounded-xl px-4 py-3"
              style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' }}>
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-warning)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-warning)' }}>Wellbeing decline detected</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-warning)' }}>Recent EMA history shows a significant drop: <strong>{permaTrendDrop}</strong>. Consider earlier follow-up.</p>
              </div>
            </div>
          )}

          <div className="rounded-2xl shadow-card p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Case Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p style={{ color: 'var(--color-text-secondary)' }}>Student ID</p>
                <p className="font-medium mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{caseData.student_id}</p>
              </div>
              <div>
                <p style={{ color: 'var(--color-text-secondary)' }}>Client Status</p>
                <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)' }}>
                  {caseData.client_status || 'N/A'}
                </span>
              </div>
              <div>
                <p style={{ color: 'var(--color-text-secondary)' }}>Risk Level</p>
                <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={riskBadgeStyle(caseData.risk_level || 'GREEN')}>
                  {caseData.risk_level || 'GREEN'}
                </span>
              </div>
              <div>
                <p style={{ color: 'var(--color-text-secondary)' }}>Created</p>
                <p className="font-medium mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                  {caseData.created_at ? new Date(caseData.created_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }) : 'N/A'}
                </p>
              </div>
              {sessionCount != null && (
                <div>
                  <p style={{ color: 'var(--color-text-secondary)' }}>Sessions</p>
                  <p className="font-medium mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                    {sessionCount.completed}
                  </p>
                </div>
              )}
              {caseData.transaction_type && (
                <div>
                  <p style={{ color: 'var(--color-text-secondary)' }}>Transaction Type</p>
                  <p className="font-medium mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{caseData.transaction_type}</p>
                </div>
              )}
            </div>
          </div>

          {/* IC Referral card — shown whenever endorsement data is present */}
          {(caseData.endorsed_to_role || caseData.counselor_name || caseData.intake_counselor_name) && (
            <div className="rounded-2xl shadow-card p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Intake Referral</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {caseData.intake_counselor_name && (
                  <div>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Conducted by (IC)</p>
                    <p className="font-medium mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{caseData.intake_counselor_name}</p>
                  </div>
                )}
                {caseData.endorsed_to_role && (
                  <div>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Referred to</p>
                    <p className="font-medium mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                      {caseData.endorsed_to_role === 'COUNSELOR' ? 'Counselor (CC)' :
                       caseData.endorsed_to_role === 'PSYCHOLOGIST' ? 'Psychologist (CP)' :
                       caseData.endorsed_to_role}
                    </p>
                  </div>
                )}
                {caseData.endorsed_to_role && (
                  <div>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Assigned Counselor</p>
                    {caseData.counselor_name ? (
                      <p className="font-medium mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{caseData.counselor_name}</p>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)' }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--color-warning)' }} />
                        Awaiting assignment from pool
                      </span>
                    )}
                  </div>
                )}
                {caseData.endorsed_at && (
                  <div>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Endorsed on</p>
                    <p className="font-medium mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                      {new Date(caseData.endorsed_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                )}
                {caseData.endorsement_notes && (
                  <div className="md:col-span-2">
                    <p style={{ color: 'var(--color-text-secondary)' }}>IC Notes</p>
                    <p className="mt-0.5 whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>{caseData.endorsement_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {caseAppointments.length > 0 && (
            <div className="rounded-2xl shadow-card p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Active Appointments</h3>
              <div className="space-y-3">
                {caseAppointments.map((appt) => {
                  const dateStr = appt.scheduled_at || appt.preferred_date;
                  const displayDate = dateStr
                    ? new Date(dateStr).toLocaleString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                    : 'No date set';
                  return (
                    <div key={appt._id} className="flex items-center justify-between gap-4 p-3 rounded-lg"
                      style={{ background: 'var(--color-bg)' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{displayDate}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                          {appt.reference_id && <span className="mr-2">{appt.reference_id}</span>}
                          <span className="capitalize">{appt.status.toLowerCase().replace(/_/g, ' ')}</span>
                        </p>
                      </div>
                      {['CONFIRMED', 'MATCHED', 'CHECKED_IN'].includes(appt.status) && (
                        <button
                          onClick={() => handleCompleteAndDocument(appt._id)}
                          disabled={completingAppt === appt._id}
                          className="flex-shrink-0 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition disabled:opacity-50 hover:opacity-90"
                          style={{ background: 'var(--color-primary)' }}
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

          <div className="rounded-2xl shadow-card p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Update Client Status</h3>
            <select
              value={caseData.client_status || 'ACTIVE'}
              onChange={(e) => handleUpdateStatus(e.target.value)}
              disabled={intakeLoading}
              className={IC}
              style={{ ...ICS, maxWidth: 320 }}
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
            <div className="rounded-2xl shadow-card p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Presenting Issue</h3>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{caseData.presenting_issue}</p>
            </div>
          )}

          {/* Feature 5: Wellbeing Outcome Tracking */}
          {caseData.initial_perma_label && (
            <div className="mt-4 p-4 rounded-2xl shadow-card" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-muted)' }}>Wellbeing Outcome</p>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>At intake</p>
                  <PermaBadge label={caseData.initial_perma_label} />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-lg" style={{ color: 'var(--color-border)' }}>→</div>
                </div>
                <div className="text-center">
                  <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Current</p>
                  <PermaBadge label={permaHistory[0]?.perma_label ?? null} />
                </div>
                {permaHistory[0]?.perma_label && caseData.initial_perma_label && (() => {
                  const SCORE: Record<string, number> = { 'Excelling': 5, 'Thriving': 4, 'Surviving': 3, 'Struggling': 2, 'In Crisis': 1 };
                  const delta = (SCORE[permaHistory[0].perma_label!] ?? 0) - (SCORE[caseData.initial_perma_label] ?? 0);
                  if (delta === 0) return null;
                  return (
                    <span className="text-xs font-bold px-2 py-1 rounded-full"
                      style={delta > 0
                        ? { background: 'var(--color-success-surface)', color: 'var(--color-success)' }
                        : { background: 'var(--color-danger-surface)',  color: 'var(--color-danger)'  }}>
                      {delta > 0 ? `↑ +${delta}` : `↓ ${delta}`} levels
                    </span>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Intake Tab ────────────────────────────────── */}
      {activeTab === 'intake' && (
        <div className="space-y-4">
          {!intakeSummaryLoaded && (
            <div className="flex items-center justify-center p-12">
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
            </div>
          )}
          {intakeSummaryLoaded && !intakeSummary && (
            <div className="rounded-2xl shadow-card p-12 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <FileText size={32} className="mx-auto mb-3" style={{ color: 'var(--color-border)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>No intake record found for this case.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>The intake may not have been completed yet.</p>
            </div>
          )}
          {intakeSummary && (() => {
            const icInterviewForm = caseData?.intake_interview_form;
            const phq9 = icInterviewForm?.phq9_score ?? intakeSummary.phq9_score;
            const gad7 = icInterviewForm?.gad7_score ?? intakeSummary.gad7_score;
            const decision = intakeSummary.triage_decision;
            const risk = (intakeSummary.risk_level || 'GREEN').toUpperCase();

            const RISK_CONFIG: Record<string, { bar: string; badgeStyle: React.CSSProperties; label: string }> = {
              GREEN:    { bar: '#10b981', badgeStyle: { background: 'var(--color-success-surface)', color: 'var(--color-success)', boxShadow: '0 0 0 1px var(--color-success)' }, label: 'Low Risk'      },
              YELLOW:   { bar: '#f59e0b', badgeStyle: { background: 'var(--color-warning-surface)', color: 'var(--color-warning)', boxShadow: '0 0 0 1px var(--color-warning)' }, label: 'Moderate Risk' },
              RED:      { bar: '#ef4444', badgeStyle: { background: 'var(--color-danger-surface)',  color: 'var(--color-danger)',  boxShadow: '0 0 0 1px var(--color-danger)'  }, label: 'High Risk'     },
              CRITICAL: { bar: '#b91c1c', badgeStyle: { background: 'var(--color-danger-surface)',  color: 'var(--color-danger)',  boxShadow: '0 0 0 1px var(--color-danger)', fontWeight: 700 }, label: 'Critical Risk' },
            };
            const riskCfg = RISK_CONFIG[risk] ?? RISK_CONFIG['GREEN'];

            const phq9Sev   = phq9 == null ? null : phq9 <= 4 ? { l: 'Minimal',           c: '#10b981' }
                            : phq9 <= 9    ? { l: 'Mild',               c: '#d97706'   }
                            : phq9 <= 14   ? { l: 'Moderate',           c: '#ea580c'  }
                            : phq9 <= 19   ? { l: 'Moderately Severe',  c: '#dc2626'     }
                            :                { l: 'Severe',             c: '#b91c1c'     };
            const gad7Sev   = gad7 == null ? null : gad7 <= 4 ? { l: 'Minimal',   c: '#10b981' }
                            : gad7 <= 9    ? { l: 'Mild',       c: '#d97706'   }
                            : gad7 <= 14   ? { l: 'Moderate',   c: '#ea580c'  }
                            :                { l: 'Severe',     c: '#dc2626'     };

            const DECISION_CONFIG: Record<string, { label: string; sub: string; bgStyle: React.CSSProperties; dotColor: string }> = {
              ENDORSE_CC:      { label: 'Endorsed to Counselor',    sub: 'CC', bgStyle: { border: '2px solid var(--color-primary)', background: 'var(--color-primary-surface)' }, dotColor: 'var(--color-primary)' },
              ENDORSE_CP:      { label: 'Endorsed to Psychologist', sub: 'CP', bgStyle: { border: '2px solid #7c3aed', background: '#F5F3FF' }, dotColor: '#7c3aed' },
              CLOSE_AT_INTAKE: { label: 'Closed at Intake',         sub: '',   bgStyle: { border: '2px solid var(--color-border)', background: 'var(--color-bg)' }, dotColor: 'var(--color-text-muted)' },
            };
            const decisionCfg = DECISION_CONFIG[decision] ?? null;

            const icf  = intakePacket?.icf  || {};
            const spif = intakePacket?.spif || {};
            const phq4r = intakePacket?.phq4_responses || [];
            const phq2Score = phq4r.length >= 2 ? phq4r[0] + phq4r[1] : null;
            const gad2Score = phq4r.length >= 4 ? phq4r[2] + phq4r[3] : null;

            const fmtDt = (s: string) => {
              try { return new Date(s).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }); }
              catch { return s; }
            };

            const ScoreBar = ({ value, max, thresholds }: { value: number | null; max: number; thresholds: number[] }) => {
              if (value == null) return <div className="h-2 rounded-full w-full" style={{ background: 'var(--color-border)' }} />;
              const pct = Math.min(100, (value / max) * 100);
              const zone = thresholds.filter(t => value > t).length;
              const barColors = ['#10b981', '#d97706', '#ea580c', '#ef4444', '#b91c1c'];
              return (
                <div className="h-2 rounded-full w-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColors[zone] }} />
                </div>
              );
            };

            return (
              <>
                {/* ── Top bar: export + metadata ── */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <span>{intakeSummary.source === 'walkin' ? 'Walk-in intake' : 'Online booking'}</span>
                    {intakeSummary.triaged_at && (
                      <><span>·</span><span>Triaged {fmtDt(intakeSummary.triaged_at)}</span></>
                    )}
                  </div>
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-2xl shadow-sm font-medium transition"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                  >
                    <Download size={12} /> Export PDF
                  </button>
                </div>

                {/* ── Triage outcome card ── */}
                {decisionCfg ? (
                  <div className="rounded-xl p-5" style={decisionCfg.bgStyle}>
                    <div className="flex items-start gap-4">
                      <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: decisionCfg.dotColor }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Triage Decision</p>
                          {decisionCfg.sub && (
                            <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                              style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>{decisionCfg.sub}</span>
                          )}
                        </div>
                        <p className="text-base font-bold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{decisionCfg.label}</p>
                        {intakeSummary.endorsement_notes && (
                          <p className="text-sm mt-2 leading-relaxed pt-2" style={{ color: 'var(--color-text-secondary)', borderTop: '1px solid rgba(0,0,0,.05)' }}>{intakeSummary.endorsement_notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={riskCfg.badgeStyle}>{riskCfg.label}</span>
                        {['IC', 'ADMIN', 'DPO', 'PSYCHOLOGIST'].includes(currentUser?.role || '') && (
                          <button
                            onClick={() => {
                              setEditTriageDecision(decision || '');
                              setEditTriageRisk(intakeSummary.risk_level || '');
                              setEditTriageNotes(intakeSummary.endorsement_notes || '');
                              setEditTriageError('');
                              setShowEditTriageModal(true);
                            }}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition"
                            style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                          >
                            <Pencil size={11} /> Edit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl p-4 text-center text-xs" style={{ border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)' }}>
                    Triage not yet completed
                  </div>
                )}

                {/* ── Clinical scores ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* PHQ-9 */}
                  <div className="rounded-2xl shadow-card p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>PHQ-9</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Depression</p>
                      </div>
                      {phq9 != null ? (
                        <div className="text-right">
                          <span className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{phq9}</span>
                          <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>/ 27</span>
                        </div>
                      ) : <span className="text-sm" style={{ color: 'var(--color-border)' }}>Not administered</span>}
                    </div>
                    <ScoreBar value={phq9} max={27} thresholds={[4, 9, 14, 19]} />
                    {phq9Sev && <p className="text-xs font-semibold mt-1.5" style={{ color: phq9Sev.c }}>{phq9Sev.l}</p>}
                    {phq9 == null && <div className="h-5" />}
                  </div>

                  {/* GAD-7 */}
                  <div className="rounded-2xl shadow-card p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>GAD-7</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Anxiety</p>
                      </div>
                      {gad7 != null ? (
                        <div className="text-right">
                          <span className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{gad7}</span>
                          <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>/ 21</span>
                        </div>
                      ) : <span className="text-sm" style={{ color: 'var(--color-border)' }}>Not administered</span>}
                    </div>
                    <ScoreBar value={gad7} max={21} thresholds={[4, 9, 14]} />
                    {gad7Sev && <p className="text-xs font-semibold mt-1.5" style={{ color: gad7Sev.c }}>{gad7Sev.l}</p>}
                    {gad7 == null && <div className="h-5" />}
                  </div>
                </div>

                {/* PHQ-4 pre-screen */}
                {phq4r.length >= 4 && (() => {
                  const totalPhq4 = phq2Score != null && gad2Score != null ? phq2Score + gad2Score : null;
                  const phq4Sev = totalPhq4 == null ? null
                    : totalPhq4 <= 2 ? { label: 'None',     color: '#10b981' }
                    : totalPhq4 <= 5 ? { label: 'Mild',     color: '#d97706' }
                    : totalPhq4 <= 8 ? { label: 'Moderate', color: '#ea580c' }
                    :                  { label: 'Severe',   color: '#dc2626' };
                  return (
                    <div className="rounded-2xl shadow-card p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>PHQ-4 Pre-Screen</p>
                        {phq4Sev && (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                            style={{ background: `${phq4Sev.color}18`, color: phq4Sev.color }}>
                            {phq4Sev.label}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'PHQ-2', score: phq2Score, max: 6, threshold: 3, name: 'Depression screen' },
                          { label: 'GAD-2', score: gad2Score, max: 6, threshold: 3, name: 'Anxiety screen'    },
                          { label: 'Total', score: totalPhq4, max: 12, threshold: 6, name: 'Combined'          },
                        ].map(({ label, score, max, threshold, name }) => (
                          <div key={label} className="text-center">
                            <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{name}</p>
                            <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
                            <p className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{score ?? '—'}<span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>/{max}</span></p>
                            {score != null && (
                              <span className="text-xs font-semibold mt-0.5 inline-block"
                                style={{ color: score >= threshold ? '#ef4444' : '#10b981' }}>
                                {score >= threshold ? '⚑ Positive' : '✓ Negative'}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Presenting concern */}
                {(icf.presenting_concern || intakeSummary.concern) && (
                  <div className="rounded-2xl shadow-card p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Presenting Concern</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{icf.presenting_concern || intakeSummary.concern}</p>
                    {icf.service_requested && (
                      <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Service requested:</span>
                        <span className="text-xs font-medium capitalize" style={{ color: 'var(--color-text-primary)' }}>{icf.service_requested.replace(/_/g, ' ')}</span>
                        {icf.referral_source && (
                          <><span style={{ color: 'var(--color-border)' }}>·</span>
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>via <span className="capitalize" style={{ color: 'var(--color-text-secondary)' }}>{icf.referral_source.replace(/-/g, ' ')}</span></span></>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ICF + SPIF combined student background */}
                {(Object.keys(icf).length > 0 || Object.keys(spif).length > 0) && (
                  <div className="rounded-2xl shadow-card overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Student Background</p>
                    </div>
                    <div className="p-5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                        {[
                          { label: 'College / Unit',       val: icf.college },
                          { label: 'Program',              val: icf.program ?? icf.degree_program },
                          { label: 'Year Level',           val: icf.year_level },
                          { label: 'Gender',               val: spif.gender },
                          { label: 'Birthdate',            val: spif.birthdate ? new Date(spif.birthdate).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }) : null },
                          { label: 'Living With',          val: spif.living_with },
                          { label: 'Family Composition',   val: spif.family_composition },
                          { label: 'Birth Order',          val: spif.birth_order ? `${spif.birth_order} of ${spif.number_of_siblings ?? '?'}` : null },
                          { label: 'Prior Consultation',   val: icf.has_previous_consultation != null ? (icf.has_previous_consultation ? 'Yes' : 'No') : (spif.previous_counseling != null ? (spif.previous_counseling ? 'Yes' : 'No') : null) },
                          { label: 'Referral Source',      val: icf.referral_source?.replace(/-/g, ' ') },
                          { label: 'Nationality',          val: spif.nationality },
                        ].filter(f => f.val).map(({ label, val: v }) => (
                          <div key={label}>
                            <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
                            <p className="text-sm capitalize" style={{ color: 'var(--color-text-primary)' }}>{String(v)}</p>
                          </div>
                        ))}
                      </div>

                      {[
                        { label: 'Current Address',            val: spif.address },
                        { label: 'Medical Conditions',         val: spif.existing_medical_conditions ?? icf.medication_history },
                        { label: 'Current Medications',        val: spif.current_medications },
                        { label: 'Previous Counseling Details',val: spif.previous_counseling_details ?? icf.family_background },
                        { label: 'Emergency Contact',          val: icf.emergency_contact_name ? `${icf.emergency_contact_name} (${icf.emergency_contact_relationship ?? '—'}) · ${icf.emergency_contact_phone ?? '—'}` : null },
                      ].filter(f => f.val).map(({ label, val: v }) => (
                        <div key={label} className="mt-4 pt-4 first:mt-3 first:pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{String(v)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* ── IC Interview Documentation ─────────────────────── */}
          {intakeSummaryLoaded && (() => {
            const rawDate = caseData?.appointment_info?.date || caseData?.appointment_date || caseData?.scheduled_start;
            const rawMode = caseData?.appointment_info?.method || caseData?.method || caseData?.appointment_method;
            const modeMap: Record<string, string> = {
              'in-person': 'F2F', 'in_person': 'F2F', 'face_to_face': 'F2F', 'f2f': 'F2F',
              'zoom': 'Zoom', 'google_meet': 'Google Meet', 'google-meet': 'Google Meet',
              'online': 'Online', 'telehealth': 'Telehealth',
            };
            const displayMode = rawMode ? (modeMap[rawMode.toLowerCase()] || rawMode) : undefined;
            const sessionInfo = rawDate ? {
              date: new Date(rawDate).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric' }),
              time: new Date(rawDate).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' }),
              mode: displayMode,
              studentId: caseData?.student?.school_id || caseData?.student_id,
              college: caseData?.student?.college || caseData?.student?.course || caseData?.student?.program,
            } : undefined;
            return (
              <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
                <ICInterviewWizard
                  caseId={caseId}
                  sessionInfo={sessionInfo}
                  existingForm={intakeForm || undefined}
                  updatedAt={caseData?.intake_form_updated_at}
                  saving={intakeFormSaving}
                  saveError={intakeFormError}
                  saveSuccess={intakeFormSuccess}
                  onSave={handleSaveFromWizard}
                />
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Clinical Record Tab: Session Notes ─────────────────── */}
      {activeTab === 'clinical-record' && (() => {
        const toggleNote = (id: string) => setExpandedNotes(prev => {
          const next = new Set(prev);
          next.has(id) ? next.delete(id) : next.add(id);
          return next;
        });

        const typeLabel: Record<string, string> = {
          INDIVIDUAL: 'Individual', CRISIS: 'Crisis', FOLLOW_UP: 'Follow-up', INTAKE: 'Intake',
        };
        const SEVERITY_COLOR: Record<string, string> = {
          MILD: '#ca8a04', MODERATE: '#ea580c', SEVERE: '#dc2626',
        };
        const moodBar = (r: number) => {
          const pct = (r / 10) * 100;
          const color = r <= 3 ? 'var(--color-danger)' : r <= 6 ? 'var(--color-warning)' : 'var(--color-success)';
          return (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
                <div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full transition-all" />
              </div>
              <span className="text-xs font-semibold tabular-nums" style={{ color }}>{r}/10</span>
            </div>
          );
        };

        const soapSections = [
          { key: 'S', label: 'Subjective', color: 'var(--color-primary)', itemStyle: { background: 'var(--color-primary-surface)', color: 'var(--color-primary)' } as React.CSSProperties },
          { key: 'O', label: 'Objective',  color: '#7c3aed',              itemStyle: { background: '#F5F3FF', color: '#7C3AED' } as React.CSSProperties },
          { key: 'A', label: 'Assessment', color: '#d97706',              itemStyle: { background: '#FEF3C7', color: '#d97706' } as React.CSSProperties },
          { key: 'P', label: 'Plan',       color: '#059669',              itemStyle: { background: '#ECFDF5', color: '#059669' } as React.CSSProperties },
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
                <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Session Notes</h3>
                {sessionNotes.length > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {sessionNotes.length} session{sessionNotes.length !== 1 ? 's' : ''}
                    {avgMood && ` · avg mood ${avgMood}/10`}
                    {riskCount > 0 && ` · `}
                    {riskCount > 0 && <span className="font-medium" style={{ color: 'var(--color-danger)' }}>{riskCount} risk flag{riskCount !== 1 ? 's' : ''}</span>}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowNoteForm(!showNoteForm)}
                className="flex items-center gap-1.5 text-white px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}
              >
                <Plus size={14} /> {showNoteForm ? 'Cancel' : 'Add Note'}
              </button>
            </div>

            {/* ── Mood Trend Chart ── */}
            {sessionNotes.filter(n => n.mood_rating).length >= 2 && (() => {
              const moodChartData = [...sessionNotes]
                .filter(n => n.mood_rating)
                .reverse()
                .map((n, i) => ({
                  label: `S${i + 1}`,
                  mood: n.mood_rating as number,
                  risk: n.risk_flagged,
                }));
              return (
                <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>Mood Trend Across Sessions</p>
                  <ResponsiveContainer width="100%" height={90}>
                    <AreaChart data={moodChartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                      <defs>
                        <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 10]} ticks={[0, 5, 10]} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px', color: 'var(--color-text-primary)' }}
                        formatter={(v: any) => [`${v}/10`, 'Mood']}
                      />
                      <ReferenceLine y={5} stroke="var(--color-border)" strokeDasharray="4 2" />
                      <Area
                        type="monotone" dataKey="mood"
                        stroke="var(--color-primary)" fill="url(#moodGrad)" strokeWidth={2}
                        dot={(p: any) => p.payload.risk
                          ? <circle key={p.key} cx={p.cx} cy={p.cy} r={4} fill="var(--color-danger)" stroke="#fff" strokeWidth={1.5} />
                          : <circle key={p.key} cx={p.cx} cy={p.cy} r={3} fill="var(--color-primary)" strokeWidth={0} />}
                        activeDot={{ r: 4 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Red dots indicate sessions where a risk concern was flagged.
                  </p>
                </div>
              );
            })()}

            {/* ── Add Note Form ── */}
            {showNoteForm && (
              <div className="rounded-2xl shadow-card overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>New Session Note</p>
                  <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: 'var(--color-border)' }}>
                    {(['SOAP', 'freeform'] as const).map(fmt => (
                      <button key={fmt} type="button"
                        onClick={() => setNoteForm({ ...noteForm, note_format: fmt })}
                        className="px-3 py-1 text-xs font-medium rounded-md transition"
                        style={noteForm.note_format === fmt
                          ? { background: 'var(--color-surface)', color: 'var(--color-primary)', boxShadow: '0 1px 3px rgba(0,0,0,.1)' }
                          : { color: 'var(--color-text-muted)' }}
                      >
                        {fmt === 'SOAP' ? 'SOAP' : 'Freeform'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Date & Time</label>
                      <input type="datetime-local" value={noteForm.session_date}
                        onChange={(e) => setNoteForm({ ...noteForm, session_date: e.target.value })}
                        className={IC_XS} style={ICS} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Session Type</label>
                      <select value={noteForm.session_type}
                        onChange={(e) => setNoteForm({ ...noteForm, session_type: e.target.value })}
                        className={IC_XS} style={ICS}>
                        <option value="INDIVIDUAL">Individual</option>
                        <option value="CRISIS">Crisis</option>
                        <option value="FOLLOW_UP">Follow-up</option>
                        <option value="INTAKE">Intake</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Mood (1–10)</label>
                      <input type="number" min="1" max="10" value={noteForm.mood_rating}
                        onChange={(e) => setNoteForm({ ...noteForm, mood_rating: Number(e.target.value) })}
                        className={IC_XS} style={ICS} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Severity</label>
                      <select value={noteForm.symptom_severity}
                        onChange={(e) => setNoteForm({ ...noteForm, symptom_severity: e.target.value })}
                        className={IC_XS} style={ICS}>
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
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                            {field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </label>
                          <textarea value={noteForm[field] as string}
                            onChange={(e) => setNoteForm({ ...noteForm, [field]: e.target.value })}
                            rows={2} className={IC_XS + ' resize-none'} style={ICS} />
                        </div>
                      ))}
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Homework / Tasks</label>
                        <input type="text" value={noteForm.homework_assigned}
                          onChange={(e) => setNoteForm({ ...noteForm, homework_assigned: e.target.value })}
                          className={IC_XS} style={ICS} />
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <input type="checkbox" checked={noteForm.risk_flagged}
                      onChange={(e) => setNoteForm({ ...noteForm, risk_flagged: e.target.checked })}
                      className="rounded" />
                    <span className="text-xs font-medium" style={{ color: 'var(--color-danger)' }}>Flag as Risk Concern</span>
                  </label>
                  {noteForm.risk_flagged && (
                    <textarea value={noteForm.risk_notes}
                      onChange={(e) => setNoteForm({ ...noteForm, risk_notes: e.target.value })}
                      rows={2} placeholder="Describe the risk concern…"
                      className={IC_XS + ' resize-none'}
                      style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-text-primary)' }} />
                  )}
                </div>
                <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                  <button onClick={handleSaveNote} disabled={savingNote}
                    className="text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition hover:opacity-90"
                    style={{ background: 'var(--color-primary)' }}>
                    {savingNote ? 'Saving…' : 'Save Note'}
                  </button>
                  <button onClick={() => setShowNoteForm(false)}
                    className="px-4 py-2 rounded-lg text-sm transition"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ── Notes list ── */}
            {sessionNotes.length === 0 ? (
              <div className="rounded-2xl shadow-card p-12 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <FileText size={28} className="mx-auto mb-3" style={{ color: 'var(--color-border)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>No session notes yet</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Click "Add Note" to document the first session.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessionNotes.map((note, idx) => {
                  const num = idx + 1;
                  const isExpanded = expandedNotes.has(note.note_id);
                  const stype = note.session_type || 'INDIVIDUAL';
                  const isRisk = note.risk_flagged;
                  const accentColor = isRisk ? 'var(--color-danger)'
                    : stype === 'CRISIS' ? 'var(--color-danger)'
                    : stype === 'FOLLOW_UP' ? '#7c3aed'
                    : stype === 'INTAKE' ? '#0d9488'
                    : 'var(--color-primary)';
                  const approvalStatus = note.supervisor_approved === true ? 'approved'
                    : (note.supervisor_approved === false && note.supervisor_name) ? 'rejected'
                    : (note.supervisor_approved === false && !note.supervisor_name) ? 'pending'
                    : null;

                  const fmtDate = (d: string) => {
                    try {
                      const dt = new Date(d);
                      return dt.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })
                        + ' · ' + dt.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true });
                    } catch { return d; }
                  };

                  const canEdit = ['COUNSELOR','PSYCHOLOGIST','IC','CASE_MANAGER'].includes(currentUser?.role || '');
                  const isEditingThis = editingNoteId === note.note_id;

                  return (
                    <div key={note.note_id}
                      className="rounded-xl shadow-card overflow-hidden"
                      style={{ background: note.is_deleted ? 'var(--color-danger-surface)' : 'var(--color-surface)', border: `1px solid ${note.is_deleted ? 'rgba(220,38,38,0.3)' : 'var(--color-border)'}`, borderLeft: `3px solid ${note.is_deleted ? 'var(--color-danger)' : accentColor}`, opacity: note.is_deleted ? 0.8 : 1 }}>

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
                                <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                  {note.session_date ? fmtDate(note.session_date) : 'Date not set'}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={noteTypeStyle(stype)}>
                                  {typeLabel[stype] || stype}
                                </span>
                                {note.note_format === 'SOAP' && (
                                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>SOAP</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                {note.counselor && (
                                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{note.counselor}</span>
                                )}
                                {note.mood_rating ? (
                                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Mood <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{note.mood_rating}/10</span></span>
                                ) : null}
                                {note.symptom_severity && note.symptom_severity !== 'NONE' && (
                                  <span className="text-xs font-medium" style={{ color: SEVERITY_COLOR[note.symptom_severity] }}>{note.symptom_severity}</span>
                                )}
                                {isRisk && (
                                  <span className="text-xs font-semibold" style={{ color: 'var(--color-danger)' }}>⚠ Risk flagged</span>
                                )}
                              </div>
                            </div>
                          </button>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {note.is_deleted && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                                style={{ background: 'rgba(220,38,38,0.15)', color: 'var(--color-danger)' }}>
                                ✕ Deleted{note.deleted_by_name ? ` by ${note.deleted_by_name}` : ''}
                              </span>
                            )}
                            {!note.is_deleted && approvalStatus === 'approved' && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)' }}>✓ Approved</span>
                            )}
                            {!note.is_deleted && approvalStatus === 'rejected' && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger)' }}>✗ Rejected</span>
                            )}
                            {!note.is_deleted && approvalStatus === 'pending' && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning)' }}>Pending review</span>
                            )}
                            {canEdit && !note.is_deleted && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); if (isEditingThis) { setEditingNoteId(null); } else { setEditingNoteId(note.note_id); setEditNoteForm({ topics_discussed: note.topics_discussed || '', interventions: note.interventions || '', client_response: note.client_response || '', homework_assigned: note.homework_assigned || '', mood_rating: note.mood_rating || 5, risk_flagged: note.risk_flagged || false, risk_notes: note.risk_notes || '', change_reason: '' }); setExpandedNotes(prev => { const n = new Set(prev); n.add(note.note_id); return n; }); } }}
                                  className="p-1.5 rounded-lg transition"
                                  style={isEditingThis ? { background: 'var(--color-primary-surface)', color: 'var(--color-primary)' } : { color: 'var(--color-text-muted)' }}
                                  onMouseEnter={e => { if (!isEditingThis) { e.currentTarget.style.background = 'var(--color-bg)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}}
                                  onMouseLeave={e => { if (!isEditingThis) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}}
                                  aria-label={isEditingThis ? 'Cancel edit' : 'Edit note'}
                                  title={isEditingThis ? 'Cancel edit' : 'Edit note'}
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.note_id); }}
                                  className="p-1.5 rounded-lg transition"
                                  style={{ color: 'var(--color-text-muted)' }}
                                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-danger)'; e.currentTarget.style.background = 'var(--color-danger-surface)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                                  aria-label="Delete note"
                                  title="Delete note"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                            <button onClick={() => toggleNote(note.note_id)} className="p-1.5 rounded-lg transition"
                              style={{ color: 'var(--color-text-muted)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
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
                        <div style={{ borderTop: '1px solid var(--color-border)' }}>
                          {/* SOAP structured */}
                          {note.note_format === 'SOAP' && note.structured_soap && (
                            <div className="p-5 space-y-4">
                              {note.structured_soap.counseling_goal && (
                                <div className="px-3 py-2 rounded-lg" style={{ background: 'var(--color-bg)' }}>
                                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Session Goal</p>
                                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{note.structured_soap.counseling_goal}</p>
                                </div>
                              )}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {soapSections.map(({ key, label, color, itemStyle }) => {
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
                                    <div key={key} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                                      <div className="px-3 py-2 flex items-center gap-1.5" style={{ background: color + '18' }}>
                                        <span className="text-xs font-bold" style={{ color }}>{key}</span>
                                        <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                                      </div>
                                      <div className="px-3 py-2.5 space-y-1.5">
                                        {items.length > 0 && (
                                          <div className="flex flex-wrap gap-1">
                                            {items.map((item, i) => (
                                              <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={itemStyle}>{item}</span>
                                            ))}
                                          </div>
                                        )}
                                        {remarks && <p className="text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>{remarks}</p>}
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
                                  subjective: {letter:'S',label:'Subjective',color:'var(--color-primary)'},
                                  objective:  {letter:'O',label:'Objective', color:'#7c3aed'},
                                  assessment: {letter:'A',label:'Assessment',color:'#d97706'},
                                  plan:       {letter:'P',label:'Plan',      color:'#059669'},
                                };
                                const { letter, label, color } = labels[k];
                                return (
                                  <div key={k} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                                    <div className="px-3 py-2 flex items-center gap-1.5" style={{ background: color + '18' }}>
                                      <span className="text-xs font-bold" style={{ color }}>{letter}</span>
                                      <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                                    </div>
                                    <p className="px-3 py-2.5 text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>{v}</p>
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
                                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
                                    <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{v}</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Risk notes */}
                          {note.risk_flagged && note.risk_notes && (
                            <div className="mx-5 mb-4 px-3 py-2.5 rounded-lg"
                              style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
                              <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--color-danger)' }}>⚠ Risk Notes</p>
                              <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{note.risk_notes}</p>
                            </div>
                          )}

                          {/* Inline edit form */}
                          {isEditingThis && (
                            <div className="p-5 space-y-3" style={{ borderTop: '1px solid var(--color-primary)', background: 'var(--color-primary-surface)' }}>
                              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>Editing Note</p>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Mood (1–10)</label>
                                  <input type="number" min="1" max="10" value={editNoteForm.mood_rating}
                                    onChange={e => setEditNoteForm({ ...editNoteForm, mood_rating: Number(e.target.value) })}
                                    className={IC_XS} style={ICS} />
                                </div>
                                <div className="flex items-end pb-2">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={editNoteForm.risk_flagged}
                                      onChange={e => setEditNoteForm({ ...editNoteForm, risk_flagged: e.target.checked })}
                                      className="rounded" />
                                    <span className="text-xs font-medium" style={{ color: 'var(--color-danger)' }}>Risk Concern</span>
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
                                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>
                                  <textarea value={editNoteForm[key] as string}
                                    onChange={e => setEditNoteForm({ ...editNoteForm, [key]: e.target.value })}
                                    rows={2} className={IC_XS + ' resize-none'} style={ICS} />
                                </div>
                              ))}
                              {editNoteForm.risk_flagged && (
                                <div>
                                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Risk Notes</label>
                                  <textarea value={editNoteForm.risk_notes}
                                    onChange={e => setEditNoteForm({ ...editNoteForm, risk_notes: e.target.value })}
                                    rows={2} className={IC_XS + ' resize-none'}
                                    style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-text-primary)' }} />
                                </div>
                              )}
                              <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Reason for edit</label>
                                <input type="text" value={editNoteForm.change_reason} placeholder="e.g. Added missing intervention details"
                                  onChange={e => setEditNoteForm({ ...editNoteForm, change_reason: e.target.value })}
                                  className={IC_XS} style={ICS} />
                              </div>
                              <div className="flex gap-2 pt-1">
                                <button onClick={() => handleUpdateNote(note.note_id)} disabled={savingEditNote}
                                  className="text-white px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50 transition hover:opacity-90"
                                  style={{ background: 'var(--color-primary)' }}>
                                  {savingEditNote ? 'Saving…' : 'Save Changes'}
                                </button>
                                <button onClick={() => setEditingNoteId(null)}
                                  className="px-4 py-2 rounded-lg text-xs transition"
                                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Approval footer */}
                          {(approvalStatus || (['PSYCHOLOGIST','ADMIN'].includes(currentUser?.role || '') && !note.supervisor_approved && !note.supervisor_name)) && (
                            <div className="px-5 py-3 flex items-center justify-between flex-wrap gap-2"
                              style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                              {note.supervisor_approved === false && note.supervisor_comment && (
                                <p className="text-xs" style={{ color: 'var(--color-danger)' }}><span className="font-semibold">Feedback:</span> {note.supervisor_comment}</p>
                              )}
                              {note.supervisor_approved && note.supervisor_name && (
                                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                  Approved by <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>{note.supervisor_name}</span>
                                  {note.supervisor_action_at && ` · ${new Date(note.supervisor_action_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}`}
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

      {/* ── Clinical Record Tab: Treatment Plan ────────────────── */}
      {activeTab === 'clinical-record' && (
        <div className="space-y-4 mt-8">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Treatment Plan</h3>
            {!editingPlan && (
              <button
                onClick={() => setEditingPlan(true)}
                className="flex items-center gap-2.5 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}
              >
                <Target size={15} /> {treatmentPlan ? 'Edit Plan' : 'Create Plan'}
              </button>
            )}
          </div>

          <div className="space-y-4">
            {editingPlan ? (
              <div className="rounded-2xl shadow-card p-6 space-y-6"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                {/* Goals */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Goals</label>
                    <button type="button" onClick={() => setTreatmentPlan(tp => ({ ...tp, goals: [...tp.goals, { goal: '', target_date: '', status: 'not_started' }] }))}
                      className="text-xs hover:underline" style={{ color: 'var(--color-primary)' }}>+ Add Goal</button>
                  </div>
                  <div className="space-y-2">
                    {treatmentPlan.goals.map((g, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <input type="text" value={g.goal} placeholder="Goal description"
                          onChange={e => setTreatmentPlan(tp => { const gs = [...tp.goals]; gs[i] = { ...gs[i], goal: e.target.value }; return { ...tp, goals: gs }; })}
                          className="flex-1 px-3 py-1.5 text-sm rounded-lg outline-none transition" style={ICS} />
                        <input type="date" value={g.target_date}
                          onChange={e => setTreatmentPlan(tp => { const gs = [...tp.goals]; gs[i] = { ...gs[i], target_date: e.target.value }; return { ...tp, goals: gs }; })}
                          className="w-36 px-2 py-1.5 text-sm rounded-lg outline-none transition" style={ICS} />
                        <select value={g.status}
                          onChange={e => setTreatmentPlan(tp => { const gs = [...tp.goals]; gs[i] = { ...gs[i], status: e.target.value as any }; return { ...tp, goals: gs }; })}
                          className="w-32 px-2 py-1.5 text-xs rounded-lg outline-none transition" style={ICS}>
                          <option value="not_started">Not started</option>
                          <option value="in_progress">In progress</option>
                          <option value="achieved">Achieved</option>
                        </select>
                        <button onClick={() => setTreatmentPlan(tp => ({ ...tp, goals: tp.goals.filter((_, j) => j !== i) }))}
                          className="p-1 transition" style={{ color: 'var(--color-danger)' }}><XIcon size={14} /></button>
                      </div>
                    ))}
                    {treatmentPlan.goals.length === 0 && <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>No goals added yet.</p>}
                  </div>
                </div>

                {/* Interventions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Interventions</label>
                    <button type="button" onClick={() => setTreatmentPlan(tp => ({ ...tp, interventions: [...tp.interventions, ''] }))}
                      className="text-xs hover:underline" style={{ color: 'var(--color-primary)' }}>+ Add</button>
                  </div>
                  <div className="space-y-2">
                    {treatmentPlan.interventions.map((iv, i) => (
                      <div key={i} className="flex gap-2">
                        <input type="text" value={iv} placeholder="e.g. CBT, mindfulness, psychoeducation"
                          onChange={e => setTreatmentPlan(tp => { const ivs = [...tp.interventions]; ivs[i] = e.target.value; return { ...tp, interventions: ivs }; })}
                          className="flex-1 px-3 py-1.5 text-sm rounded-lg outline-none transition" style={ICS} />
                        <button onClick={() => setTreatmentPlan(tp => ({ ...tp, interventions: tp.interventions.filter((_, j) => j !== i) }))}
                          className="p-1 transition" style={{ color: 'var(--color-danger)' }}><XIcon size={14} /></button>
                      </div>
                    ))}
                    {treatmentPlan.interventions.length === 0 && <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>No interventions listed.</p>}
                  </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Estimated Duration</label>
                    <input type="text" value={treatmentPlan.estimated_duration} placeholder="e.g. 12 sessions over 3 months"
                      onChange={e => setTreatmentPlan(tp => ({ ...tp, estimated_duration: e.target.value }))}
                      className={IC} style={ICS} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Next Review Date</label>
                    <input type="date" value={treatmentPlan.next_review_date}
                      onChange={e => setTreatmentPlan(tp => ({ ...tp, next_review_date: e.target.value }))}
                      className={IC} style={ICS} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Progress Summary</label>
                  <textarea value={treatmentPlan.progress_summary} rows={3} placeholder="Overall progress notes and clinical impressions…"
                    onChange={e => setTreatmentPlan(tp => ({ ...tp, progress_summary: e.target.value }))}
                    className={IC + ' resize-none'} style={ICS} />
                </div>

                <div className="flex gap-3">
                  <button onClick={handleSaveTreatmentPlan} disabled={savingPlan}
                    className="text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition hover:opacity-90"
                    style={{ background: 'var(--color-primary)' }}>
                    {savingPlan ? 'Saving…' : 'Save Plan'}
                  </button>
                  <button onClick={() => setEditingPlan(false)}
                    className="px-5 py-2 rounded-lg text-sm transition"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : treatmentPlan.goals.length > 0 || treatmentPlan.interventions.length > 0 || treatmentPlan.progress_summary ? (
              <div className="rounded-2xl shadow-card p-6 space-y-5"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                {treatmentPlan.goals.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>Goals</p>
                    <div className="space-y-1.5">
                      {treatmentPlan.goals.map((g, i) => {
                        const dotColor = g.status === 'achieved' ? 'var(--color-success)' : g.status === 'in_progress' ? 'var(--color-warning)' : 'var(--color-border)';
                        const badgeStyle: React.CSSProperties = g.status === 'achieved'
                          ? { background: 'var(--color-success-surface)', color: 'var(--color-success)' }
                          : g.status === 'in_progress'
                          ? { background: 'var(--color-warning-surface)', color: 'var(--color-warning)' }
                          : { background: 'var(--color-bg)', color: 'var(--color-text-muted)' };
                        return (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                            <span className="flex-1" style={{ color: 'var(--color-text-primary)' }}>{g.goal}</span>
                            {g.target_date && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{new Date(g.target_date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}</span>}
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={badgeStyle}>{g.status.replace('_', ' ')}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {treatmentPlan.interventions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>Interventions</p>
                    <div className="flex flex-wrap gap-2">
                      {treatmentPlan.interventions.map((iv, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-full"
                          style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)' }}>{iv}</span>
                      ))}
                    </div>
                  </div>
                )}
                {(treatmentPlan.estimated_duration || treatmentPlan.next_review_date) && (
                  <div className="flex gap-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {treatmentPlan.estimated_duration && <span><span className="font-medium">Duration:</span> {treatmentPlan.estimated_duration}</span>}
                    {treatmentPlan.next_review_date && <span><span className="font-medium">Next review:</span> {new Date(treatmentPlan.next_review_date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}</span>}
                  </div>
                )}
                {treatmentPlan.progress_summary && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Progress</p>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>{treatmentPlan.progress_summary}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl shadow-card p-12 text-center"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <Target size={28} className="mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
                <p style={{ color: 'var(--color-text-secondary)' }}>No treatment plan on file.</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Click "Create Plan" to add goals, interventions, and a progress summary.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Clinical Record Tab: Diagnoses ─────────────────────── */}
      {activeTab === 'clinical-record' && (
        <div className="space-y-5">
          <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Diagnoses</h3>

          {/* Add form */}
          <div className="rounded-2xl shadow-card p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-muted)' }}>Add Diagnosis</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-1">
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Code</label>
                <input type="text" value={diagForm.code} placeholder="e.g. F41.1" onChange={e => setDiagForm(f => ({ ...f, code: e.target.value }))}
                  className={IC} style={ICS} />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>System</label>
                <select value={diagForm.system} onChange={e => setDiagForm(f => ({ ...f, system: e.target.value }))}
                  className={IC} style={ICS}>
                  <option value="DSM-5">DSM-5</option>
                  <option value="ICD-10">ICD-10</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Type</label>
                <select value={diagForm.type} onChange={e => setDiagForm(f => ({ ...f, type: e.target.value }))}
                  className={IC} style={ICS}>
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="rule_out">Rule Out</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={handleAddDiagnosis} disabled={savingDiag || !diagForm.code || !diagForm.description}
                  className="w-full px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition hover:opacity-90"
                  style={{ background: 'var(--color-primary)' }}>
                  {savingDiag ? 'Adding…' : 'Add'}
                </button>
              </div>
              <div className="md:col-span-4">
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Description</label>
                <input type="text" value={diagForm.description} placeholder="e.g. Generalized Anxiety Disorder" onChange={e => setDiagForm(f => ({ ...f, description: e.target.value }))}
                  className={IC} style={ICS} />
              </div>
            </div>
          </div>

          {/* Diagnosis list */}
          {diagnoses.length === 0 ? (
            <div className="rounded-2xl shadow-card p-10 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>No diagnoses recorded.</p>
            </div>
          ) : (
            <div className="rounded-2xl shadow-card overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              {diagnoses.map((d, i) => {
                const typeStyle: React.CSSProperties = d.type === 'primary'
                  ? { background: 'var(--color-success-surface)', color: 'var(--color-success)' }
                  : d.type === 'rule_out'
                  ? { background: 'var(--color-warning-surface)', color: 'var(--color-warning)' }
                  : { background: 'var(--color-bg)', color: 'var(--color-text-muted)' };
                return (
                  <div key={i} className="flex items-center gap-3 px-5 py-3"
                    style={{ borderBottom: i < diagnoses.length - 1 ? '1px solid var(--color-border)' : undefined }}>
                    <span className="font-mono text-sm font-bold w-20 flex-shrink-0" style={{ color: 'var(--color-primary)' }}>{d.code}</span>
                    <span className="text-sm flex-1" style={{ color: 'var(--color-text-primary)' }}>{d.description}</span>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>{d.system}</span>
                    <span className="text-xs px-2 py-0.5 rounded font-medium" style={typeStyle}>{(d.type || '').replace('_', ' ')}</span>
                    <button onClick={() => handleRemoveDiagnosis(i)} className="ml-1 transition"
                      style={{ color: 'var(--color-text-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-danger)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}><XIcon size={14} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Clinical Record Tab: Safety Plan ───────────────────── */}
      {activeTab === 'clinical-record' && (
        <div className="space-y-6 max-w-3xl">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={16} style={{ color: 'var(--color-danger)' }} />
              <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {safetyPlanExists ? 'Safety Plan' : 'Create Safety Plan'}
              </h2>
              {safetyPlanExists && !editingSafetyPlan && (
                <span className="text-xs px-2 py-0.5 rounded"
                  style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)' }}>On file</span>
              )}
            </div>
            {safetyPlanExists && !editingSafetyPlan && (
              <button onClick={() => setEditingSafetyPlan(true)} className="text-xs hover:underline" style={{ color: 'var(--color-primary)' }}>Edit</button>
            )}
          </div>

          {!editingSafetyPlan ? (
            /* ── Read-only view ── */
            <div className="space-y-4">
              {[
                { label: 'Warning Signs', items: safetyPlan.warning_signs },
                { label: 'Internal Coping Strategies', items: safetyPlan.internal_coping },
                { label: 'Social Distractions', items: safetyPlan.social_distractions },
                { label: 'Reasons for Living', items: safetyPlan.reasons_to_live },
              ].map(sec => (
                <div key={sec.label} className="rounded-lg p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>{sec.label}</p>
                  {sec.items.length === 0 ? (
                    <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>None recorded</p>
                  ) : (
                    <ul className="space-y-1">
                      {sec.items.map((item, i) => (
                        <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'var(--color-text-primary)' }}>
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--color-text-muted)' }} />
                          {item as string}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}

              {/* Social contacts */}
              <div className="rounded-lg p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>Social Contacts (People to Call)</p>
                {safetyPlan.social_contacts.length === 0 ? (
                  <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>None recorded</p>
                ) : (
                  <div className="space-y-1">
                    {safetyPlan.social_contacts.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{c.name}</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{c.phone}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Professional contacts */}
              <div className="rounded-lg p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>Professional / Crisis Contacts</p>
                {safetyPlan.professional_contacts.length === 0 ? (
                  <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>None recorded</p>
                ) : (
                  <div className="space-y-1">
                    {safetyPlan.professional_contacts.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{c.name}</span>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{c.role}</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{c.phone}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Means restriction + follow-up */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Means Restriction</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{safetyPlan.means_restriction || <span className="italic" style={{ color: 'var(--color-text-muted)' }}>Not recorded</span>}</p>
                </div>
                <div className="rounded-lg p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Follow-Up Date</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{safetyPlan.follow_up_date || <span className="italic" style={{ color: 'var(--color-text-muted)' }}>Not set</span>}</p>
                </div>
              </div>

              {safetyPlan.counselor_signature && (
                <div className="rounded-lg p-3 text-xs" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                  Counselor: <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>{safetyPlan.counselor_signature}</span>
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
              <div className="rounded-lg p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Means Restriction
                </label>
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Describe agreed actions to limit access to lethal means.</p>
                <textarea
                  value={safetyPlan.means_restriction}
                  onChange={e => setSafetyPlan(p => ({ ...p, means_restriction: e.target.value }))}
                  rows={2}
                  className={IC + ' resize-none'} style={ICS}
                  placeholder="e.g. Client agreed to have family remove firearms from home."
                />
              </div>

              {/* Follow-up + Signature */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-secondary)' }}>Follow-Up Date</label>
                  <input
                    type="date"
                    value={safetyPlan.follow_up_date}
                    onChange={e => setSafetyPlan(p => ({ ...p, follow_up_date: e.target.value }))}
                    className={IC} style={ICS}
                  />
                </div>
                <div className="rounded-lg p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-secondary)' }}>Counselor Name</label>
                  <input
                    type="text"
                    value={safetyPlan.counselor_signature}
                    onChange={e => setSafetyPlan(p => ({ ...p, counselor_signature: e.target.value }))}
                    className={IC} style={ICS}
                    placeholder="Counselor full name"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={saveSafetyPlan}
                  disabled={savingSafetyPlan}
                  className="px-5 py-2 rounded text-sm font-semibold transition disabled:opacity-50"
                  style={{ background: savingSafetyPlan ? 'var(--color-border)' : 'var(--color-danger)', color: savingSafetyPlan ? 'var(--color-text-muted)' : '#fff' }}
                >
                  {savingSafetyPlan ? 'Saving…' : 'Save Safety Plan'}
                </button>
                {safetyPlanExists && (
                  <button onClick={() => setEditingSafetyPlan(false)}
                    className="px-4 py-2 rounded text-sm transition"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Wellbeing Tab: Assessments ─────────────────────────── */}
      {activeTab === 'wellbeing' && (
        <div className="space-y-6 max-w-2xl">

          {/* ── Assessment result banner ── */}
          {assessmentResult && (
            <div className="rounded-xl p-4 flex items-start gap-3"
              style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>
              <Activity size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-success)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-success)' }}>Assessment recorded</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-success)' }}>
                  Score: <span className="font-bold">{assessmentResult.score}/{assessmentResult.max}</span>
                  <span className="mx-1.5">·</span>
                  Severity: <span className="font-bold">{assessmentResult.severity}</span>
                </p>
              </div>
              <button onClick={() => setAssessmentResult(null)} className="ml-auto" style={{ color: 'var(--color-success)' }}><XIcon size={14} /></button>
            </div>
          )}

          {/* ── Record assessment form / picker (not shown to IC) ── */}
          {!isIC && (recordingType && assessmentTemplate ? (
            <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{assessmentTemplate.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{assessmentTemplate.instruction}</p>
                </div>
                <button onClick={() => { setRecordingType(null); setAssessmentTemplate(null); }}
                  className="transition" style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}><XIcon size={16} /></button>
              </div>

              <div className="space-y-4">
                {assessmentTemplate.questions.map((q, i) => (
                  <div key={i} className="rounded-lg p-3" style={{ background: 'var(--color-bg)' }}>
                    <p className="text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>
                      <span className="font-medium mr-1.5" style={{ color: 'var(--color-text-muted)' }}>{i + 1}.</span>
                      {q}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {assessmentTemplate.scale.map(opt => {
                        const selected = assessmentResponses[String(i)] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setAssessmentResponses(r => ({ ...r, [String(i)]: opt.value }))}
                            className="px-3 py-1.5 text-xs rounded-lg transition-all"
                            style={selected
                              ? { background: 'var(--color-primary)', border: '1px solid var(--color-primary)', color: '#fff', fontWeight: 500 }
                              : { border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', background: 'transparent' }}
                          >
                            {opt.value} — {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSubmitAssessment}
                  disabled={savingAssessment || Object.keys(assessmentResponses).length < assessmentTemplate.questions.length}
                  className="px-5 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition hover:opacity-90"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {savingAssessment ? 'Saving…' : 'Save Assessment'}
                </button>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{Object.keys(assessmentResponses).length}/{assessmentTemplate.questions.length} answered</p>
              </div>
            </div>
          ) : (
            /* ── Pick assessment to record ── */
            <div className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Record Assessment</p>
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>Administer and record a standardized assessment for this client. Results are for clinical use only — not shared with the student.</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { type: 'PHQ9', label: 'PHQ-9', desc: 'Depression (27 pts)' },
                  { type: 'GAD7', label: 'GAD-7', desc: 'Anxiety (21 pts)' },
                  { type: 'PSS',  label: 'PSS-10', desc: 'Stress (40 pts)' },
                ].map(t => (
                  <button
                    key={t.type}
                    onClick={() => startRecording(t.type)}
                    className="flex flex-col items-start px-4 py-3 rounded-xl transition text-left"
                    style={{ border: '2px solid var(--color-border)', background: 'transparent' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-primary-surface)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.label}</span>
                    <span className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* ── Assessment history ── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)' }}>Assessment History</p>
            {!historyLoaded ? (
              <p className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
            ) : assessmentHistory.length === 0 ? (
              <p className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>No assessments recorded yet.</p>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide" style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                      <th className="text-left px-4 py-2" style={{ color: 'var(--color-text-muted)' }}>Date</th>
                      <th className="text-left px-4 py-2" style={{ color: 'var(--color-text-muted)' }}>Tool</th>
                      <th className="text-left px-4 py-2" style={{ color: 'var(--color-text-muted)' }}>Score</th>
                      <th className="text-left px-4 py-2" style={{ color: 'var(--color-text-muted)' }}>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessmentHistory.map(a => {
                      const sevColor =
                        a.severity === 'Severe' || a.severity === 'High stress' ? 'var(--color-danger)' :
                        a.severity === 'Moderately Severe' ? '#ea580c' :
                        a.severity === 'Moderate' || a.severity === 'Moderate stress' ? 'var(--color-warning)' :
                        a.severity === 'Mild' ? 'var(--color-primary)' :
                        'var(--color-success)';
                      return (
                        <tr key={a._id} className="transition" style={{ borderBottom: '1px solid var(--color-border)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                            {new Date(a.created_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{a.assessment_type === 'PSS' ? 'PSS-10' : a.assessment_type.replace('9', '-9').replace('7', '-7')}</span>
                          </td>
                          <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--color-text-primary)' }}>
                            {a.raw_score}<span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>/{a.max_score ?? '?'}</span>
                          </td>
                          <td className="px-4 py-2.5 font-medium" style={{ color: sevColor }}>{a.severity ?? '—'}</td>
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
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-secondary)' }}>Repeating Schedules</p>
            {!isIC && (
              <>
                <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>Auto-queue assessments at regular intervals.</p>
                <div className="rounded-lg p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div className="flex flex-wrap gap-3">
                    <div>
                      <label className="block text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Assessment</label>
                      <select value={scheduleForm.assessment_type}
                        onChange={e => setScheduleForm(f => ({ ...f, assessment_type: e.target.value }))}
                        className="px-3 py-1.5 text-sm rounded outline-none transition" style={ICS}>
                        <option value="PHQ9">PHQ-9 (Depression)</option>
                        <option value="GAD7">GAD-7 (Anxiety)</option>
                        <option value="PSS">PSS-10 (Stress)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Every (days)</label>
                      <input type="number" min={1} max={90} value={scheduleForm.interval_days}
                        onChange={e => setScheduleForm(f => ({ ...f, interval_days: parseInt(e.target.value) || 14 }))}
                        className="w-24 px-3 py-1.5 text-sm rounded outline-none transition" style={ICS} />
                    </div>
                    <div>
                      <label className="block text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>First due date</label>
                      <input type="date" value={scheduleForm.start_date}
                        onChange={e => setScheduleForm(f => ({ ...f, start_date: e.target.value }))}
                        className="px-3 py-1.5 text-sm rounded outline-none transition" style={ICS} />
                    </div>
                    <div className="self-end">
                      <button onClick={handleAddSchedule} disabled={savingSchedule}
                        className="px-4 py-1.5 rounded text-sm font-medium transition flex items-center gap-1.5 disabled:opacity-50"
                        style={{ background: savingSchedule ? 'var(--color-border)' : 'var(--color-primary)', color: savingSchedule ? 'var(--color-text-muted)' : '#fff' }}>
                        <Plus size={14} /> {savingSchedule ? 'Adding…' : 'Add'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {assessmentSchedules.filter(s => s.active).length === 0 ? (
              <p className="text-sm italic mt-3" style={{ color: 'var(--color-text-muted)' }}>No active schedules.</p>
            ) : (
              <div className="space-y-2 mt-3">
                {assessmentSchedules.filter(s => s.active).map(s => (
                  <div key={s.schedule_id} className="flex items-center justify-between rounded-lg px-4 py-3"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div>
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{s.assessment_type}</span>
                      <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>every {s.interval_days} days</span>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        Next due: <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                          {new Date(s.next_due).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </p>
                    </div>
                    {!isIC && (
                      <button onClick={() => handleDeleteSchedule(s.schedule_id)}
                        className="text-xs px-2 py-1 rounded transition"
                        style={{ color: 'var(--color-danger)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-danger-surface)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── History Tab ────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {!isIC && <CheckInForm caseId={caseId} onSubmit={handleCreateCheckIn} isLoading={checkInLoading} />}
          {checkInHistory.length > 0 ? (
            <div>
              <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Check-In History</h3>
              <CheckInHistory checkIns={checkInHistory} isLoading={checkInLoading} />
            </div>
          ) : isIC ? (
            <p className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>No check-in history on file.</p>
          ) : null}
        </div>
      )}

      {/* ── Wellbeing Tab: PERMA / MHBot ───────────────────────── */}
      {activeTab === 'wellbeing' && (
        <div className="space-y-5 max-w-2xl">
          {/* Link / Unlink MHBot account */}
          <div className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <Activity size={14} style={{ color: 'var(--color-primary)' }} /> MHBot Account
            </p>
            {caseData?.student?.mhbot_username ? (
              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Linked username</p>
                  <p className="text-sm font-medium font-mono mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                    {caseData.student.mhbot_username}
                  </p>
                </div>
                {!isIC && (
                  <button
                    onClick={unlinkMhbot}
                    disabled={linkingMhbot}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg disabled:opacity-50 transition"
                    style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-danger-surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {linkingMhbot ? <Loader2 size={11} className="animate-spin" /> : <Unlink size={11} />}
                    Unlink
                  </button>
                )}
              </div>
            ) : isIC ? (
              <p className="mt-3 text-xs italic" style={{ color: 'var(--color-text-muted)' }}>No MHBot account linked.</p>
            ) : (
              <div className="mt-3">
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Enter the student's MHBot username to pull PERMA history.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mhbotUsername}
                    onChange={e => setMhbotUsername(e.target.value)}
                    placeholder="e.g. ema_lVk"
                    className="flex-1 px-3 py-2 text-sm rounded-lg outline-none transition" style={ICS}
                  />
                  <button
                    onClick={linkMhbot}
                    disabled={linkingMhbot || !mhbotUsername.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition hover:opacity-90"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    {linkingMhbot ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
                    Link
                  </button>
                </div>
                {mhbotError && (
                  <p className="mt-2 text-xs flex items-center gap-1" style={{ color: 'var(--color-danger)' }}>
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
                date: new Date(h.date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' }),
                score: LABEL_TO_SCORE[h.perma_label!],
                label: h.perma_label!,
              }));

            const latestScore = chartData.length ? chartData[chartData.length - 1].score : null;
            const latestColor = latestScore ? SCORE_COLOR[latestScore] : '#2563eb';

            const CustomTooltip = ({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="shadow-lg rounded-lg px-3 py-2 text-xs"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <p className="mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(d.dateRaw).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                  <p className="font-semibold" style={{ color: SCORE_COLOR[d.score] }}>{d.label}</p>
                </div>
              );
            };

            return (
              <div className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>PERMA History</p>
                  {latestScore && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: latestColor + '18', color: latestColor }}>
                      Latest: {SCORE_TO_LABEL[latestScore]}
                    </span>
                  )}
                </div>
                {permaLoading ? (
                  <div className="flex justify-center py-12" style={{ color: 'var(--color-text-muted)' }}>
                    <Loader2 size={18} className="animate-spin mr-2" /> Loading…
                  </div>
                ) : chartData.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>No PERMA records found</p>
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
                    <div className="mt-4 pt-3 space-y-1.5" style={{ borderTop: '1px solid var(--color-border)' }}>
                      {[...permaHistory].slice(0, 6).map((h, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {new Date(h.date).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </span>
                          <PermaBadge label={h.perma_label} />
                        </div>
                      ))}
                      {permaHistory.length > 6 && (
                        <p className="text-xs text-center pt-1" style={{ color: 'var(--color-text-muted)' }}>+{permaHistory.length - 6} earlier entries</p>
                      )}
                    </div>
                  </>
                )}
                {mhbotError && (
                  <p className="mt-2 text-xs flex items-center gap-1" style={{ color: 'var(--color-danger)' }}>
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
    {showClosureChecklist && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setShowClosureChecklist(false)} />
        <div className="relative rounded-2xl shadow-xl w-full max-w-sm p-6" style={{ background: 'var(--color-surface)' }}>
          <h2 className="text-base font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Pre-Closure Checklist</h2>
          <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>
            Confirm all steps are completed before closing this case.
          </p>
          <div className="space-y-3 mb-6">
            {([
              { key: 'notes',    label: 'All session notes have been documented and saved.' },
              { key: 'referrals',label: 'Referrals or follow-up care have been arranged (if applicable).' },
              { key: 'notified', label: 'The student has been informed of case closure.' },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={closureChecks[key]}
                  onChange={e => setClosureChecks(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded accent-primary flex-shrink-0"
                />
                <span className="text-sm leading-snug" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowClosureChecklist(false)}
              className="flex-1 text-sm font-medium px-4 py-2.5 rounded-xl border transition hover:opacity-80"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              Cancel
            </button>
            <button
              disabled={!closureChecks.notes || !closureChecks.referrals || !closureChecks.notified}
              onClick={() => { setShowClosureChecklist(false); setShowTerminationForm(true); }}
              className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl text-white transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-danger)' }}
            >
              Continue to Close
            </button>
          </div>
        </div>
      </div>
    )}

    {showTerminationForm && (
      <TerminationFormModal
        studentName={studentName}
        onClose={() => setShowTerminationForm(false)}
        onSubmit={handleTerminateCase}
      />
    )}

    {/* ── Edit Triage Modal ── */}
    {showEditTriageModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setShowEditTriageModal(false)} />
        <div className="relative rounded-2xl shadow-xl w-full max-w-md p-6" style={{ background: 'var(--color-surface)' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>Edit Triage Decision</h3>
            <button onClick={() => setShowEditTriageModal(false)} className="p-1 rounded-lg transition" style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <XIcon size={16} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Triage Decision</label>
              <select value={editTriageDecision} onChange={e => setEditTriageDecision(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={ICS}>
                <option value="">Select…</option>
                <option value="ENDORSE_CC">Endorse to Counselor (CC)</option>
                <option value="ENDORSE_CP">Endorse to Psychologist (CP)</option>
                <option value="CLOSE_AT_INTAKE">Close at Intake</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Risk Level Override</label>
              <select value={editTriageRisk} onChange={e => setEditTriageRisk(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={ICS}>
                <option value="">Keep calculated risk</option>
                <option value="GREEN">Green — Low Risk</option>
                <option value="YELLOW">Yellow — Moderate</option>
                <option value="RED">Red — High Risk</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Notes {editTriageDecision === 'CLOSE_AT_INTAKE' && <span style={{ color: 'var(--color-danger)' }}>*</span>}
              </label>
              <textarea value={editTriageNotes} onChange={e => setEditTriageNotes(e.target.value)}
                rows={3} placeholder="Reason for update, resources provided, follow-up plan…"
                className="w-full px-3 py-2 text-sm rounded-lg outline-none resize-none" style={ICS} />
            </div>
            {editTriageError && (
              <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{editTriageError}</p>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setShowEditTriageModal(false)}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              Cancel
            </button>
            <button onClick={handleEditTriage} disabled={savingEditTriage || !editTriageDecision}
              className="flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}>
              {savingEditTriage ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    )}

    {showScheduleModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setShowScheduleModal(false)} />
        <div className="relative rounded-2xl shadow-xl w-full max-w-sm p-6 animate-scale-in" style={{ background: 'var(--color-surface)' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <CalendarPlus size={16} style={{ color: 'var(--color-success)' }} /> Schedule Next Session
            </h3>
            <button onClick={() => setShowScheduleModal(false)} className="p-1 rounded-lg transition" style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <XIcon size={16} />
            </button>
          </div>
          <div className="space-y-3">
            <p className="text-xs rounded-lg px-3 py-2.5" style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}>
              The student will pick a time from your available slots. Make sure your availability is set up in your schedule settings.
            </p>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Notes for student (optional)</label>
              <textarea rows={2} value={scheduleNotes} onChange={e => setScheduleNotes(e.target.value)} placeholder="Anything the student should prepare or know…"
                className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }} />
            </div>
            {scheduleMsg && (
              <p className="text-xs rounded-lg px-3 py-2" style={{ background: scheduleMsg.type === 'ok' ? 'var(--color-success-surface)' : 'var(--color-danger-surface)', color: scheduleMsg.type === 'ok' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {scheduleMsg.text}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={handleScheduleSession} disabled={schedulingSession}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-white rounded-xl transition disabled:opacity-50 hover:opacity-90"
                style={{ background: 'var(--color-success)' }}>
                {schedulingSession ? <Loader2 size={14} className="animate-spin" /> : <CalendarPlus size={14} />}
                {schedulingSession ? 'Notifying…' : 'Notify Student to Pick a Time'}
              </button>
              <button onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 text-sm rounded-xl transition border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {showExtReferralModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setShowExtReferralModal(false)} />
        <div className="relative rounded-2xl shadow-xl w-full max-w-lg p-6 animate-scale-in" style={{ background: 'var(--color-surface)' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <Download size={16} style={{ color: 'var(--color-primary)' }} /> External Referral Letter
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Generates a printable letter for HSO, SDFO, OAS, and other university offices.
              </p>
            </div>
            <button onClick={() => setShowExtReferralModal(false)} className="p-1 rounded-lg transition" style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <XIcon size={16} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Student summary strip */}
            <div className="rounded-xl px-3 py-2.5 text-xs flex flex-wrap gap-x-4 gap-y-1"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
              <span><span style={{ color: 'var(--color-text-muted)' }}>Student: </span><strong style={{ color: 'var(--color-text-primary)' }}>{caseData?.student?.name || caseData?.student_name || '—'}</strong></span>
              {caseData?.student?.school_id && <span><span style={{ color: 'var(--color-text-muted)' }}>ID: </span>{caseData.student.school_id}</span>}
              {caseData?.student?.college && <span><span style={{ color: 'var(--color-text-muted)' }}>College: </span>{caseData.student.college}</span>}
              {caseData?.student?.year_level && <span><span style={{ color: 'var(--color-text-muted)' }}>Year: </span>{caseData.student.year_level}</span>}
            </div>

            {/* Destination office */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Referring To</label>
              <div className="grid grid-cols-2 gap-2">
                {EXT_OFFICES.map(o => (
                  <button key={o} onClick={() => setExtReferralOffice(o)}
                    className="text-left text-xs px-3 py-2 rounded-lg transition"
                    style={{
                      border: extReferralOffice === o ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      background: extReferralOffice === o ? 'var(--color-primary-surface)' : 'var(--color-bg)',
                      color: extReferralOffice === o ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      fontWeight: extReferralOffice === o ? 600 : 400,
                    }}>
                    {o}
                  </button>
                ))}
              </div>
              {extReferralOffice === 'Other' && (
                <input
                  className="mt-2 w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                  placeholder="Specify office name…"
                  value={extReferralCustomOffice}
                  onChange={e => setExtReferralCustomOffice(e.target.value)}
                />
              )}
            </div>

            {/* Nature of concern */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Nature of Concern <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(brief, will appear on letter)</span>
              </label>
              <textarea rows={2} value={extReferralConcern} onChange={e => setExtReferralConcern(e.target.value)}
                placeholder="e.g., Student is experiencing academic stress and financial difficulties requiring office support."
                className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }} />
            </div>

            {/* Specific request */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Specific Request to Office <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea rows={2} value={extReferralRequest} onChange={e => setExtReferralRequest(e.target.value)}
                placeholder="e.g., Kindly provide information on available financial assistance programs for the student."
                className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }} />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { generateExternalReferralLetter(); setShowExtReferralModal(false); }}
                disabled={!extReferralOffice || (extReferralOffice === 'Other' && !extReferralCustomOffice.trim())}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-white rounded-xl transition disabled:opacity-50 hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                <Download size={14} /> Generate &amp; Print Letter
              </button>
              <button onClick={() => setShowExtReferralModal(false)}
                className="px-4 py-2 text-sm rounded-xl transition border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {showReferralModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setShowReferralModal(false)} />
        <div className="relative rounded-2xl shadow-xl w-full max-w-md p-6 animate-scale-in" style={{ background: 'var(--color-surface)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <UserPlus size={16} style={{ color: 'var(--color-warning)' }} /> Internal Referral
            </h3>
            <button onClick={() => setShowReferralModal(false)} className="p-1 rounded-lg transition" style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <XIcon size={16} />
            </button>
          </div>

          {/* Role toggle */}
          <div className="flex rounded-xl overflow-hidden mb-4" style={{ border: '1px solid var(--color-border)' }}>
            {(['COUNSELOR', 'PSYCHOLOGIST'] as const).map(r => (
              <button key={r} onClick={() => { setReferralRole(r); loadReferralWorkload(r); }}
                className="flex-1 py-2 text-xs font-semibold transition"
                style={{
                  background: referralRole === r ? 'var(--color-primary)' : 'transparent',
                  color: referralRole === r ? '#fff' : 'var(--color-text-secondary)',
                }}>
                {r === 'COUNSELOR' ? 'Another Counselor' : 'Psychologist'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Select {referralRole === 'COUNSELOR' ? 'Counselor' : 'Psychologist'}
              </label>
              {referralWorkloadLoading ? (
                <div className="flex items-center gap-2 text-xs py-3" style={{ color: 'var(--color-text-muted)' }}>
                  <Loader2 size={13} className="animate-spin" /> Loading…
                </div>
              ) : referralWorkload.length === 0 ? (
                <p className="text-xs py-2 px-3 rounded-lg" style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                  No active {referralRole === 'COUNSELOR' ? 'counselors' : 'psychologists'} found.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {referralWorkload.map(p => {
                    const isSelected = referralTargetId === p.counselor_id;
                    const isRec = recommendedReferralId === p.counselor_id;
                    const utilizationColor = p.utilization === 'LOW' ? 'var(--color-success)' : p.utilization === 'HIGH' ? 'var(--color-danger)' : 'var(--color-warning)';
                    const utilizationBg = p.utilization === 'LOW' ? 'var(--color-success-surface)' : p.utilization === 'HIGH' ? 'var(--color-danger-surface)' : 'var(--color-warning-surface)';
                    const score = (p.active_cases * 2) + p.active_appointments;
                    const barPct = Math.min(100, Math.round((score / 12) * 100));
                    return (
                      <button key={p.counselor_id} onClick={() => setReferralTargetId(p.counselor_id)}
                        className="w-full text-left rounded-xl px-3 py-2.5 transition"
                        style={{
                          border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                          background: isSelected ? 'var(--color-primary-surface)' : 'var(--color-bg)',
                        }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{p.name}</span>
                          <div className="flex items-center gap-1.5">
                            {isRec && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                                style={{ background: 'var(--color-primary)', color: '#fff' }}>
                                Recommended
                              </span>
                            )}
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                              style={{ background: utilizationBg, color: utilizationColor }}>
                              {p.utilization}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: 'var(--color-border)' }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, background: utilizationColor }} />
                          </div>
                          <span className="text-xs tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                            {p.active_cases} cases · {p.active_appointments} appts
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Reason for Referral</label>
              <textarea rows={3} value={referralReason} onChange={e => setReferralReason(e.target.value)}
                placeholder="Clinical rationale, specific concerns, or context for the receiving provider…"
                className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }} />
            </div>

            {referralMsg && (
              <p className="text-xs rounded-lg px-3 py-2" style={{
                background: referralMsg.type === 'ok' ? 'var(--color-success-surface)' : 'var(--color-danger-surface)',
                color: referralMsg.type === 'ok' ? 'var(--color-success)' : 'var(--color-danger)',
              }}>
                {referralMsg.text}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={handleReferToPs} disabled={referralSubmitting || !referralTargetId}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-white rounded-xl transition disabled:opacity-50 hover:opacity-90"
                style={{ background: 'var(--color-warning)' }}>
                {referralSubmitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                {referralSubmitting ? 'Submitting…' : 'Submit Referral'}
              </button>
              <button onClick={() => setShowReferralModal(false)}
                className="px-4 py-2 text-sm rounded-xl transition border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    </>
  );
}

