'use client';

import { useState } from 'react';

export interface StructuredSOAPData {
  mode_of_session: string;
  session_number: string;
  counseling_goal: string;

  s_mood: string[];
  s_mood_other: string;
  s_concerns: string[];
  s_concerns_other: string;
  s_coping: string[];
  s_coping_other: string;
  s_suicidal_ideation: string;

  o_appearance: string[];
  o_appearance_other: string;
  o_affect: string[];
  o_affect_other: string;
  o_behavior: string[];
  o_behavior_other: string;
  o_speech_thought: string[];
  o_speech_thought_other: string;

  a_progress: string;
  a_progress_other: string;
  a_main_issues: string[];
  a_main_issues_other: string;
  a_risk_level: string;
  a_clinical_impression: string[];
  a_clinical_impression_other: string;
  a_remarks: string;

  p_interventions: string[];
  p_interventions_other: string;
  p_homework: string[];
  p_homework_other: string;
  p_next_focus: string[];
  p_next_focus_other: string;
  p_follow_up: string[];
  p_follow_up_other: string;
  p_remarks: string;
  p_case_status: string[];
  p_case_status_other: string;
  p_termination_summary: string;
}

export const emptyStructuredSOAP: StructuredSOAPData = {
  mode_of_session: '',
  session_number: '',
  counseling_goal: '',
  s_mood: [], s_mood_other: '',
  s_concerns: [], s_concerns_other: '',
  s_coping: [], s_coping_other: '',
  s_suicidal_ideation: '',
  o_appearance: [], o_appearance_other: '',
  o_affect: [], o_affect_other: '',
  o_behavior: [], o_behavior_other: '',
  o_speech_thought: [], o_speech_thought_other: '',
  a_progress: '', a_progress_other: '',
  a_main_issues: [], a_main_issues_other: '',
  a_risk_level: '',
  a_clinical_impression: [], a_clinical_impression_other: '',
  a_remarks: '',
  p_interventions: [], p_interventions_other: '',
  p_homework: [], p_homework_other: '',
  p_next_focus: [], p_next_focus_other: '',
  p_follow_up: [], p_follow_up_other: '',
  p_remarks: '',
  p_case_status: [], p_case_status_other: '',
  p_termination_summary: '',
};

interface Props {
  value: StructuredSOAPData;
  onChange: (v: StructuredSOAPData) => void;
}

function SectionHeader({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2" style={{ borderBottom: '1px solid var(--color-primary-muted)' }}>
      <span className="text-xs font-bold text-white px-2 py-0.5 rounded" style={{ background: 'var(--color-primary)' }}>{label}</span>
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{sub}</span>
    </div>
  );
}

function FieldLabel({ label, hint, required }: { label: string; hint?: string; required?: boolean }) {
  return (
    <div className="mb-2">
      <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </p>
      {hint && <p className="text-xs mt-0.5 italic" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>}
    </div>
  );
}

function CheckGroup({
  label, hint, options, selected, otherValue, onToggle, onOtherChange,
}: {
  label: string;
  hint?: string;
  options: string[];
  selected: string[];
  otherValue: string;
  onToggle: (opt: string) => void;
  onOtherChange: (v: string) => void;
}) {
  const hasOther = selected.includes('Other');
  return (
    <div className="mb-5">
      <FieldLabel label={label} hint={hint} required />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
        {options.map(opt => (
          <label key={opt} className="flex items-start gap-2 cursor-pointer group py-0.5">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => onToggle(opt)}
              className="mt-0.5 rounded border-[var(--color-border-strong)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{opt}</span>
          </label>
        ))}
      </div>
      {hasOther && (
        <input
          type="text"
          placeholder="Please specify…"
          value={otherValue}
          onChange={e => onOtherChange(e.target.value)}
          className="mt-2 w-full px-3 py-1.5 text-xs rounded-lg outline-none"
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
        />
      )}
    </div>
  );
}

function RadioGroup({
  label, hint, options, selected, otherValue, onSelect, onOtherChange,
}: {
  label: string;
  hint?: string;
  options: string[];
  selected: string;
  otherValue?: string;
  onSelect: (opt: string) => void;
  onOtherChange?: (v: string) => void;
}) {
  const hasOther = selected === 'Other';
  return (
    <div className="mb-5">
      <FieldLabel label={label} hint={hint} required />
      <div className="flex flex-col gap-1">
        {options.map(opt => (
          <label key={opt} className="flex items-start gap-2 cursor-pointer group py-0.5">
            <input
              type="radio"
              checked={selected === opt}
              onChange={() => onSelect(opt)}
              className="mt-0.5 border-[var(--color-border-strong)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{opt}</span>
          </label>
        ))}
      </div>
      {hasOther && onOtherChange && (
        <input
          type="text"
          placeholder="Please specify…"
          value={otherValue}
          onChange={e => onOtherChange(e.target.value)}
          className="mt-2 w-full px-3 py-1.5 text-xs rounded-lg outline-none"
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
        />
      )}
    </div>
  );
}

export function StructuredSOAPForm({ value, onChange }: Props) {
  const set = (patch: Partial<StructuredSOAPData>) => onChange({ ...value, ...patch });

  const toggle = (field: keyof StructuredSOAPData, opt: string) => {
    const arr = (value[field] as string[]) || [];
    set({ [field]: arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt] });
  };

  return (
    <div className="space-y-6">
      {/* ── Session Context ─────────────────────────────────────── */}
      <div className="rounded-xl p-4" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>Session Context</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel label="Mode of Session" required />
            <div className="flex gap-4">
              {['Onsite (Face-to-Face)', 'Online (Zoom, Google Meet, etc.)'].map(opt => (
                <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" checked={value.mode_of_session === opt} onChange={() => set({ mode_of_session: opt })}
                    className="border-gray-300 text-[#2563eb] focus:ring-[#2563eb]" />
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{opt}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel label="Session No." required />
            <div className="flex flex-wrap gap-2">
              {['1', '2', '3', '4', '5', 'Other'].map(n => (
                <label key={n} className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" checked={value.session_number === n} onChange={() => set({ session_number: n })}
                    className="border-gray-300 text-[#2563eb] focus:ring-[#2563eb]" />
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{n}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <FieldLabel label="Counseling/Psychotherapy Goal (SMART)"
              hint="State the specific goal or focus of this session using the SMART framework." required />
            <textarea
              value={value.counseling_goal}
              onChange={e => set({ counseling_goal: e.target.value })}
              rows={2}
              placeholder="e.g., Client will apply one relaxation or grounding technique during anxiety-provoking situations at least three times before the next session."
              className="w-full px-3 py-2 text-xs rounded-lg outline-none"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
            />
          </div>
        </div>
      </div>

      {/* ── S — Subjective ──────────────────────────────────────── */}
      <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <SectionHeader label="S" sub="Subjective — Client's Report" />

        <CheckGroup
          label="Client Describes Mood As"
          hint="Select all that apply based on the client's self-report of their current mood."
          options={[
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
          ]}
          selected={value.s_mood}
          otherValue={value.s_mood_other}
          onToggle={opt => toggle('s_mood', opt)}
          onOtherChange={v => set({ s_mood_other: v })}
        />

        <CheckGroup
          label="Client Concerns / Presenting Issues"
          hint="Select all that apply."
          options={[
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
          ]}
          selected={value.s_concerns}
          otherValue={value.s_concerns_other}
          onToggle={opt => toggle('s_concerns', opt)}
          onOtherChange={v => set({ s_concerns_other: v })}
        />

        <CheckGroup
          label="Coping Strategies Reported"
          hint="Select all that apply based on the client's self-report. Include both healthy and unhealthy coping strategies mentioned by the client."
          options={[
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
          ]}
          selected={value.s_coping}
          otherValue={value.s_coping_other}
          onToggle={opt => toggle('s_coping', opt)}
          onOtherChange={v => set({ s_coping_other: v })}
        />

        <RadioGroup
          label="Suicidal or Self-Harm Ideation"
          hint='Note: If "Active" is selected, proceed to the Assessment (A) section to complete the C-SSRS Risk Level Assessment.'
          options={['Denied – client clearly reports no suicidal or self-harm thoughts', 'Passive – vague thoughts but no intent or plan', 'Active – current suicidal or self-harm thoughts reported', 'Not assessed – topic not covered this session']}
          selected={value.s_suicidal_ideation}
          onSelect={opt => set({ s_suicidal_ideation: opt })}
        />
      </div>

      {/* ── O — Objective ───────────────────────────────────────── */}
      <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <SectionHeader label="O" sub="Objective — Counselor's Observations" />

        <CheckGroup
          label="Appearance"
          hint="Select all that apply."
          options={[
            'Appropriate – suitable for the setting and occasion',
            'Neat – clean and well-groomed',
            'Casual – relaxed but tidy appearance',
            'Disheveled – messy, wrinkled, or unkempt look',
            'Fatigued – appears tired or lacking energy',
            'Tearful – appears emotional or crying during session',
            'Other',
          ]}
          selected={value.o_appearance}
          otherValue={value.o_appearance_other}
          onToggle={opt => toggle('o_appearance', opt)}
          onOtherChange={v => set({ o_appearance_other: v })}
        />

        <CheckGroup
          label="Affect / Mood"
          hint="Select all that apply."
          options={[
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
          ]}
          selected={value.o_affect}
          otherValue={value.o_affect_other}
          onToggle={opt => toggle('o_affect', opt)}
          onOtherChange={v => set({ o_affect_other: v })}
        />

        <CheckGroup
          label="Behavior"
          hint="Select all that apply."
          options={[
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
          ]}
          selected={value.o_behavior}
          otherValue={value.o_behavior_other}
          onToggle={opt => toggle('o_behavior', opt)}
          onOtherChange={v => set({ o_behavior_other: v })}
        />

        <CheckGroup
          label="Speech / Thought Process"
          hint="Select all that apply."
          options={[
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
          ]}
          selected={value.o_speech_thought}
          otherValue={value.o_speech_thought_other}
          onToggle={opt => toggle('o_speech_thought', opt)}
          onOtherChange={v => set({ o_speech_thought_other: v })}
        />
      </div>

      {/* ── A — Assessment ──────────────────────────────────────── */}
      <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <SectionHeader label="A" sub="Assessment — Clinical Evaluation" />

        <RadioGroup
          label="Progress Since Last Session"
          hint="Select one that best describes the client's progress."
          options={[
            'Improved – noticeable positive change in mood, coping, or functioning since last session',
            'Slightly Improved – minor positive changes, though issues are still present',
            'No Change – condition or behavior remains generally the same',
            'Declined – mood, symptoms, or functioning have worsened compared to the previous session',
            'Other',
          ]}
          selected={value.a_progress}
          otherValue={value.a_progress_other}
          onSelect={opt => set({ a_progress: opt })}
          onOtherChange={v => set({ a_progress_other: v })}
        />

        <CheckGroup
          label="Main Issues Identified"
          hint="Select all key concerns discussed or observed during this session."
          options={[
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
          ]}
          selected={value.a_main_issues}
          otherValue={value.a_main_issues_other}
          onToggle={opt => toggle('a_main_issues', opt)}
          onOtherChange={v => set({ a_main_issues_other: v })}
        />

        <RadioGroup
          label="Level of Risk – Based on C-SSRS and Clinical Evaluation"
          hint="Select one that best reflects the client's current risk status."
          options={[
            'Low Risk – fleeting thoughts, no plan or intent, protective factors identified',
            'Moderate Risk – ideation with some intent but no plan; partial protective factors',
            'High Risk – active plan or intent, recent attempt, limited protective factors',
            'N/A – not applicable (risk not present or not assessed this session)',
          ]}
          selected={value.a_risk_level}
          onSelect={opt => set({ a_risk_level: opt })}
        />

        <CheckGroup
          label="Clinical Impression"
          hint="Select all that apply. You may add brief remarks below if needed."
          options={[
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
          ]}
          selected={value.a_clinical_impression}
          otherValue={value.a_clinical_impression_other}
          onToggle={opt => toggle('a_clinical_impression', opt)}
          onOtherChange={v => set({ a_clinical_impression_other: v })}
        />

        <div className="mb-2">
          <FieldLabel label="Remarks"
            hint="Add brief observations or key reflections from the session. Indicate 'None' if the checklist already captures all relevant details." />
          <textarea
            value={value.a_remarks}
            onChange={e => set({ a_remarks: e.target.value })}
            rows={2}
            placeholder="None"
            className="w-full px-3 py-2 text-xs rounded-lg outline-none"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
          />
        </div>
      </div>

      {/* ── P — Plan ────────────────────────────────────────────── */}
      <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <SectionHeader label="P" sub="Plan — Next Steps" />

        <CheckGroup
          label="Interventions Used in Session"
          hint="Select all that apply, evidence-based and integrative approaches applied during the session."
          options={[
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
          ]}
          selected={value.p_interventions}
          otherValue={value.p_interventions_other}
          onToggle={opt => toggle('p_interventions', opt)}
          onOtherChange={v => set({ p_interventions_other: v })}
        />

        <CheckGroup
          label="Client Commitments / Homework (if applicable)"
          hint="Identify tasks, reflections, or actions the client agreed to do before the next session."
          options={[
            'Reflection or journaling activity',
            'Practice mindfulness or relaxation techniques',
            'Apply coping strategies discussed',
            'Communicate with identified support person',
            'Complete self-care or study plan',
            'Other',
          ]}
          selected={value.p_homework}
          otherValue={value.p_homework_other}
          onToggle={opt => toggle('p_homework', opt)}
          onOtherChange={v => set({ p_homework_other: v })}
        />

        <CheckGroup
          label="Next Session Focus"
          hint="Select the intended focus or direction for the next counseling/psychotherapy session."
          options={[
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
          ]}
          selected={value.p_next_focus}
          otherValue={value.p_next_focus_other}
          onToggle={opt => toggle('p_next_focus', opt)}
          onOtherChange={v => set({ p_next_focus_other: v })}
        />

        <CheckGroup
          label="Follow-up and Referrals"
          hint="Select all that apply and specify details where needed."
          options={[
            'Schedule next counseling session',
            'Client to complete assigned activity or reflection task',
            'Follow-up via email / message / check-in',
            'Referred to CPS psychologist for psychotherapy',
            'Referred to other university office (e.g., HSO, SDFO, OAS)',
            'No follow-up or referral needed – client informed to reach out when needed',
            'Other',
          ]}
          selected={value.p_follow_up}
          otherValue={value.p_follow_up_other}
          onToggle={opt => toggle('p_follow_up', opt)}
          onOtherChange={v => set({ p_follow_up_other: v })}
        />

        <div className="mb-5">
          <FieldLabel label="Remarks"
            hint="Add brief notes related to the plan, next steps, or collaboration. Indicate 'None' if the checklist already captures all relevant details." />
          <textarea
            value={value.p_remarks}
            onChange={e => set({ p_remarks: e.target.value })}
            rows={2}
            placeholder="None"
            className="w-full px-3 py-2 text-xs rounded-lg outline-none"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
          />
        </div>

        <CheckGroup
          label="Case Status / Termination"
          hint="Indicate the current status of the counseling/psychotherapy case."
          options={[
            'Ongoing – counseling/psychotherapy sessions are continuing',
            'On Hold – sessions temporarily paused (e.g., scheduling or personal reasons)',
            'Referred – client referred to another CPS counselor, psychologist, or external provider',
            'Terminated / Closed – counseling/psychotherapy relationship formally concluded',
            'No further sessions needed – client informed they may return if future support is needed',
            'Other',
          ]}
          selected={value.p_case_status}
          otherValue={value.p_case_status_other}
          onToggle={opt => toggle('p_case_status', opt)}
          onOtherChange={v => set({ p_case_status_other: v })}
        />

        <div>
          <FieldLabel label="Termination Summary / Remarks"
            hint="Briefly describe the reason for termination (e.g., goals met, client self-terminated, non-attendance, referred to psychologist, end of semester). Indicate 'None' if not applicable or 'Ongoing case not for termination yet' if the sessions are still in progress." />
          <textarea
            value={value.p_termination_summary}
            onChange={e => set({ p_termination_summary: e.target.value })}
            rows={2}
            placeholder="None"
            className="w-full px-3 py-2 text-xs rounded-lg outline-none"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
          />
        </div>
      </div>
    </div>
  );
}
