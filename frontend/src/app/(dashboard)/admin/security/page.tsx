"use client";

import { useState } from 'react';
import { Shield, Lock, Key, Save } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';

const IS: React.CSSProperties = { background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

export default function SecurityPage() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    minPasswordLength: 8, requireUppercase: true, requireNumbers: true,
    requireSpecialChars: true, passwordExpireDays: 90, maxLoginAttempts: 5,
    lockoutDurationMin: 15, sessionTimeoutMin: 60, enforce2FA: false,
    require2FAForAdmin: true, allowGoogleOAuth: true, logAllLogins: true,
  });

  const toggle = (key: keyof typeof settings) => setSettings(s => ({ ...s, [key]: !s[key] }));
  const setNum = (key: keyof typeof settings, v: number) => setSettings(s => ({ ...s, [key]: v }));
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const NumField = ({ label, k, unit }: { label: string; k: keyof typeof settings; unit?: string }) => (
    <div className="flex items-center justify-between py-3 last:border-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <div className="flex items-center gap-2">
        <input type="number" value={settings[k] as number}
          onChange={e => setNum(k, Number(e.target.value))}
          className="w-16 px-2 py-1 text-sm rounded outline-none text-right" style={IS} />
        {unit && <span className="text-xs w-16" style={{ color: 'var(--color-text-muted)' }}>{unit}</span>}
      </div>
    </div>
  );

  const Toggle = ({ label, desc, k }: { label: string; desc: string; k: keyof typeof settings }) => (
    <div className="flex items-start justify-between gap-4 py-3 last:border-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{desc}</p>
      </div>
      <button onClick={() => toggle(k)}
        className="relative inline-flex h-5 w-9 items-center rounded-full transition flex-shrink-0"
        style={{ background: settings[k] ? 'var(--color-primary)' : 'var(--color-border-strong)' }}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${settings[k] ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );

  const Sec = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <div className="rounded-2xl p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: 'var(--color-text-secondary)' }}>{icon}</span>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <DashboardPageWrapper title="Security Settings" subtitle="Password policy, login security, and authentication">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {saved && (
          <div className="p-3 rounded-lg text-sm"
            style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)', color: 'var(--color-success)' }}>
            Security settings saved.
          </div>
        )}

        <Sec icon={<Lock size={15} />} title="Password Policy">
          <NumField label="Minimum password length"  k="minPasswordLength"  unit="characters" />
          <NumField label="Password expires after"   k="passwordExpireDays" unit="days"       />
          <Toggle label="Require uppercase letters"  desc="Passwords must contain at least one uppercase letter."   k="requireUppercase"    />
          <Toggle label="Require numbers"            desc="Passwords must contain at least one numeric digit."      k="requireNumbers"      />
          <Toggle label="Require special characters" desc="Passwords must include symbols like !, @, #."            k="requireSpecialChars" />
        </Sec>

        <Sec icon={<Shield size={15} />} title="Login Security">
          <NumField label="Max failed login attempts"  k="maxLoginAttempts"    unit="attempts" />
          <NumField label="Account lockout duration"   k="lockoutDurationMin"  unit="minutes"  />
          <NumField label="Session timeout"            k="sessionTimeoutMin"   unit="minutes"  />
          <Toggle label="Log all login events" desc="Record successful and failed login attempts in the audit log." k="logAllLogins" />
        </Sec>

        <Sec icon={<Key size={15} />} title="Authentication">
          <Toggle label="Enforce 2FA for all users"   desc="Require two-factor authentication for every login."   k="enforce2FA"          />
          <Toggle label="Require 2FA for Admin role"  desc="Admins must always use two-factor authentication."    k="require2FAForAdmin"  />
          <Toggle label="Allow Google OAuth login"    desc="Users can sign in with their Google account."          k="allowGoogleOAuth"    />
        </Sec>

        <button onClick={save}
          className="flex items-center gap-2 text-white px-6 py-2 rounded-lg text-sm font-medium transition"
          style={{ background: 'var(--color-text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          <Save size={14} /> Save Security Settings
        </button>
      </div>
    </DashboardPageWrapper>
  );
}
