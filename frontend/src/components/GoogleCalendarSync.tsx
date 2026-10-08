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

  const handleSyncToCalendar = async () => {
    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api(`/api/appointments/${appointmentId}/sync-to-calendar`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setSynced(true);
        setEventUrl(data.event_url);
        setMessage('Synced to Google Calendar');
        onSyncSuccess?.();
      } else if (response.status === 400 && data.auth_url) {
        setMessage('Google Calendar not connected');
        onAuthRequired?.(data.auth_url);
      } else {
        setMessage(data.error || 'Failed to sync');
      }
    } catch (error) {
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
      const response = await fetch(api(`/api/appointments/${appointmentId}/remove-from-calendar`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setSynced(false);
        setEventUrl(null);
        setMessage('Removed from Google Calendar');
      } else {
        setMessage(data.error || 'Failed to remove');
      }
    } catch (error) {
      setMessage('Error removing from calendar');
    } finally {
      setLoading(false);
    }
  };

  const msgStyle = /^(Synced|Removed) /.test(message)
    ? { background: 'var(--color-success-surface)', color: 'var(--color-success-text)' }
    : message.startsWith('Google Calendar not connected')
    ? { background: 'var(--color-warning-surface)', color: 'var(--color-warning-text)' }
    : { background: 'var(--color-danger-surface)', color: 'var(--color-danger-text)' };

  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary-muted)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <Calendar className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
          Google Calendar
        </h3>
        <span className="text-xs font-bold px-2 py-1 rounded" style={
          synced
            ? { background: 'var(--color-success-surface)', color: 'var(--color-success-text)' }
            : { background: 'var(--color-warning-surface)', color: 'var(--color-warning-text)' }
        }>
          {synced ? (
            <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Synced</span>
          ) : (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Not Synced</span>
          )}
        </span>
      </div>

      {message && (
        <div className="mb-3 px-3 py-2 rounded text-sm font-medium" style={msgStyle}>
          {message}
        </div>
      )}

      <div className="flex gap-2">
        {!synced ? (
          <button
            onClick={handleSyncToCalendar}
            disabled={loading}
            className="flex-1 px-3 py-2 text-white rounded-lg font-medium transition text-sm disabled:opacity-50"
            style={{ background: 'var(--color-primary)' }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}
          >
            {loading ? 'Syncing...' : 'Sync to Google Calendar'}
          </button>
        ) : (
          <>
            <button
              onClick={() => eventUrl && window.open(eventUrl, '_blank')}
              className="flex-1 px-3 py-2 text-white rounded-lg font-medium transition text-sm"
              style={{ background: 'var(--color-primary)' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'}
            >
              View on Google
            </button>
            <button
              onClick={handleRemoveFromCalendar}
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-lg font-medium transition text-sm disabled:opacity-50"
              style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger-text)' }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-danger)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-danger-surface)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-danger-text)'; }}
            >
              Remove
            </button>
          </>
        )}
      </div>

      <p className="text-xs mt-3" style={{ color: 'var(--color-text-secondary)' }}>
        {synced
          ? 'This appointment is synced with your Google Calendar. Both you and the student will receive reminders.'
          : 'Sync this appointment to your Google Calendar to enable calendar reminders and invite attendees.'}
      </p>
    </div>
  );
}
