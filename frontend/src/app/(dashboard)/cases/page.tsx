'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { PermaBadge } from '@/components/PendingStudentsWithPerma';
import { Search, Loader2, AlertCircle, ChevronRight, Users, FolderOpen, ShieldAlert, FolderX } from 'lucide-react';

const RISK_BADGE: Record<string, string> = {
  GREEN:    'bg-green-50 text-green-700 ring-1 ring-green-200',
  YELLOW:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  RED:      'bg-red-50 text-red-700 ring-1 ring-red-200',
  CRITICAL: 'bg-red-100 text-red-900 ring-1 ring-red-300 font-semibold',
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:               'bg-green-50 text-green-700 ring-1 ring-green-200',
  NEW:                  'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  INTAKE_SCHEDULED:     'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  PENDING_TERMINATION:  'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  CLOSED:               'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
  CANCELLED:            'bg-red-50 text-red-600 ring-1 ring-red-200',
  open:                 'bg-green-50 text-green-700 ring-1 ring-green-200',
  closed:               'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
  intake_scheduled:     'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
};

const CLIENT_STATUS_BADGE: Record<string, string> = {
  ACTIVE:                 'bg-green-50 text-green-700 ring-1 ring-green-200',
  CHECK_IN_ONLY:          'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  WITH_MH_CHECK_IN:       'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  UNDER_ACCOMMODATION:    'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  TERMINATION_PENDING:    'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  INACTIVE:               'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
};

function fmt(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtLabel(s?: string) {
  if (!s) return '—';
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function CasesPage() {
  const [user, setUser]         = useState<any>(null);
  const [cases, setCases]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]       = useState('');
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
      } catch (e) {
        setError('Failed to load cases.');
        const cached = localStorage.getItem('cases_cache');
        if (cached) try { setCases(JSON.parse(cached)); } catch {}
      } finally { setLoading(false); }
    };
    load();
  }, [user]);

  const title = (() => {
    switch (user?.role?.toUpperCase()) {
      case 'COUNSELOR':     return 'My Client Cases';
      case 'PSYCHOLOGIST':  return 'Clinical Cases';
      case 'ADMIN':         return 'All Cases';
      case 'DPO':           return 'Case Oversight';
      case 'IC':            return 'Intake Cases';
      default:              return 'Cases';
    }
  })();

  const filtered = cases.filter(c => {
    const status  = (c.status || c.case_status || '').toUpperCase();
    const risk    = (c.risk_level || '').toUpperCase();
    const t       = search.toLowerCase();

    const matchTab = (() => {
      switch (activeTab) {
        case 'active':    return ['ACTIVE', 'NEW', 'INTAKE_SCHEDULED'].includes(status);
        case 'attention': return status === 'PENDING_TERMINATION';
        case 'high-risk': return ['RED', 'CRITICAL'].includes(risk);
        case 'closed':    return ['CLOSED', 'CANCELLED'].includes(status);
        default:          return true;
      }
    })();

    const matchSearch = !t || [c.student_name, c.student_email, c.chief_complaint, c.presenting_issue, c.case_number, c._id]
      .some(v => v?.toLowerCase().includes(t));

    return matchTab && matchSearch;
  });

  const highRisk = cases.filter(c => ['RED', 'CRITICAL'].includes(c.risk_level?.toUpperCase())).length;
  const openCount = cases.filter(c => ['open', 'ACTIVE', 'NEW', 'INTAKE_SCHEDULED'].includes(c.status)).length;
  const closedCount = cases.filter(c => ['closed', 'CLOSED'].includes(c.status)).length;

  return (
    <DashboardPageWrapper title={title} subtitle="Manage and track student cases">

      {/* Summary strip — click to filter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {([
          { label: 'Total Cases', value: cases.length, icon: Users,       cls: 'text-gray-800',                                  tab: 'all'       as const },
          { label: 'Open',        value: openCount,    icon: FolderOpen,  cls: 'text-[#2563eb]',                                 tab: 'active'    as const },
          { label: 'High Risk',   value: highRisk,     icon: ShieldAlert, cls: highRisk > 0 ? 'text-red-600' : 'text-gray-400', tab: 'high-risk' as const },
          { label: 'Closed',      value: closedCount,  icon: FolderX,     cls: 'text-gray-400',                                  tab: 'closed'    as const },
        ]).map(s => (
          <button key={s.label} onClick={() => setActiveTab(s.tab)}
            className={`bg-white rounded-2xl border shadow-sm px-4 py-3 flex items-center gap-3 text-left w-full transition-all hover:shadow-md ${
              activeTab === s.tab ? 'border-[#2563eb]/40 ring-1 ring-[#2563eb]/20' : 'border-gray-100 hover:border-gray-200'
            }`}>
            <s.icon size={18} className={s.cls} />
            <div>
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className={`text-xl font-semibold ${s.cls}`}>{s.value}</p>
            </div>
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Table card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Tab bar + search */}
        <div className="border-b border-gray-100">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 pt-3 overflow-x-auto">
            {([
              { id: 'all',       label: 'All',              count: cases.length },
              { id: 'active',    label: 'Active',            count: cases.filter(c => ['ACTIVE','NEW','INTAKE_SCHEDULED'].includes((c.status||c.case_status||'').toUpperCase())).length },
              { id: 'attention', label: 'Needs Attention',   count: cases.filter(c => (c.status||c.case_status||'').toUpperCase()==='PENDING_TERMINATION').length },
              { id: 'high-risk', label: 'High Risk',         count: cases.filter(c => ['RED','CRITICAL'].includes((c.risk_level||'').toUpperCase())).length },
              { id: 'closed',    label: 'Closed',            count: cases.filter(c => ['CLOSED','CANCELLED'].includes((c.status||c.case_status||'').toUpperCase())).length },
            ] as const).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#2563eb] text-[#2563eb]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {tab.label}
                {tab.count > 0 && (
                  <span className={`min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold ${
                    activeTab === tab.id ? 'bg-[#2563eb] text-white' : 'bg-gray-100 text-gray-500'
                  }`}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="px-4 pb-3 pt-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, issue, case #…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-44 gap-2 text-gray-400 text-sm">
            <Loader2 size={16} className="animate-spin" /> Loading cases…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <FolderOpen size={18} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">No cases found</p>
            <p className="text-xs text-gray-400 mt-1">
              {search
                ? 'No cases match your search.'
                : activeTab === 'active'    ? 'No active cases.'
                : activeTab === 'attention' ? 'No cases need attention.'
                : activeTab === 'high-risk' ? 'No high-risk cases at this time.'
                : activeTab === 'closed'    ? 'No closed cases.'
                : 'No cases found.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-8">#</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Student</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Case #</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Chief Complaint</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Risk</th>
                    {!['STAFF'].includes(user?.role?.toUpperCase()) && (
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Wellbeing</th>
                    )}
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Created</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => {
                    const risk = c.risk_level?.toUpperCase() || 'GREEN';
                    const statusKey = c.status || c.case_status || '';
                    const riskCls = RISK_BADGE[risk] ?? 'bg-gray-100 text-gray-500 ring-1 ring-gray-200';
                    const statusCls = STATUS_BADGE[statusKey] ?? 'bg-gray-100 text-gray-500 ring-1 ring-gray-200';
                    const isHighRisk = ['RED', 'CRITICAL'].includes(risk);
                    return (
                      <tr key={c._id}
                        className={`border-b border-gray-50 transition-colors ${isHighRisk ? 'bg-red-50/30 hover:bg-red-50/60' : 'hover:bg-gray-50/80'}`}>
                        <td className="px-5 py-4 text-gray-400 text-xs">{i + 1}.</td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900 text-sm">{c.student_name || 'Unknown'}</p>
                          {c.student_email && <p className="text-xs text-gray-400">{c.student_email}</p>}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-gray-500">
                          {c.case_number || c.counseling_id || c._id?.slice(-8).toUpperCase()}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600 max-w-[200px]">
                          <p className="truncate">{c.chief_complaint || c.presenting_issue || '—'}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${statusCls}`}>
                            {fmtLabel(statusKey)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${riskCls}`}>
                            {risk}
                          </span>
                        </td>
                        {!['STAFF'].includes(user?.role?.toUpperCase()) && (
                          <td className="px-5 py-4">
                            <PermaBadge label={c.mhbot_username ? (permaLabels[c.mhbot_username] ?? null) : null} />
                          </td>
                        )}
                        <td className="px-5 py-4 text-sm text-gray-400 whitespace-nowrap">{fmt(c.created_at)}</td>
                        <td className="px-5 py-4">
                          <Link href={`/cases/${c._id}`}>
                            <button className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
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
            <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100">
              <p className="text-xs text-gray-400">Showing {filtered.length} of {cases.length} cases</p>
            </div>
          </>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
