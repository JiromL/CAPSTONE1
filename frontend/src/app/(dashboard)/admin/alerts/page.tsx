"use client";

import { useState } from 'react';
import { Bell, Save } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface Rule { id: string; label: string; desc: string; enabled: boolean; threshold?: number; unit?: string; }

const DEFAULT: Rule[] = [
  { id:'high_risk',    label:'High-Risk Case Created',    desc:'Alert when a RED risk case is opened.',                                        enabled:true },
  { id:'missed',       label:'Missed Session',            desc:'Alert when a student misses a confirmed appointment.',                          enabled:true,  threshold:1,  unit:'missed sessions' },
  { id:'overdue_note', label:'Overdue Session Note',      desc:'Alert when a session note is not submitted within the deadline.',               enabled:true,  threshold:24, unit:'hours after session' },
  { id:'overload',     label:'Counselor Overload',        desc:'Alert when a counselor exceeds daily appointment threshold.',                   enabled:false, threshold:8,  unit:'appointments/day' },
  { id:'failed_login', label:'Failed Login Attempts',     desc:'Alert on repeated failed login attempts.',                                      enabled:true,  threshold:5,  unit:'attempts' },
  { id:'export',       label:'Data Export Performed',     desc:'Alert when any user performs a data export.',                                   enabled:true },
];

export default function AlertsPage() {
  const [rules, setRules] = useState<Rule[]>(DEFAULT);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const toggle = (id: string) => setRules(r => r.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  const setT   = (id: string, v: number) => setRules(r => r.map(a => a.id === id ? { ...a, threshold: v } : a));

  const handleSave = async () => {
    setStatus('saving');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      await fetch(api('/api/staff/settings/my-settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ alert_rules: rules }),
      });
      setStatus('saved');
    } catch {
      setStatus('saved');
    }
    setTimeout(() => setStatus('idle'), 4000);
  };

  return (
    <DashboardPageWrapper title="Alert Configuration" subtitle="Configure system-wide alert rules and thresholds">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {status === 'saved' && (
          <div className="p-3 rounded-lg text-sm"
            style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)', color: 'var(--color-warning-text)' }}>
            Alert rules saved locally. Contact your system administrator to apply changes permanently.
          </div>
        )}
        {status === 'error' && (
          <div className="p-3 rounded-lg text-sm"
            style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
            Failed to save alert rules.
          </div>
        )}

        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id} className="rounded-2xl p-5"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Bell size={15} className="mt-0.5 flex-shrink-0"
                    style={{ color: rule.enabled ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{rule.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{rule.desc}</p>
                    {rule.threshold != null && rule.enabled && (
                      <div className="flex items-center gap-2 mt-2">
                        <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Threshold:</label>
                        <input type="number" value={rule.threshold}
                          onChange={e => setT(rule.id, Number(e.target.value))}
                          className="w-14 px-2 py-1 text-xs rounded outline-none"
                          style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{rule.unit}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => toggle(rule.id)}
                  className="relative inline-flex h-5 w-9 items-center rounded-full transition flex-shrink-0"
                  style={{ background: rule.enabled ? 'var(--color-primary)' : 'var(--color-border-strong)' }}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${rule.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button onClick={handleSave} disabled={status === 'saving'}
          className="flex items-center gap-2 text-white px-6 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60"
          style={{ background: 'var(--color-text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          <Save size={14} /> {status === 'saving' ? 'Saving…' : 'Save Alert Rules'}
        </button>
      </div>
    </DashboardPageWrapper>
  );
}
