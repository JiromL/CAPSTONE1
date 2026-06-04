'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { AppointmentConfirmation } from '@/components/AppointmentConfirmation';
import Link from 'next/link';
import { api } from '@/utils/api';

interface AvailableSlot {
  slot_id: string;
  slot_start: string;
  slot_end: string;
  counselor_id: string;
  counselor_name: string;
}

interface BookingRules {
  operating_days: number[];
  operating_hours_start: string;
  operating_hours_end: string;
  slot_duration_minutes: number;
  min_days_ahead: number;
  max_days_ahead: number;
  blackout_dates: string[];
  last_slot_start: string;
}

const DEFAULT_RULES: BookingRules = {
  operating_days: [1, 2, 3, 4, 5],
  operating_hours_start: '08:00',
  operating_hours_end: '17:00',
  slot_duration_minutes: 60,
  min_days_ahead: 1,
  max_days_ahead: 30,
  blackout_dates: [],
  last_slot_start: '16:00',
};

export default function BookAppointmentPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const [bookingRules, setBookingRules] = useState<BookingRules>(DEFAULT_RULES);

  // Available slots
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [showAllSlots, setShowAllSlots] = useState(false);
  const [showCustomDateTime, setShowCustomDateTime] = useState(false);
  const [slotsLoaded, setSlotsLoaded] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);

  // Booking form state
  const [purpose, setPurpose] = useState('');
  const [otherPurpose, setOtherPurpose] = useState('');
  const [concern, setConcern] = useState('');
  const [referralType, setReferralType] = useState('self-referred');
  const [referredBy, setReferredBy] = useState('');
  const [preferredMethod, setPreferredMethod] = useState('in-person');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  
  // Personal information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  // Terms and conditions
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Active appointment gate
  const [activeAppointment, setActiveAppointment] = useState<any>(null);
  const [activeApptChecked, setActiveApptChecked] = useState(false);

  // Informed consent gate
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentChecks, setConsentChecks] = useState({ counseling: false, privacy: false });
  const [submittingConsent, setSubmittingConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  // Show/hide personal info editing
  const [editingPersonalInfo, setEditingPersonalInfo] = useState(false);
  
  // Draft functionality
  const [draftSaved, setDraftSaved] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  
  // Verification/checking step
  const [showVerification, setShowVerification] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (!userData || !token) {
          router.push('/login');
          return;
        }

        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Pre-fill personal information
        setFirstName(parsedUser.first_name || '');
        setLastName(parsedUser.last_name || '');
        setEmail(parsedUser.email || '');
        setPhone(parsedUser.phone || '');

        // Check for saved draft
        const draftData = localStorage.getItem('bookAppointmentDraft');
        if (draftData) {
          setHasDraft(true);
        }

        // Fetch booking rules
        try {
          const rulesRes = await fetch(api('/api/staff/settings/booking-rules'), { headers: { Authorization: `Bearer ${token}` } });
          if (rulesRes.ok) setBookingRules(await rulesRes.json());
        } catch {}

        // Check consent status
        const consentRes = await fetch(api('/api/consent/status'), { headers: { Authorization: `Bearer ${token}` } });
        if (consentRes.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.replace('/login');
          return;
        }
        if (consentRes.ok) {
          const cd = await consentRes.json();
          setConsentGiven(cd.consent_given);
          if (!cd.consent_given) setShowConsentModal(true);
        } else {
          setConsentGiven(false);
          setShowConsentModal(true);
        }

        // Check if student already has an active appointment
        const activeRes = await fetch(api('/api/appointments/check-active'), { headers: { Authorization: `Bearer ${token}` } });
        if (activeRes.ok) {
          const ad = await activeRes.json();
          if (ad.has_active_appointment) setActiveAppointment(ad);
        }
        setActiveApptChecked(true);

        // Fetch available counselor slots for next 30 days
        try {
          const slotsRes = await fetch(api('/api/appointments/open-slots?days=30'), {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (slotsRes.ok) {
            const d = await slotsRes.json();
            const flat: AvailableSlot[] = ((d.counselors || []) as any[])
              .flatMap((c: any) =>
                (c.slots || []).map((s: any) => ({
                  slot_id: s.slot_id,
                  slot_start: s.slot_start,
                  slot_end: s.slot_end,
                  counselor_id: c.counselor_id,
                  counselor_name: c.counselor_name,
                }))
              )
              .sort((a: AvailableSlot, b: AvailableSlot) =>
                new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime()
              );
            setAvailableSlots(flat);
          }
        } catch {}
        setSlotsLoaded(true);

        setLoading(false);
      } catch (err) {
        console.error('[BookAppointment] Error loading data:', err);
        setLoadError('Error loading available appointments');
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleSubmitConsent = async () => {
    if (!consentChecks.counseling || !consentChecks.privacy) return;
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    setSubmittingConsent(true);
    setConsentError(null);
    try {
      const r = await fetch(api('/api/consent/submit'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent_types: ['counseling_services', 'data_privacy'], version: '1.0' }),
      });
      if (r.ok) {
        setConsentGiven(true);
        setShowConsentModal(false);
      } else if (r.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.replace('/login');
        return;
      } else {
        const d = await r.json().catch(() => ({}));
        setConsentError(d.error || 'Could not record consent. Please try again.');
      }
    } catch {
      setConsentError('Network error. Please check your connection and try again.');
    } finally {
      setSubmittingConsent(false);
    }
  };

  const saveDraft = () => {
    const draftData = {
      firstName,
      lastName,
      email,
      phone,
      purpose,
      otherPurpose,
      concern,
      referralType,
      referredBy,
      preferredMethod,
      preferredDate,
      preferredTime,
      agreedToTerms,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem('bookAppointmentDraft', JSON.stringify(draftData));
    setDraftSaved(true);
    setHasDraft(true);
    setTimeout(() => setDraftSaved(false), 3000);
  };

  const loadDraft = () => {
    const draftData = localStorage.getItem('bookAppointmentDraft');
    if (draftData) {
      const draft = JSON.parse(draftData);
      setFirstName(draft.firstName);
      setLastName(draft.lastName);
      setEmail(draft.email);
      setPhone(draft.phone);
      setPurpose(draft.purpose);
      setOtherPurpose(draft.otherPurpose);
      setConcern(draft.concern);
      setReferralType(draft.referralType);
      setReferredBy(draft.referredBy);
      setPreferredMethod(draft.preferredMethod);
      setPreferredDate(draft.preferredDate);
      setPreferredTime(draft.preferredTime);
      setAgreedToTerms(draft.agreedToTerms);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem('bookAppointmentDraft');
    setHasDraft(false);
  };

  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim()) {
      setSubmitError('Please enter your first name');
      return;
    }

    if (!lastName.trim()) {
      setSubmitError('Please enter your last name');
      return;
    }

    if (!email.trim()) {
      setSubmitError('Please enter your email address');
      return;
    }

    if (!purpose) {
      setSubmitError('Please select a purpose');
      return;
    }

    if (purpose === 'others' && !otherPurpose.trim()) {
      setSubmitError('Please specify the purpose');
      return;
    }

    if (!concern.trim()) {
      setSubmitError('Please describe your concern/need/problem');
      return;
    }

    if (referralType === 'referred' && !referredBy.trim()) {
      setSubmitError('Please specify who referred you');
      return;
    }

    if (!preferredDate) {
      setSubmitError('Please select a preferred appointment date');
      return;
    }

    if (bookingRules.blackout_dates.includes(preferredDate)) {
      setSubmitError('The selected date is a CPS holiday or closure. Please choose a different date.');
      return;
    }

    if (!bookingRules.operating_days.includes(new Date(preferredDate + 'T00:00:00').getDay())) {
      setSubmitError('CPS is closed on the selected day. Please choose a weekday.');
      return;
    }

    if (!preferredTime) {
      setSubmitError('Please select a preferred appointment time');
      return;
    }

    if (!agreedToTerms) {
      setSubmitError('Please agree to the terms and conditions');
      return;
    }

    // All validation passed, show verification page
    setSubmitError(null);
    setShowVerification(true);
  };

  const handleConfirmAppointment = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setSubmitError('Authentication token not found');
        setSubmitting(false);
        return;
      }

      // Determine final purpose
      const finalPurpose = purpose === 'others' ? otherPurpose : purpose;

      // Create appointment with preferred date and time
      const response = await fetch(api('/api/appointments/request'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone,
          preferred_date: preferredDate,
          preferred_time: preferredTime,
          appointment_type: 'initial',
          purpose: finalPurpose,
          referral_type: referralType,
          referred_by: referralType === 'referred' ? referredBy : null,
          concern: concern,
          preferred_method: preferredMethod,
          agreed_to_terms: termsAccepted,
          ...(selectedSlot && { slot_id: selectedSlot.slot_id, counselor_id: selectedSlot.counselor_id }),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[BookAppointment] Appointment created:', data);
        setBookingResult(data);
        setBookingConfirmed(true);
        clearDraft();
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.replace('/login');
        return;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[BookAppointment] Booking failed:', response.status, errorData);
        const errorMessage = errorData?.error || 'Failed to book appointment. Please try again.';
        setSubmitError(errorMessage);
      }
    } catch (err) {
      console.error('[BookAppointment] Error booking appointment:', err);
      setSubmitError('Error booking appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectSlot = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
    setPreferredDate(slot.slot_start.split('T')[0]);
    setPreferredTime(slot.slot_start.split('T')[1]?.slice(0, 5) || '');
    setShowCustomDateTime(false);
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <DashboardPageWrapper title="Book Appointment" subtitle="Schedule a counseling session">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-50"></div>
        </div>
      </DashboardPageWrapper>
    );
  }

  if (activeApptChecked && activeAppointment) {
    const apptTime = activeAppointment.appointment_time
      ? new Date(activeAppointment.appointment_time).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
      : null;
    return (
      <DashboardPageWrapper title="Book Appointment" subtitle="Schedule a counseling session">
        <div className="max-w-lg mx-auto mt-8">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">You already have an active appointment</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              You can only have one active appointment at a time.
            </p>
            {apptTime && (
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                Scheduled for: {apptTime}
              </p>
            )}
            {activeAppointment.status && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Status: <span className="font-semibold capitalize">{activeAppointment.status.toLowerCase().replace('_', ' ')}</span>
              </p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Please complete, cancel, or reschedule your existing appointment before booking a new one.
            </p>
            <Link href="/my-appointments">
              <button className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition text-sm">
                View My Appointments
              </button>
            </Link>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  if (bookingConfirmed) {
    const apptDate = bookingResult?.requested_start ? new Date(bookingResult.requested_start) : null;
    const apptDateStr = apptDate ? apptDate.toISOString().split('T')[0] : preferredDate;
    const apptTimeStr = apptDate
      ? apptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      : preferredTime;
    const platformMap: Record<string, string> = { 'in-person': 'in_person', 'gmeet': 'google_meet', 'zoom': 'zoom' };

    return (
      <DashboardPageWrapper title="Appointment Confirmed" subtitle="Your booking has been submitted">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Appointment Requested</h1>
            <p className="text-gray-600 dark:text-gray-400">Your appointment request has been submitted successfully</p>
          </div>

          {/* Next Steps */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wide">What happens next</h3>
            <div className="space-y-3">
              {[
                { n: '1', title: 'Check your email', desc: "You'll receive confirmation with your appointment details" },
                { n: '2', title: 'Staff will confirm', desc: 'Our office assistant will confirm your slot based on counselor availability' },
                { n: '3', title: 'Join your appointment', desc: "You'll receive details on how to attend your session" },
              ].map(s => (
                <div key={s.n} className="flex gap-3">
                  <span className="font-semibold text-gray-900 dark:text-white flex-shrink-0">{s.n}</span>
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium">{s.title}</p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Confirmation Document */}
          <div className="mb-8">
            <AppointmentConfirmation
              studentName={`${firstName} ${lastName}`}
              studentId={user?.id_number || ''}
              studentContact={phone || ''}
              appointmentDate={apptDateStr}
              appointmentTime={apptTimeStr}
              platform={platformMap[preferredMethod] || preferredMethod}
              screeningsCompleted={[]}
              referenceId={bookingResult?.reference_id || ''}
              concern={concern}
            />
          </div>

          {/* Summary card */}
          <div className="mb-8 p-4 border border-gray-200 rounded dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wide">Your Appointment</h3>
            <div className="space-y-3">
              {bookingResult?.reference_id && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reference ID</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">{bookingResult.reference_id}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Purpose</p>
                <p className="text-gray-900 dark:text-white font-medium capitalize">{purpose === 'others' ? otherPurpose : purpose}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Preferred Date</p>
                <p className="text-gray-900 dark:text-white font-medium">
                  {new Date(preferredDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Preferred Time</p>
                <p className="text-gray-900 dark:text-white font-medium">{preferredTime}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Format</p>
                <p className="text-gray-900 dark:text-white font-medium capitalize">{preferredMethod.replace('-', ' ')}</p>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="mb-8 p-4 border border-gray-200 rounded dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wide">Need support?</h3>
            <div className="space-y-2">
              <a href="tel:988" className="block p-3 border border-gray-300 rounded hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors">
                <p className="text-gray-900 dark:text-white font-medium">Crisis Support: Call 988</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Available 24/7</p>
              </a>
            </div>
          </div>

          <Link href="/dashboard">
            <button className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded transition-colors dark:bg-gray-700 dark:hover:bg-gray-600">
              Return to Dashboard
            </button>
          </Link>
        </div>
      </DashboardPageWrapper>
    );
  }

  // Review step
  if (showVerification) {
    const finalPurpose = purpose === 'others' ? otherPurpose : purpose;
    const dateString = new Date(preferredDate).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const methodLabel: Record<string, string> = {
      'in-person': 'In-Person (CPS Office)',
      'zoom': 'Zoom',
      'gmeet': 'Google Meet',
    };
    const purposeLabel = finalPurpose.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const timeLabel = preferredTime
      ? new Date(`1970-01-01T${preferredTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      : preferredTime;

    return (
      <DashboardPageWrapper title="Review Appointment" subtitle="Confirm your details before submitting">
        <div className="max-w-2xl mx-auto">

          {/* Step breadcrumb */}
          <div className="flex items-center gap-2 mb-6 text-xs text-gray-400 dark:text-gray-500">
            <span>Fill in details</span>
            <span>›</span>
            <span className="font-semibold text-green-600 dark:text-green-400">Review</span>
            <span>›</span>
            <span>Confirmed</span>
          </div>

          {submitError && (
            <div className="mb-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{submitError}</p>
            </div>
          )}

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">

            {/* Document header */}
            <div className="bg-green-700 px-7 py-5">
              <p className="text-green-300 text-xs font-medium uppercase tracking-wider mb-0.5">De La Salle University · CPS</p>
              <h1 className="text-white text-lg font-bold">Appointment Request — Review</h1>
              <p className="text-green-300 text-xs mt-1">Please verify all information before submitting</p>
            </div>

            <div className="px-7 py-6 space-y-6">

              {/* Personal Information */}
              <ReviewSection title="Personal Information">
                <ReviewRow label="Full Name" value={`${firstName} ${lastName}`} />
                <ReviewRow label="Email Address" value={email} />
                {phone && <ReviewRow label="Phone Number" value={phone} />}
              </ReviewSection>

              <div className="border-t border-gray-100 dark:border-gray-800" />

              {/* Appointment Details */}
              <ReviewSection title="Appointment Details">
                <ReviewRow label="Preferred Date" value={dateString} />
                <ReviewRow label="Preferred Time" value={timeLabel} />
                <ReviewRow label="Mode" value={methodLabel[preferredMethod] || preferredMethod} />
                <ReviewRow label="Purpose" value={purposeLabel} />
                <ReviewRow
                  label="Referral"
                  value={referralType === 'self-referred' ? 'Self-Referred' : `Referred by ${referredBy}`}
                />
              </ReviewSection>

              <div className="border-t border-gray-100 dark:border-gray-800" />

              {/* Primary Concern */}
              <ReviewSection title="Primary Concern">
                <p className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 leading-relaxed border border-gray-100 dark:border-gray-700 whitespace-pre-wrap">
                  {concern}
                </p>
              </ReviewSection>

              <div className="border-t border-gray-100 dark:border-gray-800" />

              {/* Confirm checkbox */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">I confirm all details are correct</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      I have reviewed the information above and agree to proceed with this appointment request.
                    </p>
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleConfirmAppointment}
                  disabled={submitting || !termsAccepted}
                  className={`flex-1 px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
                    submitting || !termsAccepted
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {submitting ? 'Submitting…' : 'Submit Appointment Request'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowVerification(false); setSubmitError(null); }}
                  disabled={submitting}
                  className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  ← Edit
                </button>
              </div>

            </div>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Book Appointment" subtitle="Schedule a counseling session">
      {/* Informed Consent Modal */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full p-8">
            <div className="mb-6 text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Informed Consent</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Before booking an appointment, please review and acknowledge the following.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              {/* Counseling consent */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={consentChecks.counseling}
                    onChange={e => setConsentChecks(c => ({ ...c, counseling: e.target.checked }))}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Consent to Counseling &amp; Psychological Services
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    I voluntarily consent to receive counseling and psychological services from the DLSU Center for
                    Psychology and Counseling (CPS). I understand that sessions are confidential except when required
                    by law or when there is an imminent risk of harm.
                  </p>
                </div>
              </label>

              {/* Data privacy consent */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={consentChecks.privacy}
                    onChange={e => setConsentChecks(c => ({ ...c, privacy: e.target.checked }))}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Acknowledgment of Data Privacy Rights (R.A. 10173)
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    I acknowledge that my personal and sensitive information will be collected, stored, and processed
                    solely for the purpose of delivering counseling services, in accordance with the Data Privacy Act
                    of 2012. I have the right to access, correct, or withdraw my data at any time.
                  </p>
                </div>
              </label>
            </div>

            {consentError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-3 text-center">{consentError}</p>
            )}

            <button
              onClick={handleSubmitConsent}
              disabled={!consentChecks.counseling || !consentChecks.privacy || submittingConsent}
              className={`w-full py-3 rounded-lg font-semibold text-sm transition-colors ${
                consentChecks.counseling && consentChecks.privacy && !submittingConsent
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              {submittingConsent ? 'Recording consent…' : 'I Agree & Continue'}
            </button>

            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
              Your consent is recorded with a timestamp and is required to proceed.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        {/* Error Banner */}
        {submitError && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-50">Booking Error</h3>
                <p className="text-red-700 dark:text-red-300 text-sm">{submitError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Booking Form */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-6">
            Reserve Your Appointment
          </h2>

          {/* Draft Save Success Message */}
          {draftSaved && (
            <div className="mb-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl p-4">
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-50">Draft Saved</h3>
                  <p className="text-green-700 dark:text-green-300 text-sm">Your form data has been saved. You can continue later.</p>
                </div>
              </div>
            </div>
          )}

          {/* Saved Draft Info */}
          {hasDraft && (
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
              <div className="flex gap-3 justify-between items-start">
                <div className="flex gap-3 flex-1">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-50">Draft Available</h3>
                    <p className="text-blue-700 dark:text-blue-300 text-sm">You have a saved draft. Click "Load Draft" to continue where you left off.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={loadDraft}
                    className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                  >
                    Load Draft
                  </button>
                  <button
                    type="button"
                    onClick={clearDraft}
                    className="px-3 py-1 text-sm bg-red-200 hover:bg-red-300 text-red-900 rounded transition"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleBookAppointment} className="space-y-6">
            {/* Personal Information — compact card, expandable if needed */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3">
                <div>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Booking as</span>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{firstName} {lastName}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">{email}</span>
                    {phone && <span className="text-gray-500 dark:text-gray-400 text-sm">{phone}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPersonalInfo(!editingPersonalInfo)}
                  className="text-xs text-green-600 dark:text-green-400 hover:underline flex-shrink-0 ml-4"
                >
                  {editingPersonalInfo ? 'Done' : 'Edit'}
                </button>
              </div>

              {editingPersonalInfo && (
                <div className="px-5 pb-5 pt-1 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        First Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Last Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Email <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Phone <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Purpose of Visit */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Purpose of Counseling <span className="text-red-600">*</span>
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a purpose...</option>
                <option value="counseling">Counseling</option>
                <option value="follow_up_counselling">Follow up counselling</option>
                <option value="intake_interview">Intake interview</option>
                <option value="others">Others (please specify)</option>
              </select>
              {!purpose && submitting && (
                <p className="text-red-600 text-sm mt-1">Required</p>
              )}
            </div>

            {/* Specify Other Purpose */}
            {purpose === 'others' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Please specify <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={otherPurpose}
                  onChange={(e) => setOtherPurpose(e.target.value)}
                  placeholder="Specify the purpose of your visit..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Referral Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                How did you find out about this service? <span className="text-red-600">*</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="referral"
                    value="self-referred"
                    checked={referralType === 'self-referred'}
                    onChange={(e) => setReferralType(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Self Referred</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="referral"
                    value="referred"
                    checked={referralType === 'referred'}
                    onChange={(e) => setReferralType(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Referred by someone/organization</span>
                </label>
              </div>
            </div>

            {/* Referral Source (if referred) */}
            {referralType === 'referred' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Who referred you? <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={referredBy}
                  onChange={(e) => setReferredBy(e.target.value)}
                  placeholder="Please specify the name or organization that referred you..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Concern/Need/Problem Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Describe your concern/need/problem <span className="text-red-600">*</span>
              </label>
              <textarea
                value={concern}
                onChange={(e) => setConcern(e.target.value)}
                placeholder="Please tell us about your concern, need, or problem that brings you here..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
              />
              {!concern && submitting && (
                <p className="text-red-600 text-sm mt-1">Required</p>
              )}
            </div>

            {/* Preferred Method */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Preferred Communication Method <span className="text-red-600">*</span>
              </label>
              <div className="space-y-2">
                {[
                  { value: 'in-person', label: 'In-Person' },
                  { value: 'zoom', label: 'Zoom' },
                  { value: 'gmeet', label: 'Google Meet' },
                ].map((method) => (
                  <label key={method.value} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="method"
                      value={method.value}
                      checked={preferredMethod === method.value}
                      onChange={(e) => setPreferredMethod(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Preferred Date and Time — slot picker + free-form fallback */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Preferred Date &amp; Time <span className="text-red-600">*</span>
              </label>

              {!slotsLoaded ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 py-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
                  <span>Checking available slots…</span>
                </div>
              ) : availableSlots.length > 0 ? (
                <>
                  {/* Slot cards */}
                  <div className="space-y-2">
                    {(showAllSlots ? availableSlots : availableSlots.slice(0, 5)).map(slot => {
                      const start = new Date(slot.slot_start);
                      const end = new Date(slot.slot_end);
                      const isSelected = selectedSlot?.slot_id === slot.slot_id;
                      return (
                        <button
                          key={slot.slot_id}
                          type="button"
                          onClick={() => handleSelectSlot(slot)}
                          className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                            isSelected
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-500'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-900/10'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                {' · '}
                                {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                {' – '}
                                {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{slot.counselor_name}</p>
                            </div>
                            {isSelected && (
                              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {availableSlots.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAllSlots(v => !v)}
                      className="mt-2 text-xs text-green-600 dark:text-green-400 hover:underline"
                    >
                      {showAllSlots ? '▲ Show fewer' : `▼ Show ${availableSlots.length - 5} more slots`}
                    </button>
                  )}

                  {/* Custom date/time toggle */}
                  <button
                    type="button"
                    onClick={() => { setShowCustomDateTime(v => !v); if (showCustomDateTime) { setSelectedSlot(null); setPreferredDate(''); setPreferredTime(''); } }}
                    className="mt-3 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:underline"
                  >
                    {showCustomDateTime ? '▲ Hide custom date/time' : '▼ None of these work? Enter a different date/time'}
                  </button>

                  {showCustomDateTime && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DatePicker value={preferredDate} onChange={v => { setPreferredDate(v); setSelectedSlot(null); }} bookingRules={bookingRules} />
                      <TimePicker value={preferredTime} onChange={v => { setPreferredTime(v); setSelectedSlot(null); }} bookingRules={bookingRules} />
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* No slots — show notice + free-form */}
                  <div className="mb-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-xs text-amber-800 dark:text-amber-300">
                    No counselor slots are currently open. Enter your preferred date and time — CPS staff will review and confirm your request.
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DatePicker value={preferredDate} onChange={setPreferredDate} bookingRules={bookingRules} />
                    <TimePicker value={preferredTime} onChange={setPreferredTime} bookingRules={bookingRules} />
                  </div>
                </>
              )}

              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Office hours: {new Date(`1970-01-01T${bookingRules.operating_hours_start}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} – {new Date(`1970-01-01T${bookingRules.operating_hours_end}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}, {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].filter((_, i) => bookingRules.operating_days.includes(i)).join(' / ')}
              </p>
            </div>

            {/* Terms and Conditions */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
                Terms & Conditions
              </h3>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-4 mb-4 max-h-40 overflow-y-auto text-sm text-gray-700 dark:text-gray-300 space-y-2">
                <p>
                  <strong>1. Confidentiality:</strong> All information shared during counseling sessions is confidential and will be kept secure in accordance with data protection regulations.
                </p>
                <p>
                  <strong>2. Appointment Policies:</strong> Please cancel or reschedule appointments at least 24 hours in advance. No-shows may be subject to a cancellation fee.
                </p>
                <p>
                  <strong>3. Professional Conduct:</strong> Counselors are bound by professional ethical standards and will provide services in a non-judgmental manner.
                </p>
                <p>
                  <strong>4. Consent to Treatment:</strong> By booking an appointment, you consent to receiving counseling and psychological services.
                </p>
                <p>
                  <strong>5. Privacy:</strong> Your personal information will only be used for scheduling and providing counseling services. It will not be shared with third parties without your consent, except as required by law.
                </p>
                <p>
                  <strong>6. Limitation of Liability:</strong> While we strive to provide quality services, we are not liable for indirect or consequential damages arising from the use of our services.
                </p>
              </div>
              
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-4 h-4 mt-1 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  I have read and agree to the terms and conditions for counseling services <span className="text-red-600">*</span>
                </span>
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting || !preferredDate || !preferredTime || !agreedToTerms || !firstName || !lastName || !email}
                className={`flex-1 px-6 py-2 rounded-lg font-medium transition ${
                  submitting || !preferredDate || !preferredTime || !agreedToTerms || !firstName || !lastName || !email
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {submitting ? 'Processing...' : 'Continue'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Info footer */}
        <p className="mt-6 text-xs text-gray-400 dark:text-gray-500 text-center">
          After submitting, our office will confirm your slot based on counselor availability. You will be notified by email.
        </p>
      </div>
    </DashboardPageWrapper>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">{title}</p>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-4">
      <span className="text-xs text-gray-400 dark:text-gray-500 w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-900 dark:text-gray-100 font-medium flex-1">{value}</span>
    </div>
  );
}

function DatePicker({ value, onChange, bookingRules }: { value: string; onChange: (v: string) => void; bookingRules: BookingRules }) {
  const isInvalid = value && (
    bookingRules.blackout_dates.includes(value) ||
    !bookingRules.operating_days.includes(new Date(value + 'T00:00:00').getDay())
  );
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Date</label>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        min={new Date(Date.now() + bookingRules.min_days_ahead * 86400000).toISOString().split('T')[0]}
        max={new Date(Date.now() + bookingRules.max_days_ahead * 86400000).toISOString().split('T')[0]}
        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent ${
          isInvalid ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
        }`}
      />
      {value && bookingRules.blackout_dates.includes(value) && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">CPS holiday — choose another date.</p>
      )}
      {value && !bookingRules.blackout_dates.includes(value) && !bookingRules.operating_days.includes(new Date(value + 'T00:00:00').getDay()) && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">CPS is closed this day — choose a weekday.</p>
      )}
    </div>
  );
}

function TimePicker({ value, onChange, bookingRules }: { value: string; onChange: (v: string) => void; bookingRules: BookingRules }) {
  const slots: string[] = [];
  const [startH, startM] = bookingRules.operating_hours_start.split(':').map(Number);
  const [lastH, lastM] = bookingRules.last_slot_start.split(':').map(Number);
  let cur = startH * 60 + startM;
  const last = lastH * 60 + lastM;
  while (cur <= last) {
    slots.push(`${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`);
    cur += bookingRules.slot_duration_minutes;
  }
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Time</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
      >
        <option value="">Select a time</option>
        {slots.map(t => (
          <option key={t} value={t}>
            {new Date(`1970-01-01T${t}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </option>
        ))}
      </select>
    </div>
  );
}
