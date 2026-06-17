"use client";

import { Database, Download, Clock } from 'lucide-react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';

export default function BackupPage() {
  return (
    <DashboardPageWrapper title="Backup & Recovery" subtitle="Manage system data backups">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Manual Backup</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Trigger a full database backup stored securely for disaster recovery.</p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            Automated backup is not yet configured for this deployment. Contact your system administrator.
          </div>
          <button
            disabled
            className="flex items-center gap-2 bg-gray-400 text-white px-5 py-2 rounded-lg text-sm font-medium cursor-not-allowed opacity-60"
          >
            <Database size={14} /> Backup (Not Yet Configured)
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
    </DashboardPageWrapper>
  );
}
