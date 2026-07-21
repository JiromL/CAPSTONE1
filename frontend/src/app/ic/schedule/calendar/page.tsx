'use client';

import { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, AlertCircle, Clock, Users } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface Appointment {
  _id: string;
  student_name?: string;
  counselor_name?: string;
  requested_start: string;
  requested_end: string;
  scheduled_start?: string;
  scheduled_end?: string;
  status: string;
  preferred_platform?: string;
}

export default function ScheduleCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 17));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCounselor, setSelectedCounselor] = useState('all');
  const [counselors, setCounselors] = useState<any[]>([]);

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found');
          setLoading(false);
          return;
        }

        const response = await fetch(api('/api/appointments'), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch appointments');
        const data = await response.json();
        const appts = Array.isArray(data) ? data : data.appointments || [];
        setAppointments(appts);

        const uniqueCounselors = Array.from(
          new Map(
            appts
              .filter((a: any) => a.counselor_name)
              .map((a: any) => [a.counselor_name, { name: a.counselor_name }])
          ).values()
        ) as any[];
        setCounselors(uniqueCounselors);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load appointments');
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, []);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const appointmentsForMonth = appointments.filter((apt) => {
    const aptDate = new Date(apt.scheduled_start || apt.requested_start);
    return (
      aptDate.getMonth() === currentDate.getMonth() &&
      aptDate.getFullYear() === currentDate.getFullYear() &&
      (selectedCounselor === 'all' || apt.counselor_name === selectedCounselor)
    );
  });

  const dayAppointments = (day: number) => {
    return appointmentsForMonth.filter((apt) => {
      const d = new Date(apt.scheduled_start || apt.requested_start);
      return d.getDate() === day;
    });
  };

  if (loading) {
    return (
      <DashboardPageWrapper title="Schedule Calendar" subtitle="View all counselor appointments">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12" style={{
            borderWidth: 2, borderStyle: 'solid',
            borderColor: 'transparent', borderBottomColor: 'var(--color-primary)'
          }} />
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Schedule Calendar" subtitle="View all counselor appointments">
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg p-4 flex gap-3"
            style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
            <AlertCircle className="flex-shrink-0" size={20} style={{ color: 'var(--color-danger)' }} />
            <p className="text-sm" style={{ color: 'var(--color-danger-text)' }}>{error}</p>
          </div>
        )}

        {/* Counselor Filter */}
        <div className="rounded-lg p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Filter by Counselor</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCounselor('all')}
              className="px-4 py-2 rounded-lg font-medium transition"
              style={selectedCounselor === 'all'
                ? { background: 'var(--color-primary)', color: '#fff' }
                : { background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
              onMouseEnter={e => { if (selectedCounselor !== 'all') (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-border)'; }}
              onMouseLeave={e => { if (selectedCounselor !== 'all') (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)'; }}
            >
              All Counselors
            </button>
            {counselors.map((c) => (
              <button
                key={c.name}
                onClick={() => setSelectedCounselor(c.name)}
                className="px-4 py-2 rounded-lg font-medium transition"
                style={selectedCounselor === c.name
                  ? { background: 'var(--color-primary)', color: '#fff' }
                  : { background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                onMouseEnter={e => { if (selectedCounselor !== c.name) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-border)'; }}
                onMouseLeave={e => { if (selectedCounselor !== c.name) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)'; }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div className="rounded-lg p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {currentDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                className="p-2 rounded-lg transition"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <ChevronLeft size={20} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                className="p-2 rounded-lg transition"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <ChevronRight size={20} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center font-bold py-2" style={{ color: 'var(--color-text-secondary)' }}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="rounded-lg min-h-[120px]" style={{ background: 'var(--color-bg)' }} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const appts = dayAppointments(day);
              const isToday =
                day === 17 &&
                currentDate.getMonth() === 2 &&
                currentDate.getFullYear() === 2026;

              return (
                <div
                  key={day}
                  className="rounded-lg min-h-[120px] p-2 overflow-y-auto"
                  style={isToday
                    ? { background: 'var(--color-primary-surface)', border: '2px solid var(--color-primary)' }
                    : { background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                >
                  <div className="font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{day}</div>
                  <div className="space-y-1">
                    {appts.map((apt) => (
                      <div
                        key={apt._id}
                        className="text-xs p-1 rounded cursor-pointer transition"
                        style={{ background: 'var(--color-primary-muted)', color: 'var(--color-primary-text)' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                        title={`${apt.counselor_name || 'Unassigned'}: ${apt.student_name || 'No student'}`}
                      >
                        <div className="font-medium truncate">{apt.counselor_name || 'Unassigned'}</div>
                        <div className="text-xs opacity-75 truncate">
                          {new Date(apt.scheduled_start || apt.requested_start).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg p-6" style={{ background: 'var(--color-info-surface)', border: '1px solid var(--color-info)' }}>
            <div className="flex items-center gap-3">
              <Calendar size={24} style={{ color: 'var(--color-info)' }} />
              <div>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Total Appointments</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{appointments.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg p-6" style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>
            <div className="flex items-center gap-3">
              <Clock size={24} style={{ color: 'var(--color-success)' }} />
              <div>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>This Month</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{appointmentsForMonth.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg p-6" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary-muted)' }}>
            <div className="flex items-center gap-3">
              <Users size={24} style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Counselors</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{counselors.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
