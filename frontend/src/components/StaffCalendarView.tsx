'use client';

import { useEffect, useState } from 'react';
import { Calendar, RefreshCw, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { api } from '@/utils/api';

interface TimeSlot {
  start: string;
  end: string;
}

export default function StaffCalendarView() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    fetchAvailableSlots();
  }, [selectedDate, duration]);

  const checkGoogleConnection = async () => {
    try {
      const token = localStorage.getItem('token');
      // This would check if user has Google Calendar connected
      const response = await fetch(api('/api/auth/me'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      // Check if user has google integration
      setConnected(data.google_calendar_connected || false);
    } catch (error) {
      console.error('Failed to check Google connection', error);
    }
  };

  useEffect(() => {
    checkGoogleConnection();
  }, []);

  const fetchAvailableSlots = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        api(
          `/api/appointments/google/available-slots?date=${selectedDate}&duration=${duration}`
        ),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setAvailableSlots(data.available_slots || []);
      } else if (response.status === 400 && !connected) {
        setError('Google Calendar not connected. Connect your calendar to view slots.');
      } else {
        setError(data.error || 'Failed to fetch available slots');
      }
    } catch (error) {
      console.error('Failed to fetch slots', error);
      setError('Error fetching available slots');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorizeGoogle = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        api('/api/appointments/google/authorize'),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (error) {
      console.error('Failed to get auth URL', error);
      setError('Failed to authorize Google Calendar');
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          Your Availability
        </h2>
        <button
          onClick={fetchAvailableSlots}
          disabled={loading}
          className="p-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-400 rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!connected && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-50">
                Connect Your Google Calendar
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-200 mt-1">
                Connect your Google Calendar to see available appointment slots and sync
                therapy sessions.
              </p>
              <button
                onClick={handleAuthorizeGoogle}
                className="mt-3 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition text-sm"
              >
                Authorize Google Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Date & Duration Picker */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Session Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
            </select>
          </div>
        </div>

        {/* Available Slots */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Available Slots
          </h3>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center text-gray-600 dark:text-gray-400">
              <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No available slots for {selectedDate}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableSlots.map((slot, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between"
                >
                  <span className="text-sm font-medium text-green-900 dark:text-green-100">
                    {formatTime(slot.start)} - {formatTime(slot.end)}
                  </span>
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          💡 <strong>Pro Tip:</strong> Available slots are based on your Google Calendar.
          Make sure to block off your break times and admin hours to show accurate availability
          to students.
        </p>
      </div>
    </div>
  );
}
