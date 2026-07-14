'use client';

import { useEffect, useState } from 'react';
import { Calendar, RefreshCw, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { api } from '@/utils/api';

interface TimeSlot { start: string; end: string; }

const IC = 'w-full px-3 py-2 rounded-lg outline-none';
const ICS: React.CSSProperties = { border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' };

export default function StaffCalendarView() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [duration, setDuration] = useState(60);

  useEffect(() => { fetchAvailableSlots(); }, [selectedDate, duration]);
  useEffect(() => { checkGoogleConnection(); }, []);

  const checkGoogleConnection = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api('/api/auth/me'), { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      setConnected(data.google_calendar_connected || false);
    } catch {}
  };

  const fetchAvailableSlots = async () => {
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api(`/api/appointments/google/available-slots?date=${selectedDate}&duration=${duration}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setAvailableSlots(data.available_slots || []);
      else if (response.status === 400 && !connected) setError('Google Calendar not connected. Connect your calendar to view slots.');
      else setError(data.error || 'Failed to fetch available slots');
    } catch { setError('Error fetching available slots'); }
    finally { setLoading(false); }
  };

  const handleAuthorizeGoogle = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api('/api/appointments/google/authorize'), { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (data.auth_url) window.location.href = data.auth_url;
    } catch { setError('Failed to authorize Google Calendar'); }
  };

  const formatTime = (isoString: string) => {
    try { return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return isoString; }
  };

  return (
    <div className="rounded-2xl p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <Calendar className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
          Your Availability
        </h2>
        <button
          onClick={fetchAvailableSlots}
          disabled={loading}
          className="p-2 rounded-lg transition disabled:opacity-50"
          style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)' }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-muted)'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-surface)'}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!connected && (
        <div className="mb-6 p-4 rounded-lg" style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' }}>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
            <div className="flex-1">
              <h3 className="font-semibold" style={{ color: 'var(--color-warning-text)' }}>Connect Your Google Calendar</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--color-warning-text)' }}>
                Connect your Google Calendar to see available appointment slots and sync therapy sessions.
              </p>
              <button
                onClick={handleAuthorizeGoogle}
                className="mt-3 px-4 py-2 text-white rounded-lg font-medium transition text-sm"
                style={{ background: 'var(--color-warning)' }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#B45309'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-warning)'}
              >
                Authorize Google Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>Select Date</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className={IC} style={ICS} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>Session Duration</label>
            <select value={duration} onChange={e => setDuration(parseInt(e.target.value))} className={IC} style={ICS}>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
            </select>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>Available Slots</h3>

          {error && (
            <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger-text)' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-primary)' }} />
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="p-4 rounded-lg text-center" style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
              <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No available slots for {selectedDate}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableSlots.map((slot, idx) => (
                <div key={idx} className="p-3 rounded-lg flex items-center justify-between"
                  style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-success-text)' }}>
                    {formatTime(slot.start)} - {formatTime(slot.end)}
                  </span>
                  <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 rounded-lg" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary-muted)' }}>
        <p className="text-sm" style={{ color: 'var(--color-primary-text)' }}>
          💡 <strong>Pro Tip:</strong> Available slots are based on your Google Calendar.
          Make sure to block off your break times and admin hours to show accurate availability to students.
        </p>
      </div>
    </div>
  );
}
