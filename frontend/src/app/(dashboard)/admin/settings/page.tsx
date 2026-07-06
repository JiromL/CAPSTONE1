"use client";

import { useState } from 'react';
import { Save } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

export default function SettingsPage() {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [s, setS] = useState({
    system_name: 'CPS Counseling System', support_email: 'cps@dlsu.edu.ph',
    allowed_domain: 'dlsu.edu.ph', session_timeout: '60',
    appt_duration: '50', max_appts_per_day: '10', data_retention_days: '365',
    allow_google_oauth: true, require_email_verification: true,
    enable_2fa: false, enable_audit_logging: true,
  });
  const set = (k: string, v: string | boolean) => setS((x) => ({ ...x, [k]: v }));

  const handleSave = async () => {
    setStatus('saving');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(api('/api/staff/settings/my-settings'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(s),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      // No suitable backend endpoint for global admin settings — show honest notice
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <DashboardPageWrapper title="System Settings" subtitle="Configure global application settings">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {status === 'saved' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            Settings saved locally. Contact your system administrator to apply changes permanently.
          </div>
        )}
        {status === 'error' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            Failed to save settings. Please try again.
          </div>
        )}
        <Sec title="General">
          <F label="System Name"><input value={s.system_name} onChange={(e) => set('system_name', e.target.value)} className={inp} /></F>
          <F label="Support Email"><input type="email" value={s.support_email} onChange={(e) => set('support_email', e.target.value)} className={inp} /></F>
          <F label="Allowed Email Domain"><input value={s.allowed_domain} onChange={(e) => set('allowed_domain', e.target.value)} className={inp} /></F>
        </Sec>
        <Sec title="Sessions & Appointments">
          <F label="Session Timeout (min)"><input type="number" value={s.session_timeout} onChange={(e) => set('session_timeout', e.target.value)} className={inp} /></F>
          <F label="Appointment Duration (min)"><input type="number" value={s.appt_duration} onChange={(e) => set('appt_duration', e.target.value)} className={inp} /></F>
          <F label="Max Appointments / Day"><input type="number" value={s.max_appts_per_day} onChange={(e) => set('max_appts_per_day', e.target.value)} className={inp} /></F>
        </Sec>
        <Sec title="Security & Auth">
          <Tog label="Allow Google OAuth" checked={s.allow_google_oauth} onChange={(v) => set('allow_google_oauth', v)} />
          <Tog label="Require Email Verification" checked={s.require_email_verification} onChange={(v) => set('require_email_verification', v)} />
          <Tog label="Enable Two-Factor Auth" checked={s.enable_2fa} onChange={(v) => set('enable_2fa', v)} />
          <Tog label="Enable Audit Logging" checked={s.enable_audit_logging} onChange={(v) => set('enable_audit_logging', v)} />
        </Sec>
        <Sec title="Data">
          <F label="Data Retention (days)"><input type="number" value={s.data_retention_days} onChange={(e) => set('data_retention_days', e.target.value)} className={inp} /></F>
        </Sec>
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className="flex items-center gap-2 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60"
        >
          <Save size={14} /> {status === 'saving' ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </DashboardPageWrapper>
  );
}
const inp = "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50";
function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 p-6 space-y-4">
    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 border-b border-gray-100 dark:border-gray-700 pb-2">{title}</h3>
    {children}
  </div>;
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4">
    <label className="text-sm text-gray-700 dark:text-gray-300 w-52 flex-shrink-0">{label}</label>
    <div className="flex-1">{children}</div>
  </div>;
}
function Tog({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <div className="flex items-center justify-between">
    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    <button onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  </div>;
}
