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

const STATUS_CONFIG: Record<string, { cls: string; label: string }> = {
  NEW:         { cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',    label: 'New' },
  COMPLETED:   { cls: 'bg-green-50 text-green-700 ring-1 ring-green-200', label: 'Completed' },
  IN_PROGRESS: { cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', label: 'In Progress' },
  PENDING:     { cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', label: 'Pending' },
  CANCELLED:   { cls: 'bg-red-50 text-red-600 ring-1 ring-red-200',       label: 'Cancelled' },
};

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
  const [userRole] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return JSON.parse(localStorage.getItem('user') || '{}').role || '';
  });
  const [mineOnly, setMineOnly]   = useState(true);

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
      if (r.ok) {
        setPermaLabels((await r.json()).labels || {});
        setPermaError(false);
      } else {
        setPermaError(true);
      }
    } catch {
      setPermaError(true);
    }
  }

  const fetchTotals = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (month)  params.append('month', month);
      if (mineOnly && userRole === 'IC') params.append('mine', 'true');
      const r = await fetch(api(`/api/client-tracking/new-intakes/counts?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      const r = await fetch(api(`/api/client-tracking/new-intakes?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      const items: NewClientIntake[] = d.data || [];
      setIntakes(items);
      setTotal(d.total || 0);
      fetchPermaLabels(items);
    } catch { setError('Failed to load intakes.'); }
    finally { setLoading(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      // Re-fetch all matching records (up to 200) using the same list endpoint as the table
      const params = new URLSearchParams({ page: '1', limit: '200' });
      if (search) params.append('search', search);
      if (month)  params.append('month', month);
      if (statusFilter) params.append('status', statusFilter);
      if (mineOnly && userRole === 'IC') params.append('mine', 'true');
      const r = await fetch(api(`/api/client-tracking/new-intakes?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      const rows = (d.data || []) as NewClientIntake[];
      const fmtService = (v: string) => ({
        personal_counseling: 'Personal Counseling',
        career_counseling: 'Career Counseling',
        group_counseling: 'Group Counseling',
        psychological_testing: 'Psychological Testing',
        consultation: 'Consultation',
      } as Record<string, string>)[v] ?? v ?? '—';
      const fmtSource = (v: string) => ({ online: 'Online', walkin: 'Walk-in' } as Record<string, string>)[v] ?? v ?? '—';
      const fmtTriage = (v: string) => ({
        ENDORSE_CC: 'Endorsed to Counselor',
        ENDORSE_CP: 'Endorsed to Psychologist',
        CLOSE_AT_INTAKE: 'Closed at Intake',
      } as Record<string, string>)[v] ?? (v ? v : '—');
      exportToExcel({
        headers: ['Date', 'Client Name', 'ID Number', 'College/Unit', 'Program', 'Service', 'Source',
          ...(userRole !== 'IC' ? ['IC Assigned'] : []),
          'Packet', 'Triage Decision', 'Status'],
        rows: rows.map(i => [
          fmt(i.created_date),
          i.client_name || '—',
          i.client_id_number || '—',
          i.college_unit || '—',
          i.program || '—',
          fmtService(i.service_requested),
          fmtSource(i.source),
          ...(userRole !== 'IC' ? [i.intake_counselor_name || '—'] : []),
          i.intake_packet_submitted ? 'Ready' : 'Pending',
          fmtTriage((i as any).action_taken),
          i.status || '—',
        ]),
        filename: 'intake-tracker',
        sheetName: 'Intake Tracker',
      });
    } catch (e) {
      console.error('Export failed', e);
    } finally { setExporting(false); }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end   = Math.min(page * PAGE_SIZE, total);

  return (
    <>
    <DashboardPageWrapper title={userRole === 'IC' ? 'Intake Tracker' : 'New Client Intakes'} subtitle="Track and manage new counseling intake requests">

      {/* Summary cards — click to filter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total',       value: totals.total,      icon: ClipboardList, filter: '',            activeRing: 'ring-gray-400',   activeBg: 'bg-gray-50',   activeTxt: 'text-gray-800',   inactTxt: 'text-gray-700' },
          { label: 'New',         value: totals.new,        icon: AlertCircle,   filter: 'NEW',         activeRing: 'ring-blue-400',   activeBg: 'bg-blue-50',   activeTxt: 'text-[#2563eb]',   inactTxt: totals.new > 0 ? 'text-[#2563eb]' : 'text-gray-400' },
          { label: 'In Progress', value: totals.inProgress, icon: Clock,         filter: 'IN_PROGRESS', activeRing: 'ring-amber-400',  activeBg: 'bg-amber-50',  activeTxt: 'text-amber-700',  inactTxt: totals.inProgress > 0 ? 'text-amber-600' : 'text-gray-400' },
          { label: 'Completed',   value: totals.completed,  icon: CheckCircle2,  filter: 'COMPLETED',   activeRing: 'ring-green-400',  activeBg: 'bg-green-50',  activeTxt: 'text-green-700',  inactTxt: 'text-[#2563eb]' },
        ].map(s => {
          const isActive = statusFilter === s.filter;
          return (
            <button key={s.label} type="button"
              onClick={() => { setStatusFilter(s.filter); setPage(1); }}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition w-full
                ${isActive ? `ring-2 ${s.activeRing} border-transparent ${s.activeBg}` : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
              <s.icon size={18} className={isActive ? s.activeTxt : s.inactTxt} />
              <div>
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className={`text-xl font-semibold ${isActive ? s.activeTxt : s.inactTxt}`}>{s.value}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* My / All toggle — OA/Admin only; IC always sees only their own */}
        {userRole !== 'IC' && (
          <div className="flex items-center gap-1 px-5 pt-4 pb-0">
            <button
              onClick={() => { setMineOnly(true); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${mineOnly ? 'bg-[#2563eb] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              My Intakes
            </button>
            <button
              onClick={() => { setMineOnly(false); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${!mineOnly ? 'bg-[#2563eb] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              All Intakes
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-b border-gray-100">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name or ID…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] focus:outline-none"
            />
          </div>
          <input
            type="month" value={month}
            onChange={e => { setMonth(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700 focus:ring-2 focus:ring-[#2563eb]/30 focus:outline-none"
          />
          <button onClick={fetchIntakes} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition" title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white rounded-lg transition disabled:opacity-50 bg-[#2563eb] hover:bg-[#16451f]">
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Export
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 mx-5 my-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-44 gap-2 text-gray-400 text-sm">
            <Loader2 size={16} className="animate-spin" /> Loading intakes…
          </div>
        ) : intakes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <ClipboardList size={18} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">No intakes found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-8">#</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Student</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Service</th>
                    {userRole !== 'IC' && (
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">IC Assigned</th>
                    )}
                    {CPS_ROLES.includes(userRole) && (
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        EMA
                        {permaError && (
                          <span className="ml-1.5 text-[10px] text-amber-500 font-normal normal-case tracking-normal" title="PERMA labels could not be loaded">⚠ unavailable</span>
                        )}
                      </th>
                    )}
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Packet</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {intakes.map((intake, i) => {
                    const sc = STATUS_CONFIG[intake.status] ?? { cls: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200', label: intake.status };
                    return (
                      <tr key={intake._id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">

                        <td className="px-5 py-4 text-gray-400 text-xs">{start + i}.</td>

                        {/* Date */}
                        <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">{fmt(intake.created_date)}</td>

                        {/* Student */}
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900 text-sm">{intake.client_name || '—'}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {intake.client_id_number && (
                              <span className="text-xs text-gray-400 font-mono">{intake.client_id_number}</span>
                            )}
                            {intake.college_unit && (
                              <span className="text-xs text-gray-400 truncate max-w-[120px]">{intake.college_unit}</span>
                            )}
                          </div>
                        </td>

                        {/* Service */}
                        <td className="px-5 py-4">
                          <p className="text-sm text-gray-700 truncate max-w-[160px]">{intake.service_requested || '—'}</p>
                          {intake.source && (
                            <p className="text-xs text-gray-400 mt-0.5">via {intake.source}</p>
                          )}
                        </td>

                        {/* IC Assigned — hidden for IC (it's always them) */}
                        {userRole !== 'IC' && (
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#2563eb]/10 flex items-center justify-center flex-shrink-0">
                                <Users size={11} className="text-[#2563eb]" />
                              </div>
                              <span className="text-sm text-gray-700 truncate max-w-[120px]">
                                {intake.intake_counselor_name || '—'}
                              </span>
                            </div>
                          </td>
                        )}

                        {/* Wellbeing */}
                        {CPS_ROLES.includes(userRole) && (
                          <td className="px-5 py-4">
                            <PermaBadge label={intake.mhbot_username ? (permaLabels[intake.mhbot_username] ?? null) : null} />
                          </td>
                        )}

                        {/* Packet */}
                        <td className="px-5 py-4">
                          {intake.intake_packet_submitted
                            ? <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-green-50 text-green-700 ring-1 ring-green-200">
                                <FileCheck size={11} /> Ready
                              </span>
                            : <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-orange-50 text-orange-600 ring-1 ring-orange-200">
                                <FileX size={11} /> Pending
                              </span>}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${sc.cls}`}>
                            {sc.label}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {intake.case_id
                              ? <Link href={`/cases/${intake.case_id}?tab=intake-summary`}>
                                  <button className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#2563eb] text-white font-medium hover:bg-[#16451f] transition whitespace-nowrap">
                                    {intake.status === 'COMPLETED'
                                      ? <><FileCheck size={12} /> View Form</>
                                      : <><ClipboardEdit size={12} /> Fill IC Form</>}
                                  </button>
                                </Link>
                              : <Link href="/appointment-requests">
                                  <button className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 font-medium hover:bg-gray-50 transition whitespace-nowrap">
                                    Conduct Intake
                                  </button>
                                </Link>}
                            {(intake.intake_packet_submitted || intake.status === 'COMPLETED') && (
                              <button
                                title="Export clinical documentation (PDF)"
                                onClick={() => setExportTarget({ intakeId: intake._id, appointmentId: intake.appointment_id ?? null })}
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-[#2563eb] hover:text-[#2563eb] transition whitespace-nowrap"
                              >
                                <FileText size={12} /> Export
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50/50 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                {total === 0 ? 'No records' : `Showing ${start}–${end} of ${total} intakes`}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-gray-500 px-2">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition">
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
