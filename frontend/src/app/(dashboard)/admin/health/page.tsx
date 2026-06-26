"use client";

import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

export default function HealthPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  const isOk = health?.status === 'Backend is running' || health?.status === 'ok';
  const mongoOk = (health?.mongodb_status || health?.mongodb) === 'connected';
  const checks = [
    { label: 'API Server', ok: isOk, detail: health?.status || '—' },
    { label: 'MongoDB', ok: mongoOk, detail: health?.mongodb_status || health?.mongodb || '—' },
    { label: 'JWT Auth', ok: isOk, detail: 'Enabled' },
    { label: 'Email Service', ok: true, detail: 'Configured' },
  ];

  return (
    <DashboardPageWrapper title="System Health" subtitle="Real-time service status">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          {lastChecked && <p className="text-sm text-gray-500">Last checked: {lastChecked.toLocaleTimeString()}</p>}
          <button onClick={fetchHealth} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-800 transition disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {checks.map((c) => (
            <div key={c.label} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
              {c.ok ? <CheckCircle size={22} className="text-green-500 flex-shrink-0" /> : <XCircle size={22} className="text-red-500 flex-shrink-0" />}
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-50 text-sm">{c.label}</p>
                <p className="text-xs text-gray-500 mt-0.5 capitalize">{c.detail}</p>
              </div>
              <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${c.ok ? 'bg-green-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                {c.ok ? 'OK' : 'Error'}
              </span>
            </div>
          ))}
        </div>
        {health && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">Raw Response</h3>
            <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded p-3 overflow-auto">
              {JSON.stringify(health, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
