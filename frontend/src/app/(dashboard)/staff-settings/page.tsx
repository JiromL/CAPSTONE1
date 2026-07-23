'use client';

import { useState, useEffect } from 'react';
import { Save, ArrowLeft, Clock, Bell, User, BookOpen, Languages, FileText, Tag, Calendar, Settings, Plus, X, CheckCircle, Loader2 } from 'lucide-react';
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
  user_id: string; name: string; role: string;
  work_preferences: WorkPreferences;
  notification_preferences: NotificationPreferences;
  specialty_areas: string[]; languages: string[];
  max_students_per_day: number; bio: string; tags: string[];
}
interface BookingRules {
  operating_days: number[]; operating_hours_start: string;
  operating_hours_end: string; slot_duration_minutes: number;
  min_days_ahead: number; max_days_ahead: number;
  blackout_dates: string[]; last_slot_start: string;
  max_daily_walkins: number; max_daily_appointments_per_counselor: number;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);

const IC = 'w-full px-3 py-2 text-sm rounded-lg outline-none transition';
const ICS: React.CSSProperties = { background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6 rounded-xl shadow-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
    {children}
  </div>
);

const SH = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>{children}</h3>
);
const SH_SM = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>{children}</h3>
);

export default function StaffSettingsPage() {
  const [settings, setSettings]   = useState<StaffSettings | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [specialtyOptions, setSpecialtyOptions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'work' | 'availability' | 'notifications' | 'profile' | 'booking-rules'>('work');
  const [userRole, setUserRole]   = useState('');

  const [bookingRules, setBookingRules] = useState<BookingRules>({
    operating_days: [1,2,3,4,5], operating_hours_start: '08:00',
    operating_hours_end: '17:00', slot_duration_minutes: 60,
    min_days_ahead: 1, max_days_ahead: 30, blackout_dates: [], last_slot_start: '16:00',
    max_daily_walkins: 20, max_daily_appointments_per_counselor: 8,
  });
  const [savingRules, setSavingRules] = useState(false);
  const [newBlackout, setNewBlackout] = useState('');

  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const [connectingCalendar, setConnectingCalendar] = useState(false);
  const [disconnectingCalendar, setDisconnectingCalendar] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadCalendarStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api('/api/calendar/status'), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setCalendarConnected((await res.json()).connected);
    } catch {}
  };

  const handleConnectCalendar = async () => {
    setConnectingCalendar(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api('/api/calendar/authorize'), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { window.location.href = (await res.json()).auth_url; }
      else showToast('Failed to get authorization URL', 'error');
    } catch { showToast('Error connecting to Google Calendar', 'error'); }
    finally { setConnectingCalendar(false); }
  };

  const handleDisconnectCalendar = async () => {
    if (!confirm('Disconnect Google Calendar? New appointments will no longer sync.')) return;
    setDisconnectingCalendar(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api('/api/calendar/disconnect'), { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { setCalendarConnected(false); showToast('Google Calendar disconnected', 'success'); }
    } catch { showToast('Error disconnecting', 'error'); }
    finally { setDisconnectingCalendar(false); }
  };

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) setUserRole(JSON.parse(user).role || '');
    loadSettings(); loadSpecialties(); loadBookingRules(); loadCalendarStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      if (!token || !user) { window.location.href = '/login'; return; }
      const userData = JSON.parse(user);
      if (!['COUNSELOR','PSYCHOLOGIST','IC','STAFF'].includes(userData.role)) { window.location.href = '/dashboard'; return; }
      const r = await fetch(api('/api/staff/settings/my-settings'), {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (r.ok) setSettings(await r.json());
      else showToast('Failed to load settings', 'error');
    } catch { showToast('Error loading settings', 'error'); }
    finally { setLoading(false); }
  };

  const loadSpecialties = async () => {
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api('/api/staff/settings/specialty-areas'), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setSpecialtyOptions((await r.json()).specialty_areas);
    } catch {}
  };

  const loadBookingRules = async () => {
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api('/api/staff/settings/booking-rules'), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setBookingRules(await r.json());
    } catch {}
  };

  const handleSaveBookingRules = async () => {
    setSavingRules(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api('/api/staff/settings/booking-rules'), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingRules),
      });
      if (r.ok) showToast('Booking rules saved', 'success');
      else { const e = await r.json(); showToast(e.error || 'Failed to save', 'error'); }
    } catch { showToast('Error saving rules', 'error'); }
    finally { setSavingRules(false); }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api('/api/staff/settings/my-settings'), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_preferences: settings.work_preferences,
          notification_preferences: settings.notification_preferences,
          specialty_areas: settings.specialty_areas,
          languages: settings.languages,
          max_students_per_day: settings.max_students_per_day,
          bio: settings.bio, tags: settings.tags,
        }),
      });
      if (r.ok) showToast('Settings saved successfully!', 'success');
      else showToast('Failed to save settings', 'error');
    } catch { showToast('Error saving settings', 'error'); }
    finally { setSaving(false); }
  };

  const setWP = (key: string, value: any) => settings && setSettings({ ...settings, work_preferences: { ...settings.work_preferences, [key]: value } });
  const setNP = (key: string, value: boolean) => settings && setSettings({ ...settings, notification_preferences: { ...settings.notification_preferences, [key]: value } });
  const toggleSpecialty = (s: string) => settings && setSettings({ ...settings, specialty_areas: settings.specialty_areas.includes(s) ? settings.specialty_areas.filter(x => x !== s) : [...settings.specialty_areas, s] });
  const toggleLanguage  = (l: string) => settings && setSettings({ ...settings, languages: settings.languages.includes(l) ? settings.languages.filter(x => x !== l) : [...settings.languages, l] });
  const toggleMethod    = (m: 'in-person' | 'google-meet' | 'zoom') => {
    if (!settings) return;
    let updated = settings.work_preferences.meeting_methods.includes(m) ? settings.work_preferences.meeting_methods.filter(x => x !== m) : [...settings.work_preferences.meeting_methods, m];
    if (updated.length === 0) updated = ['in-person'];
    setSettings({ ...settings, work_preferences: { ...settings.work_preferences, meeting_methods: updated } });
  };

  if (loading) {
    return (
      <DashboardPageWrapper title="Settings" subtitle="Configure your preferences">
        <div className="flex items-center justify-center py-12 gap-2" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      </DashboardPageWrapper>
    );
  }
  if (!settings) {
    return (
      <DashboardPageWrapper title="Settings" subtitle="Configure your preferences">
        <div className="text-center py-12">
          <p style={{ color: 'var(--color-danger)' }}>Failed to load settings</p>
        </div>
      </DashboardPageWrapper>
    );
  }

  const TABS = [
    { key: 'work',          icon: <Clock size={15} />,     label: 'Work Preferences' },
    { key: 'availability',  icon: <Calendar size={15} />,  label: 'Availability' },
    { key: 'notifications', icon: <Bell size={15} />,      label: 'Notifications' },
    { key: 'profile',       icon: <BookOpen size={15} />,  label: 'Profile' },
    ...(['ADMIN','STAFF'].includes(userRole) ? [{ key: 'booking-rules', icon: <Settings size={15} />, label: 'Booking Rules' }] : []),
  ] as const;

  return (
    <DashboardPageWrapper title="Settings" subtitle="Configure your work preferences and availability">
      {toast && (
        <div className="mb-4 p-4 rounded-lg text-sm font-medium"
          style={toast.type === 'success'
            ? { background: 'var(--color-success-surface)', color: 'var(--color-success)' }
            : { background: 'var(--color-danger-surface)',  color: 'var(--color-danger)' }}>
          {toast.message}
        </div>
      )}

      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8 p-6 rounded-xl shadow-card"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-primary-surface)' }}>
              <User size={28} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{settings.name}</h2>
              <p style={{ color: 'var(--color-text-secondary)' }}>{settings.role.replace(/_/g, ' ')}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto" style={{ borderBottom: '1px solid var(--color-border)' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key as any)}
              className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition"
              style={activeTab === t.key
                ? { color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)' }
                : { color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => { if (activeTab !== t.key) e.currentTarget.style.color = 'var(--color-text-primary)'; }}
              onMouseLeave={e => { if (activeTab !== t.key) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Work Preferences */}
        {activeTab === 'work' && (
          <div className="space-y-6">
            <Card>
              <SH>Session Settings</SH>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Default Session Duration (minutes)
                </label>
                <select value={settings.work_preferences.default_session_duration}
                  onChange={e => setWP('default_session_duration', parseInt(e.target.value))}
                  className={IC} style={ICS}>
                  {[30,45,50,60,90].map(v => <option key={v} value={v}>{v} minutes</option>)}
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                  Meeting Methods (Select all that apply)
                </label>
                <div className="space-y-2">
                  {(['in-person', 'google-meet', 'zoom'] as const).map(m => (
                    <label key={m} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded"
                        checked={settings.work_preferences.meeting_methods.includes(m)}
                        onChange={() => toggleMethod(m)}
                        style={{ accentColor: 'var(--color-primary)' }} />
                      <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {m === 'google-meet' ? 'Google Meet' : m === 'zoom' ? 'Zoom' : 'In-Person'}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  Selected methods will be used for automatic appointment assignment
                </p>
              </div>
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded"
                    checked={settings.work_preferences.accepts_walk_ins}
                    onChange={e => setWP('accepts_walk_ins', e.target.checked)}
                    style={{ accentColor: 'var(--color-primary)' }} />
                  <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Accept walk-in appointments</span>
                </label>
              </div>
            </Card>
            <Card>
              <SH>Capacity</SH>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Max Students Per Day (0 = unlimited)
              </label>
              <input type="number" min="0" value={settings.max_students_per_day}
                onChange={e => setSettings({ ...settings, max_students_per_day: parseInt(e.target.value) || 0 })}
                className={IC} style={ICS} />
            </Card>
          </div>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <Card>
            <SH>Email Notifications</SH>
            <div className="space-y-2">
              {[
                { key: 'email_on_new_request',      label: 'New Appointment Requests',   desc: 'Get notified when a student requests an appointment' },
                { key: 'email_on_appointment_change',label: 'Appointment Changes',        desc: 'Get notified when an appointment is rescheduled' },
                { key: 'email_on_cancellation',     label: 'Cancellations',              desc: 'Get notified when an appointment is cancelled' },
                { key: 'sms_reminders',             label: 'SMS Reminders',              desc: 'Receive text reminders for upcoming appointments (requires phone number)' },
              ].map(item => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg transition"
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <input type="checkbox" className="w-4 h-4 rounded"
                    checked={settings.notification_preferences[item.key as keyof NotificationPreferences]}
                    onChange={e => setNP(item.key, e.target.checked)}
                    style={{ accentColor: 'var(--color-primary)' }} />
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{item.label}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </Card>
        )}

        {/* Availability */}
        {activeTab === 'availability' && (
          <div className="space-y-6">
            <Card>
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <Calendar size={18} style={{ color: 'var(--color-primary)' }} /> Set Your Availability
              </h3>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                Define your working hours and available meeting times for each day of the week.
              </p>
              <div className="rounded-lg p-4 mb-6"
                style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary)' }}>
                <p className="text-sm" style={{ color: 'var(--color-primary)' }}>
                  📌 <strong>Note:</strong> Set your weekly availability to let students know when you can meet for appointments. This helps with automatic scheduling and reduces conflicts.
                </p>
              </div>
              <Link href="/availability">
                <button className="w-full px-6 py-3 text-white rounded-lg font-medium transition hover:opacity-90"
                  style={{ background: 'var(--color-primary)' }}>
                  Configure Weekly Availability
                </button>
              </Link>
              <p className="text-xs mt-4 text-center" style={{ color: 'var(--color-text-muted)' }}>
                You can also manage specific availability slots from this settings page in the future.
              </p>
            </Card>
          </div>
        )}

        {/* Profile */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Google Calendar */}
            <Card>
              <h3 className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <Calendar size={15} style={{ color: 'var(--color-success)' }} /> Google Calendar
              </h3>
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                Connect your Google account so confirmed appointments automatically appear in your calendar and students receive calendar invites.
              </p>
              {calendarConnected === null ? (
                <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
              ) : calendarConnected ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-success)' }}>
                    <CheckCircle size={16} />
                    <span className="font-medium">Connected</span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>· Appointments sync automatically</span>
                  </div>
                  <button onClick={handleDisconnectCalendar} disabled={disconnectingCalendar}
                    className="text-xs underline transition"
                    style={{ color: 'var(--color-text-muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-danger)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                    {disconnectingCalendar ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                </div>
              ) : (
                <button onClick={handleConnectCalendar} disabled={connectingCalendar}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {connectingCalendar ? 'Redirecting…' : 'Connect Google Calendar'}
                </button>
              )}
            </Card>

            {/* Bio */}
            <Card>
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <FileText size={18} style={{ color: 'var(--color-primary)' }} /> Professional Bio
              </h3>
              <textarea value={settings.bio}
                onChange={e => setSettings({ ...settings, bio: e.target.value.substring(0, 500) })}
                maxLength={500} rows={4}
                placeholder="Brief bio visible to students when booking appointments…"
                style={{ ...ICS, width: '100%', padding: '0.5rem 1rem', borderRadius: '0.5rem', outline: 'none', resize: 'none', fontSize: '0.875rem' }} />
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{settings.bio.length}/500 characters</p>
            </Card>

            {/* Specialty Areas */}
            <Card>
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <BookOpen size={18} style={{ color: 'var(--color-primary)' }} /> Specialty Areas
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>Select areas where you have expertise</p>
              <div className="grid grid-cols-2 gap-3">
                {specialtyOptions.map(s => {
                  const sel = settings.specialty_areas.includes(s);
                  return (
                    <button key={s} onClick={() => toggleSpecialty(s)}
                      className="p-3 rounded-lg text-left text-sm font-medium transition"
                      style={sel
                        ? { border: '2px solid var(--color-primary)', background: 'var(--color-primary-surface)', color: 'var(--color-primary)' }
                        : { border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Languages */}
            <Card>
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <Languages size={18} style={{ color: 'var(--color-primary)' }} /> Languages
              </h3>
              <div className="space-y-2">
                {['English','Spanish','French','Mandarin','Vietnamese','ASL'].map(lang => (
                  <label key={lang} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded"
                      checked={settings.languages.includes(lang)}
                      onChange={() => toggleLanguage(lang)}
                      style={{ accentColor: 'var(--color-primary)' }} />
                    <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{lang}</span>
                  </label>
                ))}
              </div>
            </Card>

            {/* Tags */}
            <Card>
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <Tag size={18} style={{ color: 'var(--color-primary)' }} /> Tags
              </h3>
              <input type="text" value={settings.tags.join(', ')}
                onChange={e => setSettings({ ...settings, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                placeholder="Enter tags separated by commas (e.g., LGBTQ+, First-Gen, Athletes)"
                className={IC} style={ICS} />
            </Card>
          </div>
        )}

        {/* Booking Rules */}
        {activeTab === 'booking-rules' && (
          <div className="space-y-6">
            <Card>
              <SH_SM>Operating Days</SH_SM>
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Which days of the week can students book appointments?</p>
              <div className="flex gap-2 flex-wrap">
                {DAY_LABELS.map((label, i) => {
                  const active = bookingRules.operating_days.includes(i);
                  return (
                    <button key={i} type="button"
                      onClick={() => {
                        const days = active ? bookingRules.operating_days.filter(d => d !== i) : [...bookingRules.operating_days, i].sort();
                        if (days.length > 0) setBookingRules({ ...bookingRules, operating_days: days });
                      }}
                      className="w-12 h-12 rounded-lg text-sm font-medium transition"
                      style={active
                        ? { background: 'var(--color-primary)', border: '2px solid var(--color-primary)', color: 'white' }
                        : { background: 'var(--color-surface)', border: '2px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card>
              <SH_SM>Operating Hours</SH_SM>
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>The window students can see and select time slots within.</p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Opens at',           key: 'operating_hours_start' as const },
                  { label: 'Last slot starts at', key: 'last_slot_start' as const },
                  { label: 'Closes at',           key: 'operating_hours_end' as const },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>
                    <select value={bookingRules[key]} onChange={e => setBookingRules({ ...bookingRules, [key]: e.target.value })}
                      className={IC} style={ICS}>
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SH_SM>Booking Window</SH_SM>
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>How far in advance can students book?</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Min days ahead</label>
                  <input type="number" min="0" max="30" value={bookingRules.min_days_ahead}
                    onChange={e => setBookingRules({ ...bookingRules, min_days_ahead: Number(e.target.value) })}
                    className={IC} style={ICS} />
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>e.g. 1 = tomorrow earliest</p>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Max days ahead</label>
                  <input type="number" min="1" max="365" value={bookingRules.max_days_ahead}
                    onChange={e => setBookingRules({ ...bookingRules, max_days_ahead: Number(e.target.value) })}
                    className={IC} style={ICS} />
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>e.g. 30 = up to a month out</p>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Slot duration (min)</label>
                  <select value={bookingRules.slot_duration_minutes}
                    onChange={e => setBookingRules({ ...bookingRules, slot_duration_minutes: Number(e.target.value) })}
                    className={IC} style={ICS}>
                    {[30,45,50,60,90].map(v => <option key={v} value={v}>{v} min</option>)}
                  </select>
                </div>
              </div>
            </Card>

            <Card>
              <SH_SM>Blackout Dates</SH_SM>
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Dates when CPS is closed — students cannot book these days (holidays, school breaks, etc.)</p>
              <div className="flex gap-2 mb-3">
                <input type="date" value={newBlackout} onChange={e => setNewBlackout(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg outline-none" style={ICS} />
                <button type="button"
                  onClick={() => {
                    if (newBlackout && !bookingRules.blackout_dates.includes(newBlackout)) {
                      setBookingRules({ ...bookingRules, blackout_dates: [...bookingRules.blackout_dates, newBlackout].sort() });
                      setNewBlackout('');
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-2 text-white text-sm rounded-lg transition hover:opacity-90"
                  style={{ background: 'var(--color-primary)' }}>
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {bookingRules.blackout_dates.length === 0 && (
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No blackout dates set.</p>
                )}
                {bookingRules.blackout_dates.map(d => (
                  <span key={d} className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full"
                    style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
                    {new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })}
                    <button onClick={() => setBookingRules({ ...bookingRules, blackout_dates: bookingRules.blackout_dates.filter(x => x !== d) })}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </Card>

            <button onClick={handleSaveBookingRules} disabled={savingRules}
              className="flex items-center gap-2 px-6 py-2.5 text-white rounded-lg font-medium text-sm disabled:opacity-50 transition hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}>
              <Save size={15} />
              {savingRules ? 'Saving…' : 'Save Booking Rules'}
            </button>
          </div>
        )}

        {/* Save Settings bar */}
        <div className="mt-8 flex gap-3 sticky bottom-0 p-4 rounded-xl"
          style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
          <button onClick={handleSaveSettings} disabled={saving}
            className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--color-primary)' }}>
            <Save size={15} /> {saving ? 'Saving…' : 'Save Settings'}
          </button>
          <Link href="/dashboard">
            <button className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <ArrowLeft size={15} /> Cancel
            </button>
          </Link>
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
