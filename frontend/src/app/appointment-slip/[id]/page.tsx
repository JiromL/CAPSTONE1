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
  return (
    d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) +
    '  ·  ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  );
}

function formatMethod(m: string | undefined) {
  if (!m) return 'In-Person';
  if (m === 'zoom') return 'Zoom';
  if (m === 'google_meet' || m === 'google-meet') return 'Google Meet';
  return 'In-Person';
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

    Promise.all([
      fetch(api(`/api/qr/appointment-info/${id}`), { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : Promise.reject(r)),
      fetch(api(`/api/qr/appointment/${id}`), { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ])
      .then(([info, qr]) => {
        setSlip({ ...info, qr_image: qr?.qr_image, qr_expires_at: qr?.expires_at });
      })
      .catch(() => setError('Could not load appointment details. Make sure this is your confirmed appointment.'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !slip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-sm w-full text-center">
          <AlertCircle size={28} className="text-red-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">{error || 'Appointment not found'}</p>
          <button onClick={() => router.back()} className="mt-4 text-xs text-gray-500 hover:text-gray-700 underline">
            ← Go back
          </button>
        </div>
      </div>
    );
  }

  const isConfirmed = ['CONFIRMED', 'confirmed', 'APPROVED', 'approved'].includes(slip.status);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">

      {/* Action bar */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <div className="flex-1" />
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>

      {/* Slip */}
      <div className="max-w-[720px] mx-auto p-5 print:p-0 print:max-w-none">
        <div className="bg-white rounded-xl print:rounded-none border border-gray-200 print:border-0 shadow-sm overflow-hidden">

          {/* Header */}
          <div className="border-b-2 border-gray-900 px-8 py-6 print:px-6 print:py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  De La Salle University
                </p>
                <h1 className="text-xl font-bold text-gray-900 mt-0.5 leading-tight">
                  Counseling &amp; Psychological Services
                </h1>
                <p className="text-xs text-gray-400 mt-1">Appointment Confirmation Slip</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-400">Date Printed</p>
                <p className="text-sm font-medium text-gray-700 mt-0.5">
                  {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {/* Reference banner */}
          <div className="flex items-center justify-between px-8 py-3 print:px-6 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-gray-400">Reference No.</p>
                <p className="text-base font-bold text-gray-900 font-mono tracking-wider mt-0.5">
                  {slip.reference_id}
                </p>
              </div>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${
              isConfirmed
                ? 'bg-white text-gray-700 border-gray-300'
                : 'bg-white text-gray-500 border-gray-200'
            }`}>
              {slip.status}
            </span>
          </div>

          <div className="px-8 py-6 print:px-6 print:py-5">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] print:grid-cols-[1fr_auto] gap-8">

              {/* Left: details */}
              <div className="space-y-6">

                <SlipSection title="Student Information">
                  <SlipRow label="Full Name" value={slip.student_name} />
                  <SlipRow label="ID Number" value={slip.student_id_number} />
                  <SlipRow label="College" value={slip.student_college} />
                  <SlipRow label="Email" value={slip.student_email} />
                </SlipSection>

                <div className="border-t border-gray-100" />

                <SlipSection title="Appointment Details">
                  <SlipRow label="Type" value={formatType(slip.appointment_type)} />
                  <SlipRow label="Purpose" value={formatType(slip.purpose)} />
                  {slip.concern && <SlipRow label="Concern" value={slip.concern} />}
                  <SlipRow label="Counselor" value={slip.counselor_name} />
                  <SlipRow label="Schedule" value={formatDt(slip.scheduled_start)} />
                  <SlipRow label="Mode" value={formatMethod(slip.method)} />
                  <SlipRow
                    label="Date Filed"
                    value={
                      slip.created_at
                        ? new Date(slip.created_at).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric',
                          })
                        : undefined
                    }
                  />
                </SlipSection>

              </div>

              {/* Right: QR */}
              <div className="flex flex-col items-center gap-4 w-48 flex-shrink-0">
                <div className="border border-gray-200 rounded-lg p-3 w-full text-center">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Check-In QR
                  </p>
                  {slip.qr_image ? (
                    <>
                      <img
                        src={slip.qr_image}
                        alt="Check-in QR Code"
                        className="w-36 h-36 mx-auto"
                      />
                      <p className="text-xs text-gray-400 mt-3 leading-snug">
                        Present to the CPS receptionist upon arrival
                      </p>
                      {slip.qr_expires_at && (
                        <p className="text-xs text-gray-400 mt-1">
                          Valid until{' '}
                          {new Date(slip.qr_expires_at).toLocaleTimeString('en-US', {
                            hour: 'numeric', minute: '2-digit', hour12: true,
                          })}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="w-36 h-36 mx-auto bg-gray-50 border border-dashed border-gray-200 rounded flex flex-col items-center justify-center gap-2">
                      <AlertCircle size={16} className="text-gray-300" />
                      <p className="text-xs text-gray-300 text-center leading-snug px-2">
                        Available for confirmed appointments
                      </p>
                    </div>
                  )}
                </div>

                {/* Reminders */}
                <div className="border border-gray-200 rounded-lg p-3 w-full text-xs text-gray-500 space-y-2">
                  <p className="font-semibold text-gray-600">Reminders</p>
                  <p>· Bring a valid school ID</p>
                  <p>· Arrive 10 minutes early</p>
                  <p>· QR expires 30 min after generation</p>
                  <p>· Reschedule at least 24 hrs in advance</p>
                </div>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-8 py-3 print:px-6 text-center">
            <p className="text-xs text-gray-400">
              CPS Office · Henry Sy Sr. Hall · counseling@dlsu.edu.ph
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

function SlipSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function SlipRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <span className="text-xs text-gray-400 w-20 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-gray-800 font-medium flex-1 leading-snug">{value}</span>
    </div>
  );
}
