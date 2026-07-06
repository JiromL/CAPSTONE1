"use client";

import { useState, useEffect } from 'react';
import { RefreshCw, Database, CheckCircle, XCircle } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

const COLLECTIONS = [
  { name: 'users', description: 'System user accounts and credentials' },
  { name: 'cases', description: 'Counseling cases and case data' },
  { name: 'appointments', description: 'Scheduled and completed appointments' },
  { name: 'session_notes', description: 'Counselor session notes' },
  { name: 'referrals', description: 'Case referrals and handoffs' },
  { name: 'audit_logs', description: 'System audit and activity logs' },
  { name: 'intake_forms', description: 'Client intake form submissions' },
  { name: 'notifications', description: 'In-app notifications' },
];

export default function DatabasePage() {
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

  const mongoOk = health?.mongodb === 'connected';

  return (
    <DashboardPageWrapper title="Database Management" subtitle="MongoDB connection status and collection overview">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          {lastChecked && <p className="text-sm text-gray-500">Last checked: {lastChecked.toLocaleTimeString()}</p>}
          <button onClick={fetchHealth} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-800 transition disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 p-5 flex items-center gap-4">
            {mongoOk
              ? <CheckCircle size={22} className="text-green-500 flex-shrink-0" />
              : <XCircle size={22} className="text-red-500 flex-shrink-0" />}
            <div>
              <p className="font-medium text-sm text-gray-900 dark:text-gray-50">Connection</p>
              <p className="text-xs text-gray-500 mt-0.5 capitalize">{health?.mongodb || (loading ? 'Checking…' : '—')}</p>
            </div>
            <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${mongoOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {mongoOk ? 'OK' : 'Error'}
            </span>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 p-5">
            <p className="text-xs text-gray-500">Database</p>
            <p className="font-semibold text-gray-900 dark:text-gray-50 mt-1">MongoDB</p>
            <p className="text-xs text-gray-400 mt-0.5">Atlas / Replica Set</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 p-5">
            <p className="text-xs text-gray-500">Collections</p>
            <p className="font-semibold text-gray-900 dark:text-gray-50 mt-1">{COLLECTIONS.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Active collections</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <Database size={14} className="text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Collections</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {COLLECTIONS.map((col) => (
              <div key={col.name} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-mono font-medium text-gray-900 dark:text-gray-50">{col.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{col.description}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${mongoOk ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {mongoOk ? 'Active' : 'Unknown'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {health && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">Health Response</h3>
            <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded p-3 overflow-auto">
              {JSON.stringify(health, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
