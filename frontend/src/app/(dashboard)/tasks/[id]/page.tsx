'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { ArrowLeft, Calendar, User, Phone, MapPin, AlertCircle, CheckCircle, Clock, Copy, Check, X, Edit } from 'lucide-react';

interface AppointmentDetail {
  id: string;
  type: string;
  status: string;
  preferred_platform: string;
  meeting_link?: string;
  requested_start?: string;
  requested_end?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  meeting_id?: string;
  meeting_passcode?: string;
  counselor?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  case?: {
    id: string;
    student_id: string;
    status: string;
    risk_level: string;
  };
  created_at?: string;
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [rescheduleDialog, setRescheduleDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const loadAppointment = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token');
          setLoading(false);
          return;
        }

        // Try to fetch as appointment ID first
        let response = await fetch(`http://localhost:8000/api/appointments/${taskId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        // If that fails, try to use it as a reference ID from dashboard
        if (!response.ok) {
          // The ID might be a counseling_id or intake_id, not an appointment_id
          setError('Task details not available yet. Please ensure you have an appointment scheduled.');
          setLoading(false);
          return;
        }

        const data = await response.json();
        setAppointment(data);
      } catch (err) {
        console.error('Failed to load appointment:', err);
        setError('Failed to load appointment details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadAppointment();
  }, [taskId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancel = async () => {
    if (!appointment) return;
    
    setActionLoading(true);
    setActionError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/appointments/${appointment.id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: cancelReason || 'No reason provided' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel appointment');
      }

      // Update local state
      setAppointment({ ...appointment, status: 'CANCELLED' });
      setCancelDialog(false);
      setCancelReason('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel appointment';
      setActionError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!appointment) return;
    
    if (!rescheduleDate || !rescheduleTime) {
      setActionError('Please select both date and time');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      // Combine date and time
      const dateTime = new Date(`${rescheduleDate}T${rescheduleTime}`);
      const endTime = new Date(dateTime.getTime() + 1 * 60 * 60 * 1000); // 1 hour later
      
      const response = await fetch(`http://localhost:8000/api/appointments/${appointment.id}/reschedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requested_start: dateTime.toISOString(),
          requested_end: endTime.toISOString(),
          reason: 'Rescheduled by student',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reschedule appointment');
      }

      const data = await response.json();
      
      // Update local state
      setAppointment({
        ...appointment,
        status: 'REQUESTED',
        requested_start: data.requested_start,
        requested_end: data.requested_end,
      });
      
      setRescheduleDialog(false);
      setRescheduleDate('');
      setRescheduleTime('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reschedule appointment';
      setActionError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const canCancelOrReschedule = appointment && 
    appointment.status !== 'COMPLETED' && 
    appointment.status !== 'CANCELLED';


  const formatDateTime = (date: string | undefined) => {
    if (!date) return 'Not scheduled';
    try {
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return date;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'scheduled':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100';
      case 'pending':
      case 'requested':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100';
      case 'completed':
        return 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100';
    }
  };

  const getRiskLevelColor = (risk: string | undefined) => {
    if (!risk) return 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100';
    switch (risk.toUpperCase()) {
      case 'RED':
      case 'CRITICAL':
        return 'bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100';
      case 'YELLOW':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100';
      case 'GREEN':
        return 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100';
    }
  };

  if (loading) {
    return (
      <DashboardPageWrapper title="Appointment Details" subtitle="View your appointment information">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardPageWrapper>
    );
  }

  if (error || !appointment) {
    return (
      <DashboardPageWrapper title="Appointment Details" subtitle="View your appointment information">
        <div className="space-y-4">
          <Link
            href="/tasks"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded font-medium bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            <ArrowLeft size={16} />
            Back to Tasks
          </Link>
          
          <div className="border border-red-200 bg-red-50 dark:bg-red-900/30 rounded p-6">
            <div className="flex items-start gap-4">
              <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">Error</h3>
                <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Appointment Details" subtitle="View your appointment information">
      <div className="space-y-6">
        {/* Back Button */}
        <Link
          href="/tasks"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded font-medium bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          <ArrowLeft size={16} />
          Back to Tasks
        </Link>

        {/* Header with Status */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">
                {appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1)} Appointment
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Created: {formatDateTime(appointment.created_at)}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex flex-col gap-2">
                <span className={`px-4 py-2 text-xs font-semibold rounded-full text-center ${getStatusColor(appointment.status)}`}>
                  {appointment.status.toUpperCase()}
                </span>
                {appointment.case?.risk_level && (
                  <span className={`px-4 py-2 text-xs font-semibold rounded-full text-center ${getRiskLevelColor(appointment.case.risk_level)}`}>
                    Risk: {appointment.case.risk_level}
                  </span>
                )}
              </div>
              {canCancelOrReschedule && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setRescheduleDialog(true)}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition"
                    title="Reschedule appointment"
                  >
                    <Edit size={14} />
                    Reschedule
                  </button>
                  <button
                    onClick={() => setCancelDialog(true)}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 transition"
                    title="Cancel appointment"
                  >
                    <X size={14} />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Error Message */}
        {actionError && (
          <div className="border border-red-200 bg-red-50 dark:bg-red-900/30 rounded p-4">
            <p className="text-sm text-red-700 dark:text-red-200">{actionError}</p>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Date & Time Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
                <Calendar size={20} />
                Date & Time
              </h3>
              <div className="space-y-4">
                {appointment.scheduled_start ? (
                  <>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Scheduled Date & Time</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                        {formatDateTime(appointment.scheduled_start)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">End Time</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                        {formatDateTime(appointment.scheduled_end)}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Requested Date & Time</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                        {formatDateTime(appointment.requested_start)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Requested End Time</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                        {formatDateTime(appointment.requested_end)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Meeting Details Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
                <MapPin size={20} />
                Meeting Details
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Meeting Type</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50 capitalize">
                    {appointment.preferred_platform === 'in-person' ? 'In-Person' : appointment.preferred_platform}
                  </p>
                </div>

                {appointment.meeting_link && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Meeting Link</p>
                    <div className="flex items-center gap-2">
                      <a
                        href={appointment.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex-1 break-all"
                      >
                        {appointment.meeting_link}
                      </a>
                      <button
                        onClick={() => copyToClipboard(appointment.meeting_link || '')}
                        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        title="Copy link"
                      >
                        {copied ? (
                          <Check size={16} className="text-green-600" />
                        ) : (
                          <Copy size={16} className="text-gray-600 dark:text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {appointment.meeting_passcode && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Passcode</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded">
                        {appointment.meeting_passcode}
                      </code>
                      <button
                        onClick={() => copyToClipboard(appointment.meeting_passcode || '')}
                        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        title="Copy passcode"
                      >
                        {copied ? (
                          <Check size={16} className="text-green-600" />
                        ) : (
                          <Copy size={16} className="text-gray-600 dark:text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Counselor Info */}
          <div className="space-y-6">
            {appointment.counselor && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
                  <User size={20} />
                  Counselor
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Name</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                      {appointment.counselor.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Role</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50 capitalize">
                      {appointment.counselor.role}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email</p>
                    <a
                      href={`mailto:${appointment.counselor.email}`}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {appointment.counselor.email}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Case Info */}
            {appointment.case && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
                  <Clock size={20} />
                  Case Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50 capitalize">
                      {appointment.case.status}
                    </p>
                  </div>
                  {appointment.case.risk_level && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Risk Level</p>
                      <p className={`text-sm font-medium px-2 py-1 rounded inline-block ${getRiskLevelColor(appointment.case.risk_level)}`}>
                        {appointment.case.risk_level}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cancel Dialog */}
        {cancelDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
              <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Cancel Appointment</h3>
                <button
                  onClick={() => {
                    setCancelDialog(false);
                    setActionError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">Are you sure you want to cancel this appointment? This action cannot be undone.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reason (optional)
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Please provide a reason for cancellation"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={3}
                  />
                </div>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setCancelDialog(false);
                    setActionError(null);
                  }}
                  className="px-4 py-2 text-sm font-medium rounded text-gray-900 dark:text-gray-50 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                  disabled={actionLoading}
                >
                  Keep Appointment
                </button>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-medium rounded text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {actionLoading ? 'Cancelling...' : 'Cancel Appointment'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reschedule Dialog */}
        {rescheduleDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
              <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Reschedule Appointment</h3>
                <button
                  onClick={() => {
                    setRescheduleDialog(false);
                    setActionError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Date *
                  </label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Time *
                  </label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {actionError && (
                  <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 text-sm p-3 rounded">
                    {actionError}
                  </div>
                )}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setRescheduleDialog(false);
                    setActionError(null);
                  }}
                  className="px-4 py-2 text-sm font-medium rounded text-gray-900 dark:text-gray-50 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                  disabled={actionLoading}
                >
                  Keep Current Time
                </button>
                <button
                  onClick={handleReschedule}
                  disabled={actionLoading || !rescheduleDate || !rescheduleTime}
                  className="px-4 py-2 text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Rescheduling...' : 'Reschedule'}
                </button>
              </div>
            </div>
          </div>
        )}      </div>
    </DashboardPageWrapper>
  );
}