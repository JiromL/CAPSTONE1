'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import Link from 'next/link';

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

  // Booking form state
  const [purpose, setPurpose] = useState('');
  const [otherPurpose, setOtherPurpose] = useState('');
  const [concern, setConcern] = useState('');
  const [referralType, setReferralType] = useState('self-referred');
  const [referredBy, setReferredBy] = useState('');
  const [preferredMethod, setPreferredMethod] = useState('in-person');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
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

        setUser(JSON.parse(userData));

        // Fetch available slots for next 30 days
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        const response = await fetch(
          `http://localhost:5001/api/appointments/availability?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
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

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();

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
      const response = await fetch('http://localhost:5001/api/appointments/request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferred_date: preferredDate,
          preferred_time: preferredTime,
          appointment_type: 'initial',
          purpose: finalPurpose,
          referral_type: referralType,
          referred_by: referralType === 'referred' ? referredBy : null,
          concern: concern,
          preferred_method: preferredMethod,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[BookAppointment] Appointment created:', data);
        setBookingConfirmed(true);
        
        // Redirect after showing confirmation
        setTimeout(() => {
          router.push('/appointments');
        }, 2500);
      } else {
        const errorData = await response.text();
        console.error('[BookAppointment] Booking failed:', response.status, errorData);
        setSubmitError('Failed to book appointment. Please try again.');
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
    return (
      <DashboardPageWrapper title="Book Appointment" subtitle="Schedule a counseling session">
        <div className="max-w-2xl mx-auto">
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-900 dark:text-green-50 mb-2">
              Appointment Booked Successfully!
            </h2>
            <p className="text-green-700 dark:text-green-300 mb-6">
              Your appointment request has been submitted. You will receive a confirmation email shortly.
            </p>
            <Link href="/appointments">
              <button className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition">
                View My Appointments
              </button>
            </Link>
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

          <form onSubmit={handleBookAppointment} className="space-y-6">
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
                  min={new Date().toISOString().split('T')[0]}
                  max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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
              Please select your preferred date (up to 30 days from today) and time. Our office assistant will confirm your appointment based on counselor availability.
            </p>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting || !preferredDate || !preferredTime}
                className={`flex-1 px-6 py-2 rounded-lg font-medium transition ${
                  submitting || !preferredDate || !preferredTime
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {submitting ? 'Booking...' : 'Book Appointment'}
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
