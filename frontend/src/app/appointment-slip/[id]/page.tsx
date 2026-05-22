'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Printer, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/utils/api';

interface SlipData {
  appointment_id: string;
  reference_id: string;
  student_name: string;
  student_id_number: string;
  student_email: string;
  student_college: string;
  counselor_name: string;
  appointment_type: string;
  purpose: string;
  concern: string;
  scheduled_start: string;
  method: string;
  status: string;
  created_at: string;
  qr_image?: string;
  qr_expires_at?: string;
}

function formatDt(dt: string | undefined) {
  if (!dt) return 'To be confirmed';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return dt;
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) +
    '  ·  ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatMethod(m: string | undefined) {
  if (!m) return 'In Person';
  if (m === 'zoom') return 'Zoom';
  if (m === 'google_meet' || m === 'google-meet') return 'Google Meet';
  return 'In Person';
}

function formatType(t: string | undefined) {
  if (!t) return '—';
  return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function AppointmentSlipPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [slip, setSlip] = useState<SlipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    // Fetch appointment info + QR in parallel
    Promise.all([
      fetch(api(`/api/qr/appointment-info/${id}`), { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : Promise.reject(r)),
      fetch(api(`/api/qr/appointment/${id}`), { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null).catch(() => null),
    ])
      .then(([info, qr]) => {
        setSlip({
          ...info,
          qr_image: qr?.qr_image,
          qr_expires_at: qr?.expires_at,
        });
      })
      .catch(() => setError('Could not load appointment details. Make sure this is your confirmed appointment.'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !slip) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-sm w-full text-center">
          <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
          <p className="text-sm text-gray-700">{error || 'Appointment not found'}</p>
          <button onClick={() => router.back()} className="mt-4 text-xs text-indigo-600 hover:underline">← Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">

      {/* Action bar — hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex-1" />
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Printer size={15} /> Print / Save as PDF
        </button>
      </div>

      {/* Slip */}
      <div className="max-w-2xl mx-auto p-4 print:p-0 print:max-w-none">
        <div className="bg-white rounded-2xl print:rounded-none shadow-sm border border-gray-200 print:border-0 overflow-hidden">

          {/* Header */}
          <div className="bg-indigo-700 px-8 py-6 print:py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">De La Salle University</p>
                <h1 className="text-white text-xl font-bold mt-0.5">Counseling & Psychological Services</h1>
                <p className="text-indigo-300 text-xs mt-1">Appointment Confirmation Slip</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl font-bold">CPS</span>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 print:px-6 print:py-4">
            {/* Reference ID banner */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Reference Number</p>
                <p className="text-base font-bold text-gray-900 font-mono tracking-wider mt-0.5">{slip.reference_id}</p>
              </div>
              <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${slip.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {slip.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6">

              {/* Left column — student + appointment details */}
              <div className="space-y-5">
                <Section title="Student Information">
                  <Field label="Full Name" value={slip.student_name} />
                  <Field label="ID Number" value={slip.student_id_number} />
                  <Field label="College" value={slip.student_college} />
                  <Field label="Email" value={slip.student_email} />
                </Section>

                <Section title="Appointment Details">
                  <Field label="Type" value={formatType(slip.appointment_type)} />
                  <Field label="Purpose" value={formatType(slip.purpose)} />
                  {slip.concern && <Field label="Concern" value={slip.concern} />}
                  <Field label="Counselor" value={slip.counselor_name} />
                  <Field label="Schedule" value={formatDt(slip.scheduled_start)} />
                  <Field label="Mode" value={formatMethod(slip.method)} />
                  <Field label="Date Filed" value={slip.created_at ? new Date(slip.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'} />
                </Section>
              </div>

              {/* Right column — QR code */}
              <div className="flex flex-col items-center justify-start gap-4">
                <div className="border border-gray-200 rounded-xl p-4 text-center w-full">
                  <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Check-In QR Code</p>
                  {slip.qr_image ? (
                    <>
                      <img
                        src={slip.qr_image}
                        alt="Check-in QR Code"
                        className="w-44 h-44 mx-auto rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-3">Show this to the CPS receptionist upon arrival</p>
                      {slip.qr_expires_at && (
                        <p className="text-xs text-amber-600 mt-1">
                          Valid until {new Date(slip.qr_expires_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="w-44 h-44 mx-auto bg-gray-100 rounded-lg flex flex-col items-center justify-center gap-2">
                      <AlertCircle size={20} className="text-gray-400" />
                      <p className="text-xs text-gray-400 text-center px-2">QR available for confirmed appointments only</p>
                    </div>
                  )}
                </div>

                {/* Notes box */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 w-full text-xs text-amber-800 space-y-1.5">
                  <p className="font-semibold">Important Reminders:</p>
                  <p>1. Bring a valid school ID for verification.</p>
                  <p>2. Arrive 10 minutes before your scheduled time.</p>
                  <p>3. QR code expires 30 minutes after generation. Regenerate if needed.</p>
                  <p>4. Rescheduling must be done at least 24 hours in advance.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-8 py-4 bg-gray-50 print:bg-white text-center">
            <p className="text-xs text-gray-400">CPS Office · Henry Sy Sr. Hall · counseling@dlsu.edu.ph · Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-xs text-gray-400 w-24 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-gray-800 font-medium flex-1">{value}</span>
    </div>
  );
}
