'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface C2CReferral {
  _id: string;
  case_id: string;
  client_id: string;
  referring_counselor_id: string;
  target_counselor_id: string;
  specialty_required: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'accepted' | 'completed' | 'declined';
  notes?: string;
  created_at?: string;
}

const URGENCY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  accepted: 'bg-green-100 text-blue-800 dark:bg-blue-900/40 dark:text-green-300',
  completed: 'bg-green-100 text-blue-800 dark:bg-blue-900/40 dark:text-green-300',
  declined: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

export default function C2CReferralsPage() {
  const [referrals, setReferrals] = useState<C2CReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    fetch(api('/api/counselor-referrals'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setReferrals(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load referrals'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <DashboardPageWrapper
      title="C2C Referrals"
      subtitle="Counselor-to-counselor case handoffs and transfers"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {referrals.length} referral{referrals.length !== 1 ? 's' : ''} found
          </p>
          <button
            onClick={load}
            className="flex items-center gap-2 text-sm text-green-600 hover:text-blue-700 dark:text-green-400"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <ArrowRight className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No C2C referrals found</p>
            <p className="text-sm mt-1">Counselor-to-counselor transfers will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {['Case', 'Client', 'From', 'To', 'Specialty', 'Urgency', 'Status'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                {referrals.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {r.case_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{r.client_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {r.referring_counselor_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {r.target_counselor_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {r.specialty_required || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          URGENCY_COLORS[r.urgency] ?? URGENCY_COLORS.medium
                        }`}
                      >
                        {r.urgency}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          STATUS_COLORS[r.status] ?? STATUS_COLORS.pending
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
