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
    { id: 'draft', label: 'Drafts', icon: <FileText size={18} />, color: 'text-gray-600' },
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
        status: 'draft',
        description: 'Unsaved intake form - 50% complete',
      },
    ];
    setTasks(mockTasks);
    setLoading(false);
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
              <p className="text-gray-600">No tasks in this category</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <div key={task.id} className="border border-gray-200 rounded p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between gap-4">
                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">{task.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      {(task.date || task.time) && (
                        <p className="text-xs text-gray-500">
                          {task.date} {task.time ? `at ${task.time}` : ''}
                        </p>
                      )}
                    </div>

                    {/* Action Button */}
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-100 transition whitespace-nowrap">
                      {activeTab === 'draft' ? 'Continue' : 'View'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {filteredTasks.length > 0 && (
          <div className="border border-gray-200 rounded p-6">
            <h3 className="font-medium text-gray-900 mb-4">Summary</h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-2">Total Tasks</p>
                <p className="text-2xl font-medium text-gray-900">{tasks.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">in This Category</p>
                <p className="text-2xl font-medium text-gray-900">{filteredTasks.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Awaiting Action</p>
                <p className="text-2xl font-medium text-gray-900">{tasks.filter((t) => t.status === 'pending' || t.status === 'scheduled').length}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
