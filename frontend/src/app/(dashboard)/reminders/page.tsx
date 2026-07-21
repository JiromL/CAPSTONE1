'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { AlertCircle, Plus, Trash2, Check, Clock, Calendar, Loader2 } from 'lucide-react';

interface Reminder {
  reminder_id: string;
  title: string;
  description: string;
  reminder_time: string;
  reminder_type: string;
  sent: boolean;
  acknowledged: boolean;
}

interface RemindersData {
  reminders: Reminder[];
}

type ReminderType = 'appointment' | 'medication' | 'homework' | 'general';

function reminderTypeStyle(type: string): React.CSSProperties {
  switch (type as ReminderType) {
    case 'appointment': return { background: 'var(--color-primary-surface)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' };
    case 'medication':  return { background: 'var(--color-danger-surface)',  color: 'var(--color-danger)',  border: '1px solid var(--color-danger)' };
    case 'homework':    return { background: '#F5F3FF', color: '#7C3AED', border: '1px solid #7C3AED' };
    default:            return { background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' };
  }
}

const REMINDER_TYPES = [
  { value: 'appointment', label: 'Appointment' },
  { value: 'medication',  label: 'Medication'  },
  { value: 'homework',    label: 'Homework'    },
  { value: 'general',     label: 'General'     },
];

const RECURRENCE_OPTIONS = [
  { value: '',        label: 'One-time' },
  { value: 'daily',   label: 'Daily'    },
  { value: 'weekly',  label: 'Weekly'   },
  { value: 'monthly', label: 'Monthly'  },
];

const IC = 'w-full px-3 py-2 text-sm rounded-lg outline-none transition';
const ICS: React.CSSProperties = {
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
};

export default function RemindersPage() {
  const [remindersData, setRemindersData] = useState<RemindersData>({ reminders: [] });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [filterType, setFilterType] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [showNewReminder, setShowNewReminder] = useState(false);
  const [newTitle, setNewTitle]   = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTime, setNewTime]     = useState('');
  const [newReminderType, setNewReminderType] = useState('appointment');
  const [newRecurrence, setNewRecurrence]     = useState('');

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) { setError('Not authenticated'); return; }
      const typeParam = filterType !== 'all' ? `?type=${filterType}` : '';
      const r = await fetch(api(`/api/engagement/reminders${typeParam}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error('Failed to fetch reminders');
      setRemindersData(await r.json());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reminders');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchReminders(); }, [filterType]);

  const handleCreateReminder = async () => {
    if (!newTitle.trim() || !newTime) { setError('Please fill in title and time'); return; }
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api('/api/engagement/reminders'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle, description: newDescription,
          reminder_time: newTime, reminder_type: newReminderType,
          is_recurring: !!newRecurrence, recurrence_pattern: newRecurrence || null,
        }),
      });
      if (!r.ok) throw new Error('Failed to create reminder');
      await fetchReminders();
      setShowNewReminder(false);
      setNewTitle(''); setNewDescription(''); setNewTime('');
      setNewReminderType('appointment'); setNewRecurrence(''); setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to create reminder'); }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/engagement/reminders/${id}/acknowledge`), {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error('Failed to acknowledge reminder');
      await fetchReminders(); setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to acknowledge reminder'); }
  };

  const handleDeleteReminder = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) return;
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/engagement/reminders/${id}`), {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error('Failed to delete reminder');
      setRemindersData({ reminders: remindersData.reminders.filter(r => r.reminder_id !== id) });
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete reminder'); }
  };

  const isUpcoming = (t: string) => new Date(t) > new Date();
  const upcomingCount = remindersData.reminders.filter(r => isUpcoming(r.reminder_time)).length;
  const pastCount     = remindersData.reminders.filter(r => !isUpcoming(r.reminder_time)).length;

  const Card = ({ children, opacity }: { children: React.ReactNode; opacity?: boolean }) => (
    <div className={`rounded-2xl shadow-card p-4 transition ${opacity ? 'opacity-60' : ''}`}
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      {children}
    </div>
  );

  return (
    <DashboardPageWrapper title="Reminders" subtitle="Manage your appointments and tasks">
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div />
          <button onClick={() => setShowNewReminder(!showNewReminder)}
            className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}>
            <Plus size={16} /> New Reminder
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex gap-2.5 rounded-xl p-4"
            style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
            <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Upcoming',        value: upcomingCount,                  color: 'var(--color-primary)' },
            { label: 'Total Reminders', value: remindersData.reminders.length, color: 'var(--color-text-primary)' },
            { label: 'Past',            value: pastCount,                      color: 'var(--color-text-muted)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-4 shadow-card"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
              <p className="text-3xl font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* New Reminder Form */}
        {showNewReminder && (
          <div className="rounded-2xl shadow-card p-6 space-y-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Create New Reminder</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Title</label>
                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g., Therapy appointment" className={IC} style={ICS} />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Type</label>
                <select value={newReminderType} onChange={e => setNewReminderType(e.target.value)}
                  className={IC} style={ICS}>
                  {REMINDER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Date & Time</label>
                <input type="datetime-local" value={newTime} onChange={e => setNewTime(e.target.value)}
                  className={IC} style={ICS} />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Recurrence</label>
                <select value={newRecurrence} onChange={e => setNewRecurrence(e.target.value)}
                  className={IC} style={ICS}>
                  {RECURRENCE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Description (optional)</label>
              <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)}
                placeholder="Add notes or details…" rows={3}
                style={{ ...ICS, width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', outline: 'none', resize: 'none', fontSize: '0.875rem' }} />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowNewReminder(false)}
                className="px-4 py-2 text-sm rounded-lg border transition"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                Cancel
              </button>
              <button onClick={handleCreateReminder}
                className="px-4 py-2 text-sm text-white rounded-lg transition hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                Create Reminder
              </button>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
          {(['upcoming', 'past', 'all'] as const).map(tab => (
            <button key={tab} onClick={() => setFilterType(tab)}
              className="px-4 py-2 font-medium capitalize transition text-sm"
              style={filterType === tab
                ? { color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)' }
                : { color: 'var(--color-text-secondary)' }}>
              {tab}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-40 gap-2" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
          </div>
        ) : (
          <div className="space-y-3">
            {remindersData.reminders.length === 0 ? (
              <div className="rounded-2xl shadow-card p-10 text-center"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <Clock size={40} className="mx-auto mb-4" style={{ color: 'var(--color-border)' }} />
                <p className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>No reminders</p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Create a new reminder to get started</p>
              </div>
            ) : remindersData.reminders.map(reminder => {
              const isPast = !isUpcoming(reminder.reminder_time);
              return (
                <Card key={reminder.reminder_id} opacity={reminder.acknowledged}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {isPast
                          ? <Calendar size={18} style={{ color: 'var(--color-text-muted)' }} />
                          : <Clock size={18} style={{ color: 'var(--color-primary)' }} />}
                        <div>
                          <h3 className="font-semibold text-sm"
                            style={{ color: isPast ? 'var(--color-text-muted)' : 'var(--color-text-primary)', textDecoration: isPast ? 'line-through' : 'none' }}>
                            {reminder.title}
                          </h3>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {new Date(reminder.reminder_time).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
                          </p>
                        </div>
                      </div>
                      {reminder.description && (
                        <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>{reminder.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-xs font-medium" style={reminderTypeStyle(reminder.reminder_type)}>
                          {REMINDER_TYPES.find(t => t.value === reminder.reminder_type)?.label ?? 'General'}
                        </span>
                        {reminder.sent && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)' }}>Sent</span>
                        )}
                        {reminder.acknowledged && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)' }}>Acknowledged</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {!reminder.acknowledged && !isPast && (
                        <button onClick={() => handleAcknowledge(reminder.reminder_id)}
                          className="p-2 rounded-lg transition" title="Acknowledge"
                          style={{ color: 'var(--color-success)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-success-surface)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <Check size={18} />
                        </button>
                      )}
                      <button onClick={() => handleDeleteReminder(reminder.reminder_id)}
                        className="p-2 rounded-lg transition" title="Delete"
                        style={{ color: 'var(--color-danger)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-danger-surface)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
