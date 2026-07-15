'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { exportToExcel } from '@/utils/export';
import { ClinicalExportModal } from '@/components/ClinicalExportModal';
import { api } from '@/utils/api';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { PermaBadge } from '@/components/PendingStudentsWithPerma';
import {
  Search, Loader2, Download, RefreshCw, AlertCircle,
  ClipboardList, ChevronLeft, ChevronRight, FileCheck,
  FileX, ClipboardEdit, Users, CheckCircle2, Clock, FileText,
} from 'lucide-react';

interface NewClientIntake {
  _id: string;
  appointment_id?: string;
  client_name: string;
  client_id_number: string;
  college_unit: string;
  program: string;
  service_requested: string;
  source: string;
  intake_counselor_name: string;
  action_taken: string;
  status: string;
  created_date: string;
  intake_packet_submitted?: boolean;
  mhbot_username?: string;
  case_id?: string;
}

const CPS_ROLES = ['IC', 'COUNSELOR', 'PSYCHOLOGIST', 'ADMIN', 'DPO'];

function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'NEW':         return { background: 'var(--color-primary-surface)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' };
    case 'COMPLETED':   return { background: 'var(--color-success-surface)', color: 'var(--color-success)', border: '1px solid var(--color-success)' };
    case 'IN_PROGRESS':
    case 'PENDING':     return { background: 'var(--color-warning-surface)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)' };
    case 'CANCELLED':   return { background: 'var(--color-danger-surface)',  color: 'var(--color-danger)',  border: '1px solid var(--color-danger)' };
    default:            return { background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' };
  }
}

function statusLabel(status: string) {
  return { NEW: 'New', COMPLETED: 'Completed', IN_PROGRESS: 'In Progress', PENDING: 'Pending', CANCELLED: 'Cancelled' }[status] ?? status;
}

function fmt(d?: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return d; }
}

const PAGE_SIZE = 10;

export default function NewIntakesPage() {
  const [intakes, setIntakes]     = useState<NewClientIntake[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const [month, setMonth]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [totals, setTotals]       = useState({ total: 0, new: 0, inProgress: 0, completed: 0 });
  const [exporting, setExporting] = useState(false);
  const [exportTarget, setExportTarget] = useState<{ intakeId: string; appointmentId: string | null } | null>(null);
  const [permaLabels, setPermaLabels] = useState<Record<string, string | null>>({});
  const [permaError, setPermaError] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [userRole] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return JSON.parse(localStorage.getItem('user') || '{}').role || '';
  });
  const [mineOnly, setMineOnly] = useState(true);

  useEffect(() => { fetchIntakes(); }, [search, month, statusFilter, page, mineOnly]);
  useEffect(() => { fetchTotals(); }, [search, month, mineOnly]);

  async function fetchPermaLabels(items: NewClientIntake[]) {
    const usernames = items.map(i => i.mhbot_username).filter(Boolean) as string[];
    if (!usernames.length) return;
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api('/api/mhbot/batch-labels'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames }),
      });
      if (r.ok) { setPermaLabels((await r.json()).labels || {}); setPermaError(false); }
      else setPermaError(true);
    } catch { setPermaError(true); }
  }

  const fetchTotals = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (month)  params.append('month', month);
      if (mineOnly && userRole === 'IC') params.append('mine', 'true');
      const r = await fetch(api(`/api/client-tracking/new-intakes/counts?${params}`), { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return;
      const d = await r.json();
      setTotals({ total: d.total, new: d.new, inProgress: d.inProgress, completed: d.completed });
    } catch {}
  };

  const fetchIntakes = async () => {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ page: page.toString(), limit: PAGE_SIZE.toString() });
      if (search) params.append('search', search);
      if (month)  params.append('month', month);
      if (statusFilter) params.append('status', statusFilter);
      if (mineOnly && userRole === 'IC') params.append('mine', 'true');
      const r = await fetch(api(`/api/client-tracking/new-intakes?${params}`), { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      const items: NewClientIntake[] = d.data || [];
      setIntakes(items); setTotal(d.total || 0);
      fetchPermaLabels(items);
    } catch { setError('Failed to load intakes.'); }
    finally { setLoading(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ page: '1', limit: '200' });
      if (search) params.append('search', search);
      if (month)  params.append('month', month);
      if (statusFilter) params.append('status', statusFilter);
      if (mineOnly && userRole === 'IC') params.append('mine', 'true');
      const r = await fetch(api(`/api/client-tracking/new-intakes?${params}`), { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      const rows = (d.data || []) as NewClientIntake[];
      const fmtService = (v: string) => ({ personal_counseling: 'Personal Counseling', career_counseling: 'Career Counseling', group_counseling: 'Group Counseling', psychological_testing: 'Psychological Testing', consultation: 'Consultation' } as Record<string,string>)[v] ?? v ?? '—';
      const fmtSource  = (v: string) => ({ online: 'Online', walkin: 'Walk-in' } as Record<string,string>)[v] ?? v ?? '—';
      const fmtTriage  = (v: string) => ({ ENDORSE_CC: 'Endorsed to Counselor', ENDORSE_CP: 'Endorsed to Psychologist', CLOSE_AT_INTAKE: 'Closed at Intake' } as Record<string,string>)[v] ?? (v ? v : '—');
      exportToExcel({
        headers: ['Date','Client Name','ID Number','College/Unit','Program','Service','Source',
          ...(userRole !== 'IC' ? ['IC Assigned'] : []), 'Packet','Triage Decision','Status'],
        rows: rows.map(i => [fmt(i.created_date), i.client_name||'—', i.client_id_number||'—', i.college_unit||'—', i.program||'—', fmtService(i.service_requested), fmtSource(i.source), ...(userRole !== 'IC' ? [i.intake_counselor_name||'—'] : []), i.intake_packet_submitted ? 'Ready' : 'Pending', fmtTriage((i as any).action_taken), i.status||'—']),
        filename: 'intake-tracker', sheetName: 'Intake Tracker',
      });
    } catch {}
    finally { setExporting(false); }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end   = Math.min(page * PAGE_SIZE, total);

  const STAT_CARDS = [
    { label: 'Total',       value: totals.total,      icon: ClipboardList, filter: '' },
    { label: 'New',         value: totals.new,        icon: AlertCircle,   filter: 'NEW',         color: 'var(--color-primary)' },
    { label: 'In Progress', value: totals.inProgress, icon: Clock,         filter: 'IN_PROGRESS', color: 'var(--color-warning)' },
    { label: 'Completed',   value: totals.completed,  icon: CheckCircle2,  filter: 'COMPLETED',   color: 'var(--color-success)' },
  ];

  const TH = ({ children }: { children: React.ReactNode }) => (
    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{children}</th>
  );

  return (
    <>
    <DashboardPageWrapper title={userRole === 'IC' ? 'Intake Tracker' : 'NC Client Tracker'} subtitle="Non-counseling client intake tracking and management">

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {STAT_CARDS.map(s => {
          const isActive = statusFilter === s.filter;
          const color = s.color ?? 'var(--color-text-secondary)';
          return (
            <button key={s.label} type="button"
              onClick={() => { setStatusFilter(s.filter); setPage(1); }}
              className="flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition w-full"
              style={isActive
                ? { borderColor: 'var(--color-primary)', background: 'var(--color-primary-surface)' }
                : { borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = 'var(--color-border)'; }}>
              <s.icon size={18} style={{ color: isActive ? 'var(--color-primary)' : color }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.label}</p>
                <p className="text-xl font-semibold" style={{ color: isActive ? 'var(--color-primary)' : color }}>{s.value}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Table card */}
      <div className="rounded-xl border shadow-card overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

        {/* My / All toggle */}
        {userRole !== 'IC' && (
          <div className="flex items-center gap-1 px-5 pt-4 pb-0">
            {[{ label: 'My Intakes', val: true }, { label: 'All Intakes', val: false }].map(t => (
              <button key={t.label} onClick={() => { setMineOnly(t.val); setPage(1); }}
                className="px-4 py-1.5 rounded-full text-xs font-semibold transition"
                style={mineOnly === t.val
                  ? { background: 'var(--color-primary)', color: 'white' }
                  : { background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}
                onMouseEnter={e => { if (mineOnly !== t.val) e.currentTarget.style.background = 'var(--color-border)'; }}
                onMouseLeave={e => { if (mineOnly !== t.val) e.currentTarget.style.background = 'var(--color-bg)'; }}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name or ID…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg outline-none transition"
              style={{ background: 'var(--color-bg)', border: `1px solid ${searchFocused ? 'var(--color-primary)' : 'var(--color-border)'}`, color: 'var(--color-text-primary)' }}
              onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
          </div>
          <input type="month" value={month} onChange={e => { setMonth(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm rounded-lg outline-none"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
          <button onClick={fetchIntakes} title="Refresh"
            className="p-2 border rounded-lg transition"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <RefreshCw size={14} />
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white rounded-lg transition disabled:opacity-50 hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}>
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Export
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 mx-5 my-3 rounded-xl px-4 py-3 text-sm border"
            style={{ background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-44 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading intakes…
          </div>
        ) : intakes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 text-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--color-bg)' }}>
              <ClipboardList size={18} style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>No intakes found</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                  <tr>
                    <TH>#</TH><TH>Date</TH><TH>Student</TH><TH>Service</TH>
                    {userRole !== 'IC' && <TH>IC Assigned</TH>}
                    {CPS_ROLES.includes(userRole) && (
                      <TH>EMA {permaError && <span className="ml-1 text-[10px] font-normal normal-case tracking-normal" style={{ color: 'var(--color-warning)' }}>⚠ unavailable</span>}</TH>
                    )}
                    <TH>Packet</TH><TH>Status</TH><TH>Action</TH>
                  </tr>
                </thead>
                <tbody>
                  {intakes.map((intake, i) => (
                    <tr key={intake._id}
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td className="px-5 py-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>{start + i}.</td>
                      <td className="px-5 py-4 whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>{fmt(intake.created_date)}</td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{intake.client_name || '—'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {intake.client_id_number && <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{intake.client_id_number}</span>}
                          {intake.college_unit && <span className="text-xs truncate max-w-[120px]" style={{ color: 'var(--color-text-muted)' }}>{intake.college_unit}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm truncate max-w-[160px]" style={{ color: 'var(--color-text-secondary)' }}>{intake.service_requested || '—'}</p>
                        {intake.source && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>via {intake.source}</p>}
                      </td>
                      {userRole !== 'IC' && (
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: 'var(--color-primary-surface)' }}>
                              <Users size={11} style={{ color: 'var(--color-primary)' }} />
                            </div>
                            <span className="text-sm truncate max-w-[120px]" style={{ color: 'var(--color-text-secondary)' }}>
                              {intake.intake_counselor_name || '—'}
                            </span>
                          </div>
                        </td>
                      )}
                      {CPS_ROLES.includes(userRole) && (
                        <td className="px-5 py-4">
                          <PermaBadge label={intake.mhbot_username ? (permaLabels[intake.mhbot_username] ?? null) : null} />
                        </td>
                      )}
                      <td className="px-5 py-4">
                        {intake.intake_packet_submitted
                          ? <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium"
                              style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)', border: '1px solid var(--color-success)' }}>
                              <FileCheck size={11} /> Ready
                            </span>
                          : <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium"
                              style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)' }}>
                              <FileX size={11} /> Pending
                            </span>}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium" style={statusStyle(intake.status)}>
                          {statusLabel(intake.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {intake.case_id
                            ? <Link href={`/cases/${intake.case_id}?tab=intake-summary`}>
                                <button className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white font-medium transition hover:opacity-90 whitespace-nowrap"
                                  style={{ background: 'var(--color-primary)' }}>
                                  {intake.status === 'COMPLETED'
                                    ? <><FileCheck size={12} /> View Form</>
                                    : <><ClipboardEdit size={12} /> Fill IC Form</>}
                                </button>
                              </Link>
                            : <Link href="/appointment-requests">
                                <button className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition whitespace-nowrap"
                                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                  Conduct Intake
                                </button>
                              </Link>}
                          {(intake.intake_packet_submitted || intake.status === 'COMPLETED') && (
                            <button title="Export clinical documentation (PDF)"
                              onClick={() => setExportTarget({ intakeId: intake._id, appointmentId: intake.appointment_id ?? null })}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition whitespace-nowrap"
                              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                              <FileText size={12} /> Export
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3" style={{ background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {total === 0 ? 'No records' : `Showing ${start}–${end} of ${total} intakes`}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg border transition disabled:opacity-40"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => { if (page > 1) e.currentTarget.style.background = 'var(--color-bg)'; }}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs px-2" style={{ color: 'var(--color-text-muted)' }}>Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border transition disabled:opacity-40"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => { if (page < totalPages) e.currentTarget.style.background = 'var(--color-bg)'; }}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardPageWrapper>

    {exportTarget && (
      <ClinicalExportModal
        intakeId={exportTarget.intakeId}
        appointmentId={exportTarget.appointmentId}
        onClose={() => setExportTarget(null)}
      />
    )}
    </>
  );
}
