'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import {
  Loader2, Check, ChevronRight, ChevronLeft, User, AlertTriangle, Shield,
  Activity, ShieldAlert, FileText, CalendarDays, BookOpen, CheckCircle2, Info,
  ClipboardList, Monitor,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────
type Step = 'review' | 'context' | 'subjective' | 'objective' | 'assessment' | 'plan';

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
  preferred_method?: string;
  risk_level?: string;
}

interface CaseDetail {
  _id: string;
  case_number?: string;
  risk_level?: string;
  status?: string;
  created_at?: string;
  presenting_issue?: string;
  primary_concern?: string;
  intake_counselor_name?: string;
  counselor_name?: string;
  student?: {
    name?: string;
    email?: string;
    school_id?: string;
    college?: string;
    course?: string;
    year_level?: string;
  };
}

interface SessionNote {
  note_id?: string;
  _id?: string;
  session_date: string;
  soap?: { subjective?: string; objective?: string; assessment?: string; plan?: string };
  mood_rating?: number;
  risk_flagged?: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const RISK_MAP: Record<string, { label: string; icon: React.ReactNode; style: React.CSSProperties }> = {
  GREEN:    { label: 'Low Risk',      icon: <Shield size={12} />,        style: { background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' } },
  YELLOW:   { label: 'Moderate Risk', icon: <Activity size={12} />,      style: { background: '#FEFCE8', color: '#A16207', border: '1px solid #FDE047' } },
  RED:      { label: 'High Risk',     icon: <AlertTriangle size={12} />, style: { background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' } },
  CRITICAL: { label: 'Critical',      icon: <ShieldAlert size={12} />,   style: { background: '#FEE2E2', color: '#7F1D1D', border: '1px solid #FCA5A5' } },
};

function fmtDate(s?: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateTime(s?: string) {
  if (!s) return new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  const d = new Date(s);
  return d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: '2-digit', day: '2-digit', year: 'numeric' })
    + ', ' + d.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true });
}

// ── Reusable UI ──────────────────────────────────────────────────────────────
function SectionHeader({ letter, title, color }: { letter: string; title: string; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm flex-shrink-0"
        style={{ background: color }}>
        {letter}
      </div>
      <h3 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>{title}</h3>
    </div>
  );
}

function FieldLabel({ children, required, note }: { children: React.ReactNode; required?: boolean; note?: string }) {
  return (
    <div className="mb-2">
      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
        {children}{required && <span className="text-red-500 ml-0.5">*</span>}
      </p>
      {note && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{note}</p>}
    </div>
  );
}

function CheckboxGroup({
  options, selected, onChange, otherValue, onOtherChange,
}: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void;
  otherValue?: string; onOtherChange?: (v: string) => void;
}) {
  const toggle = (opt: string) =>
    onChange(selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt]);
  return (
    <div className="space-y-1.5">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => toggle(opt)}
          className="w-full flex items-start gap-2.5 px-3 py-2 text-xs text-left rounded-lg border transition"
          style={selected.includes(opt)
            ? { background: 'var(--color-primary-surface)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }
            : { background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
          <span className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center mt-0.5"
            style={selected.includes(opt)
              ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }
              : { borderColor: 'var(--color-border)' }}>
            {selected.includes(opt) && <Check size={10} color="white" />}
          </span>
          <span className="leading-relaxed">{opt}</span>
        </button>
      ))}
      {selected.includes('Other') && onOtherChange && (
        <input type="text" value={otherValue || ''} onChange={e => onOtherChange(e.target.value)}
          placeholder="Please specify..."
          className="w-full px-3 py-2 text-xs rounded-lg border outline-none"
          style={{ background: 'var(--color-bg)', borderColor: 'var(--color-primary)', color: 'var(--color-text)' }} />
      )}
    </div>
  );
}

function RadioGroup({
  options, value, onChange,
}: {
  options: { value: string; label: string; desc?: string }[];
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      {options.map(opt => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className="w-full flex items-start gap-2.5 px-3 py-2.5 text-xs text-left rounded-lg border transition"
          style={value === opt.value
            ? { background: 'var(--color-primary-surface)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)', cursor: 'pointer' }
            : { background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
          <span className="w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center"
            style={value === opt.value
              ? { borderColor: 'var(--color-primary)' }
              : { borderColor: 'var(--color-border)' }}>
            {value === opt.value && (
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)' }} />
            )}
          </span>
          <span>
            <span className="font-semibold">{opt.label}</span>
            {opt.desc && <span className="block mt-0.5 font-normal opacity-75"> – {opt.desc}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Constants ────────────────────────────────────────────────────────────────
const STEPS: { key: Step; label: string }[] = [
  { key: 'review',     label: 'Case Review' },
  { key: 'context',    label: 'Session Context' },
  { key: 'subjective', label: 'S — Subjective' },
  { key: 'objective',  label: 'O — Objective' },
  { key: 'assessment', label: 'A — Assessment' },
  { key: 'plan',       label: 'P — Plan' },
];

const CLIENT_MOODS = [
  'Calm – feels relaxed and at ease',
  'Happy / Cheerful – positive, content, or uplifted',
  'Neutral – neither good nor bad; steady',
  'Anxious / Nervous – worried or tense',
  'Sad / Low – down or discouraged',
  'Irritable / Frustrated – easily annoyed or upset',
  'Angry – experiencing anger or resentment',
  'Tired / Fatigued – lacking energy or motivation',
  'Stressed / Overwhelmed – burdened by pressure or demands',
  'Hopeful – optimistic about situation or future',
  'Motivated – focused and driven to act',
  'Other',
];

const CLIENT_CONCERNS = [
  'Academic / Performance Concerns – difficulties with studies, workload, or motivation',
  'Adjustment Issues – trouble adapting to new environment or life changes',
  'Anxiety / Stress – excessive worry, pressure, or restlessness',
  'Career / Decision-Making – uncertainty about choices or direction',
  'Depression / Low Mood – sadness, loss of interest, or hopelessness',
  'Family Concerns – conflict, communication, or relationship strain at home',
  'Financial Stress – monetary strain affecting functioning',
  'Interpersonal / Relationship Issues – friendship, romantic, or peer conflicts',
  'Self-Esteem / Self-Confidence – feelings of inadequacy or low self-worth',
  'Grief / Loss – bereavement or emotional distress from loss',
  'Identity / Self-Concept – confusion or exploration of self or gender identity',
  'Trauma / Past Experiences – distress related to previous events',
  'Health / Medical Concerns – illness, fatigue, or psychosomatic complaints',
  'Time Management / Productivity – difficulty balancing tasks or meeting deadlines',
  'Motivation / Goal Setting – struggles initiating or sustaining effort',
  'Other',
];

const COPING_STRATEGIES = [
  'Seeking social support – talking to friends, family, or peers',
  'Problem-solving – planning or taking steps to address issues',
  'Positive reframing – focusing on lessons or growth from challenges',
  'Relaxation / Mindfulness – breathing, meditation, or grounding exercises',
  'Spiritual / Faith-based practices – prayer, reflection, or attending services',
  'Engaging in hobbies – music, art, sports, reading, etc.',
  'Physical activity – exercise or movement to manage stress',
  'Time management / Organization – structuring tasks or priorities',
  'Avoidance / Withdrawal – escaping or avoiding the issue',
  'Suppression / Denial – minimizing or pushing away emotions',
  'Substance use – alcohol, smoking, or drugs for relief',
  'Self-care routines – rest, healthy eating, journaling, breaks',
  'Other',
];

const SI_SHI_OPTIONS = [
  { value: 'denied',       label: 'Denied',       desc: 'client clearly reports no suicidal or self-harm thoughts' },
  { value: 'passive',      label: 'Passive',       desc: 'vague thoughts but no intent or plan' },
  { value: 'active',       label: 'Active',        desc: 'current suicidal or self-harm thoughts reported' },
  { value: 'not_assessed', label: 'Not assessed',  desc: 'topic not covered this session' },
];

const APPEARANCE_OPTIONS = [
  'Appropriate – suitable for the setting and occasion',
  'Neat – clean and well-groomed',
  'Casual – relaxed but tidy appearance',
  'Disheveled – messy, wrinkled, or unkempt look',
  'Fatigued – appears tired or lacking energy',
  'Tearful – appears emotional or crying during session',
  'Other',
];

const AFFECT_OPTIONS = [
  'Appropriate – affect matches situation or discussion content',
  'Calm / Stable – relaxed, steady emotional tone',
  'Neutral – even, without strong emotion',
  'Anxious / Tense – restless or uneasy presentation',
  'Sad / Depressed – subdued, low affect',
  'Irritable / Angry – easily annoyed or reactive tone',
  'Flat / Blunted – minimal or no visible emotional expression',
  'Tearful / Labile – emotional or shifts mood quickly',
  'Euphoric / Elevated – unusually cheerful or high energy',
  'Other',
];

const BEHAVIOR_OPTIONS = [
  'Calm / Cooperative – engaged and responsive during session',
  'Attentive – focused and shows interest in discussion',
  'Restless / Fidgety – moves frequently, appears tense or uneasy',
  'Agitated / Irritable – visibly frustrated or reactive',
  'Withdrawn / Guarded – quiet, distant, or hesitant to speak',
  'Tearful / Emotional – crying or easily moved to tears',
  'Distracted / Inattentive – difficulty maintaining focus',
  'Disorganized – behavior appears scattered or inconsistent',
  'Lethargic / Low Energy – slow or tired in movements and response',
  'Other',
];

const SPEECH_OPTIONS = [
  'Normal / Coherent – clear, logical, and easy to follow',
  'Goal-directed – focused, stays on topic',
  'Circumstantial – includes unnecessary details but eventually answers',
  'Tangential – drifts off topic and does not return',
  'Flight of ideas – rapidly shifts between loosely related topics',
  'Disorganized – illogical or hard to follow',
  'Thought blocking – sudden pause or loss of train of thought',
  'Perseverative – repeats same idea or phrase',
  'Racing thoughts – rapid, pressured flow of ideas',
  'Poverty of thought – minimal or limited content',
  'Other',
];

const PROGRESS_OPTIONS = [
  { value: 'improved',          label: 'Improved',          desc: 'noticeable positive change in mood, coping, or functioning since last session' },
  { value: 'slightly_improved', label: 'Slightly Improved', desc: 'minor positive changes, though issues are still present' },
  { value: 'no_change',         label: 'No Change',         desc: 'condition or behavior remains generally the same' },
  { value: 'declined',          label: 'Declined',          desc: 'mood, symptoms, or functioning have worsened compared to the previous session' },
  { value: 'other',             label: 'Other',             desc: '' },
];

const MAIN_ISSUES_OPTIONS = [
  'Stress Management – difficulty handling academic, work, or personal stressors',
  'Anxiety Symptoms – excessive worry, restlessness, or physiological tension',
  'Depressive Symptoms – low mood, hopelessness, or loss of motivation/interest',
  'Relationship Conflict – interpersonal or family tension, communication issues',
  'Adjustment Issues – trouble adapting to change or new circumstances',
  'Academic / Work Concerns – poor performance, burnout, or lack of focus',
  'Self-Esteem / Self-Concept – low confidence or negative self-perception',
  'Identity / Personal Development – confusion or exploration of personal, gender, or career identity',
  'Trauma-Related Distress – emotional impact from past adverse experiences',
  'Grief / Loss – emotional distress following bereavement or major loss',
  'Health / Fatigue – physical illness, psychosomatic concerns, or exhaustion',
  'Motivation / Goal Setting – difficulty initiating or sustaining effort',
  'Time Management / Productivity – struggle to balance responsibilities',
  'Other',
];

const RISK_LEVEL_OPTIONS = [
  { value: 'low',      label: 'Low Risk',      desc: 'fleeting thoughts, no plan or intent, protective factors identified' },
  { value: 'moderate', label: 'Moderate Risk', desc: 'ideation with some intent but no plan; partial protective factors' },
  { value: 'high',     label: 'High Risk',     desc: 'active plan or intent, recent attempt, limited protective factors' },
  { value: 'na',       label: 'N/A',           desc: 'not applicable (risk not present or not assessed this session)' },
];

const CLINICAL_IMPRESSION_OPTIONS = [
  'Client demonstrates progress – shows improvement in mood, coping, or insight',
  'Stable functioning – no significant change; maintains current coping level',
  'Mild distress – manageable symptoms; able to function with some difficulty',
  'Moderate distress – noticeable impact on functioning; requires ongoing support',
  'Severe distress – significant impairment in daily functioning or emotional regulation',
  'Insight present – recognizes thoughts, emotions, or behaviors contributing to issues',
  'Limited insight – minimal awareness or denial of contributing factors',
  'Engaged in session – participative, reflective, and responsive to interventions',
  'Minimally engaged – quiet, withdrawn, or resistant during session',
  'No immediate safety risk – denies suicidal or self-harm thoughts',
  'Safety concern identified – refer to C-SSRS and note safety actions',
  'Follow-up required – schedule next session or coordinate with support system',
  'Referral recommended – consider internal/external referral',
  'Other',
];

const INTERVENTIONS_OPTIONS = [
  'Acceptance and Commitment Therapy (ACT)',
  'Cognitive-Behavioral Therapy (CBT)',
  'Creative / Expressive Arts Therapy',
  'Dialectical Behavior Therapy (DBT)',
  'Family / Systems-Based Approach',
  'Interpersonal Therapy (IPT)',
  'Mindfulness-Based Intervention (MBI)',
  'Motivational Interviewing (MI)',
  'Narrative Therapy (NT)',
  'Person-Centered Therapy (PCT)',
  'Psychoeducation',
  'Solution-Focused Brief Therapy (SFBT)',
  'Supportive Counseling',
  'Other',
];

const HOMEWORK_OPTIONS = [
  'Reflection or journaling activity',
  'Practice mindfulness or relaxation techniques',
  'Apply coping strategies discussed',
  'Communicate with identified support person',
  'Complete self-care or study plan',
  'Other',
];

const NEXT_FOCUS_OPTIONS = [
  'Follow-up on previous commitments or tasks',
  'Continue current goals or interventions',
  'Introduce or strengthen coping strategies / skills',
  'Explore emotions or manage stressors',
  'Review progress toward academic, personal, or relational goals',
  'Build insight or self-understanding',
  'Enhance communication or relationship skills',
  'Plan for academic, career, or life transitions',
  'Maintain progress / prevent relapse',
  'Other',
];

const FOLLOWUP_OPTIONS = [
  'Schedule next counseling session',
  'Client to complete assigned activity or reflection task',
  'Follow-up via email / message / check-in',
  'Referred to CPS psychologist for psychotherapy',
  'Referred to other university office (e.g., HSO, SDFO, OAS)',
  'No follow-up or referral needed – client informed to reach out when needed',
  'Other',
];

const CASE_STATUS_OPTIONS = [
  { value: 'ongoing',    label: 'Ongoing',                    desc: 'counseling/psychotherapy sessions are continuing' },
  { value: 'on_hold',    label: 'On Hold',                    desc: 'sessions temporarily paused (e.g., scheduling or personal reasons)' },
  { value: 'referred',   label: 'Referred',                   desc: 'client referred to another CPS counselor, psychologist, or external provider' },
  { value: 'terminated', label: 'Terminated / Closed',        desc: 'counseling/psychotherapy relationship formally concluded' },
  { value: 'no_further', label: 'No further sessions needed', desc: 'client informed they may return if future support is needed' },
  { value: 'other',      label: 'Other',                      desc: '' },
];

// ── Component ────────────────────────────────────────────────────────────────
export default function CounselorSessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [appt, setAppt]           = useState<ApptDetail | null>(null);
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [history, setHistory]     = useState<SessionNote[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState('');
  const [userRole, setUserRole]   = useState('');
  const [step, setStep]           = useState<Step>('review');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone]           = useState(false);
  const [hint, setHint]           = useState('');

  // ── Session Context ────────────────────────────────────────────────────────
  const [sessionMode, setSessionMode] = useState('');
  const [sessionNo, setSessionNo]     = useState('1');
  const [sessionNoOther, setSessionNoOther] = useState('');
  const [smartGoal, setSmartGoal]     = useState('');
  const [moodRating, setMoodRating]   = useState<number | null>(null);
  const [severity, setSeverity]       = useState('');

  // ── S — Subjective ─────────────────────────────────────────────────────────
  const [clientMoods, setClientMoods]           = useState<string[]>([]);
  const [clientMoodsOther, setClientMoodsOther] = useState('');
  const [clientConcerns, setClientConcerns]     = useState<string[]>([]);
  const [clientConcernsOther, setClientConcernsOther] = useState('');
  const [copingStrategies, setCopingStrategies] = useState<string[]>([]);
  const [copingOther, setCopingOther]           = useState('');
  const [siShi, setSiShi]                       = useState('');

  // ── O — Objective ──────────────────────────────────────────────────────────
  const [appearance, setAppearance]       = useState<string[]>([]);
  const [appearanceOther, setAppearanceOther] = useState('');
  const [affect, setAffect]               = useState<string[]>([]);
  const [affectOther, setAffectOther]     = useState('');
  const [behavior, setBehavior]           = useState<string[]>([]);
  const [behaviorOther, setBehaviorOther] = useState('');
  const [speechThought, setSpeechThought] = useState<string[]>([]);
  const [speechOther, setSpeechOther]     = useState('');

  // ── A — Assessment ─────────────────────────────────────────────────────────
  const [progress, setProgress]           = useState('');
  const [progressOther, setProgressOther] = useState('');
  const [mainIssues, setMainIssues]       = useState<string[]>([]);
  const [mainIssuesOther, setMainIssuesOther] = useState('');
  const [riskLevel, setRiskLevel]         = useState('');
  const [clinicalImpression, setClinicalImpression] = useState<string[]>([]);
  const [clinicalImpressionOther, setClinicalImpressionOther] = useState('');
  const [assessmentRemarks, setAssessmentRemarks] = useState('None');

  // ── P — Plan ───────────────────────────────────────────────────────────────
  const [interventions, setInterventions]       = useState<string[]>([]);
  const [interventionsOther, setInterventionsOther] = useState('');
  const [homework, setHomework]                 = useState<string[]>([]);
  const [homeworkOther, setHomeworkOther]       = useState('');
  const [nextFocus, setNextFocus]               = useState<string[]>([]);
  const [nextFocusOther, setNextFocusOther]     = useState('');
  const [followUp, setFollowUp]                 = useState<string[]>([]);
  const [followUpOther, setFollowUpOther]       = useState('');
  const [planRemarks, setPlanRemarks]           = useState('None');
  const [caseStatus, setCaseStatus]             = useState('');
  const [caseStatusOther, setCaseStatusOther]   = useState('');
  const [terminationSummary, setTerminationSummary] = useState('None');

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

      // Pre-fill mode from appointment method, default to onsite
      const method = (apptData.method || apptData.preferred_method || '').toLowerCase();
      if (method.includes('online') || method.includes('zoom') || method.includes('meet')) setSessionMode('online');
      else setSessionMode('onsite');

      if (apptData.case_id) {
        const [caseR, histR] = await Promise.all([
          fetch(api(`/api/cases/${apptData.case_id}`), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(api(`/api/counseling/case/${apptData.case_id}/session-history`), { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (caseR.ok)  { const cd = await caseR.json();  setCaseDetail(cd.case ?? cd); }
        if (histR.ok) {
          const hd = await histR.json();
          const sessions = hd.sessions ?? [];
          setHistory(sessions.slice(0, 3));
          const nextNum = sessions.length + 1;
          setSessionNo(nextNum <= 5 ? String(nextNum) : 'other');
          if (nextNum > 5) setSessionNoOther(String(nextNum));
        }
      }
    } catch {
      setLoadError('Failed to load session data.');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  const stepIdx  = STEPS.findIndex(s => s.key === step);
  const isPsy    = userRole.toUpperCase() === 'PSYCHOLOGIST';
  const lastNote = history[0] ?? null;
  const nSessions = history.length;
  const risk     = RISK_MAP[(appt?.risk_level ?? caseDetail?.risk_level ?? '').toUpperCase()] ?? RISK_MAP.GREEN;

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate(): { ok: boolean; hint: string } {
    switch (step) {
      case 'context':
        if (!sessionNo) return { ok: false, hint: 'Select a session number.' };
        if (sessionNo === 'other' && !sessionNoOther.trim()) return { ok: false, hint: 'Specify the session number.' };
        if (!smartGoal.trim()) return { ok: false, hint: 'Enter the counseling/psychotherapy goal (SMART).' };
        if (!moodRating) return { ok: false, hint: 'Select a mood rating (1–10).' };
        if (!severity) return { ok: false, hint: 'Select a severity level.' };
        return { ok: true, hint: '' };
      case 'subjective':
        if (!clientMoods.length) return { ok: false, hint: 'Select at least one mood descriptor.' };
        if (!clientConcerns.length) return { ok: false, hint: 'Select at least one client concern.' };
        if (!copingStrategies.length) return { ok: false, hint: 'Select at least one coping strategy.' };
        if (!siShi) return { ok: false, hint: 'Indicate suicidal/self-harm ideation status.' };
        return { ok: true, hint: '' };
      case 'objective':
        if (!appearance.length) return { ok: false, hint: 'Select at least one appearance observation.' };
        if (!affect.length) return { ok: false, hint: 'Select at least one affect/mood observation.' };
        if (!behavior.length) return { ok: false, hint: 'Select at least one behavior observation.' };
        if (!speechThought.length) return { ok: false, hint: 'Select at least one speech/thought process.' };
        return { ok: true, hint: '' };
      case 'assessment':
        if (!progress) return { ok: false, hint: 'Select progress since last session.' };
        if (!mainIssues.length) return { ok: false, hint: 'Select at least one main issue identified.' };
        if (!riskLevel) return { ok: false, hint: 'Select a risk level.' };
        if (!clinicalImpression.length) return { ok: false, hint: 'Select at least one clinical impression.' };
        return { ok: true, hint: '' };
      case 'plan':
        if (!interventions.length) return { ok: false, hint: 'Select at least one intervention used.' };
        if (!homework.length) return { ok: false, hint: 'Select at least one client commitment/homework.' };
        if (!nextFocus.length) return { ok: false, hint: 'Select at least one next session focus.' };
        if (!followUp.length) return { ok: false, hint: 'Select at least one follow-up/referral option.' };
        if (!caseStatus) return { ok: false, hint: 'Select a case status.' };
        return { ok: true, hint: '' };
      default:
        return { ok: true, hint: '' };
    }
  }

  function goNext() {
    const v = validate();
    if (!v.ok) { setHint(v.hint); return; }
    setHint('');
    if (stepIdx < STEPS.length - 1) setStep(STEPS[stepIdx + 1].key);
    else handleSubmit();
  }

  function goPrev() {
    setHint('');
    if (stepIdx > 0) setStep(STEPS[stepIdx - 1].key);
  }

  function arr(items: string[], other?: string): string {
    if (!items.length) return '—';
    return items.map(x => x === 'Other' && other?.trim() ? `Other: ${other.trim()}` : x).join('\n• ');
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!appt) return;
    setSubmitting(true);
    setSubmitError('');
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    try {
      const subjectiveText = [
        `Mood: • ${arr(clientMoods, clientMoodsOther)}`,
        `Concerns: • ${arr(clientConcerns, clientConcernsOther)}`,
        `Coping Strategies: • ${arr(copingStrategies, copingOther)}`,
        `SI/SHI: ${SI_SHI_OPTIONS.find(x => x.value === siShi)?.label ?? siShi}`,
      ].join('\n\n');

      const objectiveText = [
        `Appearance: • ${arr(appearance, appearanceOther)}`,
        `Affect/Mood: • ${arr(affect, affectOther)}`,
        `Behavior: • ${arr(behavior, behaviorOther)}`,
        `Speech/Thought: • ${arr(speechThought, speechOther)}`,
      ].join('\n\n');

      const assessmentText = [
        `Progress: ${PROGRESS_OPTIONS.find(x => x.value === progress)?.label ?? progress}${progress === 'other' && progressOther ? ` – ${progressOther}` : ''}`,
        `Main Issues: • ${arr(mainIssues, mainIssuesOther)}`,
        `Risk Level: ${RISK_LEVEL_OPTIONS.find(x => x.value === riskLevel)?.label ?? riskLevel}`,
        `Clinical Impression: • ${arr(clinicalImpression, clinicalImpressionOther)}`,
        assessmentRemarks !== 'None' ? `Remarks: ${assessmentRemarks}` : '',
      ].filter(Boolean).join('\n\n');

      const planText = [
        `Interventions: • ${arr(interventions, interventionsOther)}`,
        `Homework: • ${arr(homework, homeworkOther)}`,
        `Next Session Focus: • ${arr(nextFocus, nextFocusOther)}`,
        `Follow-up: • ${arr(followUp, followUpOther)}`,
        planRemarks !== 'None' ? `Remarks: ${planRemarks}` : '',
        `Case Status: ${CASE_STATUS_OPTIONS.find(x => x.value === caseStatus)?.label ?? caseStatus}`,
        terminationSummary !== 'None' ? `Termination Notes: ${terminationSummary}` : '',
      ].filter(Boolean).join('\n\n');

      const isHighRisk  = siShi === 'active' || riskLevel === 'high';
      const shouldClose = ['terminated', 'no_further'].includes(caseStatus);

      const purposeToSessionType = (p?: string) => {
        if (p === 'intake_interview') return 'INTAKE';
        if (p === 'follow_up') return 'FOLLOW_UP';
        if (p === 'others') return 'INDIVIDUAL';
        return 'INDIVIDUAL';
      };
      const derivedSessionType = purposeToSessionType(appt.purpose);

      // 1. Save session note
      if (appt.case_id) {
        const notePayload = {
          session_date: new Date().toISOString(),
          session_type: derivedSessionType,
          appointment_id: appt._id,
          note_format: 'SOAP',
          soap_subjective: subjectiveText,
          soap_objective:  objectiveText,
          soap_assessment: assessmentText,
          soap_plan:       planText,
          mood_rating:     moodRating,
          symptom_severity: severity,
          topics_discussed: mainIssues.join(', '),
          homework_assigned: homework.join(', '),
          risk_flagged: isHighRisk,
          risk_notes:   isHighRisk ? `SI/SHI: ${siShi}, Risk: ${riskLevel}` : '',
          structured_soap: {
            session_context: {
              session_date:   new Date().toISOString(),
              session_type:   derivedSessionType,
              mode:           sessionMode,
              session_number: sessionNo === 'other' ? sessionNoOther : sessionNo,
              mood_rating:    moodRating,
              severity,
              smart_goal:     smartGoal,
            },
            subjective: { client_moods: clientMoods, client_moods_other: clientMoodsOther, client_concerns: clientConcerns, client_concerns_other: clientConcernsOther, coping_strategies: copingStrategies, coping_other: copingOther, si_shi: siShi },
            objective:  { appearance, appearance_other: appearanceOther, affect, affect_other: affectOther, behavior, behavior_other: behaviorOther, speech_thought: speechThought, speech_other: speechOther },
            assessment: { progress, progress_other: progressOther, main_issues: mainIssues, main_issues_other: mainIssuesOther, risk_level: riskLevel, clinical_impression: clinicalImpression, clinical_impression_other: clinicalImpressionOther, remarks: assessmentRemarks },
            plan:       { interventions, interventions_other: interventionsOther, homework, homework_other: homeworkOther, next_focus: nextFocus, next_focus_other: nextFocusOther, follow_up: followUp, follow_up_other: followUpOther, remarks: planRemarks, case_status: caseStatus, case_status_other: caseStatusOther, termination_summary: terminationSummary },
          },
        };

        const nr = await fetch(api(`/api/counseling/case/${appt.case_id}/session-note`), {
          method: 'POST', headers, body: JSON.stringify(notePayload),
        });
        if (!nr.ok) {
          const err = await nr.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to save session note');
        }
      }

      // 2. Mark appointment attended
      await fetch(api(`/api/appointments/${appt._id}/set-evaluation`), {
        method: 'POST', headers, body: JSON.stringify({}),
      });

      // 3. Initiate closure if terminated
      if (shouldClose && appt.case_id) {
        await fetch(api(`/api/cases/${appt.case_id}`), {
          method: 'PUT', headers,
          body: JSON.stringify({ status: 'PENDING_TERMINATION', termination_notes: terminationSummary }),
        });
      }

      // 4. Escalate risk if high
      if (isHighRisk && appt.case_id) {
        await fetch(api(`/api/cases/${appt.case_id}`), {
          method: 'PUT', headers,
          body: JSON.stringify({ risk_level: 'RED' }),
        });
      }

      setDone(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading / Error ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardPageWrapper title="Conduct Session" subtitle="">
        <div className="flex items-center justify-center h-64 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading session data…
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

  // ── Done ────────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <DashboardPageWrapper title="Session Complete" subtitle="">
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--color-success-surface)' }}>
            <CheckCircle2 size={32} style={{ color: 'var(--color-success)' }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>Session Note Saved</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            The SOAP note has been recorded and the appointment has been marked as attended.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push('/appointments')}
              className="px-4 py-2 text-sm rounded-xl font-semibold border transition"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              Back to Appointments
            </button>
            {appt.case_id && (
              <button onClick={() => router.push(`/cases/${appt.case_id}?tab=session-notes`)}
                className="px-4 py-2 text-sm rounded-xl text-white font-semibold transition"
                style={{ background: 'var(--color-primary)', cursor: 'pointer' }}>
                View Case
              </button>
            )}
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <DashboardPageWrapper
      title="Conduct Session"
      subtitle="Complete the structured SOAP note for this session"
      backLink={{ href: '/appointments', label: 'Appointments' }}
    >
      <div className="max-w-3xl mx-auto space-y-4 pb-12">

        {/* Patient header */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-primary-muted)' }}>
              <User size={18} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{appt.student_name}</h2>
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold" style={risk.style}>
                  {risk.icon} {risk.label}
                </span>
                {isPsy && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}>
                    Psychologist
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{appt.student_email}</p>
              <div className="flex items-center gap-3 mt-1 text-xs flex-wrap" style={{ color: 'var(--color-text-secondary)' }}>
                {caseDetail?.case_number && <span className="font-mono font-medium">{caseDetail.case_number}</span>}
                <span className="flex items-center gap-1"><CalendarDays size={11} />{fmtDateTime(appt.scheduled_start ?? appt.preferred_date)}</span>
                <span className="flex items-center gap-1"><BookOpen size={11} />{nSessions} prior session{nSessions !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => i < stepIdx ? setStep(s.key) : undefined}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition"
                style={{
                  cursor: i < stepIdx ? 'pointer' : 'default',
                  ...(step === s.key
                    ? { background: 'var(--color-primary)', color: '#fff' }
                    : i < stepIdx
                      ? { background: 'var(--color-success-surface)', color: 'var(--color-success)' }
                      : { background: 'var(--color-bg)', color: 'var(--color-text-muted)' }),
                }}>
                {i < stepIdx
                  ? <Check size={11} />
                  : <span className="w-3.5 h-3.5 rounded-full border flex items-center justify-center"
                      style={{ borderColor: 'currentColor', fontSize: '9px', fontWeight: 800 }}>{i + 1}</span>}
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.key === 'review' ? 'Rev' : s.key === 'context' ? 'Ctx' : s.key.charAt(0).toUpperCase()}</span>
              </button>
              {i < STEPS.length - 1 && <ChevronRight size={13} style={{ color: 'var(--color-border)', flexShrink: 0 }} />}
            </div>
          ))}
        </div>

        {/* ── Step content ── */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>

          {/* ── STEP 1: CASE REVIEW ── */}
          {step === 'review' && (
            <div className="space-y-4">

              {/* ── Student Profile ── */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'var(--color-primary-surface)', borderBottom: '1px solid var(--color-border)' }}>
                  <User size={14} style={{ color: 'var(--color-primary)' }} />
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Student Profile</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-px" style={{ background: 'var(--color-border)' }}>
                  {[
                    { label: 'Name',       value: appt.student_name ?? caseDetail?.student?.name ?? '—' },
                    { label: 'Student No.', value: appt.student_id_number ?? caseDetail?.student?.school_id ?? '—' },
                    { label: 'Email',      value: appt.student_email ?? '—' },
                    { label: 'College',    value: caseDetail?.student?.college || '—' },
                    { label: 'Program',    value: caseDetail?.student?.course || '—' },
                    { label: 'Year Level', value: caseDetail?.student?.year_level || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-4 py-3" style={{ background: 'var(--color-surface)' }}>
                      <p className="text-xs uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
                      <p className="text-sm font-medium break-words" style={{ color: 'var(--color-text)' }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Intake Summary ── */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                  <div className="flex items-center gap-2">
                    <ClipboardList size={14} style={{ color: 'var(--color-text-secondary)' }} />
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Intake Summary</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border"
                      style={risk.style}>
                      {risk.icon} {risk.label}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full border font-medium"
                      style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                      {caseDetail?.status ?? '—'}
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Presenting Concern</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
                      {appt.concern || caseDetail?.presenting_issue || caseDetail?.primary_concern || '—'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-6 text-sm pt-1" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <div>
                      <p className="text-xs uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Case #</p>
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>{caseDetail?.case_number ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Opened</p>
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>{fmtDate(caseDetail?.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Sessions</p>
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>{nSessions}</p>
                    </div>
                    {caseDetail?.intake_counselor_name && (
                      <div>
                        <p className="text-xs uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Referred by (IC)</p>
                        <p className="font-medium" style={{ color: 'var(--color-text)' }}>{caseDetail.intake_counselor_name}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Last Session Note ── */}
              {lastNote ? (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <div className="flex items-center gap-2">
                      <FileText size={13} style={{ color: 'var(--color-text-secondary)' }} />
                      <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Last Session Note</p>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{fmtDate(lastNote.session_date)}</span>
                  </div>
                  <div className="p-4 space-y-3">
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
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No SOAP note on record for the last session.</p>
                    )}
                    {lastNote.mood_rating != null && (
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Last mood rating: <strong style={{ color: 'var(--color-text)' }}>{lastNote.mood_rating}/10</strong>
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl px-4 py-4 flex items-center gap-3"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                  <FileText size={16} style={{ color: 'var(--color-text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No previous session notes — this is the first session.</p>
                </div>
              )}

              {/* ── Today's Session ── */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <CalendarDays size={13} style={{ color: 'var(--color-text-secondary)' }} />
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Today&apos;s Session</p>
                </div>
                <div className="px-4 py-4 flex flex-wrap gap-6 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Date & Time</p>
                    <p style={{ color: 'var(--color-text)' }}>{fmtDateTime(appt.scheduled_start ?? appt.preferred_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Method</p>
                    <p style={{ color: 'var(--color-text)' }}>{appt.method ?? appt.preferred_method ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Type</p>
                    <p style={{ color: 'var(--color-text)' }}>{isPsy ? 'Psychological Counseling' : 'Counseling Session'}</p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ── STEP 2: SESSION CONTEXT ── */}
          {step === 'context' && (
            <div className="space-y-6">
              <h2 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>Session Context</h2>

              {/* Date & Time */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
                style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                <CalendarDays size={14} style={{ color: 'var(--color-primary)' }} />
                <span className="font-medium" style={{ color: 'var(--color-text)' }}>Date &amp; Time</span>
                <span className="ml-1">{fmtDateTime(appt.scheduled_start ?? appt.preferred_date)}</span>
              </div>

              {/* Mode of Session — read-only from appointment */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
                style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                <Monitor size={14} style={{ color: 'var(--color-primary)' }} />
                <span className="font-medium" style={{ color: 'var(--color-text)' }}>Mode</span>
                <span className="ml-1">{sessionMode === 'online' ? 'Online (Zoom, Google Meet, etc.)' : 'Onsite (Face-to-Face)'}</span>
              </div>

              {/* Mood Rating */}
              <div>
                <FieldLabel required note="1 = very low · 10 = excellent">Mood (1–10)</FieldLabel>
                <div className="flex gap-2 flex-wrap">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} type="button" onClick={() => setMoodRating(n)}
                      className="w-11 h-11 rounded-xl font-bold text-sm transition border"
                      style={{
                        cursor: 'pointer',
                        ...(moodRating === n
                          ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                          : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }),
                      }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity */}
              <div>
                <FieldLabel required>Severity</FieldLabel>
                <div className="flex gap-2 flex-wrap">
                  {['Minimal', 'Mild', 'Moderate', 'Severe'].map(s => (
                    <button key={s} type="button" onClick={() => setSeverity(s)}
                      className="px-4 py-2 rounded-xl text-sm font-medium transition border"
                      style={{
                        cursor: 'pointer',
                        ...(severity === s
                          ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                          : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }),
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Session No. */}
              <div>
                <FieldLabel required>Session No.</FieldLabel>
                <div className="flex gap-2 flex-wrap">
                  {['1','2','3','4','5','other'].map(n => (
                    <button key={n} type="button" onClick={() => setSessionNo(n)}
                      className="w-12 h-12 rounded-xl font-bold text-sm transition border"
                      style={{
                        cursor: 'pointer',
                        ...(sessionNo === n
                          ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                          : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }),
                      }}>
                      {n === 'other' ? 'Etc' : n}
                    </button>
                  ))}
                </div>
                {sessionNo === 'other' && (
                  <input type="number" min="6" value={sessionNoOther} onChange={e => setSessionNoOther(e.target.value)}
                    placeholder="Session number..." className="mt-2 w-40 px-3 py-2 text-sm rounded-lg border outline-none"
                    style={{ borderColor: 'var(--color-primary)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
                )}
              </div>

              {/* SMART Goal */}
              <div>
                <FieldLabel required note="State the specific goal or focus of this session using the SMART framework.">
                  Counseling/Psychotherapy Goal (SMART)
                </FieldLabel>
                <textarea value={smartGoal} onChange={e => setSmartGoal(e.target.value)} rows={4}
                  placeholder="e.g., Client will apply one relaxation or grounding technique during anxiety-provoking situations at least three times before the next session."
                  className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none resize-none"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
              </div>
            </div>
          )}

          {/* ── STEP 3: SUBJECTIVE ── */}
          {step === 'subjective' && (
            <div className="space-y-7">
              <SectionHeader letter="S" title="Subjective — Client's Report" color="#3B82F6" />

              <div>
                <FieldLabel required note="Select all that apply based on the client's self-report of their current mood.">
                  Client Describes Mood As
                </FieldLabel>
                <CheckboxGroup options={CLIENT_MOODS} selected={clientMoods} onChange={setClientMoods}
                  otherValue={clientMoodsOther} onOtherChange={setClientMoodsOther} />
              </div>

              <div>
                <FieldLabel required note="Select all that apply.">
                  Client Concerns / Presenting Issues
                </FieldLabel>
                <CheckboxGroup options={CLIENT_CONCERNS} selected={clientConcerns} onChange={setClientConcerns}
                  otherValue={clientConcernsOther} onOtherChange={setClientConcernsOther} />
              </div>

              <div>
                <FieldLabel required note="Select all that apply based on the client's self-report. Include both healthy and unhealthy coping strategies mentioned by the client.">
                  Coping Strategies Reported
                </FieldLabel>
                <CheckboxGroup options={COPING_STRATEGIES} selected={copingStrategies} onChange={setCopingStrategies}
                  otherValue={copingOther} onOtherChange={setCopingOther} />
              </div>

              <div>
                <FieldLabel required note='Note: If "Active" is selected, proceed to the Assessment (A) section to complete the C-SSRS Risk Level Assessment.'>
                  Suicidal or Self-Harm Ideation
                </FieldLabel>
                <RadioGroup options={SI_SHI_OPTIONS} value={siShi} onChange={setSiShi} />
              </div>
            </div>
          )}

          {/* ── STEP 4: OBJECTIVE ── */}
          {step === 'objective' && (
            <div className="space-y-7">
              <SectionHeader letter="O" title="Objective — Counselor's Observations" color="#10B981" />

              <div>
                <FieldLabel required note="Select all that apply.">Appearance</FieldLabel>
                <CheckboxGroup options={APPEARANCE_OPTIONS} selected={appearance} onChange={setAppearance}
                  otherValue={appearanceOther} onOtherChange={setAppearanceOther} />
              </div>

              <div>
                <FieldLabel required note="Select all that apply.">Affect / Mood</FieldLabel>
                <CheckboxGroup options={AFFECT_OPTIONS} selected={affect} onChange={setAffect}
                  otherValue={affectOther} onOtherChange={setAffectOther} />
              </div>

              <div>
                <FieldLabel required note="Select all that apply.">Behavior</FieldLabel>
                <CheckboxGroup options={BEHAVIOR_OPTIONS} selected={behavior} onChange={setBehavior}
                  otherValue={behaviorOther} onOtherChange={setBehaviorOther} />
              </div>

              <div>
                <FieldLabel required note="Select all that apply.">Speech / Thought Process</FieldLabel>
                <CheckboxGroup options={SPEECH_OPTIONS} selected={speechThought} onChange={setSpeechThought}
                  otherValue={speechOther} onOtherChange={setSpeechOther} />
              </div>
            </div>
          )}

          {/* ── STEP 5: ASSESSMENT ── */}
          {step === 'assessment' && (
            <div className="space-y-7">
              <SectionHeader letter="A" title="Assessment — Clinical Evaluation" color="#F59E0B" />

              <div>
                <FieldLabel required note="Select one that best describes the client's progress.">
                  Progress Since Last Session
                </FieldLabel>
                <RadioGroup options={PROGRESS_OPTIONS} value={progress} onChange={setProgress} />
                {progress === 'other' && (
                  <input type="text" value={progressOther} onChange={e => setProgressOther(e.target.value)}
                    placeholder="Describe progress..." className="mt-2 w-full px-3 py-2 text-xs rounded-lg border outline-none"
                    style={{ borderColor: 'var(--color-primary)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
                )}
              </div>

              <div>
                <FieldLabel required note="Select all key concerns discussed or observed during this session.">
                  Main Issues Identified
                </FieldLabel>
                <CheckboxGroup options={MAIN_ISSUES_OPTIONS} selected={mainIssues} onChange={setMainIssues}
                  otherValue={mainIssuesOther} onOtherChange={setMainIssuesOther} />
              </div>

              <div>
                <FieldLabel required note="Select one that best reflects the client's current risk status.">
                  Level of Risk – Based on C-SSRS and Clinical Evaluation
                </FieldLabel>
                <RadioGroup options={RISK_LEVEL_OPTIONS} value={riskLevel} onChange={setRiskLevel} />
              </div>

              <div>
                <FieldLabel required note="Select all that apply. You may add brief remarks below if needed.">
                  Clinical Impression
                </FieldLabel>
                <CheckboxGroup options={CLINICAL_IMPRESSION_OPTIONS} selected={clinicalImpression} onChange={setClinicalImpression}
                  otherValue={clinicalImpressionOther} onOtherChange={setClinicalImpressionOther} />
              </div>

              <div>
                <FieldLabel note="Add brief observations or key reflections from the session. Indicate 'None' if the checklist already captures all relevant details.">
                  Remarks
                </FieldLabel>
                <textarea value={assessmentRemarks} onChange={e => setAssessmentRemarks(e.target.value)} rows={3}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none resize-none"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
              </div>
            </div>
          )}

          {/* ── STEP 6: PLAN ── */}
          {step === 'plan' && (
            <div className="space-y-7">
              <SectionHeader letter="P" title="Plan — Next Steps" color="#8B5CF6" />

              <div>
                <FieldLabel required note="Select all that apply, evidence-based and integrative approaches applied during the session.">
                  Interventions Used in Session
                </FieldLabel>
                <CheckboxGroup options={INTERVENTIONS_OPTIONS} selected={interventions} onChange={setInterventions}
                  otherValue={interventionsOther} onOtherChange={setInterventionsOther} />
              </div>

              <div>
                <FieldLabel required note="Identify tasks, reflections, or actions the client agreed to do before the next session.">
                  Client Commitments / Homework (if applicable)
                </FieldLabel>
                <CheckboxGroup options={HOMEWORK_OPTIONS} selected={homework} onChange={setHomework}
                  otherValue={homeworkOther} onOtherChange={setHomeworkOther} />
              </div>

              <div>
                <FieldLabel required note="Select the intended focus or direction for the next counseling/psychotherapy session.">
                  Next Session Focus
                </FieldLabel>
                <CheckboxGroup options={NEXT_FOCUS_OPTIONS} selected={nextFocus} onChange={setNextFocus}
                  otherValue={nextFocusOther} onOtherChange={setNextFocusOther} />
              </div>

              <div>
                <FieldLabel required note="Select all that apply and specify details where needed.">
                  Follow-up and Referrals
                </FieldLabel>
                <CheckboxGroup options={FOLLOWUP_OPTIONS} selected={followUp} onChange={setFollowUp}
                  otherValue={followUpOther} onOtherChange={setFollowUpOther} />
              </div>

              <div>
                <FieldLabel note="Add brief notes related to the plan, next steps, or collaboration. Indicate 'None' if the checklist already captures all relevant details.">
                  Remarks
                </FieldLabel>
                <textarea value={planRemarks} onChange={e => setPlanRemarks(e.target.value)} rows={3}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none resize-none"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
              </div>

              <div>
                <FieldLabel required note="Indicate the current status of the counseling/psychotherapy case.">
                  Case Status / Termination
                </FieldLabel>
                <RadioGroup options={CASE_STATUS_OPTIONS} value={caseStatus} onChange={setCaseStatus} />
                {caseStatus === 'other' && (
                  <input type="text" value={caseStatusOther} onChange={e => setCaseStatusOther(e.target.value)}
                    placeholder="Specify status..." className="mt-2 w-full px-3 py-2 text-xs rounded-lg border outline-none"
                    style={{ borderColor: 'var(--color-primary)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
                )}
              </div>

              <div>
                <FieldLabel note="Briefly describe the reason for termination (e.g., goals met, client self-terminated, non-attendance, referred to psychologist, end of semester). Indicate 'None' if not applicable or 'Ongoing case not for termination yet' if the sessions are still in progress.">
                  Termination Summary / Remarks
                </FieldLabel>
                <textarea value={terminationSummary} onChange={e => setTerminationSummary(e.target.value)} rows={3}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none resize-none"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
              </div>
            </div>
          )}
        </div>

        {/* Hint / Error */}
        {hint && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)' }}>
            <Info size={14} className="flex-shrink-0" /> {hint}
          </div>
        )}
        {submitError && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>
            <AlertTriangle size={14} className="flex-shrink-0" /> {submitError}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={goPrev} disabled={stepIdx === 0}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border transition disabled:opacity-30"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', cursor: stepIdx === 0 ? 'not-allowed' : 'pointer' }}>
            <ChevronLeft size={16} /> Back
          </button>
          <button onClick={goNext} disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl text-white transition disabled:opacity-60"
            style={{ background: 'var(--color-primary)', cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : stepIdx === STEPS.length - 1
                ? <><Check size={14} /> Submit Session Note</>
                : <>Next <ChevronRight size={16} /></>}
          </button>
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
