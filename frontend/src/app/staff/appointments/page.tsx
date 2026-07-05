'use client';

import { useState, useEffect } from 'react';
import { Calendar, Search, Filter, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import PageShell from '@/components/PageShell';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    filterAndSort();
  }, [appointments, searchTerm, statusFilter, platformFilter, sortBy]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/appointments', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch appointments');
      const data = await response.json();
      setAppointments(Array.isArray(data) ? data : data.appointments || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSort = () => {
    let result = [...appointments];

    // Apply filters
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (apt: any) =>
          (apt.student_name?.toLowerCase() || '').includes(term) ||
          (apt.counselor_name?.toLowerCase() || '').includes(term) ||
          (apt._id || '').includes(term)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((apt: any) => apt.status === statusFilter);
    }

    if (platformFilter !== 'all') {
      result = result.filter((apt: any) => apt.preferred_platform === platformFilter);
    }

    // Apply sorting
    result.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.scheduled_start || a.requested_start || 0).getTime() -
            new Date(b.scheduled_start || b.requested_start || 0).getTime();
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        case 'student':
          return (a.student_name || '').localeCompare(b.student_name || '');
        default:
          return 0;
      }
    });

    setFiltered(result);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; icon: any }> = {
      pending: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-800 dark:text-yellow-300',
        icon: Clock,
      },
      confirmed: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-800 dark:text-blue-300',
        icon: CheckCircle,
      },
      completed: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-800 dark:text-green-300',
        icon: CheckCircle,
      },
      cancelled: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-800 dark:text-red-300',
        icon: AlertCircle,
      },
    };
    const config = statusMap[status] || statusMap.pending;
    return config;
  };

  if (loading) {
    return (
      <PageShell title="All Appointments" subtitle="View and manage all system appointments">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="All Appointments" subtitle="View and manage all system appointments">
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-2">
          <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-red-800 dark:text-red-300">{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search student, counselor, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Platform Filter */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
          >
            <option value="all">All Platforms</option>
            <option value="in-person">In-Person</option>
            <option value="zoom">Zoom</option>
            <option value="phone">Phone</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
          >
            <option value="date">Sort by Date</option>
            <option value="status">Sort by Status</option>
            <option value="student">Sort by Student</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 flex items-center gap-2">
        <Calendar size={20} className="text-blue-600" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing <span className="font-semibold text-gray-900 dark:text-gray-50">{filtered.length}</span> of{' '}
          <span className="font-semibold text-gray-900 dark:text-gray-50">{appointments.length}</span> appointments
        </p>
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No appointments found matching your filters</p>
          </div>
        ) : (
          filtered.map((apt, idx) => {
            const statusConfig = getStatusBadge(apt.status);
            const StatusIcon = statusConfig.icon;
            const appointmentDate = new Date(apt.scheduled_start || apt.requested_start);

            return (
              <div
                key={idx}
                className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar size={18} className="text-gray-500" />
                      <h3 className="font-semibold text-gray-900 dark:text-gray-50">
                        {apt.student_name || 'Unknown Student'}
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-500">Date & Time</p>
                        <p className="font-medium text-gray-900 dark:text-gray-50">
                          {appointmentDate.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-500">Counselor</p>
                        <p className="font-medium text-gray-900 dark:text-gray-50">
                          {apt.counselor_name || 'Unassigned'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-500">Platform</p>
                        <p className="font-medium text-gray-900 dark:text-gray-50 capitalize">
                          {apt.preferred_platform?.replace('-', ' ') || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-500">Type</p>
                        <p className="font-medium text-gray-900 dark:text-gray-50 capitalize">
                          {apt.appointment_type || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <span
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
                    >
                      <StatusIcon size={16} />
                      {apt.status?.charAt(0).toUpperCase() + apt.status?.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </PageShell>
  );
}
