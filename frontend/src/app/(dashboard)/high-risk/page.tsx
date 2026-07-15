'use client';

import { useState, useEffect, useMemo } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import ManualNotifyForm from '@/components/ManualNotifyForm';
import { api } from '@/utils/api';
import {
  AlertTriangle, ChevronDown, ChevronUp, Phone, ShieldAlert,
  Loader2, Clock, Send, CheckCircle, XCircle, Search,
} from 'lucide-react';

type RiskLevel = 'high' | 'medium' | 'low' | 'unknown';

function getRiskStyle(level: string) {
  switch ((level || '').toLowerCase()) {
    case 'high':
    case 'critical':
    case 'red':
      return { label: 'High Risk', bg: 'var(--color-danger-surface)',  text: 'var(--color-danger)',  border: 'var(--color-danger)' };
    case 'medium':
    case 'yellow':
      return { label: 'Moderate',  bg: 'var(--color-warning-surface)', text: 'var(--color-warning)', border: 'var(--color-warning)' };
    case 'low':
    case 'green':
      return { label: 'Low Risk',  bg: 'var(--color-success-surface)', text: 'var(--color-success)', border: 'var(--color-success)' };
    default:
      return { label: 'Unknown',   bg: 'var(--color-bg)',              text: 'var(--color-text-muted)', border: 'var(--color-border)' };
  }
}

const FILTER_OPTIONS: { label: string; value: RiskLevel | 'all' }[] = [
  { label: 'All',      value: 'all' },
  { label: 'High',     value: 'high' },
  { label: 'Moderate', value: 'medium' },
  { label: 'Low',      value: 'low' },
  { label: 'Unknown',  value: 'unknown' },
];

export default function HighRiskPage() {
  const [cases, setCases]           = useState<any[]>([]);
  const [tab, setTab]               = useState<'cases' | 'manual'>('cases');
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [search, setSearch]         = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(api('/api/high-risk/users'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        setCases((Array.isArray(data) ? data : []).map((u: any, i: number) => ({
          id: i,
          name: u.name || u.email,
          studentId: u.email,   // use email — username is null for most seeded students
          email: u.email || '',
          riskLevel: (u.risk || 'unknown').toLowerCase() as RiskLevel,
        })));
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, []);

  const criticalCount = cases.filter(c => c.riskLevel === 'critical').length;
  const highCount     = cases.filter(c => c.riskLevel === 'high').length;
  const moderateCount = cases.filter(c => c.riskLevel === 'medium').length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter(c => {
      const matchRisk   = riskFilter === 'all' || c.riskLevel === riskFilter;
      const matchSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
      return matchRisk && matchSearch;
    });
  }, [cases, search, riskFilter]);

  const TABS = [
    { key: 'cases' as const,  label: 'Active Cases',  count: cases.length },
    { key: 'manual' as const, label: 'Manual Notify',  count: 0 },
  ];

  return (
    <DashboardPageWrapper title="High-Risk Monitoring" subtitle="Students flagged for elevated mental health risk">

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { icon: ShieldAlert,   label: 'Monitoring',  value: cases.length,   color: 'var(--color-text-primary)', accent: 'var(--color-primary)' },
          { icon: AlertTriangle, label: 'Critical',    value: criticalCount,  color: criticalCount > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)', accent: 'var(--color-danger)' },
          { icon: AlertTriangle, label: 'High Risk',   value: highCount,      color: highCount > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)',  accent: 'var(--color-warning)' },
          { icon: ShieldAlert,   label: 'Moderate',    value: moderateCount,  color: 'var(--color-text-secondary)', accent: 'var(--color-text-muted)' },
        ].map(({ icon: Icon, label, value, color, accent }) => (
          <div key={label} className="rounded-2xl border shadow-card px-4 py-3 flex items-center gap-3"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)` }}>
              <Icon size={15} style={{ color: accent }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
              <p className="text-xl font-semibold tabular-nums" style={{ color }}>{value}</p>
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
              {/* Search + filter bar */}
              <div className="flex flex-wrap items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                {/* Search */}
                <div className="relative flex-1 min-w-[160px] max-w-xs">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search by name or email…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg outline-none"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  />
                </div>

                {/* Risk level filter pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {FILTER_OPTIONS.map(opt => {
                    const active = riskFilter === opt.value;
                    const style = opt.value !== 'all' ? getRiskStyle(opt.value) : null;
                    return (
                      <button key={opt.value} onClick={() => setRiskFilter(opt.value)}
                        className="px-3 py-1 text-xs rounded-full font-medium border transition-all"
                        style={active && style
                          ? { background: style.bg, color: style.text, borderColor: style.border }
                          : active
                          ? { background: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)' }
                          : { background: 'transparent', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                        {opt.label}
                        {opt.value !== 'all' && (
                          <span className="ml-1 opacity-70">
                            {cases.filter(c => c.riskLevel === opt.value).length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-6">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>No results</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {search ? `No students match "${search}"` : 'No students at this risk level.'}
                  </p>
                </div>
              ) : (
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
                      {filtered.map((c, i) => <HighRiskRow key={c.id} caseItem={c} index={i} />)}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="px-5 py-3" style={{ background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)' }}>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {filtered.length === cases.length
                    ? `${cases.length} student${cases.length !== 1 ? 's' : ''}`
                    : `${filtered.length} of ${cases.length} student${cases.length !== 1 ? 's' : ''}`}
                </p>
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
            ['Daily Check-ins',   'Contact high-risk clients daily or per treatment plan'],
            ['Safety Plans',      'Ensure current safety plans are in place and reviewed'],
            ['Emergency Contacts','Maintain accessible emergency contact information'],
            ['Documentation',     'Record all contact attempts and client status'],
            ['Escalation',        'Escalate to crisis services immediately if needed'],
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

  const risk      = getRiskStyle(caseItem.riskLevel);
  const isHighRisk = caseItem.riskLevel === 'high' || caseItem.riskLevel === 'critical';

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
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{caseItem.email}</p>
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
            <span className="flex items-center gap-1 text-xs font-medium cursor-pointer" style={{ color: 'var(--color-danger)' }}
              onClick={() => setNotifyState('idle')} title="Click to retry">
              <XCircle size={14} /> Failed — retry?
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
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No PERMA check-in history available for this student.</span>
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
