'use client';

import { useState, useEffect } from 'react';
import { Save, ArrowLeft, Clock, Bell, User, BookOpen, Languages, FileText, Tag, Calendar, Settings, Plus, X, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface WorkPreferences {
  default_session_duration: number;
  meeting_methods: ('in-person' | 'google-meet' | 'zoom')[];
  accepts_walk_ins: boolean;
}

interface NotificationPreferences {
  email_on_new_request: boolean;
  email_on_appointment_change: boolean;
  email_on_cancellation: boolean;
  sms_reminders: boolean;
}

interface StaffSettings {
  user_id: string;
  name: string;
  role: string;
  work_preferences: WorkPreferences;
  notification_preferences: NotificationPreferences;
  specialty_areas: string[];
  languages: string[];
  max_students_per_day: number;
  bio: string;
  tags: string[];
}

interface BookingRules {
  operating_days: number[];
  operating_hours_start: string;
  operating_hours_end: string;
  slot_duration_minutes: number;
  min_days_ahead: number;
  max_days_ahead: number;
  blackout_dates: string[];
  last_slot_start: string;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) =>
  `${String(h).padStart(2, '0')}:00`
);

export default function StaffSettingsPage() {
  const [settings, setSettings] = useState<StaffSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [specialtyOptions, setSpecialtyOptions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'work' | 'availability' | 'notifications' | 'profile' | 'booking-rules'>('work');
  const [userRole, setUserRole] = useState('');

  const [bookingRules, setBookingRules] = useState<BookingRules>({
    operating_days: [1, 2, 3, 4, 5],
    operating_hours_start: '08:00',
    operating_hours_end: '17:00',
    slot_duration_minutes: 60,
    min_days_ahead: 1,
    max_days_ahead: 30,
    blackout_dates: [],
    last_slot_start: '16:00',
  });
  const [savingRules, setSavingRules] = useState(false);
  const [newBlackout, setNewBlackout] = useState('');

  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const [connectingCalendar, setConnectingCalendar] = useState(false);
  const [disconnectingCalendar, setDisconnectingCalendar] = useState(false);

  const loadCalendarStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api('/api/calendar/status'), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setCalendarConnected(d.connected);
      }
    } catch {}
  };

  const handleConnectCalendar = async () => {
    setConnectingCalendar(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api('/api/calendar/authorize'), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        window.location.href = d.auth_url;
      } else {
        showToast('Failed to get authorization URL', 'error');
      }
    } catch {
      showToast('Error connecting to Google Calendar', 'error');
    } finally {
      setConnectingCalendar(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!confirm('Disconnect Google Calendar? New appointments will no longer sync.')) return;
    setDisconnectingCalendar(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api('/api/calendar/disconnect'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCalendarConnected(false);
        showToast('Google Calendar disconnected', 'success');
      }
    } catch {
      showToast('Error disconnecting', 'error');
    } finally {
      setDisconnectingCalendar(false);
    }
  };

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) setUserRole(JSON.parse(user).role || '');
    loadSettings();
    loadSpecialties();
    loadBookingRules();
    loadCalendarStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');

      if (!token || !user) {
        window.location.href = '/login';
        return;
      }

      const userData = JSON.parse(user);
      const staffRoles = ['COUNSELOR', 'PSYCHOLOGIST', 'IC', 'STAFF'];

      if (!staffRoles.includes(userData.role)) {
        window.location.href = '/dashboard';
        return;
      }

      const response = await fetch(api('/api/staff/settings/my-settings'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        showToast('Failed to load settings', 'error');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      showToast('Error loading settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSpecialties = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api('/api/staff/settings/specialty-areas'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSpecialtyOptions(data.specialty_areas);
      }
    } catch (error) {
      console.error('Error loading specialties:', error);
    }
  };

  const loadBookingRules = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api('/api/staff/settings/booking-rules'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setBookingRules(await res.json());
    } catch {}
  };

  const handleSaveBookingRules = async () => {
    setSavingRules(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api('/api/staff/settings/booking-rules'), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingRules),
      });
      if (res.ok) showToast('Booking rules saved', 'success');
      else {
        const e = await res.json();
        showToast(e.error || 'Failed to save', 'error');
      }
    } catch {
      showToast('Error saving rules', 'error');
    } finally {
      setSavingRules(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleWorkPreferenceChange = (key: string, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      work_preferences: {
        ...settings.work_preferences,
        [key]: value,
      },
    });
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      notification_preferences: {
        ...settings.notification_preferences,
        [key]: value,
      },
    });
  };

  const handleSpecialtyToggle = (specialty: string) => {
    if (!settings) return;
    const updated = settings.specialty_areas.includes(specialty)
      ? settings.specialty_areas.filter(s => s !== specialty)
      : [...settings.specialty_areas, specialty];
    setSettings({ ...settings, specialty_areas: updated });
  };

  const handleLanguageToggle = (language: string) => {
    if (!settings) return;
    const updated = settings.languages.includes(language)
      ? settings.languages.filter(l => l !== language)
      : [...settings.languages, language];
    setSettings({ ...settings, languages: updated });
  };

  const handleMeetingMethodToggle = (method: 'in-person' | 'google-meet' | 'zoom') => {
    if (!settings) return;
    const updated = settings.work_preferences.meeting_methods.includes(method)
      ? settings.work_preferences.meeting_methods.filter(m => m !== method)
      : [...settings.work_preferences.meeting_methods, method];
    // Ensure at least one method is selected
    if (updated.length === 0) {
      updated.push('in-person');
    }
    setSettings({
      ...settings,
      work_preferences: {
        ...settings.work_preferences,
        meeting_methods: updated,
      },
    });
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api('/api/staff/settings/my-settings'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          work_preferences: settings.work_preferences,
          notification_preferences: settings.notification_preferences,
          specialty_areas: settings.specialty_areas,
          languages: settings.languages,
          max_students_per_day: settings.max_students_per_day,
          bio: settings.bio,
          tags: settings.tags,
        }),
      });

      if (response.ok) {
        showToast('Settings saved successfully!', 'success');
      } else {
        showToast('Failed to save settings', 'error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('Error saving settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardPageWrapper title="Settings" subtitle="Configure your preferences">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardPageWrapper>
    );
  }

  if (!settings) {
    return (
      <DashboardPageWrapper title="Settings" subtitle="Configure your preferences">
        <div className="text-center py-12">
          <p className="text-red-600">Failed to load settings</p>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Settings" subtitle="Configure your work preferences and availability">
      {toast && (
        <div className={`mb-4 p-4 rounded-lg ${toast.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {toast.message}
        </div>
      )}

      <div className="max-w-4xl">
        {/* Header with User Info */}
        <div className="mb-8 p-6 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{settings.name}</h2>
              <p className="text-gray-600">{settings.role.replace(/_/g, ' ')}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('work')}
            className={`px-4 py-3 font-medium border-b-2 transition ${
              activeTab === 'work'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="inline-block w-4 h-4 mr-2" />
            Work Preferences
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`px-4 py-3 font-medium border-b-2 transition ${
              activeTab === 'availability'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar className="inline-block w-4 h-4 mr-2" />
            Availability
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-3 font-medium border-b-2 transition ${
              activeTab === 'notifications'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Bell className="inline-block w-4 h-4 mr-2" />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-3 font-medium border-b-2 transition ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="inline-block w-4 h-4 mr-2" />
            Profile
          </button>
          {['ADMIN', 'STAFF'].includes(userRole) && (
            <button
              onClick={() => setActiveTab('booking-rules')}
              className={`px-4 py-3 font-medium border-b-2 transition ${
                activeTab === 'booking-rules'
                  ? 'border-blue-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="inline-block w-4 h-4 mr-2" />
              Booking Rules
            </button>
          )}
        </div>

        {/* Work Preferences Tab */}
        {activeTab === 'work' && (
          <div className="space-y-6">
            <div className="bg-white p-6 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Settings</h3>
              
              {/* Session Duration */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Session Duration (minutes)
                </label>
                <select
                  value={settings.work_preferences.default_session_duration}
                  onChange={(e) => handleWorkPreferenceChange('default_session_duration', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={50}>50 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                </select>
              </div>

              {/* Meeting Method */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Meeting Methods (Select all that apply)
                </label>
                <div className="space-y-2">
                  {(['in-person', 'google-meet', 'zoom'] as const).map((method) => (
                    <label key={method} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.work_preferences.meeting_methods.includes(method)}
                        onChange={() => handleMeetingMethodToggle(method)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-gray-700 capitalize">{method === 'google-meet' ? 'Google Meet' : method === 'zoom' ? 'Zoom' : 'In-Person'}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">Selected methods will be used for automatic appointment assignment</p>
              </div>

              {/* Walk-ins */}
              <div className="mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.work_preferences.accepts_walk_ins}
                    onChange={(e) => handleWorkPreferenceChange('accepts_walk_ins', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-gray-700">Accept walk-in appointments</span>
                </label>
              </div>


            </div>

            {/* Capacity */}
            <div className="bg-white p-6 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Capacity</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Students Per Day (0 = unlimited)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.max_students_per_day}
                  onChange={(e) => setSettings({ ...settings, max_students_per_day: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="bg-white p-6 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Notifications</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={settings.notification_preferences.email_on_new_request}
                  onChange={(e) => handleNotificationChange('email_on_new_request', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <div>
                  <p className="font-medium text-gray-900">New Appointment Requests</p>
                  <p className="text-sm text-gray-600">Get notified when a student requests an appointment</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={settings.notification_preferences.email_on_appointment_change}
                  onChange={(e) => handleNotificationChange('email_on_appointment_change', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <div>
                  <p className="font-medium text-gray-900">Appointment Changes</p>
                  <p className="text-sm text-gray-600">Get notified when an appointment is rescheduled</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={settings.notification_preferences.email_on_cancellation}
                  onChange={(e) => handleNotificationChange('email_on_cancellation', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <div>
                  <p className="font-medium text-gray-900">Cancellations</p>
                  <p className="text-sm text-gray-600">Get notified when an appointment is cancelled</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={settings.notification_preferences.sms_reminders}
                  onChange={(e) => handleNotificationChange('sms_reminders', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <div>
                  <p className="font-medium text-gray-900">SMS Reminders</p>
                  <p className="text-sm text-gray-600">Receive text reminders for upcoming appointments (requires phone number)</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Availability Tab */}
        {activeTab === 'availability' && (
          <div className="space-y-6">
            <div className="bg-white p-6 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Set Your Availability
              </h3>
              <p className="text-sm text-gray-600 mb-6">Define your working hours and available meeting times for each day of the week.</p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900">
                  📌 <strong>Note:</strong> Set your weekly availability to let students know when you can meet for appointments. This helps with automatic scheduling and reduces conflicts.
                </p>
              </div>

              <Link href="/availability">
                <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
                  Configure Weekly Availability
                </button>
              </Link>
              
              <p className="text-xs text-gray-500 mt-4 text-center">
                You can also manage specific availability slots from this settings page in the future.
              </p>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Google Calendar */}
            <div className="bg-white dark:bg-gray-900 p-6 border border-gray-200 dark:border-gray-700 rounded-xl">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                Google Calendar
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Connect your Google account so confirmed appointments automatically appear in your calendar and students receive calendar invites.
              </p>
              {calendarConnected === null ? (
                <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
              ) : calendarConnected ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-green-400">
                    <CheckCircle size={16} />
                    <span className="font-medium">Connected</span>
                    <span className="text-gray-400 dark:text-gray-500 text-xs">· Appointments sync automatically</span>
                  </div>
                  <button
                    onClick={handleDisconnectCalendar}
                    disabled={disconnectingCalendar}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 underline transition-colors"
                  >
                    {disconnectingCalendar ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectCalendar}
                  disabled={connectingCalendar}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {connectingCalendar ? 'Redirecting…' : 'Connect Google Calendar'}
                </button>
              )}
            </div>

            {/* Bio */}
            <div className="bg-white p-6 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Professional Bio
              </h3>
              <textarea
                value={settings.bio}
                onChange={(e) => setSettings({ ...settings, bio: e.target.value.substring(0, 500) })}
                maxLength={500}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Brief bio visible to students when booking appointments..."
              />
              <p className="text-sm text-gray-500 mt-1">{settings.bio.length}/500 characters</p>
            </div>

            {/* Specialty Areas */}
            <div className="bg-white p-6 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Specialty Areas
              </h3>
              <p className="text-sm text-gray-600 mb-4">Select areas where you have expertise</p>
              <div className="grid grid-cols-2 gap-3">
                {specialtyOptions.map((specialty) => (
                  <button
                    key={specialty}
                    onClick={() => handleSpecialtyToggle(specialty)}
                    className={`p-3 rounded-lg border-2 text-left transition font-medium ${
                      settings.specialty_areas.includes(specialty)
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {specialty}
                  </button>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className="bg-white p-6 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Languages className="w-5 h-5" />
                Languages
              </h3>
              <div className="space-y-2">
                {['English', 'Spanish', 'French', 'Mandarin', 'Vietnamese', 'ASL'].map((lang) => (
                  <label key={lang} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.languages.includes(lang)}
                      onChange={() => handleLanguageToggle(lang)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-gray-700">{lang}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white p-6 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Tags
              </h3>
              <input
                type="text"
                value={settings.tags.join(', ')}
                onChange={(e) => setSettings({ ...settings, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter tags separated by commas (e.g., LGBTQ+, First-Gen, Athletes)"
              />
            </div>
          </div>
        )}

        {/* Booking Rules Tab */}
        {activeTab === 'booking-rules' && (
          <div className="space-y-6">
            {/* Operating Days */}
            <div className="bg-white p-6 border border-gray-200 rounded-lg">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Operating Days</h3>
              <p className="text-xs text-gray-500 mb-4">Which days of the week can students book appointments?</p>
              <div className="flex gap-2 flex-wrap">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      const days = bookingRules.operating_days.includes(i)
                        ? bookingRules.operating_days.filter(d => d !== i)
                        : [...bookingRules.operating_days, i].sort();
                      if (days.length > 0) setBookingRules({ ...bookingRules, operating_days: days });
                    }}
                    className={`w-12 h-12 rounded-lg text-sm font-medium border-2 transition ${
                      bookingRules.operating_days.includes(i)
                        ? 'bg-green-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Operating Hours */}
            <div className="bg-white p-6 border border-gray-200 rounded-lg">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Operating Hours</h3>
              <p className="text-xs text-gray-500 mb-4">The window students can see and select time slots within.</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Opens at</label>
                  <select
                    value={bookingRules.operating_hours_start}
                    onChange={e => setBookingRules({ ...bookingRules, operating_hours_start: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Last slot starts at</label>
                  <select
                    value={bookingRules.last_slot_start}
                    onChange={e => setBookingRules({ ...bookingRules, last_slot_start: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Closes at</label>
                  <select
                    value={bookingRules.operating_hours_end}
                    onChange={e => setBookingRules({ ...bookingRules, operating_hours_end: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Booking Window & Slot Duration */}
            <div className="bg-white p-6 border border-gray-200 rounded-lg">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Booking Window</h3>
              <p className="text-xs text-gray-500 mb-4">How far in advance can students book?</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Min days ahead</label>
                  <input
                    type="number" min="0" max="30"
                    value={bookingRules.min_days_ahead}
                    onChange={e => setBookingRules({ ...bookingRules, min_days_ahead: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">e.g. 1 = tomorrow earliest</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Max days ahead</label>
                  <input
                    type="number" min="1" max="365"
                    value={bookingRules.max_days_ahead}
                    onChange={e => setBookingRules({ ...bookingRules, max_days_ahead: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">e.g. 30 = up to a month out</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Slot duration (min)</label>
                  <select
                    value={bookingRules.slot_duration_minutes}
                    onChange={e => setBookingRules({ ...bookingRules, slot_duration_minutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {[30, 45, 50, 60, 90].map(v => <option key={v} value={v}>{v} min</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Blackout Dates */}
            <div className="bg-white p-6 border border-gray-200 rounded-lg">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Blackout Dates</h3>
              <p className="text-xs text-gray-500 mb-4">Dates when CPS is closed — students cannot book these days (holidays, school breaks, etc.)</p>
              <div className="flex gap-2 mb-3">
                <input
                  type="date"
                  value={newBlackout}
                  onChange={e => setNewBlackout(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newBlackout && !bookingRules.blackout_dates.includes(newBlackout)) {
                      setBookingRules({ ...bookingRules, blackout_dates: [...bookingRules.blackout_dates, newBlackout].sort() });
                      setNewBlackout('');
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-2 bg-[#2563eb] hover:bg-blue-700 text-white text-sm rounded-lg transition"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {bookingRules.blackout_dates.length === 0 && (
                  <p className="text-xs text-gray-400">No blackout dates set.</p>
                )}
                {bookingRules.blackout_dates.map(d => (
                  <span key={d} className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 text-xs rounded-full">
                    {new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    <button onClick={() => setBookingRules({ ...bookingRules, blackout_dates: bookingRules.blackout_dates.filter(x => x !== d) })}>
                      <X size={12} className="hover:text-red-900" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveBookingRules}
              disabled={savingRules}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-lg font-medium text-sm disabled:opacity-50 transition"
            >
              <Save size={15} />
              {savingRules ? 'Saving…' : 'Save Booking Rules'}
            </button>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-8 flex gap-3 sticky bottom-0 bg-white border-t border-gray-200 p-4">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition ${
              saving
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <Link href="/dashboard">
            <button className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition">
              <ArrowLeft className="w-4 h-4" />
              Cancel
            </button>
          </Link>
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
