'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { ICInterviewWizard } from '@/components/ICInterviewWizard';
import { api } from '@/utils/api';
import {
  Loader2, ChevronLeft, ChevronRight, CheckCircle2,
  AlertTriangle, ShieldAlert, Shield, Activity,
  FileText, Eye, Check, User, Pencil, Save, X,
  Users, ExternalLink, ClipboardList,
} from 'lucide-react';

// ── Assessments ────────────────────────────────────────────────────────────────
const PHQ9 = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
  'Trouble concentrating on things, such as reading the newspaper or watching television',
  'Moving or speaking so slowly that others noticed — or being so fidgety or restless you moved around a lot more than usual',
  'Thoughts that you would be better off dead, or of hurting yourself in some way',
];

const GAD7 = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it is hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid, as if something awful might happen',
];

const CSSRS = [
  { label: 'Passive Ideation',    text: 'Wished to be dead or to go to sleep and not wake up, without thoughts of killing themselves.' },
  { label: 'Active Ideation',     text: 'Had any thoughts of killing themselves, without a specific method.' },
  { label: 'With Method',         text: 'Has been thinking about how to kill themselves (e.g., taking pills, shooting, jumping).' },
  { label: 'With Intent',         text: 'Has had some intention of acting on thoughts of killing themselves.' },
  { label: 'With Plan',           text: 'Has a specific plan AND some intention to carry it out.' },
  { label: 'Behavior (Attempt)',  text: 'Has done anything, started to do anything, or prepared to end their life.' },
];

const FREQ = [
  { v: 0, s: 'Not at all' },
  { v: 1, s: 'Several days' },
  { v: 2, s: 'More than\nhalf days' },
  { v: 3, s: 'Nearly\nevery day' },
];

// ── Form input constants ───────────────────────────────────────────────────────
const IC = 'w-full px-3 py-2 text-sm rounded-lg outline-none';
const ICS: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };
const ICSSEL: React.CSSProperties = { ...ICS };

// ── Helpers ────────────────────────────────────────────────────────────────────
function phq9Sev(s: number): { label: string; style: React.CSSProperties } {
  if (s >= 20) return { label: 'Severe',     style: { color: '#991B1B', background: '#FEE2E2' } };
  if (s >= 15) return { label: 'Mod-Severe', style: { color: '#DC2626', background: '#FEF2F2' } };
  if (s >= 10) return { label: 'Moderate',   style: { color: '#92400E', background: '#FEF3C7' } };
  if (s >= 5)  return { label: 'Mild',       style: { color: '#92400E', background: '#FEF9C3' } };
  return               { label: 'Minimal',   style: { color: '#065F46', background: '#ECFDF5' } };
}
function gad7Sev(s: number): { label: string; style: React.CSSProperties } {
  if (s >= 15) return { label: 'Severe',   style: { color: '#991B1B', background: '#FEE2E2' } };
  if (s >= 10) return { label: 'Moderate', style: { color: '#92400E', background: '#FEF3C7' } };
  if (s >= 5)  return { label: 'Mild',     style: { color: '#92400E', background: '#FEF9C3' } };
  return               { label: 'Minimal', style: { color: '#065F46', background: '#ECFDF5' } };
}

// Risk badge uses fixed clinical hex colors — must not vary with theme
const RISK_BADGE_MAP: Record<string, { style: React.CSSProperties; icon: React.ReactNode; label: string }> = {
  GREEN:    { style: { background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' },   icon: <Shield size={13} />,        label: 'Code Green — Low Risk' },
  YELLOW:   { style: { background: '#FEFCE8', color: '#A16207', border: '1px solid #FDE047' },   icon: <Activity size={13} />,      label: 'Code Yellow — Moderate Risk' },
  RED:      { style: { background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' },   icon: <AlertTriangle size={13} />, label: 'Code Red — High Risk' },
  CRITICAL: { style: { background: '#FEE2E2', color: '#7F1D1D', border: '1px solid #FCA5A5' },   icon: <ShieldAlert size={13} />,   label: 'CRITICAL — Immediate Response' },
};

function RiskBadge({ risk }: { risk: string }) {
  const c = RISK_BADGE_MAP[risk] ?? RISK_BADGE_MAP.GREEN;
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold" style={c.style}>
      {c.icon}{c.label}
    </span>
  );
}

function ScoreChip({ label, score, max, sev }: {
  label: string;
  score: number | null;
  max: number;
  sev?: { label: string; style: React.CSSProperties };
}) {
  if (score === null) return (
    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
      <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p className="text-lg font-bold mt-1" style={{ color: 'var(--color-border-strong)' }}>—</p>
    </div>
  );
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        {score}<span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>/{max}</span>
      </p>
      {sev && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold mt-1 inline-block" style={sev.style}>{sev.label}</span>}
    </div>
  );
}

function fmtFreq(v: number) { return ['Not at all','Several days','More than half','Nearly every day'][v] ?? `${v}`; }

type Step = 'review' | 'phq9' | 'cssr_s' | 'gad7' | 'ic_doc' | 'route';

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ConductIntakePage() {
  const { id: intakeId } = useParams<{ id: string }>();
  const router = useRouter();

  const [intake, setIntake]     = useState<any>(null);
  const [packet, setPacket]     = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [step, setStep]         = useState<Step>('review');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState('');

  const [phq9, setPhq9] = useState<(number | null)[]>(Array(9).fill(null));
  const [gad7, setGad7] = useState<(number | null)[]>(Array(7).fill(null));
  const [cssr, setCssr] = useState<(boolean | null)[]>(Array(6).fill(null));
  const [riskOverride, setRiskOverride] = useState('');

  const [caseId, setCaseId] = useState('');
  const [icDocSaving, setIcDocSaving] = useState(false);
  const [icDocError, setIcDocError] = useState('');
  const [icDocSuccess, setIcDocSuccess] = useState(false);
  const [icDocDraft, setIcDocDraft] = useState<any>(null);

  const [referralMode, setReferralMode] = useState<'specific' | 'pool'>('pool');
  const [referralRole, setReferralRole] = useState<'COUNSELOR' | 'PSYCHOLOGIST'>('COUNSELOR');
  const [referralUserId, setReferralUserId] = useState('');
  const [referralUserOptions, setReferralUserOptions] = useState<{ _id: string; label: string }[]>([]);
  const [referralNote, setReferralNote] = useState('');
  const [referralSubmitting, setReferralSubmitting] = useState(false);
  const [referralDone, setReferralDone] = useState(false);

  const [editingPacket, setEditingPacket] = useState(false);
  const [savingPacket, setSavingPacket]   = useState(false);
  const [packetMsg, setPacketMsg]         = useState('');
  const [draftIcf, setDraftIcf]           = useState<Record<string, any>>({});
  const [draftSpif, setDraftSpif]         = useState<Record<string, any>>({});
  const [draftPhq4, setDraftPhq4]         = useState<(number | null)[]>([null, null, null, null]);

  const fetchIntake = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/intake/${intakeId}`), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const data = await r.json();
        setIntake(data);
        if (data.case_id) {
          setCaseId(String(data.case_id));
          setStep('ic_doc');
          return;
        }
        const apptId = data.appointment_id || intakeId;
        try {
          const pr = await fetch(api(`/api/intake/packet/${apptId}`), { headers: { Authorization: `Bearer ${token}` } });
          if (pr.ok) {
            const pd = await pr.json();
            if (pd.submitted !== false) { setPacket(pd); }
          }
        } catch {}
      }
    } finally { setLoading(false); }
  }, [intakeId]);

  useEffect(() => { fetchIntake(); }, [fetchIntake]);

  useEffect(() => {
    if (packet) {
      setDraftIcf(packet.icf || {});
      setDraftSpif(packet.spif || {});
      setDraftPhq4(Array.isArray(packet.phq4_responses) && packet.phq4_responses.length === 4
        ? packet.phq4_responses : [null, null, null, null]);
    }
  }, [packet]);

  useEffect(() => {
    if (step !== 'route' || referralMode !== 'specific') return;
    const token = localStorage.getItem('token');
    fetch(api(`/api/users?role=${referralRole}`), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { users: [] })
      .then(d => setReferralUserOptions((d.users || []).map((u: any) => ({
        _id: u._id,
        label: `${(u.last_name || '').toUpperCase()}, ${u.first_name || ''}`,
      }))));
  }, [step, referralMode, referralRole]);

  const phq9Score = phq9.every(v => v !== null) ? phq9.reduce((a, b) => a! + b!, 0)! : null;
  const gad7Score = gad7.every(v => v !== null) ? gad7.reduce((a, b) => a! + b!, 0)! : null;

  function csrsRisk(): string | null {
    if (cssr.every(v => v === null)) return null;
    if (cssr[5] || cssr[4]) return 'CRITICAL';
    if (cssr[3] || cssr[2]) return 'RED';
    if (cssr[0] || cssr[1]) return 'YELLOW';
    return 'GREEN';
  }

  function calcRisk(): string {
    const cr = csrsRisk();
    if (cr === 'CRITICAL') return 'CRITICAL';
    if (cr === 'RED' || (phq9Score !== null && phq9Score > 20) || (gad7Score !== null && gad7Score > 15)) return 'RED';
    if (cr === 'YELLOW' || (phq9Score !== null && phq9Score > 15) || (gad7Score !== null && gad7Score > 12)) return 'YELLOW';
    return 'GREEN';
  }

  const phq9Done        = phq9.every(v => v !== null);
  const gad7Done        = gad7.every(v => v !== null);
  const csrsDone        = cssr.every(v => v !== null);
  const calculatedRisk  = calcRisk();
  const hasLocalScores  = phq9Done || gad7Done;
  const displayRisk     = riskOverride || (hasLocalScores ? calculatedRisk : (intake?.risk_level || calculatedRisk));

  const savePacket = async () => {
    setSavingPacket(true); setPacketMsg('');
    const token = localStorage.getItem('token');
    const apptId = intake?.appointment_id || intakeId;
    try {
      const phq4Send = draftPhq4.every(v => v !== null) ? (draftPhq4 as number[]) : [];
      const r = await fetch(api('/api/intake/packet'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'ic_entry', submitted_by_role: 'ic', appointment_id: apptId,
          icf: draftIcf, spif: draftSpif, phq4_responses: phq4Send,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        const pr = await fetch(api(`/api/intake/packet/${apptId}`), { headers: { Authorization: `Bearer ${token}` } });
        if (pr.ok) setPacket(await pr.json());
        setEditingPacket(false);
        setPacketMsg('Forms saved.');
      } else {
        setPacketMsg(d.error || 'Failed to save.');
      }
    } catch { setPacketMsg('Network error.'); }
    finally { setSavingPacket(false); setTimeout(() => setPacketMsg(''), 4000); }
  };

  const handlePhq9Next = () => {
    if (!phq9Done) return;
    setStep(phq9[8] !== null && phq9[8]! > 0 ? 'cssr_s' : 'gad7');
  };

  const handleAutoTriage = async () => {
    if (caseId) { setStep('ic_doc'); return; }
    setSubmitting(true); setError('');
    const token = localStorage.getItem('token');
    try {
      const realId = intake?._id || intakeId;
      const provisionalDecision =
        calculatedRisk === 'CRITICAL' ? 'ENDORSE_CP' :
        calculatedRisk === 'RED'      ? 'ENDORSE_CP' :
                                        'ENDORSE_CC';
      const r = await fetch(api(`/api/intake/${realId}/triage`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phq9_responses: phq9Done ? phq9 : [],
          gad7_responses: gad7Done ? gad7 : [],
          cssr_responses: csrsDone ? cssr : [],
          risk_override: riskOverride || null,
          triage_decision: provisionalDecision,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        const newCaseId = d.case_id || (() => {
          return fetch(api(`/api/intake/${realId}`), { headers: { Authorization: `Bearer ${token}` } })
            .then(ir => ir.ok ? ir.json() : {} as Record<string, unknown>)
            .then((u: Record<string, unknown>) => u.case_id || null);
        })();
        const resolved = typeof newCaseId === 'string' ? newCaseId : await newCaseId;
        if (!resolved) {
          setError('Triage saved but case record could not be linked. Please refresh and try again.');
          return;
        }
        setCaseId(String(resolved));
        setStep('ic_doc');
      } else {
        setError(d.error || 'Failed to save scores. Please try again.');
      }
    } finally { setSubmitting(false); }
  };

  const handleIcDocSave = async (draft: any, isFinal: boolean) => {
    if (!caseId) {
      setIcDocError('Session error: case record not found. Please refresh the page and try again.');
      return;
    }
    setIcDocSaving(true); setIcDocError(''); setIcDocSuccess(false);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/cases/${caseId}/intake-form`), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (r.ok) {
        setIcDocDraft(draft);
        setIcDocSuccess(true);
        setTimeout(() => setIcDocSuccess(false), 3000);
        if (isFinal) {
          const recs: string[] = draft.recommendation || [];
          const needsInternalReferral = recs.some(r =>
            r.includes('Continue Counseling') || r.includes('CPS Psychologist')
          );
          const needsExternalReferral = recs.some(r =>
            r.includes('Psychiatrist') || r.includes('External Support') || r.includes('Faculty / Staff')
          );
          if (needsInternalReferral || needsExternalReferral) {
            if (recs.some(r => r.includes('CPS Psychologist'))) setReferralRole('PSYCHOLOGIST');
            else setReferralRole('COUNSELOR');
            setStep('route');
          } else {
            setDone(true);
          }
        }
      } else {
        const err = await r.json();
        setIcDocError(err.error || 'Failed to save.');
      }
    } catch { setIcDocError('Network error.'); }
    finally { setIcDocSaving(false); }
  };

  const handleReferralSubmit = async () => {
    if (!caseId) { setDone(true); return; }
    setReferralSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const recs: string[] = icDocDraft?.recommendation || [];
      const needsInternal = recs.some(r => r.includes('Continue Counseling') || r.includes('CPS Psychologist'));
      const needsExternal = recs.some(r => r.includes('Psychiatrist') || r.includes('External Support') || r.includes('Faculty / Staff'));

      if (needsInternal) {
        await fetch(api('/api/referrals/initiate'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            case_id: caseId, referral_type: 'INTERNAL',
            assigned_to_role: referralMode === 'pool' ? referralRole : null,
            assigned_to_user: referralMode === 'specific' ? referralUserId : null,
            reason: referralNote || recs.filter(r => r.includes('Continue') || r.includes('Psychologist')).join('; '),
            urgency: displayRisk === 'CRITICAL' || displayRisk === 'RED' ? 'urgent' : 'routine',
          }),
        });
      }
      if (needsExternal) {
        await fetch(api('/api/referrals/initiate'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            case_id: caseId, referral_type: 'EXTERNAL',
            receiving_provider_name: recs.filter(r => r.includes('Psychiatrist') || r.includes('External') || r.includes('Faculty')).join('; '),
            reason: referralNote, urgency: 'routine',
          }),
        });
      }
      setReferralDone(true);
      setDone(true);
    } catch { setDone(true); }
    finally { setReferralSubmitting(false); }
  };

  if (loading) return (
    <DashboardPageWrapper title="Conduct Intake" subtitle="">
      <div className="flex items-center justify-center h-48">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    </DashboardPageWrapper>
  );

  if (!intake) return (
    <DashboardPageWrapper title="Conduct Intake" subtitle="">
      <p className="text-sm" style={{ color: 'var(--color-danger)' }}>Intake record not found.</p>
    </DashboardPageWrapper>
  );

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (done) {
    const headerBg = displayRisk === 'CRITICAL' || displayRisk === 'RED' ? '#B91C1C' : 'var(--color-primary)';
    return (
      <DashboardPageWrapper title="Intake Complete" subtitle="">
        <div className="max-w-lg mx-auto mt-8">
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="px-6 pt-8 pb-6 text-center" style={{ background: headerBg }}>
              <CheckCircle2 size={40} className="text-white mx-auto mb-3" />
              <h2 className="text-lg font-bold" style={{ color: 'white' }}>Intake Session Complete</h2>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.8)' }}>{intake.student_name || '—'}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex justify-center"><RiskBadge risk={displayRisk} /></div>
              <div className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <div className="flex items-center gap-2"><CheckCircle2 size={14} style={{ color: '#22C55E' }} /> Assessment scores recorded</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={14} style={{ color: '#22C55E' }} /> IC Interview Documentation saved</div>
                {referralDone && <div className="flex items-center gap-2"><CheckCircle2 size={14} style={{ color: '#22C55E' }} /> Referral created</div>}
              </div>
              <div className="flex gap-2 pt-2">
                {caseId && (
                  <button
                    onClick={() => router.push(`/cases/${caseId}?tab=intake-summary`)}
                    className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition"
                    style={{ border: '1px solid var(--color-primary)', color: 'var(--color-primary)', background: 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    View Case
                  </button>
                )}
                <button
                  onClick={() => router.push('/intake-management')}
                  className="flex-1 py-2.5 text-white text-sm font-semibold rounded-xl transition"
                  style={{ background: 'var(--color-primary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary)')}
                >
                  Back to Intake Management
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  // ── IC Documentation step ─────────────────────────────────────────────────
  if (step === 'ic_doc') {
    const sessionDate = intake?.scheduled_start || intake?.preferred_date || intake?.created_at;
    const sessionInfo = {
      date: sessionDate ? new Date(sessionDate).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric' }) : undefined,
      time: sessionDate ? new Date(sessionDate).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' }) : undefined,
      mode: (() => {
        const raw = intake?.method || intake?.preferred_method || intake?.session_type || '';
        const map: Record<string, string> = {
          'in-person': 'In-Person', 'in_person': 'In-Person',
          'zoom': 'Zoom (Online)', 'google_meet': 'Google Meet (Online)', 'google-meet': 'Google Meet (Online)',
          'online': 'Online', 'teams': 'MS Teams (Online)',
        };
        return map[raw.toLowerCase()] || raw || undefined;
      })(),
      studentId: intake?.student_school_id || intake?.student?.school_id || undefined,
      college: intake?.student_college || intake?.student?.college || intake?.student?.department || undefined,
    };
    const docPhq9Responses = phq9Done ? (phq9 as (number | null)[]) : (intake?.phq9_responses || new Array(9).fill(null));
    const docPhq9Score     = phq9Done ? phq9Score : (intake?.phq9_score ?? null);
    const docGad7Responses = gad7Done ? (gad7 as (number | null)[]) : (intake?.gad7_responses || new Array(7).fill(null));
    const docGad7Score     = gad7Done ? gad7Score : (intake?.gad7_score ?? null);
    return (
      <DashboardPageWrapper title="IC Interview Documentation" subtitle="Complete during session" backLink={{ href: '/intake-management', label: 'Intake Management' }}>
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="rounded-2xl px-5 py-4 flex flex-wrap items-center gap-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
            <RiskBadge risk={displayRisk} />
            <div className="flex gap-3">
              <ScoreChip label="PHQ-9" score={docPhq9Score} max={27} sev={docPhq9Score !== null ? phq9Sev(docPhq9Score) : undefined} />
              <ScoreChip label="GAD-7" score={docGad7Score} max={21} sev={docGad7Score !== null ? gad7Sev(docGad7Score) : undefined} />
            </div>
            <p className="text-xs ml-auto" style={{ color: 'var(--color-text-muted)' }}>
              {displayRisk === 'GREEN'    && 'Intake within 2–3 days'}
              {displayRisk === 'YELLOW'   && 'Same or next day response'}
              {displayRisk === 'RED'      && 'Response within 30 minutes'}
              {displayRisk === 'CRITICAL' && 'Immediate — activate protocol'}
            </p>
          </div>
          <div className="rounded-2xl p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
            <ICInterviewWizard
              caseId={caseId}
              sessionInfo={sessionInfo}
              triageScores={{
                phq9Responses: docPhq9Responses,
                phq9Score: docPhq9Score,
                gad7Responses: docGad7Responses,
                gad7Score: docGad7Score,
              }}
              saving={icDocSaving}
              saveError={icDocError}
              saveSuccess={icDocSuccess}
              onSave={handleIcDocSave}
              onComplete={(formData) => { setIcDocDraft(formData); }}
            />
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  // ── Referral step ─────────────────────────────────────────────────────────
  if (step === 'route') {
    const recs: string[] = icDocDraft?.recommendation || [];
    const needsInternal = recs.some(r => r.includes('Continue Counseling') || r.includes('CPS Psychologist'));
    const needsExternal = recs.some(r => r.includes('Psychiatrist') || r.includes('External Support') || r.includes('Faculty / Staff'));

    const toggleBtnStyle = (active: boolean): React.CSSProperties => active
      ? { background: 'var(--color-primary)', color: '#fff', border: '1px solid var(--color-primary)' }
      : { background: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' };

    return (
      <DashboardPageWrapper title="Route Student" subtitle="Route the student based on your documentation recommendation" backLink={{ href: '/intake-management', label: 'Intake Management' }}>
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <CheckCircle2 size={14} style={{ color: '#22C55E' }} />
            <span>IC Documentation saved — now route the student</span>
          </div>

          {needsInternal && (
            <div className="rounded-2xl p-6 space-y-4"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
              <div>
                <p className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                  <Users size={15} style={{ color: 'var(--color-primary)' }} /> Internal CPS Referral
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Assign to a specific clinician, or broadcast to the role pool for any available clinician to accept.
                </p>
              </div>

              {/* Role select */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Refer to</label>
                <div className="flex gap-2">
                  {(['COUNSELOR', 'PSYCHOLOGIST'] as const).map(r => (
                    <button key={r} onClick={() => { setReferralRole(r); setReferralUserId(''); }}
                      className="flex-1 py-2 text-sm font-semibold rounded-xl transition"
                      style={toggleBtnStyle(referralRole === r)}>
                      {r === 'COUNSELOR' ? 'Counselor' : 'Psychologist'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific vs Pool */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Assignment method</label>
                <div className="flex gap-2">
                  {[{ key: 'pool', label: 'Open pool — anyone can accept' }, { key: 'specific', label: 'Assign to specific person' }].map(opt => (
                    <button key={opt.key} onClick={() => setReferralMode(opt.key as any)}
                      className="flex-1 py-2 text-xs font-semibold rounded-xl transition"
                      style={toggleBtnStyle(referralMode === opt.key)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {referralMode === 'specific' && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Select {referralRole === 'COUNSELOR' ? 'counselor' : 'psychologist'}
                  </label>
                  <select value={referralUserId} onChange={e => setReferralUserId(e.target.value)}
                    className={IC} style={ICSSEL}>
                    <option value="">— Select —</option>
                    {referralUserOptions.map(u => <option key={u._id} value={u._id}>{u.label}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {needsExternal && (
            <div className="rounded-2xl p-6 space-y-3"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
              <div>
                <p className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                  <ExternalLink size={15} style={{ color: '#7C3AED' }} /> External Referral
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  A formal referral letter will be generated and attached to the case. Give this to the student.
                </p>
              </div>
              {/* Keep purple for semantic distinction — external referral */}
              <div className="rounded-xl px-4 py-3 text-xs" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', color: '#5B21B6' }}>
                {recs.filter(r => r.includes('Psychiatrist') || r.includes('External Support') || r.includes('Faculty / Staff')).map((r, i) => (
                  <p key={i}>• {r.split('–')[0].trim()}</p>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Referral notes (optional)</label>
            <textarea value={referralNote} onChange={e => setReferralNote(e.target.value)} rows={3}
              placeholder="Additional context for the receiving clinician…"
              className={IC} style={{ ...ICS, resize: 'none' }} />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setDone(true)}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              Skip referral
            </button>
            <button onClick={handleReferralSubmit}
              disabled={referralSubmitting || (needsInternal && referralMode === 'specific' && !referralUserId)}
              className="flex-1 py-2.5 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
              onMouseEnter={e => { if (!referralSubmitting) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'}>
              {referralSubmitting ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : 'Submit Referral'}
            </button>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  const studentName  = intake.student_name || intake.student?.name || '—';
  const studentEmail = intake.student_email || intake.student?.email || '';
  const concern      = intake.concern || intake.responses?.concern || '—';

  const allSteps: { key: Step; label: string }[] = [
    { key: 'review' as Step, label: 'Intake Forms' },
    { key: 'phq9',   label: 'PHQ-9' },
    ...(phq9[8] !== null && phq9[8]! > 0 ? [{ key: 'cssr_s' as Step, label: 'C-SSRS' }] : []),
    { key: 'gad7',   label: 'GAD-7' },
    { key: 'ic_doc', label: 'IC Documentation' },
    { key: 'route',  label: 'Route' },
  ];
  const stepIdx = allSteps.findIndex(s => s.key === step);

  // ── Assessment table (shared PHQ-9/GAD-7) ────────────────────────────────
  function AssessmentTable({ questions, answers, setAnswers, flagLast }: {
    questions: string[]; answers: (number|null)[]; setAnswers: (a: (number|null)[]) => void; flagLast?: boolean;
  }) {
    const answered = answers.filter(v => v !== null).length;
    const score    = answers.every(v => v !== null) ? answers.reduce((a,b) => a!+b!, 0)! : null;
    return (
      <div>
        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${(answered / questions.length) * 100}%`, background: 'var(--color-primary)' }} />
          </div>
          <span className="text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>{answered}/{questions.length} answered</span>
          {score !== null && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: 'var(--color-text-primary)', background: 'var(--color-bg)' }}>Score: {score}</span>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="grid" style={{ gridTemplateColumns: '2rem 1fr repeat(4, 5rem)', background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
            <div className="px-3 py-2.5" />
            <div className="px-3 py-2.5 text-xs font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>Item</div>
            {FREQ.map(f => (
              <div key={f.v} className="py-2.5 text-center text-[10px] font-bold uppercase leading-tight px-1" style={{ color: 'var(--color-text-muted)' }}>
                <span className="block text-xs font-bold">{f.v}</span>
                {f.s}
              </div>
            ))}
          </div>

          {questions.map((q, i) => {
            const isLast = flagLast && i === questions.length - 1;
            return (
              <div key={i}
                className="grid transition"
                style={{
                  gridTemplateColumns: '2rem 1fr repeat(4, 5rem)',
                  borderBottom: i < questions.length - 1 ? '1px solid var(--color-border)' : 'none',
                  background: isLast ? '#FEF2F2' : answers[i] !== null ? '#F0FDF420' : 'transparent',
                }}>
                <div className="flex items-center justify-center text-xs font-bold"
                  style={{ color: isLast ? '#EF4444' : 'var(--color-border-strong)' }}>
                  {i + 1}
                </div>
                <div className="px-3 py-3">
                  <p className="text-sm leading-snug" style={{ color: 'var(--color-text-primary)' }}>{q}</p>
                  {isLast && <p className="text-[10px] font-semibold mt-0.5" style={{ color: '#EF4444' }}>C-SSRS required if score &gt; 0</p>}
                </div>
                {FREQ.map(f => (
                  <div key={f.v} className="flex items-center justify-center py-2">
                    <button
                      onClick={() => { const a = [...answers]; a[i] = a[i] === f.v ? null : f.v; setAnswers(a); }}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition"
                      style={answers[i] === f.v
                        ? { background: 'var(--color-primary)', border: '2px solid var(--color-primary)', boxShadow: 'var(--shadow-card)' }
                        : { border: '2px solid var(--color-border)', background: 'var(--color-surface)' }}>
                      {answers[i] === f.v && <div className="w-3 h-3 rounded-full bg-white" />}
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <DashboardPageWrapper title="Intake Interview" subtitle="Complete assessments and document the session" backLink={{ href: '/intake-management', label: 'Intake Management' }}>
      <div className="max-w-3xl mx-auto space-y-4">

        {/* Patient header — persistent throughout */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex flex-wrap items-start gap-4 p-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-primary-muted)' }}>
              <User size={18} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>{studentName}</h2>
                {packet && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: '#DCFCE7', color: '#15803D' }}>
                    <FileText size={10} /> Intake Forms Submitted
                  </span>
                )}
              </div>
              {studentEmail && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{studentEmail}</p>}
              <p className="text-sm mt-1.5 leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                <span className="text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Concern:</span> {concern}
              </p>
            </div>
            {/* Running scores */}
            <div className="flex gap-2 flex-shrink-0">
              <ScoreChip label="PHQ-9" score={phq9Score} max={27} sev={phq9Score !== null ? phq9Sev(phq9Score) : undefined} />
              <ScoreChip label="GAD-7" score={gad7Score} max={21} sev={gad7Score !== null ? gad7Sev(gad7Score) : undefined} />
              {csrsDone && csrsRisk() && (
                <div className="rounded-xl p-3 text-center min-w-[60px]"
                  style={{ background: 'var(--color-surface)', border: '1px solid #FECACA', boxShadow: 'var(--shadow-card)' }}>
                  <p className="text-xs font-semibold" style={{ color: '#DC2626' }}>C-SSRS</p>
                  <p className="text-xs font-bold mt-1" style={{
                    color: csrsRisk() === 'GREEN' ? 'var(--color-primary)' : csrsRisk() === 'YELLOW' ? '#A16207' : '#B91C1C'
                  }}>
                    {csrsRisk()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step progress bar */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {allSteps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => i < stepIdx ? setStep(s.key) : undefined}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition"
                style={step === s.key
                  ? { background: 'var(--color-primary)', color: '#fff', boxShadow: 'var(--shadow-card)' }
                  : i < stepIdx
                    ? { background: 'var(--color-success-surface)', color: 'var(--color-success-text)', cursor: 'pointer' }
                    : { background: 'var(--color-bg)', color: 'var(--color-text-muted)', cursor: 'default' }}>
                {i < stepIdx
                  ? <Check size={11} />
                  : <span className="w-3 h-3 rounded-full border flex items-center justify-center text-[10px] font-bold" style={{ borderColor: 'currentColor' }}>{i+1}</span>}
                {s.label}
              </button>
              {i < allSteps.length - 1 && <ChevronRight size={13} style={{ color: 'var(--color-border-strong)' }} className="flex-shrink-0" />}
            </div>
          ))}
        </div>

        {/* ── REVIEW / FILL-IN FORMS ─────────────────────────────────────── */}
        {step === 'review' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ background: 'var(--color-success-surface)', borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <Eye size={16} style={{ color: 'var(--color-success)' }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {packet ? 'Intake Packet' : 'Intake Forms (Not Pre-Submitted)'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {packet
                      ? `Submitted ${packet.submitted_by_role === 'ic' ? 'by IC during interview' : packet.submitted_by_role === 'oa' ? 'by Office Assistant (walk-in)' : 'by student online'}`
                      : 'Student skipped the pre-intake packet. Fill in the forms together now.'}
                  </p>
                </div>
              </div>
              {packet && !editingPacket && (
                <button onClick={() => setEditingPacket(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-surface)')}>
                  <Pencil size={12} /> Edit
                </button>
              )}
            </div>

            {/* ── View mode ──────────────────────────────────────────────── */}
            {packet && !editingPacket && (
              <>
                <div className="p-5 space-y-5">
                  {packet.icf && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>Initial Contact Form (ICF)</p>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        {[
                          ['Student', [packet.icf.first_name, packet.icf.middle_name, packet.icf.last_name].filter(Boolean).join(' ')],
                          ['Email', packet.icf.email || '—'],
                          ['Student ID', packet.icf.student_id || '—'],
                          ['Program', [packet.icf.college, packet.icf.program, packet.icf.year_level].filter(Boolean).join(' · ') || '—'],
                          ['Service Requested', packet.icf.service_requested?.replace(/_/g, ' ') || '—'],
                          ['Referral', packet.icf.referral_source || '—'],
                          ['Emergency Contact', [packet.icf.emergency_contact_name, packet.icf.emergency_contact_relationship, packet.icf.emergency_contact_phone].filter(Boolean).join(' · ') || '—'],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{k}:</span>{' '}
                            <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{v}</span>
                          </div>
                        ))}
                        <div className="col-span-2 mt-1 p-3 rounded-xl" style={{ background: 'var(--color-bg)' }}>
                          <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Presenting Concern</p>
                          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{packet.icf.presenting_concern || '—'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {packet.spif && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>Personal Background (SPIF-IF)</p>
                      <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
                        {[
                          ['Birthdate', packet.spif.birthdate || '—'],
                          ['Gender', packet.spif.gender || '—'],
                          ['Family Setup', packet.spif.family_composition?.replace(/_/g,' ') || '—'],
                          ['Living With', packet.spif.living_with || '—'],
                          ['Medical', packet.spif.existing_medical_conditions || 'None'],
                          ['Medications', packet.spif.current_medications || 'None'],
                          ['Prev. Counseling', packet.spif.previous_counseling ? 'Yes' : 'No'],
                          ['Prev. Psychiatric', packet.spif.previous_psychiatric ? 'Yes' : 'No'],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{k}:</span>{' '}
                            <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{v}</span>
                          </div>
                        ))}
                        {packet.spif.previous_counseling && packet.spif.previous_counseling_details && (
                          <div className="col-span-3 text-xs rounded-lg px-3 py-2" style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg)' }}>
                            <span className="font-semibold">Counseling details:</span> {packet.spif.previous_counseling_details}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {packet.phq4_summary && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>PHQ-4 Pre-Screen</p>
                      <div className="grid grid-cols-3 gap-3 mb-2">
                        {[
                          { l: 'PHQ-2 (Depression)', s: packet.phq4_summary.phq2_score, max: 6, risk: packet.phq4_summary.phq2_at_risk },
                          { l: 'GAD-2 (Anxiety)',    s: packet.phq4_summary.gad2_score, max: 6, risk: packet.phq4_summary.gad2_at_risk },
                          { l: 'PHQ-4 Total',         s: packet.phq4_summary.total_score, max: 12, risk: packet.phq4_summary.total_score >= 6 },
                        ].map(x => (
                          <div key={x.l} className="rounded-xl p-3 text-center"
                            style={x.risk
                              ? { background: '#FEF2F2', border: '1px solid #FECACA' }
                              : { background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                            <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>{x.l}</p>
                            <p className="text-xl font-bold" style={{ color: x.risk ? '#B91C1C' : 'var(--color-primary)' }}>
                              {x.s}<span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>/{x.max}</span>
                            </p>
                            <p className="text-[10px] font-semibold" style={{ color: x.risk ? '#EF4444' : '#16A34A' }}>{x.risk ? '⚠ Elevated' : '✓ Normal'}</p>
                          </div>
                        ))}
                      </div>
                      {packet.phq4_responses && (
                        <div className="text-xs space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                          {['Little interest or pleasure','Feeling down or depressed','Feeling nervous or anxious','Not able to stop worrying'].map((q,i) => (
                            <div key={i} className="flex gap-2">
                              <span style={{ color: 'var(--color-text-muted)' }} className="w-3">{i+1}.</span>
                              <span className="flex-1">{q}</span>
                              <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{fmtFreq(packet.phq4_responses[i] ?? 0)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="px-5 py-4 flex justify-end" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                  <button onClick={() => setStep('phq9')}
                    className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition"
                    style={{ background: 'var(--color-primary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary)')}>
                    Proceed to PHQ-9 <ChevronRight size={14} />
                  </button>
                </div>
              </>
            )}

            {/* ── Edit / Fill-in mode ──────────────────────────────────── */}
            {(!packet || editingPacket) && (
              <div className="p-5 space-y-6">
                {/* ICF */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-muted)' }}>Initial Contact Form (ICF)</p>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { key: 'first_name',  label: 'First Name' },
                      { key: 'last_name',   label: 'Last Name' },
                      { key: 'middle_name', label: 'Middle Name (opt)' },
                      { key: 'email',       label: 'Email' },
                      { key: 'student_id',  label: 'Student ID' },
                      { key: 'college',     label: 'College/Unit' },
                      { key: 'program',     label: 'Degree Program' },
                      { key: 'year_level',  label: 'Year Level' },
                    ] as { key: string; label: string }[]).map(f => (
                      <div key={f.key}>
                        <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>{f.label}</label>
                        <input value={draftIcf[f.key] || ''}
                          onChange={e => setDraftIcf(p => ({ ...p, [f.key]: e.target.value }))}
                          className={IC} style={ICS} />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>Service Requested</label>
                      <select value={draftIcf.service_requested || ''}
                        onChange={e => setDraftIcf(p => ({ ...p, service_requested: e.target.value }))}
                        className={IC} style={ICSSEL}>
                        <option value="">— Select —</option>
                        {['personal_counseling','academic_concerns','career_guidance','family_concerns','relationship_concerns','crisis_support','psychiatric_evaluation','other'].map(s => (
                          <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>Referral Source</label>
                      <select value={draftIcf.referral_source || ''}
                        onChange={e => setDraftIcf(p => ({ ...p, referral_source: e.target.value }))}
                        className={IC} style={ICSSEL}>
                        <option value="">— Select —</option>
                        {['self_referred','faculty_referred','parent_referred','friend_referred','online_referral','office_referred'].map(s => (
                          <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Emergency Contact</p>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { key: 'emergency_contact_name',         label: 'Name' },
                          { key: 'emergency_contact_relationship', label: 'Relationship' },
                          { key: 'emergency_contact_phone',        label: 'Phone' },
                        ] as { key: string; label: string }[]).map(f => (
                          <div key={f.key}>
                            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{f.label}</label>
                            <input value={draftIcf[f.key] || ''}
                              onChange={e => setDraftIcf(p => ({ ...p, [f.key]: e.target.value }))}
                              className={IC} style={ICS} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>Presenting Concern</label>
                      <textarea rows={3} value={draftIcf.presenting_concern || ''}
                        onChange={e => setDraftIcf(p => ({ ...p, presenting_concern: e.target.value }))}
                        className={IC} style={{ ...ICS, resize: 'none' }} />
                    </div>
                  </div>
                </div>

                {/* SPIF-IF */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-muted)' }}>Personal Background (SPIF-IF)</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>Birthdate</label>
                      <input type="date" value={draftSpif.birthdate || ''}
                        onChange={e => setDraftSpif(p => ({ ...p, birthdate: e.target.value }))}
                        className={IC} style={ICS} />
                    </div>
                    {([
                      { key: 'gender',       label: 'Gender',       opts: ['male','female','non_binary','prefer_not_to_say'] },
                      { key: 'family_composition', label: 'Family Setup', opts: ['complete','single_parent','blended','extended','others'] },
                    ] as { key: string; label: string; opts: string[] }[]).map(f => (
                      <div key={f.key}>
                        <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>{f.label}</label>
                        <select value={draftSpif[f.key] || ''}
                          onChange={e => setDraftSpif(p => ({ ...p, [f.key]: e.target.value }))}
                          className={IC} style={ICSSEL}>
                          <option value="">—</option>
                          {f.opts.map(o => <option key={o} value={o}>{o.replace(/_/g,' ')}</option>)}
                        </select>
                      </div>
                    ))}
                    {([
                      { key: 'living_with',                   label: 'Living With' },
                      { key: 'existing_medical_conditions',   label: 'Medical Conditions' },
                      { key: 'current_medications',           label: 'Current Medications' },
                    ] as { key: string; label: string }[]).map(f => (
                      <div key={f.key}>
                        <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>{f.label}</label>
                        <input value={draftSpif[f.key] || ''} placeholder="None"
                          onChange={e => setDraftSpif(p => ({ ...p, [f.key]: e.target.value }))}
                          className={IC} style={ICS} />
                      </div>
                    ))}
                    <div className="col-span-3 grid grid-cols-2 gap-3">
                      {([
                        { key: 'previous_counseling',  label: 'Previous Counseling?' },
                        { key: 'previous_psychiatric', label: 'Previous Psychiatric Treatment?' },
                      ] as { key: string; label: string }[]).map(f => (
                        <label key={f.key}
                          className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition"
                          style={{ border: '1px solid var(--color-border)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <input type="checkbox" checked={!!draftSpif[f.key]}
                            onChange={e => setDraftSpif(p => ({ ...p, [f.key]: e.target.checked }))}
                            className="w-4 h-4 rounded" />
                          <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{f.label}</span>
                        </label>
                      ))}
                    </div>
                    {draftSpif.previous_counseling && (
                      <div className="col-span-3">
                        <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>Counseling Details</label>
                        <input value={draftSpif.previous_counseling_details || ''}
                          onChange={e => setDraftSpif(p => ({ ...p, previous_counseling_details: e.target.value }))}
                          className={IC} style={ICS} />
                      </div>
                    )}
                  </div>
                </div>

                {/* PHQ-4 */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-muted)' }}>PHQ-4 Pre-Screen</p>
                  <div className="space-y-2">
                    {[
                      'Little interest or pleasure in doing things',
                      'Feeling down, depressed, or hopeless',
                      'Feeling nervous, anxious, or on edge',
                      'Not being able to stop or control worrying',
                    ].map((q, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-bg)' }}>
                        <span className="text-xs w-3" style={{ color: 'var(--color-text-muted)' }}>{i+1}.</span>
                        <span className="flex-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>{q}</span>
                        <div className="flex gap-1.5">
                          {FREQ.map(f => (
                            <button key={f.v}
                              onClick={() => { const a = [...draftPhq4]; a[i] = a[i] === f.v ? null : f.v; setDraftPhq4(a); }}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
                              style={draftPhq4[i] === f.v
                                ? { background: 'var(--color-primary)', border: '2px solid var(--color-primary)', color: '#fff' }
                                : { border: '2px solid var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
                              {f.v}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {packetMsg && (
                  <p className="text-xs font-medium" style={{ color: packetMsg.includes('saved') ? 'var(--color-primary)' : 'var(--color-danger)' }}>
                    {packetMsg}
                  </p>
                )}
              </div>
            )}

            {/* ── Edit/Fill-in footer ─────────────────────────────────── */}
            {(!packet || editingPacket) && (
              <div className="px-5 py-4 flex items-center justify-between gap-3" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                {editingPacket && (
                  <button onClick={() => setEditingPacket(false)}
                    className="flex items-center gap-1.5 text-xs transition"
                    style={{ color: 'var(--color-text-muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                    <X size={12} /> Cancel
                  </button>
                )}
                <div className="flex-1" />
                <button onClick={savePacket} disabled={savingPacket}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition disabled:opacity-50"
                  style={{ background: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-border-strong)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-border)')}>
                  {savingPacket ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  {savingPacket ? 'Saving…' : 'Save Forms'}
                </button>
                <button onClick={() => setStep('phq9')}
                  className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition"
                  style={{ background: 'var(--color-primary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary)')}>
                  {packet ? 'Proceed to PHQ-9' : 'Skip & Go to PHQ-9'} <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── PHQ-9 ──────────────────────────────────────────────────────── */}
        {step === 'phq9' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ background: 'var(--color-primary-surface)', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>PHQ-9 — Patient Health Questionnaire</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Over the <strong>last 2 weeks</strong>, how often has the student been bothered by each of the following?</p>
              </div>
              {phq9Score !== null && (
                <div className="text-center flex-shrink-0 ml-4">
                  <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {phq9Score}<span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>/27</span>
                  </p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={phq9Sev(phq9Score).style}>{phq9Sev(phq9Score).label}</span>
                </div>
              )}
            </div>
            <div className="p-5">
              <AssessmentTable questions={PHQ9} answers={phq9} setAnswers={setPhq9} flagLast />
            </div>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
              <button onClick={() => setStep('review')} className="flex items-center gap-1 text-xs transition"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}>
                <ChevronLeft size={13} /> Intake Forms
              </button>
              <div className="flex-1" />
              <button onClick={() => { setPhq9(Array(9).fill(null)); setStep('gad7'); }}
                className="text-xs underline underline-offset-2 mr-4 transition"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                Skip assessment
              </button>
              <button onClick={handlePhq9Next} disabled={!phq9Done}
                className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40"
                style={{ background: 'var(--color-primary)' }}
                onMouseEnter={e => { if (phq9Done) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'}>
                {phq9Done && phq9[8]! > 0 ? 'C-SSRS Required' : 'Continue to GAD-7'} <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── C-SSRS ─────────────────────────────────────────────────────── */}
        {step === 'cssr_s' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid #FECACA', boxShadow: 'var(--shadow-card)' }}>
            <div className="px-5 py-4" style={{ background: '#FEF2F2', borderBottom: '1px solid #FECACA' }}>
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" style={{ color: '#DC2626' }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: '#7F1D1D' }}>C-SSRS — Columbia Suicide Severity Rating Scale</p>
                  <p className="text-xs mt-0.5" style={{ color: '#B91C1C' }}>PHQ-9 Q9 &gt; 0 — suicidal ideation indicated. Administer C-SSRS immediately. Timeframe: <strong>last month</strong>.</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-center uppercase mb-1 px-2" style={{ color: 'var(--color-text-muted)' }}>
                <span className="text-left text-xs">#  Question</span>
                <span className="col-span-2 text-right">Response</span>
              </div>
              {CSSRS.map((q, i) => {
                const severity = i <= 1 ? 'low' : i <= 3 ? 'medium' : 'high';
                const dotBg = severity === 'low' ? '#FBBF24' : severity === 'medium' ? '#F97316' : '#DC2626';
                return (
                  <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl"
                    style={{
                      border: `1px solid ${cssr[i] === true ? '#FECACA' : cssr[i] === false ? '#BBF7D0' : 'var(--color-border)'}`,
                      background: cssr[i] === true ? '#FEF2F2' : cssr[i] === false ? '#F0FDF4' : 'var(--color-bg)',
                    }}>
                    <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
                      style={{ background: dotBg }}>{i+1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{q.label}</p>
                      <p className="text-sm leading-snug" style={{ color: 'var(--color-text-primary)' }}>{q.text}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {[
                        { v: true,  l: 'YES', active: 'bg-red-600 text-white border-red-600',    inactive: 'border-gray-300 text-red-600 hover:border-red-400 hover:bg-red-50' },
                        { v: false, l: 'NO',  active: 'bg-green-600 text-white border-green-600', inactive: 'border-gray-300 text-green-700 hover:border-green-400 hover:bg-green-50' },
                      ].map(opt => (
                        <button key={String(opt.v)}
                          onClick={() => { const a = [...cssr]; a[i] = a[i] === opt.v ? null : opt.v; setCssr(a); }}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold border-2 transition ${cssr[i] === opt.v ? opt.active : opt.inactive}`}>
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {csrsDone && csrsRisk() && (
                <div className="rounded-xl p-4 flex items-center gap-3 mt-2"
                  style={csrsRisk() === 'CRITICAL'
                    ? { background: '#FEE2E2', border: '1px solid #FCA5A5' }
                    : csrsRisk() === 'RED'
                      ? { background: '#FEF2F2', border: '1px solid #FECACA' }
                      : csrsRisk() === 'YELLOW'
                        ? { background: '#FEFCE8', border: '1px solid #FDE047' }
                        : { background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <RiskBadge risk={csrsRisk()!} />
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {csrsRisk() === 'CRITICAL' && <strong>⚠ Imminent risk — activate emergency protocol immediately. Do not leave student alone.</strong>}
                    {csrsRisk() === 'RED'      && 'High risk — notify supervisor immediately. Safety plan required.'}
                    {csrsRisk() === 'YELLOW'   && 'Moderate risk — active ideation without intent. Safety planning required.'}
                    {csrsRisk() === 'GREEN'    && 'Low risk — passive ideation only. Document and monitor closely.'}
                  </p>
                </div>
              )}
            </div>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
              <button onClick={() => setStep('phq9')} className="flex items-center gap-1 text-xs transition"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}>
                <ChevronLeft size={13} /> PHQ-9
              </button>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{cssr.filter(v => v !== null).length} / 6 answered</p>
              <div className="flex items-center gap-4">
                <button onClick={() => { setCssr(Array(6).fill(null)); setStep('gad7'); }}
                  className="text-xs underline underline-offset-2 transition"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                  Skip assessment
                </button>
                <button onClick={() => setStep('gad7')} disabled={!csrsDone}
                  className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40"
                  style={{ background: 'var(--color-primary)' }}
                  onMouseEnter={e => { if (csrsDone) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'}>
                  Continue to GAD-7 <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── GAD-7 ──────────────────────────────────────────────────────── */}
        {step === 'gad7' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ background: '#F5F3FF', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>GAD-7 — Generalized Anxiety Disorder Scale</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Over the <strong>last 2 weeks</strong>, how often has the student been bothered by each of the following?</p>
              </div>
              {gad7Score !== null && (
                <div className="text-center flex-shrink-0 ml-4">
                  <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {gad7Score}<span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>/21</span>
                  </p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={gad7Sev(gad7Score).style}>{gad7Sev(gad7Score).label}</span>
                </div>
              )}
            </div>
            <div className="p-5">
              <AssessmentTable questions={GAD7} answers={gad7} setAnswers={setGad7} />
            </div>
            {error && (
              <div className="mx-5 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
                <AlertTriangle size={13} className="flex-shrink-0" />{error}
              </div>
            )}
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
              <button onClick={() => setStep(phq9[8] !== null && phq9[8]! > 0 ? 'cssr_s' : 'phq9')}
                className="flex items-center gap-1 text-xs transition"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}>
                <ChevronLeft size={13} /> Back
              </button>
              <div className="flex items-center gap-4">
                <button onClick={() => { setGad7(Array(7).fill(null)); handleAutoTriage(); }}
                  disabled={submitting}
                  className="text-xs underline underline-offset-2 transition disabled:opacity-40"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                  Skip assessment
                </button>
                <button onClick={handleAutoTriage} disabled={!gad7Done || submitting}
                  className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40"
                  style={{ background: 'var(--color-primary)' }}
                  onMouseEnter={e => { if (gad7Done && !submitting) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'}>
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <>Proceed to Documentation <ChevronRight size={14} /></>}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardPageWrapper>
  );
}
