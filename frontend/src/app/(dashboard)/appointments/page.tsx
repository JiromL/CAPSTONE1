'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, CheckCircle, FileText, Heart, AlertCircle } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';

interface Appointment {
  _id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  preferred_platform: string;
  counselor_id?: string;
  counseling_id?: string;
  meeting_link?: string;
  risk_level?: string;
}

export default function AppointmentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    
    fetchAppointments(token);
  }, [router]);

  const fetchAppointments = async (token: string) => {
    try {
      const response = await fetch('http://localhost:5001/api/appointments/my-appointments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
      } else {
        console.error('Failed to fetch appointments');
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { bg: string; text: string; label: string } } = {
      'SCHEDULED': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'Scheduled' },
      'CONFIRMED': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'Confirmed' },
      'COMPLETED': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', label: 'Completed' },
      'CANCELLED': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Cancelled' },
      'REQUESTED': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', label: 'Pending' },
    };

    const statusInfo = statusMap[status] || statusMap['REQUESTED'];
    return { ...statusInfo, status };
  };

  const handleReschedule = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    if (appointment.appointment_date) {
      setRescheduleDate(appointment.appointment_date.split('T')[0]);
    }
    setRescheduleTime(appointment.appointment_time || '');
    setShowRescheduleModal(true);
  };

  const submitReschedule = async () => {
    if (!selectedAppointment || !rescheduleDate) {
      alert('Please select a date and time');
      return;
    }

    setRescheduling(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/appointments/${selectedAppointment._id}/reschedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_date: rescheduleDate,
          new_time: rescheduleTime || '10:00',
          reason: rescheduleReason || 'Rescheduled by student',
        }),
      });

      if (response.ok) {
        alert('Appointment rescheduled successfully');
        setShowRescheduleModal(false);
        setRescheduleDate('');
        setRescheduleTime('');
        setRescheduleReason('');
        setSelectedAppointment(null);
        const token = localStorage.getItem('token');
        if (token) fetchAppointments(token);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to reschedule'}`);
      }
    } catch (error) {
      alert('Error rescheduling appointment');
      console.error(error);
    } finally {
      setRescheduling(false);
    }
  };

  const handleCancel = async (appointment: Appointment) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    setCancelling(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/appointments/${appointment._id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        alert('Appointment cancelled successfully');
        const token = localStorage.getItem('token');
        if (token) fetchAppointments(token);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to cancel'}`);
      }
    } catch (error) {
      alert('Error cancelling appointment');
      console.error(error);
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        weekday: 'short'
      });
    } catch {
      return dateString;
    }
  };

  const upcomingAppointments = appointments.filter(
    apt => apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED'
  );

  const pastAppointments = appointments.filter(
    apt => apt.status === 'COMPLETED' || apt.status === 'CANCELLED'
  );

  if (loading) {
    return (
      <DashboardPageWrapper title="My Appointments" subtitle="Campus Counseling Services">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="My Appointments" subtitle="Manage your counseling sessions">
      <div className="max-w-3xl mx-auto">
        {/* Upcoming Appointments */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Upcoming Appointments</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Manage your scheduled sessions</p>
          </div>

          {upcomingAppointments.length === 0 ? (
            <div className="p-8 border border-gray-200 rounded text-center dark:border-gray-700 dark:bg-gray-800">
              <p className="text-gray-600 dark:text-gray-400">No upcoming appointments</p>
              <button
                onClick={() => router.push('/intake')}
                className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded transition-colors dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                Schedule an Appointment
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((appointment) => {
                const statusInfo = getStatusBadge(appointment.status);
                return (
                  <div
                    key={appointment._id}
                    className="p-4 border border-gray-200 rounded dark:border-gray-700 dark:bg-gray-800 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {formatDate(appointment.appointment_date)}
                          </p>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Time: <span className="font-medium text-gray-900 dark:text-white">{appointment.appointment_time || 'TBD'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Platform</p>
                        <p className="text-gray-900 dark:text-white font-medium capitalize">
                          {appointment.preferred_platform?.replace('_', ' ') || 'TBD'}
                        </p>
                      </div>
                      {appointment.counseling_id && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Reference ID</p>
                          <p className="text-gray-900 dark:text-white font-mono text-xs">{appointment.counseling_id}</p>
                        </div>
                      )}
                    </div>

                    {/* Meeting Link */}
                    {appointment.meeting_link && (
                      <div className="mb-4">
                        <a
                          href={appointment.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded text-center text-sm transition-colors"
                        >
                          Join Meeting
                        </a>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {appointment.status !== 'CANCELLED' && (
                        <>
                          <button
                            onClick={() => handleReschedule(appointment)}
                            className="flex-1 px-3 py-2 border border-gray-300 text-gray-900 font-medium rounded hover:bg-gray-50 transition-colors text-sm dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-750"
                          >
                            Reschedule
                          </button>
                          <button
                            onClick={() => handleCancel(appointment)}
                            disabled={cancelling}
                            className="flex-1 px-3 py-2 border border-red-300 text-red-700 font-medium rounded hover:bg-red-50 transition-colors text-sm disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Past Appointments */}
        {pastAppointments.length > 0 && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Past Appointments</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Your appointment history</p>
            </div>

            <div className="space-y-3">
              {pastAppointments.map((appointment) => {
                const statusInfo = getStatusBadge(appointment.status);
                return (
                  <div
                    key={appointment._id}
                    className="p-4 border border-gray-200 rounded dark:border-gray-700 dark:bg-gray-800 opacity-75"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {formatDate(appointment.appointment_date)}
                          </p>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {appointment.appointment_time || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Reschedule Appointment
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  New Date
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Preferred Time
                </label>
                <select
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">Select a time...</option>
                  <option value="9:00">9:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="13:00">1:00 PM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="15:00">3:00 PM</option>
                  <option value="16:00">4:00 PM</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Reason (optional)
                </label>
                <textarea
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Why are you rescheduling?"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRescheduleModal(false);
                  setSelectedAppointment(null);
                  setRescheduleDate('');
                  setRescheduleTime('');
                  setRescheduleReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 font-medium rounded hover:bg-gray-50 transition-colors dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-750"
              >
                Cancel
              </button>
              <button
                onClick={submitReschedule}
                disabled={rescheduling}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded transition-colors disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                {rescheduling ? 'Rescheduling...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardPageWrapper>
  );
}
