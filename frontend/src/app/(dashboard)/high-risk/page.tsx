"use client";

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Phone, Mail, User, Calendar, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import ManualNotifyForm from '@/components/ManualNotifyForm';
import { api } from '@/utils/api';

export default function HighRiskPage() {
  const [highRiskCases, setHighRiskCases] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'cases' | 'manual'>('cases');

  // load list of student risk levels from backend
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(api('/api/high-risk/users'), {
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
        {/* page-level tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex overflow-x-auto gap-1">
            <button
              onClick={() => setActiveTab('cases')}
              className={`flex-1 py-3 text-center text-sm font-medium transition ${
                activeTab === 'cases'
                  ? 'border-b-2 border-gray-400 text-gray-900'
                  : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Active Cases
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-3 text-center text-sm font-medium transition ${
                activeTab === 'manual'
                  ? 'border-b-2 border-gray-400 text-gray-900'
                  : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Manual Notify
            </button>
          </div>
        </div>

        {activeTab === 'cases' ? (
          <div className="space-y-4">{highRiskCases.map((caseItem) => (<HighRiskCaseCard key={caseItem.id} caseItem={caseItem} />))}</div>
        ) : (
          <ManualNotifyForm />
        )}
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
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Array<{ date: string; perma_label: string }>>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const toggleHistory = async () => {
    if (!showHistory) {
      // fetch when expanding
      setLoadingHistory(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(api(`/api/high-risk/user/${encodeURIComponent(caseItem.studentId)}/perma-history`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setHistory(data.history || []);
        } else {
          setHistory([]);
        }
      } catch (e) {
        console.error('load history', e);
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    }
    setShowHistory(!showHistory);
  };

  return (
    <div className="border border-gray-300 rounded p-4 bg-white">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{caseItem.name}</h3>
          <p className="text-xs text-gray-500">{caseItem.studentId}</p>
        </div>
        <span className="text-xs font-bold text-gray-700">
          {caseItem.riskLevel.toUpperCase()}
        </span>
      </div>

      <div className="mt-2 flex gap-2 text-sm">
        <button
          onClick={toggleHistory}
          className="text-blue-600 hover:underline"
        >
          {showHistory ? 'Hide history' : 'View history'}
        </button>
        <SendToCounselorButton username={caseItem.studentId} />
      </div>

      {showHistory && (
        <div className="mt-2 text-xs text-gray-700">
          {loadingHistory && <p>Loading...</p>}
          {!loadingHistory && history.length === 0 && <p>No history</p>}
          {!loadingHistory && history.length > 0 && (
            <ul className="list-disc ml-5">
              {history.map((h, idx) => (
                <li key={idx}>
                  {new Date(h.date).toLocaleDateString()}: {h.perma_label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function SendToCounselorButton({ username }: { username: string }) {
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState<boolean | null>(null);

  const handleSend = async () => {
    setLoading(true);
    setSent(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/high-risk/user/${encodeURIComponent(username)}/notify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        console.error('notify error', data);
        setSent(false);
      }
    } catch (e) {
      console.error(e);
      setSent(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1">
      <button onClick={handleSend} disabled={loading} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-lg font-medium transition">
        {loading ? 'Sending...' : 'Send to Counselor'}
      </button>
      {sent === true && <p className="text-xs text-green-600 mt-2">Notified</p>}
      {sent === false && <p className="text-xs text-red-600 mt-2">Failed</p>}
    </div>
  );
}

