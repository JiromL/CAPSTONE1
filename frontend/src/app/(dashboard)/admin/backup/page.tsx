"use client";

import { useState } from 'react';
import { Database, Download, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { apiFetch } from '@/utils/api';

export default function BackupPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function runBackup() {
    setStatus('loading');
    setMessage('');
    try {
      const res = await apiFetch('/api/auth/admin/backup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'Backup failed.');
      } else {
        setStatus('success');
        setMessage(data.message || 'Backup completed successfully.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error — could not reach the server.');
    }
  }

  return (
    <DashboardPageWrapper title="Backup & Recovery" subtitle="Manage system data backups">
      <div className="max-w-2xl space-y-6">

        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Manual Backup</h3>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Trigger a full database backup. On Render (cloud), the dump is written to the server log — download from the Render dashboard.
            For production, configure an S3 bucket to retain backups permanently.
          </p>

          {status === 'success' && (
            <div className="flex items-start gap-2 p-3 rounded-lg text-sm"
              style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)', color: 'var(--color-success-text)' }}>
              <CheckCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-start gap-2 p-3 rounded-lg text-sm"
              style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger-text)' }}>
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <button
            onClick={runBackup}
            disabled={status === 'loading'}
            className="flex items-center gap-2 text-white px-5 py-2 rounded-lg text-sm font-medium transition hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-primary)' }}>
            <Database size={14} />
            {status === 'loading' ? 'Running backup…' : 'Run Backup Now'}
          </button>
        </div>

        <div className="rounded-2xl p-6 space-y-3"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Data Export</h3>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Export system data as CSV for reporting and compliance.
          </p>
          <Link href="/admin/reports/export"
            className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
            style={{ color: 'var(--color-primary)' }}>
            <Download size={14} /> Go to Data Export →
          </Link>
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Backup Schedule</h3>
          <div className="space-y-2">
            {[
              { freq: 'Daily',   time: '2:00 AM',        ret: '7 days'    },
              { freq: 'Weekly',  time: 'Sunday 3:00 AM', ret: '4 weeks'   },
              { freq: 'Monthly', time: '1st 4:00 AM',    ret: '12 months' },
            ].map(b => (
              <div key={b.freq} className="flex items-center gap-3 py-2 text-sm last:border-0"
                style={{ borderBottom: '1px solid var(--color-border)' }}>
                <Clock size={13} style={{ color: 'var(--color-text-muted)' }} />
                <span className="w-16 font-medium" style={{ color: 'var(--color-text-primary)' }}>{b.freq}</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>{b.time}</span>
                <span className="ml-auto text-xs" style={{ color: 'var(--color-text-muted)' }}>Retained: {b.ret}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardPageWrapper>
  );
}
