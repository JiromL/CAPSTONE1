"use client";

import { Database, Download, Clock } from 'lucide-react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';

export default function BackupPage() {
  return (
    <DashboardPageWrapper title="Backup & Recovery" subtitle="Manage system data backups">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Manual Backup</h3>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Trigger a full database backup stored securely for disaster recovery.
          </p>
          <div className="p-3 rounded-lg text-sm"
            style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)', color: 'var(--color-warning-text)' }}>
            Automated backup is not yet configured for this deployment. Contact your system administrator.
          </div>
          <button disabled
            className="flex items-center gap-2 text-white px-5 py-2 rounded-lg text-sm font-medium cursor-not-allowed opacity-60"
            style={{ background: 'var(--color-border-strong)' }}>
            <Database size={14} /> Backup (Not Yet Configured)
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
              { freq: 'Daily',   time: '2:00 AM',        ret: '7 days'   },
              { freq: 'Weekly',  time: 'Sunday 3:00 AM', ret: '4 weeks'  },
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
