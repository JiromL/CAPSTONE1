'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { ArrowLeft, Calendar, User, Phone, MapPin, AlertCircle, CheckCircle, Clock, Copy, Check } from 'lucide-react';

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
          </div>
        </div>

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
      </div>
    </DashboardPageWrapper>
  );
}
