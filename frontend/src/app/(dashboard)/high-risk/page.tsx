'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import ManualNotifyForm from '@/components/ManualNotifyForm';
import { api } from '@/utils/api';
import {
  AlertTriangle, ChevronDown, ChevronUp, Phone, ShieldAlert,
  Loader2, Clock, Send, CheckCircle, XCircle,
} from 'lucide-react';

function getRiskStyle(level: string): { label: string; bg: string; text: string; border: string } {
  switch ((level || '').toLowerCase()) {
    case 'critical': return { label: 'Critical',  bg: 'var(--color-danger-surface)',  text: 'var(--color-danger)',  border: 'var(--color-danger)' };
    case 'red':      return { label: 'High Risk', bg: 'var(--color-danger-surface)',  text: 'var(--color-danger)',  border: 'var(--color-danger)' };
    case 'yellow':   return { label: 'Moderate',  bg: 'var(--color-warning-surface)', text: 'var(--color-warning)', border: 'var(--color-warning)' };
    case 'green':    return { label: 'Low Risk',  bg: 'var(--color-success-surface)', text: 'var(--color-success)', border: 'var(--color-success)' };
    default:         return { label: level?.toUpperCase() || 'Unknown', bg: 'var(--color-bg)', text: 'var(--color-text-muted)', border: 'var(--color-border)' };
  }
}

export default function HighRiskPage() {
  const [cases, setCases]           = useState<any[]>([]);
  const [tab, setTab]               = useState<'cases' | 'manual'>('cases');
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(api('/api/high-risk/users'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        setCases((Array.isArray(data) ? data : []).map((u: any, i: number) => ({
          id: i, name: u.name || u.username, studentId: u.username,
          email: u.email || '', riskLevel: (u.risk || 'unknown').toLowerCase(),
        })));
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, []);

  const redCount    = cases.filter(c => ['red', 'critical'].includes(c.riskLevel)).length;

  const TABS = [
    { key: 'cases' as const,  label: 'Active Cases',  count: cases.length },
    { key: 'manual' as const, label: 'Manual Notify', count: 0 },
  ];

  return (
    <DashboardPageWrapper title="High-Risk Monitoring" subtitle="Students flagged for elevated mental health risk">

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { icon: ShieldAlert, label: 'Total Flagged', value: cases.length, highlight: false },
          { icon: AlertTriangle, label: 'High Risk / Critical', value: redCount, highlight: redCount > 0 },
        ].map(({ icon: Icon, label, value, highlight }) => (
          <div key={label} className="rounded-2xl border shadow-card px-4 py-3 flex items-center gap-3"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <Icon size={18} style={{ color: highlight ? 'var(--color-danger)' : 'var(--color-text-muted)' }} />
            <div>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
              <p className="text-xl font-semibold" style={{ color: highlight ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="rounded-2xl border shadow-card overflow-hidden animate-fade-up" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

        {/* Tab bar */}
        <div className="flex items-end px-2 pt-2 gap-0.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
          {TABS.map(t => {
            const isActive = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-all whitespace-nowrap"
                style={isActive
                  ? { color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)', background: 'var(--color-primary-surface)' }
                  : { color: 'var(--color-text-muted)' }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                {t.label}
                {t.count > 0 && (
                  <span className="text-[10px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-1 leading-none"
                    style={isActive
                      ? { background: 'var(--color-primary)', color: 'white' }
                      : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {tab === 'cases' ? (
          loading ? (
            <div className="flex items-center justify-center h-44 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center h-44 text-center px-6">
              <AlertTriangle size={22} className="mb-3" style={{ color: 'var(--color-warning)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Could not load monitoring data</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Check your connection and refresh the page.</p>
            </div>
          ) : cases.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-44 text-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--color-success-surface)' }}>
                <CheckCircle size={18} style={{ color: 'var(--color-success)' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>No high-risk cases flagged</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Cases are flagged automatically based on assessment scores.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                      {['#', 'Student', 'Risk Level', 'History', 'Action'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((c, i) => <HighRiskRow key={c.id} caseItem={c} index={i} />)}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3" style={{ background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)' }}>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{cases.length} flagged student{cases.length !== 1 ? 's' : ''}</p>
              </div>
            </>
          )
        ) : (
          <div className="p-5">
            <ManualNotifyForm />
          </div>
        )}
      </div>

      {/* Crisis Resources */}
      <div className="mt-4 rounded-2xl border px-5 py-4 flex items-start gap-3"
        style={{ background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)' }}>
        <Phone size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-danger)' }}>Philippine Mental Health Crisis Lines</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm" style={{ color: 'var(--color-danger)' }}>
            <a href="tel:+6328044673" className="font-medium hover:underline">Hopeline PH: (02) 8804-4673</a>
            <a href="tel:+639178998727" className="font-medium hover:underline">Crisis Line: 0917-899-8727</a>
          </div>
        </div>
      </div>

      {/* Guidelines */}
      <div className="mt-4 rounded-2xl border shadow-card px-5 py-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-muted)' }}>Monitoring Guidelines</p>
        <ul className="space-y-1.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {[
            ['Daily Check-ins', 'Contact high-risk clients daily or per treatment plan'],
            ['Safety Plans', 'Ensure current safety plans are in place and reviewed'],
            ['Emergency Contacts', 'Maintain accessible emergency contact information'],
            ['Documentation', 'Record all contact attempts and client status'],
            ['Escalation', 'Escalate to crisis services immediately if needed'],
          ].map(([title, desc]) => (
            <li key={title} className="flex gap-2">
              <span className="font-medium whitespace-nowrap" style={{ color: 'var(--color-text-primary)' }}>{title}:</span>
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

  const risk = getRiskStyle(caseItem.riskLevel);
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
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      setNotifyState(r.ok ? 'sent' : 'error');
    } catch { setNotifyState('error'); }
  };

  return (
    <>
      <tr className="transition-colors"
        style={{ borderBottom: '1px solid var(--color-border)', background: isHighRisk ? 'rgba(239,68,68,0.04)' : 'transparent' }}
        onMouseEnter={e => (e.currentTarget.style.background = isHighRisk ? 'rgba(239,68,68,0.08)' : 'var(--color-bg)')}
        onMouseLeave={e => (e.currentTarget.style.background = isHighRisk ? 'rgba(239,68,68,0.04)' : 'transparent')}>
        <td className="px-5 py-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>{index + 1}.</td>
        <td className="px-5 py-4">
          <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{caseItem.name}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{caseItem.email || caseItem.studentId}</p>
        </td>
        <td className="px-5 py-4">
          <span className="inline-flex text-xs px-2 py-0.5 rounded-full font-medium border"
            style={{ background: risk.bg, color: risk.text, borderColor: risk.border }}>
            {risk.label}
          </span>
        </td>
        <td className="px-5 py-4">
          <button onClick={toggleHistory}
            className="flex items-center gap-1 text-xs font-medium transition"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Hide' : 'View'} history
          </button>
        </td>
        <td className="px-5 py-4">
          {notifyState === 'sent' ? (
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--color-success)' }}>
              <CheckCircle size={14} /> Notified
            </span>
          ) : notifyState === 'error' ? (
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--color-danger)' }}>
              <XCircle size={14} /> Failed
            </span>
          ) : (
            <button onClick={handleNotify} disabled={notifyState === 'loading'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition disabled:opacity-50 hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}>
              {notifyState === 'loading' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Alert Counselor
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr style={{ borderBottom: '1px solid var(--color-border)', background: isHighRisk ? 'rgba(239,68,68,0.03)' : 'var(--color-bg)' }}>
          <td colSpan={5} className="px-10 py-3">
            {loadingHist ? (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <Loader2 size={15} className="animate-spin" /> Loading history…
              </span>
            ) : history.length === 0 ? (
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No PERMA history available.</span>
            ) : (
              <ul className="space-y-1">
                {history.map((h, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    <span className="flex items-center gap-1 whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                      <Clock size={12} /> {new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
