"use client";

import { Shield, Lock, Key } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';

const IS: React.CSSProperties = { background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', opacity: 0.6, cursor: 'not-allowed' };

const REFERENCE_SETTINGS = {
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
};

const NumField = ({ label, value, unit }: { label: string; value: number; unit?: string }) => (
  <div className="flex items-center justify-between py-3 last:border-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
    <div className="flex items-center gap-2">
      <input type="number" value={value} disabled
        className="w-16 px-2 py-1 text-sm rounded outline-none text-right" style={IS} />
      {unit && <span className="text-xs w-16" style={{ color: 'var(--color-text-muted)' }}>{unit}</span>}
    </div>
  </div>
);

const ToggleRow = ({ label, desc, checked }: { label: string; desc: string; checked: boolean }) => (
  <div className="flex items-start justify-between gap-4 py-3 last:border-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
    <div>
      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{desc}</p>
    </div>
    <div className="relative inline-flex h-5 w-9 items-center rounded-full flex-shrink-0 opacity-60 cursor-not-allowed"
      style={{ background: checked ? 'var(--color-primary)' : 'var(--color-border-strong)' }}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </div>
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

export default function SecurityPage() {
  return (
    <DashboardPageWrapper title="Security Settings" subtitle="Password policy, login security, and authentication">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="p-4 rounded-xl text-sm"
          style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)', color: 'var(--color-warning-text)' }}>
          <p className="font-semibold mb-1">Read-only reference</p>
          <p>These settings reflect the current hardcoded security configuration. To change them, a code change and redeployment is required. Contact the system administrator.</p>
        </div>

        <Sec icon={<Lock size={15} />} title="Password Policy">
          <NumField label="Minimum password length"  value={REFERENCE_SETTINGS.minPasswordLength}  unit="characters" />
          <NumField label="Password expires after"   value={REFERENCE_SETTINGS.passwordExpireDays} unit="days"       />
          <ToggleRow label="Require uppercase letters"  desc="Passwords must contain at least one uppercase letter."   checked={REFERENCE_SETTINGS.requireUppercase}    />
          <ToggleRow label="Require numbers"            desc="Passwords must contain at least one numeric digit."      checked={REFERENCE_SETTINGS.requireNumbers}      />
          <ToggleRow label="Require special characters" desc="Passwords must include symbols like !, @, #."            checked={REFERENCE_SETTINGS.requireSpecialChars} />
        </Sec>

        <Sec icon={<Shield size={15} />} title="Login Security">
          <NumField label="Max failed login attempts"  value={REFERENCE_SETTINGS.maxLoginAttempts}    unit="attempts" />
          <NumField label="Account lockout duration"   value={REFERENCE_SETTINGS.lockoutDurationMin}  unit="minutes"  />
          <NumField label="Session timeout"            value={REFERENCE_SETTINGS.sessionTimeoutMin}   unit="minutes"  />
          <ToggleRow label="Log all login events" desc="Record successful and failed login attempts in the audit log." checked={REFERENCE_SETTINGS.logAllLogins} />
        </Sec>

        <Sec icon={<Key size={15} />} title="Authentication">
          <ToggleRow label="Enforce 2FA for all users"   desc="Require two-factor authentication for every login."   checked={REFERENCE_SETTINGS.enforce2FA}          />
          <ToggleRow label="Require 2FA for Admin role"  desc="Admins must always use two-factor authentication."    checked={REFERENCE_SETTINGS.require2FAForAdmin}  />
          <ToggleRow label="Allow Google OAuth login"    desc="Users can sign in with their Google account."          checked={REFERENCE_SETTINGS.allowGoogleOAuth}    />
        </Sec>

      </div>
    </DashboardPageWrapper>
  );
}
