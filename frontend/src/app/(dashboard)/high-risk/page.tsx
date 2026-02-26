"use client";

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Phone, Mail, User, Calendar, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';

export default function HighRiskPage() {
  const [highRiskCases, setHighRiskCases] = useState<any[]>([]);

  // load list of student risk levels from backend
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/high-risk/users', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((data) => {
        // backend returns [{username, risk},...]
        const mapped = data.map((u: any, idx: number) => ({
          id: idx,
          name: u.username,
          studentId: u.username,
          riskLevel: u.risk.toLowerCase(),
          reason: '',
          lastAssessment: '',
          safetyPlan: '',
          emergencyContact: '',
          nextCheckIn: '',
          status: 'active',
        }));
        setHighRiskCases(mapped);
      })
      .catch((err) => console.error('load risk users', err));
  }, []);

  const emergencyResources = [
    { name: '24/7 Crisis Hotline', phone: '1-800-273-8255' },
    { name: 'Campus Police Emergency', phone: '911' },
    { name: 'Campus Counseling Center', phone: '(555) 123-4567' },
  ];

  return (
    <DashboardPageWrapper title="High-Risk Monitoring" subtitle="Monitor and support students at elevated risk">
      <section className="mb-8">
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-8">
          <h2 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2"><AlertTriangle size={24} /> Emergency Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {emergencyResources.map((resource, idx) => (
              <div key={idx} className="bg-white rounded-lg p-4">
                <p className="font-medium text-gray-900">{resource.name}</p>
                <p className="text-lg font-bold text-red-600 mt-2">{resource.phone}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Active High-Risk Cases</h2>
        <div className="space-y-4">{highRiskCases.map((caseItem) => (<HighRiskCaseCard key={caseItem.id} caseItem={caseItem} />))}</div>
      </section>

      <section className="mt-12">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">High-Risk Monitoring Guidelines</h3>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3"><CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} /><span><strong>Daily Check-ins:</strong> Contact high-risk clients daily or per treatment plan</span></li>
            <li className="flex items-start gap-3"><CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} /><span><strong>Safety Plans:</strong> Ensure current safety plans are in place and reviewed</span></li>
            <li className="flex items-start gap-3"><CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} /><span><strong>Emergency Contacts:</strong> Maintain accessible emergency contact information</span></li>
            <li className="flex items-start gap-3"><CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} /><span><strong>Documentation:</strong> Record all contact attempts and client status</span></li>
            <li className="flex items-start gap-3"><CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} /><span><strong>Escalation:</strong> Escalate to crisis services immediately if needed</span></li>
          </ul>
        </div>
      </section>
    </DashboardPageWrapper>
  );
}

function HighRiskCaseCard({ caseItem }: any) {
  const riskColor =
    caseItem.riskLevel === 'critical'
      ? 'bg-red-100 border-red-300'
      : caseItem.riskLevel === 'high'
      ? 'bg-orange-100 border-orange-300'
      : 'bg-yellow-100 border-yellow-300';

  const statusIcon = caseItem.status === 'active' ? <AlertTriangle className="text-red-600" /> : <CheckCircle className="text-green-600" />;

  return (
    <div className={`border-2 ${riskColor} rounded-lg p-6`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          {statusIcon}
          <div>
            <h3 className="text-lg font-bold text-gray-900">{caseItem.name}</h3>
            <p className="text-gray-600 text-sm">{caseItem.studentId}</p>
          </div>
        </div>
        <span className="text-sm font-bold px-3 py-1 bg-white rounded-full text-gray-900">
          {caseItem.riskLevel.toUpperCase()}
        </span>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Risk Reason</p>
            <p className="font-medium text-gray-900">{caseItem.reason}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Safety Plan</p>
            <p className="font-medium text-gray-900">{caseItem.safetyPlan}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Last Assessment</p>
            <p className="font-medium text-gray-900">{new Date(caseItem.lastAssessment).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Next Check-in</p>
            <p className="font-medium text-gray-900">{new Date(caseItem.nextCheckIn).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-300">
          <p className="text-sm text-gray-600 mb-2">Emergency Contact</p>
          <p className="font-medium text-gray-900 mb-4">{caseItem.emergencyContact}</p>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-300">
        <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition flex items-center justify-center gap-2">
          <Phone size={18} /> Call
        </button>
        <button className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium transition flex items-center justify-center gap-2">
          <Mail size={18} /> Email
        </button>
        <button className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 py-2 rounded-lg font-medium transition">
          Update Status
        </button>
      </div>
    </div>
  );
}
