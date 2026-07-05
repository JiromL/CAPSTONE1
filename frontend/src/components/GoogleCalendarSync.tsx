'use client';

import { useEffect, useState } from 'react';
import { Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { api } from '@/utils/api';

interface GoogleCalendarSyncProps {
  appointmentId: string;
  isConnected?: boolean;
  onSyncSuccess?: () => void;
  onAuthRequired?: (authUrl: string) => void;
}

export default function GoogleCalendarSync({
  appointmentId,
  isConnected = false,
  onSyncSuccess,
  onAuthRequired,
}: GoogleCalendarSyncProps) {
  const [synced, setSynced] = useState(isConnected);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [eventUrl, setEventUrl] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSyncToCalendar = async () => {
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        api(`/api/appointments/${appointmentId}/sync-to-calendar`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setSynced(true);
        setEventUrl(data.event_url);
        setMessage('✓ Synced to Google Calendar');
        onSyncSuccess?.();
      } else if (response.status === 400 && data.auth_url) {
        // User needs to authorize
        setMessage('Google Calendar not connected');
        onAuthRequired?.(data.auth_url);
      } else {
        setMessage(data.error || 'Failed to sync');
      }
    } catch (error) {
      console.error('Failed to sync appointment', error);
      setMessage('Error syncing to calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromCalendar = async () => {
    if (!confirm('Remove this appointment from Google Calendar?')) return;

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        api(`/api/appointments/${appointmentId}/remove-from-calendar`),
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setSynced(false);
        setEventUrl(null);
        setMessage('✓ Removed from Google Calendar');
      } else {
        setMessage(data.error || 'Failed to remove');
      }
    } catch (error) {
      console.error('Failed to remove from calendar', error);
      setMessage('Error removing from calendar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Google Calendar
        </h3>
        <span
          className={`text-xs font-bold px-2 py-1 rounded ${
            synced
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
          }`}
        >
          {synced ? (
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Synced
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> Not Synced
            </span>
          )}
        </span>
      </div>

      {message && (
        <div
          className={`mb-3 px-3 py-2 rounded text-sm font-medium ${
            message.startsWith('✓')
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : message.startsWith('Google Calendar not connected')
              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}
        >
          {message}
        </div>
      )}

      <div className="flex gap-2">
        {!synced ? (
          <button
            onClick={handleSyncToCalendar}
            disabled={loading}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition text-sm"
          >
            {loading ? 'Syncing...' : 'Sync to Google Calendar'}
          </button>
        ) : (
          <>
            <button
              onClick={() => eventUrl && window.open(eventUrl, '_blank')}
              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition text-sm"
            >
              View on Google
            </button>
            <button
              onClick={handleRemoveFromCalendar}
              disabled={loading}
              className="flex-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900 dark:hover:bg-red-800 dark:text-red-200 rounded-lg font-medium transition text-sm disabled:opacity-50"
            >
              Remove
            </button>
          </>
        )}
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
        {synced
          ? 'This appointment is synced with your Google Calendar. Both you and the student will receive reminders.'
          : 'Sync this appointment to your Google Calendar to enable calendar reminders and invite attendees.'}
      </p>
    </div>
  );
}
