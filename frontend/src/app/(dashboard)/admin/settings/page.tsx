"use client";

import { useState, useEffect } from 'react';
import { Save, Calendar, CheckCircle, Loader2, Link2Off } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

const ICS: React.CSSProperties = { background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };
const IC = 'input';

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <h3 className="text-sm font-semibold pb-2" style={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)' }}>{title}</h3>
      {children}
    </div>
  );
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm w-52 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}
function Tog({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <button onClick={() => onChange(!checked)}
        className="relative inline-flex h-5 w-9 items-center rounded-full transition"
        style={{ background: checked ? 'var(--color-primary)' : 'var(--color-border-strong)' }}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [calConnected, setCalConnected]     = useState<boolean | null>(null);
  const [calConnecting, setCalConnecting]   = useState(false);
  const [calDisconnecting, setCalDisconnecting] = useState(false);

  const tok = () => localStorage.getItem('token') || '';

  useEffect(() => {
    fetch(api('/api/calendar/system-status'), { headers: { Authorization: `Bearer ${tok()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setCalConnected(d.connected))
      .catch(() => {});
  }, []);

  const handleConnectCal = async () => {
    setCalConnecting(true);
    try {
      const res = await fetch(api('/api/calendar/system-authorize'), { headers: { Authorization: `Bearer ${tok()}` } });
      if (res.ok) { window.location.href = (await res.json()).auth_url; }
    } finally { setCalConnecting(false); }
  };

  const handleDisconnectCal = async () => {
    if (!confirm('Disconnect the CPS system Google Calendar? Meet links will no longer be auto-generated.')) return;
    setCalDisconnecting(true);
    try {
      const res = await fetch(api('/api/calendar/system-disconnect'), { method: 'POST', headers: { Authorization: `Bearer ${tok()}` } });
      if (res.ok) setCalConnected(false);
    } finally { setCalDisconnecting(false); }
  };
  const [s, setS] = useState({
    system_name: 'CPS Counseling System', support_email: 'cps@dlsu.edu.ph',
    allowed_domain: 'dlsu.edu.ph', session_timeout: '60',
    appt_duration: '50', max_appts_per_day: '10', data_retention_days: '365',
    allow_google_oauth: true, require_email_verification: true,
    enable_2fa: false, enable_audit_logging: true,
  });
  const set = (k: string, v: string | boolean) => setS(x => ({ ...x, [k]: v }));

  const handleSave = async () => {
    setStatus('saving');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(api('/api/staff/settings/my-settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(s),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <DashboardPageWrapper title="System Settings" subtitle="Configure global application settings">
      <div className="max-w-2xl mx-auto space-y-6">

        {status === 'saved' && (
          <div className="p-3 rounded-lg text-sm"
            style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)', color: 'var(--color-warning-text)' }}>
            Settings saved locally. Contact your system administrator to apply changes permanently.
          </div>
        )}
        {status === 'error' && (
          <div className="p-3 rounded-lg text-sm"
            style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
            Failed to save settings. Please try again.
          </div>
        )}

        <Sec title="General">
          <F label="System Name"><input value={s.system_name} onChange={e => set('system_name', e.target.value)} className={IC} style={ICS} /></F>
          <F label="Support Email"><input type="email" value={s.support_email} onChange={e => set('support_email', e.target.value)} className={IC} style={ICS} /></F>
          <F label="Allowed Email Domain"><input value={s.allowed_domain} onChange={e => set('allowed_domain', e.target.value)} className={IC} style={ICS} /></F>
        </Sec>

        <Sec title="Sessions & Appointments">
          <F label="Session Timeout (min)"><input type="number" value={s.session_timeout} onChange={e => set('session_timeout', e.target.value)} className={IC} style={ICS} /></F>
          <F label="Appointment Duration (min)"><input type="number" value={s.appt_duration} onChange={e => set('appt_duration', e.target.value)} className={IC} style={ICS} /></F>
          <F label="Max Appointments / Day"><input type="number" value={s.max_appts_per_day} onChange={e => set('max_appts_per_day', e.target.value)} className={IC} style={ICS} /></F>
        </Sec>

        <Sec title="Security & Auth">
          <Tog label="Allow Google OAuth"          checked={s.allow_google_oauth}          onChange={v => set('allow_google_oauth', v)} />
          <Tog label="Require Email Verification"  checked={s.require_email_verification}   onChange={v => set('require_email_verification', v)} />
          <Tog label="Enable Two-Factor Auth"      checked={s.enable_2fa}                   onChange={v => set('enable_2fa', v)} />
          <Tog label="Enable Audit Logging"        checked={s.enable_audit_logging}         onChange={v => set('enable_audit_logging', v)} />
        </Sec>

        <Sec title="Data">
          <F label="Data Retention (days)"><input type="number" value={s.data_retention_days} onChange={e => set('data_retention_days', e.target.value)} className={IC} style={ICS} /></F>
        </Sec>

        <Sec title="Integrations">
          <div className="space-y-1">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Google Calendar / Meet</p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Connect a CPS system Google account so all confirmed appointments automatically get a Google Meet link — no per-counselor setup needed.
            </p>
          </div>
          {calConnected === null ? (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <Loader2 size={12} className="animate-spin" /> Checking…
            </div>
          ) : calConnected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-success)' }}>
                <CheckCircle size={15} /> Connected — Meet links are auto-generated
              </div>
              <button onClick={handleDisconnectCal} disabled={calDisconnecting}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-bg)' }}>
                <Link2Off size={12} /> {calDisconnecting ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </div>
          ) : (
            <button onClick={handleConnectCal} disabled={calConnecting}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
              style={{ background: 'var(--color-primary)', color: 'white' }}>
              <Calendar size={14} />
              {calConnecting ? 'Redirecting to Google…' : 'Connect CPS Google Calendar'}
            </button>
          )}
        </Sec>

        <button onClick={handleSave} disabled={status === 'saving'}
          className="flex items-center gap-2 text-white px-6 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60"
          style={{ background: 'var(--color-text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          <Save size={14} /> {status === 'saving' ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </DashboardPageWrapper>
  );
}
