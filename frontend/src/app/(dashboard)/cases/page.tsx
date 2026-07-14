'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { PermaBadge } from '@/components/PendingStudentsWithPerma';
import { Search, Loader2, AlertCircle, ChevronRight, Users, FolderOpen, ShieldAlert, FolderX } from 'lucide-react';

/* ── Badge maps ─────────────────────────────────────────── */

const RISK_BADGE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  GREEN:    { bg: 'var(--color-success-surface)',  text: 'var(--color-success-text)',  border: 'rgba(5,150,105,0.2)',  dot: '#059669' },
  YELLOW:   { bg: 'var(--color-warning-surface)',  text: 'var(--color-warning-text)',  border: 'rgba(217,119,6,0.2)',  dot: '#D97706' },
  RED:      { bg: 'var(--color-danger-surface)',   text: 'var(--color-danger-text)',   border: 'rgba(220,38,38,0.2)',  dot: '#DC2626' },
  CRITICAL: { bg: 'var(--color-danger-surface)',   text: 'var(--color-danger-text)',   border: 'rgba(220,38,38,0.3)',  dot: '#991B1B' },
};

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  ACTIVE:              { bg: 'var(--color-success-surface)',  text: 'var(--color-success-text)' },
  NEW:                 { bg: 'var(--color-primary-surface)',  text: 'var(--color-primary-text)' },
  INTAKE_SCHEDULED:    { bg: 'var(--color-warning-surface)',  text: 'var(--color-warning-text)' },
  PENDING_TERMINATION: { bg: 'rgba(249,115,22,0.1)',          text: '#C2410C' },
  CLOSED:              { bg: 'var(--color-border)',            text: 'var(--color-text-muted)' },
  CANCELLED:           { bg: 'var(--color-danger-surface)',   text: 'var(--color-danger-text)' },
  open:                { bg: 'var(--color-success-surface)',  text: 'var(--color-success-text)' },
  closed:              { bg: 'var(--color-border)',            text: 'var(--color-text-muted)' },
  intake_scheduled:    { bg: 'var(--color-warning-surface)',  text: 'var(--color-warning-text)' },
};

const DEFAULT_BADGE = { bg: 'var(--color-border)', text: 'var(--color-text-muted)' };

function fmt(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtLabel(s?: string) {
  if (!s) return '—';
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* ── Stat card ──────────────────────────────────────────── */
function StatCard({
  label, value, icon: Icon, active, onClick, accent, dimmed,
}: {
  label: string; value: number; icon: any; active: boolean;
  onClick: () => void; accent?: string; dimmed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl px-4 py-4 transition-all duration-150 hover:scale-[1.01] active:scale-[0.99]"
      style={{
        background: 'var(--color-surface)',
        border: active
          ? `1.5px solid var(--color-primary)`
          : '1px solid var(--color-border)',
        boxShadow: active
          ? 'var(--shadow-primary), var(--shadow-card)'
          : 'var(--shadow-card)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: accent ? `${accent}15` : 'var(--color-border)' }}
        >
          <Icon size={16} style={{ color: dimmed ? 'var(--color-text-muted)' : (accent || 'var(--color-primary)') }} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            {label}
          </p>
          <p className="text-xl font-bold tabular-nums leading-tight" style={{ color: dimmed ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>
            {value}
          </p>
        </div>
      </div>
    </button>
  );
}

/* ── Main ───────────────────────────────────────────────── */
export default function CasesPage() {
  const [user, setUser]         = useState<any>(null);
  const [cases, setCases]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'attention' | 'high-risk' | 'closed'>('all');
  const [permaLabels, setPermaLabels] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
  }, []);

  async function fetchPermaLabels(items: any[]) {
    const usernames = items.map((c: any) => c.mhbot_username).filter(Boolean) as string[];
    if (!usernames.length) return;
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api('/api/mhbot/batch-labels'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames }),
      });
      if (r.ok) setPermaLabels((await r.json()).labels || {});
    } catch {}
  }

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const r = await fetch(api('/api/cases'), { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) throw new Error(`${r.status}`);
        const d = await r.json();
        const items = d.cases || [];
        setCases(items);
        localStorage.setItem('cases_cache', JSON.stringify(items));
        setError(null);
        fetchPermaLabels(items);
      } catch {
        setError('Failed to load cases.');
        const cached = localStorage.getItem('cases_cache');
        if (cached) try { setCases(JSON.parse(cached)); } catch {}
      } finally { setLoading(false); }
    };
    load();
  }, [user]);

  const pageTitle = (() => {
    switch (user?.role?.toUpperCase()) {
      case 'COUNSELOR':    return 'My Client Cases';
      case 'PSYCHOLOGIST': return 'Clinical Cases';
      case 'ADMIN':        return 'All Cases';
      case 'DPO':          return 'Case Oversight';
      case 'IC':           return 'Intake Cases';
      default:             return 'Cases';
    }
  })();

  const filtered = cases.filter(c => {
    const status = (c.status || c.case_status || '').toUpperCase();
    const risk   = (c.risk_level || '').toUpperCase();
    const t      = search.toLowerCase();

    const matchTab = (() => {
      switch (activeTab) {
        case 'active':    return ['ACTIVE', 'NEW', 'INTAKE_SCHEDULED'].includes(status);
        case 'attention': return status === 'PENDING_TERMINATION';
        case 'high-risk': return ['RED', 'CRITICAL'].includes(risk);
        case 'closed':    return ['CLOSED', 'CANCELLED'].includes(status);
        default:          return true;
      }
    })();

    const matchSearch = !t || [c.student_name, c.student_email, c.chief_complaint, c.presenting_issue, c.case_number]
      .some(v => v?.toLowerCase().includes(t));

    return matchTab && matchSearch;
  });

  const openCount   = cases.filter(c => ['open', 'ACTIVE', 'NEW', 'INTAKE_SCHEDULED'].includes(c.status)).length;
  const highRisk    = cases.filter(c => ['RED', 'CRITICAL'].includes(c.risk_level?.toUpperCase())).length;
  const closedCount = cases.filter(c => ['closed', 'CLOSED'].includes(c.status)).length;

  const TABS = [
    { id: 'all'       as const, label: 'All',           count: cases.length },
    { id: 'active'    as const, label: 'Active',         count: cases.filter(c => ['ACTIVE','NEW','INTAKE_SCHEDULED'].includes((c.status||'').toUpperCase())).length },
    { id: 'attention' as const, label: 'Needs Attention',count: cases.filter(c => (c.status||'').toUpperCase()==='PENDING_TERMINATION').length },
    { id: 'high-risk' as const, label: 'High Risk',      count: cases.filter(c => ['RED','CRITICAL'].includes((c.risk_level||'').toUpperCase())).length },
    { id: 'closed'    as const, label: 'Closed',         count: cases.filter(c => ['CLOSED','CANCELLED'].includes((c.status||'').toUpperCase())).length },
  ];

  const showWellbeing = !['STAFF'].includes(user?.role?.toUpperCase());

  return (
    <DashboardPageWrapper title={pageTitle} subtitle="Manage and track student cases">

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Cases" value={cases.length}  icon={Users}       active={activeTab === 'all'}       onClick={() => setActiveTab('all')}       accent="var(--color-primary)" />
        <StatCard label="Open"        value={openCount}      icon={FolderOpen}  active={activeTab === 'active'}    onClick={() => setActiveTab('active')}    accent="var(--color-primary)" />
        <StatCard label="High Risk"   value={highRisk}       icon={ShieldAlert} active={activeTab === 'high-risk'} onClick={() => setActiveTab('high-risk')} accent="var(--color-danger)" dimmed={highRisk === 0} />
        <StatCard label="Closed"      value={closedCount}    icon={FolderX}     active={activeTab === 'closed'}    onClick={() => setActiveTab('closed')}    dimmed />
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2 text-sm mb-4 px-4 py-3 rounded-xl animate-fade-in"
          style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger-text)', border: '1px solid rgba(220,38,38,0.2)' }}
        >
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Table card */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>

        {/* Tab bar */}
        <div style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-0.5 px-4 pt-3 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t whitespace-nowrap border-b-2 transition-all duration-150"
                style={{
                  borderColor:   activeTab === tab.id ? 'var(--color-primary)' : 'transparent',
                  color:         activeTab === tab.id ? 'var(--color-primary-text)' : 'var(--color-text-muted)',
                  marginBottom:  '-1px',
                }}
                onMouseEnter={e => activeTab !== tab.id && ((e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)')}
                onMouseLeave={e => activeTab !== tab.id && ((e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)')}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold"
                    style={
                      activeTab === tab.id
                        ? { background: 'var(--color-primary)', color: '#fff' }
                        : { background: 'var(--color-border)', color: 'var(--color-text-secondary)' }
                    }
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="px-4 pb-3 pt-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, issue, case #…"
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl outline-none transition-all duration-150"
                style={{
                  background:   'var(--color-bg)',
                  border:       '1px solid var(--color-border)',
                  color:        'var(--color-text-primary)',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.boxShadow   = 'var(--shadow-primary)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.boxShadow   = 'none';
                }}
              />
            </div>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center h-48 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={15} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
            Loading cases…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--color-border)' }}>
              <FolderOpen size={18} style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>No cases found</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {search ? 'No cases match your search.' : 'No cases in this category.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider w-8" style={{ color: 'var(--color-text-muted)' }}>#</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Student</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Case #</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Chief Complaint</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Status</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Risk</th>
                    {showWellbeing && (
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Wellbeing</th>
                    )}
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Created</th>
                    <th className="px-5 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => {
                    const risk      = c.risk_level?.toUpperCase() || 'GREEN';
                    const statusKey = c.status || c.case_status || '';
                    const riskCfg   = RISK_BADGE[risk] ?? RISK_BADGE['GREEN'];
                    const statusCfg = STATUS_BADGE[statusKey] ?? DEFAULT_BADGE;
                    const isHighRisk = ['RED', 'CRITICAL'].includes(risk);

                    return (
                      <tr
                        key={c._id}
                        className={`transition-colors duration-100 animate-fade-up`}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          background: isHighRisk ? 'rgba(220,38,38,0.03)' : 'transparent',
                          animationDelay: `${Math.min(i * 30, 300)}ms`,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = isHighRisk ? 'rgba(220,38,38,0.06)' : 'var(--color-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = isHighRisk ? 'rgba(220,38,38,0.03)' : 'transparent')}
                      >
                        {/* # */}
                        <td className="px-5 py-4 text-xs tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                          {i + 1}
                        </td>

                        {/* Student */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                              style={{ background: 'var(--color-primary)' }}
                            >
                              {(c.student_name || 'U')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                                {c.student_name || 'Unknown'}
                              </p>
                              {c.student_email && (
                                <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                                  {c.student_email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Case # */}
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            {c.case_number || c.counseling_id || c._id?.slice(-8).toUpperCase()}
                          </span>
                        </td>

                        {/* Chief complaint */}
                        <td className="px-5 py-4 max-w-[200px]">
                          <p className="truncate text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            {c.chief_complaint || c.presenting_issue || '—'}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span
                            className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium"
                            style={{ background: statusCfg.bg, color: statusCfg.text }}
                          >
                            {fmtLabel(statusKey)}
                          </span>
                        </td>

                        {/* Risk */}
                        <td className="px-5 py-4">
                          <span
                            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium"
                            style={{ background: riskCfg.bg, color: riskCfg.text, border: `1px solid ${riskCfg.border}` }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: riskCfg.dot }} />
                            {risk}
                          </span>
                        </td>

                        {/* Wellbeing */}
                        {showWellbeing && (
                          <td className="px-5 py-4">
                            <PermaBadge label={c.mhbot_username ? (permaLabels[c.mhbot_username] ?? null) : null} />
                          </td>
                        )}

                        {/* Created */}
                        <td className="px-5 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          {fmt(c.created_at)}
                        </td>

                        {/* Link */}
                        <td className="px-5 py-4">
                          <Link href={`/cases/${c._id}`}>
                            <button
                              className="p-1.5 rounded-lg transition-all duration-150"
                              style={{ color: 'var(--color-text-muted)' }}
                              onMouseEnter={e => {
                                (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-surface)';
                                (e.currentTarget as HTMLElement).style.color = 'var(--color-primary-text)';
                              }}
                              onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.background = 'transparent';
                                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)';
                              }}
                            >
                              <ChevronRight size={14} />
                            </button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div
              className="px-5 py-3"
              style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
            >
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Showing <strong style={{ color: 'var(--color-text-secondary)' }}>{filtered.length}</strong> of {cases.length} cases
                {search && <> matching <em>"{search}"</em></>}
              </p>
            </div>
          </>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
