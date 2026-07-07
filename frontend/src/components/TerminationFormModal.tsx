'use client';

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export interface TerminationFormData {
  mode_of_session: string;
  session_count: string;
  reasons: string[];
  reasons_other: string;
  summary: string;
  presenting_problem: string;
  interventions_used: string[];
  interventions_other: string;
  client_progress: string;
  client_learnings: string;
  client_readiness: string;
  overall_progress: string;
  strengths: string;
  remaining_concerns: string;
  prognosis: string;
  warning_signs: string;
  coping_strategies: string;
  crisis_plan: string;
  crisis_contact: string;
  referral_to: string[];
  referral_details: string;
  follow_up_recommendations: string;
  follow_up_schedule: string;
}

const empty: TerminationFormData = {
  mode_of_session: '', session_count: '',
  reasons: [], reasons_other: '',
  summary: '', presenting_problem: '',
  interventions_used: [], interventions_other: '',
  client_progress: '', client_learnings: '', client_readiness: '',
  overall_progress: '', strengths: '', remaining_concerns: '', prognosis: '',
  warning_signs: '', coping_strategies: '', crisis_plan: '', crisis_contact: '',
  referral_to: [], referral_details: '',
  follow_up_recommendations: '', follow_up_schedule: '',
};

interface Props {
  studentName: string;
  onClose: () => void;
  onSubmit: (data: TerminationFormData) => Promise<void>;
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 pb-1 border-b border-gray-100">
      {label}
    </p>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function CheckList({ options, selected, onToggle, otherValue, onOtherChange }: {
  options: string[]; selected: string[];
  onToggle: (o: string) => void;
  otherValue?: string; onOtherChange?: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      {options.map(opt => (
        <label key={opt} className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={selected.includes(opt)} onChange={() => onToggle(opt)}
            className="rounded border-gray-300 text-[#2563eb] focus:ring-[#2563eb]" />
          <span className="text-xs text-gray-700">{opt}</span>
        </label>
      ))}
      {selected.includes('Other') && onOtherChange && (
        <input type="text" placeholder="Please specify…" value={otherValue}
          onChange={e => onOtherChange(e.target.value)}
          className="mt-1 w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg" />
      )}
    </div>
  );
}

function RadioList({ options, selected, onSelect }: {
  options: string[]; selected: string; onSelect: (o: string) => void;
}) {
  return (
    <div className="space-y-1">
      {options.map(opt => (
        <label key={opt} className="flex items-center gap-2 cursor-pointer">
          <input type="radio" checked={selected === opt} onChange={() => onSelect(opt)}
            className="border-gray-300 text-[#2563eb] focus:ring-[#2563eb]" />
          <span className="text-xs text-gray-700">{opt}</span>
        </label>
      ))}
    </div>
  );
}

function Textarea({ value, onChange, placeholder, rows = 2 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-1 focus:ring-[#2563eb] outline-none resize-none" />
  );
}

export function TerminationFormModal({ studentName, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<TerminationFormData>({ ...empty });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (patch: Partial<TerminationFormData>) => setForm(f => ({ ...f, ...patch }));

  const toggleArr = (field: keyof TerminationFormData, opt: string) => {
    const arr = (form[field] as string[]) || [];
    set({ [field]: arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt] });
  };

  const handleSubmit = async () => {
    if (!form.reasons.length) { setError('Please select at least one reason for termination.'); return; }
    if (!form.summary.trim()) { setError('Summary of counseling process is required.'); return; }
    setError('');
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (e: any) {
      setError(e.message || 'Failed to submit termination form.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            <div>
              <p className="text-sm font-bold text-gray-900">Terminate Case</p>
              <p className="text-xs text-gray-400">{studentName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* ── Session Info ── */}
          <div>
            <SectionLabel label="Session Information" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Mode of Session" required>
                <RadioList
                  options={['Onsite (Face-to-Face)', 'Online (Zoom, Google Meet, etc.)']}
                  selected={form.mode_of_session}
                  onSelect={v => set({ mode_of_session: v })}
                />
              </Field>
              <Field label="Total Number of Sessions">
                <input type="number" min="1" value={form.session_count}
                  onChange={e => set({ session_count: e.target.value })}
                  placeholder="e.g. 8"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg" />
              </Field>
            </div>
          </div>

          {/* ── Reason for Termination ── */}
          <div>
            <SectionLabel label="Reason for Termination" />
            <Field label="Select all that apply" required>
              <CheckList
                options={[
                  'Goals met / completed counseling program',
                  'Client self-terminated (voluntarily withdrew)',
                  'Non-attendance / dropped out',
                  'Referred to CPS psychologist for psychotherapy',
                  'Referred to external provider',
                  'End of semester / academic year',
                  'Client transferred or graduated',
                  'Administrative closure',
                  'Other',
                ]}
                selected={form.reasons}
                onToggle={o => toggleArr('reasons', o)}
                otherValue={form.reasons_other}
                onOtherChange={v => set({ reasons_other: v })}
              />
            </Field>
          </div>

          {/* ── Counseling Summary ── */}
          <div>
            <SectionLabel label="Counseling Summary" />
            <Field label="Summary of Counseling Process" required>
              <Textarea rows={3} value={form.summary} onChange={v => set({ summary: v })}
                placeholder="Briefly describe what was worked on throughout the counseling relationship…" />
            </Field>
            <Field label="Presenting Problem (at start of counseling)">
              <Textarea value={form.presenting_problem} onChange={v => set({ presenting_problem: v })}
                placeholder="Main concern(s) the client initially presented with…" />
            </Field>
            <Field label="Interventions Used">
              <CheckList
                options={[
                  'Acceptance and Commitment Therapy (ACT)',
                  'Cognitive-Behavioral Therapy (CBT)',
                  'Dialectical Behavior Therapy (DBT)',
                  'Mindfulness-Based Intervention (MBI)',
                  'Motivational Interviewing (MI)',
                  'Person-Centered Therapy (PCT)',
                  'Psychoeducation',
                  'Solution-Focused Brief Therapy (SFBT)',
                  'Supportive Counseling',
                  'Other',
                ]}
                selected={form.interventions_used}
                onToggle={o => toggleArr('interventions_used', o)}
                otherValue={form.interventions_other}
                onOtherChange={v => set({ interventions_other: v })}
              />
            </Field>
          </div>

          {/* ── Client Reflections ── */}
          <div>
            <SectionLabel label="Client's Reflections (Self-Reported)" />
            <Field label="Self-Reported Progress">
              <Textarea value={form.client_progress} onChange={v => set({ client_progress: v })}
                placeholder="How does the client describe their progress?…" />
            </Field>
            <Field label="Key Learnings / Insights">
              <Textarea value={form.client_learnings} onChange={v => set({ client_learnings: v })}
                placeholder="What did the client identify as key takeaways?…" />
            </Field>
            <Field label="Readiness for Termination">
              <RadioList
                options={['Ready – client feels prepared to apply skills independently', 'Somewhat Ready – some lingering concerns but manageable', 'Not Ready – client expressed reluctance or ongoing distress']}
                selected={form.client_readiness}
                onSelect={v => set({ client_readiness: v })}
              />
            </Field>
          </div>

          {/* ── Counselor Impression ── */}
          <div>
            <SectionLabel label="Counselor's Clinical Impression" />
            <Field label="Overall Progress">
              <RadioList
                options={['Significantly Improved', 'Improved', 'Minimally Improved', 'No Change', 'Declined']}
                selected={form.overall_progress}
                onSelect={v => set({ overall_progress: v })}
              />
            </Field>
            <Field label="Strengths Observed">
              <Textarea value={form.strengths} onChange={v => set({ strengths: v })}
                placeholder="Notable strengths, resilience factors, or gains observed…" />
            </Field>
            <Field label="Remaining Concerns">
              <Textarea value={form.remaining_concerns} onChange={v => set({ remaining_concerns: v })}
                placeholder="Any unresolved issues or areas requiring continued support…" />
            </Field>
            <Field label="Prognosis">
              <RadioList
                options={['Good – strong likelihood of sustained improvement', 'Fair – reasonable outlook with continued self-management', 'Guarded – some risk of relapse; monitoring recommended', 'Poor – significant ongoing concerns']}
                selected={form.prognosis}
                onSelect={v => set({ prognosis: v })}
              />
            </Field>
          </div>

          {/* ── Relapse Prevention ── */}
          <div>
            <SectionLabel label="Relapse Prevention Plan" />
            <Field label="Warning Signs Identified">
              <Textarea value={form.warning_signs} onChange={v => set({ warning_signs: v })}
                placeholder="Early warning signs the client should watch for…" />
            </Field>
            <Field label="Coping Strategies to Apply">
              <Textarea value={form.coping_strategies} onChange={v => set({ coping_strategies: v })}
                placeholder="Strategies discussed for managing future difficulties…" />
            </Field>
            <Field label="Crisis Plan in Place">
              <RadioList options={['Yes', 'No', 'Not applicable']}
                selected={form.crisis_plan} onSelect={v => set({ crisis_plan: v })} />
            </Field>
            <Field label="Crisis Contact / Hotline Provided">
              <Textarea rows={1} value={form.crisis_contact} onChange={v => set({ crisis_contact: v })}
                placeholder="e.g. National Crisis Hotline: 1553, In Touch: 893-7603" />
            </Field>
          </div>

          {/* ── Referral & Follow-up ── */}
          <div>
            <SectionLabel label="Referral & Follow-up" />
            <Field label="Referred To">
              <CheckList
                options={[
                  'CPS Psychologist for psychotherapy',
                  'HSO (Health Services Office)',
                  'SDFO (Student Discipline Formation Office)',
                  'OAS (Office for Admission and Scholarships)',
                  'External mental health provider',
                  'No referral needed',
                ]}
                selected={form.referral_to}
                onToggle={o => toggleArr('referral_to', o)}
              />
            </Field>
            {form.referral_to.some(r => r !== 'No referral needed') && (
              <Field label="Referral Details">
                <Textarea value={form.referral_details} onChange={v => set({ referral_details: v })}
                  placeholder="Provider name, contact, reason for referral…" />
              </Field>
            )}
            <Field label="Follow-up Recommendations">
              <Textarea value={form.follow_up_recommendations} onChange={v => set({ follow_up_recommendations: v })}
                placeholder="Any recommended actions or monitoring after termination…" />
            </Field>
            <Field label="Follow-up Schedule">
              <RadioList
                options={['1 month check-in', '3 months check-in', '6 months check-in', 'No scheduled follow-up']}
                selected={form.follow_up_schedule}
                onSelect={v => set({ follow_up_schedule: v })}
              />
            </Field>
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-400">This action will mark the case as <strong>Closed</strong>.</p>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50">
              {saving ? 'Submitting…' : 'Terminate Case'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
