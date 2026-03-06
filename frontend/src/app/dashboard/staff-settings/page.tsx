'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PageShell from '@/components/PageShell';
import GoogleCalendarSync from '@/components/GoogleCalendarSync';
import StaffCalendarView from '@/components/StaffCalendarView';
import { Settings, Calendar, Lock, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '@/utils/api';

function StaffSettingsContent() {
  const searchParams = useSearchParams();
  const [googleConnected, setGoogleConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'calendar' | 'settings'>('calendar');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Check for OAuth callback parameters
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success) {
      setMessage ({ type: 'success', text: decodeURIComponent(success) });
    } else if (error) {
      setMessage({ type: 'error', text: decodeURIComponent(error) });
    }

    checkGoogleConnection();
  }, [searchParams]);

  const checkGoogleConnection = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api('/api/auth/me'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setGoogleConnected(data.google_calendar_connected || false);
    } catch (error) {
      console.error('Failed to check Google connection', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorizeGoogle = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api('/api/appointments/google/authorize'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (error) {
      console.error('Failed to authorize', error);
      setMessage({ type: 'error', text: 'Failed to authorize Google Calendar' });
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar? Existing calendar events will not be deleted.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api('/api/appointments/google/disconnect'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setGoogleConnected(false);
        setMessage({ type: 'success', text: 'Google Calendar disconnected successfully' });
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to disconnect' });
      }
    } catch (error) {
      console.error('Failed to disconnect', error);
      setMessage({ type: 'error', text: 'Failed to disconnect Google Calendar' });
    }
  };

  if (loading) {
    return (
      <PageShell title="Staff Settings" subtitle="Loading...">
        <div className="animate-pulse">Loading...</div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Staff Settings" subtitle="Manage your calendar and preferences">
      {/* Success/Error Messages */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          )}
          <p
            className={
              message.type === 'success'
                ? 'text-green-800 dark:text-green-100'
                : 'text-red-800 dark:text-red-100'
            }
          >
            {message.text}
          </p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-3 font-medium transition border-b-2 ${
              activeTab === 'calendar'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Calendar & Availability
            </span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 font-medium transition border-b-2 ${
              activeTab === 'settings'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Settings
            </span>
          </button>
        </div>
      </div>

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          <StaffCalendarView />

          {!googleConnected && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="bg-blue-600 text-white rounded-lg p-3 flex-shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">
                    Connect Your Google Calendar
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mt-2">
                    Sync your therapy sessions with your personal Google Calendar. Students can book
                    only during your available time blocks, and both you and students receive automatic
                    email reminders 24 hours before appointments.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Auto-sync all booked appointments
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      24-hour email reminders
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Invite students to calendar events
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Real-time availability updates
                    </li>
                  </ul>
                  <button
                    onClick={handleAuthorizeGoogle}
                    className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                  >
                    Authorize Google Calendar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Google Calendar Integration */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              Google Calendar Integration
            </h3>

            <div className="space-y-4">
              {googleConnected ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-green-900 dark:text-green-100 font-medium flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Google Calendar Connected
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-200 mt-2">
                    Your calendar is synced. All new appointments will automatically appear in your Google
                    Calendar with reminders.
                  </p>
                  <button
                    onClick={handleDisconnectGoogle}
                    className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg font-medium transition"
                  >
                    Disconnect Google Calendar
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-yellow-900 dark:text-yellow-100 font-medium">
                    Not Connected
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-200 mt-2">
                    Connect your Google Calendar to enable automated syncing and availability management.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Appointment Reminders */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6 text-purple-600" />
              Appointment Reminders
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-50">Email Reminders</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Receive email 24 hours before</p>
                </div>
                <label className="flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-5 h-5" />
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-50">
                    Calendar Notifications
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    15 minutes before appointments
                  </p>
                </div>
                <label className="flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-5 h-5" />
                </label>
              </div>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
              <Lock className="w-6 h-6 text-red-600" />
              Privacy & Security
            </h3>

            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
              <p>
                ✓ Your Google Calendar data is encrypted and stored securely
              </p>
              <p>
                ✓ Only you and invited attendees can see appointment details
              </p>
              <p>
                ✓ You can disconnect Google Calendar at any time without losing appointment data
              </p>
              <p>
                ✓ We use OAuth 2.0 for secure authentication
              </p>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

export default function StaffSettingsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
      <StaffSettingsContent />
    </Suspense>
  );
}

function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      className={props.className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
