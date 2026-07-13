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

// ── Helpers ────────────────────────────────────────────────────────────────────
function phq9Sev(s: number) {
  if (s >= 20) return { label: 'Severe', cls: 'text-red-700 bg-red-100' };
  if (s >= 15) return { label: 'Mod-Severe', cls: 'text-red-600 bg-red-50' };
  if (s >= 10) return { label: 'Moderate', cls: 'text-amber-700 bg-amber-100' };
  if (s >= 5)  return { label: 'Mild', cls: 'text-yellow-700 bg-yellow-100' };
  return { label: 'Minimal', cls: 'text-green-700 bg-green-100' };
}
function gad7Sev(s: number) {
  if (s >= 15) return { label: 'Severe', cls: 'text-red-700 bg-red-100' };
  if (s >= 10) return { label: 'Moderate', cls: 'text-amber-700 bg-amber-100' };
  if (s >= 5)  return { label: 'Mild', cls: 'text-yellow-700 bg-yellow-100' };
  return { label: 'Minimal', cls: 'text-green-700 bg-green-100' };
}

function RiskBadge({ risk }: { risk: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    GREEN:    { cls: 'bg-green-50 text-green-700 border-green-200',    icon: <Shield size={13} />,       label: 'Code Green — Low Risk' },
    YELLOW:   { cls: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: <Activity size={13} />,     label: 'Code Yellow — Moderate Risk' },
    RED:      { cls: 'bg-red-50 text-red-700 border-red-200',          icon: <AlertTriangle size={13} />, label: 'Code Red — High Risk' },
    CRITICAL: { cls: 'bg-red-100 text-red-800 border-red-400',         icon: <ShieldAlert size={13} />,   label: 'CRITICAL — Immediate Response' },
  };
  const c = map[risk] ?? map.GREEN;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border ${c.cls}`}>
      {c.icon}{c.label}
    </span>
  );
}

function ScoreChip({ label, score, max, sev }: { label: string; score: number | null; max: number; sev?: { label: string; cls: string } }) {
  if (score === null) return (
    <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
      <p className="text-xs text-gray-400 font-semibold">{label}</p>
      <p className="text-gray-300 text-lg font-bold mt-1">—</p>
    </div>
  );
  return (
    <div className="bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm">
      <p className="text-xs text-gray-500 font-semibold mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{score}<span className="text-xs text-gray-400 font-normal">/{max}</span></p>
      {sev && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold mt-1 inline-block ${sev.cls}`}>{sev.label}</span>}
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
  const [riskOverride, setRiskOverride]         = useState('');

  // IC Documentation step state
  const [caseId, setCaseId] = useState('');
  const [icDocSaving, setIcDocSaving] = useState(false);
  const [icDocError, setIcDocError] = useState('');
  const [icDocSuccess, setIcDocSuccess] = useState(false);
  const [icDocDraft, setIcDocDraft] = useState<any>(null);

  // Referral step state
  const [referralMode, setReferralMode] = useState<'specific' | 'pool'>('pool');
  const [referralRole, setReferralRole] = useState<'COUNSELOR' | 'PSYCHOLOGIST'>('COUNSELOR');
  const [referralUserId, setReferralUserId] = useState('');
  const [referralUserOptions, setReferralUserOptions] = useState<{ _id: string; label: string }[]>([]);
  const [referralNote, setReferralNote] = useState('');
  const [referralSubmitting, setReferralSubmitting] = useState(false);
  const [referralDone, setReferralDone] = useState(false);

  // Intake packet edit state
  const [editingPacket, setEditingPacket]   = useState(false);
  const [savingPacket, setSavingPacket]     = useState(false);
  const [packetMsg, setPacketMsg]           = useState('');
  const [draftIcf, setDraftIcf]             = useState<Record<string, any>>({});
  const [draftSpif, setDraftSpif]           = useState<Record<string, any>>({});
  const [draftPhq4, setDraftPhq4]           = useState<(number | null)[]>([null, null, null, null]);

  const fetchIntake = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/intake/${intakeId}`), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const data = await r.json();
        setIntake(data);
        // Scores already saved (returning to a mid-flow session) — restore and jump to IC doc
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

  // Pre-fill draft form when packet loads
  useEffect(() => {
    if (packet) {
      setDraftIcf(packet.icf || {});
      setDraftSpif(packet.spif || {});
      setDraftPhq4(Array.isArray(packet.phq4_responses) && packet.phq4_responses.length === 4
        ? packet.phq4_responses : [null, null, null, null]);
    }
  }, [packet]);

  // Load user options for specific referral assignment
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

  const phq9Done = phq9.every(v => v !== null);
  const gad7Done = gad7.every(v => v !== null);
  const csrsDone = cssr.every(v => v !== null);
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
          source: 'ic_entry',
          submitted_by_role: 'ic',
          appointment_id: apptId,
          icf: draftIcf,
          spif: draftSpif,
          phq4_responses: phq4Send,
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

  // Auto-submit scores after GAD-7 — provisional decision derived from computed risk.
  // The IC's formal recommendation is captured in step 10 of IC Documentation.
  const handleAutoTriage = async () => {
    if (caseId) { setStep('ic_doc'); return; } // already done (returning to page)
    setSubmitting(true); setError('');
    const token = localStorage.getItem('token');
    try {
      const realId = intake?._id || intakeId;
      const provisionalDecision =
        calculatedRisk === 'CRITICAL' ? 'CRISIS' :
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
          // fallback: re-fetch intake for case_id
          return fetch(api(`/api/intake/${realId}`), { headers: { Authorization: `Bearer ${token}` } })
            .then(ir => ir.ok ? ir.json() : {})
            .then(u => u.case_id || null);
        })();
        const resolved = typeof newCaseId === 'string' ? newCaseId : await newCaseId;
        if (resolved) setCaseId(String(resolved));
        setStep('ic_doc');
      } else {
        setError(d.error || 'Failed to save scores. Please try again.');
      }
    } finally { setSubmitting(false); }
  };

  const handleIcDocSave = async (draft: any, isFinal: boolean) => {
    if (!caseId) return;
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
          // Determine referral type from recommendation
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
    if (!caseId) return;
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
            case_id: caseId,
            referral_type: 'INTERNAL',
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
            case_id: caseId,
            referral_type: 'EXTERNAL',
            receiving_provider_name: recs.filter(r => r.includes('Psychiatrist') || r.includes('External') || r.includes('Faculty')).join('; '),
            reason: referralNote,
            urgency: 'routine',
          }),
        });
      }
      setReferralDone(true);
      setDone(true);
    } catch { /* fail silently — referral is best-effort */ setDone(true); }
    finally { setReferralSubmitting(false); }
  };

  if (loading) return (
    <DashboardPageWrapper title="Conduct Intake" subtitle="">
      <div className="flex items-center justify-center h-48"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
    </DashboardPageWrapper>
  );

  if (!intake) return (
    <DashboardPageWrapper title="Conduct Intake" subtitle="">
      <p className="text-red-500 text-sm">Intake record not found.</p>
    </DashboardPageWrapper>
  );

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <DashboardPageWrapper title="Intake Complete" subtitle="">
        <div className="max-w-lg mx-auto mt-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className={`px-6 pt-8 pb-6 text-center ${displayRisk === 'CRITICAL' || displayRisk === 'RED' ? 'bg-red-700' : 'bg-[#2563eb]'}`}>
              <CheckCircle2 size={40} className="text-white mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white">Intake Session Complete</h2>
              <p className="text-white/80 text-sm mt-1">{intake.student_name || '—'}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex justify-center"><RiskBadge risk={displayRisk} /></div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500" /> Assessment scores recorded</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500" /> IC Interview Documentation saved</div>
                {referralDone && <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500" /> Referral created</div>}
              </div>
              <div className="flex gap-2 pt-2">
                {caseId && (
                  <button onClick={() => router.push(`/cases/${caseId}?tab=intake-summary`)}
                    className="flex-1 py-2.5 border border-[#2563eb] text-[#2563eb] text-sm font-semibold rounded-xl hover:bg-blue-50 transition">
                    View Case
                  </button>
                )}
                <button onClick={() => router.push('/intake-management')}
                  className="flex-1 py-2.5 bg-[#2563eb] text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition">
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
      date: sessionDate ? new Date(sessionDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : undefined,
      time: sessionDate ? new Date(sessionDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : undefined,
      mode: intake?.method || intake?.session_type,
      studentId: intake?.student_id || intake?.student?.school_id,
      college: intake?.student?.college,
    };
    // Use local scores if gathered this session, otherwise fall back to what the server stored
    const docPhq9Responses = phq9Done ? (phq9 as (number | null)[]) : (intake?.phq9_responses || new Array(9).fill(null));
    const docPhq9Score     = phq9Done ? phq9Score : (intake?.phq9_score ?? null);
    const docGad7Responses = gad7Done ? (gad7 as (number | null)[]) : (intake?.gad7_responses || new Array(7).fill(null));
    const docGad7Score     = gad7Done ? gad7Score : (intake?.gad7_score ?? null);
    return (
      <DashboardPageWrapper title="IC Interview Documentation" subtitle="Complete during session">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Risk + scores summary banner */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-wrap items-center gap-4">
            <RiskBadge risk={displayRisk} />
            <div className="flex gap-3">
              <ScoreChip label="PHQ-9" score={docPhq9Score} max={27} sev={docPhq9Score !== null ? phq9Sev(docPhq9Score) : undefined} />
              <ScoreChip label="GAD-7" score={docGad7Score} max={21} sev={docGad7Score !== null ? gad7Sev(docGad7Score) : undefined} />
            </div>
            <p className="text-xs text-gray-400 ml-auto">
              {displayRisk === 'GREEN'    && 'Intake within 2–3 days'}
              {displayRisk === 'YELLOW'   && 'Same or next day response'}
              {displayRisk === 'RED'      && 'Response within 30 minutes'}
              {displayRisk === 'CRITICAL' && 'Immediate — activate protocol'}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
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
    return (
      <DashboardPageWrapper title="Route Student" subtitle="Route the student based on your documentation recommendation">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CheckCircle2 size={14} className="text-green-500" />
            <span>IC Documentation saved — now route the student</span>
          </div>

          {needsInternal && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2"><Users size={15} className="text-[#2563eb]" /> Internal CPS Referral</p>
                <p className="text-xs text-gray-400">Assign to a specific clinician, or broadcast to the role pool for any available clinician to accept.</p>
              </div>

              {/* Role select */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Refer to</label>
                <div className="flex gap-2">
                  {(['COUNSELOR', 'PSYCHOLOGIST'] as const).map(r => (
                    <button key={r} onClick={() => { setReferralRole(r); setReferralUserId(''); }}
                      className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition ${referralRole === r ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#2563eb]'}`}>
                      {r === 'COUNSELOR' ? 'Counselor' : 'Psychologist'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific vs Pool */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Assignment method</label>
                <div className="flex gap-2">
                  {[{ key: 'pool', label: 'Open pool — anyone can accept' }, { key: 'specific', label: 'Assign to specific person' }].map(opt => (
                    <button key={opt.key} onClick={() => setReferralMode(opt.key as any)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition ${referralMode === opt.key ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#2563eb]'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {referralMode === 'specific' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Select {referralRole === 'COUNSELOR' ? 'counselor' : 'psychologist'}</label>
                  <select value={referralUserId} onChange={e => setReferralUserId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2563eb] outline-none">
                    <option value="">— Select —</option>
                    {referralUserOptions.map(u => <option key={u._id} value={u._id}>{u.label}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {needsExternal && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2"><ExternalLink size={15} className="text-purple-600" /> External Referral</p>
                <p className="text-xs text-gray-400">A formal referral letter will be generated and attached to the case. Give this to the student.</p>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 text-xs text-purple-700">
                {recs.filter(r => r.includes('Psychiatrist') || r.includes('External Support') || r.includes('Faculty / Staff')).map((r, i) => (
                  <p key={i}>• {r.split('–')[0].trim()}</p>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className="block text-xs font-medium text-gray-600 mb-1">Referral notes (optional)</label>
            <textarea value={referralNote} onChange={e => setReferralNote(e.target.value)} rows={3}
              placeholder="Additional context for the receiving clinician…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2563eb] outline-none resize-none" />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setDone(true)}
              className="flex-1 py-2.5 border border-gray-300 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
              Skip referral
            </button>
            <button onClick={handleReferralSubmit} disabled={referralSubmitting || (needsInternal && referralMode === 'specific' && !referralUserId)}
              className="flex-1 py-2.5 bg-[#2563eb] text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-50 transition flex items-center justify-center gap-2">
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
        {/* Score bar */}
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#2563eb] rounded-full transition-all"
              style={{ width: `${(answered / questions.length) * 100}%` }} />
          </div>
          <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">{answered}/{questions.length} answered</span>
          {score !== null && (
            <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">Score: {score}</span>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          {/* Column headers */}
          <div className="grid bg-gray-50 border-b border-gray-100" style={{ gridTemplateColumns: '2rem 1fr repeat(4, 5rem)' }}>
            <div className="px-3 py-2.5" />
            <div className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase">Item</div>
            {FREQ.map(f => (
              <div key={f.v} className="py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase leading-tight px-1">
                <span className="block text-xs font-bold">{f.v}</span>
                {f.s}
              </div>
            ))}
          </div>

          {questions.map((q, i) => {
            const isLast = flagLast && i === questions.length - 1;
            return (
              <div key={i}
                className={`grid border-b border-gray-50 last:border-b-0 transition
                  ${isLast ? 'bg-red-50/50' : answers[i] !== null ? 'bg-green-50/20' : ''}`}
                style={{ gridTemplateColumns: '2rem 1fr repeat(4, 5rem)' }}>
                <div className={`flex items-center justify-center text-xs font-bold ${isLast ? 'text-red-400' : 'text-gray-300'}`}>
                  {i + 1}
                </div>
                <div className="px-3 py-3">
                  <p className="text-sm text-gray-800 leading-snug">{q}</p>
                  {isLast && <p className="text-[10px] text-red-500 font-semibold mt-0.5">C-SSRS required if score &gt; 0</p>}
                </div>
                {FREQ.map(f => (
                  <div key={f.v} className="flex items-center justify-center py-2">
                    <button
                      onClick={() => { const a = [...answers]; a[i] = a[i] === f.v ? null : f.v; setAnswers(a); }}
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition
                        ${answers[i] === f.v
                          ? 'bg-[#2563eb] border-[#2563eb] shadow-sm'
                          : 'border-gray-300 hover:border-[#2563eb]/50 bg-white'}`}>
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
    <DashboardPageWrapper title="Intake Interview" subtitle="Complete assessments and document the session">
      <div className="max-w-3xl mx-auto space-y-4">

        {/* Patient header — persistent throughout */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-start gap-4 p-4">
            <div className="w-10 h-10 rounded-full bg-[#2563eb]/10 flex items-center justify-center flex-shrink-0">
              <User size={18} className="text-[#2563eb]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-gray-900">{studentName}</h2>
                {packet && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">
                    <FileText size={10} /> Intake Forms Submitted
                  </span>
                )}
              </div>
              {studentEmail && <p className="text-xs text-gray-500 mt-0.5">{studentEmail}</p>}
              <p className="text-sm text-gray-700 mt-1.5 leading-snug"><span className="text-xs text-gray-400 font-semibold uppercase">Concern:</span> {concern}</p>
            </div>
            {/* Running scores */}
            <div className="flex gap-2 flex-shrink-0">
              <ScoreChip label="PHQ-9" score={phq9Score} max={27} sev={phq9Score !== null ? phq9Sev(phq9Score) : undefined} />
              <ScoreChip label="GAD-7" score={gad7Score} max={21} sev={gad7Score !== null ? gad7Sev(gad7Score) : undefined} />
              {csrsDone && csrsRisk() && (
                <div className="bg-white rounded-xl p-3 text-center border border-red-200 shadow-sm min-w-[60px]">
                  <p className="text-xs text-red-500 font-semibold">C-SSRS</p>
                  <p className={`text-xs font-bold mt-1 ${csrsRisk() === 'GREEN' ? 'text-blue-700' : csrsRisk() === 'YELLOW' ? 'text-yellow-700' : 'text-red-700'}`}>
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition
                  ${step === s.key ? 'bg-[#2563eb] text-white shadow-sm'
                  : i < stepIdx ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200'
                  : 'bg-gray-100 text-gray-400 cursor-default'}`}>
                {i < stepIdx ? <Check size={11} /> : <span className="w-3 h-3 rounded-full border-current border flex items-center justify-center text-[9px] font-bold">{i+1}</span>}
                {s.label}
              </button>
              {i < allSteps.length - 1 && <ChevronRight size={13} className="text-gray-300 flex-shrink-0" />}
            </div>
          ))}
        </div>

        {/* ── REVIEW / FILL-IN FORMS ─────────────────────────────────────── */}
        {step === 'review' && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-green-50">
              <div className="flex items-center gap-3">
                <Eye size={16} className="text-green-700" />
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {packet ? 'Intake Packet' : 'Intake Forms (Not Pre-Submitted)'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {packet
                      ? `Submitted ${packet.submitted_by_role === 'ic' ? 'by IC during interview' : packet.submitted_by_role === 'oa' ? 'by Office Assistant (walk-in)' : 'by student online'}`
                      : 'Student skipped the pre-intake packet. Fill in the forms together now.'}
                  </p>
                </div>
              </div>
              {packet && !editingPacket && (
                <button onClick={() => setEditingPacket(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition">
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
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Initial Contact Form (ICF)</p>
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
                          <div key={k}><span className="text-gray-400 text-xs">{k}:</span> <span className="font-medium text-gray-800">{v}</span></div>
                        ))}
                        <div className="col-span-2 mt-1 p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-400 mb-1">Presenting Concern</p>
                          <p className="text-sm text-gray-800 font-medium">{packet.icf.presenting_concern || '—'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {packet.spif && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Personal Background (SPIF-IF)</p>
                      <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
                        {[
                          ['Birthdate', packet.spif.birthdate || '—'],
                          ['Gender', packet.spif.gender || '—'],
                          ['Civil Status', packet.spif.civil_status || '—'],
                          ['Family Setup', packet.spif.family_composition?.replace(/_/g,' ') || '—'],
                          ['Living With', packet.spif.living_with || '—'],
                          ['Medical', packet.spif.existing_medical_conditions || 'None'],
                          ['Medications', packet.spif.current_medications || 'None'],
                          ['Prev. Counseling', packet.spif.previous_counseling ? 'Yes' : 'No'],
                          ['Prev. Psychiatric', packet.spif.previous_psychiatric ? 'Yes' : 'No'],
                        ].map(([k, v]) => (
                          <div key={k}><span className="text-gray-400 text-xs">{k}:</span> <span className="font-medium text-gray-800">{v}</span></div>
                        ))}
                        {packet.spif.previous_counseling && packet.spif.previous_counseling_details && (
                          <div className="col-span-3 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                            <span className="font-semibold">Counseling details:</span> {packet.spif.previous_counseling_details}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {packet.phq4_summary && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">PHQ-4 Pre-Screen</p>
                      <div className="grid grid-cols-3 gap-3 mb-2">
                        {[
                          { l: 'PHQ-2 (Depression)', s: packet.phq4_summary.phq2_score, max: 6, risk: packet.phq4_summary.phq2_at_risk },
                          { l: 'GAD-2 (Anxiety)',    s: packet.phq4_summary.gad2_score, max: 6, risk: packet.phq4_summary.gad2_at_risk },
                          { l: 'PHQ-4 Total',         s: packet.phq4_summary.total_score, max: 12, risk: packet.phq4_summary.total_score >= 6 },
                        ].map(x => (
                          <div key={x.l} className={`rounded-xl p-3 text-center ${x.risk ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
                            <p className="text-xs text-gray-500 mb-0.5">{x.l}</p>
                            <p className={`text-xl font-bold ${x.risk ? 'text-red-700' : 'text-blue-700'}`}>{x.s}<span className="text-xs font-normal text-gray-400">/{x.max}</span></p>
                            <p className={`text-[10px] font-semibold ${x.risk ? 'text-red-500' : 'text-green-600'}`}>{x.risk ? '⚠ Elevated' : '✓ Normal'}</p>
                          </div>
                        ))}
                      </div>
                      {packet.phq4_responses && (
                        <div className="text-xs text-gray-600 space-y-1">
                          {['Little interest or pleasure','Feeling down or depressed','Feeling nervous or anxious','Not able to stop worrying'].map((q,i) => (
                            <div key={i} className="flex gap-2">
                              <span className="text-gray-400 w-3">{i+1}.</span>
                              <span className="flex-1">{q}</span>
                              <span className="font-semibold">{fmtFreq(packet.phq4_responses[i] ?? 0)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="px-5 py-4 border-t border-gray-100 flex justify-end bg-gray-50">
                  <button onClick={() => setStep('phq9')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#2563eb] text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition">
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
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Initial Contact Form (ICF)</p>
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
                        <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                        <input
                          value={draftIcf[f.key] || ''}
                          onChange={e => setDraftIcf(p => ({ ...p, [f.key]: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563eb]/25 focus:outline-none"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Service Requested</label>
                      <select value={draftIcf.service_requested || ''}
                        onChange={e => setDraftIcf(p => ({ ...p, service_requested: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563eb]/25 focus:outline-none bg-white">
                        <option value="">— Select —</option>
                        {['personal_counseling','academic_concerns','career_guidance','family_concerns','relationship_concerns','crisis_support','psychiatric_evaluation','other'].map(s => (
                          <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Referral Source</label>
                      <select value={draftIcf.referral_source || ''}
                        onChange={e => setDraftIcf(p => ({ ...p, referral_source: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563eb]/25 focus:outline-none bg-white">
                        <option value="">— Select —</option>
                        {['self_referred','faculty_referred','parent_referred','friend_referred','online_referral','office_referred'].map(s => (
                          <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 mb-1.5">Emergency Contact</p>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { key: 'emergency_contact_name',         label: 'Name' },
                          { key: 'emergency_contact_relationship', label: 'Relationship' },
                          { key: 'emergency_contact_phone',        label: 'Phone' },
                        ] as { key: string; label: string }[]).map(f => (
                          <div key={f.key}>
                            <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                            <input value={draftIcf[f.key] || ''}
                              onChange={e => setDraftIcf(p => ({ ...p, [f.key]: e.target.value }))}
                              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563eb]/25 focus:outline-none" />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Presenting Concern</label>
                      <textarea rows={3} value={draftIcf.presenting_concern || ''}
                        onChange={e => setDraftIcf(p => ({ ...p, presenting_concern: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563eb]/25 focus:outline-none resize-none" />
                    </div>
                  </div>
                </div>

                {/* SPIF-IF */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Personal Background (SPIF-IF)</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Birthdate</label>
                      <input type="date" value={draftSpif.birthdate || ''}
                        onChange={e => setDraftSpif(p => ({ ...p, birthdate: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563eb]/25 focus:outline-none" />
                    </div>
                    {([
                      { key: 'gender',       label: 'Gender',       opts: ['male','female','non_binary','prefer_not_to_say'] },
                      { key: 'civil_status', label: 'Civil Status', opts: ['single','married','separated','widowed'] },
                      { key: 'family_composition', label: 'Family Setup', opts: ['complete','single_parent','blended','extended','others'] },
                    ] as { key: string; label: string; opts: string[] }[]).map(f => (
                      <div key={f.key}>
                        <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                        <select value={draftSpif[f.key] || ''}
                          onChange={e => setDraftSpif(p => ({ ...p, [f.key]: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563eb]/25 focus:outline-none bg-white">
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
                        <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                        <input value={draftSpif[f.key] || ''}
                          onChange={e => setDraftSpif(p => ({ ...p, [f.key]: e.target.value }))}
                          placeholder="None"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563eb]/25 focus:outline-none" />
                      </div>
                    ))}
                    <div className="col-span-3 grid grid-cols-2 gap-3">
                      {([
                        { key: 'previous_counseling',  label: 'Previous Counseling?' },
                        { key: 'previous_psychiatric', label: 'Previous Psychiatric Treatment?' },
                      ] as { key: string; label: string }[]).map(f => (
                        <label key={f.key} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                          <input type="checkbox" checked={!!draftSpif[f.key]}
                            onChange={e => setDraftSpif(p => ({ ...p, [f.key]: e.target.checked }))}
                            className="w-4 h-4 rounded border-gray-300 text-blue-700" />
                          <span className="text-sm text-gray-700">{f.label}</span>
                        </label>
                      ))}
                    </div>
                    {draftSpif.previous_counseling && (
                      <div className="col-span-3">
                        <label className="block text-xs text-gray-500 mb-1">Counseling Details</label>
                        <input value={draftSpif.previous_counseling_details || ''}
                          onChange={e => setDraftSpif(p => ({ ...p, previous_counseling_details: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563eb]/25 focus:outline-none" />
                      </div>
                    )}
                  </div>
                </div>

                {/* PHQ-4 */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">PHQ-4 Pre-Screen</p>
                  <div className="space-y-2">
                    {[
                      'Little interest or pleasure in doing things',
                      'Feeling down, depressed, or hopeless',
                      'Feeling nervous, anxious, or on edge',
                      'Not being able to stop or control worrying',
                    ].map((q, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <span className="text-xs text-gray-400 w-3">{i+1}.</span>
                        <span className="flex-1 text-sm text-gray-700">{q}</span>
                        <div className="flex gap-1.5">
                          {FREQ.map(f => (
                            <button key={f.v}
                              onClick={() => { const a = [...draftPhq4]; a[i] = a[i] === f.v ? null : f.v; setDraftPhq4(a); }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border-2 transition
                                ${draftPhq4[i] === f.v
                                  ? 'bg-[#2563eb] border-[#2563eb] text-white'
                                  : 'border-gray-200 text-gray-600 hover:border-[#2563eb]/40 bg-white'}`}>
                              {f.v}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {packetMsg && (
                  <p className={`text-xs font-medium ${packetMsg.includes('saved') ? 'text-blue-700' : 'text-red-600'}`}>{packetMsg}</p>
                )}
              </div>
            )}

            {/* ── Edit/Fill-in footer ─────────────────────────────────── */}
            {(!packet || editingPacket) && (
              <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
                {editingPacket && (
                  <button onClick={() => setEditingPacket(false)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition">
                    <X size={12} /> Cancel
                  </button>
                )}
                <div className="flex-1" />
                <button onClick={savePacket} disabled={savingPacket}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-300 disabled:opacity-50 transition">
                  {savingPacket ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  {savingPacket ? 'Saving…' : 'Save Forms'}
                </button>
                <button onClick={() => setStep('phq9')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#2563eb] text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition">
                  {packet ? 'Proceed to PHQ-9' : 'Skip & Go to PHQ-9'} <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── PHQ-9 ──────────────────────────────────────────────────────── */}
        {step === 'phq9' && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50">
              <div>
                <p className="text-sm font-bold text-gray-900">PHQ-9 — Patient Health Questionnaire</p>
                <p className="text-xs text-gray-500 mt-0.5">Over the <strong>last 2 weeks</strong>, how often has the student been bothered by each of the following?</p>
              </div>
              {phq9Score !== null && (
                <div className="text-center flex-shrink-0 ml-4">
                  <p className="text-2xl font-bold text-gray-900">{phq9Score}<span className="text-xs text-gray-400">/27</span></p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${phq9Sev(phq9Score).cls}`}>{phq9Sev(phq9Score).label}</span>
                </div>
              )}
            </div>
            <div className="p-5">
              <AssessmentTable questions={PHQ9} answers={phq9} setAnswers={setPhq9} flagLast />
            </div>
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button onClick={() => setStep('review')} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                <ChevronLeft size={13} /> Intake Forms
              </button>
              <div className="flex-1" />
              <button onClick={() => { setPhq9(Array(9).fill(null)); setStep('gad7'); }}
                className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 mr-4 transition">
                Skip assessment
              </button>
              <button onClick={handlePhq9Next} disabled={!phq9Done}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#2563eb] text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40 transition">
                {phq9Done && phq9[8]! > 0 ? 'C-SSRS Required' : 'Continue to GAD-7'} <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── C-SSRS ─────────────────────────────────────────────────────── */}
        {step === 'cssr_s' && (
          <div className="bg-white border border-red-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-red-100 bg-red-50">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-900">C-SSRS — Columbia Suicide Severity Rating Scale</p>
                  <p className="text-xs text-red-700 mt-0.5">PHQ-9 Q9 &gt; 0 — suicidal ideation indicated. Administer C-SSRS immediately. Timeframe: <strong>last month</strong>.</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-center text-gray-500 uppercase mb-1 px-2">
                <span className="text-left text-xs">#  Question</span>
                <span className="col-span-2 text-right">Response</span>
              </div>
              {CSSRS.map((q, i) => {
                const severity = i <= 1 ? 'low' : i <= 3 ? 'medium' : 'high';
                const dotCls = severity === 'low' ? 'bg-yellow-400' : severity === 'medium' ? 'bg-orange-500' : 'bg-red-600';
                return (
                  <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border transition
                    ${cssr[i] === true ? 'bg-red-50 border-red-200' : cssr[i] === false ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-0.5 ${dotCls}`}>{i+1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{q.label}</p>
                      <p className="text-sm text-gray-800 leading-snug">{q.text}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {[{ v: true, l: 'YES', cls: cssr[i] === true ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-red-600 hover:border-red-400 hover:bg-red-50' },
                        { v: false, l: 'NO',  cls: cssr[i] === false ? 'bg-green-600 text-white border-blue-600' : 'border-gray-300 text-green-700 hover:border-green-400 hover:bg-green-50' }]
                        .map(opt => (
                        <button key={String(opt.v)} onClick={() => { const a = [...cssr]; a[i] = a[i] === opt.v ? null : opt.v; setCssr(a); }}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold border-2 transition ${opt.cls}`}>
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {csrsDone && csrsRisk() && (
                <div className={`rounded-xl p-4 border flex items-center gap-3 mt-2
                  ${csrsRisk() === 'CRITICAL' ? 'bg-red-100 border-red-400' : csrsRisk() === 'RED' ? 'bg-red-50 border-red-200' : csrsRisk() === 'YELLOW' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                  <RiskBadge risk={csrsRisk()!} />
                  <p className="text-xs text-gray-700">
                    {csrsRisk() === 'CRITICAL' && <strong>⚠ Imminent risk — activate emergency protocol immediately. Do not leave student alone.</strong>}
                    {csrsRisk() === 'RED'      && 'High risk — notify supervisor immediately. Safety plan required.'}
                    {csrsRisk() === 'YELLOW'   && 'Moderate risk — active ideation without intent. Safety planning required.'}
                    {csrsRisk() === 'GREEN'    && 'Low risk — passive ideation only. Document and monitor closely.'}
                  </p>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button onClick={() => setStep('phq9')} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                <ChevronLeft size={13} /> PHQ-9
              </button>
              <p className="text-xs text-gray-400">{cssr.filter(v => v !== null).length} / 6 answered</p>
              <div className="flex items-center gap-4">
                <button onClick={() => { setCssr(Array(6).fill(null)); setStep('gad7'); }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition">
                  Skip assessment
                </button>
                <button onClick={() => setStep('gad7')} disabled={!csrsDone}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#2563eb] text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40 transition">
                  Continue to GAD-7 <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── GAD-7 ──────────────────────────────────────────────────────── */}
        {step === 'gad7' && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-purple-50">
              <div>
                <p className="text-sm font-bold text-gray-900">GAD-7 — Generalized Anxiety Disorder Scale</p>
                <p className="text-xs text-gray-500 mt-0.5">Over the <strong>last 2 weeks</strong>, how often has the student been bothered by each of the following?</p>
              </div>
              {gad7Score !== null && (
                <div className="text-center flex-shrink-0 ml-4">
                  <p className="text-2xl font-bold text-gray-900">{gad7Score}<span className="text-xs text-gray-400">/21</span></p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${gad7Sev(gad7Score).cls}`}>{gad7Sev(gad7Score).label}</span>
                </div>
              )}
            </div>
            <div className="p-5">
              <AssessmentTable questions={GAD7} answers={gad7} setAnswers={setGad7} />
            </div>
            {error && (
              <div className="mx-5 mb-3 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                <AlertTriangle size={13} className="flex-shrink-0" />{error}
              </div>
            )}
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button onClick={() => setStep(phq9[8] !== null && phq9[8]! > 0 ? 'cssr_s' : 'phq9')}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                <ChevronLeft size={13} /> Back
              </button>
              <div className="flex items-center gap-4">
                <button onClick={() => { setGad7(Array(7).fill(null)); handleAutoTriage(); }}
                  disabled={submitting}
                  className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition disabled:opacity-40">
                  Skip assessment
                </button>
                <button onClick={handleAutoTriage} disabled={!gad7Done || submitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#2563eb] text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40 transition">
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <>Proceed to Documentation <ChevronRight size={14} /></>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* placeholder to keep the diff anchor — triage step removed */}
        {false && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
            </div>
            <div className="p-5 space-y-5">
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <ScoreChip label="PHQ-9" score={phq9Score} max={27} sev={phq9Score !== null ? phq9Sev(phq9Score) : undefined} />
                  <ScoreChip label="GAD-7" score={gad7Score} max={21} sev={gad7Score !== null ? gad7Sev(gad7Score) : undefined} />
                  {csrsDone && (
                    <div className={`bg-white rounded-xl p-3 text-center border shadow-sm ${csrsRisk() === 'GREEN' ? 'border-green-200' : 'border-red-200'}`}>
                      <p className="text-xs text-gray-500 font-semibold mb-1">C-SSRS</p>
                      <RiskBadge risk={csrsRisk()!} />
                    </div>
                  )}
                  <div className="bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center">
                    <p className="text-xs text-gray-500 font-semibold mb-1">Calculated Risk</p>
                    <RiskBadge risk={calculatedRisk} />
                  </div>
                </div>
              </div>

              {/* PHQ-9 Q9 note */}
              {phq9[8] !== null && phq9[8]! > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">PHQ-9 Q9 (suicidal ideation) answered above 0. C-SSRS administered. Review findings above before deciding.</p>
                </div>
              )}

              {/* IC override */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Clinical Override <span className="normal-case text-gray-400 font-normal">(optional — use if your judgment differs from the algorithm)</span>
                </label>
                <select value={riskOverride} onChange={e => setRiskOverride(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2563eb]/25 focus:outline-none bg-white">
                  <option value="">— Use algorithm result: {calculatedRisk} —</option>
                  <option value="GREEN">Code Green — Low Risk</option>
                  <option value="YELLOW">Code Yellow — Moderate Risk</option>
                  <option value="RED">Code Red — High Risk</option>
                  <option value="CRITICAL">Critical — Immediate Response Required</option>
                </select>
                {riskOverride && (
                  <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                    <AlertTriangle size={11} /> Risk manually set to <strong>{riskOverride}</strong> by IC clinical judgment.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardPageWrapper>
  );
}
