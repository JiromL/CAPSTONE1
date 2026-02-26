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
    { id: 'draft', label: 'Drafts', icon: <FileText size={16} /> },
    { id: 'pending', label: 'Pending', icon: <Clock size={16} /> },
    { id: 'scheduled', label: 'Scheduled', icon: <Calendar size={16} /> },
    { id: 'in_progress', label: 'In Progress', icon: <AlertCircle size={16} /> },
    { id: 'completed', label: 'Completed', icon: <CheckCircle size={16} /> },
    { id: 'archived', label: 'Archived', icon: <Archive size={16} /> },
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
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-gray-400 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="text-gray-400">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tasks List */}
        <div>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-gray-500">No tasks in this category</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <div key={task.id} className="border border-gray-200 rounded p-3 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between gap-4">
                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="text-sm text-gray-900 mb-1">{task.title}</h3>
                      <p className="text-xs text-gray-600 mb-2">{task.description}</p>
                      {(task.date || task.time) && (
                        <p className="text-xs text-gray-500">
                          {task.date} {task.time ? `at ${task.time}` : ''}
                        </p>
                      )}
                    </div>

                    {/* Action Button */}
                    <button className="px-3 py-1 border border-gray-300 text-gray-700 text-xs rounded hover:bg-gray-100 transition whitespace-nowrap">
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
          <div className="border border-gray-200 rounded p-4">
            <h3 className="text-xs text-gray-700 mb-3 uppercase tracking-wide">Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Tasks</p>
                <p className="text-lg text-gray-900">{tasks.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">in This Category</p>
                <p className="text-lg text-gray-900">{filteredTasks.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Awaiting Action</p>
                <p className="text-lg text-gray-900">{tasks.filter((t) => t.status === 'pending' || t.status === 'scheduled').length}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
