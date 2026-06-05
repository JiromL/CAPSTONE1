'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { AlertCircle, CheckCircle, Loader2, Save, Send } from 'lucide-react';

const PURPOSES = [
  { value: 'counseling',             label: 'Counseling' },
  { value: 'follow_up_counselling',  label: 'Follow-up Counseling' },
  { value: 'intake_interview',       label: 'Intake Interview' },
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

  // Active appointment gate
  const [activeAppt, setActiveAppt] = useState<any>(null);

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
  const [purpose, setPurpose]           = useState('counseling');
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

      // Active appointment check
      try {
        const r = await fetch(api('/api/appointments/check-active'), { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) { const d = await r.json(); if (d.has_active_appointment) setActiveAppt(d); }
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
      const r = await fetch(api('/api/consent/give'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent_given: true }),
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
      <DashboardPageWrapper title="Book Appointment" subtitle="Schedule a counseling session">
        <div className="flex items-center justify-center h-48">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      </DashboardPageWrapper>
    );
  }

  // ── Active appointment gate ────────────────────────────────────────────────
  if (activeAppt) {
    return (
      <DashboardPageWrapper title="Book Appointment" subtitle="Schedule a counseling session">
        <div className="max-w-lg mx-auto mt-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">You already have an active appointment</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Please complete or cancel your existing appointment before booking a new one.</p>
          <button onClick={() => router.push('/my-appointments')}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition">
            View My Appointments
          </button>
        </div>
      </DashboardPageWrapper>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <DashboardPageWrapper title="Appointment Requested" subtitle="Your request has been submitted">
        <div className="max-w-lg mx-auto mt-8">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Request Submitted</h2>
            {ticketNumber && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Ticket number: <span className="font-bold text-gray-900 dark:text-white">{ticketNumber}</span>
              </p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              By providing your ticket number to your counselor during the counseling session, you are giving your consent.
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => router.push('/my-appointments')}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition">
                View My Appointments
              </button>
              <button onClick={() => { setSuccess(false); setPurpose('counseling'); setSpecifyOthers(''); setConcern(''); setPlatform('in-person'); setPrefDate(''); setPrefTime(''); setReferralType('self-referred'); setReferredBy(''); }}
                className="px-5 py-2 border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                New Request
              </button>
            </div>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Book Appointment" subtitle="Schedule a counseling session">

      {/* Consent Modal */}
      {showConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full p-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Informed Consent</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Please review and acknowledge the following before booking.</p>
            </div>
            <div className="space-y-4 mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={consentChecks.counseling}
                  onChange={e => setConsentChecks(c => ({ ...c, counseling: e.target.checked }))}
                  className="w-4 h-4 mt-0.5 text-green-600 border-gray-300 rounded focus:ring-green-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Consent to Counseling &amp; Psychological Services</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    I voluntarily consent to receive counseling and psychological services from DLSU CPS. Sessions are confidential except when required by law or when there is an imminent risk of harm.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={consentChecks.privacy}
                  onChange={e => setConsentChecks(c => ({ ...c, privacy: e.target.checked }))}
                  className="w-4 h-4 mt-0.5 text-green-600 border-gray-300 rounded focus:ring-green-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Data Privacy Consent</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    I consent to the collection and processing of my personal data for counseling purposes in accordance with the Data Privacy Act.
                  </p>
                </div>
              </label>
            </div>
            {consentError && <p className="text-xs text-red-500 mb-3">{consentError}</p>}
            <button onClick={handleConsent} disabled={savingConsent || !consentChecks.counseling || !consentChecks.privacy}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2">
              {savingConsent && <Loader2 size={14} className="animate-spin" />}
              I Agree &amp; Continue
            </button>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">

        {/* Draft banner */}
        {hasDraft && (
          <div className="mb-4 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-4 py-3 text-sm">
            <span className="text-blue-700 dark:text-blue-300">You have a saved draft loaded.</span>
            <button onClick={clearDraft} className="text-xs text-red-500 hover:underline">Clear draft</button>
          </div>
        )}

        {/* Form card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">

          {/* Card header */}
          <div className="bg-green-700 px-6 py-4">
            <h2 className="text-white font-semibold">Create Counseling Request</h2>
            <p className="text-green-200 text-xs mt-0.5">De La Salle University — CPS</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* Counseling ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Counseling ID</label>
              <input value={user?.id_number || user?.counseling_id || user?.student_id || '—'} readOnly
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-default" />
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Purpose <span className="text-red-500">*</span>
              </label>
              <select value={purpose} onChange={e => setPurpose(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none">
                {PURPOSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            {/* Specify others */}
            {purpose === 'others' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Specify others <span className="text-red-500">*</span>
                </label>
                <input value={specifyOthers} onChange={e => setSpecifyOthers(e.target.value)}
                  placeholder="Please specify..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none" />
              </div>
            )}

            {/* Concern */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Concern / Need / Problem <span className="text-red-500">*</span>
              </label>
              <textarea value={concern} onChange={e => setConcern(e.target.value)}
                placeholder="Concern/Need/Problem"
                rows={4}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:outline-none resize-none" />
            </div>

            {/* Date + Time row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Preferred Counseling Date <span className="text-red-500">*</span>
                </label>
                <input type="date" value={prefDate} onChange={e => { setPrefDate(e.target.value); setPrefTime(''); }}
                  min={toDateStr(minDate)} max={toDateStr(maxDate)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time <span className="text-red-500">*</span>
                </label>
                <select value={prefTime} onChange={e => setPrefTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none">
                  <option value=""></option>
                  {timeSlots.map(t => (
                    <option key={t} value={t}>{fmtSlot(t)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Platform */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Preferred Platform <span className="text-red-500">*</span>
              </label>
              <select value={platform} onChange={e => setPlatform(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none">
                {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            {/* Referral */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Referral</label>
              <div className="flex flex-wrap gap-4">
                {REFERRAL_OPTS.map(r => (
                  <label key={r.value} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                    <input type="radio" name="referral" value={r.value} checked={referralType === r.value}
                      onChange={() => setReferralType(r.value)} className="w-4 h-4 text-green-600" />
                    {r.label}
                  </label>
                ))}
              </div>
              {referralType === 'referred' && (
                <input value={referredBy} onChange={e => setReferredBy(e.target.value)}
                  placeholder="Name or organization that referred you"
                  className="mt-2 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none" />
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-300">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => router.push('/my-appointments')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                Go Back
              </button>
              <button type="button" onClick={saveDraft} disabled={savingDraft}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50">
                <Save size={13} />
                {savingDraft ? 'Saved!' : 'Save as draft'}
              </button>
              <button type="submit" disabled={submitting || consentGiven === false}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
                {submitting ? 'Submitting…' : 'Save and Submit'}
              </button>
            </div>

          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
          Office hours: {fmtSlot(bookingRules.operating_hours_start)} – {fmtSlot(bookingRules.operating_hours_end)},&nbsp;
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].filter((_, i) => bookingRules.operating_days.includes(i)).join(' / ')}
        </p>
      </div>
    </DashboardPageWrapper>
  );
}
