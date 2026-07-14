'use client';

import { useState } from 'react';
import { api } from '@/utils/api';
import {
  User, BookOpen, Brain, CheckCircle2, ChevronRight, ChevronLeft,
  ClipboardList, AlertCircle, Heart, GraduationCap,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────────

const PHQ4_QUESTIONS = [
  { id: 'q1', text: 'Little interest or pleasure in doing things',   sub: 'PHQ-2 (Depression)' },
  { id: 'q2', text: 'Feeling down, depressed, or hopeless',          sub: 'PHQ-2 (Depression)' },
  { id: 'q3', text: 'Feeling nervous, anxious, or on edge',          sub: 'GAD-2 (Anxiety)'    },
  { id: 'q4', text: 'Not being able to stop or control worrying',    sub: 'GAD-2 (Anxiety)'    },
];

// Clinical severity colors — kept fixed (not theme-sensitive)
const FREQ = [
  { v: 0, s: 'Not at all',              selStyle: { background: '#4B5563', color: '#fff', borderColor: '#4B5563' } },
  { v: 1, s: 'Several days',            selStyle: { background: '#3B82F6', color: '#fff', borderColor: '#3B82F6' } },
  { v: 2, s: 'More than half the days', selStyle: { background: '#F59E0B', color: '#fff', borderColor: '#F59E0B' } },
  { v: 3, s: 'Nearly every day',        selStyle: { background: '#EF4444', color: '#fff', borderColor: '#EF4444' } },
];

const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduate', 'Law', 'Other'];
const COLLEGES = [
  'College of Business and Economics (CBE)',
  'College of Computer Studies (CCS)',
  'College of Education (CED)',
  'College of Engineering (GCOE)',
  'College of Law (CL)',
  'College of Liberal Arts (CLA)',
  'College of Science (CS)',
  'College of Tourism and Hospitality Management (CTHM)',
  'Graduate School of Business (GSB)',
  'School of Economics (SOE)',
  'Br. Andrew Gonzalez FSC College of Education (BAGCED)',
  'Taft',
  'Other',
];
const CIVIL_STATUSES = ['Single', 'Married', 'Separated', 'Widowed', 'Other'];
const REFERRAL_SOURCES = [
  'Self-referred', 'Faculty / Professor', 'Dean / Department Chair',
  'Guidance Counselor', 'Friend / Classmate', 'Parent / Family',
  'University Health Service', 'Other',
];
const SERVICES = [
  'Individual Counseling', 'Psychological Assessment', 'Group Counseling',
  'Crisis Intervention', 'Consultation', 'Other',
];

// ── Styles ─────────────────────────────────────────────────────────────────────

const IC = 'w-full px-3 py-2.5 text-sm rounded-lg outline-none transition';
const ICS: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

// Card header styles
const skyHeader: React.CSSProperties  = { background: 'var(--color-primary-surface)', color: 'var(--color-primary-text)' };
const violetHeader: React.CSSProperties = { background: '#EDE9FE', color: '#5B21B6' };
const successHeader: React.CSSProperties = { background: 'var(--color-success-surface)', color: 'var(--color-success-text)' };
const orangeHeader: React.CSSProperties = { background: '#FFF7ED', color: '#C2410C' };
// Health background: kept fixed red (clinical)
const redHeader: React.CSSProperties   = { background: '#FEF2F2', color: '#B91C1C' };

// ── Sub-components ─────────────────────────────────────────────────────────────

function F({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
        {label}{req && <span className="ml-1" style={{ color: 'var(--color-danger)' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Card({ icon: Icon, title, headerStyle, children }: {
  icon: React.ElementType; title: string; headerStyle?: React.CSSProperties; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ ...(headerStyle ?? skyHeader), borderBottom: '1px solid var(--color-border)' }}>
        <Icon size={13} /><span className="text-xs font-bold uppercase tracking-wide">{title}</span>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

// ── Initial state ──────────────────────────────────────────────────────────────

const INIT_ICF = {
  first_name: '', last_name: '', email: '', phone: '',
  year_level: '', college: '', degree: '', civil_status: '',
  referral_source: '', service_requested: '',
  prior_consultation: false, prior_consultation_details: '',
  consent_to_service: false, consent_to_data: false,
};

const INIT_SPIF = {
  address: '', emergency_contact_name: '', emergency_contact_relation: '',
  emergency_contact_number: '', medication: false, medication_details: '',
  family_history: false, family_history_details: '',
  previous_diagnosis: false, previous_diagnosis_details: '',
};

// ── Main Page ──────────────────────────────────────────────────────────────────

type Step = 'icf' | 'spif' | 'phq4' | 'confirm';

export default function WalkInSelfCheckinPage() {
  const [step, setStep] = useState<Step>('icf');
  const [icf, setIcf]   = useState({ ...INIT_ICF });
  const [spif, setSpif] = useState({ ...INIT_SPIF });
  const [phq4, setPhq4] = useState<number[]>([-1, -1, -1, -1]);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ counseling_id: string; appointment_id: string } | null>(null);

  function validateICF() {
    const e: string[] = [];
    if (!icf.first_name.trim()) e.push('First name is required');
    if (!icf.last_name.trim())  e.push('Last name is required');
    if (!icf.email.trim() || !icf.email.includes('@')) e.push('Valid email is required');
    if (icf.email.trim() && !icf.email.trim().toLowerCase().endsWith('@dlsu.edu.ph')) e.push('Only DLSU email addresses (@dlsu.edu.ph) are accepted');
    if (!icf.year_level)   e.push('Year level is required');
    if (!icf.college)      e.push('College is required');
    if (!icf.service_requested) e.push('Service requested is required');
    if (!icf.referral_source)   e.push('Referral source is required');
    if (!icf.consent_to_service) e.push('You must consent to counseling services');
    if (!icf.consent_to_data)    e.push('You must consent to data collection');
    return e;
  }

  function validateSPIF() { return []; }

  function validatePHQ4() {
    return phq4.some(v => v < 0) ? ['Please answer all 4 questions'] : [];
  }

  function next() {
    let e: string[] = [];
    if (step === 'icf')  e = validateICF();
    if (step === 'spif') e = validateSPIF();
    if (step === 'phq4') e = validatePHQ4();
    setErrors(e);
    if (e.length) return;
    const map: Record<Step, Step> = { icf: 'spif', spif: 'phq4', phq4: 'confirm', confirm: 'confirm' };
    setStep(map[step]);
  }

  function back() {
    setErrors([]);
    const map: Record<Step, Step> = { icf: 'icf', spif: 'icf', phq4: 'spif', confirm: 'phq4' };
    setStep(map[step]);
  }

  async function submit() {
    setSubmitting(true);
    setErrors([]);
    try {
      const res = await fetch(api('/api/intake/self-checkin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: icf.first_name.trim(),
          last_name:  icf.last_name.trim(),
          email:      icf.email.trim().toLowerCase(),
          phone:      icf.phone.trim(),
          icf: { ...icf, email: icf.email.trim().toLowerCase() },
          spif,
          phq4_responses: phq4,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setErrors([json.error || 'Submission failed']); return; }
      setResult({ counseling_id: json.counseling_id, appointment_id: json.appointment_id });
    } catch {
      setErrors(['Network error. Please try again.']);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render: Done ─────────────────────────────────────────────────────────────

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
        <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card-lg)' }}>
          <div className="px-6 py-8 text-center" style={{ background: 'var(--color-primary)' }}>
            <CheckCircle2 size={48} className="text-white mx-auto mb-3" />
            <h1 className="text-xl font-bold text-white">Check-In Complete</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>Please show this to the CPS staff</p>
          </div>
          <div className="p-6 text-center space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Reference Number</p>
              <p className="text-3xl font-mono font-bold tracking-wider" style={{ color: 'var(--color-primary)' }}>{result.counseling_id}</p>
            </div>
            <div className="rounded-xl p-4 text-sm space-y-1" style={{ background: 'var(--color-success-surface)', color: 'var(--color-text-secondary)' }}>
              <p>Your forms have been submitted.</p>
              <p>Please present this reference number at the front desk.</p>
              <p className="font-medium mt-2" style={{ color: 'var(--color-primary)' }}>A staff member will assist you shortly.</p>
            </div>
            <button
              onClick={() => { setResult(null); setStep('icf'); setIcf({ ...INIT_ICF }); setSpif({ ...INIT_SPIF }); setPhq4([-1,-1,-1,-1]); }}
              className="text-xs underline mt-2"
              style={{ color: 'var(--color-text-muted)' }}>
              Start a new check-in
            </button>
          </div>
        </div>
      </div>
    );
  }

  const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
    { id: 'icf',     label: 'Contact Form',  icon: ClipboardList },
    { id: 'spif',    label: 'Background',    icon: GraduationCap },
    { id: 'phq4',    label: 'Mental Health', icon: Brain         },
    { id: 'confirm', label: 'Review',        icon: CheckCircle2  },
  ];
  const stepIdx = STEPS.findIndex(s => s.id === step);

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="px-4 pt-8 pb-6 text-center" style={{ background: 'var(--color-primary)' }}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <Heart size={18} style={{ color: 'rgba(255,255,255,0.6)' }} />
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>DLSU — CPS</span>
        </div>
        <h1 className="text-white text-xl font-bold">Walk-In Self Check-In</h1>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>Center for Psychological Services</p>
      </div>

      {/* Step bar */}
      <div className="px-4 py-3" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between max-w-sm mx-auto">
          {STEPS.map((s, i) => {
            const done = i < stepIdx;
            const active = i === stepIdx;
            return (
              <div key={s.id} className="flex flex-col items-center gap-1 flex-1">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={
                    done || active
                      ? { background: 'var(--color-primary)', color: '#fff', boxShadow: active ? '0 0 0 3px var(--color-primary-muted)' : undefined }
                      : { background: 'var(--color-bg)', color: 'var(--color-text-muted)' }
                  }>
                  {done ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                <span className="text-[10px] font-medium text-center leading-tight"
                  style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="max-w-sm mx-auto mt-4 px-4">
          <div className="rounded-xl p-3 flex gap-2"
            style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-danger)' }} />
            <ul className="text-xs space-y-0.5" style={{ color: 'var(--color-danger-text)' }}>
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="max-w-sm mx-auto px-4 mt-4 space-y-4">

        {/* ── Step 1: ICF ─────────────────────────────────────────────────────── */}
        {step === 'icf' && (
          <>
            <Card icon={User} title="Personal Information (ICF)" headerStyle={skyHeader}>
              <div className="grid grid-cols-2 gap-3">
                <F label="First Name" req>
                  <input className={IC} style={ICS} value={icf.first_name} onChange={e => setIcf(p => ({ ...p, first_name: e.target.value }))} placeholder="Juan" />
                </F>
                <F label="Last Name" req>
                  <input className={IC} style={ICS} value={icf.last_name} onChange={e => setIcf(p => ({ ...p, last_name: e.target.value }))} placeholder="dela Cruz" />
                </F>
              </div>
              <F label="DLSU Email" req>
                <input className={IC} style={ICS} type="email" value={icf.email} onChange={e => setIcf(p => ({ ...p, email: e.target.value }))} placeholder="jdelacruz@dlsu.edu.ph" inputMode="email" />
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Must be a DLSU email (@dlsu.edu.ph)</p>
              </F>
              <F label="Phone Number">
                <input className={IC} style={ICS} type="tel" value={icf.phone} onChange={e => setIcf(p => ({ ...p, phone: e.target.value }))} placeholder="09XX XXX XXXX" />
              </F>
            </Card>

            <Card icon={GraduationCap} title="Academic Information" headerStyle={violetHeader}>
              <F label="Year Level" req>
                <select className={IC} style={ICS} value={icf.year_level} onChange={e => setIcf(p => ({ ...p, year_level: e.target.value }))}>
                  <option value="">Select year level</option>
                  {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </F>
              <F label="College" req>
                <select className={IC} style={ICS} value={icf.college} onChange={e => setIcf(p => ({ ...p, college: e.target.value }))}>
                  <option value="">Select college</option>
                  {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </F>
              <F label="Degree Program">
                <input className={IC} style={ICS} value={icf.degree} onChange={e => setIcf(p => ({ ...p, degree: e.target.value }))} placeholder="e.g. BS Computer Science" />
              </F>
              <F label="Civil Status">
                <select className={IC} style={ICS} value={icf.civil_status} onChange={e => setIcf(p => ({ ...p, civil_status: e.target.value }))}>
                  <option value="">Select status</option>
                  {CIVIL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </F>
            </Card>

            <Card icon={ClipboardList} title="Service Information" headerStyle={successHeader}>
              <F label="Referred by" req>
                <select className={IC} style={ICS} value={icf.referral_source} onChange={e => setIcf(p => ({ ...p, referral_source: e.target.value }))}>
                  <option value="">Select referral source</option>
                  {REFERRAL_SOURCES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </F>
              <F label="Service Requested" req>
                <select className={IC} style={ICS} value={icf.service_requested} onChange={e => setIcf(p => ({ ...p, service_requested: e.target.value }))}>
                  <option value="">Select service</option>
                  {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </F>
              <F label="Prior Consultation at CPS?">
                <div className="flex gap-3 mt-0.5">
                  {['Yes', 'No'].map(v => (
                    <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>
                      <input type="radio" name="prior" checked={icf.prior_consultation === (v === 'Yes')} onChange={() => setIcf(p => ({ ...p, prior_consultation: v === 'Yes' }))} style={{ accentColor: 'var(--color-primary)' }} />
                      {v}
                    </label>
                  ))}
                </div>
              </F>
              {icf.prior_consultation && (
                <F label="Details of prior consultation">
                  <input className={IC} style={ICS} value={icf.prior_consultation_details} onChange={e => setIcf(p => ({ ...p, prior_consultation_details: e.target.value }))} placeholder="When, with whom, etc." />
                </F>
              )}
            </Card>

            {/* Consent — kept fixed colored sections (legal document) */}
            <Card icon={Heart} title="Informed Consent" headerStyle={orangeHeader}>
              <div className="text-xs leading-relaxed space-y-3 max-h-56 overflow-y-auto pr-1" style={{ color: 'var(--color-text-secondary)' }}>
                <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>De La Salle University — Counseling &amp; Psychology Services (CPS)</p>

                <div className="border border-green-200 rounded-lg p-2.5 bg-green-50/50">
                  <p className="font-bold text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-primary)' }}>I. Informed Consent for Counseling Services</p>
                  <p>CPS provides mental health support, counseling, and psychological services to enrolled students on a voluntary basis. You may discontinue at any time without penalty. Under RA 11036 (Mental Health Act of 2018), you have the right to access services and to be treated with dignity.</p>
                </div>

                <div className="border border-amber-200 rounded-lg p-2.5 bg-amber-50/50">
                  <p className="font-bold text-amber-800 text-xs uppercase tracking-wide mb-1">II. Limits of Confidentiality Statement</p>
                  <p>All session information is strictly confidential <span className="font-semibold">except</span> when: (a) there is imminent risk of harm to you or others; (b) child abuse is suspected; (c) disclosure is court-ordered; or (d) required by university policy for safety purposes. Only the minimum necessary information will be disclosed.</p>
                </div>

                <div className="border border-blue-200 rounded-lg p-2.5 bg-blue-50/50">
                  <p className="font-bold text-green-800 text-xs uppercase tracking-wide mb-1">III. Privacy Notice</p>
                  <p className="mb-1"><span className="font-medium">Data collected:</span> Personal information, mental health history, assessment results (PHQ-9, GAD-7, C-SSRS), session notes, emergency contact, and wellness monitoring data.</p>
                  <p><span className="font-medium">Who may access:</span> Only authorized CPS personnel directly involved in your care. Records are retained for a minimum of ten (10) years from your last session.</p>
                </div>

                <div className="border border-purple-200 rounded-lg p-2.5 bg-purple-50/50">
                  <p className="font-bold text-purple-800 text-xs uppercase tracking-wide mb-1">IV. Consent for Data Processing (RA 10173 — Data Privacy Act of 2012)</p>
                  <p className="mb-1">Your mental health records are <span className="font-medium">sensitive personal information</span> under RA 10173 and require your explicit consent to process.</p>
                  <p className="text-gray-500">DLSU DPO: dpo@dlsu.edu.ph · 2401 Taft Avenue, Malate, Manila 1004</p>
                </div>
              </div>
              <label className="flex items-start gap-2 cursor-pointer mt-2">
                <input type="checkbox" className="mt-0.5" style={{ accentColor: 'var(--color-primary)' }} checked={icf.consent_to_service} onChange={e => setIcf(p => ({ ...p, consent_to_service: e.target.checked }))} />
                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>I have read and understood Sections I and II. I voluntarily consent to receive counseling and psychological services from DLSU CPS and acknowledge the limits of confidentiality.</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-0.5" style={{ accentColor: 'var(--color-primary)' }} checked={icf.consent_to_data} onChange={e => setIcf(p => ({ ...p, consent_to_data: e.target.checked }))} />
                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>I have read and understood Sections III and IV. I consent to the collection, processing, and storage of my personal and sensitive personal information in accordance with RA 10173 (Data Privacy Act of 2012).</span>
              </label>
            </Card>
          </>
        )}

        {/* ── Step 2: SPIF-IF ─────────────────────────────────────────────────── */}
        {step === 'spif' && (
          <>
            <Card icon={BookOpen} title="Background Information (SPIF-IF)" headerStyle={violetHeader}>
              <F label="Home Address">
                <input className={IC} style={ICS} value={spif.address} onChange={e => setSpif(p => ({ ...p, address: e.target.value }))} placeholder="City, Province" />
              </F>
            </Card>

            <Card icon={User} title="Emergency Contact" headerStyle={skyHeader}>
              <F label="Contact Name">
                <input className={IC} style={ICS} value={spif.emergency_contact_name} onChange={e => setSpif(p => ({ ...p, emergency_contact_name: e.target.value }))} placeholder="Full name" />
              </F>
              <F label="Relationship">
                <input className={IC} style={ICS} value={spif.emergency_contact_relation} onChange={e => setSpif(p => ({ ...p, emergency_contact_relation: e.target.value }))} placeholder="e.g. Parent, Sibling" />
              </F>
              <F label="Contact Number">
                <input className={IC} style={ICS} type="tel" value={spif.emergency_contact_number} onChange={e => setSpif(p => ({ ...p, emergency_contact_number: e.target.value }))} placeholder="09XX XXX XXXX" />
              </F>
            </Card>

            {/* Health background: kept fixed red (clinical) */}
            <Card icon={Heart} title="Health Background" headerStyle={redHeader}>
              <F label="Currently taking medication?">
                <div className="flex gap-3 mt-0.5">
                  {['Yes', 'No'].map(v => (
                    <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>
                      <input type="radio" name="med" checked={spif.medication === (v === 'Yes')} onChange={() => setSpif(p => ({ ...p, medication: v === 'Yes' }))} style={{ accentColor: 'var(--color-primary)' }} />
                      {v}
                    </label>
                  ))}
                </div>
              </F>
              {spif.medication && (
                <F label="Medication details">
                  <input className={IC} style={ICS} value={spif.medication_details} onChange={e => setSpif(p => ({ ...p, medication_details: e.target.value }))} placeholder="Name, dosage, doctor" />
                </F>
              )}
              <F label="Family history of mental health concerns?">
                <div className="flex gap-3 mt-0.5">
                  {['Yes', 'No'].map(v => (
                    <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>
                      <input type="radio" name="fam" checked={spif.family_history === (v === 'Yes')} onChange={() => setSpif(p => ({ ...p, family_history: v === 'Yes' }))} style={{ accentColor: 'var(--color-primary)' }} />
                      {v}
                    </label>
                  ))}
                </div>
              </F>
              {spif.family_history && (
                <F label="Family history details">
                  <input className={IC} style={ICS} value={spif.family_history_details} onChange={e => setSpif(p => ({ ...p, family_history_details: e.target.value }))} placeholder="Describe briefly" />
                </F>
              )}
              <F label="Previously diagnosed with a psychological condition?">
                <div className="flex gap-3 mt-0.5">
                  {['Yes', 'No'].map(v => (
                    <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>
                      <input type="radio" name="diag" checked={spif.previous_diagnosis === (v === 'Yes')} onChange={() => setSpif(p => ({ ...p, previous_diagnosis: v === 'Yes' }))} style={{ accentColor: 'var(--color-primary)' }} />
                      {v}
                    </label>
                  ))}
                </div>
              </F>
              {spif.previous_diagnosis && (
                <F label="Diagnosis details">
                  <input className={IC} style={ICS} value={spif.previous_diagnosis_details} onChange={e => setSpif(p => ({ ...p, previous_diagnosis_details: e.target.value }))} placeholder="Condition, when diagnosed" />
                </F>
              )}
            </Card>
          </>
        )}

        {/* ── Step 3: PHQ-4 — clinical colors kept fixed ──────────────────────── */}
        {step === 'phq4' && (
          <Card icon={Brain} title="Mental Health Screening (PHQ-4)" headerStyle={orangeHeader}>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Over the last 2 weeks, how often have you been bothered by any of the following?</p>
            <div className="space-y-5 pt-1">
              {PHQ4_QUESTIONS.map((q, i) => (
                <div key={q.id}>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>{q.sub}</p>
                  <p className="text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>{q.text}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {FREQ.map(f => {
                      const isSelected = phq4[i] === f.v;
                      return (
                        <button
                          key={f.v}
                          type="button"
                          onClick={() => setPhq4(prev => prev.map((v, idx) => idx === i ? f.v : v))}
                          className="text-xs py-2 px-2 rounded-lg font-medium transition"
                          style={isSelected
                            ? { ...f.selStyle, border: `1px solid ${f.selStyle.borderColor}` }
                            : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }
                          }
                          onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-border)'; }}
                          onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)'; }}
                        >
                          {f.s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Step 4: Review — clinical review badges kept fixed ──────────────── */}
        {step === 'confirm' && (
          <>
            <Card icon={User} title="Your Information" headerStyle={skyHeader}>
              <div className="text-sm space-y-1.5" style={{ color: 'var(--color-text-primary)' }}>
                <div className="flex justify-between"><span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Name</span><span className="font-medium">{icf.first_name} {icf.last_name}</span></div>
                <div className="flex justify-between"><span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Email</span><span className="font-medium text-xs">{icf.email}</span></div>
                <div className="flex justify-between"><span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Year / College</span><span className="font-medium text-xs text-right max-w-[60%]">{icf.year_level} — {icf.college}</span></div>
                <div className="flex justify-between"><span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Service</span><span className="font-medium text-xs">{icf.service_requested}</span></div>
                <div className="flex justify-between"><span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Referred by</span><span className="font-medium text-xs">{icf.referral_source}</span></div>
              </div>
            </Card>

            <Card icon={Brain} title="PHQ-4 Responses" headerStyle={orangeHeader}>
              <div className="space-y-2">
                {PHQ4_QUESTIONS.map((q, i) => (
                  <div key={q.id} className="flex justify-between items-start gap-2">
                    <span className="text-xs flex-1" style={{ color: 'var(--color-text-secondary)' }}>{q.text}</span>
                    {/* Review severity badges: kept fixed clinical colors */}
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={
                        phq4[i] === 0 ? { background: '#F3F4F6', color: '#4B5563' } :
                        phq4[i] === 1 ? { background: '#EFF6FF', color: '#1D4ED8' } :
                        phq4[i] === 2 ? { background: '#FFFBEB', color: '#B45309' } :
                                        { background: '#FEF2F2', color: '#B91C1C' }
                      }>
                      {FREQ.find(f => f.v === phq4[i])?.s ?? '—'}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <div className="rounded-xl p-4 text-xs space-y-1"
              style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)', color: 'var(--color-text-secondary)' }}>
              <p className="font-semibold" style={{ color: 'var(--color-success-text)' }}>Before you submit:</p>
              <p>• Please ensure your information is accurate.</p>
              <p>• A staff member will review your forms and call your name shortly.</p>
              <p>• Your data is kept confidential under DLSU&apos;s Privacy Policy.</p>
            </div>
          </>
        )}

        {/* ── Navigation ─────────────────────────────────────────────────────── */}
        <div className="flex gap-3 pt-1">
          {step !== 'icf' && (
            <button onClick={back}
              className="flex-1 flex items-center justify-center gap-1 py-3 rounded-xl text-sm font-medium transition"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-surface)')}>
              <ChevronLeft size={16} /> Back
            </button>
          )}
          {step !== 'confirm' ? (
            <button onClick={next}
              className="flex-1 flex items-center justify-center gap-1 py-3 rounded-xl text-white text-sm font-semibold transition"
              style={{ background: 'var(--color-primary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary)')}>
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={submit} disabled={submitting}
              className="flex-1 flex items-center justify-center gap-1 py-3 rounded-xl text-white text-sm font-semibold transition disabled:opacity-60"
              style={{ background: 'var(--color-primary)' }}
              onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
              onMouseLeave={e => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}>
              {submitting ? 'Submitting…' : 'Submit Check-In'}
            </button>
          )}
        </div>

        <p className="text-center pb-2" style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          DLSU Center for Psychological Services · All data is encrypted and kept confidential.
        </p>
      </div>
    </div>
  );
}
