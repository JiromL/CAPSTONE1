'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Filter,
  Search,
  ChevronDown,
  Check,
  AlertCircle,
  Phone,
  Mail,
  Video,
  MapPin,
  ExternalLink,
  MoreVertical,
  Download,
  RefreshCw,
} from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import Link from 'next/link';
import { api } from '@/utils/api';

interface StudentInfo {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  id_number?: string;
}

interface AppointmentDetail {
  appointment_id: string;
  student_name: string;
  student_email: string;
  student_id?: string;
  status: string;
  purpose: string;
  concern: string;
  preferred_date: string;
  preferred_time: string;
  method: string;
  meeting_link?: string;
  referral_type: string;
  created_at: string;
  notes?: string;
  risk_level?: string;
}

interface FilterState {
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
  status: string;
  method: string;
  searchTerm: string;
  customStartDate?: string;
  customEndDate?: string;
}

export default function CounselorSchedulePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<AppointmentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'all',
    status: 'all',
    method: 'all',
    searchTerm: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDetail | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [sorting, setSorting] = useState<'date-asc' | 'date-desc' | 'status' | 'name'>('date-asc');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    
    // Check if user is counselor/staff
    const staffRoles = ['COUNSELOR', 'PSYCHOLOGIST', 'IC', 'ADMIN'];
    if (!staffRoles.includes(parsedUser.role?.toUpperCase())) {
      router.push('/dashboard');
      return;
    }

    setUser(parsedUser);
    fetchAppointments(token);
  }, [router]);

  const fetchAppointments = async (token: string) => {
    setRefreshing(true);
    try {
      const response = await fetch(
        api('/api/appointments/dashboard/role-view'),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.appointments) {
          if (Array.isArray(data.appointments)) {
            setAppointments(data.appointments);
          } else if (data.appointments.confirmed) {
            // Counselor view - combine all statuses
            const combined = [
              ...(data.appointments.pending_approval || []),
              ...(data.appointments.confirmed || []),
              ...(data.appointments.completed || []),
            ];
            setAppointments(combined);
          } else {
            setAppointments(Object.values(data.appointments).flat() as AppointmentDetail[]);
          }
        }
      } else {
        setError('Failed to fetch appointments');
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError('Error loading appointments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filter and sort appointments
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    // Date range filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filters.dateRange === 'today') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.preferred_date);
        return aptDate >= today && aptDate < tomorrow;
      });
    } else if (filters.dateRange === 'week') {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.preferred_date);
        return aptDate >= today && aptDate <= weekEnd;
      });
    } else if (filters.dateRange === 'month') {
      const monthEnd = new Date(today);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.preferred_date);
        return aptDate >= today && aptDate <= monthEnd;
      });
    } else if (filters.dateRange === 'custom' && filters.customStartDate && filters.customEndDate) {
      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.preferred_date);
        return aptDate >= new Date(filters.customStartDate!) && aptDate <= new Date(filters.customEndDate!);
      });
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter((apt) => apt.status === filters.status);
    }

    // Method filter
    if (filters.method !== 'all') {
      filtered = filtered.filter((apt) => apt.method === filters.method);
    }

    // Search filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (apt) =>
          apt.student_name.toLowerCase().includes(term) ||
          apt.student_email.toLowerCase().includes(term) ||
          apt.purpose.toLowerCase().includes(term)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sorting) {
        case 'date-asc':
          return new Date(a.preferred_date).getTime() - new Date(b.preferred_date).getTime();
        case 'date-desc':
          return new Date(b.preferred_date).getTime() - new Date(a.preferred_date).getTime();
        case 'name':
          return a.student_name.localeCompare(b.student_name);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return filtered;
  }, [appointments, filters, sorting]);

  const getStatusColor = (status: string) => {
    const statusMap: { [key: string]: { bg: string; text: string; label: string } } = {
      PENDING_APPROVAL: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', label: 'Pending Approval' },
      CONFIRMED: { bg: 'bg-green-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-green-300', label: 'Confirmed' },
      COMPLETED: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', label: 'Completed' },
      CANCELLED: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', label: 'Cancelled' },
      REQUESTED: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', label: 'Requested' },
    };

    return statusMap[status] || { bg: 'bg-gray-50 dark:bg-gray-900/20', text: 'text-gray-700 dark:text-gray-300', label: status };
  };

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'google-meet':
      case 'zoom':
        return <Video className="w-4 h-4" />;
      case 'phone':
        return <Phone className="w-4 h-4" />;
      case 'in-person':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const stats = useMemo(() => {
    return {
      total: appointments.length,
      confirmed: appointments.filter((a) => a.status === 'CONFIRMED').length,
      pending: appointments.filter((a) => a.status === 'PENDING_APPROVAL').length,
      completed: appointments.filter((a) => a.status === 'COMPLETED').length,
    };
  }, [appointments]);

  return (
    <DashboardPageWrapper
      title="Counselor Schedule"
      subtitle="View and manage your assigned appointments"
    >
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Confirmed" value={stats.confirmed} color="green" />
          <StatCard label="Pending" value={stats.pending} color="amber" />
          <StatCard label="Completed" value={stats.completed} color="blue" />
        </div>

        {/* Toolbar */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by student name, email, or purpose..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Calendar
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => {
                const token = localStorage.getItem('token');
                if (token) fetchAppointments(token);
              }}
              disabled={refreshing}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Filters Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Date Range */}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Date Range</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as FilterState['dateRange'] })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="PENDING_APPROVAL">Pending Approval</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Method */}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Method</label>
                <select
                  value={filters.method}
                  onChange={(e) => setFilters({ ...filters, method: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Methods</option>
                  <option value="in-person">In-Person</option>
                  <option value="google-meet">Google Meet</option>
                  <option value="zoom">Zoom</option>
                  <option value="phone">Phone</option>
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Sort By</label>
                <select
                  value={sorting}
                  onChange={(e) => setSorting(e.target.value as typeof sorting)}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="date-asc">Date (Earliest)</option>
                  <option value="date-desc">Date (Latest)</option>
                  <option value="name">Student Name</option>
                  <option value="status">Status</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
            {error}
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
            <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No appointments found matching your filters</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-3">
            {filteredAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.appointment_id}
                appointment={appointment}
                onSelect={() => {
                  setSelectedAppointment(appointment);
                  setShowDetails(true);
                }}
                getStatusColor={getStatusColor}
                getMethodIcon={getMethodIcon}
              />
            ))}
          </div>
        ) : (
          <CalendarView appointments={filteredAppointments} />
        )}
      </div>

      {/* Details Modal */}
      {showDetails && selectedAppointment && (
        <AppointmentDetailsModal
          appointment={selectedAppointment}
          onClose={() => setShowDetails(false)}
          getStatusColor={getStatusColor}
          getMethodIcon={getMethodIcon}
        />
      )}
    </DashboardPageWrapper>
  );
}

// Stat Card Component
function StatCard({ label, value, color = 'blue' }: { label: string; value: number; color?: string }) {
  const colorMap: { [key: string]: string } = {
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    green: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-blue-900/20',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
  };

  return (
    <div className={`rounded-lg p-4 border border-gray-200 dark:border-gray-700 ${colorMap[color]}`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

// Appointment Card Component
interface AppointmentCardProps {
  appointment: AppointmentDetail;
  onSelect: () => void;
  getStatusColor: (status: string) => { bg: string; text: string; label: string };
  getMethodIcon: (method: string) => React.ReactNode;
}

function AppointmentCard({
  appointment,
  onSelect,
  getStatusColor,
  getMethodIcon,
}: AppointmentCardProps) {
  const statusInfo = getStatusColor(appointment.status);
  const appointmentDate = new Date(appointment.preferred_date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let dateLabel = appointmentDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });

  if (appointmentDate.toDateString() === today.toDateString()) {
    dateLabel = 'Today';
  } else if (appointmentDate.toDateString() === tomorrow.toDateString()) {
    dateLabel = 'Tomorrow';
  }

  return (
    <div
      onClick={onSelect}
      className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/50 transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {appointment.student_name}
            </h3>
            <span className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap ${statusInfo.bg} ${statusInfo.text}`}>
              {statusInfo.label}
            </span>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span className="truncate">{appointment.student_email}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              <span>{dateLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{appointment.preferred_time || 'TBD'}</span>
            </div>
            {appointment.purpose && (
              <div className="text-xs">
                <span className="font-medium">Purpose:</span> {appointment.purpose}
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Method & Link */}
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            {getMethodIcon(appointment.method)}
            <span className="text-sm">
              {appointment.method.charAt(0).toUpperCase() + appointment.method.slice(1).replace('-', ' ')}
            </span>
          </div>

          {appointment.meeting_link && (
            <a
              href={appointment.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
            >
              Join
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {appointment.risk_level && (
            <span className="text-xs font-medium px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
              Risk: {appointment.risk_level}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Appointment Details Modal
interface DetailsModalProps {
  appointment: AppointmentDetail;
  onClose: () => void;
  getStatusColor: (status: string) => { bg: string; text: string; label: string };
  getMethodIcon: (method: string) => React.ReactNode;
}

function AppointmentDetailsModal({
  appointment,
  onClose,
  getStatusColor,
  getMethodIcon,
}: DetailsModalProps) {
  const statusInfo = getStatusColor(appointment.status);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Appointment Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Student Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Student Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300 opacity-75">Name</p>
                <p className="font-medium text-blue-900 dark:text-blue-100">{appointment.student_name}</p>
              </div>
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300 opacity-75">Email</p>
                <p className="font-medium text-blue-900 dark:text-blue-100 break-all">{appointment.student_email}</p>
              </div>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">Date</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {new Date(appointment.preferred_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">Time</p>
              <p className="font-medium text-gray-900 dark:text-white">{appointment.preferred_time || 'TBD'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">Status</p>
              <span className={`text-sm font-medium px-3 py-1 rounded ${statusInfo.bg} ${statusInfo.text}`}>
                {statusInfo.label}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">Method</p>
              <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                {getMethodIcon(appointment.method)}
                <span>{appointment.method.charAt(0).toUpperCase() + appointment.method.slice(1).replace('-', ' ')}</span>
              </div>
            </div>
          </div>

          {/* Purpose & Concern */}
          {appointment.purpose && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">Purpose</p>
              <p className="text-gray-900 dark:text-white">{appointment.purpose}</p>
            </div>
          )}

          {appointment.concern && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">Concern</p>
              <p className="text-gray-900 dark:text-white">{appointment.concern}</p>
            </div>
          )}

          {/* Meeting Link */}
          {appointment.meeting_link && (
            <div className="bg-green-50 dark:bg-blue-900/20 border border-green-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-700 dark:text-green-300 font-medium mb-2">Meeting Link</p>
              <a
                href={appointment.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-green-600 dark:text-green-400 hover:text-blue-700 dark:hover:text-green-300 font-medium break-all"
              >
                {appointment.meeting_link}
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
              </a>
            </div>
          )}

          {/* Risk Level */}
          {appointment.risk_level && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-2">Risk Level</p>
              <p className="font-semibold text-red-900 dark:text-red-100">{appointment.risk_level}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-colors"
          >
            Close
          </button>
          {appointment.meeting_link && (
            <a
              href={appointment.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
              Join Meeting
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// Calendar View Component
interface CalendarViewProps {
  appointments: AppointmentDetail[];
}

function CalendarView({ appointments }: CalendarViewProps) {
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay();

  const days = Array.from({ length: 42 }, (_, i) => {
    const dayNum = i - firstDayOfMonth + 1;
    if (dayNum < 1 || dayNum > daysInMonth) return null;
    return new Date(today.getFullYear(), today.getMonth(), dayNum);
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 gap-0 border-b border-gray-200 dark:border-gray-700">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-4 text-center font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-0">
        {days.map((date, i) => {
          if (!date) {
            return <div key={`empty-${i}`} className="p-3 bg-gray-50 dark:bg-gray-800/50 min-h-24"></div>;
          }

          const dayAppointments = appointments.filter(
            (apt) => new Date(apt.preferred_date).toDateString() === date.toDateString()
          );

          return (
            <div
              key={date.toISOString()}
              className="p-3 border-b border-r border-gray-200 dark:border-gray-700 min-h-24 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{date.getDate()}</p>
              <div className="space-y-1">
                {dayAppointments.slice(0, 2).map((apt) => (
                  <div
                    key={apt.appointment_id}
                    className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium truncate"
                  >
                    {apt.student_name.split(' ')[0]}
                  </div>
                ))}
                {dayAppointments.length > 2 && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    +{dayAppointments.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
