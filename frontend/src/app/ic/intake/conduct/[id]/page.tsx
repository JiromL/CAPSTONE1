'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import {
  Loader2, ChevronLeft, ChevronRight, CheckCircle2,
  AlertTriangle, ShieldAlert, Shield, Activity,
} from 'lucide-react';

// ── PHQ-9 ─────────────────────────────────────────────────────────────────────
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

// ── GAD-7 ─────────────────────────────────────────────────────────────────────
const GAD7_QUESTIONS = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it is hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid, as if something awful might happen',
];

const FREQ_OPTIONS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
];

// ── Risk display ──────────────────────────────────────────────────────────────
function RiskBadge({ risk }: { risk: string }) {
  const cfg: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    GREEN:    { cls: 'bg-green-50 text-green-700 ring-1 ring-green-200',   icon: <Shield size={14} />,       label: 'Green — Low Risk' },
    YELLOW:   { cls: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200', icon: <Activity size={14} />,     label: 'Yellow — Moderate Risk' },
    RED:      { cls: 'bg-red-50 text-red-700 ring-1 ring-red-200',         icon: <AlertTriangle size={14} />, label: 'Red — High Risk' },
    CRITICAL: { cls: 'bg-red-100 text-red-800 ring-2 ring-red-400',        icon: <ShieldAlert size={14} />,   label: 'Critical — Immediate Attention' },
  };
  const c = cfg[risk] ?? cfg.GREEN;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${c.cls}`}>
      {c.icon} {c.label}
    </span>
  );
}

// ── Score interpretation ──────────────────────────────────────────────────────
function phq9Severity(score: number) {
  if (score >= 20) return 'Severe depression';
  if (score >= 15) return 'Moderately severe depression';
  if (score >= 10) return 'Moderate depression';
  if (score >= 5)  return 'Mild depression';
  return 'Minimal / none';
}
function gad7Severity(score: number) {
  if (score >= 15) return 'Severe anxiety';
  if (score >= 10) return 'Moderate anxiety';
  if (score >= 5)  return 'Mild anxiety';
  return 'Minimal / none';
}

type Step = 'phq9' | 'gad7' | 'triage';

export default function ConductIntakePage() {
  const { id: intakeId } = useParams<{ id: string }>();
  const router = useRouter();

  const [intake, setIntake]     = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [step, setStep]         = useState<Step>('phq9');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState('');

  // PHQ-9: 9 answers, null = not yet answered
  const [phq9, setPhq9]   = useState<(number | null)[]>(Array(9).fill(null));
  // GAD-7: 7 answers
  const [gad7, setGad7]   = useState<(number | null)[]>(Array(7).fill(null));

  // Triage decision
  const [riskOverride, setRiskOverride]   = useState('');
  const [decision, setDecision]           = useState('');
  const [endNotes, setEndNotes]           = useState('');

  const fetchIntake = useCallback(async () => {
    const token = localStorage.getItem('token');
    const r = await fetch(api(`/api/intake/${intakeId}`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) setIntake(await r.json());
    setLoading(false);
  }, [intakeId]);

  useEffect(() => { fetchIntake(); }, [fetchIntake]);

  // Derived scores
  const phq9Score = phq9.every(v => v !== null) ? phq9.reduce((a, b) => a! + b!, 0)! : null;
  const gad7Score = gad7.every(v => v !== null) ? gad7.reduce((a, b) => a! + b!, 0)! : null;

  function calcRisk(p: number | null, g: number | null): string {
    if ((p !== null && p > 20) || (g !== null && g > 15)) return 'RED';
    if ((p !== null && p > 15) || (g !== null && g > 12)) return 'YELLOW';
    return 'GREEN';
  }
  const calculatedRisk = calcRisk(phq9Score, gad7Score);
  const displayRisk    = riskOverride || calculatedRisk;

  const phq9Done = phq9.every(v => v !== null);
  const gad7Done = gad7.every(v => v !== null);

  const handleSubmit = async () => {
    if (!decision) { setError('Please select a triage decision.'); return; }
    setSubmitting(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/intake/${intakeId}/triage`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phq9_responses: phq9Done ? phq9 : [],
          gad7_responses: gad7Done ? gad7 : [],
          risk_override: riskOverride || null,
          triage_decision: decision,
          endorsement_notes: endNotes,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        setDone(true);
      } else {
        setError(d.error || 'Failed to submit triage.');
      }
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <DashboardPageWrapper title="Conduct Intake" subtitle="">
      <div className="flex items-center justify-center h-48">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    </DashboardPageWrapper>
  );

  if (!intake) return (
    <DashboardPageWrapper title="Conduct Intake" subtitle="">
      <p className="text-red-500 text-sm">Intake record not found.</p>
    </DashboardPageWrapper>
  );

  // ── Done screen ─────────────────────────────────────────────────────────────
  if (done) {
    return (
      <DashboardPageWrapper title="Conduct Intake" subtitle="">
        <div className="max-w-lg mx-auto mt-10 bg-white rounded-2xl shadow border border-gray-100 p-8 text-center">
          <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">Triage Submitted</h2>
          <p className="text-sm text-gray-500 mb-2">Risk level: <RiskBadge risk={riskOverride || calculatedRisk} /></p>
          <p className="text-sm text-gray-500 mb-6">
            {decision === 'CLOSE_AT_INTAKE' && 'Case closed at intake — no continuing sessions needed.'}
            {decision === 'ENDORSE_CC' && 'Case endorsed to a Continuing Counselor (CC).'}
            {decision === 'ENDORSE_CP' && 'Case endorsed to a Continuing Psychologist (CP).'}
          </p>
          <button onClick={() => router.push('/ic/intake/pending')}
            className="px-5 py-2 bg-[#1a5228] hover:bg-green-800 text-white text-sm font-medium rounded-lg transition">
            Back to Pending Intakes
          </button>
        </div>
      </DashboardPageWrapper>
    );
  }

  // ── Student info banner ─────────────────────────────────────────────────────
  const studentName  = intake.student_name || intake.student?.name || '—';
  const studentEmail = intake.student_email || intake.student?.email || '';
  const concern      = intake.concern || intake.responses?.concern || '—';

  const STEPS: Step[] = ['phq9', 'gad7', 'triage'];
  const stepIdx = STEPS.indexOf(step);

  return (
    <DashboardPageWrapper title="Conduct Intake Session" subtitle="Administer assessments and make triage decision">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Student info */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-4 text-sm">
          <div><span className="text-xs text-gray-400 uppercase font-semibold">Student</span><p className="font-semibold text-gray-900 mt-0.5">{studentName}</p></div>
          {studentEmail && <div><span className="text-xs text-gray-400 uppercase font-semibold">Email</span><p className="text-gray-700 mt-0.5">{studentEmail}</p></div>}
          <div><span className="text-xs text-gray-400 uppercase font-semibold">Concern</span><p className="text-gray-700 mt-0.5">{concern}</p></div>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          {(['phq9', 'gad7', 'triage'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full ${step === s ? 'bg-[#1a5228] text-white' : i < stepIdx ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                {i < stepIdx ? '✓ ' : ''}{s === 'phq9' ? 'PHQ-9' : s === 'gad7' ? 'GAD-7' : 'Triage Decision'}
              </span>
              {i < 2 && <ChevronRight size={14} className="text-gray-300" />}
            </div>
          ))}
        </div>

        {/* ── PHQ-9 ──────────────────────────────────────────────────────────── */}
        {step === 'phq9' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
              <h2 className="font-semibold text-gray-900">PHQ-9 — Patient Health Questionnaire</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Over the <strong>last 2 weeks</strong>, how often has the student been bothered by the following?
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {PHQ9_QUESTIONS.map((q, i) => (
                <div key={i} className="px-6 py-4">
                  <p className="text-sm text-gray-800 mb-3"><span className="font-semibold text-gray-400 mr-2">{i + 1}.</span>{q}</p>
                  <div className="flex flex-wrap gap-2">
                    {FREQ_OPTIONS.map(opt => (
                      <button key={opt.value}
                        onClick={() => { const a = [...phq9]; a[i] = opt.value; setPhq9(a); }}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition font-medium
                          ${phq9[i] === opt.value
                            ? 'bg-[#1a5228] text-white border-[#1a5228]'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-700'}`}>
                        {opt.value} — {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">{phq9.filter(v => v !== null).length} / 9 answered</p>
              {phq9Score !== null && (
                <span className="text-sm font-semibold text-gray-700">
                  Score: {phq9Score} / 27 — {phq9Severity(phq9Score)}
                </span>
              )}
              <button onClick={() => setStep('gad7')} disabled={!phq9Done}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#1a5228] hover:bg-green-800 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition">
                Next: GAD-7 <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── GAD-7 ──────────────────────────────────────────────────────────── */}
        {step === 'gad7' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 bg-purple-50 border-b border-purple-100">
              <h2 className="font-semibold text-gray-900">GAD-7 — Generalized Anxiety Disorder Scale</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Over the <strong>last 2 weeks</strong>, how often has the student been bothered by the following?
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {GAD7_QUESTIONS.map((q, i) => (
                <div key={i} className="px-6 py-4">
                  <p className="text-sm text-gray-800 mb-3"><span className="font-semibold text-gray-400 mr-2">{i + 1}.</span>{q}</p>
                  <div className="flex flex-wrap gap-2">
                    {FREQ_OPTIONS.map(opt => (
                      <button key={opt.value}
                        onClick={() => { const a = [...gad7]; a[i] = opt.value; setGad7(a); }}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition font-medium
                          ${gad7[i] === opt.value
                            ? 'bg-[#1a5228] text-white border-[#1a5228]'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-purple-400 hover:text-purple-700'}`}>
                        {opt.value} — {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <button onClick={() => setStep('phq9')}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition">
                <ChevronLeft size={13} /> Back
              </button>
              {gad7Score !== null && (
                <span className="text-sm font-semibold text-gray-700">
                  Score: {gad7Score} / 21 — {gad7Severity(gad7Score)}
                </span>
              )}
              <button onClick={() => setStep('triage')} disabled={!gad7Done}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#1a5228] hover:bg-green-800 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition">
                Next: Triage <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Triage Decision ────────────────────────────────────────────────── */}
        {step === 'triage' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Triage Decision</h2>
              <p className="text-xs text-gray-400 mt-0.5">Review scores and determine next steps.</p>
            </div>
            <div className="px-6 py-5 space-y-5">

              {/* Score summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-xs font-semibold text-blue-600 uppercase mb-1">PHQ-9</p>
                  {phq9Score !== null
                    ? <><p className="text-3xl font-bold text-blue-800">{phq9Score}</p><p className="text-xs text-blue-600 mt-1">{phq9Severity(phq9Score)}</p></>
                    : <p className="text-sm text-gray-400 italic">Not administered</p>}
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <p className="text-xs font-semibold text-purple-600 uppercase mb-1">GAD-7</p>
                  {gad7Score !== null
                    ? <><p className="text-3xl font-bold text-purple-800">{gad7Score}</p><p className="text-xs text-purple-600 mt-1">{gad7Severity(gad7Score)}</p></>
                    : <p className="text-sm text-gray-400 italic">Not administered</p>}
                </div>
              </div>

              {/* Calculated risk */}
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Calculated Risk</p>
                  <RiskBadge risk={calculatedRisk} />
                </div>
              </div>

              {/* IC risk override */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  IC Risk Override <span className="normal-case font-normal text-gray-400">(optional — if clinical judgment differs)</span>
                </label>
                <select value={riskOverride} onChange={e => setRiskOverride(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a5228]/30 focus:outline-none">
                  <option value="">— Use calculated risk ({calculatedRisk}) —</option>
                  <option value="GREEN">Green — Low Risk</option>
                  <option value="YELLOW">Yellow — Moderate Risk</option>
                  <option value="RED">Red — High Risk</option>
                  <option value="CRITICAL">Critical — Immediate Attention</option>
                </select>
                {riskOverride && <p className="text-xs text-amber-600 mt-1">Risk overridden to <strong>{riskOverride}</strong> by IC clinical judgment.</p>}
              </div>

              {/* Triage decision */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Triage Decision *</label>
                <div className="space-y-2">
                  {[
                    { value: 'ENDORSE_CC', label: 'Endorse to Continuing Counselor (CC)', desc: 'Developmental / non-clinical concerns — assign to a COUNSELOR.' },
                    { value: 'ENDORSE_CP', label: 'Endorse to Continuing Psychologist (CP)', desc: 'Clinical / psychiatric concerns — assign to a PSYCHOLOGIST.' },
                    { value: 'CLOSE_AT_INTAKE', label: 'Close at Intake', desc: 'Concern resolved at intake — no continuing sessions needed.' },
                  ].map(opt => (
                    <label key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition
                        ${decision === opt.value ? 'border-[#1a5228] bg-green-50' : 'border-gray-200 hover:border-green-300'}`}>
                      <input type="radio" name="decision" value={opt.value}
                        checked={decision === opt.value} onChange={() => setDecision(opt.value)}
                        className="mt-0.5 accent-[#1a5228]" />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                        <p className="text-xs text-gray-500">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes / Endorsement Rationale</label>
                <textarea rows={3} value={endNotes} onChange={e => setEndNotes(e.target.value)}
                  placeholder="Clinical observations, endorsement rationale, or closure reason…"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a5228]/30 focus:outline-none resize-none" />
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <button onClick={() => setStep('gad7')}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition">
                <ChevronLeft size={13} /> Back
              </button>
              <button onClick={handleSubmit} disabled={submitting || !decision}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#1a5228] hover:bg-green-800 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Submit Triage
              </button>
            </div>
          </div>
        )}

      </div>
    </DashboardPageWrapper>
  );
}
