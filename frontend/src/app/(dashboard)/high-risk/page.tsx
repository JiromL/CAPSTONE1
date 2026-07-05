'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import ManualNotifyForm from '@/components/ManualNotifyForm';
import { api } from '@/utils/api';
import {
  AlertTriangle, ChevronDown, ChevronUp, Phone, ShieldAlert,
  Loader2, Clock, Send, CheckCircle, XCircle,
} from 'lucide-react';

const RISK_CONFIG: Record<string, { label: string; badge: string }> = {
  red:      { label: 'High Risk',  badge: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  critical: { label: 'Critical',   badge: 'bg-red-100 text-red-900 ring-1 ring-red-300 font-semibold' },
  yellow:   { label: 'Moderate',   badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  green:    { label: 'Low Risk',   badge: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
};

function getRisk(level: string) {
  return RISK_CONFIG[level?.toLowerCase()] ?? { label: level?.toUpperCase() || 'Unknown', badge: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' };
}

export default function HighRiskPage() {
  const [cases, setCases]   = useState<any[]>([]);
  const [tab, setTab]       = useState<'cases' | 'manual'>('cases');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(api('/api/high-risk/users'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setCases((Array.isArray(data) ? data : []).map((u: any, i: number) => ({
          id: i,
          name: u.name || u.username,
          studentId: u.username,
          email: u.email || '',
          riskLevel: (u.risk || 'unknown').toLowerCase(),
        })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const redCount = cases.filter(c => ['red', 'critical'].includes(c.riskLevel)).length;
  const yellowCount = cases.filter(c => c.riskLevel === 'yellow').length;

  return (
    <DashboardPageWrapper title="High-Risk Monitoring" subtitle="Students flagged for elevated mental health risk">

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <ShieldAlert size={18} className="text-gray-500" />
          <div>
            <p className="text-xs text-gray-400">Total Flagged</p>
            <p className="text-xl font-semibold text-gray-800">{cases.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className={redCount > 0 ? 'text-red-500' : 'text-gray-300'} />
          <div>
            <p className="text-xs text-gray-400">High Risk / Critical</p>
            <p className={`text-xl font-semibold ${redCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>{redCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <Phone size={18} className="text-[#2563eb]" />
          <div>
            <p className="text-xs text-gray-400">Philippine Mental Health Crisis Lines</p>
            <p className="text-sm font-semibold text-gray-800">Hopeline PH: 8804-4673</p>
            <p className="text-xs text-gray-500">Crisis Line: 0917-899-8727</p>
          </div>
        </div>
      </div>

      {/* Tab + content card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Tab bar */}
        <div className="flex items-end border-b border-gray-200 px-2 pt-2 gap-0.5">
          {([
            { key: 'cases' as const,  label: 'Active Cases',  count: cases.length },
            { key: 'manual' as const, label: 'Manual Notify', count: 0 },
          ]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-all whitespace-nowrap ${
                tab === t.key
                  ? 'bg-[#2563eb]/5 text-[#2563eb] border-b-2 border-[#2563eb]'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}>
              {t.label}
              {t.count > 0 && (
                <span className={`text-[10px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-1 leading-none ${
                  tab === t.key ? 'bg-[#2563eb] text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'cases' ? (
          loading ? (
            <div className="flex items-center justify-center h-44 gap-2 text-gray-400 text-sm">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : cases.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-44 text-center">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-3">
                <CheckCircle size={18} className="text-green-500" />
              </div>
              <p className="text-sm font-medium text-gray-600">No high-risk cases flagged</p>
              <p className="text-xs text-gray-400 mt-1">Cases are flagged automatically based on assessment scores.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-8">#</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Student</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Risk Level</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">History</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((c, i) => (
                      <HighRiskRow key={c.id} caseItem={c} index={i} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100">
                <p className="text-xs text-gray-400">{cases.length} flagged student{cases.length !== 1 ? 's' : ''}</p>
              </div>
            </>
          )
        ) : (
          <div className="p-5">
            <ManualNotifyForm />
          </div>
        )}
      </div>

      {/* Guidelines */}
      <div className="mt-4 bg-white rounded-xl border border-gray-200 px-5 py-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Monitoring Guidelines</p>
        <ul className="space-y-1.5 text-sm text-gray-600">
          {[
            ['Daily Check-ins', 'Contact high-risk clients daily or per treatment plan'],
            ['Safety Plans', 'Ensure current safety plans are in place and reviewed'],
            ['Emergency Contacts', 'Maintain accessible emergency contact information'],
            ['Documentation', 'Record all contact attempts and client status'],
            ['Escalation', 'Escalate to crisis services immediately if needed'],
          ].map(([title, desc]) => (
            <li key={title} className="flex gap-2">
              <span className="font-medium text-gray-800 whitespace-nowrap">{title}:</span>
              <span>{desc}</span>
            </li>
          ))}
        </ul>
      </div>

    </DashboardPageWrapper>
  );
}

function HighRiskRow({ caseItem, index }: { caseItem: any; index: number }) {
  const [expanded, setExpanded]       = useState(false);
  const [history, setHistory]         = useState<Array<{ date: string; perma_label: string }>>([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [notifyState, setNotifyState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');

  const risk = getRisk(caseItem.riskLevel);
  const isHighRisk = ['red', 'critical'].includes(caseItem.riskLevel);

  const toggleHistory = async () => {
    if (!expanded && history.length === 0) {
      setLoadingHist(true);
      try {
        const token = localStorage.getItem('token');
        const r = await fetch(api(`/api/high-risk/user/${encodeURIComponent(caseItem.studentId)}/perma-history`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        setHistory(r.ok ? (d.history || []) : []);
      } catch { setHistory([]); }
      finally { setLoadingHist(false); }
    }
    setExpanded(v => !v);
  };

  const handleNotify = async () => {
    setNotifyState('loading');
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/high-risk/user/${encodeURIComponent(caseItem.studentId)}/notify`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifyState(r.ok ? 'sent' : 'error');
    } catch { setNotifyState('error'); }
  };

  return (
    <>
      <tr className={`border-b border-gray-50 transition-colors ${isHighRisk ? 'bg-red-50/30 hover:bg-red-50/60' : 'hover:bg-gray-50/60'}`}>
        <td className="px-5 py-4 text-gray-400 text-xs">{index + 1}.</td>
        <td className="px-5 py-4">
          <p className="font-medium text-gray-900 text-sm">{caseItem.name}</p>
          {caseItem.email && <p className="text-xs text-gray-400">{caseItem.email}</p>}
          {!caseItem.email && <p className="text-xs text-gray-400 font-mono">{caseItem.studentId}</p>}
        </td>
        <td className="px-5 py-4">
          <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${risk.badge}`}>
            {risk.label}
          </span>
        </td>
        <td className="px-5 py-4">
          <button onClick={toggleHistory}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium transition">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Hide' : 'View'} history
          </button>
        </td>
        <td className="px-5 py-4">
          {notifyState === 'sent' ? (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle size={14} /> Notified
            </span>
          ) : notifyState === 'error' ? (
            <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
              <XCircle size={14} /> Failed
            </span>
          ) : (
            <button onClick={handleNotify} disabled={notifyState === 'loading'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition disabled:opacity-50"
              style={{ backgroundColor: '#2563eb' }}>
              {notifyState === 'loading' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Notify Counselor
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className={`border-b border-gray-50 ${isHighRisk ? 'bg-red-50/20' : 'bg-gray-50/40'}`}>
          <td colSpan={5} className="px-10 py-3">
            {loadingHist ? (
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <Loader2 size={15} className="animate-spin" /> Loading history…
              </span>
            ) : history.length === 0 ? (
              <span className="text-xs text-gray-400">No PERMA history available.</span>
            ) : (
              <ul className="space-y-1">
                {history.map((h, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1 text-gray-400 whitespace-nowrap">
                      <Clock size={15} /> {new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span>{h.perma_label}</span>
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
