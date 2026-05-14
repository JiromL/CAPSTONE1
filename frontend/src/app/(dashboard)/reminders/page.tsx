'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { AlertCircle, Plus, Trash2, Check, Clock, Calendar } from 'lucide-react';

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

const REMINDER_TYPES = [
  { value: 'appointment', label: 'Appointment', color: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' },
  { value: 'medication', label: 'Medication', color: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' },
  { value: 'homework', label: 'Homework', color: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' },
  { value: 'general', label: 'General', color: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200' }
];

const RECURRENCE_OPTIONS = [
  { value: '', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
];

export default function RemindersPage() {
  const [remindersData, setRemindersData] = useState<RemindersData>({ reminders: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [showNewReminder, setShowNewReminder] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newReminderType, setNewReminderType] = useState('appointment');
  const [newRecurrence, setNewRecurrence] = useState('');

  // Fetch reminders
  useEffect(() => {
    const fetchReminders = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        const typeParam = filterType !== 'all' ? `?type=${filterType}` : '';
        const response = await fetch(`${api(`/api/engagement/reminders${typeParam}`)}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch reminders');
        }

        const data = await response.json();
        setRemindersData(data);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reminders');
      } finally {
        setLoading(false);
      }
    };

    fetchReminders();
  }, [filterType]);

  // Create new reminder
  const handleCreateReminder = async () => {
    if (!newTitle.trim() || !newTime) {
      setError('Please fill in title and time');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${api('/api/engagement/reminders')}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          reminder_time: newTime,
          reminder_type: newReminderType,
          is_recurring: !!newRecurrence,
          recurrence_pattern: newRecurrence || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create reminder');
      }

      // Refresh list
      const listResponse = await fetch(`${api(`/api/engagement/reminders?type=${filterType}`)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await listResponse.json();
      setRemindersData(data);
      setShowNewReminder(false);
      setNewTitle('');
      setNewDescription('');
      setNewTime('');
      setNewReminderType('appointment');
      setNewRecurrence('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reminder');
    }
  };

  // Acknowledge reminder
  const handleAcknowledge = async (reminderId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${api(`/api/engagement/reminders/${reminderId}/acknowledge`)}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge reminder');
      }

      // Refresh list
      const listResponse = await fetch(`${api(`/api/engagement/reminders?type=${filterType}`)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await listResponse.json();
      setRemindersData(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acknowledge reminder');
    }
  };

  // Delete reminder
  const handleDeleteReminder = async (reminderId: string) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${api(`/api/engagement/reminders/${reminderId}`)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete reminder');
      }

      setRemindersData({
        reminders: remindersData.reminders.filter(r => r.reminder_id !== reminderId)
      });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete reminder');
    }
  };

  const getReminderTypeColor = (type: string) => {
    return REMINDER_TYPES.find(t => t.value === type)?.color || REMINDER_TYPES[3].color;
  };

  const getReminderTypeLabel = (type: string) => {
    return REMINDER_TYPES.find(t => t.value === type)?.label || 'General';
  };

  const isUpcoming = (reminderTime: string) => {
    return new Date(reminderTime) > new Date();
  };

  if (loading) {
    return (
      <DashboardPageWrapper title="Reminders" subtitle="Manage your appointments and tasks">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardPageWrapper>
    );
  }

  const upcomingCount = remindersData.reminders.filter(r => isUpcoming(r.reminder_time)).length;
  const pastCount = remindersData.reminders.filter(r => !isUpcoming(r.reminder_time)).length;

  return (
    <DashboardPageWrapper title="Reminders" subtitle="Manage your appointments and tasks">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div />
          <button
            onClick={() => setShowNewReminder(!showNewReminder)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus size={20} />
            New Reminder
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Upcoming</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{upcomingCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Reminders</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{remindersData.reminders.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Past</p>
            <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{pastCount}</p>
          </div>
        </div>

        {/* New Reminder Form */}
        {showNewReminder && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New Reminder</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Therapy appointment"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Type
                </label>
                <select
                  value={newReminderType}
                  onChange={(e) => setNewReminderType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {REMINDER_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Recurrence
                </label>
                <select
                  value={newRecurrence}
                  onChange={(e) => setNewRecurrence(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {RECURRENCE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description (optional)
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Add notes or details..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowNewReminder(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReminder}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Create Reminder
              </button>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {(['upcoming', 'past', 'all'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className={`px-4 py-2 font-medium capitalize transition ${
                filterType === tab
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Reminders List */}
        <div className="space-y-4">
          {remindersData.reminders.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
              <Clock className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
              <p className="text-gray-700 dark:text-gray-300 font-medium">No reminders</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Create a new reminder to get started</p>
            </div>
          ) : (
            remindersData.reminders.map((reminder) => {
              const isPast = !isUpcoming(reminder.reminder_time);
              return (
                <div
                  key={reminder.reminder_id}
                  className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 transition ${
                    reminder.acknowledged ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {isPast ? (
                          <Calendar className="text-gray-400" size={20} />
                        ) : (
                          <Clock className="text-blue-600 dark:text-blue-400" size={20} />
                        )}
                        <div>
                          <h3 className={`font-semibold ${
                            isPast
                              ? 'text-gray-600 dark:text-gray-400 line-through'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {reminder.title}
                          </h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {new Date(reminder.reminder_time).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {reminder.description && (
                        <p className="text-gray-700 dark:text-gray-300 mb-2">{reminder.description}</p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getReminderTypeColor(reminder.reminder_type)}`}>
                          {getReminderTypeLabel(reminder.reminder_type)}
                        </span>
                        {reminder.sent && (
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                            Sent
                          </span>
                        )}
                        {reminder.acknowledged && (
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            Acknowledged
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {!reminder.acknowledged && !isPast && (
                        <button
                          onClick={() => handleAcknowledge(reminder.reminder_id)}
                          className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition"
                          title="Acknowledge"
                        >
                          <Check size={20} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteReminder(reminder.reminder_id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
