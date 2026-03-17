'use client';

import React, { useState, useEffect } from 'react';
import { Plus, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

type Referral = {
  id: string;
  _id?: string;
  service: string;
  provider: string;
  date: string;
  created_at?: string;
  status: 'completed' | 'pending' | 'cancelled' | string;
  notes?: string;
  description?: string;
};

const referralServices = [
  'Psychiatric Evaluation',
  'Group Therapy',
  'Substance Use Treatment',
  'Crisis Intervention',
  'Disability Support',
];

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReferrals = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found');
          setLoading(false);
          return;
        }

        // Try to fetch from API endpoint
        const response = await fetch(api('/api/referrals'), {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);

        if (response && response.ok) {
          const data = await response.json();
          setReferrals(data.referrals || []);
        } else {
          setReferrals([]);
          setError('Referrals API not yet implemented. Please set up /api/referrals endpoint.');
        }
      } catch (err) {
        console.error('Error loading referrals:', err);
        setReferrals([]);
      } finally {
        setLoading(false);
      }
    };

    loadReferrals();
  }, []);

  if (loading) {
    return (
      <DashboardPageWrapper title="Referrals" subtitle="View and manage your service referrals">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Referrals" subtitle="View and manage your service referrals">
      <div className="space-y-6">
        {error && (
          <div className="border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 rounded p-4 flex gap-3">
            <AlertCircle className="text-amber-600 dark:text-amber-400 flex-shrink-0" size={20} />
            <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-8 mb-8 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">Request a New Referral</h2>
            <button className="flex items-center gap-2 bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition">
              <Plus size={16} /> New Referral
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {referralServices.map((service) => (
              <button
                key={service}
                className="bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-900 dark:text-gray-50 py-2 px-4 rounded-lg font-medium transition text-sm"
              >
                + {service}
              </button>
            ))}
          </div>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-6">Your Referrals</h2>
          {referrals.length > 0 ? (
            <div className="space-y-4">
              {referrals.map((referral) => (
                <ReferralCard key={referral._id || referral.id} referral={referral} />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-12 text-center border border-gray-200 dark:border-gray-700">
              <FileText className="mx-auto mb-3 text-gray-400" size={32} />
              <p className="text-gray-600 dark:text-gray-400">No referrals yet.</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Your assigned counselor may create referrals for specialized services as needed.</p>
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-gray-900 rounded-lg shadow p-8 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-4">About Referrals</h3>
          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>Our counselors may recommend referrals to specialized services outside our center when additional support would be beneficial.</p>
            <p>These services may include:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Mental health specialists and psychiatrists</li>
              <li>Group therapy programs</li>
              <li>Crisis intervention services</li>
              <li>Substance abuse treatment</li>
              <li>Academic and disability support</li>
              <li>Other campus and community resources</li>
            </ul>
            <p>Once a referral is submitted, we'll help coordinate with the external provider and keep you informed of next steps.</p>
          </div>
        </section>
      </div>
    </DashboardPageWrapper>
  );
}

function ReferralCard({ referral }: { referral: Referral }) {
  const statusIcon =
    referral.status === 'completed' ? (
      <CheckCircle className="text-green-600 dark:text-green-400" />
    ) : (
      <Clock className="text-blue-600 dark:text-blue-400" />
    );
  const statusColor =
    referral.status === 'completed'
      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';

  const date = referral.date || referral.created_at;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-4">
          {statusIcon}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">{referral.service}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{referral.provider}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${statusColor}`}>
          {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
        </span>
      </div>

      {date && <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">📅 {new Date(date).toLocaleDateString()}</p>}
      {(referral.notes || referral.description) && <p className="text-gray-700 dark:text-gray-300">{referral.notes || referral.description}</p>}

      <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition">
          <FileText size={18} /> View Details
        </button>
        <button className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium transition">
          📞 Contact Provider
        </button>
      </div>
    </div>
  );
}
