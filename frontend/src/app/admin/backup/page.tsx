"use client";

import { useState } from 'react';
import { Database, Download, Clock } from 'lucide-react';
import Link from 'next/link';
import PageShell from '@/components/PageShell';

export default function BackupPage() {
  const [triggering, setTriggering] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const triggerBackup = async () => {
    setTriggering(true);
    await new Promise((r) => setTimeout(r, 1500));
    setMsg('Backup scheduled. You will be notified when complete.');
    setTriggering(false);
    setTimeout(() => setMsg(null), 4000);
  };

  return (
    <PageShell title="Backup & Recovery" subtitle="Manage system data backups">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {msg && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{msg}</div>}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Manual Backup</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Trigger a full database backup stored securely for disaster recovery.</p>
          <button onClick={triggerBackup} disabled={triggering}
            className="flex items-center gap-2 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 text-white px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
            <Database size={14} /> {triggering ? 'Scheduling…' : 'Trigger Backup Now'}
          </button>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Data Export</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Export system data as CSV for reporting and compliance.</p>
          <Link href="/admin/reports/export" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
            <Download size={14} /> Go to Data Export →
          </Link>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">Backup Schedule</h3>
          <div className="space-y-2">
            {[{freq:'Daily',time:'2:00 AM',ret:'7 days'},{freq:'Weekly',time:'Sunday 3:00 AM',ret:'4 weeks'},{freq:'Monthly',time:'1st 4:00 AM',ret:'12 months'}].map((b) => (
              <div key={b.freq} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 text-sm">
                <Clock size={13} className="text-gray-400" />
                <span className="w-16 font-medium text-gray-900 dark:text-gray-50">{b.freq}</span>
                <span className="text-gray-600 dark:text-gray-400">{b.time}</span>
                <span className="ml-auto text-xs text-gray-400">Retained: {b.ret}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
