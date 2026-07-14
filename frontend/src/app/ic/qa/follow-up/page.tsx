"use client";

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Phone, Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '@/utils/api';

export default function FollowUpPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const token = () => localStorage.getItem('token');

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch(api('/api/qa/follow-up?status=pending'), {
          headers: { Authorization: `Bearer ${token()}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTasks(Array.isArray(data) ? data : data.tasks || []);
        }
      } catch { setTasks([]); }
      setLoading(false);
    };
    fetchTasks();
  }, []);

  const handleAction = async (id: string, action: 'log' | 'complete') => {
    setActioningId(id);
    try {
      const res = await fetch(api(`/api/qa/follow-up/${id}/${action}`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        setTasks(prev => prev.map(t =>
          t._id === id ? { ...t, status: action === 'complete' ? 'completed' : 'attempted' } : t
        ));
      }
    } catch { }
    finally { setActioningId(null); }
  };

  const statuses = [
    { value: 'pending',   label: 'Pending',   count: tasks.filter(t => t.status === 'pending').length },
    { value: 'attempted', label: 'Attempted',  count: tasks.filter(t => t.status === 'attempted').length },
    { value: 'completed', label: 'Completed',  count: tasks.filter(t => t.status === 'completed').length },
  ];

  return (
    <PageShell title="Follow-up QA" subtitle="Track and manage follow-up calls and messages">
      <div className="space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {statuses.map(s => (
            <button key={s.value} onClick={() => setFilter(s.value)}
              className="px-4 py-2 rounded-lg whitespace-nowrap transition text-sm font-medium"
              style={filter === s.value
                ? { background: 'var(--color-primary)', color: '#fff' }
                : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => { if (filter !== s.value) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-border)'; }}
              onMouseLeave={e => { if (filter !== s.value) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)'; }}>
              {s.label} <span className="ml-1.5 font-semibold">{s.count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={16} className="animate-spin" /> Loading tasks…
          </div>
        ) : tasks.filter(t => t.status === filter).length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="mx-auto mb-4" size={32} style={{ color: 'var(--color-success)' }} />
            <p style={{ color: 'var(--color-text-secondary)' }}>No {filter} follow-up tasks</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.filter(t => t.status === filter).map(task => (
              <div key={task._id} className="rounded-xl p-4 transition"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{task.student_name}</h3>
                    <p className="text-sm mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {task.method === 'call' ? <Phone size={13} /> : <Mail size={13} />}
                      {task.method === 'call' ? task.phone : task.email}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  {filter !== 'completed' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(task._id, 'log')}
                        disabled={actioningId === task._id}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
                        style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                        {actioningId === task._id ? <Loader2 size={12} className="animate-spin inline" /> : 'Log'}
                      </button>
                      <button
                        onClick={() => handleAction(task._id, 'complete')}
                        disabled={actioningId === task._id}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition disabled:opacity-50"
                        style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                        <CheckCircle2 size={12} /> Complete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
