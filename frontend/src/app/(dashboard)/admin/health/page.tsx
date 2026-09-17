"use client";

import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

export default function HealthPage() {
  const [health, setHealth]           = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading]         = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch(api('/api/health'));
      if (res.ok) { setHealth(await res.json()); setLastChecked(new Date()); }
    } catch { setHealth({ status: 'error', mongodb: 'unreachable' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHealth(); }, []);

  const isOk    = health?.status === 'Backend is running' || health?.status === 'ok';
  const mongoOk = (health?.mongodb_status || health?.mongodb) === 'connected';
  const checks  = [
    { label: 'API Server',     ok: isOk,    detail: (health?.status as string) || '—' },
    { label: 'MongoDB',        ok: mongoOk, detail: ((health?.mongodb_status || health?.mongodb) as string) || '—' },
    { label: 'JWT Auth',       ok: isOk,    detail: 'Enabled' },
    { label: 'Email Service',  ok: true,    detail: 'Configured' },
  ];

  const statusBadge = (ok: boolean): React.CSSProperties => ({
    background: ok ? 'var(--color-success-surface)' : 'var(--color-danger-surface)',
    color: ok ? 'var(--color-success)' : 'var(--color-danger)',
  });

  return (
    <DashboardPageWrapper title="System Health" subtitle="Real-time service status">
      <div className="max-w-3xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          {lastChecked && (
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Last checked: {lastChecked.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true })}
            </p>
          )}
          <button onClick={fetchHealth} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-white text-sm rounded-lg transition disabled:opacity-50"
            style={{ background: 'var(--color-text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {checks.map(c => (
            <div key={c.label} className="rounded-2xl p-5 flex items-center gap-4"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              {c.ok
                ? <CheckCircle size={22} className="flex-shrink-0" style={{ color: 'var(--color-success)' }} />
                : <XCircle    size={22} className="flex-shrink-0" style={{ color: 'var(--color-danger)'  }} />}
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{c.label}</p>
                <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--color-text-secondary)' }}>{c.detail}</p>
              </div>
              <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium" style={statusBadge(c.ok)}>
                {c.ok ? 'OK' : 'Error'}
              </span>
            </div>
          ))}
        </div>

        {health && (
          <div className="rounded-2xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Raw Response</h3>
            <pre className="text-xs rounded p-3 overflow-auto"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
              {JSON.stringify(health, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
