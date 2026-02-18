"use client";

import React from 'react';
import { Plus, FileText, CheckCircle, Clock } from 'lucide-react';
import PageShell from '@/components/PageShell';

type Referral = {
  id: number;
  service: string;
  provider: string;
  date: string;
  status: 'completed' | 'pending' | 'cancelled' | string;
  notes?: string;
};

const referralServices = [
  'Psychiatric Evaluation',
  'Group Therapy',
  'Substance Use Treatment',
  'Crisis Intervention',
  'Disability Support',
];

const referralsData: Referral[] = [
  {
    id: 1,
    service: 'Psychiatric Evaluation',
    provider: 'Dr. Elizabeth Cooper',
    date: '2024-01-20',
    status: 'completed',
    notes: 'Initial psychiatric evaluation completed, medication plan discussed',
  },
  {
    id: 2,
    service: 'Group Therapy',
    provider: 'Community Mental Health Center',
    date: '2024-01-15',
    status: 'pending',
    notes: 'Waiting for intake appointment',
  },
  {
    id: 3,
    service: 'Substance Use Treatment',
    provider: 'Recovery Services',
    date: '2024-02-02',
    status: 'pending',
    notes: 'Referral submitted to external provider',
  },
];

export default function ReferralsPage() {
  return (
    <PageShell title="Referrals" subtitle="View and manage your service referrals">
      <div className="bg-blue-50 rounded-lg p-8 mb-8 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Request a New Referral</h2>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg">
            <Plus size={16} /> New Referral
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {referralServices.map((service) => (
            <button key={service} className="bg-white hover:bg-blue-100 text-gray-900 py-2 px-4 rounded-lg font-medium transition text-sm">+ {service}</button>
          ))}
        </div>
      </div>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Referrals</h2>
        <div className="space-y-4">
          {referralsData.map((referral) => (
            <ReferralCard key={referral.id} referral={referral} />
          ))}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">About Referrals</h3>
        <div className="space-y-4 text-gray-700">
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
    </PageShell>
  );
}

function ReferralCard({ referral }: { referral: Referral }) {
  const statusIcon = referral.status === 'completed' ? <CheckCircle className="text-green-600" /> : <Clock className="text-blue-600" />;
  const statusColor = referral.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-4">
          {statusIcon}
          <div>
            <h3 className="text-lg font-bold text-gray-900">{referral.service}</h3>
            <p className="text-gray-600 text-sm">{referral.provider}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
          {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
        </span>
      </div>

      <p className="text-gray-700 text-sm mb-3">📅 {new Date(referral.date).toLocaleDateString()}</p>
      <p className="text-gray-700">{referral.notes}</p>

      <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
        <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
          <FileText size={18} /> View Details
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:text-gray-700 font-medium">
          📞 Contact Provider
        </button>
      </div>
    </div>
  );
}
