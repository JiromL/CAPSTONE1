'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Loader2, Check, CheckCircle2 } from 'lucide-react';

// ── Field helper components ──────────────────────────────────────────────────

function SectionBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden mb-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
      <div className="px-5 py-3 text-white" style={{ background: 'var(--color-primary)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'white' }}>{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function RadioField({ label, name, options, value, onChange, required, hasError }: {
  label: string; name: string; options: string[]; value: string; onChange: (v: string) => void;
  required?: boolean; hasError?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
        {label} {required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
      </label>
      <div className="space-y-2 p-3 rounded-lg" style={hasError ? { border: '1px solid var(--color-danger)', background: 'rgba(220,38,38,0.04)' } : {}}>
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name={name} value={opt}
              checked={value === opt} onChange={() => onChange(opt)}
              className="w-4 h-4 text-[var(--color-primary)] border-[var(--color-border-strong)]" />
            <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{opt}</span>
          </label>
        ))}
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
      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
        {label} {required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
      </label>
      <div className="grid grid-cols-1 gap-2 p-3 rounded-lg" style={hasError ? { border: '1px solid var(--color-danger)', background: 'rgba(220,38,38,0.04)' } : {}}>
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
                className="w-4 h-4 mt-0.5 text-[var(--color-primary)] border-[var(--color-border-strong)] rounded" />
              {isOther ? (
                <span className="text-sm flex items-center gap-2 flex-1" style={{ color: 'var(--color-text-primary)' }}>
                  Other:
                  {(value || []).includes('Other:') && (
                    <input type="text" value={otherValue}
                      onChange={e => onOtherChange(e.target.value)}
                      className="flex-1 text-sm outline-none px-1" style={{ borderBottom: '1px solid var(--color-border-strong)', color: 'var(--color-text-primary)', background: 'transparent' }}
                      placeholder="Please specify..." />
                  )}
                </span>
              ) : (
                <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{opt}</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function TextareaField({ label, value, onChange, placeholder, helperText, required, hasError }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; helperText?: string; required?: boolean; hasError?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
        {label} {required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
      </label>
      {helperText && <p className="text-xs mb-2 italic" style={{ color: 'var(--color-text-muted)' }}>{helperText}</p>}
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-lg outline-none resize-none transition"
        style={{ border: hasError ? '1px solid var(--color-danger)' : '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
    </div>
  );
}

export function ReadBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-1.5 mb-1.5" style={{ background: 'var(--color-primary-muted)', color: 'var(--color-primary-text)' }}>
      {value}
    </span>
  );
}

export function ReadSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden mb-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
      <div className="px-5 py-3 text-white" style={{ background: 'var(--color-primary)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'white' }}>{title}</h3>
      </div>
      <div className="p-5 space-y-3">{children}</div>
    </div>
  );
}

export function ReadRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
      <div className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{children}</div>
    </div>
  );
}

// ── PHQ-9 / GAD-7 ───────────────────────────────────────────────────────────

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
  "Being so restless that it's hard to sit still",
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

function getSeverityStyle(severity: string): CSSProperties {
  switch (severity) {
    case 'Minimal':           return { background: 'var(--color-success-surface)', color: 'var(--color-success-text)' };
    case 'Mild':              return { background: 'var(--color-warning-surface)', color: 'var(--color-warning-text)' };
    case 'Moderate':          return { background: '#FFF7ED', color: '#9A3412' };
    case 'Moderately Severe': return { background: 'var(--color-danger-surface)', color: 'var(--color-danger-text)' };
    case 'Severe':            return { background: '#FEF2F2', color: '#7F1D1D' };
    default:                  return { background: 'var(--color-bg)', color: 'var(--color-text-secondary)' };
  }
}

function PsychometricQuestionList({ questions, responses, maxScore, getSeverity, onChange, readOnly }: {
  questions: string[];
  responses: (number | null)[];
  maxScore: number;
  getSeverity: (score: number) => string;
  onChange?: (responses: (number | null)[], score: number | null, severity: string | null) => void;
  readOnly?: boolean;
}) {
  const answered = responses.filter(r => r !== null && r !== undefined).length;
  const total = questions.length;
  const score = answered === total ? responses.reduce((s, v) => s! + v!, 0) as number : null;
  const severity = score !== null ? getSeverity(score) : null;

  const setResponse = (idx: number, val: number) => {
    if (readOnly || !onChange) return;
    const next = [...responses];
    next[idx] = val;
    const answeredNext = next.filter(r => r !== null && r !== undefined).length;
    const scoreNext = answeredNext === total ? next.reduce((s, v) => s! + v!, 0) as number : null;
    const sevNext = scoreNext !== null ? getSeverity(scoreNext) : null;
    onChange(next, scoreNext, sevNext);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 px-1">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${(answered / total) * 100}%`, background: 'var(--color-primary)' }} />
        </div>
        <span className="text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>{answered}/{total}</span>
        {score !== null && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={getSeverityStyle(getSeverity(score))}>
            {score}/{maxScore} · {getSeverity(score)}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {questions.map((q, i) => (
          <div key={i} className="rounded-xl p-3" style={{ background: 'var(--color-bg)' }}>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-primary)' }}><span className="font-semibold mr-1" style={{ color: 'var(--color-text-muted)' }}>{i + 1}.</span>{q}</p>
            <div className="grid grid-cols-4 gap-1.5">
              {RESPONSE_OPTS.map(o => {
                const selected = responses[i] === o.val;
                return (
                  <button key={o.val} disabled={readOnly}
                    onClick={() => setResponse(i, o.val)}
                    className="px-1.5 py-2 rounded-lg text-[10px] font-semibold border transition text-center leading-tight"
                    style={
                      selected
                        ? { background: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)' }
                        : readOnly
                          ? { background: 'var(--color-surface)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }
                          : { background: 'var(--color-surface)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }
                    }
                    onMouseEnter={e => { if (!selected && !readOnly) { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary)'; } }}
                    onMouseLeave={e => { if (!selected && !readOnly) { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)'; } }}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PHQ9Section({ responses, onChange, readOnly }: {
  responses: (number | null)[];
  onChange?: (responses: (number | null)[], score: number | null, severity: string | null) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>PHQ-9 — Depression Screen <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>(0–27)</span></p>
      <PsychometricQuestionList
        questions={PHQ9_QUESTIONS}
        responses={responses.length === 9 ? responses : new Array(9).fill(null)}
        maxScore={27} getSeverity={getPHQ9Severity}
        onChange={onChange} readOnly={readOnly}
      />
    </div>
  );
}

function GAD7Section({ responses, onChange, readOnly }: {
  responses: (number | null)[];
  onChange?: (responses: (number | null)[], score: number | null, severity: string | null) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>GAD-7 — Anxiety Screen <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>(0–21)</span></p>
      <PsychometricQuestionList
        questions={GAD7_QUESTIONS}
        responses={responses.length === 7 ? responses : new Array(7).fill(null)}
        maxScore={21} getSeverity={getGAD7Severity}
        onChange={onChange} readOnly={readOnly}
      />
    </div>
  );
}

// ── Wizard steps ─────────────────────────────────────────────────────────────

export const WIZARD_STEPS = [
  { label: 'Session Information',       short: 'Session Info'    },
  { label: 'Clinical Diagnosis',        short: 'Diagnosis'       },
  { label: 'Psychometric Screening',    short: 'PHQ-9 / GAD-7'  },
  { label: 'Brief Description',         short: 'Description'     },
  { label: 'Presenting Problem',        short: 'Presenting'      },
  { label: 'Psychosocial History',      short: 'History'         },
  { label: 'Interaction & Affect',      short: 'Interaction'     },
  { label: 'Maladaptive Patterns',      short: 'Patterns'        },
  { label: 'Counseling Goal',           short: 'Goal'            },
  { label: 'Recommendation / Decision', short: 'Recommendation'  },
  { label: 'Signature / Attestation',   short: 'Signature'       },
];

type StepStatus = 'empty' | 'partial' | 'complete' | 'error';

function getStepStatus(step: number, draft: any): StepStatus {
  const d = draft || {};
  const hasVal = (v: any) => v !== null && v !== undefined && v !== '';
  const hasArr = (v: any) => Array.isArray(v) && v.length > 0;
  switch (step) {
    case 0: if (!hasVal(d.type_of_service)) return 'empty'; if (hasArr(d.referral_source)) return 'complete'; return 'partial';
    case 1: return hasVal(d.clinical_diagnosis) ? 'complete' : 'empty';
    case 2: {
      const phq = (d.phq9_responses || []).filter((r: any) => r !== null && r !== undefined).length;
      const gad = (d.gad7_responses || []).filter((r: any) => r !== null && r !== undefined).length;
      if (phq === 9 && gad === 7) return 'complete';
      if (phq > 0 || gad > 0) return 'partial';
      return 'empty';
    }
    case 3: {
      const f = [hasArr(d.general_appearance), hasArr(d.communication_style), hasArr(d.general_disposition), hasVal(d.brief_description_remarks)];
      const n = f.filter(Boolean).length;
      if (n === 0) return 'empty'; if (n === f.length) return 'complete'; return 'partial';
    }
    case 4: {
      const f = [hasArr(d.presenting_problem), hasVal(d.presenting_problem_remarks)];
      const n = f.filter(Boolean).length;
      if (n === 0) return 'empty'; if (n === f.length) return 'complete'; return 'partial';
    }
    case 5: {
      const f = [hasArr(d.psychosocial_history), hasVal(d.psychosocial_remarks)];
      const n = f.filter(Boolean).length;
      if (n === 0) return 'empty'; if (n === f.length) return 'complete'; return 'partial';
    }
    case 6: {
      const f = [hasArr(d.interaction_relationship), hasArr(d.affect_expression), hasVal(d.interaction_remarks)];
      const n = f.filter(Boolean).length;
      if (n === 0) return 'empty'; if (n === f.length) return 'complete'; return 'partial';
    }
    case 7: return hasArr(d.maladaptive_patterns) ? 'complete' : 'empty';
    case 8: return hasVal(d.counseling_goal) ? 'complete' : 'empty';
    case 9: {
      const f = [hasArr(d.predisposing_factors), hasArr(d.precipitating_factors), hasArr(d.perpetuating_factors), hasArr(d.protective_factors), hasArr(d.recommendation)];
      const n = f.filter(Boolean).length;
      if (n === 0) return 'empty'; if (n === f.length) return 'complete'; return 'partial';
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
  if (status === 'complete') return <span className="font-bold text-sm" style={{ color: 'var(--color-primary)' }}>✓</span>;
  if (status === 'partial')  return <span className="font-bold text-sm" style={{ color: '#F97316' }}>●</span>;
  if (status === 'error')    return <span className="font-bold text-sm" style={{ color: 'var(--color-danger)' }}>!</span>;
  return null;
}

function validateStep(step: number, draft: any): string[] {
  const dv = draft || {};
  const errs: string[] = [];
  const hasVal = (v: any) => v !== null && v !== undefined && v !== '';
  const hasArr = (v: any) => Array.isArray(v) && v.length > 0;
  switch (step) {
    case 0: if (!hasVal(dv.type_of_service)) errs.push('Type of Service is required'); break;
    case 3:
      if (!hasArr(dv.general_appearance))   errs.push('General Appearance is required');
      if (!hasArr(dv.communication_style))  errs.push('Communication Style is required');
      if (!hasArr(dv.general_disposition))  errs.push('General Disposition is required');
      if (!hasVal(dv.brief_description_remarks)) errs.push('Remarks are required');
      break;
    case 4:
      if (!hasArr(dv.presenting_problem))   errs.push('Presenting Problem is required');
      if (!hasVal(dv.presenting_problem_remarks)) errs.push('Remarks are required');
      break;
    case 5:
      if (!hasArr(dv.psychosocial_history)) errs.push('Psychosocial History is required');
      if (!hasVal(dv.psychosocial_remarks)) errs.push('Remarks are required');
      break;
    case 6:
      if (!hasArr(dv.interaction_relationship)) errs.push('Interaction and Relationship is required');
      if (!hasArr(dv.affect_expression))    errs.push('Affect / Emotional Expression is required');
      if (!hasVal(dv.interaction_remarks))  errs.push('Remarks are required');
      break;
    case 7: if (!hasArr(dv.maladaptive_patterns)) errs.push('Maladaptive Patterns is required'); break;
    case 8: if (!hasVal(dv.counseling_goal)) errs.push('Counseling Goal is required'); break;
    case 9: if (!hasArr(dv.recommendation)) errs.push('Recommendation is required'); break;
    case 10:
      if (!hasVal(dv.ic_name))             errs.push('IC Name is required');
      if (!hasVal(dv.ic_signature_date))   errs.push('Signature Date is required');
      break;
  }
  return errs;
}

// ── Read-only view ───────────────────────────────────────────────────────────

export function ICInterviewReadView({ form, sessionInfo, updatedAt }: {
  form: any;
  sessionInfo?: { date?: string; time?: string; mode?: string; studentId?: string; college?: string };
  updatedAt?: string;
}) {
  return (
    <div>
      {updatedAt && (
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Last updated: {new Date(updatedAt).toLocaleString()}</p>
      )}
      <ReadSection title="Section 1: Session Information">
        {sessionInfo && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-lg mb-2" style={{ background: 'var(--color-bg)' }}>
            {[
              { label: 'Date', value: sessionInfo.date },
              { label: 'Time', value: sessionInfo.time },
              { label: 'Mode', value: sessionInfo.mode },
              { label: 'Student ID', value: sessionInfo.studentId },
              { label: 'College', value: sessionInfo.college },
            ].map(item => (
              <div key={item.label}>
                <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>{item.label}</p>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.value || '—'}</p>
              </div>
            ))}
          </div>
        )}
        <ReadRow label="Type of Service"><p>{form.type_of_service || '—'}</p></ReadRow>
        <ReadRow label="Referral Source">
          <div className="flex flex-wrap mt-1">
            {(form.referral_source || []).map((v: string) => <ReadBadge key={v} value={v} />)}
            {form.referral_source_other && <ReadBadge value={`Other: ${form.referral_source_other}`} />}
          </div>
        </ReadRow>
      </ReadSection>

      <ReadSection title="Section 2: Clinical Diagnosis">
        <ReadRow label="Clinical Diagnosis"><p>{form.clinical_diagnosis || '—'}</p></ReadRow>
      </ReadSection>

      <ReadSection title="Section 2A: Psychometric Screening">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)' }}>PHQ-9 — Depression Screen</p>
          {form.phq9_score != null ? (
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-bg)' }}>
              <span className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{form.phq9_score}<span className="text-xs font-normal ml-1" style={{ color: 'var(--color-text-muted)' }}>/ 27</span></span>
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={getSeverityStyle(getPHQ9Severity(form.phq9_score))}>{form.phq9_severity || getPHQ9Severity(form.phq9_score)}</span>
            </div>
          ) : <p className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>Not completed</p>}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)' }}>GAD-7 — Anxiety Screen</p>
          {form.gad7_score != null ? (
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-bg)' }}>
              <span className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{form.gad7_score}<span className="text-xs font-normal ml-1" style={{ color: 'var(--color-text-muted)' }}>/ 21</span></span>
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={getSeverityStyle(getGAD7Severity(form.gad7_score))}>{form.gad7_severity || getGAD7Severity(form.gad7_score)}</span>
            </div>
          ) : <p className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>Not completed</p>}
        </div>
      </ReadSection>

      <ReadSection title="Section 3: Brief Description">
        <ReadRow label="General Appearance"><div className="flex flex-wrap mt-1">{(form.general_appearance || []).map((v: string) => <ReadBadge key={v} value={v} />)}{form.general_appearance_other && <ReadBadge value={`Other: ${form.general_appearance_other}`} />}</div></ReadRow>
        <ReadRow label="Communication Style"><div className="flex flex-wrap mt-1">{(form.communication_style || []).map((v: string) => <ReadBadge key={v} value={v} />)}{form.communication_style_other && <ReadBadge value={`Other: ${form.communication_style_other}`} />}</div></ReadRow>
        <ReadRow label="General Disposition"><div className="flex flex-wrap mt-1">{(form.general_disposition || []).map((v: string) => <ReadBadge key={v} value={v} />)}{form.general_disposition_other && <ReadBadge value={`Other: ${form.general_disposition_other}`} />}</div></ReadRow>
        <ReadRow label="Remarks"><p>{form.brief_description_remarks || '—'}</p></ReadRow>
      </ReadSection>

      <ReadSection title="Section 4: Presenting Problem">
        <ReadRow label="Presenting Problem"><div className="flex flex-wrap mt-1">{(form.presenting_problem || []).map((v: string) => <ReadBadge key={v} value={v} />)}{form.presenting_problem_other && <ReadBadge value={`Other: ${form.presenting_problem_other}`} />}</div></ReadRow>
        <ReadRow label="Remarks"><p>{form.presenting_problem_remarks || '—'}</p></ReadRow>
      </ReadSection>

      <ReadSection title="Section 5: Psychosocial History">
        <ReadRow label="Psychosocial History"><div className="flex flex-wrap mt-1">{(form.psychosocial_history || []).map((v: string) => <ReadBadge key={v} value={v} />)}{form.psychosocial_other && <ReadBadge value={`Other: ${form.psychosocial_other}`} />}</div></ReadRow>
        <ReadRow label="Remarks"><p>{form.psychosocial_remarks || '—'}</p></ReadRow>
      </ReadSection>

      <ReadSection title="Section 6: Interaction & Affect">
        <ReadRow label="Interaction with Counselor"><div className="flex flex-wrap mt-1">{(form.interaction_relationship || []).map((v: string) => <ReadBadge key={v} value={v} />)}{form.interaction_relationship_other && <ReadBadge value={`Other: ${form.interaction_relationship_other}`} />}</div></ReadRow>
        <ReadRow label="Affect / Emotional Expression"><div className="flex flex-wrap mt-1">{(form.affect_expression || []).map((v: string) => <ReadBadge key={v} value={v} />)}{form.affect_expression_other && <ReadBadge value={`Other: ${form.affect_expression_other}`} />}</div></ReadRow>
        <ReadRow label="Remarks"><p>{form.interaction_remarks || '—'}</p></ReadRow>
      </ReadSection>

      <ReadSection title="Section 7: Maladaptive Patterns">
        <ReadRow label="Patterns Observed"><div className="flex flex-wrap mt-1">{(form.maladaptive_patterns || []).map((v: string) => <ReadBadge key={v} value={v} />)}{form.maladaptive_patterns_other && <ReadBadge value={`Other: ${form.maladaptive_patterns_other}`} />}</div></ReadRow>
      </ReadSection>

      <ReadSection title="Section 8: Counseling Goal">
        <ReadRow label="Goal"><p>{form.counseling_goal || '—'}</p></ReadRow>
      </ReadSection>

      <ReadSection title="Section 9: 4 P's Formulation">
        <ReadRow label="Predisposing Factors"><div className="flex flex-wrap mt-1">{(form.predisposing_factors || []).map((v: string) => <ReadBadge key={v} value={v} />)}{form.predisposing_other && <ReadBadge value={`Other: ${form.predisposing_other}`} />}</div></ReadRow>
        <ReadRow label="Precipitating Factors"><div className="flex flex-wrap mt-1">{(form.precipitating_factors || []).map((v: string) => <ReadBadge key={v} value={v} />)}{form.precipitating_other && <ReadBadge value={`Other: ${form.precipitating_other}`} />}</div></ReadRow>
        <ReadRow label="Perpetuating Factors"><div className="flex flex-wrap mt-1">{(form.perpetuating_factors || []).map((v: string) => <ReadBadge key={v} value={v} />)}{form.perpetuating_other && <ReadBadge value={`Other: ${form.perpetuating_other}`} />}</div></ReadRow>
        <ReadRow label="Protective Factors"><div className="flex flex-wrap mt-1">{(form.protective_factors || []).map((v: string) => <ReadBadge key={v} value={v} />)}{form.protective_other && <ReadBadge value={`Other: ${form.protective_other}`} />}</div></ReadRow>
      </ReadSection>

      <ReadSection title="Section 10: Recommendation for Treatment or Disposition">
        <ReadRow label="Recommendation">
          <div className="flex flex-wrap mt-1">
            {(form.recommendation || []).map((v: string) => <ReadBadge key={v} value={v} />)}
            {form.recommendation_other && <ReadBadge value={`Other: ${form.recommendation_other}`} />}
          </div>
        </ReadRow>
      </ReadSection>
    </div>
  );
}

// ── Main wizard component ────────────────────────────────────────────────────

export interface ICInterviewWizardProps {
  caseId: string;
  sessionInfo?: { date?: string; time?: string; mode?: string; studentId?: string; college?: string };
  triageScores?: { phq9Responses: (number | null)[]; phq9Score: number | null; gad7Responses: (number | null)[]; gad7Score: number | null };
  existingForm?: any;
  updatedAt?: string;
  saving?: boolean;
  saveError?: string;
  saveSuccess?: boolean;
  onSave: (draft: any, isFinal: boolean) => Promise<void>;
  onComplete?: (formData: any) => void;
}

export function ICInterviewWizard({
  sessionInfo, triageScores, existingForm, updatedAt,
  saving, saveError, saveSuccess, onSave, onComplete,
}: ICInterviewWizardProps) {
  const initDraft = () => {
    const base = existingForm ? { ...existingForm } : {};
    if (triageScores && !base.phq9_responses) {
      base.phq9_responses = triageScores.phq9Responses;
      base.phq9_score     = triageScores.phq9Score;
      base.phq9_severity  = triageScores.phq9Score != null ? getPHQ9Severity(triageScores.phq9Score) : null;
      base.gad7_responses = triageScores.gad7Responses;
      base.gad7_score     = triageScores.gad7Score;
      base.gad7_severity  = triageScores.gad7Score != null ? getGAD7Severity(triageScores.gad7Score) : null;
    }
    return base;
  };

  const [editing, setEditing]           = useState(!existingForm);
  const [draft, setDraft]               = useState<any>(initDraft);
  const [currentStep, setCurrentStep]   = useState(0);
  const [stepErrors, setStepErrors]     = useState<Record<number, string[]>>({});
  const [showSaveSummary, setShowSaveSummary] = useState(false);

  const d   = draft;
  const upd = (key: string, val: any) => setDraft((prev: any) => ({ ...prev, [key]: val }));

  function handleNext() {
    const errs = validateStep(currentStep, d);
    if (errs.length > 0) { setStepErrors(prev => ({ ...prev, [currentStep]: errs })); return; }
    setStepErrors(prev => { const n = { ...prev }; delete n[currentStep]; return n; });
    setCurrentStep(s => Math.min(s + 1, WIZARD_STEPS.length - 1));
  }

  function handlePrev() { setCurrentStep(s => Math.max(s - 1, 0)); }

  async function handleSaveDraft() {
    setShowSaveSummary(false);
    await onSave(d, false);
  }

  async function handleSaveForm() {
    const allErrors: Record<number, string[]> = {};
    for (let i = 0; i < WIZARD_STEPS.length; i++) {
      const errs = validateStep(i, d);
      if (errs.length > 0) allErrors[i] = errs;
    }
    if (Object.keys(allErrors).length > 0) {
      setStepErrors(allErrors);
      setShowSaveSummary(true);
      return;
    }
    setShowSaveSummary(false);
    await onSave(d, true);
    if (onComplete) onComplete(d);
  }

  const missingFields: { stepIndex: number; label: string }[] = [];
  for (let i = 0; i < WIZARD_STEPS.length; i++) {
    (stepErrors[i] || []).forEach(e => missingFields.push({ stepIndex: i, label: e }));
  }

  if (existingForm && !editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>IC Interview Documentation</h2>
          <button onClick={() => { setDraft({ ...existingForm }); setEditing(true); setCurrentStep(0); setStepErrors({}); setShowSaveSummary(false); }}
            className="text-sm font-medium hover:underline" style={{ color: 'var(--color-primary-text)' }}>Edit</button>
        </div>
        <ICInterviewReadView form={existingForm} sessionInfo={sessionInfo} updatedAt={updatedAt} />
      </div>
    );
  }

  return (
    <div>
      {existingForm && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>IC Interview Documentation</h2>
          <button onClick={() => { setDraft({ ...existingForm }); setEditing(false); setCurrentStep(0); setStepErrors({}); setShowSaveSummary(false); }}
            className="text-sm hover:underline" style={{ color: 'var(--color-text-secondary)' }}>Cancel</button>
        </div>
      )}

      {/* Mobile progress bar */}
      <div className="sm:hidden mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Step {currentStep + 1} of {WIZARD_STEPS.length}</span>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{WIZARD_STEPS[currentStep].label}</span>
        </div>
        <div className="w-full rounded-full h-2" style={{ background: 'var(--color-border)' }}>
          <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / WIZARD_STEPS.length) * 100}%`, background: 'var(--color-primary)' }} />
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
                <button key={idx} onClick={() => setCurrentStep(idx)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors"
                  style={isActive ? { background: 'var(--color-primary)', color: 'white' } : { color: 'var(--color-text-primary)' }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                    style={isActive ? { background: 'white', color: 'var(--color-primary)' } : { background: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>{idx + 1}</span>
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
              {sessionInfo && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-lg mb-2" style={{ background: 'var(--color-bg)' }}>
                  {[
                    { label: 'Date', value: sessionInfo.date },
                    { label: 'Time', value: sessionInfo.time },
                    { label: 'Mode', value: sessionInfo.mode },
                    { label: 'Student ID', value: sessionInfo.studentId },
                    { label: 'College', value: sessionInfo.college },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>{item.label}</p>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.value || '—'}</p>
                    </div>
                  ))}
                </div>
              )}
              <RadioField label="Type of Service" name="type_of_service" required
                options={['Initial Interview', 'Triage Interview', 'Intake Interview', 'Counseling/Psychotherapy Session', 'Testing', 'Termination']}
                value={d.type_of_service || ''} onChange={v => upd('type_of_service', v)}
                hasError={!!(stepErrors[0]?.some(e => e.includes('Type of Service')))} />
              {stepErrors[0]?.some(e => e.includes('Type of Service')) && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>This field is required</p>}
              <CheckboxFieldWithOther label="Referral Source" name="referral_source" required
                options={['Self – client initiated the counseling request independently', 'Faculty / Staff – referred by teaching or non-teaching personnel', 'Parent / Guardian – referral made by family member or guardian', 'Peer / Friend – encouraged by classmate or colleague', 'Supervisor / Manager – referral from workplace or internship site', 'Academic Department / Program Chair – referral through college office or adviser', 'DLSU Office / Support Unit (e.g., SDFO, OUR, OAS, HSO)']}
                value={d.referral_source || []} otherValue={d.referral_source_other || ''}
                onChange={v => upd('referral_source', v)} onOtherChange={v => upd('referral_source_other', v)} />
            </SectionBox>
          )}

          {/* Step 1: Clinical Diagnosis */}
          {currentStep === 1 && (
            <SectionBox title="Step 2: Clinical Diagnosis">
              <RadioField label="Clinical Diagnosis (optional)" name="clinical_diagnosis"
                options={['Clinically diagnosed (based on provided documentation or prior records)', 'Clinically diagnosed (as informed by the client)', 'No clinical diagnosis indicated / mentioned', 'Not disclosed / Unknown']}
                value={d.clinical_diagnosis || ''} onChange={v => upd('clinical_diagnosis', v)} />
            </SectionBox>
          )}

          {/* Step 2: Psychometric Screening */}
          {currentStep === 2 && (
            <SectionBox title="Step 3: Psychometric Screening">
              <p className="text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>
                {triageScores ? 'PHQ-9 and GAD-7 scores were recorded during triage and are pre-filled below.' : 'Administer the PHQ-9 and GAD-7 screening tools.'}
              </p>
              <PHQ9Section
                responses={d.phq9_responses || new Array(9).fill(null)}
                readOnly={!!triageScores}
                onChange={triageScores ? undefined : (responses, score, severity) => {
                  setDraft((prev: any) => ({ ...prev, phq9_responses: responses, phq9_score: score, phq9_severity: severity }));
                }}
              />
              <div className="my-2" style={{ borderTop: '1px solid var(--color-border)' }} />
              <GAD7Section
                responses={d.gad7_responses || new Array(7).fill(null)}
                readOnly={!!triageScores}
                onChange={triageScores ? undefined : (responses, score, severity) => {
                  setDraft((prev: any) => ({ ...prev, gad7_responses: responses, gad7_score: score, gad7_severity: severity }));
                }}
              />
            </SectionBox>
          )}

          {/* Step 3: Brief Description */}
          {currentStep === 3 && (
            <SectionBox title="Step 4: Brief Description of the Client">
              <p className="text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>Quick overview of how the client appeared, communicated, and interacted during the intake session.</p>
              <CheckboxFieldWithOther label="General Appearance and Presentation" name="general_appearance" required
                options={['Appropriate and well-groomed – neat, tidy, and consistent with the setting', 'Neat / Casual – relaxed but presentable', 'Fatigued or tired-looking – appears low in energy or sleep-deprived', 'Disheveled / unkempt – clothing or hygiene suggests stress or neglect', 'Tearful / emotional – shows visible sadness or crying during the session']}
                value={d.general_appearance || []} otherValue={d.general_appearance_other || ''}
                onChange={v => upd('general_appearance', v)} onOtherChange={v => upd('general_appearance_other', v)}
                hasError={!!(stepErrors[3]?.some(e => e.includes('General Appearance')))} />
              {stepErrors[3]?.some(e => e.includes('General Appearance')) && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>This field is required</p>}
              <CheckboxFieldWithOther label="Communication Style" name="communication_style" required
                options={['Clear and coherent – expresses ideas logically and understandably', 'Soft-spoken / hesitant – quiet voice, pauses often, or unsure when speaking', 'Rapid / pressured – talks quickly, difficult to interrupt, possibly anxious', 'Logical and goal-directed – stays on topic, communicates purposefully', 'Circumstantial / tangential – gives excessive details or goes off topic', 'Disorganized / incoherent – speech is confusing or hard to follow']}
                value={d.communication_style || []} otherValue={d.communication_style_other || ''}
                onChange={v => upd('communication_style', v)} onOtherChange={v => upd('communication_style_other', v)}
                hasError={!!(stepErrors[3]?.some(e => e.includes('Communication Style')))} />
              {stepErrors[3]?.some(e => e.includes('Communication Style')) && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>This field is required</p>}
              <CheckboxFieldWithOther label="General Disposition / Demeanor" name="general_disposition" required
                options={['Calm and cooperative – open, responsive, and comfortable engaging', 'Anxious or tense – restless, nervous, or visibly uneasy', 'Sad or withdrawn – quiet, minimal expression, or emotionally distant', 'Angry or irritable – defensive tone or easily frustrated', 'Motivated and engaged – participative, eager to reflect and improve', 'Guarded or defensive – cautious, reluctant to share', 'Distracted or preoccupied – unfocused, thinking of something else']}
                value={d.general_disposition || []} otherValue={d.general_disposition_other || ''}
                onChange={v => upd('general_disposition', v)} onOtherChange={v => upd('general_disposition_other', v)}
                hasError={!!(stepErrors[3]?.some(e => e.includes('General Disposition')))} />
              {stepErrors[3]?.some(e => e.includes('General Disposition')) && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>This field is required</p>}
              <TextareaField label="Remarks" required
                value={d.brief_description_remarks || ''} onChange={v => upd('brief_description_remarks', v)}
                helperText="Add other noteworthy observations. Write 'None' if no additional remarks."
                hasError={!!(stepErrors[3]?.some(e => e.includes('Remarks')))} />
              {stepErrors[3]?.some(e => e.includes('Remarks')) && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>This field is required</p>}
            </SectionBox>
          )}

          {/* Step 4: Presenting Problem */}
          {currentStep === 4 && (
            <SectionBox title="Step 5: Presenting Problem">
              <p className="text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>Main concerns or reasons the client sought counseling.</p>
              <CheckboxFieldWithOther label="Presenting Problem" name="presenting_problem" required
                options={['Anxiety or fear – excessive worry, tension, or panic episodes', 'Depression or sadness – low mood, hopelessness, or loss of interest', 'Stress or burnout – feeling overwhelmed by academics or work', 'Relationship or family conflict – difficulties in communication or boundaries', 'Adjustment or transition issue – struggling to cope with life or school changes', 'Grief or loss – emotional pain following death, separation, or significant loss', 'Trauma-related distress – distress linked to a past adverse event', 'Identity or self-concept concern – confusion about personal values, gender, or direction', 'Motivation or focus difficulty – trouble concentrating or completing tasks', 'Health-related stress – emotional impact of physical conditions or fatigue']}
                value={d.presenting_problem || []} otherValue={d.presenting_problem_other || ''}
                onChange={v => upd('presenting_problem', v)} onOtherChange={v => upd('presenting_problem_other', v)}
                hasError={!!(stepErrors[4]?.some(e => e.includes('Presenting Problem')))} />
              {stepErrors[4]?.some(e => e.includes('Presenting Problem')) && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>This field is required</p>}
              <TextareaField label="Remarks" required
                value={d.presenting_problem_remarks || ''} onChange={v => upd('presenting_problem_remarks', v)}
                helperText="Add other details about the main concern. Write 'None' if no additional remarks."
                hasError={!!(stepErrors[4]?.some(e => e.includes('Remarks')))} />
              {stepErrors[4]?.some(e => e.includes('Remarks')) && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>This field is required</p>}
            </SectionBox>
          )}

          {/* Step 5: Psychosocial History */}
          {currentStep === 5 && (
            <SectionBox title="Step 6: Brief Psychosocial History">
              <p className="text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>Background information relevant to the client's current concern.</p>
              <CheckboxFieldWithOther label="Psychosocial History" name="psychosocial_history" required
                options={['Significant past experiences – history of trauma, loss, illness, or major life transitions', 'Family background – quality of family relationships, support, or sources of conflict', 'Coping styles and strategies – ways the client typically manages stress', 'Academic or work functioning – level of motivation, performance, or adjustment', 'Peer and social relationships – quality of friendships or social supports', 'Health and lifestyle – physical well-being, sleep, exercise, nutrition, or medical conditions', 'Previous counseling or therapy – prior experience with mental health services', 'Substance use history – use of alcohol, nicotine, caffeine, or other substances', 'Faith or spirituality – beliefs or practices that influence coping and meaning-making']}
                value={d.psychosocial_history || []} otherValue={d.psychosocial_other || ''}
                onChange={v => upd('psychosocial_history', v)} onOtherChange={v => upd('psychosocial_other', v)}
                hasError={!!(stepErrors[5]?.some(e => e.includes('Psychosocial History')))} />
              {stepErrors[5]?.some(e => e.includes('Psychosocial History')) && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>This field is required</p>}
              <TextareaField label="Remarks" required
                value={d.psychosocial_remarks || ''} onChange={v => upd('psychosocial_remarks', v)}
                helperText="Add any significant details about the client's background. Write 'None' if the checklist already captures it."
                hasError={!!(stepErrors[5]?.some(e => e.includes('Remarks')))} />
              {stepErrors[5]?.some(e => e.includes('Remarks')) && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>This field is required</p>}
            </SectionBox>
          )}

          {/* Step 6: Interaction & Affect */}
          {currentStep === 6 && (
            <SectionBox title="Step 7: Interaction, Relationship, and Affect">
              <p className="text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>How the client related to the counselor and expressed emotions during the intake.</p>
              <CheckboxFieldWithOther label="Interaction and Relationship with Counselor" name="interaction_relationship" required
                options={['Engaged and cooperative – open, responsive, and actively participated', 'Warm and receptive – friendly and comfortable engaging in dialogue', 'Guarded or hesitant – cautious, reserved, or limited in responses', 'Calm and composed – steady demeanor and appropriate behavior', 'Withdrawn or avoidant – quiet, minimal eye contact, or reluctant to engage', 'Irritable or defensive – easily frustrated or resistant to feedback', 'Motivated and hopeful – shows readiness and willingness to improve']}
                value={d.interaction_relationship || []} otherValue={d.interaction_relationship_other || ''}
                onChange={v => upd('interaction_relationship', v)} onOtherChange={v => upd('interaction_relationship_other', v)}
                hasError={!!(stepErrors[6]?.some(e => e.includes('Interaction and Relationship')))} />
              {stepErrors[6]?.some(e => e.includes('Interaction and Relationship')) && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>This field is required</p>}
              <CheckboxFieldWithOther label="Affect / Emotional Expression" name="affect_expression" required
                options={['Appropriate to content – emotion matches the topic being discussed', 'Anxious / tense – fidgety, restless, or visibly nervous', 'Depressed / sad – flat affect, tearful, or downcast tone', 'Irritable / frustrated – easily annoyed or impatient', 'Labile / fluctuating – sudden shifts in mood or expression', 'Flat / restricted – limited range of emotion or monotone tone', 'Euthymic / stable – balanced, calm, and consistent emotional tone']}
                value={d.affect_expression || []} otherValue={d.affect_expression_other || ''}
                onChange={v => upd('affect_expression', v)} onOtherChange={v => upd('affect_expression_other', v)}
                hasError={!!(stepErrors[6]?.some(e => e.includes('Affect')))} />
              {stepErrors[6]?.some(e => e.includes('Affect')) && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>This field is required</p>}
              <TextareaField label="Remarks" required
                value={d.interaction_remarks || ''} onChange={v => upd('interaction_remarks', v)}
                helperText="Add any significant observations about interaction or affect. Write 'None' if the checklist already captures it."
                hasError={!!(stepErrors[6]?.some(e => e.includes('Remarks')))} />
              {stepErrors[6]?.some(e => e.includes('Remarks')) && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>This field is required</p>}
            </SectionBox>
          )}

          {/* Step 7: Maladaptive Patterns */}
          {currentStep === 7 && (
            <SectionBox title="Step 8: Maladaptive Patterns Observed or Reported">
              <p className="text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>Recurring thoughts, emotions, behaviors, or coping styles contributing to current concerns.</p>
              <CheckboxFieldWithOther label="Maladaptive Patterns" name="maladaptive_patterns" required
                options={['Avoidance behaviors – Tendency to avoid situations, tasks, or conversations that cause discomfort', 'Negative self-talk or self-criticism – Persistent self-blame, harsh internal dialogue, or low self-worth', 'Emotional suppression – Difficulty expressing or acknowledging emotions', 'Excessive worry or rumination – Repetitive overthinking, difficulty letting go', 'Perfectionism or fear of failure – Unrealistic standards, strong fear of making mistakes', 'Dependence on others for reassurance – Difficulty making decisions or coping independently', 'Impulsivity or difficulty with emotional regulation – Acting quickly when distressed', 'Maladaptive coping strategies – Coping styles that provide short-term relief but increase distress', 'Interpersonal difficulties – Recurrent conflicts, withdrawal, or difficulty setting boundaries', 'Trauma-related responses – Hypervigilance, emotional numbing, or heightened reactivity', 'Academic/work-related maladaptive patterns – Procrastination, disengagement, or chronic burnout', 'No maladaptive patterns identified at intake']}
                value={d.maladaptive_patterns || []} otherValue={d.maladaptive_patterns_other || ''}
                onChange={v => upd('maladaptive_patterns', v)} onOtherChange={v => upd('maladaptive_patterns_other', v)}
                hasError={!!(stepErrors[7]?.some(e => e.includes('Maladaptive')))} />
              {stepErrors[7]?.some(e => e.includes('Maladaptive')) && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>This field is required</p>}
            </SectionBox>
          )}

          {/* Step 8: Counseling Goal */}
          {currentStep === 8 && (
            <SectionBox title="Step 9: Counseling / Psychotherapy Goal">
              <TextareaField label="Counseling/Psychotherapy Goal" required
                value={d.counseling_goal || ''} onChange={v => upd('counseling_goal', v)}
                helperText="State the overall goal using the SMART framework (Specific, Measurable, Attainable, Realistic, Time-bound)."
                placeholder="e.g., Client will reduce the frequency and intensity of anxiety episodes by consistently using at least two adaptive coping strategies within 8 weeks."
                hasError={!!(stepErrors[8]?.some(e => e.includes('Counseling Goal')))} />
              {stepErrors[8]?.some(e => e.includes('Counseling Goal')) && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>This field is required</p>}
            </SectionBox>
          )}

          {/* Step 9: Recommendation */}
          {currentStep === 9 && (
            <SectionBox title="Step 10: Recommendation / Decision">
              <p className="text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>Summarize your clinical understanding using the 4 P's Model, then state your recommendation.</p>
              <CheckboxFieldWithOther label="Predisposing Factors" name="predisposing_factors" required
                options={['Family history of mental health or relational problems', 'Early childhood adversity or trauma', 'Personality traits (e.g., perfectionism, dependency, impulsivity)', 'Chronic medical condition or neurobiological vulnerability', 'Limited early emotional support or attachment disruption', 'Cultural, gender, or identity-related stress exposure']}
                value={d.predisposing_factors || []} otherValue={d.predisposing_other || ''}
                onChange={v => upd('predisposing_factors', v)} onOtherChange={v => upd('predisposing_other', v)} />
              <CheckboxFieldWithOther label="Precipitating Factors" name="precipitating_factors" required
                options={['Recent loss or separation', 'Academic or work stress / overload', 'Relationship conflict or breakup', 'Transition or adjustment (e.g., relocation, new role, course changes)', 'Health-related event or diagnosis', 'Traumatic or critical incident']}
                value={d.precipitating_factors || []} otherValue={d.precipitating_other || ''}
                onChange={v => upd('precipitating_factors', v)} onOtherChange={v => upd('precipitating_other', v)} />
              <CheckboxFieldWithOther label="Perpetuating Factors" name="perpetuating_factors" required
                options={['Maladaptive coping (avoidance, withdrawal, substance use)', 'Ongoing stressors (family, financial, workload)', 'Environmental barriers (limited support, unsafe environment)', 'Negative thinking patterns or self-criticism', 'Lack of insight or resistance to change', 'Poor self-care or sleep habits']}
                value={d.perpetuating_factors || []} otherValue={d.perpetuating_other || ''}
                onChange={v => upd('perpetuating_factors', v)} onOtherChange={v => upd('perpetuating_other', v)} />
              <CheckboxFieldWithOther label="Protective Factors" name="protective_factors" required
                options={['Supportive relationships or social network', 'Faith or spirituality', 'Academic or work engagement', 'Motivation to improve / willingness to seek help', 'Effective coping or problem-solving skills', 'Stable housing or financial situation', 'Access to mental health and community resources']}
                value={d.protective_factors || []} otherValue={d.protective_other || ''}
                onChange={v => upd('protective_factors', v)} onOtherChange={v => upd('protective_other', v)} />
              <div className="pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                <CheckboxFieldWithOther label="Recommendation for Treatment or Disposition" name="recommendation" required
                  options={['Continue Counseling / Psychotherapy – client to engage in ongoing sessions with same counselor/psychologist or team', 'Referral to CPS Psychologist (Testing / Assessment) – for further diagnostic or psychological evaluation', 'Referral to CPS Psychologist for Psychotherapy – referred for specialized, in-depth therapy within CPS', 'Referral to Psychiatrist / Physician – for medication evaluation or medical management', 'Crisis Intervention / Safety Plan Initiated – immediate response to safety or suicide risk concerns', 'Collaboration with Faculty / Staff (with consent) – coordinate support for academic or behavioral concerns', 'Referral to External Support / Agency – e.g., community mental health center, support group, or hotline', 'Follow-up Session Scheduled – next session date or frequency confirmed']}
                  value={d.recommendation || []} otherValue={d.recommendation_other || ''}
                  onChange={v => upd('recommendation', v)} onOtherChange={v => upd('recommendation_other', v)}
                  hasError={!!(stepErrors[9]?.some(e => e.includes('Recommendation')))} />
                {stepErrors[9]?.some(e => e.includes('Recommendation')) && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>This field is required</p>}
              </div>
            </SectionBox>
          )}

          {/* Step 10: Signature */}
          {currentStep === 10 && (
            <SectionBox title="Step 11: Signature / Attestation">
              <p className="text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>By completing this form, the IC affirms that the information recorded is accurate and was gathered during the intake session.</p>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>IC Name <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input type="text" value={d.ic_name || ''} onChange={e => upd('ic_name', e.target.value)}
                  placeholder="Full name of Intake Counselor"
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none transition"
                  style={{ border: stepErrors[10]?.some(e => e.includes('IC Name')) ? '1px solid var(--color-danger)' : '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                {stepErrors[10]?.some(e => e.includes('IC Name')) && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>This field is required</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Signature Date <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input type="date" value={d.ic_signature_date || ''} onChange={e => upd('ic_signature_date', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none transition"
                  style={{ border: stepErrors[10]?.some(e => e.includes('Signature Date')) ? '1px solid var(--color-danger)' : '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                {stepErrors[10]?.some(e => e.includes('Signature Date')) && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>This field is required</p>}
              </div>
            </SectionBox>
          )}

          {/* Validation summary */}
          {showSaveSummary && missingFields.length > 0 && (
            <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
              <p className="text-sm font-bold mb-2" style={{ color: 'var(--color-danger-text)' }}>Please complete the following before saving:</p>
              <ul className="space-y-1">
                {missingFields.map((f, i) => (
                  <li key={i}>
                    <button onClick={() => setCurrentStep(f.stepIndex)}
                      className="text-sm underline" style={{ color: 'var(--color-danger)' }}>
                      Step {f.stepIndex + 1}: {f.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {saveSuccess && <p className="text-sm font-medium mb-3 flex items-center gap-1" style={{ color: 'var(--color-info-text)' }}><CheckCircle2 size={14} /> Saved successfully.</p>}
          {saveError && <p className="text-sm mb-3" style={{ color: 'var(--color-danger)' }}>{saveError}</p>}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            <button onClick={handlePrev} disabled={currentStep === 0}
              className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
              ← Previous
            </button>
            <div className="flex items-center gap-2">
              <button onClick={handleSaveDraft} disabled={saving}
                className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 transition flex items-center gap-1.5"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                {saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : 'Save Draft'}
              </button>
              {currentStep < WIZARD_STEPS.length - 1 ? (
                <button onClick={handleNext}
                  className="px-5 py-2 text-white text-sm font-semibold rounded-lg transition"
                  style={{ background: 'var(--color-primary)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}>
                  Next →
                </button>
              ) : (
                <button onClick={handleSaveForm} disabled={saving}
                  className="px-5 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition flex items-center gap-2"
                  style={{ background: 'var(--color-primary)' }}
                  onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
                  onMouseLeave={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}>
                  {saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : 'Save Form'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
