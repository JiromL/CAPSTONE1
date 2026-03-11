'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { Clock, CheckCircle, AlertCircle, Calendar, FileText, Eye, Zap } from 'lucide-react';
import { fetchDashboardData, formatDate } from '@/utils/dashboard-api';

interface Task {
  id: string;
  title: string;
  type: 'appointment' | 'assessment' | 'referral' | 'intake';
  status: 'pending' | 'scheduled' | 'completed';
  date?: string;
  time?: string;
  description: string;
  riskLevel?: string;
  isEmergency?: boolean;
  auto_assigned?: boolean;
  counselor_name?: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<string>('scheduled');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabs = [
    { id: 'pending', label: 'Pending', icon: <Clock size={16} /> },
    { id: 'scheduled', label: 'Scheduled', icon: <Calendar size={16} /> },
    { id: 'completed', label: 'Completed', icon: <CheckCircle size={16} /> },
  ];

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found. Please log in again.');
          setLoading(false);
          return;
        }

        // Fetch user's actual appointments from the API
        const response = await fetch('http://localhost:8000/api/appointments', {
          headers: {'Authorization': `Bearer ${token}`},
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(`${errorData.error || `Failed to fetch appointments: ${response.status}`}`);
        }

        const data = await response.json();
        const transformedTasks: Task[] = [];

        if (data.appointments && Array.isArray(data.appointments)) {
          data.appointments.forEach((apt: any) => {
            const startDate = apt.scheduled_start || apt.requested_start;
            // Map appointment status to task status
            let taskStatus: 'pending' | 'scheduled' | 'completed' = 'pending';
            const apptStatus = apt.status?.toLowerCase();
            if (apptStatus === 'scheduled' || apptStatus === 'confirmed' || apptStatus === 'matched') {
              taskStatus = 'scheduled';
            } else if (apptStatus === 'completed' || apptStatus === 'cancelled') {
              taskStatus = 'completed';
            }
            // 'requested' and any other status maps to 'pending'
            
            // Extract counselor name from the appointment data
            let counselorName: string | undefined;
            if (apt.counselor && typeof apt.counselor === 'object') {
              counselorName = `${apt.counselor.name || apt.counselor.first_name || ''} ${apt.counselor.last_name || ''}`.trim();
            } else if (typeof apt.counselor === 'string') {
              counselorName = apt.counselor;
            }
            
            transformedTasks.push({
              id: apt._id,
              title: `${apt.appointment_type?.charAt(0).toUpperCase()}${apt.appointment_type?.slice(1) || 'Appointment'}`,
              type: 'appointment',
              status: taskStatus,
              date: startDate,
              description: `Platform: ${apt.preferred_platform === 'in-person' ? 'In-Person' : apt.preferred_platform || 'TBD'}`,
              riskLevel: 'GREEN',
              isEmergency: false,
              auto_assigned: apptStatus === 'matched' || apptStatus === 'scheduled' && !!apt.counselor_id,
              counselor_name: counselorName,
            });
          });
        }

        setTasks(transformedTasks);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load appointments from server';
        console.error('Failed to load tasks:', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, []);

  const filteredTasks = tasks.filter((task) => task.status === activeTab);

  if (loading) {
    return (
      <DashboardPageWrapper title="My Tasks" subtitle="All your appointments, assessments, and referrals">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="My Tasks" subtitle="All your appointments, assessments, and referrals">
      <div className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="border border-red-200 bg-red-50 dark:bg-red-900/30 rounded p-4">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex overflow-x-auto gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-gray-400 dark:border-gray-600 text-gray-900 dark:text-gray-50'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <span className="text-gray-400 dark:text-gray-500">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tasks List */}
        <div>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto mb-2 text-gray-400" size={32} />
              <p className="text-xs text-gray-500 dark:text-gray-400">No tasks in this category</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <div 
                  key={task.id} 
                  className={`border rounded p-4 transition ${
                    task.isEmergency
                      ? 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30'
                      : task.riskLevel === 'CRITICAL'
                      ? 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30'
                      : task.riskLevel === 'RED'
                      ? 'border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/30'
                      : task.riskLevel === 'YELLOW'
                      ? 'border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/30'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {task.isEmergency && <AlertCircle size={16} className="text-red-600" />}
                        {task.status === 'completed' && <CheckCircle size={16} className="text-green-600" />}
                        {task.auto_assigned && (
                          <span title="Auto-assigned to counselor" className="flex items-center gap-1 text-blue-600">
                            <Zap size={14} />
                          </span>
                        )}
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">{task.title}</h3>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{task.description}</p>
                      {task.auto_assigned && task.counselor_name && (
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                          ⚡ Assigned to: {task.counselor_name}
                        </p>
                      )}
                      {task.date && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {formatDate(task.date)}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* View Button */}
                      <Link
                        href={`/tasks/${task.id}`}
                        className="inline-flex items-center gap-1 px-3 py-2 text-xs rounded font-medium bg-blue-100 dark:bg-blue-700 text-blue-900 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-600 transition"
                      >
                        <Eye size={14} />
                        View
                      </Link>

                      {/* Status Badge */}
                      <span className={`px-3 py-2 text-xs rounded font-medium whitespace-nowrap ${
                        task.isEmergency
                          ? 'bg-red-200 dark:bg-red-700 text-red-900 dark:text-red-100'
                          : task.status === 'completed'
                          ? 'bg-green-200 dark:bg-green-700 text-green-900 dark:text-green-100'
                          : task.status === 'scheduled'
                          ? 'bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      }`}>
                        {task.isEmergency ? 'EMERGENCY' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
