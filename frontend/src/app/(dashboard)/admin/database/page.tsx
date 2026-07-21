"use client";

import { useState, useEffect } from 'react';
import { RefreshCw, Database, CheckCircle, XCircle } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

const COLLECTIONS = [
  { name: 'users',         description: 'System user accounts and credentials' },
  { name: 'cases',         description: 'Counseling cases and case data' },
  { name: 'appointments',  description: 'Scheduled and completed appointments' },
  { name: 'session_notes', description: 'Counselor session notes' },
  { name: 'referrals',     description: 'Case referrals and handoffs' },
  { name: 'audit_logs',    description: 'System audit and activity logs' },
  { name: 'intake_forms',  description: 'Client intake form submissions' },
  { name: 'notifications', description: 'In-app notifications' },
];

export default function DatabasePage() {
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

  const mongoOk = health?.mongodb === 'connected';

  const statusBadge = (ok: boolean) => ({
    background: ok ? 'var(--color-success-surface)' : 'var(--color-danger-surface)',
    color: ok ? 'var(--color-success)' : 'var(--color-danger)',
  } as React.CSSProperties);

  return (
    <DashboardPageWrapper title="Database Management" subtitle="MongoDB connection status and collection overview">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            {mongoOk
              ? <CheckCircle size={22} className="flex-shrink-0" style={{ color: 'var(--color-success)' }} />
              : <XCircle size={22} className="flex-shrink-0" style={{ color: 'var(--color-danger)' }} />}
            <div>
              <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>Connection</p>
              <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--color-text-secondary)' }}>
                {(health?.mongodb as string) || (loading ? 'Checking…' : '—')}
              </p>
            </div>
            <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium" style={statusBadge(mongoOk)}>
              {mongoOk ? 'OK' : 'Error'}
            </span>
          </div>

          <div className="rounded-2xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Database</p>
            <p className="font-semibold mt-1" style={{ color: 'var(--color-text-primary)' }}>MongoDB</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Atlas / Replica Set</p>
          </div>

          <div className="rounded-2xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Collections</p>
            <p className="font-semibold mt-1" style={{ color: 'var(--color-text-primary)' }}>{COLLECTIONS.length}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Active collections</p>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <Database size={14} style={{ color: 'var(--color-text-secondary)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Collections</h3>
          </div>
          <div>
            {COLLECTIONS.map(col => (
              <div key={col.name} className="flex items-center justify-between px-6 py-3"
                style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <p className="text-sm font-mono font-medium" style={{ color: 'var(--color-text-primary)' }}>{col.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{col.description}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={statusBadge(mongoOk)}>
                  {mongoOk ? 'Active' : 'Unknown'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {health && (
          <div className="rounded-2xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Health Response</h3>
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
