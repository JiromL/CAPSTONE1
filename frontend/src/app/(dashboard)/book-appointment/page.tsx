'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { AlertCircle, CheckCircle, Loader2, Save, Send } from 'lucide-react';

const PURPOSES = [
  { value: 'intake_interview',       label: 'Intake Interview' },
  { value: 'counseling',             label: 'Counseling' },
  { value: 'follow_up_counselling',  label: 'Follow-up Counseling' },
  { value: 'others',                 label: 'Others' },
];

const PLATFORMS = [
  { value: 'in-person',   label: 'Face to Face' },
  { value: 'google-meet', label: 'Google Meet' },
  { value: 'zoom',        label: 'Zoom' },
];

const REFERRAL_OPTS = [
  { value: 'self-referred', label: 'Self Referred' },
  { value: 'referred',      label: 'Referred by someone / organization' },
];

function buildTimeSlots(start: string, end: string, intervalMins: number): string[] {
  const slots: string[] = [];
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let cur = sh * 60 + sm;
  const endMin = eh * 60 + em;
  while (cur <= endMin) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    cur += intervalMins;
  }
  return slots;
}

function fmtSlot(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

const DRAFT_KEY = 'bookAppointmentDraft_v2';

export default function BookAppointmentPage() {
  const router = useRouter();
  const [user, setUser]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [hasDraft, setHasDraft] = useState(false);

  // Consent gate
  const [consentGiven, setConsentGiven]   = useState<boolean | null>(null);
  const [showConsent, setShowConsent]     = useState(false);
  const [consentChecks, setConsentChecks] = useState({ counseling: false, privacy: false });
  const [savingConsent, setSavingConsent] = useState(false);
  const [consentError, setConsentError]   = useState<string | null>(null);

  // Active appointment / booking gate
  const [activeAppt, setActiveAppt] = useState<any>(null);
  const [bookingGate, setBookingGate] = useState<string | null>(null); // 'eligible' | 'no_case' | 'awaiting_intake' | 'pending_termination' | 'case_closed' | 'has_active_appointment'
  const [gateMessage, setGateMessage] = useState<string>('');

  // Booking rules
  const [bookingRules, setBookingRules] = useState({
    operating_days: [1, 2, 3, 4, 5],
    operating_hours_start: '09:00',
    operating_hours_end: '16:00',
    slot_duration_minutes: 30,
    min_days_ahead: 1,
    max_days_ahead: 30,
    blackout_dates: [] as string[],
  });

  // Form fields
  const [purpose, setPurpose]           = useState('intake_interview');
  const [specifyOthers, setSpecifyOthers] = useState('');
  const [concern, setConcern]           = useState('');
  const [platform, setPlatform]         = useState('in-person');
  const [referralType, setReferralType] = useState('self-referred');
  const [referredBy, setReferredBy]     = useState('');
  const [prefDate, setPrefDate]         = useState('');
  const [prefTime, setPrefTime]         = useState('');

  useEffect(() => {
    const init = async () => {
      const raw  = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (!raw || !token) { router.push('/login'); return; }
      const u = JSON.parse(raw);
      setUser(u);

      // Load booking rules
      try {
        const r = await fetch(api('/api/staff/settings/booking-rules'), { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) setBookingRules(await r.json());
      } catch {}

      // Consent check
      try {
        const r = await fetch(api('/api/consent/status'), { headers: { Authorization: `Bearer ${token}` } });
        if (r.status === 401) { router.replace('/login'); return; }
        if (r.ok) {
          const d = await r.json();
          setConsentGiven(d.consent_given);
          if (!d.consent_given) setShowConsent(true);
        } else {
          setConsentGiven(false);
          setShowConsent(true);
        }
      } catch {}

      // Booking gate check (active appointment + case eligibility)
      try {
        const r = await fetch(api('/api/appointments/active'), { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) {
          const d = await r.json();
          setBookingGate(d.booking_gate ?? (d.can_self_book ? 'eligible' : 'no_case'));
          setGateMessage(d.message ?? '');
          if (d.has_active_appointment) setActiveAppt(d);
        }
      } catch {}

      // Draft check
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        setHasDraft(true);
        try {
          const d = JSON.parse(draft);
          if (d.purpose)       setPurpose(d.purpose);
          if (d.specifyOthers) setSpecifyOthers(d.specifyOthers);
          if (d.concern)       setConcern(d.concern);
          if (d.platform)      setPlatform(d.platform);
          if (d.referralType)  setReferralType(d.referralType);
          if (d.referredBy)    setReferredBy(d.referredBy);
          if (d.prefDate)      setPrefDate(d.prefDate);
          if (d.prefTime)      setPrefTime(d.prefTime);
        } catch {}
      }

      setLoading(false);
    };
    init();
  }, [router]);

  const handleConsent = async () => {
    if (!consentChecks.counseling || !consentChecks.privacy) return;
    const token = localStorage.getItem('token');
    setSavingConsent(true);
    setConsentError(null);
    try {
      const r = await fetch(api('/api/consent/submit'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent_types: ['counseling_services', 'data_privacy'] }),
      });
      if (r.ok) { setConsentGiven(true); setShowConsent(false); }
      else setConsentError('Failed to record consent. Please try again.');
    } catch { setConsentError('Error recording consent.'); }
    finally { setSavingConsent(false); }
  };

  const saveDraft = async () => {
    setSavingDraft(true);
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ purpose, specifyOthers, concern, platform, referralType, referredBy, prefDate, prefTime }));
    setHasDraft(true);
    setTimeout(() => setSavingDraft(false), 600);
  };

  const clearDraft = () => { localStorage.removeItem(DRAFT_KEY); setHasDraft(false); };

  const timeSlots = buildTimeSlots(
    bookingRules.operating_hours_start,
    bookingRules.operating_hours_end,
    bookingRules.slot_duration_minutes,
  );

  // Min/max date for picker
  const today = new Date();
  const minDate = new Date(today); minDate.setDate(today.getDate() + bookingRules.min_days_ahead);
  const maxDate = new Date(today); maxDate.setDate(today.getDate() + bookingRules.max_days_ahead);
  const toDateStr = (d: Date) => d.toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalPurpose = purpose === 'others' ? specifyOthers.trim() : purpose;
    if (!finalPurpose)    { setError('Please select a purpose.'); return; }
    if (!concern.trim())  { setError('Please describe your concern / need / problem.'); return; }
    if (!platform)        { setError('Please select a preferred platform.'); return; }
    if (!prefDate)        { setError('Please select a preferred counseling date.'); return; }
    if (!prefTime)        { setError('Please select a preferred time.'); return; }
    if (referralType === 'referred' && !referredBy.trim()) { setError('Please specify who referred you.'); return; }

    if (bookingRules.blackout_dates.includes(prefDate)) {
      setError('The selected date is a CPS holiday. Please choose a different date.'); return;
    }
    const dayOfWeek = new Date(prefDate + 'T00:00:00').getDay();
    if (!bookingRules.operating_days.includes(dayOfWeek)) {
      setError('CPS is closed on the selected day. Please choose a weekday.'); return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api('/api/appointments/request'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: finalPurpose,
          concern,
          preferred_method: platform,
          preferred_date: prefDate,
          preferred_time: prefTime,
          referral_type: referralType,
          referred_by: referralType === 'referred' ? referredBy : null,
          agreed_to_terms: true,
        }),
      });
      if (r.status === 401) { router.replace('/login'); return; }
      const d = await r.json();
      if (r.ok) {
        clearDraft();
        setTicketNumber(d.counseling_id || d.appointment_id || '');
        setSuccess(true);
      } else {
        setError(d.error || 'Failed to submit request. Please try again.');
      }
    } catch { setError('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardPageWrapper title="Counselling Sessions" subtitle="Schedule a counseling session">
        <div className="flex items-center justify-center h-48">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      </DashboardPageWrapper>
    );
  }

  // ── Booking gate ───────────────────────────────────────────────────────────
  const GATE_CONFIGS: Record<string, { icon: string; title: string; color: string; cta?: { label: string; href: string } }> = {
    has_active_appointment: {
      icon: '📋',
      title: 'You already have an active appointment',
      color: 'bg-yellow-50 border-yellow-300 text-yellow-800',
      cta: { label: 'View My Appointments', href: '/my-appointments' },
    },
    no_case: {
      icon: '🏥',
      title: 'Walk-in intake required for first-time clients',
      color: 'bg-blue-50 border-blue-300 text-blue-800',
    },
    awaiting_intake: {
      icon: '⏳',
      title: 'Your intake appointment is pending',
      color: 'bg-amber-50 border-amber-300 text-amber-800',
      cta: { label: 'View My Appointments', href: '/my-appointments' },
    },
    pending_termination: {
      icon: '⚠️',
      title: 'Your case is pending closure',
      color: 'bg-orange-50 border-orange-300 text-orange-800',
    },
    case_closed: {
      icon: '📁',
      title: 'Your previous case is closed',
      color: 'bg-gray-50 border-gray-300 text-gray-700',
    },
  };

  if (bookingGate && bookingGate !== 'eligible') {
    const cfg = GATE_CONFIGS[bookingGate] ?? {
      icon: '🔒', title: 'Booking unavailable', color: 'bg-gray-50 border-gray-300 text-gray-700',
    };
    return (
      <DashboardPageWrapper title="Counselling Sessions" subtitle="Schedule a counseling session">
        <div className={`max-w-lg mx-auto mt-8 border rounded-xl p-6 text-center ${cfg.color}`}>
          <div className="text-4xl mb-3">{cfg.icon}</div>
          <h2 className="text-base font-bold mb-2">{cfg.title}</h2>
          <p className="text-sm opacity-80 mb-5">{gateMessage}</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {cfg.cta && (
              <button onClick={() => router.push(cfg.cta!.href)}
                className="px-5 py-2 bg-[#1a5228] hover:bg-green-800 text-white text-sm font-medium rounded-lg transition">
                {cfg.cta.label}
              </button>
            )}
            <button onClick={() => router.push('/dashboard')}
              className="px-5 py-2 border border-current text-sm font-medium rounded-lg hover:opacity-70 transition">
              Back to Dashboard
            </button>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <DashboardPageWrapper title="Counselling Sessions" subtitle="Schedule a counseling session">
        <div className="max-w-2xl mx-auto">
          {/* UE portal-style Attention banner */}
          <div className="bg-[#1a5228] text-white rounded-lg px-6 py-5 mb-6 relative">
            <button onClick={() => router.push('/my-appointments')} className="absolute top-3 right-4 text-white/70 hover:text-white text-lg leading-none">&times;</button>
            <p className="text-sm font-bold mb-1">Attention</p>
            <p className="text-base font-semibold">
              Successful creation/update for ticket number: {ticketNumber}.
            </p>
            <p className="text-sm text-green-100 mt-1">
              By giving your Ticket Number to your Guidance Counselor during counseling session, you are hereby giving your consent.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push('/my-appointments')}
              className="px-5 py-2 bg-[#1a5228] hover:bg-green-800 text-white text-sm font-medium rounded transition">
              View My Appointments
            </button>
            <button onClick={() => { setSuccess(false); setPurpose('counseling'); setSpecifyOthers(''); setConcern(''); setPlatform('in-person'); setPrefDate(''); setPrefTime(''); setReferralType('self-referred'); setReferredBy(''); }}
              className="px-5 py-2 border border-gray-300 text-sm text-gray-600 rounded hover:bg-gray-50 transition">
              New Request
            </button>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Counselling Sessions" subtitle="Schedule a counseling session">

      {/* Consent Modal */}
      {showConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-8 pt-8 pb-6 text-center border-b border-gray-100">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-[#1a5228]" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Informed Consent</h2>
              <p className="text-sm text-gray-400 mt-1">Please review and acknowledge before booking.</p>
            </div>
            <div className="px-8 py-6 space-y-4">
              {[
                {
                  key: 'counseling' as const,
                  title: 'Consent to Counseling & Psychological Services',
                  desc: 'I voluntarily consent to receive counseling and psychological services from DLSU CPS. Sessions are confidential except when required by law or when there is an imminent risk of harm.',
                },
                {
                  key: 'privacy' as const,
                  title: 'Data Privacy Consent',
                  desc: 'I consent to the collection and processing of my personal data for counseling purposes in accordance with the Data Privacy Act.',
                },
              ].map(item => (
                <label key={item.key} className="flex items-start gap-3 cursor-pointer group">
                  <input type="checkbox"
                    checked={consentChecks[item.key]}
                    onChange={e => setConsentChecks(c => ({ ...c, [item.key]: e.target.checked }))}
                    className="w-4 h-4 mt-0.5 accent-[#1a5228] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800 group-hover:text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </label>
              ))}
              {consentError && <p className="text-xs text-red-500">{consentError}</p>}
            </div>
            <div className="px-8 pb-8 flex flex-col gap-2">
              <button onClick={handleConsent}
                disabled={savingConsent || !consentChecks.counseling || !consentChecks.privacy}
                className="w-full py-2.5 bg-[#1a5228] hover:bg-green-800 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2">
                {savingConsent && <Loader2 size={14} className="animate-spin" />}
                I Agree &amp; Continue
              </button>
              <button onClick={() => router.replace('/dashboard')}
                className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 transition">
                Cancel — go back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">

        {/* Draft banner */}
        {hasDraft && (
          <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm">
            <span className="text-blue-600 font-medium">Saved draft loaded.</span>
            <button onClick={clearDraft} className="text-xs text-gray-400 hover:text-red-500 transition">Clear</button>
          </div>
        )}

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

          {/* Card header */}
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">Create Counseling Request</h2>
            <p className="text-xs text-gray-400 mt-0.5">De La Salle University — Counseling &amp; Psychology Services</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* Counseling ID */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Counseling ID</label>
              <input value={user?.id_number || user?.counseling_id || user?.student_id || '—'} readOnly
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-default" />
            </div>

            {/* Purpose + Date/Time row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Purpose <span className="text-red-400 normal-case font-normal">*</span>
                </label>
                <select value={purpose} onChange={e => setPurpose(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none">
                  {PURPOSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Date <span className="text-red-400 normal-case font-normal">*</span>
                  </label>
                  <input type="date" value={prefDate}
                    onChange={e => { setPrefDate(e.target.value); setPrefTime(''); }}
                    min={toDateStr(minDate)} max={toDateStr(maxDate)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Time <span className="text-red-400 normal-case font-normal">*</span>
                  </label>
                  <select value={prefTime} onChange={e => setPrefTime(e.target.value)}
                    disabled={!prefDate}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                    <option value=""></option>
                    {timeSlots.map(t => <option key={t} value={t}>{fmtSlot(t)}</option>)}
                  </select>
                  {!prefDate && <p className="text-[10px] text-gray-400 mt-1">Select a date first</p>}
                </div>
              </div>
            </div>

            {/* Specify others */}
            {purpose === 'others' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Specify others <span className="text-red-400 normal-case font-normal">*</span>
                </label>
                <input value={specifyOthers} onChange={e => setSpecifyOthers(e.target.value)}
                  placeholder="Please specify..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none" />
              </div>
            )}

            {/* Concern + Platform row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Concern / Need / Problem <span className="text-red-400 normal-case font-normal">*</span>
                </label>
                <textarea value={concern} onChange={e => setConcern(e.target.value)}
                  placeholder="Describe your concern..."
                  rows={4}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 placeholder-gray-300 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Preferred Platform <span className="text-red-400 normal-case font-normal">*</span>
                </label>
                <select value={platform} onChange={e => setPlatform(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none">
                  {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            {/* Referral */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Referral</label>
              <div className="flex flex-wrap gap-5">
                {REFERRAL_OPTS.map(r => (
                  <label key={r.value} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input type="radio" name="referral" value={r.value} checked={referralType === r.value}
                      onChange={() => setReferralType(r.value)} className="w-4 h-4 accent-[#1a5228]" />
                    {r.label}
                  </label>
                ))}
              </div>
              {referralType === 'referred' && (
                <input value={referredBy} onChange={e => setReferredBy(e.target.value)}
                  placeholder="Name or organization that referred you"
                  className="mt-3 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none" />
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2.5 pt-1 border-t border-gray-100">
              <button type="button" onClick={() => router.push('/my-appointments')}
                className="px-4 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition">
                Go Back
              </button>
              <button type="button" onClick={saveDraft} disabled={savingDraft}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition disabled:opacity-50">
                <Save size={13} />
                {savingDraft ? 'Saved!' : 'Save as draft'}
              </button>
              <button type="submit" disabled={submitting || consentGiven === false}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1a5228] hover:bg-green-800 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition shadow-sm">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
                {submitting ? 'Submitting…' : 'Save and Submit'}
              </button>
            </div>

          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Office hours: {fmtSlot(bookingRules.operating_hours_start)} – {fmtSlot(bookingRules.operating_hours_end)},&nbsp;
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].filter((_, i) => bookingRules.operating_days.includes(i)).join(' / ')}
        </p>
      </div>
    </DashboardPageWrapper>
  );
}
