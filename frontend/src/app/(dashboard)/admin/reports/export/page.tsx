"use client";

import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

const MODULES = [
  { id: 'new-intakes', label: 'New Client Intakes', desc: 'Intake form submissions and new client records' },
  { id: 'check-ins', label: 'Non-Counseling Check-Ins', desc: 'Walk-in check-in records' },
  { id: 'counseling-cases', label: 'Counseling Cases', desc: 'Active and closed counseling case records' },
];

export default function ExportDataPage() {
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(defaultMonth);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const exportModule = async (moduleId: string, moduleLabel: string) => {
    setLoading(moduleId);
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api(`/api/client-tracking/export/${moduleId}?month=${month}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Export failed.');
        return;
      }
      const data = await res.json();
      const records: any[] = Array.isArray(data) ? data : data.data || [];

      if (records.length === 0) {
        setSuccess(`No records found for ${moduleLabel} in ${month}.`);
        return;
      }

      const keys = Array.from(new Set(records.flatMap(Object.keys)));
      const csvRows = [
        keys.join(','),
        ...records.map((r) =>
          keys.map((k) => {
            const v = r[k] ?? '';
            const str = typeof v === 'object' ? JSON.stringify(v) : String(v);
            return `"${str.replace(/"/g, '""')}"`;
          }).join(',')
        ),
      ];
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${moduleId}-${month}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(`Exported ${records.length} records from ${moduleLabel}.`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(null);
      setTimeout(() => { setSuccess(null); setError(null); }, 4000);
    }
  };

  return (
    <DashboardPageWrapper title="Data Export" subtitle="Download system data as CSV for reporting and compliance">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        {success && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>}

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Export Month</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50" />
          <p className="text-xs text-gray-400 mt-1.5">All exports are filtered to the selected month.</p>
        </div>

        <div className="space-y-3">
          {MODULES.map((mod) => (
            <div key={mod.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <FileText size={15} className="mt-0.5 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{mod.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{mod.desc}</p>
                </div>
              </div>
              <button onClick={() => exportModule(mod.id, mod.label)} disabled={loading === mod.id}
                className="flex items-center gap-2 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 flex-shrink-0">
                <Download size={13} /> {loading === mod.id ? 'Exporting…' : 'Export CSV'}
              </button>
            </div>
          ))}
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Data Privacy Notice</p>
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
            Exported files contain personally identifiable information. Handle in accordance with the Data Privacy Act of 2012 (RA 10173).
            All export actions are recorded in the audit log.
          </p>
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
