'use client';

import { useState, useEffect } from 'react';
import { Save, ArrowLeft, Clock, Bell, User, BookOpen, Languages, FileText, Tag, Calendar } from 'lucide-react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';

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

export default function StaffSettingsPage() {
  const [settings, setSettings] = useState<StaffSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [specialtyOptions, setSpecialtyOptions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'work' | 'availability' | 'notifications' | 'profile'>('work');

  useEffect(() => {
    loadSettings();
    loadSpecialties();
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
      const staffRoles = ['COUNSELOR', 'PSYCHOLOGIST', 'IC', 'CSC', 'CSP'];
      
      if (!staffRoles.includes(userData.role)) {
        window.location.href = '/dashboard';
        return;
      }

      const response = await fetch('http://localhost:5001/api/staff/settings/my-settings', {
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
      const response = await fetch('http://localhost:5001/api/staff/settings/specialty-areas');
      if (response.ok) {
        const data = await response.json();
        setSpecialtyOptions(data.specialty_areas);
      }
    } catch (error) {
      console.error('Error loading specialties:', error);
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
      const response = await fetch('http://localhost:5001/api/staff/settings/my-settings', {
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
