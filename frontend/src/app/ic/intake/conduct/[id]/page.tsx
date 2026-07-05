'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import {
  Loader2, ChevronLeft, ChevronRight, CheckCircle2,
  AlertTriangle, ShieldAlert, Shield, Activity,
  FileText, Eye, Check, User, Pencil, Save, X,
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

type Step = 'review' | 'phq9' | 'cssr_s' | 'gad7' | 'triage';

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
  const [decision, setDecision]                 = useState('');
  const [endNotes, setEndNotes]                 = useState('');
  const [assignedCounselorId, setAssignedCounselorId] = useState('');
  const [counselorOptions, setCounselorOptions] = useState<{ _id: string; label: string }[]>([]);
  const [loadingCounselors, setLoadingCounselors] = useState(false);

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
        const apptId = data.appointment_id || intakeId;
        try {
          const pr = await fetch(api(`/api/intake/packet/${apptId}`), { headers: { Authorization: `Bearer ${token}` } });
          if (pr.ok) {
            const pd = await pr.json();
            if (pd.submitted !== false) { setPacket(pd); setStep('review'); }
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

  useEffect(() => {
    if (decision !== 'ENDORSE_CC' && decision !== 'ENDORSE_CP') {
      setCounselorOptions([]); setAssignedCounselorId(''); return;
    }
    const role = decision === 'ENDORSE_CC' ? 'COUNSELOR' : 'PSYCHOLOGIST';
    setLoadingCounselors(true);
    const token = localStorage.getItem('token');
    fetch(api(`/api/users?role=${role}`), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { users: [] })
      .then(d => {
        const opts = (d.users || []).map((u: any) => ({
          _id: u._id,
          label: `${(u.last_name || '').toUpperCase()}, ${u.first_name || ''}`,
        }));
        setCounselorOptions(opts);
      })
      .finally(() => setLoadingCounselors(false));
  }, [decision]);

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

  const calculatedRisk = calcRisk();
  const displayRisk    = riskOverride || calculatedRisk;
  const phq9Done = phq9.every(v => v !== null);
  const gad7Done = gad7.every(v => v !== null);
  const csrsDone = cssr.every(v => v !== null);

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

  const handleSubmit = async () => {
    if (!decision) { setError('Please select a triage decision before submitting.'); return; }
    if ((decision === 'ENDORSE_CC' || decision === 'ENDORSE_CP') && !assignedCounselorId) {
      setError('Please select a counselor to assign before submitting.'); return;
    }
    setSubmitting(true); setError('');
    const token = localStorage.getItem('token');
    try {
      const realId = intake?._id || intakeId;
      const r = await fetch(api(`/api/intake/${realId}/triage`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phq9_responses: phq9Done ? phq9 : [],
          gad7_responses: gad7Done ? gad7 : [],
          cssr_responses: csrsDone ? cssr : [],
          risk_override: riskOverride || null,
          triage_decision: decision,
          endorsement_notes: endNotes,
          assigned_counselor_id: assignedCounselorId || null,
        }),
      });
      const d = await r.json();
      if (r.ok) setDone(true);
      else setError(d.error || 'Failed to submit triage.');
    } finally { setSubmitting(false); }
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

  // Already triaged — show read-only summary instead of the form again
  if (intake.status === 'COMPLETED' && intake.triage_decision && !done) {
    const prevRisk = intake.risk_level || 'GREEN';
    const prevDecision = intake.triage_decision;
    return (
      <DashboardPageWrapper title="Conduct Intake" subtitle="">
        <div className="max-w-lg mx-auto mt-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className={`px-6 pt-8 pb-6 text-center ${prevRisk === 'CRITICAL' || prevRisk === 'RED' ? 'bg-red-700' : 'bg-[#2563eb]'}`}>
              <CheckCircle2 size={40} className="text-white mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white">Triage Already Submitted</h2>
              <p className="text-white/80 text-sm mt-1">{intake.student_name || '—'}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex justify-center"><RiskBadge risk={prevRisk} /></div>
              <p className="text-sm text-gray-600 text-center">
                {prevDecision === 'CLOSE_AT_INTAKE' && 'Case was closed at intake.'}
                {prevDecision === 'ENDORSE_CC' && 'Case endorsed to a Continuing Counselor (CC).'}
                {prevDecision === 'ENDORSE_CP' && 'Case endorsed to a Continuing Psychologist (CP).'}
              </p>
              {(intake.phq9_score != null || intake.gad7_score != null) && (
                <div className="grid grid-cols-2 gap-3 text-center">
                  {intake.phq9_score != null && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">PHQ-9</p>
                      <p className="text-xl font-bold text-gray-800">{intake.phq9_score}/27</p>
                    </div>
                  )}
                  {intake.gad7_score != null && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">GAD-7</p>
                      <p className="text-xl font-bold text-gray-800">{intake.gad7_score}/21</p>
                    </div>
                  )}
                </div>
              )}
              {intake.endorsement_notes && (
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">Clinical Notes</p>
                  <p className="text-sm text-gray-700">{intake.endorsement_notes}</p>
                </div>
              )}
              <button onClick={() => router.push('/appointment-requests')}
                className="w-full py-2.5 bg-[#2563eb] text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition">
                Back to Pending Intakes
              </button>
            </div>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <DashboardPageWrapper title="Conduct Intake" subtitle="">
        <div className="max-w-lg mx-auto mt-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className={`px-6 pt-8 pb-6 text-center ${displayRisk === 'CRITICAL' || displayRisk === 'RED' ? 'bg-red-700' : 'bg-[#2563eb]'}`}>
              <CheckCircle2 size={40} className="text-white mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white">Triage Submitted</h2>
              <p className="text-white/80 text-sm mt-1">{intake.student_name || '—'}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex justify-center"><RiskBadge risk={displayRisk} /></div>
              <p className="text-sm text-gray-600 text-center">
                {decision === 'CLOSE_AT_INTAKE' && 'Case closed at intake — no continuing sessions needed.'}
                {decision === 'ENDORSE_CC'       && 'Case endorsed to a Continuing Counselor (CC).'}
                {decision === 'ENDORSE_CP'       && 'Case endorsed to a Continuing Psychologist (CP).'}
              </p>
              <div className="grid grid-cols-2 gap-3 text-center">
                {phq9Score !== null && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">PHQ-9</p>
                    <p className="text-xl font-bold text-gray-800">{phq9Score}/27</p>
                  </div>
                )}
                {gad7Score !== null && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">GAD-7</p>
                    <p className="text-xl font-bold text-gray-800">{gad7Score}/21</p>
                  </div>
                )}
              </div>
              <button onClick={() => router.push('/appointment-requests')}
                className="w-full py-2.5 bg-[#2563eb] text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition">
                Back to Pending Intakes
              </button>
            </div>
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
    { key: 'triage', label: 'Triage' },
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
    <DashboardPageWrapper title="Intake Interview" subtitle="Conduct triage assessment and make endorsement decision">
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
                <Eye size={16} className="text-blue-700" />
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
                        { v: false, l: 'NO',  cls: cssr[i] === false ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-green-700 hover:border-green-400 hover:bg-green-50' }]
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
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button onClick={() => setStep(phq9[8] !== null && phq9[8]! > 0 ? 'cssr_s' : 'phq9')}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                <ChevronLeft size={13} /> Back
              </button>
              <div className="flex items-center gap-4">
                <button onClick={() => { setGad7(Array(7).fill(null)); setStep('triage'); }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition">
                  Skip assessment
                </button>
                <button onClick={() => setStep('triage')} disabled={!gad7Done}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#2563eb] text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40 transition">
                  Triage Decision <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Triage ─────────────────────────────────────────────────────── */}
        {step === 'triage' && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-900">Triage Decision</p>
              <p className="text-xs text-gray-400 mt-0.5">Review all assessment data and determine the appropriate next step for this student.</p>
            </div>
            <div className="p-5 space-y-5">

              {/* Score summary cards */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Assessment Summary</p>
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

              {/* Final risk display */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Final Risk Level</p>
                  <RiskBadge risk={displayRisk} />
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 mb-1">Recommended response</p>
                  <p className="text-xs font-semibold text-gray-700">
                    {displayRisk === 'GREEN'    && 'Intake 2–3 days'}
                    {displayRisk === 'YELLOW'   && 'Same or next day'}
                    {displayRisk === 'RED'      && 'Within 30 minutes'}
                    {displayRisk === 'CRITICAL' && 'Immediate — activate protocol'}
                  </p>
                </div>
              </div>

              {/* Triage decision */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Triage Decision <span className="text-red-400">*</span></p>
                <div className="space-y-2">
                  {[
                    { v: 'ENDORSE_CC',      l: 'Endorse to Continuing Counselor (CC)',    d: 'For developmental, non-clinical concerns. Assigns to a licensed counselor for ongoing sessions.' },
                    { v: 'ENDORSE_CP',      l: 'Endorse to Continuing Psychologist (CP)', d: 'For clinical or psychiatric concerns. Assigns to a licensed psychologist for deeper assessment.' },
                    { v: 'CLOSE_AT_INTAKE', l: 'Close at Intake',                          d: 'Concern addressed during this session. No continuing sessions required.' },
                  ].map(opt => (
                    <label key={opt.v}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition
                        ${decision === opt.v ? 'border-[#2563eb] bg-green-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition
                        ${decision === opt.v ? 'bg-[#2563eb] border-[#2563eb]' : 'border-gray-300'}`}>
                        {decision === opt.v && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <input type="radio" name="decision" value={opt.v} checked={decision === opt.v} onChange={() => setDecision(opt.v)} className="sr-only" />
                      <div>
                        <p className="text-sm font-bold text-gray-800">{opt.l}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{opt.d}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Counselor assignment — shown when endorsing */}
              {(decision === 'ENDORSE_CC' || decision === 'ENDORSE_CP') && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                    Assign {decision === 'ENDORSE_CC' ? 'Counselor' : 'Psychologist'} <span className="text-red-400">*</span>
                  </label>
                  {loadingCounselors ? (
                    <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                      <Loader2 size={12} className="animate-spin" /> Loading available staff…
                    </div>
                  ) : (
                    <select
                      value={assignedCounselorId}
                      onChange={e => setAssignedCounselorId(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2563eb]/25 focus:outline-none bg-white">
                      <option value="">— Select {decision === 'ENDORSE_CC' ? 'a counselor' : 'a psychologist'} —</option>
                      {counselorOptions.map(c => (
                        <option key={c._id} value={c._id}>{c.label}</option>
                      ))}
                    </select>
                  )}
                  {counselorOptions.length === 0 && !loadingCounselors && (
                    <p className="text-xs text-amber-600 mt-1">No available {decision === 'ENDORSE_CC' ? 'counselors' : 'psychologists'} found.</p>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Clinical Notes & Endorsement Rationale</label>
                <textarea rows={4} value={endNotes} onChange={e => setEndNotes(e.target.value)}
                  placeholder="Document your clinical observations, MSE notes, endorsement rationale, or closure reason…"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2563eb]/25 focus:outline-none resize-none bg-white" />
              </div>

              {error && (
                <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />{error}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button onClick={() => setStep('gad7')} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                <ChevronLeft size={13} /> GAD-7
              </button>
              <button onClick={handleSubmit} disabled={submitting || !decision}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#2563eb] text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40 transition">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {submitting ? 'Submitting…' : 'Submit Triage Decision'}
              </button>
            </div>
          </div>
        )}

      </div>
    </DashboardPageWrapper>
  );
}
