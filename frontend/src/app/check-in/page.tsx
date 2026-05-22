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
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-sm font-bold">CPS</span>
          </div>
          <p className="text-xs text-gray-500">DLSU Counseling & Psychological Services</p>
        </div>

        {/* Card */}
        {state === 'loading' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <Loader2 size={32} className="animate-spin text-indigo-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">Verifying QR code…</p>
            <p className="text-xs text-gray-400 mt-1">Please wait</p>
          </div>
        )}

        {state === 'success' && result && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Success banner */}
            <div className="bg-green-500 px-6 py-5 text-center">
              <CheckCircle size={36} className="text-white mx-auto mb-2" />
              <p className="text-white font-bold text-lg">Checked In</p>
              <p className="text-green-100 text-xs mt-0.5">
                {new Date(result.checked_in_at || '').toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </p>
            </div>

            {/* Student info */}
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-indigo-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-base">{result.student_name}</p>
                  {result.student_id_number && (
                    <p className="text-xs text-gray-500">{result.student_id_number}</p>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <Row label="Appointment" value={result.appointment_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} />
                <Row label="Purpose" value={result.purpose?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} />
                <Row label="Counselor" value={result.counselor_name} />
                <Row label="Scheduled" value={formatDt(result.scheduled_start)} />
                <Row label="Mode" value={formatMethod(result.method)} />
                {result.reference_id && <Row label="Reference" value={result.reference_id} mono />}
              </div>
            </div>

            <div className="px-6 pb-5">
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-green-700 font-medium">Student has been marked as arrived</p>
              </div>
            </div>
          </div>
        )}

        {state === 'error' && result && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className={`px-6 py-5 text-center ${result.error?.includes('expired') ? 'bg-amber-500' : result.error?.includes('already') ? 'bg-blue-500' : 'bg-red-500'}`}>
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
              <p className="text-sm text-gray-700">{result.error}</p>
              {result.error?.includes('expired') && (
                <p className="text-xs text-gray-500 mt-3">Ask the student to open their My Appointments page and generate a new QR code.</p>
              )}
              {result.error?.includes('already') && (
                <p className="text-xs text-gray-500 mt-3">This student has already checked in. Check the attendance log if needed.</p>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">CPS Check-In System · DLSU</p>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      <span className={`text-xs text-gray-800 text-right font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    }>
      <CheckInContent />
    </Suspense>
  );
}
