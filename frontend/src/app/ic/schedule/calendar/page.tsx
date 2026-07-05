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
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 17)); // March 17, 2026
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCounselor, setSelectedCounselor] = useState('all');
  const [counselors, setCounselors] = useState<any[]>([]);

  // Fetch appointments
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

        // Extract unique counselors
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Schedule Calendar" subtitle="View all counselor appointments">
      <div className="space-y-6">
        {error && (
          <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg p-4 flex gap-3">
            <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Counselor Filter */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-4">Filter by Counselor</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCounselor('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedCounselor === 'all'
                  ? 'bg-blue-600 dark:bg-blue-700 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-50 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All Counselors
            </button>
            {counselors.map((c) => (
              <button
                key={c.name}
                onClick={() => setSelectedCounselor(c.name)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedCounselor === c.name
                    ? 'bg-blue-600 dark:bg-blue-700 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-50 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center font-bold text-gray-700 dark:text-gray-300 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-gray-50 dark:bg-gray-800 rounded-lg min-h-[120px]"></div>
            ))}

            {/* Days of month */}
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
                  className={`rounded-lg min-h-[120px] p-2 overflow-y-auto ${
                    isToday
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="font-bold text-gray-900 dark:text-gray-50 mb-1">{day}</div>
                  <div className="space-y-1">
                    {appts.map((apt) => (
                      <div
                        key={apt._id}
                        className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 p-1 rounded cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/70 transition"
                        title={`${apt.counselor_name || 'Unassigned'}: ${apt.student_name || 'No student'}`}
                      >
                        <div className="font-medium truncate">{apt.counselor_name || 'Unassigned'}</div>
                        <div className="text-xs opacity-75 truncate">
                          {new Date(apt.scheduled_start || apt.requested_start).toLocaleTimeString('en-US', {
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
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center gap-3">
              <Calendar className="text-blue-600 dark:text-blue-400" size={24} />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Appointments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{appointments.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-blue-700">
            <div className="flex items-center gap-3">
              <Clock className="text-green-600 dark:text-green-400" size={24} />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">This Month</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{appointmentsForMonth.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-700">
            <div className="flex items-center gap-3">
              <Users className="text-purple-600 dark:text-purple-400" size={24} />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Counselors</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{counselors.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
