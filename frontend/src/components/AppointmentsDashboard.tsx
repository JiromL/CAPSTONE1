'use client';

import { useState, useEffect } from 'react';
import { Clock, Users, FileText, CheckCircle, AlertCircle } from 'lucide-react';

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
      
      const response = await fetch('http://localhost:5001/api/appointments/dashboard/role-view', {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Appointment Requests
        </h1>
        <p className="text-gray-600">
          {dashboard.user_name} • Role: {dashboard.role}
        </p>
      </div>

      {/* Summary Cards */}
      {dashboard.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {dashboard.summary.total && (
            <SummaryCard
              title="Total Appointments"
              value={dashboard.summary.total}
              icon={<FileText className="w-6 h-6" />}
              color="blue"
            />
          )}
          {dashboard.summary.total_appointments && (
            <SummaryCard
              title="All Appointments"
              value={dashboard.summary.total_appointments}
              icon={<FileText className="w-6 h-6" />}
              color="blue"
            />
          )}
          {dashboard.summary.unassigned_requests && (
            <SummaryCard
              title="Unassigned"
              value={dashboard.summary.unassigned_requests}
              icon={<AlertCircle className="w-6 h-6" />}
              color="yellow"
            />
          )}
          {dashboard.summary.awaiting_approval && (
            <SummaryCard
              title="Awaiting Approval"
              value={dashboard.summary.awaiting_approval}
              icon={<Clock className="w-6 h-6" />}
              color="purple"
            />
          )}
        </div>
      )}

      {/* Appointments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Appointments</h2>
            {dashboard.can_assign_counselor && (
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Assign Counselor
              </button>
            )}
          </div>
        </div>

        {dashboard.appointments && dashboard.appointments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Counselor
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Purpose
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dashboard.appointments.map((apt) => (
                  <tr key={apt.appointment_id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{apt.student_name}</p>
                        <p className="text-sm text-gray-500">{apt.student_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {apt.counselor_name || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <p className="font-medium text-gray-900 text-sm">
                          {apt.purpose || 'N/A'}
                        </p>
                        {apt.concern && (
                          <p className="text-xs text-gray-500 truncate max-w-xs">
                            {apt.concern}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {formatDate(apt.preferred_date)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs capitalize">
                        {apt.method}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium w-fit ${getStatusColor(apt.status)}`}>
                        {getStatusIcon(apt.status)}
                        {apt.status.replace('_', ' ')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No appointments found</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

function SummaryCard({ title, value, icon, color }: SummaryCardProps) {
  const bgColor = color === 'blue' ? 'bg-blue-50' : 
                  color === 'green' ? 'bg-green-50' : 
                  color === 'yellow' ? 'bg-yellow-50' : 
                  'bg-purple-50';
  
  const iconColor = color === 'blue' ? 'text-blue-600' : 
                    color === 'green' ? 'text-green-600' : 
                    color === 'yellow' ? 'text-yellow-600' : 
                    'text-purple-600';

  return (
    <div className={`${bgColor} rounded-lg p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`${iconColor} opacity-80`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
