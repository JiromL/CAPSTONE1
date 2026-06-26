'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import {
  AlertCircle, CheckCircle, Loader2, Save, Send, Check,
  ChevronRight, ChevronLeft, User, FileText, Brain, ClipboardCheck,
  BookOpen, Heart, Phone, GraduationCap, Clock, CalendarX, CalendarCheck, UserCheck, ClipboardList,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────────
const PURPOSES = [
  { value: 'intake_interview',       label: 'Intake Interview', desc: 'First-time visit — includes intake forms' },
  { value: 'counseling',             label: 'Counseling',       desc: 'Continuing counseling session' },
  { value: 'follow_up_counselling',  label: 'Follow-up',        desc: 'Follow-up counseling session' },
  { value: 'others',                 label: 'Others',           desc: 'Other type of session' },
];

const PLATFORMS = [
  { value: 'in-person',   label: 'Face to Face',  desc: 'Visit the CPS office' },
  { value: 'google-meet', label: 'Google Meet',   desc: 'Online video call' },
  { value: 'zoom',        label: 'Zoom',          desc: 'Online video call' },
];

const PHQ4Q = [
  { text: 'Little interest or pleasure in doing things', sub: 'PHQ-2 Depression Screener' },
  { text: 'Feeling down, depressed, or hopeless',        sub: 'PHQ-2 Depression Screener' },
  { text: 'Feeling nervous, anxious, or on edge',        sub: 'GAD-2 Anxiety Screener' },
  { text: 'Not being able to stop or control worrying',  sub: 'GAD-2 Anxiety Screener' },
];

const FREQ = [
  { v: 0, s: 'Not at all',              col: 'text-gray-600',  sel: 'bg-gray-600 text-white border-gray-600' },
  { v: 1, s: 'Several days',            col: 'text-blue-600',  sel: 'bg-blue-500 text-white border-blue-500' },
  { v: 2, s: 'More than half the days', col: 'text-amber-600', sel: 'bg-amber-500 text-white border-amber-500' },
  { v: 3, s: 'Nearly every day',        col: 'text-red-600',   sel: 'bg-red-500 text-white border-red-500' },
];

const INTAKE_STEPS = [
  { num: 1, label: 'Contact Form',    sub: 'ICF',     color: 'bg-sky-500' },
  { num: 2, label: 'Personal Info',   sub: 'SPIF-IF', color: 'bg-violet-500' },
  { num: 3, label: 'Mental Screen',   sub: 'PHQ-4',   color: 'bg-orange-500' },
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

function StepWizard({ current }: { current: number }) {
  return (
    <div className="flex items-start justify-center gap-0 mb-6">
      {INTAKE_STEPS.map((s, i) => {
        const done = i < current, active = i === current;
        return (
          <div key={i} className="flex items-start">
            <div className="flex flex-col items-center w-24">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition
                ${done ? 'bg-[#2563eb] border-[#2563eb] text-white' : active ? 'bg-white border-[#2563eb] text-[#2563eb]' : 'bg-white border-gray-200 text-gray-400'}`}>
                {done ? <Check size={16} /> : s.num}
              </div>
              <p className={`text-[11px] font-semibold mt-1.5 text-center leading-tight ${active ? 'text-[#2563eb]' : done ? 'text-gray-500' : 'text-gray-400'}`}>{s.label}</p>
              <span className={`text-[9px] uppercase tracking-wide font-bold mt-0.5 ${active ? 'text-[#2563eb]/60' : 'text-gray-300'}`}>{s.sub}</span>
            </div>
            {i < INTAKE_STEPS.length - 1 && (
              <div className={`mt-4 h-0.5 w-8 mx-1 ${i < current ? 'bg-[#2563eb]' : 'bg-gray-200'}`} />
            )}
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
  const [slotMethod, setSlotMethod]        = useState('F2F');
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
  const [methodFilter, setMethodFilter]   = useState<'all' | 'in-person' | 'online'>('all');

  // Assigned counselor (for counseling / follow-up)
  const [assignedCounselor, setAssignedCounselor] = useState<{ id: string; name: string; role: string } | null | undefined>(undefined);
  const [counselorList, setCounselorList]   = useState<any[] | null>(null); // null = loading, [] = none found
  const [selectedCounselorId, setSelectedCounselorId] = useState('');

  // EMA label (for PHQ-4 skip logic)
  const [emaLabel, setEmaLabel]           = useState<string | null>(null);

  // Intake packet
  const [showIntake, setShowIntake]       = useState(false);
  const [intakeStep, setIntakeStep]       = useState(0);
  const [intakeError, setIntakeError]     = useState('');
  const [intakeSubmitting, setIntakeSubmitting] = useState(false);
  const [appointmentId, setAppointmentId] = useState('');
  const [formSkipped, setFormSkipped]     = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [showFormsChoice, setShowFormsChoice] = useState(false);

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
      // Fetch EMA label for PHQ-4 skip logic
      try {
        const r = await fetch(api('/api/mhbot/my-perma'), { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) { const d = await r.json(); if (d.mhbot_username) setEmaLabel(d.latest_label ?? null); }
      } catch {}
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        setHasDraft(true);
        try { const d = JSON.parse(draft); if (d.purpose) setPurpose(d.purpose); if (d.concern) setConcern(d.concern); if (d.referralType) setReferralType(d.referralType); if (d.referredBy) setReferredBy(d.referredBy); if (d.prefDate) setPrefDate(d.prefDate); if (d.prefTime) setPrefTime(d.prefTime); } catch {}
      }
      // Resume intake forms for an existing appointment
      if (resumeId) {
        setAppointmentId(resumeId);
        setTicketNumber(resumeId.slice(-8).toUpperCase());
        // Restore saved form progress if available
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

  // When purpose changes: resolve assigned counselor (or open request for 'others')
  useEffect(() => {
    setPrefTime(''); setSlotCounselorId(''); setSlotMethod('F2F');
    setSlots([]); setNoSlotsNextDate(null);
    setAssignedCounselor(undefined); setCounselorList(null); setSelectedCounselorId('');

    if (purpose === 'others') { setRequestAnyway(true); return; }
    setRequestAnyway(false);

    if (purpose === 'intake_interview') return; // slots handled by date effect

    // counseling / follow_up — look up assigned counselor
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

  // Fetch slots whenever date, purpose, or selected counselor changes
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    const fp = purpose === 'others' ? specifyOthers.trim() : purpose;
    if (!fp)           { setError('Please select a purpose.'); return; }
    if (purpose !== 'others') {
      if (!prefDate && !requestAnyway) { setError('Please select a date.'); return; }
      if (!requestAnyway && !prefTime) { setError('Please select an available time slot.'); return; }
      if (['counseling', 'follow_up_counselling'].includes(purpose) && !selectedCounselorId && !requestAnyway) {
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
    setIntakeError(''); return true;
  };

  const handleIntakeSubmit = async (skipPhq4 = false) => {
    if (!skipPhq4 && !validateIntakeStep()) return;
    setIntakeSubmitting(true); setIntakeError('');
    try {
      const token = localStorage.getItem('token');
      const phq4Payload = skipPhq4 ? null : phq4;
      const r = await fetch(api('/api/intake/packet'), { method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify({ source:'online', submitted_by_role:'student', appointment_id:appointmentId, icf, spif, phq4_responses:phq4Payload, phq4_skipped: skipPhq4 }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to submit forms');
      setShowIntake(false); setSuccess(true);
    } catch (err) { setIntakeError(err instanceof Error ? err.message : 'An error occurred'); } finally { setIntakeSubmitting(false); }
  };

  if (loading) return (
    <DashboardPageWrapper title="Counselling Sessions" subtitle="">
      <div className="flex items-center justify-center h-48"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
    </DashboardPageWrapper>
  );

  // ── Gate ─────────────────────────────────────────────────────────────────────
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

  // ── Intake packet ─────────────────────────────────────────────────────────────
  if (showIntake) {
    const phq2 = (phq4[0]??0)+(phq4[1]??0), gad2 = (phq4[2]??0)+(phq4[3]??0);
    return (
      <DashboardPageWrapper title="Book Appointment" subtitle="Complete your intake forms">
        <div className="max-w-2xl mx-auto">
          {/* Booking confirmed banner */}
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-4 mb-6">
            <CheckCircle size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-800">Appointment Booked — Ticket #{ticketNumber}</p>
              <p className="text-xs text-blue-700 mt-0.5">Please complete the intake forms below. Your IC will review these before your session to better prepare.</p>
            </div>
          </div>

          <StepWizard current={intakeStep} />

          {intakeError && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />{intakeError}
            </div>
          )}

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            {/* Step header */}
            <div className={`px-5 py-4 border-b border-gray-100 flex items-center gap-2
              ${intakeStep===0 ? 'bg-sky-50' : intakeStep===1 ? 'bg-violet-50' : 'bg-orange-50'}`}>
              {intakeStep===0 && <ClipboardCheck size={16} className="text-sky-600" />}
              {intakeStep===1 && <BookOpen size={16} className="text-violet-600" />}
              {intakeStep===2 && <Brain size={16} className="text-orange-600" />}
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {intakeStep===0 && 'Initial Contact Form (ICF)'}
                  {intakeStep===1 && 'Personal Background (SPIF-IF)'}
                  {intakeStep===2 && 'Mental Health Screener (PHQ-4)'}
                </p>
                <p className="text-xs text-gray-500">
                  {intakeStep===0 && 'Basic information, emergency contact, and presenting concern'}
                  {intakeStep===1 && 'Personal, family, and health background — helps your counselor prepare'}
                  {intakeStep===2 && 'Short 4-question mental health screening — over the last 2 weeks'}
                </p>
              </div>
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
                      <textarea className={IC} rows={3} value={icf.presenting_concern} onChange={e => setIcf(p=>({...p,presenting_concern:e.target.value}))} placeholder="What brings you to CPS? Briefly describe your main concern or what you'd like help with…" />
                    </F>
                  </div>
                </div>
              )}

              {/* SPIF */}
              {intakeStep === 1 && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">This background information is confidential and helps your counselor better understand your situation before your session.</p>
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
                      <F label="Currently Living With"><input className={IC} value={spif.living_with} onChange={e => setSpif(p=>({...p,living_with:e.target.value}))} placeholder="e.g. Parents, Dormitory, Alone" /></F>
                    </div>
                  </div>
                  <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-violet-700">Health & Mental Health History</p>
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
                  {/* Skip banner for Struggling / In Crisis */}
                  {(emaLabel === 'Struggling' || emaLabel === 'In Crisis') && (
                    <div className={`rounded-xl px-4 py-3 border flex items-start gap-3 ${emaLabel === 'In Crisis' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
                      <AlertCircle size={15} className={`flex-shrink-0 mt-0.5 ${emaLabel === 'In Crisis' ? 'text-red-500' : 'text-orange-500'}`} />
                      <div className="flex-1">
                        <p className={`text-xs font-bold ${emaLabel === 'In Crisis' ? 'text-red-800' : 'text-orange-800'}`}>
                          Your EMA data shows you are currently {emaLabel}
                        </p>
                        <p className={`text-xs mt-0.5 ${emaLabel === 'In Crisis' ? 'text-red-700' : 'text-orange-700'}`}>
                          Your IC will already be briefed on your wellbeing status. You can still complete the screener below, or skip it — your IC will follow up with you directly.
                        </p>
                      </div>
                      <button onClick={() => handleIntakeSubmit(true)}
                        className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${emaLabel === 'In Crisis' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}>
                        Skip PHQ-4
                      </button>
                    </div>
                  )}
                  <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                    <p className="text-xs font-bold text-orange-800">Over the last 2 weeks, how often have you been bothered by the following?</p>
                    <p className="text-xs text-orange-600 mt-0.5">Select the answer that best describes how you've been feeling. This helps your counselor assess your current wellbeing.</p>
                  </div>

                  <div className="flex items-center gap-2 px-1">
                    <div className="flex-1 h-px bg-blue-200" />
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide px-2">PHQ-2 — Depression Screener</span>
                    <div className="flex-1 h-px bg-blue-200" />
                  </div>
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

                  <div className="flex items-center gap-2 px-1 mt-2">
                    <div className="flex-1 h-px bg-amber-200" />
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide px-2">GAD-2 — Anxiety Screener</span>
                    <div className="flex-1 h-px bg-amber-200" />
                  </div>
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
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex gap-3 bg-gray-50/50 flex-wrap">
              {intakeStep > 0 && (
                <button onClick={() => { setIntakeError(''); setIntakeStep(s=>s-1); }} className="flex items-center gap-1.5 px-4 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
                  <ChevronLeft size={14} /> Back
                </button>
              )}
              <button onClick={saveFormsProgress} className="flex items-center gap-1.5 px-4 py-2.5 text-sm border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition">
                <Save size={13} /> Save &amp; Exit
              </button>
              <div className="flex-1" />
              {intakeStep < 2 ? (
                <button onClick={() => { if (validateIntakeStep()) setIntakeStep(s=>s+1); }} className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition" style={{ backgroundColor:'#2563eb' }}>
                  Continue <ChevronRight size={14} />
                </button>
              ) : (
                <button onClick={() => handleIntakeSubmit(false)}
                  disabled={intakeSubmitting || phq4.some(v=>v===null)}
                  className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition" style={{ backgroundColor:'#2563eb' }}>
                  {intakeSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {intakeSubmitting ? 'Submitting…' : 'Submit Intake Forms'}
                </button>
              )}
            </div>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
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
                    Your slot at <strong>{(() => { const [h,m]=prefTime.split(':').map(Number); const ap=h>=12?'PM':'AM'; const h12=h%12||12; return `${h12}:${String(m).padStart(2,'0')} ${ap}`; })()}</strong> on <strong>{new Date(prefDate+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</strong> is reserved. Your IC will confirm it shortly.
                  </p>
                ) : (
                  <p className="text-sm text-green-100 mt-1">Our office will review your request and contact you to schedule a session. By sharing your Ticket Number with your counselor during the session, you confirm consent to receive services.</p>
                )}
              </div>
            </div>
          </div>
          {isSlotBooking && (
            <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 mb-4">
              <CalendarCheck size={16} className="text-sky-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-sky-800">Pending IC confirmation</p>
                <p className="text-xs text-sky-700 mt-0.5">Your intake counselor will review and confirm your slot. You'll see the status update in My Appointments.</p>
              </div>
            </div>
          )}
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
            <button onClick={() => { setSuccess(false); setConcern(''); setPrefDate(''); setPrefTime(''); setPurpose('counseling'); setFormSkipped(false); }} className="px-5 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50 transition">New Request</button>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────────
  return (
    <DashboardPageWrapper title="Book Appointment" subtitle="Schedule a counseling session with CPS">

      {/* Consent modal */}
      {showConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="px-7 pt-7 pb-4 border-b border-gray-100 text-center flex-shrink-0">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-[#2563eb]" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Informed Consent Form</h2>
              <p className="text-sm text-gray-400 mt-1">Please read the full document carefully before agreeing.</p>
            </div>

            {/* Scrollable document */}
            <div className="overflow-y-auto flex-1 px-7 py-5 space-y-4 text-sm text-gray-700 leading-relaxed">

              <div>
                <p className="font-bold text-gray-900 mb-1">De La Salle University — Counseling & Psychology Services (CPS)</p>
                <p className="text-xs text-gray-500">This form is required before you can access counseling and psychological services. Please read each section carefully.</p>
              </div>

              {/* I. Informed Consent for Counseling Services */}
              <div className="border border-green-200 rounded-lg p-3 bg-green-50/50">
                <p className="font-bold text-[#2563eb] text-xs uppercase tracking-wide mb-2">I. Informed Consent for Counseling Services</p>
                <p className="text-xs text-gray-600 mb-1">The DLSU Counseling &amp; Psychology Services (CPS) provides mental health support, counseling, and psychological services to enrolled students. Services include individual counseling, psychological assessment, crisis intervention, and referral to appropriate resources.</p>
                <p className="text-xs text-gray-600 mb-1">Participation is voluntary. You may ask questions at any time and may discontinue at any time without penalty.</p>
                <p className="text-xs text-gray-600">Under the Mental Health Act of 2018 (RA 11036), you have the right to access mental health services, to be treated with dignity and respect, and to have your mental health information kept confidential.</p>
              </div>

              {/* II. Limits of Confidentiality */}
              <div className="border border-amber-200 rounded-lg p-3 bg-amber-50/50">
                <p className="font-bold text-amber-800 text-xs uppercase tracking-wide mb-2">II. Limits of Confidentiality Statement</p>
                <p className="text-xs text-gray-600 mb-1">All information shared during counseling sessions is strictly confidential and will not be disclosed without your written consent, <span className="font-semibold">except</span> in the following circumstances:</p>
                <ul className="text-xs text-gray-600 ml-4 list-disc space-y-0.5">
                  <li>When there is imminent risk of serious harm to yourself or to others</li>
                  <li>When there is reasonable suspicion of child abuse or neglect</li>
                  <li>When disclosure is required by a court order or by law</li>
                  <li>When required by university policy to protect the safety and welfare of the community</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">In such cases, only the minimum necessary information will be disclosed to the appropriate parties.</p>
              </div>

              {/* III. Privacy Notice */}
              <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/50">
                <p className="font-bold text-blue-800 text-xs uppercase tracking-wide mb-2">III. Privacy Notice</p>
                <p className="text-xs text-gray-600 mb-1 font-medium">Information we collect:</p>
                <ul className="text-xs text-gray-600 ml-4 list-disc space-y-0.5 mb-2">
                  <li>Personal information: name, student ID, contact details, college, and program</li>
                  <li>Health and mental health information: presenting concerns, history, medication, and substance use</li>
                  <li>Assessment results: PHQ-9, GAD-7, C-SSRS, and other psychological screening tools</li>
                  <li>Session notes: mood, risk indicators, and treatment progress</li>
                  <li>Emergency contact information</li>
                  <li>Wellness monitoring data from linked EMA accounts (if applicable)</li>
                </ul>
                <p className="text-xs text-gray-600 mb-1 font-medium">Who may access your information:</p>
                <p className="text-xs text-gray-600 mb-1">Only authorized CPS personnel directly involved in your care: Intake Counselors, Counselors, Psychologists, Case Managers (crisis monitoring), Administrative Staff (scheduling only), and the Data Privacy Officer (compliance only). Your data will not be shared with other departments, faculty, parents, or third parties without your explicit consent, except under Section II above.</p>
                <p className="text-xs text-gray-600"><span className="font-medium">Retention:</span> Records are kept for a minimum of ten (10) years from your last session, after which they are securely disposed of.</p>
              </div>

              {/* IV. Consent for Data Processing */}
              <div className="border border-purple-200 rounded-lg p-3 bg-purple-50/50">
                <p className="font-bold text-purple-800 text-xs uppercase tracking-wide mb-2">IV. Consent for Data Processing (RA 10173 — Data Privacy Act of 2012)</p>
                <p className="text-xs text-gray-600 mb-1">Your mental health records are classified as <span className="font-medium">sensitive personal information</span> under RA 10173 and require your explicit consent to process.</p>
                <p className="text-xs text-gray-600 mb-1 font-medium">Your rights as a data subject:</p>
                <ul className="text-xs text-gray-600 ml-4 list-disc space-y-0.5 mb-2">
                  <li><span className="font-medium">Right to be informed</span> — to know how your data is being used</li>
                  <li><span className="font-medium">Right to access</span> — to request a copy of your personal data on file</li>
                  <li><span className="font-medium">Right to rectification</span> — to correct inaccurate personal data</li>
                  <li><span className="font-medium">Right to object</span> — to object to processing in certain circumstances</li>
                  <li><span className="font-medium">Right to erasure</span> — to request deletion, subject to legal retention requirements</li>
                </ul>
                <div className="bg-white/70 rounded p-2 border border-purple-100">
                  <p className="text-xs text-gray-500 font-medium">DLSU Data Privacy Officer</p>
                  <p className="text-xs text-gray-500">2401 Taft Avenue, Malate, Manila 1004 · dpo@dlsu.edu.ph</p>
                </div>
              </div>

            </div>

            {/* Checkboxes + buttons */}
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
                    {new Date(prefDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {prefTime && ` at ${(() => { const [h,m]=prefTime.split(':').map(Number); const ap=h>=12?'PM':'AM'; const h12=h%12||12; return `${h12}:${String(m).padStart(2,'0')} ${ap}`; })()}`}
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

      {/* Forms choice — fill now or later */}
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

      <div className="max-w-2xl mx-auto">
        {hasDraft && (
          <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm">
            <span className="text-blue-600 font-medium">Draft loaded from previous session.</span>
            <button onClick={clearDraft} className="text-xs text-gray-400 hover:text-red-500">Clear draft</button>
          </div>
        )}

        {purpose === 'intake_interview' && (
          <div className="mb-4 bg-sky-50 border border-sky-100 rounded-xl px-4 py-3 flex items-start gap-2">
            <ClipboardCheck size={14} className="text-sky-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-sky-700"><strong>Intake Interview selected:</strong> After submitting, you'll complete short intake forms (ICF, SPIF-IF, PHQ-4) to help your counselor prepare for your session.</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">Counseling Request</h2>
            <p className="text-xs text-gray-400 mt-0.5">De La Salle University — Counseling &amp; Psychology Services</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Purpose selection — card style */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Purpose <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PURPOSES.map(p => (
                  <label key={p.value}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition
                      ${purpose===p.value ? 'border-[#2563eb] bg-green-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
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
            </div>

            {purpose === 'others' && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Specify <span className="text-red-400">*</span></label>
                <input value={specifyOthers} onChange={e => setSpecifyOthers(e.target.value)} placeholder="Please specify…" className={IC} />
              </div>
            )}

            {/* Assigned Counselor (counseling / follow-up only) */}
            {['counseling', 'follow_up_counselling'].includes(purpose) && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Counselor <span className="text-red-400">*</span>
                </label>

                {assignedCounselor === undefined && (
                  <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                    <Loader2 size={13} className="animate-spin" /> Looking up your assigned counselor…
                  </div>
                )}

                {assignedCounselor && assignedCounselor !== undefined && (
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
                    <span className="text-[10px] font-semibold text-[#2563eb] bg-green-50 px-2 py-0.5 rounded-full border border-green-200">Assigned</span>
                  </div>
                )}

                {assignedCounselor === null && (
                  counselorList === null ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                      <Loader2 size={13} className="animate-spin" /> Loading counselors…
                    </div>
                  ) : counselorList.length > 0 ? (
                    <select value={selectedCounselorId} onChange={e => setSelectedCounselorId(e.target.value)} className={IC}>
                      <option value="">Select a counselor or psychologist…</option>
                      {counselorList.map((c: any) => (
                        <option key={c._id} value={c._id}>
                          {`${c.last_name?.toUpperCase()}, ${c.first_name}`}{c.role === 'PSYCHOLOGIST' ? ' — Psychologist' : ' — Counselor'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                      No counselors are currently available. Please contact the CPS office directly.
                    </p>
                  )
                )}
              </div>
            )}

            {/* Method + Date + Slot Picker */}
            {purpose !== 'others' && (purpose === 'intake_interview' || !!selectedCounselorId) && (
            <div className="space-y-3">

              {/* Step 1: F2F or Online */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Session Mode <span className="text-red-400">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: 'F2F',    label: 'Face to Face', sub: 'Visit the CPS office', icon: '🏫' },
                    { v: 'Online', label: 'Online',        sub: 'Video call session',   icon: '💻' },
                  ].map(m => (
                    <button key={m.v} type="button"
                      onClick={() => {
                        setSlotMethod(m.v);
                        setPrefDate(''); setPrefTime(''); setSlotCounselorId('');
                        setSlots([]); setNoSlotsNextDate(null); setRequestAnyway(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition ${
                        slotMethod === m.v
                          ? 'border-[#2563eb] bg-[#2563eb]/5'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}>
                      <span className="text-xl">{m.icon}</span>
                      <div>
                        <p className={`text-sm font-semibold ${slotMethod === m.v ? 'text-[#2563eb]' : 'text-gray-800'}`}>{m.label}</p>
                        <p className="text-[10px] text-gray-400">{m.sub}</p>
                      </div>
                      {slotMethod === m.v && <span className="ml-auto w-5 h-5 rounded-full bg-[#2563eb] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Platform (only for Online) */}
              {slotMethod === 'Online' && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs font-bold text-blue-700 mb-2">Preferred Platform</p>
                  <div className="flex gap-2">
                    {([
                      { value: 'google-meet' as const, label: 'Google Meet', icon: '🎥' },
                      { value: 'zoom'        as const, label: 'Zoom',        icon: '📹' },
                    ] as const).map(p => (
                      <button key={p.value} type="button"
                        onClick={() => setPrefPlatform(p.value)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-xs font-semibold transition ${
                          prefPlatform === p.value
                            ? 'border-blue-500 bg-blue-100 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
                        }`}>
                        <span>{p.icon}</span> {p.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-blue-500 mt-2">Your IC will send the meeting link before the session.</p>
                </div>
              )}

              {/* Step 3 & 4: Calendar + Slots */}
              {(() => {
                const { year, month } = calendarMonth;
                const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const blanks = (firstDay + 6) % 7; // shift to Mon-start
                const cells: (number | null)[] = [...Array(blanks).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
                while (cells.length % 7 !== 0) cells.push(null);
                const monthLabel = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

                const isSelectable = (day: number) => {
                  const ds = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const d = new Date(ds + 'T12:00:00');
                  return d >= minDate && d <= maxDate && !bookingRules.blackout_dates.includes(ds);
                };

                const seen = new Set<string>();
                const filtered = slots
                  .filter(s => s.method?.toLowerCase() === slotMethod.toLowerCase())
                  .filter(s => {
                    const key = purpose === 'intake_interview' ? s.time : `${s.time}|${s.counselor_id}`;
                    if (seen.has(key)) return false;
                    seen.add(key); return true;
                  });

                const selectedDayLabel = prefDate
                  ? new Date(prefDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                  : null;

                return (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                      Select Date &amp; Time <span className="text-red-400">*</span>
                    </label>

                    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                      <div className="flex gap-0 divide-x divide-gray-200">

                        {/* Calendar */}
                        <div className="flex-1 p-4 min-w-0">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-bold text-gray-800">{monthLabel}</p>
                            <div className="flex gap-1">
                              <button type="button" onClick={() => setCalendarMonth(m => {
                                const d = new Date(m.year, m.month - 1); return { year: d.getFullYear(), month: d.getMonth() };
                              })} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
                                <ChevronLeft size={14} />
                              </button>
                              <button type="button" onClick={() => setCalendarMonth(m => {
                                const d = new Date(m.year, m.month + 1); return { year: d.getFullYear(), month: d.getMonth() };
                              })} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-7 mb-1">
                            {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
                              <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-y-0.5">
                            {cells.map((day, i) => {
                              if (!day) return <div key={i} />;
                              const ds = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                              const selectable = isSelectable(day);
                              const isSelected = prefDate === ds;
                              const isToday = ds === toDS(new Date());
                              return (
                                <button key={i} type="button" disabled={!selectable}
                                  onClick={() => { setPrefDate(ds); setPrefTime(''); setSlotCounselorId(''); setRequestAnyway(false); setCalendarMonth({ year, month }); }}
                                  className={`mx-auto w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium transition
                                    ${isSelected ? 'bg-[#2563eb] text-white font-bold' :
                                      isToday && selectable ? 'ring-2 ring-[#2563eb] text-[#2563eb] font-bold' :
                                      selectable ? 'hover:bg-gray-100 text-gray-700' :
                                      'text-gray-300 cursor-not-allowed'}`}>
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Time slots panel */}
                        <div className="flex-1 flex flex-col min-w-0">
                          {!prefDate ? (
                            <div className="flex-1 flex items-center justify-center p-4">
                              <p className="text-xs text-gray-400 text-center">Select a date to see available slots</p>
                            </div>
                          ) : (
                            <>
                              <div className="px-3 pt-3 pb-2 border-b border-gray-100">
                                <p className="text-xs font-semibold text-gray-700">{selectedDayLabel}</p>
                                {prefTime && (
                                  <div className="mt-1.5 flex items-center gap-1.5">
                                    <span className="px-2.5 py-1 rounded-lg bg-[#2563eb] text-white text-xs font-bold">{fmtT(prefTime)}</span>
                                    <button type="button" onClick={() => { setPrefTime(''); setSlotCounselorId(''); }}
                                      className="text-[10px] text-gray-400 hover:text-gray-600 underline">change</button>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 overflow-y-auto max-h-56 p-2.5 space-y-1.5">
                                {slotsLoading && (
                                  <div className="flex items-center justify-center py-6 gap-2 text-xs text-gray-400">
                                    <Loader2 size={12} className="animate-spin" /> Loading…
                                  </div>
                                )}
                                {!slotsLoading && filtered.length > 0 && filtered.map((s, i) => {
                                  const isSel = prefTime === s.time && slotCounselorId === s.counselor_id;
                                  return (
                                    <button key={i} type="button"
                                      onClick={() => { setPrefTime(s.time); setSlotCounselorId(s.counselor_id); setRequestAnyway(false); }}
                                      className={`w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-center transition border
                                        ${isSel ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'border-gray-200 text-gray-700 hover:border-[#2563eb] hover:text-[#2563eb]'}`}>
                                      {fmtT(s.time)}
                                    </button>
                                  );
                                })}
                                {!slotsLoading && filtered.length === 0 && slots.length > 0 && (
                                  <div className="px-2 py-3 text-center">
                                    <p className="text-xs text-amber-700">No {slotMethod === 'Online' ? 'online' : 'F2F'} slots.</p>
                                    {slots.some(s => s.method?.toLowerCase() !== slotMethod.toLowerCase()) && (
                                      <button type="button" onClick={() => { setSlotMethod(slotMethod === 'F2F' ? 'Online' : 'F2F'); setPrefTime(''); setSlotCounselorId(''); }}
                                        className="text-[11px] font-bold text-amber-700 underline mt-1">
                                        Switch to {slotMethod === 'F2F' ? 'Online' : 'F2F'}
                                      </button>
                                    )}
                                  </div>
                                )}
                                {!slotsLoading && slots.length === 0 && !requestAnyway && (
                                  <div className="px-2 py-3 space-y-2 text-center">
                                    <p className="text-xs text-gray-500">No slots on this date.</p>
                                    {noSlotsNextDate && (
                                      <button type="button" onClick={() => { setPrefDate(noSlotsNextDate); setCalendarMonth({ year: parseInt(noSlotsNextDate.split('-')[0]), month: parseInt(noSlotsNextDate.split('-')[1]) - 1 }); }}
                                        className="text-[11px] font-bold text-[#2563eb] underline block">
                                        Next: {new Date(noSlotsNextDate + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' })}
                                      </button>
                                    )}
                                    <button type="button" onClick={() => setRequestAnyway(true)}
                                      className="w-full py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 transition">
                                      Open request
                                    </button>
                                  </div>
                                )}
                                {requestAnyway && (
                                  <div className="px-2 py-3 text-center space-y-1">
                                    <p className="text-xs font-semibold text-blue-700">Open request</p>
                                    <p className="text-[10px] text-blue-500">OA will schedule you</p>
                                    <button type="button" onClick={() => setRequestAnyway(false)} className="text-[10px] text-blue-400 underline">Change</button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            )} {/* end purpose !== 'others' */}

            {/* Others open-request note */}
            {purpose === 'others' && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <CalendarCheck size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-blue-800">Open request</p>
                  <p className="text-xs text-blue-600 mt-0.5">A CPS staff member will review your concern and contact you to arrange a schedule.</p>
                </div>
              </div>
            )}

            {/* Concern */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Concern / Need <span className="text-red-400">*</span></label>
              <textarea value={concern} onChange={e => setConcern(e.target.value)} rows={3} placeholder="Briefly describe what you'd like to talk about or get help with…"
                className={`${IC} resize-none`} />
            </div>

            {/* Referral */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Referral</label>
              <div className="flex gap-4">
                {[{ v:'self-referred', l:'Self Referred' },{ v:'referred', l:'Referred by someone' }].map(r => (
                  <label key={r.v} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input type="radio" name="referral" value={r.v} checked={referralType===r.v} onChange={() => setReferralType(r.v)} className="w-4 h-4 accent-[#2563eb]" />{r.l}
                  </label>
                ))}
              </div>
              {referralType === 'referred' && (
                <input value={referredBy} onChange={e => setReferredBy(e.target.value)} placeholder="Name or organization that referred you" className={`mt-2 ${IC}`} />
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />{error}
              </div>
            )}

            <div className="flex gap-2 pt-1 border-t border-gray-100">
              <button type="button" onClick={() => router.push('/my-appointments')} className="px-4 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50 transition">Go Back</button>
              <button type="button" onClick={saveDraft} disabled={savingDraft} className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition">
                <Save size={13} />{savingDraft ? 'Saved!' : 'Save Draft'}
              </button>
              <button type="submit" disabled={submitting || consentGiven === false}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-40 transition" style={{ backgroundColor:'#2563eb' }}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
                {submitting ? 'Submitting…' : purpose==='intake_interview' ? 'Book & Continue to Intake Forms' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Office hours: {fmtT(bookingRules.operating_hours_start)} – {fmtT(bookingRules.operating_hours_end)} ·{' '}
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].filter((_,i) => bookingRules.operating_days.includes(i)).join(', ')}
        </p>
      </div>
    </DashboardPageWrapper>
  );
}
