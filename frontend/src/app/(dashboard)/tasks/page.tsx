'use client';

import { useEffect, useState } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { Clock, CheckCircle, AlertCircle, Calendar, Archive, FileText } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  type: 'appointment' | 'assessment' | 'referral' | 'intake';
  status: 'draft' | 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'archived';
  date?: string;
  time?: string;
  description: string;
  priority?: 'high' | 'medium' | 'low';
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<string>('scheduled');
  const [loading, setLoading] = useState(true);

  const tabs = [
    { id: 'drafts', label: 'Drafts', icon: <FileText size={18} />, color: 'text-gray-600' },
    { id: 'pending', label: 'Pending', icon: <Clock size={18} />, color: 'text-yellow-600' },
    { id: 'scheduled', label: 'Scheduled', icon: <Calendar size={18} />, color: 'text-blue-600' },
    { id: 'in_progress', label: 'In Progress', icon: <AlertCircle size={18} />, color: 'text-indigo-600' },
    { id: 'completed', label: 'Completed', icon: <CheckCircle size={18} />, color: 'text-green-600' },
    { id: 'archived', label: 'Archived', icon: <Archive size={18} />, color: 'text-gray-400' },
  ];

  useEffect(() => {
    // Mock data - replace with API call
    const mockTasks: Task[] = [
      {
        id: '1',
        title: 'Anxiety Assessment',
        type: 'assessment',
        status: 'pending',
        description: 'GAD-7 screening test awaiting counselor review',
        priority: 'high',
      },
      {
        id: '2',
        title: 'First Counseling Session',
        type: 'appointment',
        status: 'scheduled',
        date: '2026-03-05',
        time: '14:00',
        description: 'Initial intake and goal-setting with Dr. Smith',
      },
      {
        id: '3',
        title: 'Mental Health Referral',
        type: 'referral',
        status: 'pending',
        description: 'Specialist psychiatrist referral in progress',
        priority: 'high',
      },
      {
        id: '4',
        title: 'Follow-up Session',
        type: 'appointment',
        status: 'scheduled',
        date: '2026-03-12',
        time: '15:30',
        description: 'Check-in with counselor to review progress',
      },
      {
        id: '5',
        title: 'Completed Counseling',
        type: 'appointment',
        status: 'completed',
        date: '2026-02-20',
        time: '14:00',
        description: 'Session completed - discussed coping strategies',
      },
      {
        id: '6',
        title: 'Intake Form (Draft)',
        type: 'intake',
        status: 'drafts',
        description: 'Unsaved intake form - 50% complete',
      },
    ];
    setTasks(mockTasks);
    setLoading(false);
  }, []);

  const filteredTasks = tasks.filter((task) => task.status === activeTab);

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <Calendar size={16} className="text-blue-600" />;
      case 'assessment':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'referral':
        return <AlertCircle size={16} className="text-orange-600" />;
      case 'intake':
        return <FileText size={16} className="text-purple-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'drafts':
        return 'bg-gray-50 border-l-4 border-gray-400';
      case 'pending':
        return 'bg-yellow-50 border-l-4 border-yellow-400';
      case 'scheduled':
        return 'bg-blue-50 border-l-4 border-blue-400';
      case 'in_progress':
        return 'bg-indigo-50 border-l-4 border-indigo-400';
      case 'completed':
        return 'bg-green-50 border-l-4 border-green-400';
      case 'archived':
        return 'bg-gray-50 border-l-4 border-gray-300';
      default:
        return '';
    }
  };

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
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className={tab.color}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tasks List */}
        <div>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <FileText size={48} className="mx-auto opacity-50" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks in this category</h3>
              <p className="text-gray-600">Check back later or create a new task to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-lg hover:shadow-md transition cursor-pointer ${getStatusColor(task.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Icon */}
                      <div className="mt-1">{getTaskIcon(task.type)}</div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{task.title}</h3>
                          {task.priority === 'high' && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                              High Priority
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        {(task.date || task.time) && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Calendar size={14} />
                            {task.date} {task.time ? `at ${task.time}` : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <button className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition whitespace-nowrap">
                      {activeTab === 'drafts' ? 'Continue' : activeTab === 'scheduled' ? 'View Details' : 'Open'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {filteredTasks.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-gray-600 text-sm">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">in This Category</p>
                <p className="text-2xl font-bold text-blue-600">{filteredTasks.length}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Awaiting Action</p>
                <p className="text-2xl font-bold text-yellow-600">{tasks.filter((t) => t.status === 'pending' || t.status === 'scheduled').length}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
