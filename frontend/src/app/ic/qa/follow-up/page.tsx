"use client";

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Phone, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function FollowUpPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch('/api/qa/follow-up?status=pending');
        if (res.ok) {
          const data = await res.json();
          setTasks(Array.isArray(data) ? data : data.tasks || []);
        }
      } catch {
        setTasks([]);
      }
      setLoading(false);
    };
    fetchTasks();
  }, []);

  const statuses = [
    { value: 'pending', label: 'Pending', count: tasks.filter(t => t.status === 'pending').length },
    { value: 'attempted', label: 'Attempted', count: tasks.filter(t => t.status === 'attempted').length },
    { value: 'completed', label: 'Completed', count: tasks.filter(t => t.status === 'completed').length },
  ];

  return (
    <PageShell title="Follow-up QA" subtitle="Track and manage follow-up calls and messages">
      <div className="space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {statuses.map(s => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`px-4 py-2 rounded whitespace-nowrap transition ${
                filter === s.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s.label} <span className="ml-2 font-semibold">{s.count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <CheckCircle2 className="mx-auto mb-4 text-green-400" size={32} />
            <p>No follow-up tasks</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.filter(t => t.status === filter).map(task => (
              <div key={task._id} className="border rounded-lg p-4 hover:shadow transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{task.student_name}</h3>
                    <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                      {task.method === 'call' ? <Phone size={16} /> : <Mail size={16} />}
                      {task.method === 'call' ? task.phone : task.email}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium hover:bg-blue-200">Log</button>
                    <button className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-medium hover:bg-green-200">Complete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
