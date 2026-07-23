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
    d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) +
    '  ·  ' +
    d.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true })
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  if (error || !slip) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
        <div className="rounded-xl p-8 max-w-sm w-full text-center"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          <AlertCircle size={28} className="mx-auto mb-3" style={{ color: 'var(--color-danger)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{error || 'Appointment not found'}</p>
          <button onClick={() => router.back()}
            className="mt-4 text-xs underline"
            style={{ color: 'var(--color-text-muted)' }}>
            ← Go back
          </button>
        </div>
      </div>
    );
  }

  const isConfirmed = ['CONFIRMED', 'confirmed', 'APPROVED', 'approved'].includes(slip.status);

  return (
    <div className="min-h-screen print:bg-white" style={{ background: 'var(--color-bg)' }}>

      {/* Action bar */}
      <div className="print:hidden sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm transition"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
        >
          <ArrowLeft size={15} /> Back
        </button>
        <div className="flex-1" />
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition"
          style={{ background: 'var(--color-text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>

      {/* Slip */}
      <div className="max-w-[720px] mx-auto p-5 print:p-0 print:max-w-none">
        <div className="rounded-xl print:rounded-none print:border-0 shadow-sm overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>

          {/* Header */}
          <div className="px-8 py-6 print:px-6 print:py-5" style={{ borderBottom: '2px solid var(--color-text-primary)' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                  De La Salle University
                </p>
                <h1 className="text-xl font-bold mt-0.5 leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                  Counseling &amp; Psychological Services
                </h1>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Appointment Confirmation Slip</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Date Printed</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {/* Pending notice */}
          {!isConfirmed && (
            <div className="px-8 py-3 print:px-6 flex items-start gap-2" style={{ background: 'var(--color-warning-surface)', borderBottom: '1px solid var(--color-warning)' }}>
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
              <p className="text-xs" style={{ color: 'var(--color-warning-text)' }}>
                <span className="font-semibold">This appointment is not yet confirmed.</span> The schedule shown below reflects your preferred date and time. CPS staff will review your request and confirm a final schedule.
              </p>
            </div>
          )}

          {/* Reference banner */}
          <div className="flex items-center justify-between px-8 py-3 print:px-6" style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Reference No.</p>
                <p className="text-base font-bold font-mono tracking-wider mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                  {slip.reference_id}
                </p>
              </div>
            </div>
            <span
              className="text-xs px-3 py-1 rounded-full font-semibold"
              style={isConfirmed
                ? { background: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-strong)' }
                : { background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }
              }
            >
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

                <div style={{ borderTop: '1px solid var(--color-border)' }} />

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
                        ? new Date(slip.created_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila',
                            year: 'numeric', month: 'long', day: 'numeric',
                          })
                        : undefined
                    }
                  />
                </SlipSection>

              </div>

              {/* Right: QR */}
              <div className="flex flex-col items-center gap-4 w-48 flex-shrink-0">
                <div className="rounded-lg p-3 w-full text-center" style={{ border: '1px solid var(--color-border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-muted)' }}>
                    Check-In QR
                  </p>
                  {slip.qr_image ? (
                    <>
                      <img
                        src={slip.qr_image}
                        alt="Check-in QR Code"
                        className="w-36 h-36 mx-auto"
                      />
                      <p className="text-xs mt-3 leading-snug" style={{ color: 'var(--color-text-muted)' }}>
                        Present to the CPS receptionist upon arrival
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        Valid for today · refreshes if used
                      </p>
                    </>
                  ) : (
                    <div className="w-36 h-36 mx-auto rounded flex flex-col items-center justify-center gap-2" style={{ background: 'var(--color-bg)', border: '1px dashed var(--color-border)' }}>
                      <AlertCircle size={16} style={{ color: 'var(--color-border-strong)' }} />
                      <p className="text-xs text-center leading-snug px-2" style={{ color: 'var(--color-border-strong)' }}>
                        Available for confirmed appointments
                      </p>
                    </div>
                  )}
                </div>

                {/* Reminders */}
                <div className="rounded-lg p-3 w-full text-xs space-y-2" style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                  <p className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Reminders</p>
                  <p>· Bring a valid school ID</p>
                  <p>· Arrive 10 minutes early</p>
                  <p>· QR expires 30 min after generation</p>
                  <p>· Reschedule at least 24 hrs in advance</p>
                </div>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-3 print:px-6 text-center" style={{ borderTop: '1px solid var(--color-border)' }}>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
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
      <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--color-text-muted)' }}>{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function SlipRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <span className="text-xs w-20 flex-shrink-0 pt-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className="text-xs font-medium flex-1 leading-snug" style={{ color: 'var(--color-text-primary)' }}>{value}</span>
    </div>
  );
}
