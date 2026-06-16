'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import {
  AlertCircle, CheckCircle2, ChevronRight, ChevronLeft,
  User, BookOpen, Heart, Phone, MapPin, GraduationCap,
  ClipboardList, Stethoscope, Brain, Check, Zap, ShieldAlert,
} from 'lucide-react';

// ── Data ──────────────────────────────────────────────────────────────────────
const PHQ4_QUESTIONS = [
  { id: 'q1', text: 'Little interest or pleasure in doing things', sub: 'PHQ-2 (Depression)', idx: 0 },
  { id: 'q2', text: 'Feeling down, depressed, or hopeless',        sub: 'PHQ-2 (Depression)', idx: 1 },
  { id: 'q3', text: 'Feeling nervous, anxious, or on edge',        sub: 'GAD-2 (Anxiety)',    idx: 2 },
  { id: 'q4', text: 'Not being able to stop or control worrying',  sub: 'GAD-2 (Anxiety)',    idx: 3 },
];

const FREQ = [
  { v: 0, s: 'Not at all',            col: 'text-gray-600',  sel: 'bg-gray-600 text-white border-gray-600' },
  { v: 1, s: 'Several days',          col: 'text-blue-600',  sel: 'bg-blue-500 text-white border-blue-500' },
  { v: 2, s: 'More than half the days', col: 'text-amber-600', sel: 'bg-amber-500 text-white border-amber-500' },
  { v: 3, s: 'Nearly every day',      col: 'text-red-600',   sel: 'bg-red-500 text-white border-red-500' },
];

const STEP_META = [
  { num: 1, label: 'Contact Form',    sub: 'ICF',     accent: 'bg-sky-500' },
  { num: 2, label: 'Personal Background', sub: 'SPIF-IF', accent: 'bg-violet-500' },
  { num: 3, label: 'Mental Health Screen', sub: 'PHQ-4', accent: 'bg-orange-500' },
];

const INPUT = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1a5228]/25 focus:border-[#1a5228] focus:outline-none transition';
const SELECT = INPUT;

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionCard({ icon: Icon, title, color, children }: {
  icon: any; title: string; color: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      <div className={`px-4 py-2.5 flex items-center gap-2 border-b border-gray-100 ${color}`}>
        <Icon size={13} />
        <span className="text-xs font-bold uppercase tracking-wide">{title}</span>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function F({ label, req, children, span }: { label: string; req?: boolean; children: React.ReactNode; span?: boolean }) {
  return (
    <div className={span ? 'col-span-full' : ''}>
      <label className="block text-xs font-semibold text-gray-500 mb-1">
        {label}{req && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Step wizard ───────────────────────────────────────────────────────────────
function StepWizard({ current }: { current: number }) {
  return (
    <div className="flex items-start justify-center gap-0 mb-8">
      {STEP_META.map((s, i) => {
        const done    = i < current;
        const active  = i === current;
        return (
          <div key={i} className="flex items-start">
            <div className="flex flex-col items-center w-24">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm border-2 transition
                ${done   ? 'bg-[#1a5228] border-[#1a5228] text-white'
                : active ? 'bg-white border-[#1a5228] text-[#1a5228]'
                         : 'bg-white border-gray-200 text-gray-400'}`}>
                {done ? <Check size={16} /> : s.num}
              </div>
              <p className={`text-[11px] font-semibold mt-1.5 text-center leading-tight
                ${active ? 'text-[#1a5228]' : done ? 'text-gray-500' : 'text-gray-400'}`}>
                {s.label}
              </p>
              <span className={`text-[9px] uppercase tracking-wide font-bold mt-0.5
                ${active ? 'text-[#1a5228]/60' : 'text-gray-300'}`}>{s.sub}</span>
            </div>
            {i < STEP_META.length - 1 && (
              <div className={`mt-4 h-0.5 w-8 mx-1 ${i < current ? 'bg-[#1a5228]' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WalkinIntakePage() {
  const router = useRouter();
  const [step, setStep]         = useState(0);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [intakeId, setIntakeId] = useState('');
  const [isCrisis, setIsCrisis] = useState(false);

  const [icf, setIcf] = useState({
    first_name: '', last_name: '', middle_name: '',
    email: '', student_id: '', phone: '',
    college: '', program: '', year_level: '',
    referral_source: 'self-referred', referred_by: '',
    emergency_contact_name: '', emergency_contact_relationship: '', emergency_contact_phone: '',
    presenting_concern: '', crisis_type: '', service_requested: 'personal_counseling',
    consent_to_service: false, consent_to_data: false,
  });

  const [spif, setSpif] = useState({
    birthdate: '', gender: '', civil_status: 'single', religion: '', nationality: 'Filipino', address: '',
    family_composition: 'complete', living_with: '', birth_order: '', number_of_siblings: '',
    existing_medical_conditions: '', current_medications: '',
    previous_counseling: false, previous_counseling_details: '',
    previous_psychiatric: false, previous_psychiatric_details: '',
    family_mental_health_history: '',
    sleep_hours: '', exercise_frequency: 'rarely', substance_use: 'none',
  });

  const [phq4, setPhq4] = useState<(number | null)[]>([null, null, null, null]);

  const setI = (k: string, v: any) => setIcf(p => ({ ...p, [k]: v }));
  const setS = (k: string, v: any) => setSpif(p => ({ ...p, [k]: v }));

  const validateCrisis = () => {
    if (!icf.first_name.trim() || !icf.last_name.trim()) { setError('First and last name are required.'); return false; }
    if (!icf.email.trim())                                { setError('Email address is required.'); return false; }
    if (!icf.crisis_type)                                 { setError('Please select the type of crisis.'); return false; }
    if (!icf.consent_to_service || !icf.consent_to_data) { setError('Verbal consent must be confirmed before registering.'); return false; }
    setError(''); return true;
  };

  const validate = () => {
    if (step === 0) {
      if (!icf.first_name.trim() || !icf.last_name.trim()) { setError('First and last name are required.'); return false; }
      if (!icf.email.trim())                                { setError('Email address is required.'); return false; }
      if (!icf.consent_to_service || !icf.consent_to_data) { setError('Please confirm both consent checkboxes.'); return false; }
    }
    if (step === 2 && phq4.some(v => v === null)) {
      setError('Please answer all 4 questions before submitting.');
      return false;
    }
    setError('');
    return true;
  };

  const next = () => { if (validate()) setStep(s => s + 1); };
  const back = () => { setError(''); setStep(s => s - 1); };

  const handleCrisisSubmit = async () => {
    if (!validateCrisis()) return;
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const wr = await fetch(api('/api/intake/walkin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          first_name: icf.first_name, last_name: icf.last_name,
          email: icf.email, student_id: icf.student_id, phone: icf.phone,
          crisis_type: icf.crisis_type, is_urgent: true, is_emergency: true,
          notes: `[FAST-TRACK] Crisis type: ${icf.crisis_type}. SPIF-IF and PHQ-4 deferred to IC session.`,
        }),
      });
      const wd = await wr.json();
      if (!wr.ok) throw new Error(wd.error || 'Registration failed');

      // Submit minimal packet flagged as deferred
      await fetch(api('/api/intake/packet'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          source: 'walkin', submitted_by_role: 'oa',
          appointment_id: wd.appointment_id || null,
          fast_track: true, forms_deferred: true,
          icf: { ...icf, consent_to_service: true, consent_to_data: true },
          spif: null, phq4_responses: null,
          notes: 'Fast-track crisis registration. SPIF-IF and PHQ-4 to be completed by IC during session.',
        }),
      });

      setIntakeId(wd.intake_id || wd.appointment_id || '');
      setSuccess('crisis');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const wr = await fetch(api('/api/intake/walkin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          first_name: icf.first_name, last_name: icf.last_name,
          email: icf.email, student_id: icf.student_id, phone: icf.phone,
          is_urgent: false, notes: '',
        }),
      });
      const wd = await wr.json();
      if (!wr.ok) throw new Error(wd.error || 'Failed to create walk-in intake');

      const pr = await fetch(api('/api/intake/packet'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          source: 'walkin', submitted_by_role: 'oa',
          appointment_id: wd.appointment_id || null,
          icf, spif, phq4_responses: phq4,
        }),
      });
      const pd = await pr.json();
      if (!pr.ok) throw new Error(pd.error || 'Failed to submit intake packet');

      setIntakeId(wd.intake_id || wd.appointment_id || '');
      setSuccess('registered');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const phq2 = (phq4[0] ?? 0) + (phq4[1] ?? 0);
  const gad2 = (phq4[2] ?? 0) + (phq4[3] ?? 0);
  const studentLabel = icf.first_name ? `${icf.first_name} ${icf.last_name}`.trim() : null;

  // ── Crisis success ───────────────────────────────────────────────────────────
  if (success === 'crisis') {
    return (
      <DashboardPageWrapper title="Walk-in Intake" subtitle="">
        <div className="max-w-md mx-auto">
          <div className="bg-white border border-red-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-red-600 px-6 pt-8 pb-6 text-center">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                <ShieldAlert size={28} className="text-white" />
              </div>
              <h2 className="text-lg font-bold text-white">URGENT — Student Registered</h2>
              <p className="text-red-100 text-sm mt-1">{studentLabel}</p>
              {intakeId && <p className="text-red-200 text-xs mt-1 font-mono">ID: {intakeId}</p>}
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm font-bold text-red-700 mb-1">Immediate next steps</p>
                <ol className="text-xs text-red-700 space-y-1 list-decimal list-inside">
                  <li>Alert the IC or on-duty counselor immediately</li>
                  <li>Do not leave the student unattended</li>
                  <li>IC will complete SPIF-IF and PHQ-9/GAD-7 during the session</li>
                </ol>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Deferred forms</p>
                <p className="text-xs text-amber-700">SPIF-IF (personal background) and PHQ-4 were <strong>not collected</strong> due to crisis. The IC will administer PHQ-9, GAD-7, and C-SSRS as needed during the session.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => {
                  setSuccess(''); setStep(0); setIsCrisis(false); setIntakeId('');
                  setIcf({ first_name:'',last_name:'',middle_name:'',email:'',student_id:'',phone:'',college:'',program:'',year_level:'',referral_source:'self-referred',referred_by:'',emergency_contact_name:'',emergency_contact_relationship:'',emergency_contact_phone:'',presenting_concern:'',crisis_type:'',service_requested:'personal_counseling',consent_to_service:false,consent_to_data:false });
                  setSpif({ birthdate:'',gender:'',civil_status:'single',religion:'',nationality:'Filipino',address:'',family_composition:'complete',living_with:'',birth_order:'',number_of_siblings:'',existing_medical_conditions:'',current_medications:'',previous_counseling:false,previous_counseling_details:'',previous_psychiatric:false,previous_psychiatric_details:'',family_mental_health_history:'',sleep_hours:'',exercise_frequency:'rarely',substance_use:'none' });
                  setPhq4([null,null,null,null]);
                }} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl bg-red-600 hover:bg-red-700 transition">
                  New Walk-in
                </button>
                <button onClick={() => router.push('/dashboard')} className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  // ── Normal success ───────────────────────────────────────────────────────────
  if (success === 'registered') {
    return (
      <DashboardPageWrapper title="Walk-in Intake" subtitle="Register a student visiting the office">
        <div className="max-w-md mx-auto">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-[#1a5228] px-6 pt-8 pb-6 text-center">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={28} className="text-white" />
              </div>
              <h2 className="text-lg font-bold text-white">Student Registered</h2>
              <p className="text-green-100 text-sm mt-1">{studentLabel}</p>
              {intakeId && <p className="text-green-200 text-xs mt-1 font-mono">ID: {intakeId}</p>}
            </div>
            <div className="px-6 py-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">PHQ-4 Pre-screen Summary</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: 'PHQ-2 (Depression)', score: phq2, max: 6, at_risk: phq2 >= 3 },
                  { label: 'GAD-2 (Anxiety)',    score: gad2, max: 6, at_risk: gad2 >= 3 },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl p-3 text-center ${s.at_risk ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
                    <p className="text-xs font-semibold text-gray-600 mb-1">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.at_risk ? 'text-red-600' : 'text-green-700'}`}>{s.score}<span className="text-sm font-normal text-gray-400">/{s.max}</span></p>
                    <p className={`text-xs mt-0.5 font-medium ${s.at_risk ? 'text-red-500' : 'text-green-600'}`}>{s.at_risk ? 'Elevated — flag for IC' : 'Within normal range'}</p>
                  </div>
                ))}
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-4">
                <p className="text-xs text-amber-700"><strong>Next step:</strong> Student is queued for IC triage. Hand referral slip to student.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => {
                  setSuccess(''); setStep(0); setIntakeId('');
                  setIcf({ first_name:'',last_name:'',middle_name:'',email:'',student_id:'',phone:'',college:'',program:'',year_level:'',referral_source:'self-referred',referred_by:'',emergency_contact_name:'',emergency_contact_relationship:'',emergency_contact_phone:'',presenting_concern:'',crisis_type:'',service_requested:'personal_counseling',consent_to_service:false,consent_to_data:false });
                  setSpif({ birthdate:'',gender:'',civil_status:'single',religion:'',nationality:'Filipino',address:'',family_composition:'complete',living_with:'',birth_order:'',number_of_siblings:'',existing_medical_conditions:'',current_medications:'',previous_counseling:false,previous_counseling_details:'',previous_psychiatric:false,previous_psychiatric_details:'',family_mental_health_history:'',sleep_hours:'',exercise_frequency:'rarely',substance_use:'none' });
                  setPhq4([null,null,null,null]);
                }} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl" style={{ backgroundColor: '#1a5228' }}>
                  New Walk-in
                </button>
                <button onClick={() => router.push('/dashboard')} className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Walk-in Intake" subtitle="Register a student visiting the CPS office">
      <div className="max-w-2xl mx-auto">

        {/* Crisis toggle */}
        <button
          onClick={() => { setIsCrisis(v => !v); setError(''); setStep(0); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 mb-5 transition font-semibold text-sm
            ${isCrisis
              ? 'bg-red-600 border-red-600 text-white'
              : 'bg-white border-red-200 text-red-600 hover:bg-red-50'}`}>
          <ShieldAlert size={18} className="flex-shrink-0" />
          <div className="text-left flex-1">
            <p className="font-bold">{isCrisis ? '🔴 CRISIS / URGENT MODE — Fast-track active' : 'Student is in crisis or unable to complete full intake'}</p>
            <p className={`text-xs font-normal mt-0.5 ${isCrisis ? 'text-red-100' : 'text-red-400'}`}>
              {isCrisis ? 'Only name, email, concern, and consent are required. SPIF-IF and PHQ-4 deferred to IC session.' : 'Tap to activate fast-track — skips SPIF-IF and PHQ-4'}
            </p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full border font-bold flex-shrink-0 ${isCrisis ? 'bg-white text-red-600 border-white' : 'border-red-200 text-red-500'}`}>
            {isCrisis ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Patient identifier bar (appears once name is entered) */}
        {studentLabel && (
          <div className={`flex items-center gap-3 border rounded-xl px-4 py-2.5 mb-5 ${isCrisis ? 'bg-red-50 border-red-200' : 'bg-[#1a5228]/5 border-[#1a5228]/10'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${isCrisis ? 'bg-red-500' : 'bg-[#1a5228]'}`}>
              {icf.first_name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{studentLabel}</p>
              <p className="text-xs text-gray-500">{icf.email || 'Email not yet entered'}</p>
            </div>
            {isCrisis
              ? <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-bold">URGENT</span>
              : <span className="text-xs px-2 py-1 bg-[#1a5228]/10 text-[#1a5228] rounded-full font-semibold">Walk-in</span>}
          </div>
        )}

        {/* ── CRISIS FAST-TRACK FORM ────────────────────────────────────────── */}
        {isCrisis && (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-2">
              <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">Fast-Track Registration</p>
              <p className="text-xs text-red-600">Capture the minimum needed to get the student to a counselor immediately. IC will complete the full assessment during the session.</p>
            </div>

            <SectionCard icon={User} title="Student Identity" color="bg-red-50 text-red-700">
              <div className="grid grid-cols-2 gap-2">
                <F label="First Name" req><input className={INPUT} value={icf.first_name} onChange={e => setI('first_name', e.target.value)} placeholder="Juan" autoFocus /></F>
                <F label="Last Name" req><input className={INPUT} value={icf.last_name} onChange={e => setI('last_name', e.target.value)} placeholder="dela Cruz" /></F>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <F label="Email" req><input type="email" className={INPUT} value={icf.email} onChange={e => setI('email', e.target.value)} placeholder="student@dlsu.edu.ph" /></F>
                <F label="Student ID (if known)"><input className={INPUT} value={icf.student_id} onChange={e => setI('student_id', e.target.value)} placeholder="00-12345" /></F>
              </div>
            </SectionCard>

            <SectionCard icon={ClipboardList} title="Type of Crisis" color="bg-red-50 text-red-700">
              <F label="Select the type of crisis" req>
                <select className={INPUT} value={icf.crisis_type} onChange={e => setI('crisis_type', e.target.value)}>
                  <option value="">— Select —</option>
                  <option value="suicidal_ideation">Suicidal ideation / self-harm</option>
                  <option value="acute_distress">Acute emotional distress</option>
                  <option value="panic_anxiety">Panic / severe anxiety attack</option>
                  <option value="psychotic_episode">Psychotic episode / dissociation</option>
                  <option value="substance_crisis">Substance-related crisis</option>
                  <option value="other_crisis">Other urgent concern</option>
                </select>
              </F>
              <p className="text-xs text-red-600 mt-1">The IC will assess and document the full clinical concern during the session.</p>
            </SectionCard>

            {/* Verbal consent */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-amber-100 border-b border-amber-200">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Verbal Consent — Required</p>
              </div>
              <div className="px-4 py-3 space-y-2">
                <p className="text-xs text-amber-700">Read aloud and confirm the student's verbal agreement. Written consent can be obtained after the crisis is stabilized.</p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={icf.consent_to_service} onChange={e => setI('consent_to_service', e.target.checked)} className="mt-0.5 w-4 h-4 rounded accent-red-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700"><strong>Consent to Services:</strong> The student verbally consents to receive crisis counseling from DLSU CPS.</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={icf.consent_to_data} onChange={e => setI('consent_to_data', e.target.checked)} className="mt-0.5 w-4 h-4 rounded accent-red-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700"><strong>Data Privacy:</strong> The student verbally consents to processing of their personal information for service delivery (RA 10173).</span>
                </label>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
              <strong>What is deferred:</strong> SPIF-IF (personal/family background) and PHQ-4 screener will <em>not</em> be collected now. The IC will administer PHQ-9, GAD-7, and C-SSRS as clinically indicated during the session.
            </div>

            {error && (
              <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />{error}
              </div>
            )}

            <button onClick={handleCrisisSubmit} disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-white rounded-xl transition disabled:opacity-50 bg-red-600 hover:bg-red-700">
              {loading ? 'Registering…' : <><Zap size={15} /> Fast-Track Register — URGENT</>}
            </button>
          </div>
        )}

        {/* ── NORMAL FLOW ──────────────────────────────────────────────────── */}
        {!isCrisis && (
          <>
        {/* Step wizard */}
        <StepWizard current={step} />

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />{error}
          </div>
        )}

        {/* ── STEP 0: ICF ─────────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList size={16} className="text-sky-600" />
              <h2 className="text-sm font-bold text-gray-800">Initial Contact Form <span className="text-xs text-gray-400 font-normal ml-1">(ICF)</span></h2>
            </div>
            <p className="text-xs text-gray-500 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2 mb-3">
              OA fills this form together with the student. Fields marked <span className="text-red-400 font-semibold">*</span> are required.
            </p>

            <SectionCard icon={User} title="Student Information" color="bg-sky-50 text-sky-700">
              <div className="grid grid-cols-3 gap-2">
                <F label="First Name" req><input className={INPUT} value={icf.first_name} onChange={e => setI('first_name', e.target.value)} placeholder="Juan" /></F>
                <F label="Middle Name"><input className={INPUT} value={icf.middle_name} onChange={e => setI('middle_name', e.target.value)} placeholder="Optional" /></F>
                <F label="Last Name" req><input className={INPUT} value={icf.last_name} onChange={e => setI('last_name', e.target.value)} placeholder="dela Cruz" /></F>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <F label="Email Address" req><input type="email" className={INPUT} value={icf.email} onChange={e => setI('email', e.target.value)} placeholder="student@dlsu.edu.ph" /></F>
                <F label="Phone Number"><input className={INPUT} value={icf.phone} onChange={e => setI('phone', e.target.value)} placeholder="+63 9XX XXX XXXX" /></F>
              </div>
            </SectionCard>

            <SectionCard icon={GraduationCap} title="Academic Information" color="bg-sky-50 text-sky-700">
              <div className="grid grid-cols-3 gap-2">
                <F label="Student ID"><input className={INPUT} value={icf.student_id} onChange={e => setI('student_id', e.target.value)} placeholder="00-12345" /></F>
                <F label="College / Unit"><input className={INPUT} value={icf.college} onChange={e => setI('college', e.target.value)} placeholder="CLA" /></F>
                <F label="Program"><input className={INPUT} value={icf.program} onChange={e => setI('program', e.target.value)} placeholder="AB Psychology" /></F>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <F label="Year Level">
                  <select className={SELECT} value={icf.year_level} onChange={e => setI('year_level', e.target.value)}>
                    <option value="">— Select —</option>
                    {['1st Year','2nd Year','3rd Year','4th Year','5th Year','Graduate'].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </F>
                <F label="Service Requested">
                  <select className={SELECT} value={icf.service_requested} onChange={e => setI('service_requested', e.target.value)}>
                    <option value="personal_counseling">Personal Counseling</option>
                    <option value="academic_counseling">Academic Counseling</option>
                    <option value="career_counseling">Career Counseling</option>
                    <option value="crisis_support">Crisis Support</option>
                    <option value="psychotherapy">Psychotherapy</option>
                    <option value="consultation">Consultation</option>
                  </select>
                </F>
              </div>
            </SectionCard>

            <SectionCard icon={BookOpen} title="Referral Information" color="bg-sky-50 text-sky-700">
              <F label="How did the student come to CPS?">
                <select className={SELECT} value={icf.referral_source} onChange={e => setI('referral_source', e.target.value)}>
                  <option value="self-referred">Self-Referred (walked in on own)</option>
                  <option value="faculty">Referred by Faculty</option>
                  <option value="sdfo">Referred by SDFO</option>
                  <option value="peer">Referred by Peer / Friend</option>
                  <option value="family">Referred by Family</option>
                  <option value="other">Other</option>
                </select>
              </F>
              {icf.referral_source !== 'self-referred' && (
                <F label="Referred by (name / unit / organization)">
                  <input className={INPUT} value={icf.referred_by} onChange={e => setI('referred_by', e.target.value)} placeholder="Name or office" />
                </F>
              )}
            </SectionCard>

            <SectionCard icon={Phone} title="Emergency Contact" color="bg-sky-50 text-sky-700">
              <div className="grid grid-cols-3 gap-2">
                <F label="Full Name"><input className={INPUT} value={icf.emergency_contact_name} onChange={e => setI('emergency_contact_name', e.target.value)} placeholder="Contact person" /></F>
                <F label="Relationship"><input className={INPUT} value={icf.emergency_contact_relationship} onChange={e => setI('emergency_contact_relationship', e.target.value)} placeholder="e.g. Parent, Sibling" /></F>
                <F label="Phone Number"><input className={INPUT} value={icf.emergency_contact_phone} onChange={e => setI('emergency_contact_phone', e.target.value)} placeholder="+63 9XX XXX XXXX" /></F>
              </div>
            </SectionCard>


            {/* Consent block */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-amber-100 border-b border-amber-200">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Informed Consent — Required</p>
              </div>
              <div className="px-4 py-4 space-y-3">
                <p className="text-xs text-amber-700">Please read each statement aloud to the student and confirm their verbal agreement.</p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={icf.consent_to_service} onChange={e => setI('consent_to_service', e.target.checked)} className="mt-0.5 w-4 h-4 rounded accent-[#1a5228] flex-shrink-0" />
                  <span className="text-sm text-gray-700 leading-relaxed">
                    <strong>Consent to Counseling Services:</strong> The student voluntarily consents to receive counseling and psychological services from DLSU CPS, and understands the limits of confidentiality.
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={icf.consent_to_data} onChange={e => setI('consent_to_data', e.target.checked)} className="mt-0.5 w-4 h-4 rounded accent-[#1a5228] flex-shrink-0" />
                  <span className="text-sm text-gray-700 leading-relaxed">
                    <strong>Data Privacy Consent:</strong> The student consents to the collection and processing of personal information in accordance with the Data Privacy Act of 2012 (RA 10173).
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: SPIF-IF ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={16} className="text-violet-600" />
              <h2 className="text-sm font-bold text-gray-800">Student Personal Information Form <span className="text-xs text-gray-400 font-normal ml-1">(SPIF-IF)</span></h2>
            </div>
            <p className="text-xs text-gray-500 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2 mb-3">
              Background information to help the counselor prepare for the session. Student may fill this while waiting; OA assists as needed.
            </p>

            <SectionCard icon={User} title="Personal Information" color="bg-violet-50 text-violet-700">
              <div className="grid grid-cols-3 gap-2">
                <F label="Date of Birth"><input type="date" className={INPUT} value={spif.birthdate} onChange={e => setS('birthdate', e.target.value)} /></F>
                <F label="Gender">
                  <select className={SELECT} value={spif.gender} onChange={e => setS('gender', e.target.value)}>
                    <option value="">— Select —</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                    <option value="other">Other</option>
                  </select>
                </F>
                <F label="Civil Status">
                  <select className={SELECT} value={spif.civil_status} onChange={e => setS('civil_status', e.target.value)}>
                    <option value="single">Single</option>
                    <option value="in_relationship">In a relationship</option>
                    <option value="married">Married</option>
                    <option value="separated">Separated</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </F>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <F label="Religion"><input className={INPUT} value={spif.religion} onChange={e => setS('religion', e.target.value)} placeholder="e.g. Roman Catholic" /></F>
                <F label="Nationality"><input className={INPUT} value={spif.nationality} onChange={e => setS('nationality', e.target.value)} /></F>
              </div>
              <F label="Home Address">
                <input className={INPUT} value={spif.address} onChange={e => setS('address', e.target.value)} placeholder="City, Province" />
              </F>
            </SectionCard>

            <SectionCard icon={MapPin} title="Family Background" color="bg-violet-50 text-violet-700">
              <div className="grid grid-cols-2 gap-2">
                <F label="Family Composition">
                  <select className={SELECT} value={spif.family_composition} onChange={e => setS('family_composition', e.target.value)}>
                    <option value="complete">Complete (both parents)</option>
                    <option value="separated">Separated / Divorced</option>
                    <option value="single_parent">Single Parent</option>
                    <option value="extended">Extended Family</option>
                    <option value="other">Other</option>
                  </select>
                </F>
                <F label="Currently Living With">
                  <input className={INPUT} value={spif.living_with} onChange={e => setS('living_with', e.target.value)} placeholder="e.g. Parents, Alone, Dorm" />
                </F>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <F label="Birth Order"><input className={INPUT} value={spif.birth_order} onChange={e => setS('birth_order', e.target.value)} placeholder="e.g. 1st of 3" /></F>
                <F label="Number of Siblings"><input type="number" min="0" className={INPUT} value={spif.number_of_siblings} onChange={e => setS('number_of_siblings', e.target.value)} /></F>
              </div>
            </SectionCard>

            <SectionCard icon={Heart} title="Physical Health History" color="bg-violet-50 text-violet-700">
              <F label="Existing Medical Conditions">
                <input className={INPUT} value={spif.existing_medical_conditions} onChange={e => setS('existing_medical_conditions', e.target.value)} placeholder="None, or briefly describe…" />
              </F>
              <F label="Current Medications">
                <input className={INPUT} value={spif.current_medications} onChange={e => setS('current_medications', e.target.value)} placeholder="None, or list medications and dosages" />
              </F>
            </SectionCard>

            <SectionCard icon={Stethoscope} title="Mental Health History" color="bg-violet-50 text-violet-700">
              <div className="space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition">
                  <input type="checkbox" checked={spif.previous_counseling} onChange={e => setS('previous_counseling', e.target.checked)} className="mt-0.5 w-4 h-4 rounded accent-[#1a5228] flex-shrink-0" />
                  <span className="text-sm text-gray-700">Has previously received counseling or therapy</span>
                </label>
                {spif.previous_counseling && (
                  <F label="Counseling Details">
                    <input className={INPUT} value={spif.previous_counseling_details} onChange={e => setS('previous_counseling_details', e.target.value)} placeholder="When, where, and reason for counseling" />
                  </F>
                )}
                <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition">
                  <input type="checkbox" checked={spif.previous_psychiatric} onChange={e => setS('previous_psychiatric', e.target.checked)} className="mt-0.5 w-4 h-4 rounded accent-[#1a5228] flex-shrink-0" />
                  <span className="text-sm text-gray-700">Has previously received psychiatric treatment or been diagnosed with a mental health condition</span>
                </label>
                {spif.previous_psychiatric && (
                  <F label="Psychiatric Details">
                    <input className={INPUT} value={spif.previous_psychiatric_details} onChange={e => setS('previous_psychiatric_details', e.target.value)} placeholder="Diagnosis, medications, when" />
                  </F>
                )}
                <F label="Family Mental Health History">
                  <input className={INPUT} value={spif.family_mental_health_history} onChange={e => setS('family_mental_health_history', e.target.value)} placeholder="Any known mental health conditions in the family (optional)" />
                </F>
              </div>
            </SectionCard>

            <SectionCard icon={Heart} title="Lifestyle" color="bg-violet-50 text-violet-700">
              <div className="grid grid-cols-3 gap-2">
                <F label="Avg. Sleep per Night"><input className={INPUT} value={spif.sleep_hours} onChange={e => setS('sleep_hours', e.target.value)} placeholder="e.g. 5–6 hrs" /></F>
                <F label="Exercise Frequency">
                  <select className={SELECT} value={spif.exercise_frequency} onChange={e => setS('exercise_frequency', e.target.value)}>
                    <option value="daily">Daily</option>
                    <option value="3-4x_week">3–4× a week</option>
                    <option value="1-2x_week">1–2× a week</option>
                    <option value="rarely">Rarely</option>
                    <option value="never">Never</option>
                  </select>
                </F>
                <F label="Substance Use">
                  <select className={SELECT} value={spif.substance_use} onChange={e => setS('substance_use', e.target.value)}>
                    <option value="none">None</option>
                    <option value="alcohol_occasional">Alcohol (occasional)</option>
                    <option value="alcohol_regular">Alcohol (regular)</option>
                    <option value="tobacco">Tobacco / Vaping</option>
                    <option value="recreational_drugs">Recreational drugs</option>
                    <option value="multiple">Multiple substances</option>
                  </select>
                </F>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ── STEP 2: PHQ-4 ───────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Brain size={16} className="text-orange-600" />
              <h2 className="text-sm font-bold text-gray-800">PHQ-4 Mental Health Quick Screen</h2>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-3">
              <p className="text-xs font-bold text-orange-800 mb-0.5">Administration Instructions</p>
              <p className="text-xs text-orange-700">Read each item aloud to the student. Ask: <em>"Over the <strong>last 2 weeks</strong>, how often have you been bothered by the following?"</em></p>
            </div>

            {/* Section header: PHQ-2 */}
            <div className="flex items-center gap-2 px-1">
              <div className="flex-1 h-px bg-blue-200" />
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wide px-2">PHQ-2 — Depression Screener</span>
              <div className="flex-1 h-px bg-blue-200" />
            </div>

            {PHQ4_QUESTIONS.slice(0, 2).map((q, i) => (
              <div key={q.id} className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
                <p className="text-sm font-semibold text-gray-800 mb-3">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold mr-2">{i+1}</span>
                  {q.text}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FREQ.map(opt => (
                    <button key={opt.v} type="button"
                      onClick={() => { const n = [...phq4]; n[i] = opt.v; setPhq4(n); }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-semibold border-2 transition text-center
                        ${phq4[i] === opt.v ? opt.sel : `border-gray-200 bg-white ${opt.col} hover:border-gray-300`}`}>
                      <span className="block text-base font-bold">{opt.v}</span>
                      {opt.s}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Section header: GAD-2 */}
            <div className="flex items-center gap-2 px-1 mt-2">
              <div className="flex-1 h-px bg-amber-200" />
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wide px-2">GAD-2 — Anxiety Screener</span>
              <div className="flex-1 h-px bg-amber-200" />
            </div>

            {PHQ4_QUESTIONS.slice(2, 4).map((q, i) => (
              <div key={q.id} className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
                <p className="text-sm font-semibold text-gray-800 mb-3">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold mr-2">{i+3}</span>
                  {q.text}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FREQ.map(opt => (
                    <button key={opt.v} type="button"
                      onClick={() => { const n = [...phq4]; n[i+2] = opt.v; setPhq4(n); }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-semibold border-2 transition text-center
                        ${phq4[i+2] === opt.v ? opt.sel : `border-gray-200 bg-white ${opt.col} hover:border-gray-300`}`}>
                      <span className="block text-base font-bold">{opt.v}</span>
                      {opt.s}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Live score */}
            {phq4.every(v => v !== null) && (
              <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Score Summary</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { l: 'PHQ-2', s: phq2, max: 6, risk: phq2 >= 3, desc: 'Depression' },
                    { l: 'GAD-2', s: gad2, max: 6, risk: gad2 >= 3, desc: 'Anxiety' },
                    { l: 'Total', s: phq2+gad2, max: 12, risk: phq2+gad2 >= 6, desc: 'PHQ-4' },
                  ].map(x => (
                    <div key={x.l} className={`rounded-xl py-3 px-2 ${x.risk ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
                      <p className="text-xs text-gray-500 mb-0.5">{x.desc}</p>
                      <p className={`text-2xl font-bold ${x.risk ? 'text-red-600' : 'text-green-700'}`}>{x.s}<span className="text-xs font-normal text-gray-400">/{x.max}</span></p>
                      <p className={`text-[10px] font-semibold mt-0.5 ${x.risk ? 'text-red-500' : 'text-green-600'}`}>{x.l}: {x.risk ? '⚠ Elevated' : '✓ Normal'}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Score ≥ 3 on PHQ-2 or GAD-2 indicates possible depression / anxiety — IC will administer full PHQ-9 and GAD-7.</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation bar */}
        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
          {step > 0 ? (
            <button onClick={back} className="flex items-center gap-1.5 px-4 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
              <ChevronLeft size={14} /> Back
            </button>
          ) : (
            <button onClick={() => router.back()} className="flex items-center gap-1.5 px-4 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
              Cancel
            </button>
          )}
          <div className="flex-1 text-center">
            <p className="text-xs text-gray-400">Step {step + 1} of {STEP_META.length}</p>
          </div>
          {step < 2 ? (
            <button onClick={next} className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition" style={{ backgroundColor: '#1a5228' }}>
              Continue <ChevronRight size={14} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading || phq4.some(v => v === null)}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition" style={{ backgroundColor: '#1a5228' }}>
              {loading ? 'Submitting…' : <><Check size={14} /> Submit Intake</>}
            </button>
          )}
        </div>
          </>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
