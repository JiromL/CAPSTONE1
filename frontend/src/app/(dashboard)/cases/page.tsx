'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { PermaBadge } from '@/components/PendingStudentsWithPerma';
import { Search, Loader2, AlertCircle, ChevronRight, ChevronLeft, Users, FolderOpen, ShieldAlert, FolderX } from 'lucide-react';

const PER_PAGE = 20;

const TAB_STATUS: Record<string, string | null> = {
  all:        null,
  active:     'ACTIVE,NEW,INTAKE_SCHEDULED',
  attention:  'PENDING_TERMINATION',
  'high-risk': null,
  closed:     'CLOSED,CANCELLED',
};

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
  return new Date(d).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' });
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
  const router = useRouter();
  const [user, setUser]         = useState<any>(null);
  const [cases, setCases]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [summary, setSummary]   = useState({ total: 0, active: 0, high_risk: 0, closed: 0 });
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'attention' | 'high-risk' | 'closed'>('all');
  const [myCasesOnly, setMyCasesOnly] = useState(false);
  const [permaLabels, setPermaLabels] = useState<Record<string, string | null>>({});
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      const parsed = JSON.parse(u);
      setUser(parsed);
      if (['COUNSELOR', 'PSYCHOLOGIST'].includes((parsed.role || '').toUpperCase())) {
        setMyCasesOnly(true);
      }
    }
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 350);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [searchInput]);

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

  const fetchSummary = useCallback(async () => {
    if (!user) return;
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api('/api/cases/summary'), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setSummary(await r.json());
    } catch {}
  }, [user]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const fetchCases = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
      const statusFilter = TAB_STATUS[activeTab];
      if (statusFilter) params.set('status', statusFilter);
      if (activeTab === 'high-risk') params.set('risk_level', 'RED');
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (myCasesOnly && user?._id) params.set('my_cases', 'true');

      const r = await fetch(api(`/api/cases?${params}`), { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      const items = d.cases || [];
      setCases(items);
      setTotal(d.total ?? items.length);
      setTotalPages(d.total_pages ?? 1);
      setError(null);
      fetchPermaLabels(items);
    } catch {
      setError('Failed to load cases.');
    } finally { setLoading(false); }
  }, [user, page, activeTab, debouncedSearch, myCasesOnly]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setPage(1);
  };

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

  const TABS = [
    { id: 'all'       as const, label: 'All',            count: activeTab === 'all'        ? total : null },
    { id: 'active'    as const, label: 'Active',          count: activeTab === 'active'     ? total : null },
    { id: 'attention' as const, label: 'Needs Attention', count: activeTab === 'attention'  ? total : null },
    { id: 'high-risk' as const, label: 'High Risk',       count: activeTab === 'high-risk'  ? total : null },
    { id: 'closed'    as const, label: 'Closed',          count: activeTab === 'closed'     ? total : null },
  ];

  const showWellbeing = !['STAFF'].includes(user?.role?.toUpperCase());

  return (
    <DashboardPageWrapper title={pageTitle} subtitle="Manage and track student cases">

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Cases" value={summary.total}     icon={Users}       active={activeTab === 'all'}       onClick={() => handleTabChange('all')}       accent="var(--color-primary)" />
        <StatCard label="Open"        value={summary.active}    icon={FolderOpen}  active={activeTab === 'active'}    onClick={() => handleTabChange('active')}    accent="var(--color-primary)" />
        <StatCard label="High Risk"   value={summary.high_risk} icon={ShieldAlert} active={activeTab === 'high-risk'} onClick={() => handleTabChange('high-risk')} accent="var(--color-danger)" dimmed={activeTab !== 'high-risk'} />
        <StatCard label="Closed"      value={summary.closed}    icon={FolderX}     active={activeTab === 'closed'}    onClick={() => handleTabChange('closed')}    dimmed />
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
                onClick={() => handleTabChange(tab.id)}
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
                {tab.count != null && tab.count > 0 && (
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

          {/* Search + My Cases toggle */}
          <div className="px-4 pb-3 pt-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search name, email, case #…"
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
            {['COUNSELOR', 'PSYCHOLOGIST'].includes(user?.role?.toUpperCase()) && (
              <button
                onClick={() => { setMyCasesOnly(v => !v); setPage(1); }}
                className="flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-xl transition-all duration-150"
                style={myCasesOnly ? {
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: '1px solid var(--color-primary)',
                } : {
                  background: 'var(--color-bg)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                My Cases
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center h-48 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={15} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
            Loading cases…
          </div>
        ) : cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--color-border)' }}>
              <FolderOpen size={18} style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>No cases found</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {debouncedSearch ? 'No cases match your search.' : 'No cases in this category.'}
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
                  {cases.map((c, i) => {
                    const risk      = c.risk_level?.toUpperCase() || 'GREEN';
                    const statusKey = c.status || c.case_status || '';
                    const riskCfg   = RISK_BADGE[risk] ?? RISK_BADGE['GREEN'];
                    const statusCfg = STATUS_BADGE[statusKey] ?? DEFAULT_BADGE;
                    const isHighRisk = ['RED', 'CRITICAL'].includes(risk);

                    return (
                      <tr
                        key={c._id}
                        className={`transition-colors duration-100 animate-fade-up`}
                        onClick={() => router.push(`/cases/${c._id}`)}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          background: isHighRisk ? 'rgba(220,38,38,0.03)' : 'transparent',
                          animationDelay: `${Math.min(i * 30, 300)}ms`,
                          cursor: 'pointer',
                          boxShadow: `inset 3px 0 0 ${riskCfg.dot}`,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = isHighRisk ? 'rgba(220,38,38,0.06)' : 'var(--color-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = isHighRisk ? 'rgba(220,38,38,0.03)' : 'transparent')}
                      >
                        {/* # */}
                        <td className="px-5 py-4 text-xs tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                          {(page - 1) * PER_PAGE + i + 1}
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

                        {/* Link — stopPropagation prevents double-navigation with the <tr> onClick */}
                        <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
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

            {/* Pagination footer */}
            <div className="flex items-center justify-between px-5 py-3"
              style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {total > 0
                  ? <>{(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of <strong style={{ color: 'var(--color-text-secondary)' }}>{total}</strong> cases</>
                  : 'No cases'}
                {debouncedSearch && <> matching <em>"{debouncedSearch}"</em></>}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading}
                    className="p-1.5 rounded-lg transition disabled:opacity-40"
                    style={{ color: 'var(--color-text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <ChevronLeft size={15} />
                  </button>
                  <span className="text-xs px-2 tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                    {page} / {totalPages}
                  </span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}
                    className="p-1.5 rounded-lg transition disabled:opacity-40"
                    style={{ color: 'var(--color-text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
