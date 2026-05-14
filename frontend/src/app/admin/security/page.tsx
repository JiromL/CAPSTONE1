"use client";

import { useState } from 'react';
import { Shield, Lock, Key, Save } from 'lucide-react';
import PageShell from '@/components/PageShell';

export default function SecurityPage() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    minPasswordLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    passwordExpireDays: 90,
    maxLoginAttempts: 5,
    lockoutDurationMin: 15,
    sessionTimeoutMin: 60,
    enforce2FA: false,
    require2FAForAdmin: true,
    allowGoogleOAuth: true,
    logAllLogins: true,
  });

  const toggle = (key: keyof typeof settings) =>
    setSettings((s) => ({ ...s, [key]: !s[key] }));
  const setNum = (key: keyof typeof settings, v: number) =>
    setSettings((s) => ({ ...s, [key]: v }));

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const NumField = ({ label, k, unit }: { label: string; k: keyof typeof settings; unit?: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <div className="flex items-center gap-2">
        <input type="number" value={settings[k] as number}
          onChange={(e) => setNum(k, Number(e.target.value))}
          className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-right" />
        {unit && <span className="text-xs text-gray-400 w-16">{unit}</span>}
      </div>
    </div>
  );

  const Toggle = ({ label, desc, k }: { label: string; desc: string; k: keyof typeof settings }) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
      <button onClick={() => toggle(k)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition flex-shrink-0 ${settings[k] ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${settings[k] ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );

  return (
    <PageShell title="Security Settings" subtitle="Password policy, login security, and authentication">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {saved && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">Security settings saved.</div>}

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={15} className="text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Password Policy</h3>
          </div>
          <NumField label="Minimum password length" k="minPasswordLength" unit="characters" />
          <NumField label="Password expires after" k="passwordExpireDays" unit="days" />
          <Toggle label="Require uppercase letters" desc="Passwords must contain at least one uppercase letter." k="requireUppercase" />
          <Toggle label="Require numbers" desc="Passwords must contain at least one numeric digit." k="requireNumbers" />
          <Toggle label="Require special characters" desc="Passwords must include symbols like !, @, #." k="requireSpecialChars" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={15} className="text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Login Security</h3>
          </div>
          <NumField label="Max failed login attempts" k="maxLoginAttempts" unit="attempts" />
          <NumField label="Account lockout duration" k="lockoutDurationMin" unit="minutes" />
          <NumField label="Session timeout" k="sessionTimeoutMin" unit="minutes" />
          <Toggle label="Log all login events" desc="Record successful and failed login attempts in the audit log." k="logAllLogins" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key size={15} className="text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Authentication</h3>
          </div>
          <Toggle label="Enforce 2FA for all users" desc="Require two-factor authentication for every login." k="enforce2FA" />
          <Toggle label="Require 2FA for Admin role" desc="Admins must always use two-factor authentication." k="require2FAForAdmin" />
          <Toggle label="Allow Google OAuth login" desc="Users can sign in with their Google account." k="allowGoogleOAuth" />
        </div>

        <button onClick={save}
          className="flex items-center gap-2 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-lg text-sm font-medium transition">
          <Save size={14} /> Save Security Settings
        </button>
      </div>
    </PageShell>
  );
}
