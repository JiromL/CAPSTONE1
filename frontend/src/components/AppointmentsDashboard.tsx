'use client';

import { useState, useEffect } from 'react';
import { Clock, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '@/utils/api';

interface Appointment {
  appointment_id: string;
  student_name: string;
  student_email: string;
  counselor_name: string;
  status: string;
  purpose: string;
  concern: string;
  preferred_date: string;
  method: string;
  created_at: string;
}

interface DashboardData {
  role: string;
  user_name: string;
  appointments?: Appointment[];
  summary?: any;
  can_edit?: boolean;
  can_approve?: boolean;
  can_assign_counselor?: boolean;
}

export default function AppointmentsDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(api('/api/appointments/dashboard/role-view'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard');
      }

      const data = await response.json();
      setDashboard(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REQUESTED':
        return 'bg-yellow-100 text-yellow-800';
      case 'PENDING_APPROVAL':
        return 'bg-blue-100 text-blue-800';
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'REQUESTED':
        return <AlertCircle className="w-4 h-4" />;
      case 'CONFIRMED':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error: {error || 'No data available'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards - Simplified */}
      {dashboard.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {dashboard.summary.total && (
            <SummaryCard
              title="Total Appointments"
              value={dashboard.summary.total}
            />
          )}
          {dashboard.summary.total_appointments && (
            <SummaryCard
              title="All Appointments"
              value={dashboard.summary.total_appointments}
            />
          )}
          {dashboard.summary.unassigned_requests && (
            <SummaryCard
              title="Unassigned"
              value={dashboard.summary.unassigned_requests}
            />
          )}
          {dashboard.summary.awaiting_approval && (
            <SummaryCard
              title="Awaiting Approval"
              value={dashboard.summary.awaiting_approval}
            />
          )}
        </div>
      )}

      {/* Appointments Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Appointments</h2>
        </div>
        {dashboard.appointments && dashboard.appointments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    Student
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    Counselor
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    Purpose
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    Method
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {dashboard.appointments.map((apt) => (
                  <tr key={apt.appointment_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{apt.student_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{apt.student_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {apt.counselor_name || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {apt.purpose || 'N/A'}
                        </p>
                        {apt.concern && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                            {apt.concern}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(apt.preferred_date)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs capitalize">
                        {apt.method}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(apt.status)}`}>
                        {apt.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">No appointments found</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: number | string;
}

function SummaryCard({ title, value }: SummaryCardProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{title}</p>
      <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}
