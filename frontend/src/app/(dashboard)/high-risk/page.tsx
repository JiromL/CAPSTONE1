"use client";

import React, { useState, useEffect } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Phone } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import ManualNotifyForm from '@/components/ManualNotifyForm';
import { api } from '@/utils/api';

const RISK_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  red:    { label: 'High Risk',    bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-700 dark:text-red-400' },
  yellow: { label: 'Moderate',     bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  green:  { label: 'Low Risk',     bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
};

function getRiskConfig(level: string) {
  return RISK_CONFIG[level?.toLowerCase()] ?? { label: level?.toUpperCase() || 'Unknown', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' };
}

export default function HighRiskPage() {
  const [highRiskCases, setHighRiskCases] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'cases' | 'manual'>('cases');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(api('/api/high-risk/users'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const mapped = (Array.isArray(data) ? data : []).map((u: any, idx: number) => ({
          id: idx,
          name: u.username,
          studentId: u.username,
          riskLevel: (u.risk || 'unknown').toLowerCase(),
        }));
        setHighRiskCases(mapped);
      })
      .catch((err) => console.error('load risk users', err))
      .finally(() => setLoading(false));
  }, []);

  const redCount = highRiskCases.filter((c) => c.riskLevel === 'red').length;

  return (
    <DashboardPageWrapper title="High-Risk Monitoring" subtitle="Monitor and support students at elevated risk">
      {/* Summary bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Flagged</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{highRiskCases.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">High Risk (Red)</p>
          <p className={`text-2xl font-bold ${redCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{redCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Emergency Line</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Phone size={14} className="text-green-600 dark:text-green-400" /> 1-800-273-8255
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex gap-6">
          {(['cases', 'manual'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-green-600 text-green-700 dark:text-green-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab === 'cases' ? 'Active Cases' : 'Manual Notify'}
              {tab === 'cases' && highRiskCases.length > 0 && (
                <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
                  {highRiskCases.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'cases' ? (
        loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin" />
          </div>
        ) : highRiskCases.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <AlertTriangle size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="font-medium">No high-risk cases flagged</p>
            <p className="text-sm mt-1">Cases are flagged automatically based on assessment scores.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {highRiskCases.map((c) => (
              <HighRiskCaseCard key={c.id} caseItem={c} />
            ))}
          </div>
        )
      ) : (
        <ManualNotifyForm />
      )}

      {/* Guidelines */}
      <div className="mt-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Monitoring Guidelines</h3>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li><span className="font-medium text-gray-800 dark:text-gray-300">Daily Check-ins:</span> Contact high-risk clients daily or per treatment plan</li>
          <li><span className="font-medium text-gray-800 dark:text-gray-300">Safety Plans:</span> Ensure current safety plans are in place and reviewed</li>
          <li><span className="font-medium text-gray-800 dark:text-gray-300">Emergency Contacts:</span> Maintain accessible emergency contact information</li>
          <li><span className="font-medium text-gray-800 dark:text-gray-300">Documentation:</span> Record all contact attempts and client status</li>
          <li><span className="font-medium text-gray-800 dark:text-gray-300">Escalation:</span> Escalate to crisis services immediately if needed</li>
        </ul>
      </div>
    </DashboardPageWrapper>
  );
}

function HighRiskCaseCard({ caseItem }: any) {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Array<{ date: string; perma_label: string }>>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [notifyState, setNotifyState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');

  const risk = getRiskConfig(caseItem.riskLevel);

  const toggleHistory = async () => {
    if (!showHistory && history.length === 0) {
      setLoadingHistory(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(api(`/api/high-risk/user/${encodeURIComponent(caseItem.studentId)}/perma-history`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setHistory(res.ok ? data.history || [] : []);
      } catch {
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    }
    setShowHistory((v) => !v);
  };

  const handleNotify = async () => {
    setNotifyState('loading');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api(`/api/high-risk/user/${encodeURIComponent(caseItem.studentId)}/notify`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifyState(res.ok ? 'sent' : 'error');
    } catch {
      setNotifyState('error');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white text-sm">{caseItem.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{caseItem.studentId}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${risk.bg} ${risk.text}`}>
          {risk.label}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={toggleHistory}
          className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium transition-colors"
        >
          {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showHistory ? 'Hide history' : 'View history'}
        </button>

        <button
          onClick={handleNotify}
          disabled={notifyState === 'loading' || notifyState === 'sent'}
          className="ml-auto px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white disabled:opacity-50 transition-colors"
        >
          {notifyState === 'loading' ? 'Sending…' : notifyState === 'sent' ? 'Notified ✓' : 'Send to Counselor'}
        </button>
        {notifyState === 'error' && <span className="text-xs text-red-500">Failed</span>}
      </div>

      {showHistory && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          {loadingHistory ? (
            <p className="text-xs text-gray-400">Loading history…</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">No history available</p>
          ) : (
            <ul className="space-y-1.5">
              {history.map((h, idx) => (
                <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-gray-400 dark:text-gray-600 flex-shrink-0">{new Date(h.date).toLocaleDateString()}</span>
                  <span>{h.perma_label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
