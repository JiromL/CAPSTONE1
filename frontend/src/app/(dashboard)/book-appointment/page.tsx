'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import Image from 'next/image';
import {
  AlertCircle, CheckCircle, Loader2, Save, Check,
  ChevronRight, ChevronLeft, User, Brain, ClipboardCheck,
  BookOpen, Phone, Clock, CalendarCheck, UserCheck, ClipboardList,
  MapPin, Video, PenLine,
} from 'lucide-react';
import { SignaturePad } from '@/components/SignaturePad';

// ── Constants ──────────────────────────────────────────────────────────────────
const PURPOSES = [
  { value: 'intake_interview',      label: 'Intake Interview', desc: 'First-time visit — includes intake forms' },
  { value: 'counseling',            label: 'Counseling',       desc: 'Continuing counseling session' },
  { value: 'follow_up_counselling', label: 'Follow-up',        desc: 'Follow-up counseling session' },
  { value: 'others',                label: 'Others',           desc: 'Other type of session' },
];

const PHQ4Q = [
  { text: 'Little interest or pleasure in doing things' },
  { text: 'Feeling down, depressed, or hopeless' },
  { text: 'Feeling nervous, anxious, or on edge' },
  { text: 'Not being able to stop or control worrying' },
];

const FREQ = [
  { v: 0, s: 'Not at all',              col: 'text-gray-600',  sel: 'bg-gray-600 text-white border-gray-600' },
  { v: 1, s: 'Several days',            col: 'text-blue-600',  sel: 'bg-blue-500 text-white border-blue-500' },
  { v: 2, s: 'More than half the days', col: 'text-amber-600', sel: 'bg-amber-500 text-white border-amber-500' },
  { v: 3, s: 'Nearly every day',        col: 'text-red-600',   sel: 'bg-red-500 text-white border-red-500' },
];

const INTAKE_STEPS = [
  { label: 'Contact Form',  desc: 'Basic info & emergency contact' },
  { label: 'Personal Info', desc: 'Background & health history' },
  { label: 'Mental Screen', desc: 'PHQ-4 wellbeing screener' },
  { label: 'Signature',     desc: 'Sign to confirm your submission' },
];

const BOOK_STEPS = [
  { label: 'Session Type', desc: 'Purpose & session mode' },
  { label: 'Date & Time',  desc: 'Pick a date and time slot' },
  { label: 'Details',      desc: 'Concern & referral info' },
];

const DRAFT_KEY = 'bookAppointmentDraft_v2';
const IC = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#2563eb]/25 focus:border-[#2563eb] focus:outline-none transition';

// ── Helpers ────────────────────────────────────────────────────────────────────
function buildSlots(start: string, end: string, mins: number): string[] {
  const slots: string[] = [];
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let cur = sh * 60 + sm;
  const endM = eh * 60 + em;
  while (cur <= endM) {
    const h = Math.floor(cur / 60), m = cur % 60;
    slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
    cur += mins;
  }
  return slots;
}
function fmtT(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ap}`;
}

function F({ label, req, children, span }: { label: string; req?: boolean; children: React.ReactNode; span?: boolean }) {
  return (
    <div className={span ? 'col-span-full' : ''}>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}{req && <span className="text-red-400 ml-1">*</span>}</label>
      {children}
    </div>
  );
}

function VerticalStepTracker({ steps, current }: { steps: { label: string; desc?: string }[]; current: number }) {
  return (
    <div>
      {steps.map((step, i) => {
        const done = i < current, active = i === current;
        return (
          <div key={i} className="flex items-start gap-3">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all
                ${done   ? 'bg-[#2563eb] border-[#2563eb] text-white'  :
                  active ? 'border-[#2563eb] bg-white text-[#2563eb]'  :
                           'border-gray-200 bg-white text-gray-400'}`}>
                {done ? <Check size={12} /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className="border-l-2 border-dashed border-gray-200 my-1" style={{ width: 1, minHeight: 28 }} />
              )}
            </div>
            <div className="pb-5 min-w-0">
              <p className={`text-xs font-semibold leading-tight
                ${active ? 'text-[#2563eb]' : done ? 'text-gray-700' : 'text-gray-400'}`}>
                {step.label}
              </p>
              {step.desc && (active || done) && (
                <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{step.desc}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function BookAppointmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeId = searchParams.get('resumeId');
  const [user, setUser]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [hasDraft, setHasDraft] = useState(false);

  const [consentGiven, setConsentGiven]   = useState<boolean | null>(null);
  const [showConsent, setShowConsent]     = useState(false);
  const [consentChecks, setConsentChecks] = useState({ counseling: false, privacy: false });
  const [savingConsent, setSavingConsent] = useState(false);
  const [consentError, setConsentError]   = useState<string | null>(null);

  const [activeAppt, setActiveAppt] = useState<any>(null);
  const [bookingGate, setBookingGate] = useState<string | null>(null);
  const [gateMessage, setGateMessage] = useState('');

  const [bookingRules, setBookingRules] = useState({
    operating_days: [1,2,3,4,5], operating_hours_start: '09:00', operating_hours_end: '16:00',
    slot_duration_minutes: 30, min_days_ahead: 1, max_days_ahead: 30, blackout_dates: [] as string[],
  });

  // Booking form
  const [purpose, setPurpose]             = useState('intake_interview');
  const [specifyOthers, setSpecifyOthers] = useState('');
  const [concern, setConcern]             = useState('');
  const [slotMethod, setSlotMethod]       = useState('F2F');
  const [prefPlatform, setPrefPlatform]   = useState<'google-meet' | 'zoom'>('google-meet');
  const [referralType, setReferralType]   = useState('self-referred');
  const [referredBy, setReferredBy]       = useState('');
  const [prefDate, setPrefDate]           = useState('');
  const [prefTime, setPrefTime]           = useState('');
  const [slotCounselorId, setSlotCounselorId] = useState('');
  const [slots, setSlots]                 = useState<{ time: string; method: string; counselor_id: string; counselor_name: string }[]>([]);
  const [slotsLoading, setSlotsLoading]   = useState(false);
  const [noSlotsNextDate, setNoSlotsNextDate] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [requestAnyway, setRequestAnyway] = useState(false);

  // Assigned counselor (for counseling / follow-up)
  const [assignedCounselor, setAssignedCounselor] = useState<{ id: string; name: string; role: string } | null | undefined>(undefined);
  const [counselorList, setCounselorList]   = useState<any[] | null>(null);
  const [selectedCounselorId, setSelectedCounselorId] = useState('');

  // EMA label (for PHQ-4 skip logic)
  const [emaLabel, setEmaLabel] = useState<string | null>(null);

  // Intake packet
  const [showIntake, setShowIntake]             = useState(false);
  const [intakeStep, setIntakeStep]             = useState(0);
  const [signature, setSignature]               = useState<string | null>(null);
  const [intakeError, setIntakeError]           = useState('');
  const [intakeSubmitting, setIntakeSubmitting] = useState(false);
  const [appointmentId, setAppointmentId]       = useState('');
  const [formSkipped, setFormSkipped]           = useState(false);
  const [showConfirm, setShowConfirm]           = useState(false);
  const [showFormsChoice, setShowFormsChoice]   = useState(false);

  // Booking step wizard (for main form)
  const [bookStep, setBookStep] = useState(0);

  const [icf, setIcf] = useState({
    first_name:'', last_name:'', middle_name:'', email:'', student_id:'', phone:'',
    college:'', program:'', year_level:'', referral_source:'self-referred', referred_by:'',
    emergency_contact_name:'', emergency_contact_relationship:'', emergency_contact_phone:'',
    presenting_concern:'', service_requested:'personal_counseling',
    consent_to_service: true, consent_to_data: true,
  });
  const [spif, setSpif] = useState({
    birthdate:'', gender:'', civil_status:'single', religion:'', nationality:'Filipino', address:'',
    family_composition:'complete', living_with:'', birth_order:'', number_of_siblings:'',
    existing_medical_conditions:'', current_medications:'',
    previous_counseling: false, previous_counseling_details:'',
    previous_psychiatric: false, previous_psychiatric_details:'',
    family_mental_health_history:'', sleep_hours:'', exercise_frequency:'rarely', substance_use:'none',
  });
  const [phq4, setPhq4] = useState<(number|null)[]>([null,null,null,null]);

  useEffect(() => {
    const init = async () => {
      const raw = localStorage.getItem('user'); const token = localStorage.getItem('token');
      if (!raw || !token) { router.push('/login'); return; }
      const u = JSON.parse(raw); setUser(u);
      try { const r = await fetch(api('/api/staff/settings/booking-rules'), { headers: { Authorization: `Bearer ${token}` } }); if (r.ok) setBookingRules(await r.json()); } catch {}
      try {
        const r = await fetch(api('/api/consent/status'), { headers: { Authorization: `Bearer ${token}` } });
        if (r.status === 401) { router.replace('/login'); return; }
        if (r.ok) { const d = await r.json(); setConsentGiven(d.consent_given); if (!d.consent_given) setShowConsent(true); }
        else { setConsentGiven(false); setShowConsent(true); }
      } catch {}
      try {
        const r = await fetch(api('/api/appointments/active'), { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) { const d = await r.json(); setBookingGate(d.booking_gate ?? (d.can_self_book ? 'eligible' : 'no_case')); setGateMessage(d.message ?? ''); if (d.has_active_appointment) setActiveAppt(d); }
      } catch {}
      try {
        const r = await fetch(api('/api/mhbot/my-perma'), { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) { const d = await r.json(); if (d.mhbot_username) setEmaLabel(d.latest_label ?? null); }
      } catch {}
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        setHasDraft(true);
        try { const d = JSON.parse(draft); if (d.purpose) setPurpose(d.purpose); if (d.concern) setConcern(d.concern); if (d.referralType) setReferralType(d.referralType); if (d.referredBy) setReferredBy(d.referredBy); if (d.prefDate) setPrefDate(d.prefDate); if (d.prefTime) setPrefTime(d.prefTime); } catch {}
      }
      if (resumeId) {
        setAppointmentId(resumeId);
        setTicketNumber(resumeId.slice(-8).toUpperCase());
        try {
          const saved = localStorage.getItem(`cps_forms_${resumeId}`);
          if (saved) {
            const { icf: sIcf, spif: sSpif, phq4: sPhq4, step: sStep } = JSON.parse(saved);
            if (sIcf)  setIcf(prev => ({ ...prev, ...sIcf }));
            if (sSpif) setSpif(sSpif);
            if (sPhq4) setPhq4(sPhq4);
            if (typeof sStep === 'number') setIntakeStep(sStep);
          } else if (u) {
            setIcf(prev => ({
              ...prev,
              first_name: u.first_name || '',
              last_name:  u.last_name  || '',
              email:      u.email      || '',
              student_id: u.student_number || u.student_id || '',
              college:    u.college    || '',
              program:    u.program    || '',
            }));
          }
        } catch {
          if (u) setIcf(prev => ({ ...prev, first_name: u.first_name||'', last_name: u.last_name||'', email: u.email||'' }));
        }
        setShowIntake(true);
      }
      setLoading(false);
    };
    init();
  }, [router, resumeId]);

  useEffect(() => {
    setPrefTime(''); setSlotCounselorId(''); setSlotMethod('F2F');
    setSlots([]); setNoSlotsNextDate(null);
    setAssignedCounselor(undefined); setCounselorList(null); setSelectedCounselorId('');

    if (purpose === 'others') { setRequestAnyway(true); return; }
    setRequestAnyway(false);
    if (purpose === 'intake_interview') return;

    const token = localStorage.getItem('token');
    fetch(api('/api/appointments/my-counselor'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.counselor_id) {
          setAssignedCounselor({ id: d.counselor_id, name: d.counselor_name, role: d.role });
          setSelectedCounselorId(d.counselor_id);
        } else {
          setAssignedCounselor(null);
          fetch(api('/api/appointments/available-counselors'), { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d2 => setCounselorList(d2.users ?? []))
            .catch(() => setCounselorList([]));
        }
      })
      .catch(() => setAssignedCounselor(null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purpose]);

  useEffect(() => {
    if (!prefDate || purpose === 'others') { setSlots([]); setNoSlotsNextDate(null); return; }
    const token = localStorage.getItem('token');
    setSlotsLoading(true);
    setPrefTime(''); setSlotCounselorId(''); setSlotMethod('F2F');

    if (purpose === 'intake_interview') {
      fetch(api(`/api/availability/open-slots?date=${prefDate}`), { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { setSlots(d.slots || []); setNoSlotsNextDate(d.next_available_date || null); })
        .catch(() => setSlots([]))
        .finally(() => setSlotsLoading(false));
    } else if (selectedCounselorId) {
      fetch(api(`/api/availability/free-slots?counselor_id=${selectedCounselorId}&date=${prefDate}`), { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          const method = d.session_method || 'in-person';
          const name = assignedCounselor ? assignedCounselor.name : '';
          setSlots((d.slots || []).map((t: string) => ({ time: t, method, counselor_id: selectedCounselorId, counselor_name: name })));
          setNoSlotsNextDate(null);
        })
        .catch(() => setSlots([]))
        .finally(() => setSlotsLoading(false));
    } else {
      setSlots([]); setSlotsLoading(false);
    }
  }, [prefDate, selectedCounselorId, purpose]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConsent = async () => {
    if (!consentChecks.counseling || !consentChecks.privacy) return;
    const token = localStorage.getItem('token'); setSavingConsent(true); setConsentError(null);
    try {
      const r = await fetch(api('/api/consent/submit'), { method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify({ consent_types:['counseling_services','data_privacy'] }) });
      if (r.ok) { setConsentGiven(true); setShowConsent(false); } else setConsentError('Failed to record consent.');
    } catch { setConsentError('Error recording consent.'); } finally { setSavingConsent(false); }
  };

  const saveDraft = () => { setSavingDraft(true); localStorage.setItem(DRAFT_KEY, JSON.stringify({ purpose, specifyOthers, concern, referralType, referredBy, prefDate, prefTime })); setHasDraft(true); setTimeout(() => setSavingDraft(false), 600); };
  const clearDraft = () => { localStorage.removeItem(DRAFT_KEY); setHasDraft(false); };

  const timeSlots = buildSlots(bookingRules.operating_hours_start, bookingRules.operating_hours_end, bookingRules.slot_duration_minutes);
  const today = new Date();
  const minDate = new Date(today); minDate.setDate(today.getDate() + bookingRules.min_days_ahead);
  const maxDate = new Date(today); maxDate.setDate(today.getDate() + bookingRules.max_days_ahead);
  const toDS = (d: Date) => d.toISOString().split('T')[0];

  const handleNextBookStep = () => {
    setError(null);
    if (bookStep === 0) {
      if (!purpose) { setError('Please select a session type.'); return; }
      if (purpose !== 'others' && !slotMethod) { setError('Please select a session mode.'); return; }
      if (['counseling','follow_up_counselling'].includes(purpose) && assignedCounselor === null && !selectedCounselorId) {
        setError('Please select a counselor.'); return;
      }
      if (purpose === 'others') { setBookStep(2); return; }
      setBookStep(1);
    } else if (bookStep === 1) {
      if (!prefDate && !requestAnyway) { setError('Please select a date.'); return; }
      if (!prefTime && !requestAnyway) { setError('Please select a time slot, or click "Request Anyway".'); return; }
      setBookStep(2);
    }
  };

  const handleSubmit = () => {
    setError(null);
    const fp = purpose === 'others' ? specifyOthers.trim() : purpose;
    if (!fp) { setError('Please select a purpose.'); return; }
    if (purpose !== 'others') {
      if (!prefDate && !requestAnyway) { setError('Please select a date.'); return; }
      if (!requestAnyway && !prefTime) { setError('Please select an available time slot.'); return; }
      if (['counseling','follow_up_counselling'].includes(purpose) && !selectedCounselorId && !requestAnyway) {
        setError('Please select a counselor.'); return;
      }
    }
    if (referralType === 'referred' && !referredBy.trim()) { setError('Please specify who referred you.'); return; }
    if (prefDate && bookingRules.blackout_dates.includes(prefDate)) { setError('Selected date is a CPS holiday.'); return; }
    setShowConfirm(true);
  };

  const handleConfirmedBook = async () => {
    setShowConfirm(false); setSubmitting(true); setError(null);
    try {
      const token = localStorage.getItem('token');
      const fp = purpose === 'others' ? specifyOthers.trim() : purpose;
      const body: Record<string, any> = {
        purpose: fp, concern, preferred_method: slotMethod,
        preferred_platform: slotMethod?.toLowerCase() === 'online' ? prefPlatform : null,
        referral_type: referralType, referred_by: referralType === 'referred' ? referredBy : null,
        agreed_to_terms: true,
      };
      if (!requestAnyway && prefDate && prefTime) {
        body.preferred_date = prefDate;
        body.preferred_time = prefTime;
        if (slotCounselorId) body.counselor_id = slotCounselorId;
      }
      if (requestAnyway && selectedCounselorId && purpose !== 'intake_interview') {
        body.counselor_id = selectedCounselorId;
      }
      const r = await fetch(api('/api/appointments/request'), { method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify(body) });
      if (r.status === 401) { router.replace('/login'); return; }
      const d = await r.json();
      if (r.ok) {
        clearDraft();
        const apptId = d.counseling_id || d.appointment_id || '';
        setTicketNumber(apptId); setAppointmentId(apptId);
        if (purpose === 'intake_interview') {
          setIcf(p => ({ ...p, first_name: user?.first_name||'', last_name: user?.last_name||'', email: user?.email||'', student_id: user?.student_id||user?.id_number||'', phone: user?.phone||'', college: user?.college||'', program: user?.program||'', presenting_concern: concern, referral_source: referralType==='referred'?'referred':'self-referred', referred_by: referredBy }));
          setIntakeStep(0); setIntakeError('');
          setShowFormsChoice(true);
        } else { setSuccess(true); }
      } else setError(d.error || 'Failed to submit.');
    } catch { setError('Network error.'); } finally { setSubmitting(false); }
  };

  const saveFormsProgress = () => {
    try { localStorage.setItem(`cps_forms_${appointmentId}`, JSON.stringify({ icf, spif, phq4, step: intakeStep })); } catch {}
    setFormSkipped(true); setShowIntake(false); setSuccess(true);
  };

  const validateIntakeStep = () => {
    if (intakeStep === 0) {
      if (!icf.first_name.trim() || !icf.last_name.trim()) { setIntakeError('First and last name are required.'); return false; }
      if (!icf.email.trim())              { setIntakeError('Email is required.'); return false; }
      if (!icf.presenting_concern.trim()) { setIntakeError('Please describe your presenting concern.'); return false; }
    }
    if (intakeStep === 2 && phq4.some(v => v === null)) { setIntakeError('Please answer all 4 questions.'); return false; }
    if (intakeStep === 3 && !signature) { setIntakeError('Please draw your signature before submitting.'); return false; }
    setIntakeError(''); return true;
  };

  const handleIntakeSubmit = async (skipPhq4 = false) => {
    if (!skipPhq4 && !validateIntakeStep()) return;
    setIntakeSubmitting(true); setIntakeError('');
    try {
      const token = localStorage.getItem('token');
      const phq4Payload = skipPhq4 ? null : phq4;
      const r = await fetch(api('/api/intake/packet'), { method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify({ source:'online', submitted_by_role:'student', appointment_id:appointmentId, icf, spif, phq4_responses:phq4Payload, phq4_skipped: skipPhq4, signature }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to submit forms');
      setShowIntake(false); setSuccess(true);
    } catch (err) { setIntakeError(err instanceof Error ? err.message : 'An error occurred'); } finally { setIntakeSubmitting(false); }
  };

  if (loading) return (
    <DashboardPageWrapper title="Book Appointment" subtitle="">
      <div className="flex items-center justify-center h-48"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
    </DashboardPageWrapper>
  );

  // ── Gate ──────────────────────────────────────────────────────────────────────
  const GATES: Record<string, any> = {
    has_active_appointment: { icon:'📋', title:'You already have an active appointment', color:'bg-yellow-50 border-yellow-300 text-yellow-800', cta:{ label:'View Appointments', href:'/my-appointments' } },
    no_case:                { icon:'🏥', title:'Walk-in intake required for first-time clients', color:'bg-blue-50 border-blue-300 text-blue-800' },
    awaiting_intake:        { icon:'⏳', title:'Your intake appointment is pending', color:'bg-amber-50 border-amber-300 text-amber-800', cta:{ label:'View Appointments', href:'/my-appointments' } },
    pending_termination:    { icon:'⚠️', title:'Your case is pending closure', color:'bg-orange-50 border-orange-300 text-orange-800' },
    case_closed:            { icon:'📁', title:'Your previous case is closed', color:'bg-gray-50 border-gray-300 text-gray-700' },
  };
  if (bookingGate && bookingGate !== 'eligible' && !resumeId) {
    const cfg = GATES[bookingGate] ?? { icon:'🔒', title:'Booking unavailable', color:'bg-gray-50 border-gray-300 text-gray-700' };
    return (
      <DashboardPageWrapper title="Book Appointment" subtitle="">
        <div className={`max-w-lg mx-auto mt-8 border rounded-2xl p-8 text-center ${cfg.color}`}>
          <div className="text-5xl mb-4">{cfg.icon}</div>
          <h2 className="text-base font-bold mb-2">{cfg.title}</h2>
          <p className="text-sm opacity-80 mb-6">{gateMessage}</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {cfg.cta && <button onClick={() => router.push(cfg.cta.href)} className="px-5 py-2.5 bg-[#2563eb] text-white text-sm font-medium rounded-xl transition">{cfg.cta.label}</button>}
            <button onClick={() => router.push('/dashboard')} className="px-5 py-2.5 border border-current text-sm font-medium rounded-xl hover:opacity-70 transition">Dashboard</button>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  // ── Shared sidebar for intake / booking ────────────────────────────────────────
  const initials = ((user?.first_name?.charAt(0)||'') + (user?.last_name?.charAt(0)||'')).toUpperCase() || 'U';

  // ── Intake packet ─────────────────────────────────────────────────────────────
  if (showIntake) {
    return (
      <DashboardPageWrapper title="Book Appointment" subtitle="Complete your intake forms">
        <div className="flex gap-5 items-start">

          {/* Left sidebar */}
          <div className="w-52 flex-shrink-0 hidden lg:flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-[#2563eb] flex items-center justify-center flex-shrink-0">
                  <Image src="/dlsu-seal.svg" alt="DLSU" width={22} height={22} className="brightness-[10]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Intake Forms</p>
                  <p className="text-[10px] text-gray-400">CPS · DLSU</p>
                </div>
              </div>

              {/* User info */}
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-full bg-[#2563eb] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{user?.first_name} {user?.last_name}</p>
                  <p className="text-[10px] text-gray-400 truncate">Student</p>
                </div>
              </div>

              {/* Booked badge */}
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-5">
                <CheckCircle size={13} className="text-green-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-green-800">Slot Reserved</p>
                  <p className="text-[10px] text-green-600 truncate">Ticket #{ticketNumber}</p>
                </div>
              </div>

              <VerticalStepTracker steps={INTAKE_STEPS} current={intakeStep} />
            </div>
          </div>

          {/* Center: form content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Mobile step progress */}
            <div className="lg:hidden flex items-center gap-1 mb-2">
              {INTAKE_STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                    i < intakeStep ? 'bg-[#2563eb] border-[#2563eb] text-white' :
                    i === intakeStep ? 'border-[#2563eb] text-[#2563eb]' : 'border-gray-200 text-gray-400'
                  }`}>
                    {i < intakeStep ? <Check size={10} /> : i + 1}
                  </div>
                  {i < INTAKE_STEPS.length - 1 && (
                    <div className={`h-px w-8 ${i < intakeStep ? 'bg-[#2563eb]' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
              <span className="ml-2 text-xs text-gray-500 font-medium">{INTAKE_STEPS[intakeStep]?.label}</span>
            </div>

            {/* Booked banner (mobile visible too) */}
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
              <CheckCircle size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-green-800">Appointment Booked — Ticket #{ticketNumber}</p>
                <p className="text-xs text-green-700 mt-0.5">Please complete the intake forms below. Your IC will review these before your session.</p>
              </div>
            </div>

            {intakeError && (
              <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />{intakeError}
              </div>
            )}

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              {/* Step header */}
              <div className={`px-5 py-4 border-b border-gray-100 flex items-center gap-3
                ${intakeStep===0 ? 'bg-sky-50' : intakeStep===1 ? 'bg-violet-50' : intakeStep===2 ? 'bg-orange-50' : 'bg-blue-50'}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                  ${intakeStep===0 ? 'bg-sky-100' : intakeStep===1 ? 'bg-violet-100' : intakeStep===2 ? 'bg-orange-100' : 'bg-blue-100'}`}>
                  {intakeStep===0 && <ClipboardCheck size={16} className="text-sky-600" />}
                  {intakeStep===1 && <BookOpen size={16} className="text-violet-600" />}
                  {intakeStep===2 && <Brain size={16} className="text-orange-600" />}
                  {intakeStep===3 && <PenLine size={16} className="text-[#2563eb]" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {intakeStep===0 ? 'Contact Form' : intakeStep===1 ? 'Personal Background' : intakeStep===2 ? 'Mental Health Screener' : 'Signature'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {intakeStep===0 ? 'Basic information, emergency contact, and presenting concern' :
                     intakeStep===1 ? 'Personal, family, and health background — helps your counselor prepare' :
                     intakeStep===2 ? 'Short 4-question mental health screening — over the last 2 weeks' :
                                     'Sign to confirm that all information provided is true and accurate'}
                  </p>
                </div>
                <span className="ml-auto text-xs text-gray-400 font-medium flex-shrink-0">Step {intakeStep+1} / 4</span>
              </div>

              <div className="p-5 space-y-4">
                {/* ICF */}
                {intakeStep === 0 && (
                  <div className="space-y-4">
                    <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-bold text-sky-700 flex items-center gap-1"><User size={11} /> Student Information</p>
                      <div className="grid grid-cols-3 gap-2">
                        <F label="First Name" req><input className={IC} value={icf.first_name} onChange={e => setIcf(p=>({...p,first_name:e.target.value}))} placeholder="Juan" /></F>
                        <F label="Middle Name"><input className={IC} value={icf.middle_name} onChange={e => setIcf(p=>({...p,middle_name:e.target.value}))} placeholder="Optional" /></F>
                        <F label="Last Name" req><input className={IC} value={icf.last_name} onChange={e => setIcf(p=>({...p,last_name:e.target.value}))} placeholder="dela Cruz" /></F>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <F label="Email" req><input type="email" className={IC} value={icf.email} onChange={e => setIcf(p=>({...p,email:e.target.value}))} /></F>
                        <F label="Student ID"><input className={IC} value={icf.student_id} onChange={e => setIcf(p=>({...p,student_id:e.target.value}))} /></F>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <F label="Phone"><input className={IC} value={icf.phone} onChange={e => setIcf(p=>({...p,phone:e.target.value}))} /></F>
                        <F label="College"><input className={IC} value={icf.college} onChange={e => setIcf(p=>({...p,college:e.target.value}))} placeholder="e.g. CLA" /></F>
                        <F label="Program"><input className={IC} value={icf.program} onChange={e => setIcf(p=>({...p,program:e.target.value}))} placeholder="e.g. AB Psych" /></F>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <F label="Year Level">
                          <select className={IC} value={icf.year_level} onChange={e => setIcf(p=>({...p,year_level:e.target.value}))}>
                            <option value="">— Select —</option>
                            {['1st Year','2nd Year','3rd Year','4th Year','5th Year','Graduate'].map(y=><option key={y} value={y}>{y}</option>)}
                          </select>
                        </F>
                        <F label="Service Requested">
                          <select className={IC} value={icf.service_requested} onChange={e => setIcf(p=>({...p,service_requested:e.target.value}))}>
                            <option value="personal_counseling">Personal Counseling</option>
                            <option value="academic_counseling">Academic Counseling</option>
                            <option value="career_counseling">Career Counseling</option>
                            <option value="crisis_support">Crisis Support</option>
                          </select>
                        </F>
                      </div>
                    </div>

                    <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-bold text-sky-700 flex items-center gap-1"><Phone size={11} /> Emergency Contact</p>
                      <div className="grid grid-cols-3 gap-2">
                        <F label="Full Name"><input className={IC} value={icf.emergency_contact_name} onChange={e => setIcf(p=>({...p,emergency_contact_name:e.target.value}))} placeholder="Name" /></F>
                        <F label="Relationship"><input className={IC} value={icf.emergency_contact_relationship} onChange={e => setIcf(p=>({...p,emergency_contact_relationship:e.target.value}))} placeholder="e.g. Parent" /></F>
                        <F label="Phone"><input className={IC} value={icf.emergency_contact_phone} onChange={e => setIcf(p=>({...p,emergency_contact_phone:e.target.value}))} placeholder="+63 9XX XXX XXXX" /></F>
                      </div>
                    </div>

                    <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-bold text-sky-700 flex items-center gap-1"><ClipboardCheck size={11} /> Presenting Concern</p>
                      <F label="" req>
                        <textarea className={IC} rows={3} value={icf.presenting_concern} onChange={e => setIcf(p=>({...p,presenting_concern:e.target.value}))} placeholder="What brings you to CPS? Briefly describe your main concern…" />
                      </F>
                    </div>
                  </div>
                )}

                {/* SPIF */}
                {intakeStep === 1 && (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">This background information is confidential and helps your counselor better understand your situation.</p>
                    <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-bold text-violet-700">Personal Information</p>
                      <div className="grid grid-cols-3 gap-2">
                        <F label="Date of Birth"><input type="date" className={IC} value={spif.birthdate} onChange={e => setSpif(p=>({...p,birthdate:e.target.value}))} /></F>
                        <F label="Gender">
                          <select className={IC} value={spif.gender} onChange={e => setSpif(p=>({...p,gender:e.target.value}))}>
                            <option value="">— Select —</option>
                            {['male','female','non-binary','prefer_not_to_say','other'].map(v=><option key={v} value={v}>{v.replace('_',' ')}</option>)}
                          </select>
                        </F>
                        <F label="Civil Status">
                          <select className={IC} value={spif.civil_status} onChange={e => setSpif(p=>({...p,civil_status:e.target.value}))}>
                            <option value="single">Single</option>
                            <option value="in_relationship">In a relationship</option>
                            <option value="married">Married</option>
                            <option value="separated">Separated</option>
                          </select>
                        </F>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <F label="Religion"><input className={IC} value={spif.religion} onChange={e => setSpif(p=>({...p,religion:e.target.value}))} placeholder="e.g. Roman Catholic" /></F>
                        <F label="Nationality"><input className={IC} value={spif.nationality} onChange={e => setSpif(p=>({...p,nationality:e.target.value}))} /></F>
                      </div>
                      <F label="Home Address"><input className={IC} value={spif.address} onChange={e => setSpif(p=>({...p,address:e.target.value}))} placeholder="City, Province" /></F>
                    </div>
                    <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-bold text-violet-700">Family</p>
                      <div className="grid grid-cols-2 gap-2">
                        <F label="Family Composition">
                          <select className={IC} value={spif.family_composition} onChange={e => setSpif(p=>({...p,family_composition:e.target.value}))}>
                            <option value="complete">Complete (both parents)</option>
                            <option value="separated">Separated / Divorced</option>
                            <option value="single_parent">Single Parent</option>
                            <option value="extended">Extended Family</option>
                            <option value="other">Other</option>
                          </select>
                        </F>
                        <F label="Currently Living With"><input className={IC} value={spif.living_with} onChange={e => setSpif(p=>({...p,living_with:e.target.value}))} placeholder="e.g. Parents, Dormitory" /></F>
                      </div>
                    </div>
                    <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-bold text-violet-700">Health &amp; Mental Health History</p>
                      <F label="Existing Medical Conditions"><input className={IC} value={spif.existing_medical_conditions} onChange={e => setSpif(p=>({...p,existing_medical_conditions:e.target.value}))} placeholder="None, or briefly describe" /></F>
                      <F label="Current Medications"><input className={IC} value={spif.current_medications} onChange={e => setSpif(p=>({...p,current_medications:e.target.value}))} placeholder="None, or list medications" /></F>
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input type="checkbox" checked={spif.previous_counseling} onChange={e => setSpif(p=>({...p,previous_counseling:e.target.checked}))} className="mt-0.5 w-4 h-4 accent-[#2563eb]" />
                        <span className="text-sm text-gray-700">I have previously received counseling or therapy</span>
                      </label>
                      {spif.previous_counseling && <F label="Brief details"><input className={IC} value={spif.previous_counseling_details} onChange={e => setSpif(p=>({...p,previous_counseling_details:e.target.value}))} placeholder="When, where, for what reason" /></F>}
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input type="checkbox" checked={spif.previous_psychiatric} onChange={e => setSpif(p=>({...p,previous_psychiatric:e.target.checked}))} className="mt-0.5 w-4 h-4 accent-[#2563eb]" />
                        <span className="text-sm text-gray-700">I have previously received psychiatric treatment or been given a diagnosis</span>
                      </label>
                      {spif.previous_psychiatric && <F label="Brief details"><input className={IC} value={spif.previous_psychiatric_details} onChange={e => setSpif(p=>({...p,previous_psychiatric_details:e.target.value}))} placeholder="Diagnosis, medications if any, when" /></F>}
                    </div>
                  </div>
                )}

                {/* PHQ-4 */}
                {intakeStep === 2 && (
                  <div className="space-y-3">
                    {(emaLabel === 'Struggling' || emaLabel === 'In Crisis') && (
                      <div className={`rounded-xl px-4 py-3 border flex items-start gap-3 ${emaLabel === 'In Crisis' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
                        <AlertCircle size={15} className={`flex-shrink-0 mt-0.5 ${emaLabel === 'In Crisis' ? 'text-red-500' : 'text-orange-500'}`} />
                        <div className="flex-1">
                          <p className={`text-xs font-bold ${emaLabel === 'In Crisis' ? 'text-red-800' : 'text-orange-800'}`}>
                            Your EMA data shows you are currently {emaLabel}
                          </p>
                          <p className={`text-xs mt-0.5 ${emaLabel === 'In Crisis' ? 'text-red-700' : 'text-orange-700'}`}>
                            Your IC will already be briefed. You can complete the screener below, or skip it.
                          </p>
                        </div>
                        <button onClick={() => { setIntakeError(''); setIntakeStep(3); }}
                          className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${emaLabel === 'In Crisis' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}>
                          Skip PHQ-4
                        </button>
                      </div>
                    )}
                    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                      <p className="text-xs font-bold text-orange-800">Over the last 2 weeks, how often have you been bothered by the following?</p>
                      <p className="text-xs text-orange-600 mt-0.5">This helps your counselor assess your current wellbeing.</p>
                    </div>
                    <div className="h-px bg-gray-100" />
                    {PHQ4Q.slice(0,2).map((q,i) => (
                      <div key={i} className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
                        <p className="text-sm font-semibold text-gray-800 mb-3">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold mr-2">{i+1}</span>
                          {q.text}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {FREQ.map(opt => (
                            <button key={opt.v} onClick={() => { const n=[...phq4]; n[i]=opt.v; setPhq4(n); }}
                              className={`py-2.5 px-2 rounded-xl text-xs font-semibold border-2 transition text-center
                                ${phq4[i]===opt.v ? opt.sel : `border-gray-200 bg-white ${opt.col} hover:border-gray-300`}`}>
                              <span className="block text-base font-bold">{opt.v}</span>{opt.s}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="h-px bg-gray-100 mt-2" />
                    {PHQ4Q.slice(2,4).map((q,i) => (
                      <div key={i} className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
                        <p className="text-sm font-semibold text-gray-800 mb-3">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold mr-2">{i+3}</span>
                          {q.text}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {FREQ.map(opt => (
                            <button key={opt.v} onClick={() => { const n=[...phq4]; n[i+2]=opt.v; setPhq4(n); }}
                              className={`py-2.5 px-2 rounded-xl text-xs font-semibold border-2 transition text-center
                                ${phq4[i+2]===opt.v ? opt.sel : `border-gray-200 bg-white ${opt.col} hover:border-gray-300`}`}>
                              <span className="block text-base font-bold">{opt.v}</span>{opt.s}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Signature */}
                {intakeStep === 3 && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 space-y-2">
                      <p className="text-xs font-bold text-blue-800">Informed Consent &amp; Electronic Signature</p>
                      <p className="text-xs text-blue-700 leading-relaxed">
                        By signing below, I voluntarily confirm and agree to the following:
                      </p>
                      <ul className="text-xs text-blue-700 space-y-1 list-none">
                        <li className="flex gap-2"><span className="text-blue-400 flex-shrink-0">1.</span><span>All information I have provided in this intake packet (including personal, health, and mental health records) is <strong>true and accurate</strong> to the best of my knowledge.</span></li>
                        <li className="flex gap-2"><span className="text-blue-400 flex-shrink-0">2.</span><span>I <strong>consent to the collection and processing</strong> of my sensitive personal information, including health and mental health records, by the DLSU Counseling and Psychological Services, in accordance with <strong>RA 10173 (Data Privacy Act of 2012)</strong>.</span></li>
                        <li className="flex gap-2"><span className="text-blue-400 flex-shrink-0">3.</span><span>I <strong>consent to receive counseling services</strong> and understand that session records may be kept for continuity of care.</span></li>
                      </ul>
                    </div>
                    <SignaturePad value={signature} onChange={setSignature} />
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="px-5 py-4 border-t border-gray-100 flex gap-3 bg-gray-50/50 flex-wrap">
                {intakeStep > 0 && (
                  <button onClick={() => { setIntakeError(''); setIntakeStep(s=>s-1); }}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
                    <ChevronLeft size={14} /> Back
                  </button>
                )}
                <button onClick={saveFormsProgress}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition">
                  <Save size={13} /> Save &amp; Exit
                </button>
                <div className="flex-1" />
                {intakeStep < 3 ? (
                  <button onClick={() => { if (validateIntakeStep()) setIntakeStep(s=>s+1); }}
                    className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition bg-[#2563eb] hover:bg-blue-800">
                    Continue <ChevronRight size={14} />
                  </button>
                ) : (
                  <button onClick={() => handleIntakeSubmit(false)}
                    disabled={intakeSubmitting || !signature}
                    className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition bg-[#2563eb] hover:bg-blue-800">
                    {intakeSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {intakeSubmitting ? 'Submitting…' : 'Submit Intake Forms'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────────
  if (success) {
    const isSlotBooking = !requestAnyway && !!prefTime;
    return (
      <DashboardPageWrapper title="Book Appointment" subtitle="">
        <div className="max-w-2xl mx-auto">
          <div className="bg-[#2563eb] text-white rounded-2xl px-6 py-6 mb-5 relative">
            <button onClick={() => router.push('/my-appointments')} className="absolute top-4 right-5 text-white/60 hover:text-white text-xl leading-none">&times;</button>
            <div className="flex items-start gap-3">
              <CheckCircle size={24} className="text-green-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-green-200 uppercase tracking-wide mb-1">
                  {isSlotBooking ? 'Slot Reserved' : 'Request Submitted'}
                </p>
                <p className="text-lg font-bold">Ticket #{ticketNumber}</p>
                {isSlotBooking ? (
                  <p className="text-sm text-green-100 mt-1">
                    Your slot at <strong>{fmtT(prefTime)}</strong> on <strong>{new Date(prefDate+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</strong> is reserved. Your IC will confirm it shortly.
                  </p>
                ) : (
                  <p className="text-sm text-green-100 mt-1">Our office will review your request and contact you to schedule a session.</p>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">What happens next</p>
            <ol className="space-y-3">
              {(isSlotBooking ? [
                { label: 'IC reviews your slot', desc: 'Your intake counselor will confirm or adjust your reserved time within 1–2 business days.' },
                { label: 'Check your email', desc: 'You\'ll receive a confirmation email at your DLSU address once your appointment is confirmed.' },
                { label: 'Attend your intake interview', desc: 'Bring a valid DLSU ID. The session is confidential and takes about 30–45 minutes.' },
              ] : [
                { label: 'Office reviews your request', desc: 'The CPS office will review your request and reach out within 1–2 business days.' },
                { label: 'Check your email', desc: 'You\'ll receive scheduling details at your DLSU email address.' },
                { label: 'Attend your intake interview', desc: 'Bring a valid DLSU ID. The session is confidential and takes about 30–45 minutes.' },
              ]).map((s, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[10px] font-bold text-[#2563eb] flex-shrink-0 mt-0.5">{i+1}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          {formSkipped && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
              <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Intake forms not yet submitted</p>
                <p className="text-xs text-amber-700 mt-0.5">Your appointment is booked, but the IC needs your intake forms before the session. Please return here or visit the CPS office to complete them.</p>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => router.push('/my-appointments')} className="px-5 py-2.5 bg-[#2563eb] text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition">View My Appointments</button>
            <button onClick={() => { setSuccess(false); setConcern(''); setPrefDate(''); setPrefTime(''); setPurpose('counseling'); setFormSkipped(false); setBookStep(0); }} className="px-5 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50 transition">New Request</button>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  // ── Calendar helpers ────────────────────────────────────────────────────────────
  const { year, month } = calendarMonth;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blanks = (firstDay + 6) % 7;
  const cells: (number | null)[] = [...Array(blanks).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const monthLabel = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const isSelectable = (day: number) => {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const d = new Date(ds + 'T12:00:00');
    return d >= minDate && d <= maxDate && !bookingRules.blackout_dates.includes(ds);
  };

  const methodSlots = slots.filter(s => s.method?.toLowerCase() === slotMethod.toLowerCase());
  const slotCountByTime: Record<string, number> = {};
  methodSlots.forEach(s => { slotCountByTime[s.time] = (slotCountByTime[s.time] || 0) + 1; });

  const seen = new Set<string>();
  const filteredSlots = methodSlots.filter(s => {
    const key = purpose === 'intake_interview' ? s.time : `${s.time}|${s.counselor_id}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });

  // ── Main form ──────────────────────────────────────────────────────────────────
  return (
    <DashboardPageWrapper title="Book Appointment" subtitle="">

      {/* Consent modal */}
      {showConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="px-7 pt-7 pb-4 border-b border-gray-100 text-center flex-shrink-0">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-[#2563eb]" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Informed Consent Form</h2>
              <p className="text-sm text-gray-400 mt-1">Please read the full document carefully before agreeing.</p>
            </div>
            <div className="overflow-y-auto flex-1 px-7 py-5 space-y-4 text-sm text-gray-700 leading-relaxed">
              <div>
                <p className="font-bold text-gray-900 mb-1">De La Salle University — Counseling &amp; Psychology Services (CPS)</p>
                <p className="text-xs text-gray-500">This form is required before you can access counseling and psychological services. Please read each section carefully.</p>
              </div>
              <div className="border border-green-200 rounded-lg p-3 bg-green-50/50">
                <p className="font-bold text-[#2563eb] text-xs uppercase tracking-wide mb-2">I. Informed Consent for Counseling Services</p>
                <p className="text-xs text-gray-600 mb-1">The DLSU Counseling &amp; Psychology Services (CPS) provides mental health support, counseling, and psychological services to enrolled students. Services include individual counseling, psychological assessment, crisis intervention, and referral to appropriate resources.</p>
                <p className="text-xs text-gray-600 mb-1">Participation is voluntary. You may ask questions at any time and may discontinue at any time without penalty.</p>
                <p className="text-xs text-gray-600">Under the Mental Health Act of 2018 (RA 11036), you have the right to access mental health services, to be treated with dignity and respect, and to have your mental health information kept confidential.</p>
              </div>
              <div className="border border-amber-200 rounded-lg p-3 bg-amber-50/50">
                <p className="font-bold text-amber-800 text-xs uppercase tracking-wide mb-2">II. Limits of Confidentiality Statement</p>
                <p className="text-xs text-gray-600 mb-1">All information shared during counseling sessions is strictly confidential and will not be disclosed without your written consent, <span className="font-semibold">except</span> in the following circumstances:</p>
                <ul className="text-xs text-gray-600 ml-4 list-disc space-y-0.5">
                  <li>When there is imminent risk of serious harm to yourself or to others</li>
                  <li>When there is reasonable suspicion of child abuse or neglect</li>
                  <li>When disclosure is required by a court order or by law</li>
                  <li>When required by university policy to protect the safety and welfare of the community</li>
                </ul>
              </div>
              <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/50">
                <p className="font-bold text-green-800 text-xs uppercase tracking-wide mb-2">III. Privacy Notice</p>
                <p className="text-xs text-gray-600 mb-1 font-medium">Information we collect:</p>
                <ul className="text-xs text-gray-600 ml-4 list-disc space-y-0.5 mb-2">
                  <li>Personal information: name, student ID, contact details, college, and program</li>
                  <li>Health and mental health information: presenting concerns, history, medication, and substance use</li>
                  <li>Assessment results: PHQ-9, GAD-7, C-SSRS, and other psychological screening tools</li>
                  <li>Session notes: mood, risk indicators, and treatment progress</li>
                  <li>Emergency contact information</li>
                  <li>Wellness monitoring data from linked EMA accounts (if applicable)</li>
                </ul>
                <p className="text-xs text-gray-600"><span className="font-medium">Retention:</span> Records are kept for a minimum of ten (10) years from your last session, after which they are securely disposed of.</p>
              </div>
              <div className="border border-purple-200 rounded-lg p-3 bg-purple-50/50">
                <p className="font-bold text-purple-800 text-xs uppercase tracking-wide mb-2">IV. Consent for Data Processing (RA 10173 — Data Privacy Act of 2012)</p>
                <p className="text-xs text-gray-600 mb-1">Your mental health records are classified as <span className="font-medium">sensitive personal information</span> under RA 10173 and require your explicit consent to process.</p>
                <div className="bg-white/70 rounded p-2 border border-purple-100 mt-2">
                  <p className="text-xs text-gray-500 font-medium">DLSU Data Privacy Officer</p>
                  <p className="text-xs text-gray-500">2401 Taft Avenue, Malate, Manila 1004 · dpo@dlsu.edu.ph</p>
                </div>
              </div>
            </div>
            <div className="px-7 pb-6 pt-4 border-t border-gray-100 flex-shrink-0 space-y-3">
              {[
                { k: 'counseling' as const, t: 'I have read and understood the nature of counseling services, confidentiality, and its exceptions. I voluntarily consent to receive counseling and psychological services from DLSU CPS.' },
                { k: 'privacy' as const,    t: 'I have read and understood how my personal and sensitive data will be collected, processed, and stored. I consent to data processing in accordance with RA 10173 (Data Privacy Act of 2012).' },
              ].map(item => (
                <label key={item.k} className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={consentChecks[item.k]} onChange={e => setConsentChecks(c => ({ ...c, [item.k]: e.target.checked }))} className="w-4 h-4 mt-0.5 accent-[#2563eb] flex-shrink-0" />
                  <p className="text-xs text-gray-700 leading-relaxed">{item.t}</p>
                </label>
              ))}
              {consentError && <p className="text-xs text-red-500">{consentError}</p>}
              <button onClick={handleConsent} disabled={savingConsent || !consentChecks.counseling || !consentChecks.privacy}
                className="w-full py-3 bg-[#2563eb] hover:bg-blue-800 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 mt-1">
                {savingConsent && <Loader2 size={14} className="animate-spin" />}
                I Agree &amp; Continue
              </button>
              <button onClick={() => router.replace('/dashboard')} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Booking confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-7">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarCheck className="w-6 h-6 text-[#2563eb]" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 text-center mb-1">Confirm Your Booking</h2>
            <p className="text-xs text-gray-400 text-center mb-5">Please review your appointment details before confirming.</p>
            <div className="space-y-2.5 mb-6">
              <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
                <span className="text-gray-500">Purpose</span>
                <span className="font-medium text-gray-800 capitalize">{purpose === 'intake_interview' ? 'Intake Interview' : purpose === 'counseling' ? 'Counseling' : purpose === 'follow_up_counselling' ? 'Follow-up' : purpose}</span>
              </div>
              <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
                <span className="text-gray-500">Mode</span>
                <span className="font-medium text-gray-800">{slotMethod === 'F2F' ? 'Face to Face' : 'Online'}{slotMethod === 'Online' && prefPlatform ? ` · ${prefPlatform === 'google-meet' ? 'Google Meet' : 'Zoom'}` : ''}</span>
              </div>
              {prefDate && (
                <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
                  <span className="text-gray-500">Date &amp; Time</span>
                  <span className="font-medium text-gray-800">
                    {new Date(prefDate+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
                    {prefTime && ` at ${fmtT(prefTime)}`}
                  </span>
                </div>
              )}
              {concern && (
                <div className="flex justify-between text-sm border-b border-gray-100 pb-2 gap-4">
                  <span className="text-gray-500 flex-shrink-0">Concern</span>
                  <span className="font-medium text-gray-800 text-right line-clamp-2">{concern}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Referral</span>
                <span className="font-medium text-gray-800">{referralType === 'referred' ? `Referred by ${referredBy}` : 'Self Referred'}</span>
              </div>
            </div>
            {purpose === 'intake_interview' && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
                After booking, you&apos;ll be asked to fill out the intake forms (ICF, SPIF, PHQ-4). You can do them now or come back later.
              </p>
            )}
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <button onClick={handleConfirmedBook} disabled={submitting}
              className="w-full py-3 bg-[#2563eb] hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 mb-2">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {submitting ? 'Booking…' : 'Confirm Booking'}
            </button>
            <button onClick={() => setShowConfirm(false)} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition">
              Go Back &amp; Edit
            </button>
          </div>
        </div>
      )}

      {/* Forms choice modal */}
      {showFormsChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-7">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-[#2563eb]" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 text-center mb-1">Appointment Booked!</h2>
            <p className="text-xs text-gray-400 text-center mb-1">Ticket #{ticketNumber}</p>
            <p className="text-sm text-gray-600 text-center mb-5">Your slot is reserved. Would you like to fill out the required intake forms now?</p>
            <div className="space-y-3">
              <button onClick={() => { setShowFormsChoice(false); setShowIntake(true); }}
                className="w-full py-3 bg-[#2563eb] hover:bg-blue-800 text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2">
                <ClipboardList size={14} /> Fill Out Forms Now
              </button>
              <button onClick={() => { setShowFormsChoice(false); setFormSkipped(true); setSuccess(true); }}
                className="w-full py-3 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition">
                I&apos;ll Complete Later
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-4">You can return to fill the forms from My Appointments → &quot;Complete Forms&quot;.</p>
          </div>
        </div>
      )}

      {/* Draft banner */}
      {hasDraft && (
        <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm">
          <span className="text-green-600 font-medium">Draft loaded from previous session.</span>
          <button onClick={clearDraft} className="text-xs text-gray-400 hover:text-red-500">Clear draft</button>
        </div>
      )}

      {/* ── 3-panel layout ─────────────────────────────────────────────────── */}
      <div className="flex gap-5 items-start">

        {/* LEFT SIDEBAR */}
        <div className="w-52 flex-shrink-0 hidden lg:flex flex-col gap-4">

          {/* Branding + user + step tracker */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-[#2563eb] flex items-center justify-center flex-shrink-0">
                <Image src="/dlsu-seal.svg" alt="DLSU" width={22} height={22} className="brightness-[10]" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Book Appointment</p>
                <p className="text-[10px] text-gray-400">CPS · DLSU</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-full bg-[#2563eb] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{user?.first_name} {user?.last_name}</p>
                <p className="text-[10px] text-gray-400">Student</p>
              </div>
            </div>

            <VerticalStepTracker steps={BOOK_STEPS} current={bookStep} />
          </div>

          {/* Selections summary (shown after step 0) */}
          {bookStep >= 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Your selections</p>
              <div>
                <p className="text-[10px] text-gray-400">Session type</p>
                <p className="text-xs font-semibold text-gray-800">{PURPOSES.find(p=>p.value===purpose)?.label || purpose}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400">Mode</p>
                <p className="text-xs font-semibold text-gray-800">
                  {slotMethod === 'F2F' ? 'Face to Face' : `Online · ${prefPlatform === 'google-meet' ? 'Google Meet' : 'Zoom'}`}
                </p>
              </div>
              {bookStep >= 2 && prefDate && (
                <div>
                  <p className="text-[10px] text-gray-400">Date &amp; Time</p>
                  <p className="text-xs font-semibold text-gray-800">
                    {new Date(prefDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',weekday:'short'})}
                    {prefTime && <><br />{fmtT(prefTime)}</>}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CENTER */}
        <div className="flex-1 min-w-0">

          {/* Step 0: Session Type */}
          {bookStep === 0 && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-900">What type of session?</p>
                  <p className="text-xs text-gray-400 mt-0.5">Select the purpose of your visit to CPS</p>
                </div>
                <div className="p-5 space-y-4">

                  {/* Purpose cards */}
                  <div className="grid grid-cols-2 gap-2">
                    {PURPOSES.map(p => (
                      <label key={p.value}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition
                          ${purpose===p.value ? 'border-[#2563eb] bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition
                          ${purpose===p.value ? 'bg-[#2563eb] border-[#2563eb]' : 'border-gray-300'}`}>
                          {purpose===p.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <input type="radio" name="purpose" value={p.value} checked={purpose===p.value} onChange={() => setPurpose(p.value)} className="sr-only" />
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{p.label}</p>
                          <p className="text-xs text-gray-400">{p.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {purpose === 'others' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Specify <span className="text-red-400">*</span></label>
                      <input value={specifyOthers} onChange={e => setSpecifyOthers(e.target.value)} placeholder="Please specify…" className={IC} />
                    </div>
                  )}

                  {purpose === 'intake_interview' && (
                    <div className="flex items-start gap-2 bg-sky-50 border border-sky-100 rounded-xl px-4 py-3">
                      <ClipboardCheck size={14} className="text-sky-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-sky-700"><strong>Intake Interview selected:</strong> After submitting, you&apos;ll complete short intake forms (ICF, SPIF-IF, PHQ-4) to help your counselor prepare.</p>
                    </div>
                  )}

                  {/* Counselor (counseling / follow-up only) */}
                  {['counseling','follow_up_counselling'].includes(purpose) && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Counselor <span className="text-red-400">*</span></label>
                      {assignedCounselor === undefined && (
                        <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                          <Loader2 size={13} className="animate-spin" /> Looking up your assigned counselor…
                        </div>
                      )}
                      {assignedCounselor && (
                        <div className="flex items-center gap-3 p-3 bg-[#2563eb]/5 border border-[#2563eb]/20 rounded-xl">
                          <div className="w-8 h-8 rounded-full bg-[#2563eb]/10 flex items-center justify-center flex-shrink-0">
                            <UserCheck size={14} className="text-[#2563eb]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">
                              {assignedCounselor.name.split(' ').reverse().join(', ').replace(',', ', ').toUpperCase().replace(/,\s(.+)/, (_, f) => `, ${f.charAt(0).toUpperCase()}${f.slice(1).toLowerCase()}`)}
                            </p>
                            <p className="text-xs text-gray-400">{assignedCounselor.role === 'PSYCHOLOGIST' ? 'Psychologist' : 'Counselor'} · Assigned to your case</p>
                          </div>
                          <span className="text-[10px] font-semibold text-[#2563eb] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">Assigned</span>
                        </div>
                      )}
                      {assignedCounselor === null && (
                        counselorList === null ? (
                          <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                            <Loader2 size={13} className="animate-spin" /> Loading counselors…
                          </div>
                        ) : counselorList.length > 0 ? (
                          <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-0.5">
                            {counselorList.map((c: any) => {
                              const isPsych = c.role === 'PSYCHOLOGIST';
                              const displayName = `${c.first_name} ${c.last_name}`;
                              const selected = selectedCounselorId === c._id;
                              return (
                                <button key={c._id} type="button" onClick={() => setSelectedCounselorId(c._id)}
                                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition ${
                                    selected ? 'border-[#2563eb] bg-[#2563eb]/5' : 'border-gray-100 bg-white hover:border-gray-200'
                                  }`}>
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                    selected ? 'bg-[#2563eb] text-white' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {c.first_name?.charAt(0)}{c.last_name?.charAt(0)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold truncate ${selected ? 'text-[#2563eb]' : 'text-gray-800'}`}>{displayName}</p>
                                    <p className="text-[10px] text-gray-400">{isPsych ? 'Psychologist' : 'Counselor'}</p>
                                  </div>
                                  {selected && <Check size={14} className="text-[#2563eb] flex-shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                            No counselors are currently available. Please contact the CPS office directly.
                          </p>
                        )
                      )}
                    </div>
                  )}

                  {/* Session mode */}
                  {purpose !== 'others' && (purpose === 'intake_interview' || !!selectedCounselorId || assignedCounselor) && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Session Mode <span className="text-red-400">*</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { v: 'F2F',    label: 'Face to Face', sub: 'Visit the CPS office', Icon: MapPin  },
                          { v: 'Online', label: 'Online',        sub: 'Video call session',   Icon: Video   },
                        ].map(m => (
                          <button key={m.v} type="button"
                            onClick={() => {
                              setSlotMethod(m.v);
                              setPrefDate(''); setPrefTime(''); setSlotCounselorId('');
                              setSlots([]); setNoSlotsNextDate(null); setRequestAnyway(false);
                            }}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition ${
                              slotMethod === m.v ? 'border-[#2563eb] bg-[#2563eb]/5' : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              slotMethod === m.v ? 'bg-[#2563eb] text-white' : 'bg-gray-100 text-gray-500'
                            }`}>
                              <m.Icon size={15} />
                            </div>
                            <div>
                              <p className={`text-sm font-semibold ${slotMethod === m.v ? 'text-[#2563eb]' : 'text-gray-800'}`}>{m.label}</p>
                              <p className="text-[10px] text-gray-400">{m.sub}</p>
                            </div>
                            {slotMethod === m.v && <Check size={14} className="ml-auto text-[#2563eb] flex-shrink-0" />}
                          </button>
                        ))}
                      </div>

                      {slotMethod === 'Online' && (
                        <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
                          <p className="text-xs font-bold text-blue-700 mb-2">Preferred Platform</p>
                          <div className="flex gap-2">
                            {([
                              { value: 'google-meet' as const, label: 'Google Meet' },
                              { value: 'zoom'        as const, label: 'Zoom'        },
                            ] as const).map(p => (
                              <button key={p.value} type="button"
                                onClick={() => setPrefPlatform(p.value)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-xs font-semibold transition ${
                                  prefPlatform === p.value ? 'border-blue-500 bg-blue-100 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
                                }`}>
                                {prefPlatform === p.value && <Check size={12} />}
                                {p.label}
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-blue-500 mt-2">Your IC will send the meeting link before the session.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Date (Calendar) */}
          {bookStep === 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900">Select a date</p>
                <p className="text-xs text-gray-400 mt-0.5">Available dates are shown — choose one to see time slots</p>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-gray-800">{monthLabel}</p>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setCalendarMonth(m => { const d = new Date(m.year, m.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
                      <ChevronLeft size={15} />
                    </button>
                    <button type="button" onClick={() => setCalendarMonth(m => { const d = new Date(m.year, m.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 mb-2">
                  {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
                    <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-y-1">
                  {cells.map((day, i) => {
                    if (!day) return <div key={i} />;
                    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                    const selectable = isSelectable(day);
                    const isSelected = prefDate === ds;
                    const isToday = ds === toDS(new Date());
                    return (
                      <button key={i} type="button" disabled={!selectable}
                        onClick={() => { setPrefDate(ds); setPrefTime(''); setSlotCounselorId(''); setRequestAnyway(false); }}
                        className={`mx-auto w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium transition
                          ${isSelected ? 'bg-[#2563eb] text-white font-bold shadow-sm' :
                            isToday && selectable ? 'ring-2 ring-[#2563eb] text-[#2563eb] font-bold' :
                            selectable ? 'hover:bg-gray-100 text-gray-700' :
                            'text-gray-300 cursor-not-allowed'}`}>
                        {day}
                      </button>
                    );
                  })}
                </div>

                {/* No slots — request anyway */}
                {prefDate && !slotsLoading && filteredSlots.length === 0 && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-amber-800 mb-1">No available slots on this date</p>
                    {noSlotsNextDate && (
                      <p className="text-xs text-amber-700 mb-2">
                        Next available: <button onClick={() => { setPrefDate(noSlotsNextDate); setCalendarMonth({ year: parseInt(noSlotsNextDate.split('-')[0]), month: parseInt(noSlotsNextDate.split('-')[1]) - 1 }); }} className="font-semibold underline">{new Date(noSlotsNextDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</button>
                      </p>
                    )}
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={requestAnyway} onChange={e => setRequestAnyway(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#2563eb]" />
                      <span className="text-xs text-amber-700">Submit a general request — the CPS office will schedule me</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {bookStep === 2 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900">Session details</p>
                <p className="text-xs text-gray-400 mt-0.5">Tell your counselor what brings you in</p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Presenting Concern</label>
                  <textarea value={concern} onChange={e => setConcern(e.target.value)} rows={4}
                    placeholder="Briefly describe what you'd like to talk about or any concerns you'd like your counselor to know before the session…"
                    className={IC} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Referral</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { v: 'self-referred', label: 'Self-referred', desc: 'I came on my own' },
                      { v: 'referred',      label: 'Referred',      desc: 'Referred by someone' },
                    ].map(r => (
                      <button key={r.v} type="button" onClick={() => setReferralType(r.v)}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition ${
                          referralType === r.v ? 'border-[#2563eb] bg-blue-50' : 'border-gray-100 hover:border-gray-200'
                        }`}>
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition
                          ${referralType === r.v ? 'bg-[#2563eb] border-[#2563eb]' : 'border-gray-300'}`}>
                          {referralType === r.v && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{r.label}</p>
                          <p className="text-xs text-gray-400">{r.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {referralType === 'referred' && (
                    <input value={referredBy} onChange={e => setReferredBy(e.target.value)}
                      placeholder="Name / position of person who referred you" className={`${IC} mt-2`} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mt-3">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />{error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3 mt-4">
            {bookStep > 0 && (
              <button onClick={() => { setError(null); setBookStep(s => s - 1); }}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
                <ChevronLeft size={14} /> Back
              </button>
            )}
            <button onClick={saveDraft}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition">
              <Save size={13} className={savingDraft ? 'animate-pulse' : ''} />
              {savingDraft ? 'Saved' : 'Save Draft'}
            </button>
            <div className="flex-1" />
            {bookStep < 2 ? (
              <button onClick={handleNextBookStep}
                className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition bg-[#2563eb] hover:bg-blue-800">
                Continue <ChevronRight size={14} />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition bg-[#2563eb] hover:bg-blue-800 disabled:opacity-50">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <CalendarCheck size={14} />}
                {submitting ? 'Submitting…' : 'Review & Book'}
              </button>
            )}
          </div>
        </div>

        {/* RIGHT: Time slots — shown on step 1 */}
        {bookStep === 1 && (
          <div className="w-52 flex-shrink-0 hidden xl:flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-900">
                {prefDate
                  ? new Date(prefDate+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})
                  : 'Select a date'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {prefDate ? `${slotMethod === 'F2F' ? 'Face to Face' : 'Online'} slots` : 'Available time slots will appear here'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {!prefDate && (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-2">
                    <Clock size={18} className="text-gray-300" />
                  </div>
                  <p className="text-xs text-gray-400">Pick a date on the calendar</p>
                </div>
              )}

              {prefDate && slotsLoading && (
                <div className="flex items-center justify-center h-24 gap-2 text-gray-400 text-xs">
                  <Loader2 size={13} className="animate-spin" /> Loading slots…
                </div>
              )}

              {prefDate && !slotsLoading && filteredSlots.length > 0 && (
                <div className="space-y-1.5">
                  {filteredSlots.map((s, i) => {
                    const selected = prefTime === s.time && slotCounselorId === s.counselor_id;
                    return (
                      <button key={i} type="button"
                        onClick={() => { setPrefTime(s.time); setSlotCounselorId(s.counselor_id); setRequestAnyway(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition ${
                          selected ? 'border-[#2563eb] bg-[#2563eb] text-white' : 'border-gray-100 bg-white hover:border-[#2563eb]/30 hover:bg-blue-50'
                        }`}>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold ${selected ? 'text-white' : 'text-gray-800'}`}>{fmtT(s.time)}</p>
                          {s.counselor_name && purpose !== 'intake_interview' && (
                            <p className={`text-[10px] mt-0.5 truncate ${selected ? 'text-blue-100' : 'text-gray-400'}`}>{s.counselor_name}</p>
                          )}
                        </div>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                          selected
                            ? 'bg-white/20 text-white'
                            : slotCountByTime[s.time] === 1
                              ? 'bg-red-50 text-red-500'
                              : 'bg-gray-100 text-gray-500'
                        }`}>
                          {slotCountByTime[s.time]} slot{slotCountByTime[s.time] !== 1 ? 's' : ''} left
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {prefDate && !slotsLoading && filteredSlots.length === 0 && !requestAnyway && (
                <div className="text-center py-6">
                  <p className="text-xs text-gray-400">No {slotMethod === 'F2F' ? 'face-to-face' : 'online'} slots available.</p>
                  <p className="text-[10px] text-gray-400 mt-1">Try a different date or check below to request anyway.</p>
                </div>
              )}

              {requestAnyway && (
                <div className="mt-2 flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <Check size={12} className="text-amber-600 flex-shrink-0" />
                  <p className="text-[10px] text-amber-700 font-medium">General request — CPS will schedule you</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </DashboardPageWrapper>
  );
}
