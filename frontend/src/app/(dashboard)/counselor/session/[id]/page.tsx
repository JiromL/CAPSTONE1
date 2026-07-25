'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import {
  Loader2, Check, ChevronRight, User, AlertTriangle, Shield,
  Activity, ShieldAlert, FileText, CalendarDays, Stethoscope,
  ClipboardList, Target, ArrowRight, CheckCircle2, BookOpen,
  TriangleAlert, RefreshCw, ExternalLink, XCircle, Info,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
type Step = 'review' | 'checkin' | 'soap' | 'outcome';

interface ApptDetail {
  _id: string;
  student_name: string;
  student_email: string;
  student_id_number?: string;
  case_id?: string;
  status: string;
  purpose?: string;
  concern?: string;
  scheduled_start?: string;
  preferred_date?: string;
  method?: string;
  risk_level?: string;
}

interface CaseDetail {
  _id: string;
  case_number?: string;
  risk_level?: string;
  status?: string;
  created_at?: string;
}

interface SessionNote {
  note_id: string;
  session_date: string;
  soap?: { subjective: string; objective: string; assessment: string; plan: string };
  mood_rating?: number;
  risk_flagged?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const RISK_MAP: Record<string, { label: string; icon: React.ReactNode; style: React.CSSProperties }> = {
  GREEN:    { label: 'Low Risk',       icon: <Shield size={12} />,        style: { background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' } },
  YELLOW:   { label: 'Moderate Risk',  icon: <Activity size={12} />,      style: { background: '#FEFCE8', color: '#A16207', border: '1px solid #FDE047' } },
  RED:      { label: 'High Risk',      icon: <AlertTriangle size={12} />, style: { background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' } },
  CRITICAL: { label: 'Critical',       icon: <ShieldAlert size={12} />,   style: { background: '#FEE2E2', color: '#7F1D1D', border: '1px solid #FCA5A5' } },
};

function fmtDate(s?: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateTime(s?: string) {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true });
}

const THEMES = [
  'Academic Stress', 'Anxiety', 'Depression', 'Grief & Loss',
  'Relationship Issues', 'Family Conflict', 'Self-esteem',
  'Trauma', 'Career/Future', 'Identity', 'Social Withdrawal', 'Other',
];

const CHANGES = [
  'Sleep patterns', 'Appetite', 'Mood stability', 'Social engagement',
  'Academic performance', 'Stress levels', 'Medication adherence',
];

const OUTCOME_OPTIONS = [
  { value: 'continue', label: 'Continue Sessions', icon: <RefreshCw size={14} />,    desc: 'Schedule a follow-up at a regular interval' },
  { value: 'refer',    label: 'Refer Client',       icon: <ExternalLink size={14} />, desc: 'Internal (C2C) or external referral to another professional' },
  { value: 'close',   label: 'Initiate Closure',   icon: <XCircle size={14} />,      desc: 'Move case to Pending Termination for formal close-out' },
];

const INTERVAL_OPTIONS = ['1 week', '2 weeks', '1 month', 'As needed'];

// ── Input helpers ──────────────────────────────────────────────────────────────
const TA = 'w-full px-3 py-2.5 text-sm rounded-xl outline-none resize-none transition-all duration-150';
const TA_S: React.CSSProperties = {
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
  minHeight: '88px',
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function CounselorSessionPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  // Data
  const [appt, setAppt]             = useState<ApptDetail | null>(null);
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [history, setHistory]       = useState<SessionNote[]>([]);
  const [loadError, setLoadError]   = useState('');
  const [loading, setLoading]       = useState(true);
  const [userRole, setUserRole]     = useState('');

  // Step
  const [step, setStep] = useState<Step>('review');

  // Step 2 — Check-in
  const [moodRating, setMoodRating]             = useState<number | null>(null);
  const [distressLevel, setDistressLevel]       = useState<number | null>(null);
  const [presentingConcern, setPresentingConcern] = useState('');
  const [notableChanges, setNotableChanges]     = useState<string[]>([]);

  // Step 3 — SOAP
  const [soapS, setSoapS]       = useState('');
  const [soapO, setSoapO]       = useState('');
  const [soapA, setSoapA]       = useState('');
  const [soapP, setSoapP]       = useState('');
  const [psyNotes, setPsyNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [themes, setThemes]     = useState<string[]>([]);
  const [riskFlagged, setRiskFlagged] = useState(false);
  const [riskNotes, setRiskNotes]     = useState('');

  // Step 4 — Outcome
  const [outcome, setOutcome]             = useState<'continue' | 'refer' | 'close' | ''>('');
  const [followInterval, setFollowInterval] = useState('2 weeks');
  const [referralType, setReferralType]   = useState<'internal' | 'external'>('internal');
  const [referralNotes, setReferralNotes] = useState('');
  const [closureNotes, setClosureNotes]   = useState('');
  const [riskUpdate, setRiskUpdate]       = useState<'keep' | 'escalate' | 'deescalate'>('keep');

  // Submit
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');

  const load = useCallback(async () => {
    const token    = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) { router.push('/login'); return; }
    setUserRole(JSON.parse(userData).role || '');

    try {
      const r = await fetch(api(`/api/appointments/${id}`), { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) { setLoadError('Appointment not found.'); setLoading(false); return; }
      const apptData: ApptDetail = await r.json();
      setAppt(apptData);

      if (apptData.case_id) {
        const [caseR, histR] = await Promise.all([
          fetch(api(`/api/cases/${apptData.case_id}`), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(api(`/api/counseling/case/${apptData.case_id}/session-history`), { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (caseR.ok)  { const cd = await caseR.json();  setCaseDetail(cd.case ?? cd); }
        if (histR.ok) { const hd = await histR.json();  setHistory((hd.sessions ?? []).slice(0, 3)); }
      }
    } catch {
      setLoadError('Failed to load session data.');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  // ── Step config ────────────────────────────────────────────────────────────
  const ALL_STEPS: { key: Step; label: string }[] = [
    { key: 'review',  label: 'Session Review' },
    { key: 'checkin', label: 'Check-in' },
    { key: 'soap',    label: 'Session Notes' },
    { key: 'outcome', label: 'Outcome' },
  ];
  const stepIdx  = ALL_STEPS.findIndex(s => s.key === step);
  const isLast   = step === 'outcome';
  const isPsy    = userRole.toUpperCase() === 'PSYCHOLOGIST';

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate(): { ok: boolean; hint: string } {
    if (step === 'review')  return { ok: true, hint: '' };
    if (step === 'checkin') {
      if (moodRating === null)       return { ok: false, hint: 'Select a mood rating (1–10)' };
      if (distressLevel === null)    return { ok: false, hint: 'Select a distress level (0–10)' };
      if (!presentingConcern.trim()) return { ok: false, hint: "Describe today's presenting concern" };
      return { ok: true, hint: '' };
    }
    if (step === 'soap') {
      const missing = (['S', 'O', 'A', 'P'] as const).filter(k => ({ S: soapS, O: soapO, A: soapA, P: soapP }[k]).trim() === '');
      if (missing.length) return { ok: false, hint: `Fill in the ${missing.join(', ')} field${missing.length > 1 ? 's' : ''}` };
      return { ok: true, hint: '' };
    }
    if (step === 'outcome') {
      if (!outcome) return { ok: false, hint: 'Choose what happens next for this client' };
      return { ok: true, hint: '' };
    }
    return { ok: false, hint: '' };
  }

  function goNext() {
    const i = ALL_STEPS.findIndex(s => s.key === step);
    if (i < ALL_STEPS.length - 1) setStep(ALL_STEPS[i + 1].key);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!appt) return;
    setSubmitting(true);
    setSubmitError('');
    const token = localStorage.getItem('token');

    try {
      if (appt.case_id) {
        const combined = psyNotes.trim() ? `${soapA}\n\n[Psychological Assessment]\n${psyNotes}` : soapA;
        await fetch(api(`/api/counseling/case/${appt.case_id}/session-note`), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_date: new Date().toISOString(), session_type: 'counseling',
            appointment_id: appt._id, note_format: 'SOAP',
            soap_subjective: soapS, soap_objective: soapO,
            soap_assessment: combined, soap_plan: soapP,
            mood_rating: moodRating, symptom_severity: distressLevel != null ? String(distressLevel) : '',
            topics_discussed: themes.join(', '), homework_assigned: soapP,
            risk_flagged: riskFlagged, risk_notes: riskNotes,
            presenting_concern: presentingConcern, notable_changes: notableChanges.join(', '),
            session_duration: duration ? parseInt(duration) : null,
          }),
        });
      }

      await fetch(api(`/api/appointments/${appt._id}/set-evaluation`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (outcome === 'close' && appt.case_id) {
        await fetch(api(`/api/cases/${appt.case_id}`), {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PENDING_TERMINATION', termination_notes: closureNotes }),
        });
      }

      if (riskUpdate !== 'keep' && appt.case_id) {
        await fetch(api(`/api/cases/${appt.case_id}`), {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ risk_level: riskUpdate === 'escalate' ? 'RED' : 'GREEN' }),
        });
      }

      router.push('/appointments');
    } catch {
      setSubmitError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardPageWrapper title="Conduct Session" subtitle="">
        <div className="flex items-center justify-center h-64 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          Loading session data…
        </div>
      </DashboardPageWrapper>
    );
  }

  if (loadError || !appt) {
    return (
      <DashboardPageWrapper title="Conduct Session" subtitle="">
        <div className="max-w-md mx-auto rounded-2xl p-8 text-center" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
          <AlertTriangle size={28} className="mx-auto mb-3" style={{ color: 'var(--color-danger)' }} />
          <p className="font-semibold mb-4" style={{ color: 'var(--color-danger)' }}>{loadError || 'Session not found'}</p>
          <button onClick={() => router.back()} className="px-5 py-2 text-sm rounded-xl border transition"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            Go Back
          </button>
        </div>
      </DashboardPageWrapper>
    );
  }

  const risk  = RISK_MAP[(appt.risk_level ?? caseDetail?.risk_level ?? '').toUpperCase()] ?? RISK_MAP.GREEN;
  const nSessions = history.length;
  const lastNote  = history[0] ?? null;
  const { ok: canAdvance, hint: validHint } = validate();

  return (
    <DashboardPageWrapper
      title="Conduct Session"
      subtitle="Document and close out this counseling session"
      backLink={{ href: '/appointments', label: 'Appointments' }}
    >
      <div className="max-w-3xl mx-auto space-y-4 pb-10">

        {/* ── Patient header ──────────────────────────────────────────────── */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-primary-muted)' }}>
              <User size={18} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>{appt.student_name}</h2>
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold" style={risk.style}>
                  {risk.icon} {risk.label}
                </span>
                {isPsy && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}>
                    Psychologist
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{appt.student_email ?? ''}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap" style={{ color: 'var(--color-text-secondary)' }}>
                {caseDetail?.case_number && <span className="font-mono font-medium">{caseDetail.case_number}</span>}
                <span className="flex items-center gap-1"><CalendarDays size={11} />{fmtDateTime(appt.scheduled_start ?? appt.preferred_date)}</span>
                <span className="flex items-center gap-1"><BookOpen size={11} />{nSessions} prior session{nSessions !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Step indicator ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {ALL_STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => i < stepIdx ? setStep(s.key) : undefined}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition"
                style={{
                  cursor: i < stepIdx ? 'pointer' : 'default',
                  ...(step === s.key
                    ? { background: 'var(--color-primary)', color: '#fff', boxShadow: 'var(--shadow-card)' }
                    : i < stepIdx
                      ? { background: 'var(--color-success-surface)', color: 'var(--color-success-text)' }
                      : { background: 'var(--color-bg)', color: 'var(--color-text-muted)' }),
                }}>
                {i < stepIdx
                  ? <Check size={11} />
                  : <span className="w-3.5 h-3.5 rounded-full border flex items-center justify-center" style={{ borderColor: 'currentColor', fontSize: '9px', fontWeight: 800 }}>{i + 1}</span>}
                {s.label}
              </button>
              {i < ALL_STEPS.length - 1 && <ChevronRight size={13} style={{ color: 'var(--color-border-strong)', flexShrink: 0 }} />}
            </div>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* STEP 1 — SESSION REVIEW                                         */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {step === 'review' && (
          <div className="space-y-4">
            {/* Case summary */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-3 px-5 py-3.5" style={{ background: 'var(--color-primary-surface)', borderBottom: '1px solid var(--color-border)' }}>
                <ClipboardList size={15} style={{ color: 'var(--color-primary)' }} />
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Case Overview</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: 'var(--color-border)' }}>
                {([
                  { label: 'Case #',      value: caseDetail?.case_number ?? '—' },
                  { label: 'Status',      value: caseDetail?.status ?? '—' },
                  { label: 'Opened',      value: fmtDate(caseDetail?.created_at) },
                  { label: 'Sessions',    value: String(nSessions) },
                ] as const).map(({ label, value }) => (
                  <div key={label} className="px-4 py-3" style={{ background: 'var(--color-surface)' }}>
                    <p className="text-xs uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
                  </div>
                ))}
              </div>
              {appt.concern && (
                <div className="px-5 py-3.5" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <p className="text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Presenting Concern</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>{appt.concern}</p>
                </div>
              )}
            </div>

            {/* Last session note */}
            {lastNote ? (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
                <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <div className="flex items-center gap-2">
                    <FileText size={14} style={{ color: 'var(--color-text-secondary)' }} />
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Last Session Note</p>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{fmtDate(lastNote.session_date)}</span>
                </div>
                <div className="p-5 space-y-3">
                  {lastNote.soap ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(['S','O','A','P'] as const).map(k => {
                        const v = lastNote.soap![k === 'S' ? 'subjective' : k === 'O' ? 'objective' : k === 'A' ? 'assessment' : 'plan'];
                        return v ? (
                          <div key={k} className="rounded-xl p-3" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                            <p className="text-xs font-black uppercase mb-1" style={{ color: 'var(--color-primary)' }}>{k}</p>
                            <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--color-text-secondary)' }}>{v}</p>
                          </div>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No SOAP note on record for last session.</p>
                  )}
                  {lastNote.mood_rating != null && (
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Last mood: <strong style={{ color: 'var(--color-text-primary)' }}>{lastNote.mood_rating}/10</strong>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl px-5 py-4 flex items-center gap-3" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                <FileText size={16} style={{ color: 'var(--color-text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No previous session notes — this is the first session.</p>
              </div>
            )}

            {/* Today's appointment info */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <CalendarDays size={14} style={{ color: 'var(--color-text-secondary)' }} />
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Today&apos;s Session</p>
              </div>
              <div className="px-5 py-4 flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Date & Time</p>
                  <p style={{ color: 'var(--color-text-primary)' }}>{fmtDateTime(appt.scheduled_start ?? appt.preferred_date)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Method</p>
                  <p style={{ color: 'var(--color-text-primary)' }}>{appt.method ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Type</p>
                  <p style={{ color: 'var(--color-text-primary)' }}>{isPsy ? 'Psychological Counseling' : 'Counseling Session'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* STEP 2 — PRE-SESSION CHECK-IN                                   */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {step === 'checkin' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ background: 'var(--color-primary-surface)', borderBottom: '1px solid var(--color-border)' }}>
              <Stethoscope size={15} style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Pre-Session Check-in</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Quick intake before the session begins</p>
              </div>
            </div>

            <div className="p-5 space-y-7">
              {/* Mood Rating */}
              <div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--color-text-primary)' }}>
                  Mood Rating <span style={{ color: 'var(--color-danger)' }}>*</span>
                </p>
                <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>1 = very low · 10 = excellent</p>
                <div className="flex gap-2 flex-wrap">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} onClick={() => setMoodRating(n)}
                      className="w-11 h-11 rounded-xl text-sm font-bold transition-all"
                      style={{
                        cursor: 'pointer',
                        ...(moodRating === n
                          ? { background: 'var(--color-primary)', color: '#fff', boxShadow: 'var(--shadow-card)' }
                          : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }),
                      }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Distress Level */}
              <div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--color-text-primary)' }}>
                  Distress Level (SUD) <span style={{ color: 'var(--color-danger)' }}>*</span>
                </p>
                <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>0 = no distress · 10 = extreme distress</p>
                <div className="flex gap-2 flex-wrap">
                  {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} onClick={() => setDistressLevel(n)}
                      className="w-11 h-11 rounded-xl text-sm font-bold transition-all"
                      style={{
                        cursor: 'pointer',
                        ...(distressLevel === n
                          ? { background: n >= 7 ? '#DC2626' : n >= 4 ? '#D97706' : 'var(--color-success)', color: '#fff', boxShadow: 'var(--shadow-card)' }
                          : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }),
                      }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Today's concern */}
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                  Today&apos;s Presenting Concern <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <textarea
                  value={presentingConcern}
                  onChange={e => setPresentingConcern(e.target.value)}
                  placeholder="What does the client want to address in today's session?"
                  rows={3}
                  className={TA}
                  style={TA_S}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              {/* Notable changes */}
              <div>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Notable Changes Since Last Session
                  <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>optional</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {CHANGES.map(c => {
                    const sel = notableChanges.includes(c);
                    return (
                      <button key={c} onClick={() => setNotableChanges(p => sel ? p.filter(x => x !== c) : [...p, c])}
                        className="px-3 py-2 rounded-full text-xs font-semibold transition-all border"
                        style={{
                          cursor: 'pointer',
                          ...(sel
                            ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                            : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }),
                        }}>
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* STEP 3 — SOAP NOTES                                             */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {step === 'soap' && (
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-3 px-5 py-4" style={{ background: 'var(--color-primary-surface)', borderBottom: '1px solid var(--color-border)' }}>
                <FileText size={15} style={{ color: 'var(--color-primary)' }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Session Notes — SOAP Format</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>All four fields are required</p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                {([
                  { key: 'S', label: 'Subjective', val: soapS, set: setSoapS, ph: "Client's own words, self-report, complaints, what they present today…" },
                  { key: 'O', label: 'Objective',  val: soapO, set: setSoapO, ph: 'Behavioral observations: affect, mood, appearance, speech, eye contact…' },
                  { key: 'A', label: 'Assessment', val: soapA, set: setSoapA, ph: 'Clinical impression, progress toward goals, formulation, risk…' },
                  { key: 'P', label: 'Plan',       val: soapP, set: setSoapP, ph: 'Next session focus, homework assigned, referrals, goals, frequency…' },
                ] as const).map(({ key, label, val, set, ph }) => (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                        style={{ background: 'var(--color-primary)', color: '#fff' }}>{key}</span>
                      <label className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {label} <span style={{ color: 'var(--color-danger)' }}>*</span>
                      </label>
                    </div>
                    <textarea value={val} onChange={e => set(e.target.value)} placeholder={ph} rows={4}
                      className={TA} style={TA_S}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')} />
                  </div>
                ))}

                {/* Psychologist extra field — separate state, not a duplicate */}
                {isPsy && (
                  <div className="rounded-xl p-4" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary)' }}>
                    <p className="text-xs font-bold uppercase mb-0.5" style={{ color: 'var(--color-primary)' }}>Psychological Assessment Notes</p>
                    <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Instruments used, diagnostic formulation, clinical impressions</p>
                    <textarea value={psyNotes} onChange={e => setPsyNotes(e.target.value)} rows={4}
                      placeholder="e.g. BDI-II score 18 (moderate), SCL-90-R administered, impressions…"
                      className={TA} style={{ ...TA_S, minHeight: '100px' }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')} />
                  </div>
                )}
              </div>
            </div>

            {/* Themes + duration */}
            <div className="rounded-2xl p-5 space-y-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
              <div>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Themes Addressed
                  <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>optional</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {THEMES.map(t => {
                    const sel = themes.includes(t);
                    return (
                      <button key={t} onClick={() => setThemes(p => sel ? p.filter(x => x !== t) : [...p, t])}
                        className="px-3 py-2 rounded-full text-xs font-semibold transition-all border"
                        style={{
                          cursor: 'pointer',
                          ...(sel
                            ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                            : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }),
                        }}>
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                  Session Duration
                  <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>minutes, optional</span>
                </label>
                <input type="number" min={1} max={240} value={duration}
                  onChange={e => setDuration(e.target.value)} placeholder="e.g. 50"
                  className="px-3 py-2.5 text-sm rounded-xl outline-none w-32"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', cursor: 'text' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')} />
              </div>
            </div>

            {/* Risk flag */}
            <button
              onClick={() => setRiskFlagged(v => !v)}
              className="w-full rounded-2xl p-5 text-left transition-all"
              style={{
                cursor: 'pointer',
                background: riskFlagged ? '#FEF2F2' : 'var(--color-surface)',
                border: `1px solid ${riskFlagged ? '#FECACA' : 'var(--color-border)'}`,
                boxShadow: 'var(--shadow-card)',
              }}>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                  style={riskFlagged
                    ? { background: '#DC2626', border: '2px solid #DC2626' }
                    : { background: 'var(--color-bg)', border: '2px solid var(--color-border)' }}>
                  {riskFlagged && <Check size={12} color="white" />}
                </div>
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: riskFlagged ? '#B91C1C' : 'var(--color-text-primary)' }}>
                    <TriangleAlert size={13} />
                    Flag this session as High Risk
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: riskFlagged ? '#DC2626' : 'var(--color-text-muted)' }}>
                    Supervisor and case manager will be notified
                  </p>
                </div>
              </div>
              {riskFlagged && (
                <div className="mt-3" onClick={e => e.stopPropagation()}>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#B91C1C' }}>Risk Notes</p>
                  <textarea value={riskNotes} onChange={e => setRiskNotes(e.target.value)}
                    placeholder="Describe the risk concern, any safety planning discussed…"
                    rows={3} className={TA} style={{ ...TA_S, borderColor: '#FECACA' }} />
                </div>
              )}
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* STEP 4 — OUTCOME                                                */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {step === 'outcome' && (
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-3 px-5 py-4" style={{ background: 'var(--color-primary-surface)', borderBottom: '1px solid var(--color-border)' }}>
                <Target size={15} style={{ color: 'var(--color-primary)' }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Session Outcome <span style={{ color: 'var(--color-danger)' }}>*</span></p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>What happens next for this client?</p>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {OUTCOME_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setOutcome(opt.value as typeof outcome)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left"
                    style={{
                      cursor: 'pointer',
                      ...(outcome === opt.value
                        ? { background: 'var(--color-primary-surface)', borderColor: 'var(--color-primary)' }
                        : { background: 'var(--color-bg)', borderColor: 'var(--color-border)' }),
                    }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={outcome === opt.value
                        ? { background: 'var(--color-primary)', color: '#fff' }
                        : { background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                      {opt.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{opt.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{opt.desc}</p>
                    </div>
                    {outcome === opt.value && <CheckCircle2 size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />}
                  </button>
                ))}
              </div>

              {outcome === 'continue' && (
                <div className="px-5 pb-5 pt-4 space-y-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Recommended Follow-up Interval</p>
                  <div className="flex gap-2 flex-wrap">
                    {INTERVAL_OPTIONS.map(opt => (
                      <button key={opt} onClick={() => setFollowInterval(opt)}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all"
                        style={{
                          cursor: 'pointer',
                          ...(followInterval === opt
                            ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                            : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }),
                        }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {outcome === 'refer' && (
                <div className="px-5 pb-5 pt-4 space-y-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <div className="flex gap-2">
                    {(['internal', 'external'] as const).map(t => (
                      <button key={t} onClick={() => setReferralType(t)}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all"
                        style={{
                          cursor: 'pointer',
                          ...(referralType === t
                            ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                            : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }),
                        }}>
                        {t === 'internal' ? 'Internal (C2C)' : 'External'}
                      </button>
                    ))}
                  </div>
                  <textarea value={referralNotes} onChange={e => setReferralNotes(e.target.value)} rows={3}
                    placeholder="Referral reason, target professional or service…"
                    className={TA} style={TA_S}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')} />
                </div>
              )}

              {outcome === 'close' && (
                <div className="px-5 pb-5 pt-4 space-y-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <div className="rounded-xl p-3 flex gap-2" style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' }}>
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
                    <p className="text-xs" style={{ color: 'var(--color-warning-text)' }}>
                      This moves the case to <strong>Pending Termination</strong>. A formal review is required before full closure.
                    </p>
                  </div>
                  <textarea value={closureNotes} onChange={e => setClosureNotes(e.target.value)} rows={3}
                    placeholder="Reason for closure, summary of progress, final recommendations…"
                    className={TA} style={TA_S}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')} />
                </div>
              )}
            </div>

            {/* Risk level update */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Update Risk Level</p>
              <div className="flex gap-2 flex-wrap">
                {([
                  { value: 'keep',       label: 'Keep Current', bg: 'var(--color-bg)',  text: 'var(--color-text-secondary)', border: 'var(--color-border)' },
                  { value: 'escalate',   label: 'Escalate',     bg: '#FEF2F2',          text: '#B91C1C',                     border: '#FECACA' },
                  { value: 'deescalate', label: 'De-escalate',  bg: '#F0FDF4',          text: '#15803D',                     border: '#BBF7D0' },
                ] as const).map(opt => (
                  <button key={opt.value} onClick={() => setRiskUpdate(opt.value)}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all"
                    style={{
                      cursor: 'pointer',
                      ...(riskUpdate === opt.value
                        ? { background: opt.bg, color: opt.text, borderColor: opt.border, boxShadow: 'var(--shadow-card)' }
                        : { background: 'var(--color-bg)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }),
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Navigation footer ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <button
            onClick={() => {
              const i = ALL_STEPS.findIndex(s => s.key === step);
              if (i > 0) setStep(ALL_STEPS[i - 1].key);
              else router.push('/appointments');
            }}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl border transition"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            ← {stepIdx === 0 ? 'Back to Appointments' : 'Previous'}
          </button>

          <div className="flex items-center gap-3">
            {!canAdvance && (
              <span className="flex items-center gap-1.5 text-xs hidden sm:flex" style={{ color: 'var(--color-text-muted)' }}>
                <Info size={12} style={{ flexShrink: 0 }} />
                {validHint}
              </span>
            )}

            {submitError && (
              <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{submitError}</p>
            )}

            {isLast ? (
              <button onClick={handleSubmit} disabled={!canAdvance || submitting}
                className="flex items-center gap-2 px-6 py-2.5 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50"
                style={{ background: 'var(--color-primary)', cursor: !canAdvance || submitting ? 'not-allowed' : 'pointer' }}>
                {submitting
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : <><CheckCircle2 size={14} /> Complete Session</>}
              </button>
            ) : (
              <button onClick={goNext} disabled={!canAdvance}
                className="flex items-center gap-2 px-6 py-2.5 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50"
                style={{ background: 'var(--color-primary)', cursor: !canAdvance ? 'not-allowed' : 'pointer' }}>
                Next <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

      </div>
    </DashboardPageWrapper>
  );
}
