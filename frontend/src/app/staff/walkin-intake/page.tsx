'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import {
  AlertCircle, CheckCircle2, ChevronRight, ChevronLeft,
  User, BookOpen, Heart, Phone, MapPin, GraduationCap,
  ClipboardList, Stethoscope, Brain, Check, Zap, ShieldAlert, CalendarCheck, Clock,
} from 'lucide-react';

// ── Data ──────────────────────────────────────────────────────────────────────
const PHQ4_QUESTIONS = [
  { id: 'q1', text: 'Little interest or pleasure in doing things', idx: 0 },
  { id: 'q2', text: 'Feeling down, depressed, or hopeless',        idx: 1 },
  { id: 'q3', text: 'Feeling nervous, anxious, or on edge',        idx: 2 },
  { id: 'q4', text: 'Not being able to stop or control worrying',  idx: 3 },
];

// Clinical PHQ-4 response severity — keep as fixed hex (clinical tool)
const FREQ = [
  { v: 0, s: 'Not at all',              col: '#4B5563', sel: { background: '#4B5563', color: '#fff', border: '2px solid #4B5563' } },
  { v: 1, s: 'Several days',            col: '#2563EB', sel: { background: '#3B82F6', color: '#fff', border: '2px solid #3B82F6' } },
  { v: 2, s: 'More than half the days', col: '#D97706', sel: { background: '#F59E0B', color: '#fff', border: '2px solid #F59E0B' } },
  { v: 3, s: 'Nearly every day',        col: '#DC2626', sel: { background: '#EF4444', color: '#fff', border: '2px solid #EF4444' } },
];

const STEP_LABELS = [
  { num: 1, label: 'Contact Form',        sub: 'ICF'     },
  { num: 2, label: 'Personal Background', sub: 'SPIF-IF' },
  { num: 3, label: 'Mental Health Screen',sub: 'PHQ-4'   },
  { num: 4, label: 'Assign IC',           sub: 'Session' },
];

const IC = 'w-full px-3 py-2.5 text-sm rounded-lg outline-none transition';
const ICS: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionCard({ icon: Icon, title, headerStyle, children }: {
  icon: any; title: string; headerStyle?: React.CSSProperties; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border)', ...headerStyle }}>
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
      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
        {label}{req && <span className="ml-1" style={{ color: 'var(--color-danger)' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Step wizard ───────────────────────────────────────────────────────────────
function StepWizard({ current }: { current: number }) {
  return (
    <div className="flex items-start justify-center gap-0 mb-8">
      {STEP_LABELS.map((s, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-start">
            <div className="flex flex-col items-center w-24">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition"
                style={done
                  ? { background: 'var(--color-primary)', border: '2px solid var(--color-primary)', color: '#fff' }
                  : active
                  ? { background: 'var(--color-surface)', border: '2px solid var(--color-primary)', color: 'var(--color-primary)' }
                  : { background: 'var(--color-surface)', border: '2px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                {done ? <Check size={16} /> : s.num}
              </div>
              <p className="text-[11px] font-semibold mt-1.5 text-center leading-tight"
                style={{ color: active ? 'var(--color-primary)' : done ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>
                {s.label}
              </p>
              <span className="text-xs uppercase tracking-wide font-bold mt-0.5"
                style={{ color: active ? 'var(--color-primary-text)' : 'var(--color-text-muted)' }}>{s.sub}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className="mt-4 h-0.5 w-8 mx-1" style={{ background: i < current ? 'var(--color-primary)' : 'var(--color-border)' }} />
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
  const [crisisStaff, setCrisisStaff]         = useState<{_id:string;name:string;role:string}[]>([]);
  const [selectedCrisisStaffId, setSelectedCrisisStaffId] = useState('');
  const [loadingCrisisStaff, setLoadingCrisisStaff]       = useState(false);

  const [icSlots, setIcSlots]             = useState<{time:string;method:string;counselor_id:string;counselor_name:string}[]>([]);
  const [loadingSlots, setLoadingSlots]   = useState(false);
  const [slotsError, setSlotsError]       = useState('');
  const [selectedSlot, setSelectedSlot]   = useState<{time:string;method:string;counselor_id:string;counselor_name:string}|null>(null);

  const [icf, setIcf] = useState({
    first_name: '', last_name: '', middle_name: '',
    email: '', student_id: '', phone: '',
    college: '', program: '', year_level: '',
    referral_source: 'self-referred', referred_by: '',
    emergency_contact_name: '', emergency_contact_relationship: '', emergency_contact_phone: '',
    presenting_concern: '', crisis_type: '', service_requested: '',
    consent_to_service: false, consent_to_data: false,
  });

  const [spif, setSpif] = useState({
    birthdate: '', gender: '', religion: '', nationality: 'Filipino', address: '',
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

  useEffect(() => {
    if (!isCrisis || crisisStaff.length > 0) return;
    setLoadingCrisisStaff(true);
    const token = localStorage.getItem('token');
    fetch(api('/api/users?roles=COUNSELOR,PSYCHOLOGIST,CASE_MANAGER'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.users) {
          setCrisisStaff(d.users.map((u: any) => ({
            _id: u._id || u.id,
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
            role: u.role,
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCrisisStaff(false));
  }, [isCrisis]);

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
    if (step === 2 && phq4.some(v => v === null)) { setError('Please answer all 4 questions before submitting.'); return false; }
    setError(''); return true;
  };

  const loadIcSlots = async () => {
    setLoadingSlots(true); setSlotsError('');
    try {
      const today = new Date().toISOString().split('T')[0];
      const token = localStorage.getItem('token');
      const res = await fetch(api(`/api/availability/open-slots?date=${today}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load IC availability');
      setIcSlots(data.slots || []);
      if ((data.slots || []).length === 0) setSlotsError(data.next_available_date ? `No IC slots available today. Next available: ${data.next_available_date}` : 'No IC slots available today.');
    } catch (e) {
      setSlotsError(e instanceof Error ? e.message : 'Failed to load availability');
    } finally { setLoadingSlots(false); }
  };

  const next = () => { if (!validate()) return; if (step === 2) loadIcSlots(); setStep(s => s + 1); };
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
          ...(selectedCrisisStaffId ? { counselor_id: selectedCrisisStaffId } : {}),
          notes: `[FAST-TRACK] Crisis type: ${icf.crisis_type}. SPIF-IF and PHQ-4 deferred to counseling session.`,
        }),
      });
      const wd = await wr.json();
      if (!wr.ok) throw new Error(wd.error || 'Registration failed');
      await fetch(api('/api/intake/packet'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          source: 'walkin', submitted_by_role: 'oa',
          appointment_id: wd.appointment_id || null,
          fast_track: true, forms_deferred: true,
          icf: { ...icf, consent_to_service: true, consent_to_data: true },
          spif: null, phq4_responses: null,
          notes: 'Fast-track crisis registration. SPIF-IF and PHQ-4 to be completed during counseling session.',
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
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const wr = await fetch(api('/api/intake/walkin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          first_name: icf.first_name, last_name: icf.last_name,
          email: icf.email, student_id: icf.student_id, phone: icf.phone,
          is_urgent: false, notes: '',
          ...(selectedSlot ? {
            counselor_id: selectedSlot.counselor_id,
            scheduled_time: selectedSlot.time,
            scheduled_method: selectedSlot.method,
          } : {}),
        }),
      });
      const wd = await wr.json();
      if (!wr.ok) throw new Error(wd.error || 'Failed to create walk-in intake');
      const pr = await fetch(api('/api/intake/packet'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ source: 'walkin', submitted_by_role: 'oa', appointment_id: wd.appointment_id || null, icf, spif, phq4_responses: phq4 }),
      });
      const pd = await pr.json();
      if (!pr.ok) throw new Error(pd.error || 'Failed to submit intake packet');
      setIntakeId(wd.intake_id || wd.appointment_id || '');
      setSuccess('registered');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally { setLoading(false); }
  };

  const phq2 = (phq4[0] ?? 0) + (phq4[1] ?? 0);
  const gad2 = (phq4[2] ?? 0) + (phq4[3] ?? 0);
  const studentLabel = icf.first_name ? `${icf.first_name} ${icf.last_name}`.trim() : null;

  const resetForm = () => {
    setSuccess(''); setStep(0); setIsCrisis(false); setIntakeId('');
    setIcf({ first_name:'',last_name:'',middle_name:'',email:'',student_id:'',phone:'',college:'',program:'',year_level:'',referral_source:'self-referred',referred_by:'',emergency_contact_name:'',emergency_contact_relationship:'',emergency_contact_phone:'',presenting_concern:'',crisis_type:'',service_requested:'',consent_to_service:false,consent_to_data:false });
    setSpif({ birthdate:'',gender:'',religion:'',nationality:'Filipino',address:'',family_composition:'complete',living_with:'',birth_order:'',number_of_siblings:'',existing_medical_conditions:'',current_medications:'',previous_counseling:false,previous_counseling_details:'',previous_psychiatric:false,previous_psychiatric_details:'',family_mental_health_history:'',sleep_hours:'',exercise_frequency:'rarely',substance_use:'none' });
    setPhq4([null,null,null,null]);
  };

  // ── Crisis success ─────────────────────────────────────────────────────────
  if (success === 'crisis') {
    return (
      <DashboardPageWrapper title="Walk-in Intake" subtitle="">
        <div className="max-w-md mx-auto">
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid #FECACA' }}>
            <div className="px-6 pt-8 pb-6 text-center" style={{ background: '#DC2626' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <ShieldAlert size={28} className="text-white" />
              </div>
              <h2 className="text-lg font-bold" style={{ color: 'white' }}>URGENT — Student Registered</h2>
              <p className="text-sm mt-1" style={{ color: '#FEE2E2' }}>{studentLabel}</p>
              {intakeId && <p className="text-xs mt-1 font-mono" style={{ color: '#FECACA' }}>ID: {intakeId}</p>}
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-xl px-4 py-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <p className="text-sm font-bold mb-1" style={{ color: '#B91C1C' }}>Immediate next steps</p>
                <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: '#B91C1C' }}>
                  <li>Alert the IC or on-duty counselor immediately</li>
                  <li>Do not leave the student unattended</li>
                  <li>IC will complete SPIF-IF and PHQ-9/GAD-7 during the session</li>
                </ol>
              </div>
              <div className="rounded-xl px-4 py-3" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#92400E' }}>Deferred forms</p>
                <p className="text-xs" style={{ color: '#92400E' }}>SPIF-IF and PHQ-4 were <strong>not collected</strong> due to crisis. The IC will administer PHQ-9, GAD-7, and C-SSRS as needed during the session.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={resetForm} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition" style={{ background: '#DC2626' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#B91C1C')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#DC2626')}>
                  New Walk-in
                </button>
                <button onClick={() => router.push('/dashboard')} className="flex-1 py-2.5 text-sm rounded-xl transition"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  // ── Normal success ─────────────────────────────────────────────────────────
  if (success === 'registered') {
    return (
      <DashboardPageWrapper title="Walk-in Intake" subtitle="Register a student visiting the office">
        <div className="max-w-md mx-auto">
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="px-6 pt-8 pb-6 text-center" style={{ background: 'var(--color-primary)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <CheckCircle2 size={28} className="text-white" />
              </div>
              <h2 className="text-lg font-bold" style={{ color: 'white' }}>Student Registered</h2>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>{studentLabel}</p>
              {intakeId && <p className="text-xs mt-1 font-mono" style={{ color: 'rgba(255,255,255,0.7)' }}>ID: {intakeId}</p>}
            </div>
            <div className="px-6 py-5">
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>PHQ-4 Pre-screen Summary</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: 'PHQ-2 (Depression)', score: phq2, max: 6, at_risk: phq2 >= 3 },
                  { label: 'GAD-2 (Anxiety)',    score: gad2, max: 6, at_risk: gad2 >= 3 },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3 text-center" style={s.at_risk ? { background: '#FEF2F2', border: '1px solid #FECACA' } : { background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>{s.label}</p>
                    <p className="text-2xl font-bold" style={{ color: s.at_risk ? '#DC2626' : '#1D4ED8' }}>{s.score}<span className="text-sm font-normal" style={{ color: 'var(--color-text-muted)' }}>/{s.max}</span></p>
                    <p className="text-xs mt-0.5 font-medium" style={{ color: s.at_risk ? '#EF4444' : '#16A34A' }}>{s.at_risk ? 'Elevated — flag for IC' : 'Within normal range'}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl px-3 py-2 mb-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <p className="text-xs" style={{ color: '#92400E' }}><strong>Next step:</strong> Student is queued for IC triage. Hand referral slip to student.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { resetForm(); setIsCrisis(false); }} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl"
                  style={{ background: 'var(--color-primary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary)')}>
                  New Walk-in
                </button>
                <button onClick={() => router.push('/dashboard')} className="flex-1 py-2.5 text-sm rounded-xl transition"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  // ── SectionCard header styles ──────────────────────────────────────────────
  // Sky (ICF step) → primary-surface; Violet (SPIF step) → fixed purple; Red (crisis) → fixed red
  const skyHeader:    React.CSSProperties = { background: 'var(--color-primary-surface)', color: 'var(--color-primary-text)' };
  const violetHeader: React.CSSProperties = { background: '#EDE9FE', color: '#5B21B6' };
  const redHeader:    React.CSSProperties = { background: '#FEF2F2', color: '#991B1B' };

  return (
    <DashboardPageWrapper title="Walk-in Intake" subtitle="Register a student visiting the CPS office">
      <div className="max-w-2xl mx-auto">

        {/* Crisis toggle — keep fixed red (safety-critical UI) */}
        <button
          onClick={() => { setIsCrisis(v => !v); setError(''); setStep(0); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 mb-5 transition font-semibold text-sm"
          style={isCrisis
            ? { background: '#DC2626', borderColor: '#DC2626', color: '#fff' }
            : { background: 'var(--color-surface)', borderColor: '#FECACA', color: '#DC2626' }}
          onMouseEnter={e => { if (!isCrisis) (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2'; }}
          onMouseLeave={e => { if (!isCrisis) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface)'; }}>
          <ShieldAlert size={18} className="flex-shrink-0" />
          <div className="text-left flex-1">
            <p className="font-bold">{isCrisis ? '🔴 CRISIS / URGENT MODE — Fast-track active' : 'Student is in crisis or unable to complete full intake'}</p>
            <p className="text-xs font-normal mt-0.5" style={{ color: isCrisis ? '#FEE2E2' : '#F87171' }}>
              {isCrisis ? 'Only name, email, concern, and consent are required. SPIF-IF and PHQ-4 deferred to counseling session.' : 'Tap to activate fast-track — skips SPIF-IF and PHQ-4'}
            </p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full border font-bold flex-shrink-0"
            style={isCrisis ? { background: '#fff', color: '#DC2626', borderColor: '#fff' } : { borderColor: '#FECACA', color: '#EF4444' }}>
            {isCrisis ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Patient identifier bar */}
        {studentLabel && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 mb-5"
            style={isCrisis
              ? { background: '#FEF2F2', border: '1px solid #FECACA' }
              : { background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary-muted)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: isCrisis ? '#EF4444' : 'var(--color-primary)' }}>
              {icf.first_name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{studentLabel}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{icf.email || 'Email not yet entered'}</p>
            </div>
            {isCrisis
              ? <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: '#FEE2E2', color: '#B91C1C' }}>URGENT</span>
              : <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)' }}>Walk-in</span>}
          </div>
        )}

        {/* ── CRISIS FAST-TRACK FORM ────────────────────────────────────────── */}
        {isCrisis && (
          <div className="space-y-3">
            <div className="rounded-xl px-4 py-3 mb-2" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#B91C1C' }}>Fast-Track Registration</p>
              <p className="text-xs" style={{ color: '#DC2626' }}>Capture the minimum needed to get the student to a counselor immediately. The assigned staff will complete the full assessment during the session.</p>
            </div>

            <SectionCard icon={User} title="Student Identity" headerStyle={redHeader}>
              <div className="grid grid-cols-2 gap-2">
                <F label="First Name" req><input className={IC} style={ICS} value={icf.first_name} onChange={e => setI('first_name', e.target.value)} placeholder="Juan" autoFocus /></F>
                <F label="Last Name"  req><input className={IC} style={ICS} value={icf.last_name}  onChange={e => setI('last_name',  e.target.value)} placeholder="dela Cruz" /></F>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <F label="Email" req><input type="email" className={IC} style={ICS} value={icf.email} onChange={e => setI('email', e.target.value)} placeholder="student@dlsu.edu.ph" /></F>
                <F label="Student ID (if known)"><input className={IC} style={ICS} value={icf.student_id} onChange={e => setI('student_id', e.target.value)} placeholder="00-12345" /></F>
              </div>
            </SectionCard>

            <SectionCard icon={ClipboardList} title="Type of Crisis" headerStyle={redHeader}>
              <F label="Select the type of crisis" req>
                <select className={IC} style={ICS} value={icf.crisis_type} onChange={e => setI('crisis_type', e.target.value)}>
                  <option value="">— Select —</option>
                  <option value="suicidal_ideation">Suicidal ideation / self-harm</option>
                  <option value="acute_distress">Acute emotional distress</option>
                  <option value="panic_anxiety">Panic / severe anxiety attack</option>
                  <option value="psychotic_episode">Psychotic episode / dissociation</option>
                  <option value="substance_crisis">Substance-related crisis</option>
                  <option value="other_crisis">Other urgent concern</option>
                </select>
              </F>
              <p className="text-xs" style={{ color: '#DC2626' }}>The assigned counselor/psychologist will assess and document the full clinical concern during the session.</p>
            </SectionCard>

            {/* Verbal consent */}
            <div className="rounded-xl overflow-hidden" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <div className="px-4 py-2.5" style={{ background: '#FEF3C7', borderBottom: '1px solid #FDE68A' }}>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#92400E' }}>Verbal Consent — Required</p>
              </div>
              <div className="px-4 py-3 space-y-2">
                <p className="text-xs" style={{ color: '#92400E' }}>Read aloud and confirm the student's verbal agreement. Written consent can be obtained after the crisis is stabilized.</p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={icf.consent_to_service} onChange={e => setI('consent_to_service', e.target.checked)} className="mt-0.5 w-4 h-4 rounded flex-shrink-0" style={{ accentColor: '#DC2626' }} />
                  <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}><strong>Consent to Services:</strong> The student verbally consents to receive crisis counseling from DLSU CPS.</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={icf.consent_to_data} onChange={e => setI('consent_to_data', e.target.checked)} className="mt-0.5 w-4 h-4 rounded flex-shrink-0" style={{ accentColor: '#DC2626' }} />
                  <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}><strong>Data Privacy:</strong> The student verbally consents to processing of their personal information for service delivery (RA 10173).</span>
                </label>
              </div>
            </div>

            {/* Direct counselor/psychologist assignment */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid #FECACA' }}>
              <div className="px-4 py-2.5" style={{ background: '#FEF2F2', borderBottom: '1px solid #FECACA' }}>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#B91C1C' }}>Route to Available Counselor / Psychologist</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#EF4444' }}>Assign now to confirm immediately. If left unassigned, it goes to Appointment Requests for the OA to assign later.</p>
              </div>
              <div className="px-4 py-3">
                {loadingCrisisStaff ? (
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Loading available counselors…</p>
                ) : (
                  <select value={selectedCrisisStaffId} onChange={e => setSelectedCrisisStaffId(e.target.value)} className={IC} style={ICS}>
                    <option value="">— Leave unassigned (goes to Appointment Requests) —</option>
                    {crisisStaff.filter(s => s.role === 'COUNSELOR').length > 0 && (
                      <optgroup label="Counselors">
                        {crisisStaff.filter(s => s.role === 'COUNSELOR').map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </optgroup>
                    )}
                    {crisisStaff.filter(s => s.role === 'PSYCHOLOGIST').length > 0 && (
                      <optgroup label="Psychologists">
                        {crisisStaff.filter(s => s.role === 'PSYCHOLOGIST').map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </optgroup>
                    )}
                    {crisisStaff.filter(s => s.role === 'CASE_MANAGER').length > 0 && (
                      <optgroup label="Case Managers">
                        {crisisStaff.filter(s => s.role === 'CASE_MANAGER').map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </optgroup>
                    )}
                  </select>
                )}
              </div>
            </div>

            <div className="rounded-xl px-4 py-3 text-xs" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary-muted)', color: 'var(--color-primary-text)' }}>
              <strong>What is deferred:</strong> SPIF-IF (personal/family background) and PHQ-4 screener will <em>not</em> be collected now. The assigned staff will administer PHQ-9, GAD-7, and C-SSRS as clinically indicated during the session.
            </div>

            {error && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger-text)' }}>
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />{error}
              </div>
            )}

            <button onClick={handleCrisisSubmit} disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-white rounded-xl transition disabled:opacity-50"
              style={{ background: '#DC2626' }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#B91C1C'; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#DC2626'; }}>
              {loading ? 'Registering…' : <><Zap size={15} /> Fast-Track Register — URGENT</>}
            </button>
          </div>
        )}

        {/* ── NORMAL FLOW ──────────────────────────────────────────────────── */}
        {!isCrisis && (
          <>
            <StepWizard current={step} />

            {error && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm mb-4" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger-text)' }}>
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />{error}
              </div>
            )}

            {/* ── STEP 0: ICF ─────────────────────────────────────────────────── */}
            {step === 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList size={16} style={{ color: 'var(--color-primary)' }} />
                  <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Initial Contact Form <span className="text-xs font-normal ml-1" style={{ color: 'var(--color-text-muted)' }}>(ICF)</span></h2>
                </div>
                <p className="text-xs rounded-lg px-3 py-2 mb-3" style={{ color: 'var(--color-text-secondary)', background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary-muted)' }}>
                  OA fills this form together with the student. Fields marked <span style={{ color: 'var(--color-danger)' }} className="font-semibold">*</span> are required.
                </p>

                <SectionCard icon={User} title="Student Information" headerStyle={skyHeader}>
                  <div className="grid grid-cols-3 gap-2">
                    <F label="First Name" req><input className={IC} style={ICS} value={icf.first_name} onChange={e => setI('first_name', e.target.value)} placeholder="Juan" /></F>
                    <F label="Middle Name"><input className={IC} style={ICS} value={icf.middle_name} onChange={e => setI('middle_name', e.target.value)} placeholder="Optional" /></F>
                    <F label="Last Name"  req><input className={IC} style={ICS} value={icf.last_name}  onChange={e => setI('last_name',  e.target.value)} placeholder="dela Cruz" /></F>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <F label="Email Address" req><input type="email" className={IC} style={ICS} value={icf.email} onChange={e => setI('email', e.target.value)} placeholder="student@dlsu.edu.ph" /></F>
                    <F label="Phone Number"><input className={IC} style={ICS} value={icf.phone} onChange={e => setI('phone', e.target.value)} placeholder="+63 9XX XXX XXXX" /></F>
                  </div>
                </SectionCard>

                <SectionCard icon={GraduationCap} title="Academic Information" headerStyle={skyHeader}>
                  <div className="grid grid-cols-3 gap-2">
                    <F label="Student ID"><input className={IC} style={ICS} value={icf.student_id} onChange={e => setI('student_id', e.target.value)} placeholder="00-12345" /></F>
                    <F label="College / Unit"><input className={IC} style={ICS} value={icf.college} onChange={e => setI('college', e.target.value)} placeholder="CLA" /></F>
                    <F label="Program"><input className={IC} style={ICS} value={icf.program} onChange={e => setI('program', e.target.value)} placeholder="AB Psychology" /></F>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <F label="Year Level">
                      <select className={IC} style={ICS} value={icf.year_level} onChange={e => setI('year_level', e.target.value)}>
                        <option value="">— Select —</option>
                        {['1st Year','2nd Year','3rd Year','4th Year','5th Year','Graduate'].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </F>
                    <F label="Service Requested">
                      <select className={IC} style={ICS} value={icf.service_requested} onChange={e => setI('service_requested', e.target.value)}>
                        <option value="">— Select service —</option>
                        <option value="Individual Counseling">Individual Counseling</option>
                        <option value="Psychological Assessment">Psychological Assessment</option>
                        <option value="Crisis Intervention">Crisis Intervention</option>
                        <option value="Consultation">Consultation</option>
                        <option value="Other">Other</option>
                      </select>
                    </F>
                  </div>
                </SectionCard>

                <SectionCard icon={BookOpen} title="Referral Information" headerStyle={skyHeader}>
                  <F label="How did the student come to CPS?">
                    <select className={IC} style={ICS} value={icf.referral_source} onChange={e => setI('referral_source', e.target.value)}>
                      <option value="self-referred">Self-Referred (walked in on own)</option>
                      <option value="Faculty / Professor">Referred by Faculty / Professor</option>
                      <option value="Dean / Department Chair">Referred by Dean / Department Chair</option>
                      <option value="Guidance Counselor">Referred by Guidance Counselor</option>
                      <option value="Friend / Classmate">Referred by Friend / Classmate</option>
                      <option value="Parent / Family">Referred by Parent / Family</option>
                      <option value="University Health Service">Referred by University Health Service</option>
                      <option value="Other">Other</option>
                    </select>
                  </F>
                  {icf.referral_source !== 'self-referred' && (
                    <F label="Referred by (name / unit / organization)">
                      <input className={IC} style={ICS} value={icf.referred_by} onChange={e => setI('referred_by', e.target.value)} placeholder="Name or office" />
                    </F>
                  )}
                </SectionCard>

                <SectionCard icon={Phone} title="Emergency Contact" headerStyle={skyHeader}>
                  <div className="grid grid-cols-3 gap-2">
                    <F label="Full Name"><input className={IC} style={ICS} value={icf.emergency_contact_name} onChange={e => setI('emergency_contact_name', e.target.value)} placeholder="Contact person" /></F>
                    <F label="Relationship"><input className={IC} style={ICS} value={icf.emergency_contact_relationship} onChange={e => setI('emergency_contact_relationship', e.target.value)} placeholder="e.g. Parent, Sibling" /></F>
                    <F label="Phone Number"><input className={IC} style={ICS} value={icf.emergency_contact_phone} onChange={e => setI('emergency_contact_phone', e.target.value)} placeholder="+63 9XX XXX XXXX" /></F>
                  </div>
                </SectionCard>

                {/* Consent */}
                <div className="rounded-xl overflow-hidden" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <div className="px-4 py-2.5" style={{ background: '#FEF3C7', borderBottom: '1px solid #FDE68A' }}>
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#92400E' }}>Informed Consent — Required</p>
                  </div>
                  <div className="px-4 py-4 space-y-3">
                    <p className="text-xs" style={{ color: '#92400E' }}>Please read each statement aloud to the student and confirm their verbal agreement.</p>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={icf.consent_to_service} onChange={e => setI('consent_to_service', e.target.checked)} className="mt-0.5 w-4 h-4 rounded flex-shrink-0" style={{ accentColor: 'var(--color-primary)' }} />
                      <span className="text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                        <strong>Consent to Counseling Services:</strong> The student voluntarily consents to receive counseling and psychological services from DLSU CPS, and understands the limits of confidentiality.
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={icf.consent_to_data} onChange={e => setI('consent_to_data', e.target.checked)} className="mt-0.5 w-4 h-4 rounded flex-shrink-0" style={{ accentColor: 'var(--color-primary)' }} />
                      <span className="text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
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
                  <BookOpen size={16} style={{ color: '#7C3AED' }} />
                  <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Student Personal Information Form <span className="text-xs font-normal ml-1" style={{ color: 'var(--color-text-muted)' }}>(SPIF-IF)</span></h2>
                </div>
                <p className="text-xs rounded-lg px-3 py-2 mb-3" style={{ color: '#5B21B6', background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                  Background information to help the counselor prepare for the session. Student may fill this while waiting; OA assists as needed.
                </p>

                <SectionCard icon={User} title="Personal Information" headerStyle={violetHeader}>
                  <div className="grid grid-cols-3 gap-2">
                    <F label="Date of Birth"><input type="date" className={IC} style={ICS} value={spif.birthdate} onChange={e => setS('birthdate', e.target.value)} /></F>
                    <F label="Gender">
                      <select className={IC} style={ICS} value={spif.gender} onChange={e => setS('gender', e.target.value)}>
                        <option value="">— Select —</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="non-binary">Non-binary</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                        <option value="other">Other</option>
                      </select>
                    </F>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <F label="Religion"><input className={IC} style={ICS} value={spif.religion} onChange={e => setS('religion', e.target.value)} placeholder="e.g. Roman Catholic" /></F>
                    <F label="Nationality"><input className={IC} style={ICS} value={spif.nationality} onChange={e => setS('nationality', e.target.value)} /></F>
                  </div>
                  <F label="Home Address"><input className={IC} style={ICS} value={spif.address} onChange={e => setS('address', e.target.value)} placeholder="City, Province" /></F>
                </SectionCard>

                <SectionCard icon={MapPin} title="Family Background" headerStyle={violetHeader}>
                  <div className="grid grid-cols-2 gap-2">
                    <F label="Family Composition">
                      <select className={IC} style={ICS} value={spif.family_composition} onChange={e => setS('family_composition', e.target.value)}>
                        <option value="complete">Complete (both parents)</option>
                        <option value="separated">Separated / Divorced</option>
                        <option value="single_parent">Single Parent</option>
                        <option value="extended">Extended Family</option>
                        <option value="other">Other</option>
                      </select>
                    </F>
                    <F label="Currently Living With"><input className={IC} style={ICS} value={spif.living_with} onChange={e => setS('living_with', e.target.value)} placeholder="e.g. Parents, Alone, Dorm" /></F>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <F label="Birth Order"><input className={IC} style={ICS} value={spif.birth_order} onChange={e => setS('birth_order', e.target.value)} placeholder="e.g. 1st of 3" /></F>
                    <F label="Number of Siblings"><input type="number" min="0" className={IC} style={ICS} value={spif.number_of_siblings} onChange={e => setS('number_of_siblings', e.target.value)} /></F>
                  </div>
                </SectionCard>

                <SectionCard icon={Heart} title="Physical Health History" headerStyle={violetHeader}>
                  <F label="Existing Medical Conditions">
                    <input className={IC} style={ICS} value={spif.existing_medical_conditions} onChange={e => setS('existing_medical_conditions', e.target.value)} placeholder="None, or briefly describe…" />
                  </F>
                  <F label="Current Medications">
                    <input className={IC} style={ICS} value={spif.current_medications} onChange={e => setS('current_medications', e.target.value)} placeholder="None, or list medications and dosages" />
                  </F>
                </SectionCard>

                <SectionCard icon={Stethoscope} title="Mental Health History" headerStyle={violetHeader}>
                  <div className="space-y-3">
                    <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg transition"
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <input type="checkbox" checked={spif.previous_counseling} onChange={e => setS('previous_counseling', e.target.checked)} className="mt-0.5 w-4 h-4 rounded flex-shrink-0" style={{ accentColor: 'var(--color-primary)' }} />
                      <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Has previously received counseling or therapy</span>
                    </label>
                    {spif.previous_counseling && (
                      <F label="Counseling Details">
                        <input className={IC} style={ICS} value={spif.previous_counseling_details} onChange={e => setS('previous_counseling_details', e.target.value)} placeholder="When, where, and reason for counseling" />
                      </F>
                    )}
                    <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg transition"
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <input type="checkbox" checked={spif.previous_psychiatric} onChange={e => setS('previous_psychiatric', e.target.checked)} className="mt-0.5 w-4 h-4 rounded flex-shrink-0" style={{ accentColor: 'var(--color-primary)' }} />
                      <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Has previously received psychiatric treatment or been diagnosed with a mental health condition</span>
                    </label>
                    {spif.previous_psychiatric && (
                      <F label="Psychiatric Details">
                        <input className={IC} style={ICS} value={spif.previous_psychiatric_details} onChange={e => setS('previous_psychiatric_details', e.target.value)} placeholder="Diagnosis, medications, when" />
                      </F>
                    )}
                    <F label="Family Mental Health History">
                      <input className={IC} style={ICS} value={spif.family_mental_health_history} onChange={e => setS('family_mental_health_history', e.target.value)} placeholder="Any known mental health conditions in the family (optional)" />
                    </F>
                  </div>
                </SectionCard>

                <SectionCard icon={Heart} title="Lifestyle" headerStyle={violetHeader}>
                  <div className="grid grid-cols-3 gap-2">
                    <F label="Avg. Sleep per Night"><input className={IC} style={ICS} value={spif.sleep_hours} onChange={e => setS('sleep_hours', e.target.value)} placeholder="e.g. 5–6 hrs" /></F>
                    <F label="Exercise Frequency">
                      <select className={IC} style={ICS} value={spif.exercise_frequency} onChange={e => setS('exercise_frequency', e.target.value)}>
                        <option value="daily">Daily</option>
                        <option value="3-4x_week">3–4× a week</option>
                        <option value="1-2x_week">1–2× a week</option>
                        <option value="rarely">Rarely</option>
                        <option value="never">Never</option>
                      </select>
                    </F>
                    <F label="Substance Use">
                      <select className={IC} style={ICS} value={spif.substance_use} onChange={e => setS('substance_use', e.target.value)}>
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
                  <Brain size={16} style={{ color: '#EA580C' }} />
                  <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>PHQ-4 Mental Health Quick Screen</h2>
                </div>

                <div className="rounded-xl px-4 py-3 mb-3" style={{ background: '#FFF7ED', border: '1px solid #FDBA74' }}>
                  <p className="text-xs font-bold mb-0.5" style={{ color: '#C2410C' }}>Administration Instructions</p>
                  <p className="text-xs" style={{ color: '#EA580C' }}>Read each item aloud to the student. Ask: <em>"Over the <strong>last 2 weeks</strong>, how often have you been bothered by the following?"</em></p>
                </div>

                {/* PHQ-2 header — keep fixed clinical blue */}
                <div className="flex items-center gap-2 px-1">
                  <div className="flex-1 h-px" style={{ background: '#BFDBFE' }} />
                  <span className="text-[11px] font-bold uppercase tracking-wide px-2" style={{ color: '#2563EB' }}>PHQ-2 — Depression Screener</span>
                  <div className="flex-1 h-px" style={{ background: '#BFDBFE' }} />
                </div>

                {PHQ4_QUESTIONS.slice(0, 2).map((q, i) => (
                  <div key={q.id} className="rounded-xl shadow-sm p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
                    <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold mr-2" style={{ background: '#DBEAFE', color: '#1D4ED8' }}>{i+1}</span>
                      {q.text}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {FREQ.map(opt => {
                        const selected = phq4[i] === opt.v;
                        return (
                          <button key={opt.v} type="button"
                            onClick={() => { const n = [...phq4]; n[i] = opt.v; setPhq4(n); }}
                            className="py-2.5 px-2 rounded-xl text-xs font-semibold text-center transition"
                            style={selected ? opt.sel : { background: 'var(--color-surface)', border: '2px solid var(--color-border)', color: opt.col }}>
                            <span className="block text-base font-bold">{opt.v}</span>
                            {opt.s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* GAD-2 header — keep fixed clinical amber */}
                <div className="flex items-center gap-2 px-1 mt-2">
                  <div className="flex-1 h-px" style={{ background: '#FDE68A' }} />
                  <span className="text-[11px] font-bold uppercase tracking-wide px-2" style={{ color: '#D97706' }}>GAD-2 — Anxiety Screener</span>
                  <div className="flex-1 h-px" style={{ background: '#FDE68A' }} />
                </div>

                {PHQ4_QUESTIONS.slice(2, 4).map((q, i) => (
                  <div key={q.id} className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
                    <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold mr-2" style={{ background: '#FEF3C7', color: '#D97706' }}>{i+3}</span>
                      {q.text}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {FREQ.map(opt => {
                        const selected = phq4[i+2] === opt.v;
                        return (
                          <button key={opt.v} type="button"
                            onClick={() => { const n = [...phq4]; n[i+2] = opt.v; setPhq4(n); }}
                            className="py-2.5 px-2 rounded-xl text-xs font-semibold text-center transition"
                            style={selected ? opt.sel : { background: 'var(--color-surface)', border: '2px solid var(--color-border)', color: opt.col }}>
                            <span className="block text-base font-bold">{opt.v}</span>
                            {opt.s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Live score */}
                {phq4.every(v => v !== null) && (
                  <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
                    <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>Score Summary</p>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      {[
                        { l: 'PHQ-2', s: phq2, max: 6,  risk: phq2 >= 3,      desc: 'Depression' },
                        { l: 'GAD-2', s: gad2, max: 6,  risk: gad2 >= 3,      desc: 'Anxiety'    },
                        { l: 'Total', s: phq2+gad2, max: 12, risk: phq2+gad2 >= 6, desc: 'PHQ-4' },
                      ].map(x => (
                        <div key={x.l} className="rounded-xl py-3 px-2" style={x.risk ? { background: '#FEF2F2', border: '1px solid #FECACA' } : { background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                          <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>{x.desc}</p>
                          <p className="text-2xl font-bold" style={{ color: x.risk ? '#DC2626' : '#1D4ED8' }}>{x.s}<span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>/{x.max}</span></p>
                          <p className="text-xs font-semibold mt-0.5" style={{ color: x.risk ? '#EF4444' : '#16A34A' }}>{x.l}: {x.risk ? '⚠ Elevated' : '✓ Normal'}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>Score ≥ 3 on PHQ-2 or GAD-2 indicates possible depression / anxiety — IC will administer full PHQ-9 and GAD-7.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 3: Assign IC ────────────────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarCheck size={16} style={{ color: 'var(--color-primary)' }} />
                  <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Assign Intake Counselor</h2>
                </div>
                <p className="text-xs rounded-lg px-3 py-2" style={{ color: 'var(--color-success-text)', background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>
                  Select an available IC and time slot for this walk-in student. The appointment will be confirmed immediately.
                </p>

                {loadingSlots && (
                  <div className="flex items-center justify-center py-10 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    <Clock size={16} className="animate-spin" /> Loading IC availability for today…
                  </div>
                )}

                {slotsError && !loadingSlots && (
                  <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)', color: 'var(--color-warning-text)' }}>
                    <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />{slotsError}
                  </div>
                )}

                {!loadingSlots && icSlots.length > 0 && (() => {
                  const byIc: Record<string, typeof icSlots> = {};
                  icSlots.forEach(s => { if (!byIc[s.counselor_id]) byIc[s.counselor_id] = []; byIc[s.counselor_id].push(s); });
                  return (
                    <div className="space-y-3">
                      {Object.entries(byIc).map(([icId, slots]) => (
                        <div key={icId} className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
                          <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--color-primary)' }}>
                              {slots[0].counselor_name.charAt(0)}
                            </div>
                            <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{slots[0].counselor_name}</span>
                            <span className="ml-auto text-xs" style={{ color: 'var(--color-text-muted)' }}>{slots.length} slot{slots.length !== 1 ? 's' : ''} available</span>
                          </div>
                          <div className="p-3 flex flex-wrap gap-2">
                            {slots.map(slot => {
                              const isSelected = selectedSlot?.counselor_id === icId && selectedSlot?.time === slot.time;
                              const [h, m] = slot.time.split(':').map(Number);
                              const ampm = h >= 12 ? 'PM' : 'AM';
                              const h12 = h % 12 || 12;
                              return (
                                <button key={slot.time} onClick={() => setSelectedSlot(slot)}
                                  className="flex flex-col items-center px-3 py-2 rounded-xl text-xs font-semibold transition"
                                  style={isSelected
                                    ? { background: 'var(--color-primary)', border: '2px solid var(--color-primary)', color: '#fff' }
                                    : { background: 'var(--color-surface)', border: '2px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary-muted)'; }}
                                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)'; }}>
                                  <span className="text-base font-bold">{h12}:{String(m).padStart(2,'0')}</span>
                                  <span className="opacity-75">{ampm}</span>
                                  <span className="mt-0.5 text-xs" style={{ opacity: 0.7 }}>{slot.method}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {selectedSlot && (
                  <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary-muted)' }}>
                    <CheckCircle2 size={18} className="flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{selectedSlot.counselor_name}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {(() => { const [h,m]=selectedSlot.time.split(':').map(Number); const ampm=h>=12?'PM':'AM'; return `${h%12||12}:${String(m).padStart(2,'0')} ${ampm}`; })()} · {selectedSlot.method} · Today
                      </p>
                    </div>
                    <button onClick={() => setSelectedSlot(null)} className="ml-auto text-xs transition" style={{ color: 'var(--color-text-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>Change</button>
                  </div>
                )}

                <div className="rounded-xl px-3 py-2.5 text-xs" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary-muted)', color: 'var(--color-primary-text)' }}>
                  <strong>Assign now</strong> to confirm the appointment immediately. If no IC is selected, the intake goes to <strong>Appointment Requests</strong> for the OA to assign later.
                </div>
              </div>
            )}

            {/* Navigation bar */}
            <div className="flex items-center gap-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
              {step > 0 ? (
                <button onClick={back} className="flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-xl transition"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <ChevronLeft size={14} /> Back
                </button>
              ) : (
                <button onClick={() => router.back()} className="flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-xl transition"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  Cancel
                </button>
              )}
              <div className="flex-1 text-center">
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Step {step + 1} of {STEP_LABELS.length}</p>
              </div>
              {step < 3 ? (
                <button onClick={next} className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition"
                  style={{ background: 'var(--color-primary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary)')}>
                  Continue <ChevronRight size={14} />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={loading || phq4.some(v => v === null)}
                  className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition"
                  style={{ background: 'var(--color-primary)' }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
                  onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}>
                  {loading ? 'Submitting…' : <><Check size={14} /> {selectedSlot ? 'Assign & Submit' : 'Submit to Queue'}</>}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
