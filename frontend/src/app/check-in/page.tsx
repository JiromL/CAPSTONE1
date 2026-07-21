'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, AlertCircle, Clock, User, Calendar, Loader2 } from 'lucide-react';
import { api } from '@/utils/api';

interface CheckInResult {
  success: boolean;
  student_name?: string;
  student_id_number?: string;
  counselor_name?: string;
  appointment_type?: string;
  purpose?: string;
  scheduled_start?: string;
  reference_id?: string;
  method?: string;
  checked_in_at?: string;
  error?: string;
}

type State = 'loading' | 'success' | 'error';

function formatDt(dt: string | undefined) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return dt;
  return d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatMethod(m: string | undefined) {
  if (!m) return 'In Person';
  if (m === 'zoom') return 'Zoom';
  if (m === 'google_meet' || m === 'google-meet') return 'Google Meet';
  return 'In Person';
}

function CheckInContent() {
  const params = useSearchParams();
  const token = params.get('token');
  const appt = params.get('appt');

  const [state, setState] = useState<State>('loading');
  const [result, setResult] = useState<CheckInResult | null>(null);

  useEffect(() => {
    if (!token || !appt) {
      setState('error');
      setResult({ success: false, error: 'Invalid QR code. Missing token or appointment ID.' });
      return;
    }

    fetch(api('/api/qr/verify-public'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, appointment_id: appt }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setState('success');
          setResult(data);
        } else {
          setState('error');
          setResult({ success: false, error: data.error || 'Verification failed.' });
        }
      })
      .catch(() => {
        setState('error');
        setResult({ success: false, error: 'Could not connect to the server. Please try again.' });
      });
  }, [token, appt]);

  const errBg = result?.error?.includes('expired') ? '#F59E0B' : result?.error?.includes('already') ? '#3B82F6' : '#EF4444';

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'var(--color-success)' }}>
            <span className="text-white text-sm font-bold">CPS</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>DLSU Counseling &amp; Psychological Services</p>
        </div>

        {/* Loading */}
        {state === 'loading' && (
          <div className="rounded-2xl p-8 text-center"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
            <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: 'var(--color-success)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Verifying QR code…</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Please wait</p>
          </div>
        )}

        {/* Success */}
        {state === 'success' && result && (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="px-6 py-5 text-center" style={{ background: '#22C55E' }}>
              <CheckCircle size={36} className="text-white mx-auto mb-2" />
              <p className="text-white font-bold text-lg">Checked In</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {new Date(result.checked_in_at || '').toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true })}
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--color-success-surface)' }}>
                  <User size={18} style={{ color: 'var(--color-success)' }} />
                </div>
                <div>
                  <p className="font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>{result.student_name}</p>
                  {result.student_id_number && (
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{result.student_id_number}</p>
                  )}
                </div>
              </div>

              <div className="pt-4 space-y-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                <Row label="Appointment" value={result.appointment_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} />
                <Row label="Purpose" value={result.purpose?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} />
                <Row label="Counselor" value={result.counselor_name} />
                <Row label="Scheduled" value={formatDt(result.scheduled_start)} />
                <Row label="Mode" value={formatMethod(result.method)} />
                {result.reference_id && <Row label="Reference" value={result.reference_id} mono />}
              </div>
            </div>

            <div className="px-6 pb-5">
              <div className="rounded-xl px-4 py-3 text-center"
                style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>Student has been marked as arrived</p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {state === 'error' && result && (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="px-6 py-5 text-center" style={{ background: errBg }}>
              {result.error?.includes('expired') ? (
                <Clock size={36} className="text-white mx-auto mb-2" />
              ) : result.error?.includes('already') ? (
                <AlertCircle size={36} className="text-white mx-auto mb-2" />
              ) : (
                <XCircle size={36} className="text-white mx-auto mb-2" />
              )}
              <p className="text-white font-bold text-lg">
                {result.error?.includes('expired') ? 'QR Expired' : result.error?.includes('already') ? 'Already Scanned' : 'Invalid QR'}
              </p>
            </div>
            <div className="px-6 py-5 text-center">
              <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{result.error}</p>
              {result.error?.includes('expired') && (
                <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>Ask the student to open their My Appointments page and generate a new QR code.</p>
              )}
              {result.error?.includes('already') && (
                <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>This student has already checked in. Check the attendance log if needed.</p>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>CPS Check-In System · DLSU</p>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className={`text-xs text-right font-medium ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--color-text-primary)' }}>{value}</span>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-success)' }} />
      </div>
    }>
      <CheckInContent />
    </Suspense>
  );
}
