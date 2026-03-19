'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, CheckCircle, FileText, Heart, AlertCircle, Search, X, Mail, Clock, Plus } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { ScheduleAppointmentCalendar } from '@/components/ScheduleAppointmentCalendar';
import { CancelNoShowModal } from '@/components/CancelNoShowModal';

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
  counselor_name?: string;
  notes?: string;
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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date-asc');
  const [notificationMessage, setNotificationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

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
      console.log('[Appointments] Fetching with token:', token?.substring(0, 20) + '...');
      const response = await fetch('http://localhost:5001/api/appointments/my-appointments', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[Appointments] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[Appointments] Success:', data);
        setAppointments(data.appointments || []);
      } else {
        const errorText = await response.text();
        console.error('[Appointments] Failed to fetch:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          token: token?.substring(0, 20) + '...'
        });
      }
    } catch (error) {
      console.error('[Appointments] Exception:', error);
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
      setNotificationMessage({ type: 'error', text: 'Please select a date and time' });
      return;
    }

    setRescheduling(true);
    try {
      const token = localStorage.getItem('token');
      // Convert to ISO datetime format
      const [year, month, day] = rescheduleDate.split('-');
      const [hours, minutes] = (rescheduleTime || '10:00').split(':');
      const requestedStart = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
      const requestedEnd = new Date(requestedStart.getTime() + 60 * 60 * 1000); // 1 hour duration
      
      const response = await fetch(`http://localhost:5001/api/appointments/${selectedAppointment._id}/reschedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requested_start: requestedStart.toISOString(),
          requested_end: requestedEnd.toISOString(),
          reason: rescheduleReason,
        }),
      });

      if (response.ok) {
        // Send email notification
        await sendEmailNotification('reschedule', selectedAppointment);
        
        setNotificationMessage({ type: 'success', text: '✓ Reschedule request submitted. Your counselor will review and confirm the new time.' });
        setShowRescheduleModal(false);
        setRescheduleDate('');
        setRescheduleTime('');
        setRescheduleReason('');
        setSelectedAppointment(null);
        const token = localStorage.getItem('token');
        if (token) fetchAppointments(token);
      } else {
        const error = await response.json();
        setNotificationMessage({ type: 'error', text: `Error: ${error.error || 'Failed to reschedule'}` });
      }
    } catch (error) {
      setNotificationMessage({ type: 'error', text: 'Error rescheduling appointment' });
      console.error(error);
    } finally {
      setRescheduling(false);
    }
  };

  const sendEmailNotification = async (action: 'reschedule' | 'cancel', appointment: Appointment) => {
    try {
      const token = localStorage.getItem('token');
      const subject = action === 'reschedule' 
        ? `Appointment Rescheduled - ${appointment.counseling_id}`
        : `Appointment Cancelled - ${appointment.counseling_id}`;
      
      const body = action === 'reschedule'
        ? `Your appointment has been rescheduled to ${rescheduleDate} at ${rescheduleTime}.`
        : 'Your appointment has been cancelled.';

      await fetch('http://localhost:5001/api/integrations/api/email/send/gmail', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient_email: user?.email,
          subject,
          body,
        }),
      });
    } catch (error) {
      console.error('Failed to send notification email:', error);
    }
  };

  const handleCancel = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
  };

  const handleNoShow = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowNoShowModal(true);
  };

  const submitCancelRequest = async (reason: string) => {
    if (!selectedAppointment) return;

    setCancelling(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/appointments/${selectedAppointment._id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        await sendEmailNotification('cancel', selectedAppointment);
        setNotificationMessage({ type: 'success', text: 'Appointment cancelled successfully' });
        setShowCancelModal(false);
        setSelectedAppointment(null);
        const token = localStorage.getItem('token');
        if (token) fetchAppointments(token);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel appointment');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error cancelling appointment';
      setNotificationMessage({ type: 'error', text: message });
      throw error;
    } finally {
      setCancelling(false);
    }
  };

  const submitNoShowRequest = async (reason: string) => {
    if (!selectedAppointment) return;

    setCancelling(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/appointments/${selectedAppointment._id}/no-show`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        await sendEmailNotification('no-show', selectedAppointment);
        setNotificationMessage({ type: 'success', text: 'No show recorded successfully' });
        setShowNoShowModal(false);
        setSelectedAppointment(null);
        const token = localStorage.getItem('token');
        if (token) fetchAppointments(token);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to record no show');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error recording no show';
      setNotificationMessage({ type: 'error', text: message });
      throw error;
    } finally {
      setCancelling(false);
    }
  };

  const oldHandleCancel = async (appointment: Appointment) => {
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
        // Send email notification
        await sendEmailNotification('cancel', appointment);
        
        setNotificationMessage({ type: 'success', text: 'Appointment cancelled and notification sent' });
        const token = localStorage.getItem('token');
        if (token) fetchAppointments(token);
      } else {
        const error = await response.json();
        setNotificationMessage({ type: 'error', text: `Error: ${error.error || 'Failed to cancel'}` });
      }
    } catch (error) {
      setNotificationMessage({ type: 'error', text: 'Error cancelling appointment' });
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

  // Enhanced filtering and sorting logic
  const getFilteredAndSortedAppointments = () => {
    let filtered = appointments;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(apt => 
        filterStatus === 'upcoming' 
          ? apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED'
          : filterStatus === 'past'
          ? apt.status === 'COMPLETED' || apt.status === 'CANCELLED'
          : apt.status === filterStatus
      );
    }

    // Filter by search term (counselor name, ID, date)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(apt =>
        apt.counseling_id?.toLowerCase().includes(search) ||
        apt.counselor_name?.toLowerCase().includes(search) ||
        formatDate(apt.appointment_date).toLowerCase().includes(search) ||
        apt.appointment_time?.toLowerCase().includes(search)
      );
    }

    // Sort
    return filtered.sort((a, b) => {
      const dateA = new Date(a.appointment_date);
      const dateB = new Date(b.appointment_date);
      
      switch (sortBy) {
        case 'date-asc':
          return dateA.getTime() - dateB.getTime();
        case 'date-desc':
          return dateB.getTime() - dateA.getTime();
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
  };

  const filteredAppointments = getFilteredAndSortedAppointments();
  const upcomingAppointments = filteredAppointments.filter(
    apt => apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED'
  );
  const pastAppointments = filteredAppointments.filter(
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
      <div className="max-w-4xl mx-auto">
        {/* Notification Toast */}
        {notificationMessage && (
          <div className={`mb-4 p-4 rounded flex items-center justify-between ${
            notificationMessage.type === 'success' 
              ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700' 
              : 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700'
          }`}>
            <p className={notificationMessage.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
              {notificationMessage.text}
            </p>
            <button
              onClick={() => setNotificationMessage(null)}
              className="ml-4 flex-shrink-0"
            >
              <X size={18} className={notificationMessage.type === 'success' ? 'text-green-600' : 'text-red-600'} />
            </button>
          </div>
        )}

        {/* Schedule New Appointment Button */}
        <div className="mb-6">
          <button
            onClick={() => {
              // For now, we'll show a message to select a case first
              // In a full implementation, this would open a case selector
              alert('Please note: To schedule an appointment, navigate to the Cases section and select a case, then use the Schedule Appointment option there.');
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition font-medium"
          >
            <Plus size={20} />
            Schedule New Appointment
          </button>
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-6 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID, counselor name, or date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>

          {/* Filter and Sort Controls */}
          <div className="flex gap-3 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All Appointments</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="REQUESTED">Pending</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="date-asc">Date (Earliest First)</option>
                <option value="date-desc">Date (Latest First)</option>
                <option value="status">Status</option>
              </select>
            </div>

            {(searchTerm || filterStatus !== 'all' || sortBy !== 'date-asc') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setSortBy('date-asc');
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Upcoming Appointments</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {upcomingAppointments.length === 0 ? 'No appointments scheduled' : `${upcomingAppointments.length} appointment${upcomingAppointments.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {upcomingAppointments.length === 0 ? (
            <div className="p-8 border border-gray-200 rounded text-center dark:border-gray-700 dark:bg-gray-800">
              <Calendar size={32} className="mx-auto mb-3 text-gray-400" />
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
                    className="p-4 border border-gray-200 rounded dark:border-gray-700 dark:bg-gray-800 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Clock size={16} className="text-gray-400" />
                            {formatDate(appointment.appointment_date)}
                          </p>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Time: <span className="font-medium text-gray-900 dark:text-white">{appointment.appointment_time || 'TBD'}</span>
                        </p>
                        {appointment.counselor_name && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Counselor: <span className="font-medium text-gray-900 dark:text-white">{appointment.counselor_name}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4 text-sm">
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
                      {appointment.risk_level && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Risk Level</p>
                          <p className="text-gray-900 dark:text-white font-medium capitalize">{appointment.risk_level}</p>
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
                          className="block w-full px-3 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium rounded text-center text-sm transition-colors border border-blue-200 dark:border-blue-700"
                        >
                          🔗 Join Meeting
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
                            className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-750"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleNoShow(appointment)}
                            disabled={cancelling}
                            className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-750"
                          >
                            No Show
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
              <p className="text-sm text-gray-600 dark:text-gray-400">{pastAppointments.length} appointment{pastAppointments.length !== 1 ? 's' : ''}</p>
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
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
              <p className="text-xs text-blue-700 dark:text-blue-300">📋 Reschedule requests require counselor approval before changes take effect.</p>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Request Reschedule
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
                  placeholder="Why are you rescheduling? (e.g., conflicting class, work obligation)"
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

      {/* Cancel Modal */}
      <CancelNoShowModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSubmit={submitCancelRequest}
        appointmentType="cancel"
        appointmentDate={selectedAppointment ? formatDate(selectedAppointment.appointment_date) : ''}
        counselorName={selectedAppointment?.counselor_name}
      />

      {/* No Show Modal */}
      <CancelNoShowModal
        isOpen={showNoShowModal}
        onClose={() => setShowNoShowModal(false)}
        onSubmit={submitNoShowRequest}
        appointmentType="no-show"
        appointmentDate={selectedAppointment ? formatDate(selectedAppointment.appointment_date) : ''}
        counselorName={selectedAppointment?.counselor_name}
      />
    </DashboardPageWrapper>
  );
}
