'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import Image from 'next/image';
import {
  AlertCircle, CheckCircle, Loader2, Save, Check,
  ChevronRight, ChevronLeft, User, Brain, ClipboardCheck,
  BookOpen, Phone, Clock, CalendarCheck, UserCheck, ClipboardList,
  MapPin, Video, PenLine,
  Building2, AlertTriangle, FolderOpen, CalendarDays, UserX, Lock, Info,
} from 'lucide-react';
import { SignaturePad } from '@/components/SignaturePad';

const PURPOSES = [
  { value: 'intake_interview', label: "First Time",           desc: "I'd like to talk to someone for the first time" },
  { value: 'counseling',       label: 'Continuing Sessions',  desc: 'Schedule your next counseling session' },
  { value: 'follow_up',        label: 'Follow-Up Session',    desc: 'Book a follow-up with your counselor' },
  { value: 'others',           label: 'Something else',       desc: "Tell us a bit more and we'll find the right fit" },
];

const PHQ4Q = [
  { text: 'Little interest or pleasure in doing things' },
  { text: 'Feeling down, depressed, or hopeless' },
  { text: 'Feeling nervous, anxious or on edge' },
  { text: 'Not being able to stop or control worrying' },
];

const FREQ = [
  { v: 0, s: 'Not at all',       dots: 1, textColor: '#93C5FD', selBg: '#93C5FD' },
  { v: 1, s: 'A few days',       dots: 2, textColor: '#60A5FA', selBg: '#60A5FA' },
  { v: 2, s: 'More than half',   dots: 3, textColor: '#3B82F6', selBg: '#3B82F6' },
  { v: 3, s: 'Almost every day', dots: 4, textColor: '#1D4ED8', selBg: '#1D4ED8' },
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

const DRAFT_KEY_PREFIX = 'bookAppointmentDraft_v2';
const IC = 'w-full px-3 py-2.5 text-sm rounded-lg outline-none transition';
const IC_S: React.CSSProperties = { border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' };
const onFocusIn  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-surface)'; };
const onFocusOut = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; };

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
      <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
        {label}{req && <span className="ml-1" style={{ color: 'var(--color-danger)' }}>*</span>}
      </label>
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
              <div className="w-7 h-7 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all"
                style={done
                  ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: 'white' }
                  : active
                  ? { background: 'var(--color-primary-surface)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }
                  : { background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                {done ? <Check size={12} /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className="my-1" style={{ width: 1, minHeight: 28, borderLeft: '2px dashed var(--color-border)' }} />
              )}
            </div>
            <div className="pb-5 min-w-0">
              <p className="text-xs font-semibold leading-tight"
                style={{ color: active ? 'var(--color-primary)' : done ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>
                {step.label}
              </p>
              {step.desc && (active || done) && (
                <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--color-text-muted)' }}>{step.desc}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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

  const [activeAppt, setActiveAppt] = useState<any>(null);
  const [bookingGate, setBookingGate] = useState<string | null>(null);
  const [gateMessage, setGateMessage] = useState('');
  const [rebookDeadline, setRebookDeadline] = useState<string | null>(null);
  const [bypassForOthers, setBypassForOthers] = useState(false);

  const [bookingRules, setBookingRules] = useState({
    operating_days: [1,2,3,4,5], operating_hours_start: '09:00', operating_hours_end: '16:00',
    slot_duration_minutes: 30, min_days_ahead: 1, max_days_ahead: 30, blackout_dates: [] as string[],
  });

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
  const [slots, setSlots]                 = useState<{ time: string; method: string; counselor_id: string; counselor_name: string; count?: number }[]>([]);
  const [slotsLoading, setSlotsLoading]   = useState(false);
  const [noSlotsNextDate, setNoSlotsNextDate] = useState<string | null>(null);
  const [slotsBlockedMsg, setSlotsBlockedMsg] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [requestAnyway, setRequestAnyway] = useState(false);

  const [assignedCounselor, setAssignedCounselor] = useState<{ id: string; name: string; role: string } | null | undefined>(undefined);
  const [counselorList, setCounselorList]   = useState<any[] | null>(null);
  const [selectedCounselorId, setSelectedCounselorId] = useState('');

  const [emaLabel, setEmaLabel] = useState<string | null>(null);

  const [showIntake, setShowIntake]             = useState(false);
  const [intakeStep, setIntakeStep]             = useState(0);
  const [signature, setSignature]               = useState<string | null>(null);
  const [intakeError, setIntakeError]           = useState('');
  const [intakeSubmitting, setIntakeSubmitting] = useState(false);
  const [appointmentId, setAppointmentId]       = useState('');
  const [formSkipped, setFormSkipped]           = useState(false);
  const [showConfirm, setShowConfirm]           = useState(false);
  const [showFormsChoice, setShowFormsChoice]   = useState(false);
  const [agreedToTerms, setAgreedToTerms]       = useState(false);

  const [bookStep, setBookStep] = useState(0);

  const [icf, setIcf] = useState({
    first_name:'', last_name:'', middle_name:'', email:'', student_id:'', phone:'',
    college:'', program:'', year_level:'', referral_source:'self-referred', referred_by:'',
    emergency_contact_name:'', emergency_contact_relationship:'', emergency_contact_phone:'',
    presenting_concern:'', service_requested:'personal_counseling',
    consent_to_service: true, consent_to_data: true,
  });
  const [spif, setSpif] = useState({
    birthdate:'', gender:'', religion:'', nationality:'Filipino', address:'',
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
      // Block booking if consent has not been given — redirect to dashboard where consent modal shows
      try {
        const cr = await fetch(api('/api/consent/status'), { headers: { Authorization: `Bearer ${token}` } });
        if (cr.ok) { const cd = await cr.json(); if (!cd.consent_given) { router.replace('/dashboard'); return; } }
      } catch {}
      try { const r = await fetch(api('/api/staff/settings/booking-rules'), { headers: { Authorization: `Bearer ${token}` } }); if (r.ok) setBookingRules(await r.json()); } catch {}
      try {
        const r = await fetch(api('/api/appointments/active'), { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) {
          const d = await r.json();
          const gate = d.booking_gate ?? (d.can_self_book ? 'eligible' : 'no_case');
          setBookingGate(gate);
          setGateMessage(d.message ?? '');
          if (gate === 'noshow_rebook' && d.rebook_deadline) setRebookDeadline(d.rebook_deadline);
          if (d.case_id || gate === 'counselor_owns_scheduling' || gate === 'noshow_rebook') setPurpose('counseling');
          if (d.has_active_appointment) setActiveAppt(d);
        }
      } catch {}
      try {
        const r = await fetch(api('/api/mhbot/my-perma'), { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) { const d = await r.json(); if (d.mhbot_username) setEmaLabel(d.latest_label ?? null); }
      } catch {}
      const draftKey = `${DRAFT_KEY_PREFIX}_${u?._id || 'guest'}`;
      const draft = localStorage.getItem(draftKey);
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
            setIcf(prev => ({ ...prev, first_name: u.first_name||'', last_name: u.last_name||'', email: u.email||'', student_id: u.student_number||u.student_id||'', college: u.college||'', program: u.program||u.course||'', phone: u.phone||'', emergency_contact_name: u.emergency_contact||'', emergency_contact_relationship: u.emergency_contact_relationship||'', emergency_contact_phone: u.emergency_phone||'' }));
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
        if (d.counselor_id) { setAssignedCounselor({ id: d.counselor_id, name: d.counselor_name, role: d.role }); setSelectedCounselorId(d.counselor_id); }
        else {
          setAssignedCounselor(null);
          fetch(api('/api/appointments/available-counselors'), { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(d2 => setCounselorList(d2.users ?? [])).catch(() => setCounselorList([]));
        }
      }).catch(() => setAssignedCounselor(null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purpose]);

  useEffect(() => {
    if (!prefDate || purpose === 'others') {
      setSlots([]); setNoSlotsNextDate(null); setSlotsBlockedMsg(null); return;
    }
    const token = localStorage.getItem('token');
    setSlotsLoading(true); setPrefTime(''); setSlotCounselorId(''); setSlotsBlockedMsg(null);
    if (purpose === 'intake_interview') {
      fetch(api(`/api/availability/open-slots?date=${prefDate}`), { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => {
          if (d.is_holiday) {
            setSlotsBlockedMsg(`No sessions on ${d.holiday_name} — this is a declared university holiday.`);
            setSlots([]); setNoSlotsNextDate(null);
          } else {
            setSlots(d.slots || []); setNoSlotsNextDate(d.next_available_date || null);
          }
        })
        .catch(() => setSlots([])).finally(() => setSlotsLoading(false));
    } else if (selectedCounselorId) {
      fetch(api(`/api/availability/free-slots?counselor_id=${selectedCounselorId}&date=${prefDate}`), { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => {
          if (d.is_holiday) {
            setSlotsBlockedMsg(`No sessions on ${d.holiday_name} — this is a declared university holiday.`);
            setSlots([]); setNoSlotsNextDate(null);
          } else if (d.is_leave) {
            setSlotsBlockedMsg('Your counselor is not available on this date. Please choose another day.');
            setSlots([]); setNoSlotsNextDate(null);
          } else {
            const method = d.session_method || 'in-person';
            const name = assignedCounselor ? assignedCounselor.name : '';
            setSlots((d.slots || []).map((t: string) => ({ time: t, method, counselor_id: selectedCounselorId, counselor_name: name })));
            setNoSlotsNextDate(null);
          }
        }).catch(() => setSlots([])).finally(() => setSlotsLoading(false));
    } else { setSlots([]); setSlotsLoading(false); }
  }, [prefDate, selectedCounselorId, purpose]); // eslint-disable-line react-hooks/exhaustive-deps

  const myDraftKey = `${DRAFT_KEY_PREFIX}_${user?._id || 'guest'}`;
  const saveDraft = () => { setSavingDraft(true); localStorage.setItem(myDraftKey, JSON.stringify({ purpose, specifyOthers, concern, referralType, referredBy, prefDate, prefTime })); setHasDraft(true); setTimeout(() => setSavingDraft(false), 600); };
  const clearDraft = () => { localStorage.removeItem(myDraftKey); setHasDraft(false); };

  const today = new Date();
  const minDate = new Date(today); minDate.setDate(today.getDate() + bookingRules.min_days_ahead);
  const maxDate = (() => {
    const d = new Date(today); d.setDate(today.getDate() + bookingRules.max_days_ahead);
    if (rebookDeadline) { const dl = new Date(rebookDeadline + 'T23:59:59'); return dl < d ? dl : d; }
    return d;
  })();
  const toDS = (d: Date) => d.toISOString().split('T')[0];

  const handleNextBookStep = () => {
    setError(null);
    if (bookStep === 0) {
      if (!purpose) { setError('Please select a session type.'); return; }
      if (purpose !== 'others' && !slotMethod) { setError('Please select a session mode.'); return; }
      if ((purpose === 'counseling' || purpose === 'follow_up') && assignedCounselor === null && !selectedCounselorId) { setError('Please select a counselor.'); return; }
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
      if ((purpose === 'counseling' || purpose === 'follow_up') && !selectedCounselorId && !requestAnyway) { setError('Please select a counselor.'); return; }
    }
    if (referralType === 'referred' && !referredBy.trim()) { setError('Please specify who referred you.'); return; }
    if (prefDate && bookingRules.blackout_dates.includes(prefDate)) { setError('Selected date is a CPS holiday.'); return; }
    if (!agreedToTerms) { setError('Please agree to the informed consent and data privacy terms to continue.'); return; }
    setShowConfirm(true);
  };

  const handleConfirmedBook = async () => {
    setShowConfirm(false); setSubmitting(true); setError(null);
    try {
      const token = localStorage.getItem('token');
      const fp = purpose === 'others' ? specifyOthers.trim() : purpose;
      const body: Record<string, any> = {
        purpose: fp, concern, preferred_method: slotMethod === 'F2F' ? 'in-person' : 'online',
        preferred_platform: slotMethod?.toLowerCase() === 'online' ? prefPlatform : null,
        referral_type: referralType, referred_by: referralType === 'referred' ? referredBy : null,
        agreed_to_terms: agreedToTerms,
      };
      if (!requestAnyway && prefDate && prefTime) { body.preferred_date = prefDate; body.preferred_time = prefTime; if (slotCounselorId) body.counselor_id = slotCounselorId; }
      if (requestAnyway && selectedCounselorId && purpose !== 'intake_interview') body.counselor_id = selectedCounselorId;
      const r = await fetch(api('/api/appointments/request'), { method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify(body) });
      if (r.status === 401) { router.replace('/login'); return; }
      const d = await r.json();
      if (r.ok) {
        clearDraft();
        const apptId = d.counseling_id || d.appointment_id || '';
        setTicketNumber(apptId); setAppointmentId(apptId);
        if (purpose === 'intake_interview') {
          setIcf(p => ({ ...p, first_name: user?.first_name||'', last_name: user?.last_name||'', email: user?.email||'', student_id: user?.student_id||user?.id_number||'', phone: user?.phone||'', college: user?.college||'', program: user?.program||user?.course||'', emergency_contact_name: user?.emergency_contact||'', emergency_contact_relationship: user?.emergency_contact_relationship||'', emergency_contact_phone: user?.emergency_phone||'', presenting_concern: concern, referral_source: referralType==='referred'?'referred':'self-referred', referred_by: referredBy }));
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
      <div className="flex items-center justify-center h-48">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    </DashboardPageWrapper>
  );

  // Gate
  type GateCfg = { icon: React.ReactNode; title: string; bg: string; border: string; text: string; cta?: { label: string; href: string }; info?: string };
  const GATE_CFG: Record<string, GateCfg> = {
    has_active_appointment:    { icon:<ClipboardList size={36} />, title:'You already have an active appointment',         bg:'var(--color-warning-surface)', border:'var(--color-warning)', text:'var(--color-warning)',         cta:{ label:'View Appointments', href:'/my-appointments' } },
    no_case:                   { icon:<Building2 size={36} />,     title:'Walk-in intake required for first-time clients', bg:'var(--color-primary-surface)', border:'var(--color-primary)', text:'var(--color-primary)',
                                  info:'Visit us at the Counseling and Psychological Services office (LS Building, Room 101) during walk-in hours: Mon–Fri 8:00 AM – 5:00 PM. Call us at ext. 5000 to confirm availability.' },
    awaiting_intake:           { icon:<Clock size={36} />,         title:'Your intake appointment is pending',             bg:'var(--color-warning-surface)', border:'var(--color-warning)', text:'var(--color-warning)',         cta:{ label:'View Appointments', href:'/my-appointments' } },
    pending_termination:       { icon:<AlertTriangle size={36} />, title:'Your case is pending closure',                   bg:'var(--color-warning-surface)', border:'var(--color-warning)', text:'var(--color-warning)' },
    case_closed:               { icon:<FolderOpen size={36} />,    title:'Your case is currently closed',                  bg:'var(--color-bg)',              border:'var(--color-border)',   text:'var(--color-text-secondary)' },
    counselor_owns_scheduling: { icon:<CalendarDays size={36} />,  title:'Your counselor will schedule your next session', bg:'var(--color-success-surface)', border:'var(--color-success)', text:'var(--color-success)',         cta:{ label:'View My Appointments', href:'/my-appointments' } },
    no_active_counselor:       { icon:<UserX size={36} />,         title:'No counselor assigned yet',                      bg:'var(--color-warning-surface)', border:'var(--color-warning)', text:'var(--color-warning)' },
  };
  if (bookingGate && bookingGate !== 'eligible' && bookingGate !== 'noshow_rebook' && bookingGate !== 'counselor_owns_scheduling' && !resumeId && !bypassForOthers) {
    const cfg = GATE_CFG[bookingGate] ?? { icon:<Lock size={36} />, title:'Booking unavailable', bg:'var(--color-bg)', border:'var(--color-border)', text:'var(--color-text-secondary)' };
    const canBypass = bookingGate === 'counselor_owns_scheduling';
    return (
      <DashboardPageWrapper title="Book Appointment" subtitle="">

        <div className="max-w-lg mx-auto rounded-2xl p-8 text-center"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
          <div className="flex justify-center mb-4" style={{ color: cfg.text }}>{cfg.icon}</div>
          <h2 className="text-base font-bold mb-2" style={{ color: cfg.text }}>{cfg.title}</h2>
          <p className="text-sm opacity-80 mb-3" style={{ color: cfg.text }}>{gateMessage}</p>
          {cfg.info && (
            <div className="rounded-xl px-4 py-3 mb-4 text-left text-xs leading-relaxed" style={{ background: 'rgba(0,0,0,0.05)', color: cfg.text }}>
              {cfg.info}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {cfg.cta && (
              <button onClick={() => router.push(cfg.cta!.href)}
                className="px-5 py-2.5 text-white text-sm font-medium rounded-xl transition hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>{cfg.cta.label}</button>
            )}
            <button onClick={() => router.push('/dashboard')}
              className="px-5 py-2.5 text-sm font-medium rounded-xl transition border hover:opacity-80"
              style={{ borderColor: cfg.border, color: cfg.text }}>Dashboard</button>
          </div>
          {canBypass && (
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
              <p className="text-xs mb-2" style={{ color: cfg.text, opacity: 0.7 }}>
                Have an urgent concern or something else to raise?
              </p>
              <button
                onClick={() => { setPurpose('others'); setSpecifyOthers('General Request'); setBookStep(2); setBypassForOthers(true); }}
                className="text-xs font-semibold underline underline-offset-2 transition hover:opacity-70"
                style={{ color: cfg.text }}>
                Submit a general request instead →
              </button>
            </div>
          )}
        </div>
      </DashboardPageWrapper>
    );
  }

  const initials = ((user?.first_name?.charAt(0)||'') + (user?.last_name?.charAt(0)||'')).toUpperCase() || 'U';

  // Intake packet
  if (showIntake) {
    const STEP_HEADER_BG = ['var(--color-primary-surface)', 'var(--color-bg)', 'var(--color-warning-surface)', 'var(--color-primary-surface)'];
    const STEP_ICON_BG   = ['#DBEAFE', '#EDE9FE', '#FEF3C7', '#DBEAFE'];
    const STEP_ICON_COLOR= ['#2352CC', '#7C3AED', '#D97706', '#2352CC'];
    return (
      <DashboardPageWrapper title="Book Appointment" subtitle="Complete your intake forms">
        <div className="flex gap-5 items-start">
          {/* Left sidebar */}
          <div className="w-52 flex-shrink-0 hidden lg:flex flex-col gap-4">
            <div className="rounded-2xl border shadow-card p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-primary)' }}>
                  <Image src="/dlsu-seal.svg" alt="DLSU" width={22} height={22} className="brightness-[10]" />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>Intake Forms</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>CPS · DLSU</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--color-primary)' }}>
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{user?.first_name} {user?.last_name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Student</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-5" style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>
                <CheckCircle size={13} className="flex-shrink-0" style={{ color: 'var(--color-success)' }} />
                <div className="min-w-0">
                  <p className="text-xs font-bold" style={{ color: 'var(--color-success)' }}>Slot Reserved</p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-success)' }}>Ticket #{ticketNumber}</p>
                </div>
              </div>
              <VerticalStepTracker steps={INTAKE_STEPS} current={intakeStep} />
            </div>
          </div>

          {/* Form content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Mobile step progress */}
            <div className="lg:hidden flex items-center gap-1 mb-2">
              {INTAKE_STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all"
                    style={i < intakeStep
                      ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: 'white' }
                      : i === intakeStep
                      ? { background: 'var(--color-primary-surface)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }
                      : { background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                    {i < intakeStep ? <Check size={10} /> : i + 1}
                  </div>
                  {i < INTAKE_STEPS.length - 1 && (
                    <div className="h-px w-8" style={{ background: i < intakeStep ? 'var(--color-primary)' : 'var(--color-border)' }} />
                  )}
                </div>
              ))}
              <span className="ml-2 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{INTAKE_STEPS[intakeStep]?.label}</span>
            </div>

            {/* Booked banner */}
            <div className="flex items-start gap-3 rounded-2xl px-5 py-4" style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>
              <CheckCircle size={18} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-success)' }} />
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: 'var(--color-success)' }}>Appointment Booked — Ticket #{ticketNumber}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-success)' }}>Please complete the intake forms below. Your IC will use this information during your session.</p>
              </div>
            </div>

            {intakeError && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />{intakeError}
              </div>
            )}

            <div className="rounded-2xl border shadow-card overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              {/* Step header */}
              <div className="px-5 py-4 flex items-center gap-3" style={{ background: STEP_HEADER_BG[intakeStep], borderBottom: '1px solid var(--color-border)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: STEP_ICON_BG[intakeStep] }}>
                  {intakeStep===0 && <ClipboardCheck size={16} style={{ color: STEP_ICON_COLOR[0] }} />}
                  {intakeStep===1 && <BookOpen size={16} style={{ color: STEP_ICON_COLOR[1] }} />}
                  {intakeStep===2 && <Brain size={16} style={{ color: STEP_ICON_COLOR[2] }} />}
                  {intakeStep===3 && <PenLine size={16} style={{ color: STEP_ICON_COLOR[3] }} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {intakeStep===0 ? 'Contact Form' : intakeStep===1 ? 'Personal Background' : intakeStep===2 ? 'Mental Health Screener' : 'Signature'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {intakeStep===0 ? 'Basic information, emergency contact, and presenting concern' :
                     intakeStep===1 ? 'Personal, family, and health background — helps your counselor prepare' :
                     intakeStep===2 ? 'Short 4-question mental health screening — over the last 2 weeks' :
                                     'Sign to confirm that all information provided is true and accurate'}
                  </p>
                </div>
                <span className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>Step {intakeStep+1} / 4</span>
              </div>

              <div className="p-5 space-y-4">
                {/* ICF */}
                {intakeStep === 0 && (
                  <div className="space-y-4">
                    <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                      <p className="text-xs font-bold flex items-center gap-1" style={{ color: 'var(--color-primary)' }}><User size={11} /> Student Information</p>
                      <div className="grid grid-cols-3 gap-2">
                        <F label="First Name" req><input className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={icf.first_name} onChange={e => setIcf(p=>({...p,first_name:e.target.value}))} placeholder="Juan" /></F>
                        <F label="Middle Name"><input className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={icf.middle_name} onChange={e => setIcf(p=>({...p,middle_name:e.target.value}))} placeholder="Optional" /></F>
                        <F label="Last Name" req><input className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={icf.last_name} onChange={e => setIcf(p=>({...p,last_name:e.target.value}))} placeholder="dela Cruz" /></F>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <F label="Email" req><input type="email" className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={icf.email} onChange={e => setIcf(p=>({...p,email:e.target.value}))} /></F>
                        <F label="Student ID"><input className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={icf.student_id} onChange={e => setIcf(p=>({...p,student_id:e.target.value}))} /></F>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <F label="Phone"><input className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={icf.phone} onChange={e => setIcf(p=>({...p,phone:e.target.value}))} /></F>
                        <F label="College"><input className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={icf.college} onChange={e => setIcf(p=>({...p,college:e.target.value}))} placeholder="e.g. CLA" /></F>
                        <F label="Program"><input className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={icf.program} onChange={e => setIcf(p=>({...p,program:e.target.value}))} placeholder="e.g. AB Psych" /></F>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <F label="Year Level">
                          <select className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={icf.year_level} onChange={e => setIcf(p=>({...p,year_level:e.target.value}))}>
                            <option value="">— Select —</option>
                            {['1st Year','2nd Year','3rd Year','4th Year','5th Year','Graduate'].map(y=><option key={y} value={y}>{y}</option>)}
                          </select>
                        </F>
                        <F label="Service Requested">
                          <select className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={icf.service_requested} onChange={e => setIcf(p=>({...p,service_requested:e.target.value}))}>
                            <option value="personal_counseling">Personal Counseling</option>
                            <option value="academic_counseling">Academic Counseling</option>
                            <option value="career_counseling">Career Counseling</option>
                            <option value="crisis_support">Crisis Support</option>
                          </select>
                        </F>
                      </div>
                    </div>

                    <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                      <p className="text-xs font-bold flex items-center gap-1" style={{ color: 'var(--color-primary)' }}><Phone size={11} /> Emergency Contact</p>
                      <div className="grid grid-cols-3 gap-2">
                        <F label="Full Name"><input className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={icf.emergency_contact_name} onChange={e => setIcf(p=>({...p,emergency_contact_name:e.target.value}))} placeholder="Name" /></F>
                        <F label="Relationship"><input className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={icf.emergency_contact_relationship} onChange={e => setIcf(p=>({...p,emergency_contact_relationship:e.target.value}))} placeholder="e.g. Parent" /></F>
                        <F label="Phone"><input className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={icf.emergency_contact_phone} onChange={e => setIcf(p=>({...p,emergency_contact_phone:e.target.value}))} placeholder="+63 9XX XXX XXXX" /></F>
                      </div>
                    </div>

                    <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                      <p className="text-xs font-bold flex items-center gap-1" style={{ color: 'var(--color-primary)' }}><ClipboardCheck size={11} /> Presenting Concern</p>
                      <F label="What would you like to talk about? (A few words is enough)" req>
                        <textarea className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} rows={3} value={icf.presenting_concern} onChange={e => setIcf(p=>({...p,presenting_concern:e.target.value}))} placeholder="What's been on your mind lately? You don't need to have everything figured out…" />
                      </F>
                    </div>
                  </div>
                )}

                {/* SPIF */}
                {intakeStep === 1 && (
                  <div className="space-y-4">
                    <p className="text-xs rounded-lg px-3 py-2" style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>This background information is confidential and helps your counselor better understand your situation.</p>
                    <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                      <p className="text-xs font-bold" style={{ color: '#7C3AED' }}>Personal Information</p>
                      <div className="grid grid-cols-3 gap-2">
                        <F label="Date of Birth"><input type="date" className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={spif.birthdate} onChange={e => setSpif(p=>({...p,birthdate:e.target.value}))} /></F>
                        <F label="Gender">
                          <select className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={spif.gender} onChange={e => setSpif(p=>({...p,gender:e.target.value}))}>
                            <option value="">— Select —</option>
                            {['male','female','non-binary','prefer_not_to_say','other'].map(v=><option key={v} value={v}>{v.replace('_',' ')}</option>)}
                          </select>
                        </F>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <F label="Religion"><input className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={spif.religion} onChange={e => setSpif(p=>({...p,religion:e.target.value}))} placeholder="e.g. Roman Catholic" /></F>
                        <F label="Nationality"><input className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={spif.nationality} onChange={e => setSpif(p=>({...p,nationality:e.target.value}))} /></F>
                      </div>
                      <F label="Home Address"><input className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={spif.address} onChange={e => setSpif(p=>({...p,address:e.target.value}))} placeholder="City, Province" /></F>
                    </div>

                    <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                      <p className="text-xs font-bold" style={{ color: '#7C3AED' }}>Family</p>
                      <div className="grid grid-cols-2 gap-2">
                        <F label="Family Composition">
                          <select className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={spif.family_composition} onChange={e => setSpif(p=>({...p,family_composition:e.target.value}))}>
                            <option value="complete">Complete (both parents)</option>
                            <option value="separated">Separated / Divorced</option>
                            <option value="single_parent">Single Parent</option>
                            <option value="extended">Extended Family</option>
                            <option value="other">Other</option>
                          </select>
                        </F>
                        <F label="Currently Living With"><input className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={spif.living_with} onChange={e => setSpif(p=>({...p,living_with:e.target.value}))} placeholder="e.g. Parents, Dormitory" /></F>
                      </div>
                    </div>

                    <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                      <p className="text-xs font-bold" style={{ color: '#7C3AED' }}>Health &amp; Mental Health History</p>
                      <F label="Existing Medical Conditions"><input className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={spif.existing_medical_conditions} onChange={e => setSpif(p=>({...p,existing_medical_conditions:e.target.value}))} placeholder="None, or briefly describe" /></F>
                      <F label="Current Medications"><input className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={spif.current_medications} onChange={e => setSpif(p=>({...p,current_medications:e.target.value}))} placeholder="None, or list medications" /></F>
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input type="checkbox" checked={spif.previous_counseling} onChange={e => setSpif(p=>({...p,previous_counseling:e.target.checked}))} className="mt-0.5 w-4 h-4" style={{ accentColor: 'var(--color-primary)' }} />
                        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>I have previously received counseling or therapy</span>
                      </label>
                      {spif.previous_counseling && <F label="Brief details"><input className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={spif.previous_counseling_details} onChange={e => setSpif(p=>({...p,previous_counseling_details:e.target.value}))} placeholder="When, where, for what reason" /></F>}
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input type="checkbox" checked={spif.previous_psychiatric} onChange={e => setSpif(p=>({...p,previous_psychiatric:e.target.checked}))} className="mt-0.5 w-4 h-4" style={{ accentColor: 'var(--color-primary)' }} />
                        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>I have previously received psychiatric treatment or been given a diagnosis</span>
                      </label>
                      {spif.previous_psychiatric && <F label="Brief details"><input className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} value={spif.previous_psychiatric_details} onChange={e => setSpif(p=>({...p,previous_psychiatric_details:e.target.value}))} placeholder="Diagnosis, medications if any, when" /></F>}
                    </div>
                  </div>
                )}

                {/* PHQ-4 */}
                {intakeStep === 2 && (
                  <div className="space-y-3">
                    {(emaLabel === 'Struggling' || emaLabel === 'In Crisis') && (
                      <div className="rounded-xl px-4 py-3 border flex items-start gap-3"
                        style={emaLabel === 'In Crisis'
                          ? { background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)' }
                          : { background: 'var(--color-warning-surface)', borderColor: 'var(--color-warning)' }}>
                        <AlertCircle size={15} className="flex-shrink-0 mt-0.5"
                          style={{ color: emaLabel === 'In Crisis' ? 'var(--color-danger)' : 'var(--color-warning)' }} />
                        <div className="flex-1">
                          <p className="text-xs font-bold"
                            style={{ color: emaLabel === 'In Crisis' ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                            Your EMA data shows you are currently {emaLabel}
                          </p>
                          <p className="text-xs mt-0.5"
                            style={{ color: emaLabel === 'In Crisis' ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                            Your IC will already be briefed. You can complete the screener below, or skip it.
                          </p>
                        </div>
                        <button onClick={() => { setIntakeError(''); setIntakeStep(3); }}
                          className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                          style={emaLabel === 'In Crisis'
                            ? { background: 'var(--color-danger)', color: 'white' }
                            : { background: 'var(--color-warning)', color: 'white' }}>
                          Skip PHQ-4
                        </button>
                      </div>
                    )}
                    <div className="rounded-xl px-4 py-3" style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' }}>
                      <p className="text-xs font-bold" style={{ color: 'var(--color-warning)' }}>Over the last 2 weeks, how often have you felt this way?</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-warning)' }}>There are no right or wrong answers. This helps your counselor understand how you've been doing.</p>
                    </div>
                    <div className="h-px" style={{ background: 'var(--color-border)' }} />
                    {PHQ4Q.slice(0,2).map((q,i) => (
                      <div key={i} className="rounded-xl shadow-card p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full mr-2 text-xs font-bold"
                            style={{ background: '#DBEAFE', color: '#1E40AF' }}>{i+1}</span>
                          {q.text}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {FREQ.map(opt => {
                            const sel = phq4[i] === opt.v;
                            return (
                              <button key={opt.v} onClick={() => { const n=[...phq4]; n[i]=opt.v; setPhq4(n); }}
                                className="py-2.5 px-2 rounded-xl text-xs font-semibold border-2 transition text-center"
                                style={sel
                                  ? { background: opt.selBg, borderColor: opt.selBg, color: 'white' }
                                  : { background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: opt.textColor }}>
                                <span className="block text-[11px] font-bold mb-0.5 tabular-nums" aria-hidden>{opt.v}</span>{opt.s}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <div className="h-px mt-2" style={{ background: 'var(--color-border)' }} />
                    {PHQ4Q.slice(2,4).map((q,i) => (
                      <div key={i} className="rounded-xl shadow-card p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full mr-2 text-xs font-bold"
                            style={{ background: '#FEF3C7', color: '#92400E' }}>{i+3}</span>
                          {q.text}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {FREQ.map(opt => {
                            const sel = phq4[i+2] === opt.v;
                            return (
                              <button key={opt.v} onClick={() => { const n=[...phq4]; n[i+2]=opt.v; setPhq4(n); }}
                                className="py-2.5 px-2 rounded-xl text-xs font-semibold border-2 transition text-center"
                                style={sel
                                  ? { background: opt.selBg, borderColor: opt.selBg, color: 'white' }
                                  : { background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: opt.textColor }}>
                                <span className="block text-[11px] font-bold mb-0.5 tabular-nums" aria-hidden>{opt.v}</span>{opt.s}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Signature */}
                {intakeStep === 3 && (
                  <div className="space-y-4">
                    <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary)' }}>
                      <p className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>Informed Consent &amp; Electronic Signature</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-primary)' }}>By signing below, I voluntarily confirm and agree to the following:</p>
                      <ul className="text-xs space-y-1 list-none" style={{ color: 'var(--color-primary)' }}>
                        <li className="flex gap-2"><span className="flex-shrink-0 opacity-60">1.</span><span>All information I have provided in this intake packet is <strong>true and accurate</strong> to the best of my knowledge.</span></li>
                        <li className="flex gap-2"><span className="flex-shrink-0 opacity-60">2.</span><span>I <strong>consent to the collection and processing</strong> of my sensitive personal information by the DLSU CPS, in accordance with <strong>RA 10173 (Data Privacy Act of 2012)</strong>.</span></li>
                        <li className="flex gap-2"><span className="flex-shrink-0 opacity-60">3.</span><span>I <strong>consent to receive counseling services</strong> and understand that session records may be kept for continuity of care.</span></li>
                      </ul>
                    </div>
                    <SignaturePad value={signature} onChange={setSignature} />
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="px-5 py-4 flex gap-3 flex-wrap" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                {intakeStep > 0 && (
                  <button onClick={() => { setIntakeError(''); setIntakeStep(s=>s-1); }}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-xl transition border"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <ChevronLeft size={14} /> Back
                  </button>
                )}
                <button onClick={saveFormsProgress}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-xl transition border"
                  style={{ background: 'var(--color-warning-surface)', borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                  <Save size={13} /> Save &amp; Exit
                </button>
                <div className="flex-1" />
                {intakeStep < 3 ? (
                  <button onClick={() => { if (validateIntakeStep()) setIntakeStep(s=>s+1); }}
                    className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition hover:opacity-90"
                    style={{ background: 'var(--color-primary)' }}>
                    Continue <ChevronRight size={14} />
                  </button>
                ) : (
                  <button onClick={() => handleIntakeSubmit(false)}
                    disabled={intakeSubmitting || !signature}
                    className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition hover:opacity-90"
                    style={{ background: 'var(--color-primary)' }}>
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

  // Success
  if (success) {
    const isSlotBooking = !requestAnyway && !!prefTime;
    return (
      <DashboardPageWrapper title="Book Appointment" subtitle="">
        <div className="max-w-2xl mx-auto animate-fade-up">
          <div className="text-white rounded-2xl px-6 py-6 mb-5 relative" style={{ background: 'var(--color-primary)' }}>
            <button onClick={() => router.push('/my-appointments')} aria-label="Close" className="absolute top-4 right-5 text-white/60 hover:text-white text-xl leading-none">&times;</button>
            <div className="flex items-start gap-3">
              <CheckCircle size={24} className="flex-shrink-0 mt-0.5" style={{ color: '#86EFAC' }} />
              <div>
                <p className="text-sm font-bold uppercase tracking-wide mb-1" style={{ color: '#86EFAC' }}>
                  {isSlotBooking ? "You're all set" : 'Request sent'}
                </p>
                <p className="text-lg font-bold">Ticket #{ticketNumber}</p>
                {isSlotBooking ? (
                  <p className="text-sm mt-1 text-white/80">
                    Your slot at <strong>{fmtT(prefTime)}</strong> on <strong>{new Date(prefDate+'T12:00:00').toLocaleDateString('en-PH',{ timeZone: 'Asia/Manila',weekday:'long',month:'long',day:'numeric'})}</strong> is reserved. Your IC will confirm it within 1–2 business days.
                  </p>
                ) : (
                  <p className="text-sm mt-1 text-white/80">Taking this step takes courage. The CPS team will reach out within 1–2 business days to schedule your session.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-5 mb-4 shadow-card" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>What happens next</p>
            <ol className="space-y-3">
              {(isSlotBooking ? [
                { label: 'IC reviews your slot', desc: 'Your intake counselor will confirm or adjust your reserved time within 1–2 business days.' },
                { label: 'Check your email', desc: "You'll receive a confirmation email at your DLSU address once your appointment is confirmed." },
                { label: 'Attend your intake interview', desc: 'Bring a valid DLSU ID. The session is confidential and takes about 30–45 minutes.' },
              ] : [
                { label: 'Office reviews your request', desc: 'The CPS office will review your request and reach out within 1–2 business days.' },
                { label: 'Check your email', desc: "You'll receive scheduling details at your DLSU email address." },
                { label: 'Attend your intake interview', desc: 'Bring a valid DLSU ID. The session is confidential and takes about 30–45 minutes.' },
              ]).map((s, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                    style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}>{i+1}</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{s.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {formSkipped && (
            <div className="flex items-start gap-3 rounded-xl px-4 py-3 mb-4" style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' }}>
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-warning)' }}>Intake forms not yet submitted</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-warning)' }}>Your appointment is booked, but the IC needs your intake forms before the session. Please return here or visit the CPS office to complete them.</p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => router.push('/my-appointments')}
              className="px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}>View My Appointments</button>
            <button onClick={() => { setSuccess(false); setConcern(''); setPrefDate(''); setPrefTime(''); setPurpose('intake_interview'); setFormSkipped(false); setBookStep(0); }}
              className="px-5 py-2.5 text-sm rounded-xl transition border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>New Request</button>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  // Calendar
  const { year, month } = calendarMonth;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blanks = (firstDay + 6) % 7;
  const cells: (number | null)[] = [...Array(blanks).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const monthLabel = new Date(year, month).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'long', year: 'numeric' });

  const isSelectable = (day: number) => {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const d = new Date(ds + 'T12:00:00');
    return d >= minDate && d <= maxDate && !bookingRules.blackout_dates.includes(ds);
  };

  const isF2F = (m?: string) => ['f2f', 'in-person', 'in_person', 'face-to-face', 'onsite'].includes((m || '').toLowerCase());
  const methodSlots = purpose === 'intake_interview' ? slots : slots.filter(s => slotMethod === 'F2F' ? isF2F(s.method) : !isF2F(s.method));
  const slotCountByTime: Record<string, number> = {};
  methodSlots.forEach(s => { slotCountByTime[s.time] = (slotCountByTime[s.time] || 0) + 1; });
  const seen = new Set<string>();
  const filteredSlots = methodSlots.filter(s => {
    const key = purpose === 'intake_interview' ? s.time : `${s.time}|${s.counselor_id}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });

  return (
    <DashboardPageWrapper title="Book Appointment" subtitle="">

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl shadow-2xl max-w-md w-full p-7 animate-scale-in" style={{ background: 'var(--color-surface)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-success-surface)' }}>
              <CalendarCheck className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
            </div>
            <h2 className="text-lg font-bold text-center mb-1" style={{ color: 'var(--color-text-primary)' }}>Confirm Your Booking</h2>
            <p className="text-xs text-center mb-5" style={{ color: 'var(--color-text-muted)' }}>Please review your appointment details before confirming.</p>
            <div className="space-y-2.5 mb-6">
              {[
                ['Purpose', purpose==='intake_interview'?'Intake Interview':purpose==='counseling'?'Counseling Session':'Other'],
                ['Mode', `${slotMethod==='F2F'?'Face to Face':'Online'}${slotMethod==='Online'&&prefPlatform?` · ${prefPlatform==='google-meet'?'Google Meet':'Zoom'}`:''}`],
                ...(prefDate ? [['Date & Time', `${new Date(prefDate+'T12:00:00').toLocaleDateString('en-PH',{ timeZone: 'Asia/Manila',weekday:'short',month:'short',day:'numeric'})}${prefTime?` at ${fmtT(prefTime)}`:''}`]] : []),
                ...(concern ? [['Concern', concern]] : []),
                ['Referral', referralType==='referred'?`Referred by ${referredBy}`:'Self Referred'],
              ].map(([k,v]) => (
                <div key={k} className="flex justify-between text-sm pb-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{k}</span>
                  <span className="font-medium text-right max-w-[60%] line-clamp-2" style={{ color: 'var(--color-text-primary)' }}>{v}</span>
                </div>
              ))}
            </div>
            {purpose === 'intake_interview' && (
              <p className="text-xs rounded-lg px-3 py-2 mb-4" style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)', color: 'var(--color-warning)' }}>
                After booking, you&apos;ll be asked to fill out the intake forms (ICF, SPIF, PHQ-4). You can do them now or come back later.
              </p>
            )}
            {error && <p className="text-xs mb-3" style={{ color: 'var(--color-danger)' }}>{error}</p>}
            <button onClick={handleConfirmedBook} disabled={submitting}
              className="w-full py-3 text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 mb-2 disabled:opacity-50 hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}>
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {submitting ? 'Booking…' : 'Confirm Booking'}
            </button>
            <button onClick={() => setShowConfirm(false)}
              className="w-full py-2 text-sm transition"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
              Go Back &amp; Edit
            </button>
          </div>
        </div>
      )}

      {/* Forms choice modal */}
      {showFormsChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl shadow-2xl max-w-md w-full p-7 animate-scale-in" style={{ background: 'var(--color-surface)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-success-surface)' }}>
              <CheckCircle className="w-6 h-6" style={{ color: 'var(--color-success)' }} />
            </div>
            <h2 className="text-lg font-bold text-center mb-1" style={{ color: 'var(--color-text-primary)' }}>Appointment Booked!</h2>
            <p className="text-xs text-center mb-1" style={{ color: 'var(--color-text-muted)' }}>Ticket #{ticketNumber}</p>
            <p className="text-sm text-center mb-5" style={{ color: 'var(--color-text-secondary)' }}>Your slot is reserved. Would you like to fill out the required intake forms now?</p>
            <div className="space-y-3">
              <button onClick={() => { setShowFormsChoice(false); setShowIntake(true); }}
                className="w-full py-3 text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                <ClipboardList size={14} /> Fill Out Forms Now
              </button>
              <button onClick={() => { setShowFormsChoice(false); setFormSkipped(true); setSuccess(true); }}
                className="w-full py-3 text-sm font-medium rounded-xl transition border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                I&apos;ll Complete Later
              </button>
            </div>
            <p className="text-xs text-center mt-4" style={{ color: 'var(--color-text-muted)' }}>You can return to fill the forms from My Appointments → &quot;Complete Forms&quot;.</p>
          </div>
        </div>
      )}

      {/* Draft banner */}
      {hasDraft && (
        <div className="mb-4 flex items-center justify-between rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary)' }}>
          <span className="font-medium" style={{ color: 'var(--color-primary)' }}>Draft loaded from previous session.</span>
          <button onClick={clearDraft} className="text-xs" style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-danger)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>Clear draft</button>
        </div>
      )}

      <div className="flex gap-5 items-start">

        {/* Left sidebar */}
        <div className="w-52 flex-shrink-0 hidden lg:flex flex-col gap-4">
          <div className="rounded-2xl border shadow-card p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-primary)' }}>
                <Image src="/dlsu-seal.svg" alt="DLSU" width={22} height={22} className="brightness-[10]" />
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>Book Appointment</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>CPS · DLSU</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--color-primary)' }}>
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{user?.first_name} {user?.last_name}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Student</p>
              </div>
            </div>
            <VerticalStepTracker steps={BOOK_STEPS} current={purpose === 'others' && bookStep === 2 ? 1 : bookStep} />
          </div>

          {bookStep >= 1 && (
            <div className="rounded-2xl border shadow-card p-4 space-y-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Your selections</p>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Session type</p>
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>{PURPOSES.find(p=>p.value===purpose)?.label || purpose}</p>
              </div>
              {purpose !== 'others' && (
                <div>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Mode</p>
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {slotMethod === 'F2F' ? 'Face to Face' : `Online · ${prefPlatform === 'google-meet' ? 'Google Meet' : 'Zoom'}`}
                  </p>
                </div>
              )}
              {bookStep >= 2 && prefDate && (
                <div>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Date &amp; Time</p>
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {new Date(prefDate+'T12:00:00').toLocaleDateString('en-PH',{ timeZone: 'Asia/Manila',month:'short',day:'numeric',weekday:'short'})}
                    {prefTime && <><br />{fmtT(prefTime)}</>}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center */}
        <div className="flex-1 min-w-0">

          {/* Rebook deadline banner */}
          {rebookDeadline && (
            <div className="rounded-xl px-4 py-3 mb-4 flex items-start gap-3" style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' }}>
              <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--color-warning)' }} />
              <p className="text-sm" style={{ color: 'var(--color-warning)' }}>
                You missed your last session. Please rebook by{' '}
                <strong>{new Date(rebookDeadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.
              </p>
            </div>
          )}

          {/* Step 0: Session Type */}
          {bookStep === 0 && (
            <div className="space-y-4">
              <div className="rounded-2xl border shadow-card overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>What type of session?</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Select the purpose of your visit to CPS</p>
                </div>
                <div className="p-5 space-y-4">
                  {/* Purpose cards */}
                  {rebookDeadline && (
                    <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-1" style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' }}>
                      <AlertCircle size={14} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: 2 }} />
                      <p className="text-xs" style={{ color: 'var(--color-warning)' }}>
                        You missed your last session. Please rebook by <strong>{new Date(rebookDeadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.
                      </p>
                    </div>
                  )}
                  {(() => { return (
                  <div className="grid gap-2 grid-cols-2">
                    {PURPOSES.map(p => {
                      const sel = purpose === p.value;
                      return (
                        <label key={p.value}
                          className="flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition"
                          style={{ borderColor: sel ? 'var(--color-primary)' : 'var(--color-border)', background: sel ? 'var(--color-primary-surface)' : 'var(--color-surface)' }}>
                          <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition"
                            style={{ background: sel ? 'var(--color-primary)' : 'transparent', borderColor: sel ? 'var(--color-primary)' : 'var(--color-border)' }}>
                            {sel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <input type="radio" name="purpose" value={p.value} checked={sel} onChange={() => setPurpose(p.value)} className="sr-only" />
                          <div>
                            <p className="text-sm font-semibold" style={{ color: sel ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>{p.label}</p>
                            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{p.desc}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>); })()}

                  {purpose === 'others' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Specify <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                        <input value={specifyOthers} onChange={e => setSpecifyOthers(e.target.value)} placeholder="Please specify…"
                          className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} />
                      </div>
                      <div className="flex items-start gap-2.5 rounded-xl px-4 py-3" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary)' }}>
                        <Info size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                        <div>
                          <p className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>No date selection needed</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-primary)' }}>CPS staff will review your request and reach out within <strong>1–2 business days</strong> to confirm a schedule.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {purpose === 'intake_interview' && (
                    <div className="flex items-start gap-2 rounded-xl px-4 py-3" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary)' }}>
                      <ClipboardCheck size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                      <p className="text-xs" style={{ color: 'var(--color-primary)' }}><strong>Intake Interview selected:</strong> After submitting, you&apos;ll complete short intake forms (ICF, SPIF-IF, PHQ-4) to help your counselor prepare.</p>
                    </div>
                  )}

                  {/* Counselor */}
                  {(purpose === 'counseling' || purpose === 'follow_up') && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>Counselor <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                      {assignedCounselor === undefined && (
                        <div className="flex items-center gap-2 text-sm py-2" style={{ color: 'var(--color-text-muted)' }}>
                          <Loader2 size={13} className="animate-spin" /> Looking up your assigned counselor…
                        </div>
                      )}
                      {assignedCounselor && (
                        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary)' }}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-primary-surface)' }}>
                            <UserCheck size={14} style={{ color: 'var(--color-primary)' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{assignedCounselor.name}</p>
                            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{assignedCounselor.role === 'PSYCHOLOGIST' ? 'Psychologist' : 'Counselor'} · Assigned to your case</p>
                          </div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full border" style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>Assigned</span>
                        </div>
                      )}
                      {assignedCounselor === null && (
                        counselorList === null ? (
                          <div className="flex items-center gap-2 text-sm py-2" style={{ color: 'var(--color-text-muted)' }}>
                            <Loader2 size={13} className="animate-spin" /> Loading counselors…
                          </div>
                        ) : counselorList.length > 0 ? (
                          <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-0.5">
                            {counselorList.map((c: any) => {
                              const sel = selectedCounselorId === c._id;
                              return (
                                <button key={c._id} type="button" onClick={() => setSelectedCounselorId(c._id)}
                                  className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition"
                                  style={{ borderColor: sel ? 'var(--color-primary)' : 'var(--color-border)', background: sel ? 'var(--color-primary-surface)' : 'var(--color-surface)' }}>
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                    style={{ background: sel ? 'var(--color-primary)' : 'var(--color-bg)', color: sel ? 'white' : 'var(--color-text-secondary)' }}>
                                    {c.first_name?.charAt(0)}{c.last_name?.charAt(0)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate" style={{ color: sel ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>{c.first_name} {c.last_name}</p>
                                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{c.role === 'PSYCHOLOGIST' ? 'Psychologist' : 'Counselor'}</p>
                                  </div>
                                  {sel && <Check size={14} style={{ color: 'var(--color-primary)' }} className="flex-shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm rounded-xl px-4 py-3" style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)', color: 'var(--color-warning)' }}>
                            No counselors are currently available. Please contact the CPS office directly.
                          </p>
                        )
                      )}
                    </div>
                  )}

                  {/* Session mode */}
                  {purpose !== 'others' && (purpose === 'intake_interview' || !!selectedCounselorId || assignedCounselor) && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>Session Mode <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { v: 'F2F', label: 'Face to Face', sub: 'Visit the CPS office', Icon: MapPin },
                          { v: 'Online', label: 'Online', sub: 'Video call session', Icon: Video },
                        ].map(m => {
                          const sel = slotMethod === m.v;
                          return (
                            <button key={m.v} type="button"
                              onClick={() => { setSlotMethod(m.v); setPrefDate(''); setPrefTime(''); setSlotCounselorId(''); setSlots([]); setNoSlotsNextDate(null); setRequestAnyway(false); }}
                              className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition"
                              style={{ borderColor: sel ? 'var(--color-primary)' : 'var(--color-border)', background: sel ? 'var(--color-primary-surface)' : 'var(--color-surface)' }}>
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: sel ? 'var(--color-primary)' : 'var(--color-bg)', color: sel ? 'white' : 'var(--color-text-muted)' }}>
                                <m.Icon size={15} />
                              </div>
                              <div>
                                <p className="text-sm font-semibold" style={{ color: sel ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>{m.label}</p>
                                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{m.sub}</p>
                              </div>
                              {sel && <Check size={14} className="ml-auto flex-shrink-0" style={{ color: 'var(--color-primary)' }} />}
                            </button>
                          );
                        })}
                      </div>

                      {slotMethod === 'Online' && (
                        <div className="mt-3 rounded-xl p-3" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary)' }}>
                          <p className="text-xs font-bold mb-2" style={{ color: 'var(--color-primary)' }}>Preferred Platform</p>
                          <div className="flex gap-2">
                            {([
                              { value: 'google-meet' as const, label: 'Google Meet' },
                              { value: 'zoom'        as const, label: 'Zoom'        },
                            ] as const).map(p => {
                              const sel = prefPlatform === p.value;
                              return (
                                <button key={p.value} type="button" onClick={() => setPrefPlatform(p.value)}
                                  className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-xs font-semibold transition"
                                  style={{ borderColor: sel ? 'var(--color-primary)' : 'var(--color-border)', background: sel ? 'var(--color-primary)' : 'var(--color-surface)', color: sel ? 'white' : 'var(--color-text-secondary)' }}>
                                  {sel && <Check size={12} />} {p.label}
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-xs mt-2" style={{ color: 'var(--color-primary)' }}>Your IC will send the meeting link before the session.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Calendar */}
          {bookStep === 1 && (
            <div className="rounded-2xl border shadow-card overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Select a date</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Available dates are shown — choose one to see time slots</p>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{monthLabel}</p>
                  <div className="flex gap-1">
                    {[
                      { dir: -1, Icon: ChevronLeft },
                      { dir: 1,  Icon: ChevronRight },
                    ].map(({ dir, Icon }) => (
                      <button key={dir} type="button"
                        onClick={() => setCalendarMonth(m => { const d = new Date(m.year, m.month + dir); return { year: d.getFullYear(), month: d.getMonth() }; })}
                        className="p-1.5 rounded-lg transition"
                        style={{ color: 'var(--color-text-muted)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                        <Icon size={15} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-7 mb-2">
                  {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
                    <div key={d} className="text-center text-[11px] font-semibold py-1" style={{ color: 'var(--color-text-muted)' }}>{d}</div>
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
                        className="mx-auto w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium transition"
                        style={isSelected
                          ? { background: 'var(--color-primary)', color: 'white', fontWeight: 700 }
                          : isToday && selectable
                          ? { outline: '2px solid var(--color-primary)', color: 'var(--color-primary)', fontWeight: 700 }
                          : selectable
                          ? { color: 'var(--color-text-primary)' }
                          : { color: 'var(--color-border)', cursor: 'not-allowed' }}
                        onMouseEnter={e => { if (selectable && !isSelected) e.currentTarget.style.background = 'var(--color-bg)'; }}
                        onMouseLeave={e => { if (selectable && !isSelected) e.currentTarget.style.background = 'transparent'; }}>
                        {day}
                      </button>
                    );
                  })}
                </div>

                {prefDate && !slotsLoading && slotsBlockedMsg && (
                  <div className="mt-4 rounded-xl p-4" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
                    <p className="text-xs font-bold" style={{ color: 'var(--color-danger)' }}>{slotsBlockedMsg}</p>
                  </div>
                )}

                {prefDate && !slotsLoading && filteredSlots.length === 0 && !slotsBlockedMsg && (
                  <div className="mt-4 rounded-xl p-4" style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' }}>
                    <p className="text-xs font-bold mb-1" style={{ color: 'var(--color-warning)' }}>No available slots on this date</p>
                    {noSlotsNextDate && (
                      <p className="text-xs mb-2" style={{ color: 'var(--color-warning)' }}>
                        Next available: <button onClick={() => { setPrefDate(noSlotsNextDate); setCalendarMonth({ year: parseInt(noSlotsNextDate.split('-')[0]), month: parseInt(noSlotsNextDate.split('-')[1]) - 1 }); }}
                          className="font-semibold underline" style={{ color: 'var(--color-warning)' }}>{new Date(noSlotsNextDate+'T12:00:00').toLocaleDateString('en-PH',{ timeZone: 'Asia/Manila',month:'short',day:'numeric'})}</button>
                      </p>
                    )}
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={requestAnyway} onChange={e => setRequestAnyway(e.target.checked)} className="mt-0.5 w-4 h-4" style={{ accentColor: 'var(--color-primary)' }} />
                      <span className="text-xs" style={{ color: 'var(--color-warning)' }}>Submit a general request — the CPS office will schedule me</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {bookStep === 2 && (
            <div className="rounded-2xl border shadow-card overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Session details</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Tell your counselor what brings you in</p>
              </div>
              {purpose === 'others' && (
                <div className="flex items-start gap-2.5 px-5 pt-4" >
                  <div className="flex items-start gap-2.5 w-full rounded-xl px-4 py-3" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary)' }}>
                    <Info size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                    <p className="text-xs" style={{ color: 'var(--color-primary)' }}>
                      <strong>What happens next:</strong> CPS staff will review your request and contact you within 1–2 business days to confirm a schedule.
                    </p>
                  </div>
                </div>
              )}
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Presenting Concern</label>
                  <textarea value={concern} onChange={e => setConcern(e.target.value)} rows={4}
                    placeholder="Briefly describe what you'd like to talk about…"
                    className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>Referral</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { v: 'self-referred', label: 'Self-referred', desc: 'I came on my own' },
                      { v: 'referred', label: 'Referred', desc: 'Referred by someone' },
                    ].map(r => {
                      const sel = referralType === r.v;
                      return (
                        <button key={r.v} type="button" onClick={() => setReferralType(r.v)}
                          className="flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition"
                          style={{ borderColor: sel ? 'var(--color-primary)' : 'var(--color-border)', background: sel ? 'var(--color-primary-surface)' : 'var(--color-surface)' }}>
                          <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center"
                            style={{ background: sel ? 'var(--color-primary)' : 'transparent', borderColor: sel ? 'var(--color-primary)' : 'var(--color-border)' }}>
                            {sel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: sel ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>{r.label}</p>
                            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{r.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {referralType === 'referred' && (
                    <input value={referredBy} onChange={e => setReferredBy(e.target.value)}
                      placeholder="Name / position of person who referred you"
                      className={`${IC} mt-2`} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} />
                  )}
                </div>

                {/* Informed consent — required before booking (RA 10173) */}
                <label className="flex items-start gap-2.5 cursor-pointer rounded-xl px-4 py-3"
                  style={{ background: 'var(--color-bg)', border: `1px solid ${agreedToTerms ? 'var(--color-primary)' : 'var(--color-border)'}` }}>
                  <input type="checkbox" checked={agreedToTerms}
                    onChange={e => { setAgreedToTerms(e.target.checked); if (e.target.checked) setError(null); }}
                    className="mt-0.5 w-4 h-4 flex-shrink-0" style={{ accentColor: 'var(--color-primary)' }} />
                  <span className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    I consent to receiving counseling services and to the collection and processing of my
                    personal information by DLSU CPS in accordance with <strong>RA 10173 (Data Privacy Act of 2012)</strong>.
                  </span>
                </label>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm mt-3" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />{error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3 mt-4">
            {bookStep > 0 && (
              <button onClick={() => { setError(null); setBookStep(s => (purpose === 'others' && s === 2) ? 0 : s - 1); }}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-xl transition border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <ChevronLeft size={14} /> Back
              </button>
            )}
            <button onClick={saveDraft}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm rounded-xl transition border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <Save size={13} className={savingDraft ? 'animate-pulse' : ''} />
              {savingDraft ? 'Saved' : 'Save Draft'}
            </button>
            <div className="flex-1" />
            {bookStep < 2 ? (
              <button onClick={handleNextBookStep}
                className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                Continue <ChevronRight size={14} />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting || !agreedToTerms}
                className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition disabled:opacity-50 hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <CalendarCheck size={14} />}
                {submitting ? 'Submitting…' : 'Review & Book'}
              </button>
            )}
          </div>
        </div>

        {/* Right: Time slots */}
        {bookStep === 1 && (
          <div className="w-52 flex-shrink-0 hidden xl:flex flex-col rounded-2xl border shadow-card overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {prefDate ? new Date(prefDate+'T12:00:00').toLocaleDateString('en-PH',{ timeZone: 'Asia/Manila',weekday:'long',month:'short',day:'numeric'}) : 'Select a date'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {prefDate ? (purpose === 'intake_interview' ? 'IC available slots' : `${slotMethod === 'F2F' ? 'Face to Face' : 'Online'} slots`) : 'Available time slots will appear here'}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {!prefDate && (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: 'var(--color-bg)' }}>
                    <Clock size={18} style={{ color: 'var(--color-border)' }} />
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Pick a date on the calendar</p>
                </div>
              )}
              {prefDate && slotsLoading && (
                <div className="flex items-center justify-center h-24 gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading slots…
                </div>
              )}
              {prefDate && !slotsLoading && filteredSlots.length > 0 && (
                <div className="space-y-1.5">
                  {filteredSlots.map((s, i) => {
                    const sel = prefTime === s.time && slotCounselorId === s.counselor_id;
                    return (
                      <button key={i} type="button"
                        onClick={() => { setPrefTime(s.time); setSlotCounselorId(s.counselor_id); setRequestAnyway(false); }}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition"
                        style={sel
                          ? { borderColor: 'var(--color-primary)', background: 'var(--color-primary)', color: 'white' }
                          : { borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                        onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-primary-surface)'; } }}
                        onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-surface)'; } }}>
                        <div className="min-w-0">
                          <p className="text-xs font-bold" style={{ color: sel ? 'white' : 'var(--color-text-primary)' }}>{fmtT(s.time)}</p>
                          {s.counselor_name && purpose !== 'intake_interview' && (
                            <p className="text-xs mt-0.5 truncate" style={{ color: sel ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)' }}>{s.counselor_name}</p>
                          )}
                        </div>
                        {purpose === 'intake_interview' && (() => {
                          const n = s.count ?? slotCountByTime[s.time] ?? 1;
                          return (
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2"
                              style={sel
                                ? { background: 'rgba(255,255,255,0.2)', color: 'white' }
                                : n === 1
                                ? { background: 'var(--color-warning-surface)', color: 'var(--color-warning)' }
                                : { background: 'var(--color-success-surface)', color: 'var(--color-success)' }}>
                              {n} slot{n !== 1 ? 's' : ''} left
                            </span>
                          );
                        })()}
                      </button>
                    );
                  })}
                </div>
              )}
              {prefDate && !slotsLoading && filteredSlots.length === 0 && !requestAnyway && (
                <div className="text-center py-6">
                  {slotsBlockedMsg
                    ? <p className="text-xs font-medium" style={{ color: 'var(--color-danger)' }}>{slotsBlockedMsg}</p>
                    : <>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{purpose === 'intake_interview' ? 'No IC slots available on this date.' : `No ${slotMethod === 'F2F' ? 'face-to-face' : 'online'} slots available.`}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Try a different date or check below to request anyway.</p>
                      </>
                  }
                </div>
              )}
              {requestAnyway && (
                <div className="mt-2 flex items-center gap-1.5 rounded-xl px-3 py-2" style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' }}>
                  <Check size={12} style={{ color: 'var(--color-warning)' }} className="flex-shrink-0" />
                  <p className="text-xs font-medium" style={{ color: 'var(--color-warning)' }}>General request — CPS will schedule you</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
