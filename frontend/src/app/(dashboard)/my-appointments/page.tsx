'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { Calendar, Clock, MapPin, User, CheckCircle, XCircle, AlertCircle, Loader2, Video, Repeat } from 'lucide-react';

interface Appointment {
  _id: string;
  appointment_type: string;
  status: string;
  datetime: string;
  duration_minutes: number;
  counselor_name: string;
  counselor_email: string;
  location: string;
  notes: string;
  created_at: string;
  meeting_link?: string;
  is_telehealth?: boolean;
  preferred_method?: string;
  is_recurring?: boolean;
  recurrence?: string;
  recurrence_index?: number;
  recurrence_total?: number;
  late_cancellation?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  CONFIRMED:       { label: 'Confirmed',        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',   icon: <CheckCircle size={13} /> },
  REQUESTED:       { label: 'Pending',           color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <AlertCircle size={13} /> },
  PENDING_APPROVAL:{ label: 'Under Review',      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',      icon: <AlertCircle size={13} /> },
  APPROVED:        { label: 'Approved',          color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: <CheckCircle size={13} /> },
  COMPLETED:       { label: 'Completed',         color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',         icon: <CheckCircle size={13} /> },
  CANCELLED:       { label: 'Cancelled',         color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',          icon: <XCircle size={13} /> },
  DENIED:          { label: 'Denied',            color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',          icon: <XCircle size={13} /> },
  NO_SHOW:         { label: 'No Show',           color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400', icon: <XCircle size={13} /> },
  MATCHED:         { label: 'Matched',           color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: <CheckCircle size={13} /> },
};

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(dt: string) {
  return new Date(dt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function isUpcoming(dt: string) {
  return new Date(dt) > new Date();
}

export default function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setError('Not authenticated'); setLoading(false); return; }

    fetch(api('/api/appointments/my-appointments'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { setAppointments(data.appointments || []); setLoading(false); })
      .catch(() => { setError('Failed to load appointments.'); setLoading(false); });
  }, []);

  const upcoming = appointments.filter(a => isUpcoming(a.datetime) && !['CANCELLED','DENIED','COMPLETED','NO_SHOW'].includes(a.status));
  const past = appointments.filter(a => !isUpcoming(a.datetime) || ['CANCELLED','DENIED','COMPLETED','NO_SHOW'].includes(a.status));

  return (
    <DashboardPageWrapper title="My Appointments" subtitle="View your scheduled and past sessions">
      <div className="max-w-3xl mx-auto space-y-6">

        {loading && (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={24} className="animate-spin mr-2" /> Loading appointments…
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && appointments.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Calendar size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">No appointments yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Your scheduled sessions will appear here.</p>
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Upcoming</h2>
            <div className="space-y-3">
              {upcoming.map(appt => <AppointmentCard key={appt._id} appt={appt} highlight />)}
            </div>
          </section>
        )}

        {/* Past */}
        {past.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Past</h2>
            <div className="space-y-3">
              {past.map(appt => <AppointmentCard key={appt._id} appt={appt} />)}
            </div>
          </section>
        )}
      </div>
    </DashboardPageWrapper>
  );
}

function AppointmentCard({ appt, highlight }: { appt: Appointment; highlight?: boolean }) {
  const cfg = STATUS_CONFIG[appt.status] || { label: appt.status, color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: null };

  return (
    <div className={`rounded-xl border ${highlight ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'} p-5`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white text-sm">{appt.appointment_type}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Booked {new Date(appt.created_at).toLocaleDateString()}</p>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
          {cfg.icon} {cfg.label}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Calendar size={14} className="text-gray-400 flex-shrink-0" />
          <span>{formatDate(appt.datetime)}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Clock size={14} className="text-gray-400 flex-shrink-0" />
          <span>{formatTime(appt.datetime)} · {appt.duration_minutes} min</span>
        </div>
        {appt.counselor_name && appt.counselor_name !== 'Unknown Counselor' && (
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <User size={14} className="text-gray-400 flex-shrink-0" />
            <span>{appt.counselor_name}</span>
          </div>
        )}
        {appt.location && (
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <MapPin size={14} className="text-gray-400 flex-shrink-0" />
            <span>{appt.location}</span>
          </div>
        )}
      </div>

      {/* Recurring badge */}
      {appt.is_recurring && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400">
          <Repeat size={11} />
          Session {appt.recurrence_index} of {appt.recurrence_total} · {appt.recurrence === 'weekly' ? 'Weekly' : 'Bi-weekly'} series
        </div>
      )}

      {/* Telehealth join button */}
      {appt.meeting_link && isUpcoming(appt.datetime) && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <a
            href={appt.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Video size={13} /> Join Session
          </a>
        </div>
      )}

      {appt.notes && (
        <p className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
          {appt.notes}
        </p>
      )}
    </div>
  );
}
