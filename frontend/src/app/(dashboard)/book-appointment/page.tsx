'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
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

export default function BookAppointmentPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Available slots
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
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

        // Fetch available slots for next 30 days
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        const response = await fetch(
          api(`/api/appointments/availability?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`),
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log('[BookAppointment] Available slots:', data);
          setAvailableSlots(data.available_slots || []);
        } else {
          const errorData = await response.text();
          console.error('[BookAppointment] Failed to fetch slots:', response.status, errorData);
          setLoadError('Failed to load available appointment slots');
        }

        setLoading(false);
      } catch (err) {
        console.error('[BookAppointment] Error loading data:', err);
        setLoadError('Error loading available appointments');
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

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
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[BookAppointment] Appointment created:', data);
        setBookingResult(data);
        setBookingConfirmed(true);
        clearDraft();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[BookAppointment] Booking failed:', response.status, errorData);
        // Display specific error message from backend if available
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

  // Show verification/checking page if in verification step
  if (showVerification) {
    const finalPurpose = purpose === 'others' ? otherPurpose : purpose;
    const appointmentDate = new Date(preferredDate);
    const dateString = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return (
      <DashboardPageWrapper title="Appointment Verification" subtitle="Review and confirm your appointment request">
        <div className="max-w-4xl mx-auto">
          {submitError && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 dark:text-red-50">Submission Error</h3>
                  <p className="text-red-700 dark:text-red-300 text-sm">{submitError}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-emerald-700 dark:bg-emerald-800 text-white p-6 mb-6">
              <h1 className="text-3xl font-bold mb-2">Appointment Request Form</h1>
              <p className="text-emerald-50">Please review all information carefully before submitting</p>
            </div>

            <div className="px-8 pb-8">
              {/* Student Information Section */}
              <div className="mb-8">
                <div className="bg-emerald-700 dark:bg-emerald-800 text-white px-4 py-2 rounded mb-4">
                  <h2 className="font-bold text-lg">PERSONAL INFORMATION</h2>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded">
                  <div className="grid grid-cols-2 gap-0">
                    <div className="border-r border-gray-200 dark:border-gray-700 border-b border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">First Name</p>
                      <p className="text-gray-900 dark:text-gray-50 font-medium">{firstName}</p>
                    </div>
                    <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Last Name</p>
                      <p className="text-gray-900 dark:text-gray-50 font-medium">{lastName}</p>
                    </div>
                    <div className="border-r border-gray-200 dark:border-gray-700 border-b border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Email Address</p>
                      <p className="text-gray-900 dark:text-gray-50 font-medium">{email}</p>
                    </div>
                    <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Phone Number</p>
                      <p className="text-gray-900 dark:text-gray-50 font-medium">{phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Appointment Details Section */}
              <div className="mb-8">
                <div className="bg-emerald-700 dark:bg-emerald-800 text-white px-4 py-2 rounded mb-4">
                  <h2 className="font-bold text-lg">APPOINTMENT DETAILS</h2>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded">
                  <div className="grid grid-cols-2 gap-0">
                    <div className="border-r border-gray-200 dark:border-gray-700 border-b border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Preferred Date</p>
                      <p className="text-gray-900 dark:text-gray-50 font-medium">{dateString}</p>
                    </div>
                    <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Preferred Time</p>
                      <p className="text-gray-900 dark:text-gray-50 font-medium">{preferredTime}</p>
                    </div>
                    <div className="border-r border-gray-200 dark:border-gray-700 border-b border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Preferred Method</p>
                      <p className="text-gray-900 dark:text-gray-50 font-medium capitalize">{preferredMethod}</p>
                    </div>
                    <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Purpose</p>
                      <p className="text-gray-900 dark:text-gray-50 font-medium">{finalPurpose}</p>
                    </div>
                    <div className="border-r border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Referral Type</p>
                      <p className="text-gray-900 dark:text-gray-50 font-medium capitalize">{referralType === 'self-referred' ? 'Self-Referred' : 'Referred'}</p>
                    </div>
                    {referralType === 'referred' && (
                      <div className="p-4 bg-white dark:bg-gray-900">
                        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Referred By</p>
                        <p className="text-gray-900 dark:text-gray-50 font-medium">{referredBy}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Concern Section */}
              <div className="mb-8">
                <div className="bg-emerald-700 dark:bg-emerald-800 text-white px-4 py-2 rounded mb-4">
                  <h2 className="font-bold text-lg">PRIMARY CONCERN</h2>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-800 min-h-24">
                  <p className="text-gray-900 dark:text-gray-50">{concern}</p>
                </div>
              </div>

              {/* Important Notes */}
              <div className="mb-8">
                <div className="bg-emerald-700 dark:bg-emerald-800 text-white px-4 py-2 rounded mb-4">
                  <h2 className="font-bold text-lg">IMPORTANT NOTES</h2>
                </div>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                  <li>• All information provided must be accurate and complete</li>
                  <li>• Please ensure your preferred date and time are accurate</li>
                  <li>• You will receive a confirmation email with appointment details</li>
                  <li>• Contact support at least 24 hours before for rescheduling requests</li>
                  <li>• I agree to the terms and conditions stated in the form</li>
                </ul>
              </div>

              {/* Verification Checkbox */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-8">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-5 h-5 mt-1 rounded"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-50">I confirm all details are correct</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">I verify the appointment information is accurate and agree to proceed with booking. <span className="text-red-500 font-semibold">*</span></p>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleConfirmAppointment}
                  disabled={submitting}
                  className={`flex-1 px-6 py-3 rounded font-bold transition ${
                    submitting
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  }`}
                >
                  {submitting ? 'Submitting...' : 'Submit Appointment Request'}
                </button>
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={submitting}
                  className={`px-6 py-3 rounded font-bold transition ${
                    submitting
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  Save for Later
                </button>
                <button
                  type="button"
                  onClick={() => setShowVerification(false)}
                  disabled={submitting}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition font-bold"
                >
                  Back
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
      <div className="max-w-2xl mx-auto">
        {/* Error Banner */}
        {submitError && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
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
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-6">
            Reserve Your Appointment
          </h2>

          {/* Draft Save Success Message */}
          {draftSaved && (
            <div className="mb-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
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
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
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
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
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
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex-shrink-0 ml-4"
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
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
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
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
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
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
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
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
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

            {/* Preferred Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Preferred Date <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  max={new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">From tomorrow onwards</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Preferred Time <span className="text-red-600">*</span>
                </label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a time</option>
                  {Array.from({ length: 9 }, (_, i) => {
                    const hour = 9 + i;
                    const timeStr = `${String(hour).padStart(2, '0')}:00`;
                    const displayTime = new Date(0, 0, 0, hour).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    });
                    return (
                      <option key={timeStr} value={timeStr}>
                        {displayTime}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Please select your preferred date (from tomorrow onwards, up to 30 days) and time. Our office assistant will confirm your appointment based on counselor availability.
            </p>

            {/* Terms and Conditions */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6">
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

        {/* Info Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-50 text-sm mb-2">
              What Happens Next?
            </h3>
            <p className="text-blue-700 dark:text-blue-300 text-xs">
              You'll receive a confirmation email with your appointment details and a link to join.
            </p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
            <h3 className="font-semibold text-purple-900 dark:text-purple-50 text-sm mb-2">
              How to Prepare
            </h3>
            <p className="text-purple-700 dark:text-purple-300 text-xs">
              Have your device ready (Zoom/Google Meet) or arrive 5 min early for in-person appointments.
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 dark:text-green-50 text-sm mb-2">
              Need Help?
            </h3>
            <p className="text-green-700 dark:text-green-300 text-xs">
              Contact our support team at support@counseling.edu or call (555) 123-4567.
            </p>
          </div>
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
