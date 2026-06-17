'use client';

import { useEffect, useState } from 'react';
import { exportToExcel } from '@/utils/export';
import { api } from '@/utils/api';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { PermaBadge } from '@/components/PendingStudentsWithPerma';
import { Search, Loader2, Download, RefreshCw, AlertCircle, Users, ClipboardList, ChevronLeft, ChevronRight, FileCheck, FileX } from 'lucide-react';

interface NewClientIntake {
  _id: string;
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
}

const CPS_ROLES = ['IC', 'COUNSELOR', 'PSYCHOLOGIST', 'ADMIN', 'DPO'];

const STATUS_BADGE: Record<string, string> = {
  NEW:        'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  COMPLETED:  'bg-green-50 text-green-700 ring-1 ring-green-200',
  IN_PROGRESS:'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  PENDING:    'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  CANCELLED:  'bg-red-50 text-red-600 ring-1 ring-red-200',
};

function fmt(d?: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return d; }
}

const PAGE_SIZE = 10;

export default function NewIntakesPage() {
  const [intakes, setIntakes]   = useState<NewClientIntake[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [month, setMonth]       = useState('');
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [exporting, setExporting] = useState(false);
  const [permaLabels, setPermaLabels] = useState<Record<string, string | null>>({});
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    setUserRole(u.role || '');
  }, []);

  useEffect(() => { fetchIntakes(); }, [search, month, page]);

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
      if (r.ok) setPermaLabels((await r.json()).labels || {});
    } catch {}
  }

  const fetchIntakes = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ page: page.toString(), limit: PAGE_SIZE.toString() });
      if (search) params.append('search', search);
      if (month)  params.append('month', month);
      const r = await fetch(api(`/api/client-tracking/new-intakes?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      const items = d.data || [];
      setIntakes(items);
      setTotal(d.total || 0);
      fetchPermaLabels(items);
    } catch (e) {
      setError('Failed to load intakes.');
    } finally { setLoading(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (month)  params.append('month', month);
      const r = await fetch(api(`/api/client-tracking/export/new-intakes?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      exportToExcel({
        headers: ['Date', 'Client Name', 'ID Number', 'College/Unit', 'Program', 'Service', 'Source', 'Counselor', 'Action Taken', 'Status'],
        rows: (d.data || []).map((i: NewClientIntake) => [
          fmt(i.created_date), i.client_name, i.client_id_number, i.college_unit,
          i.program || '', i.service_requested, i.source, i.intake_counselor_name,
          i.action_taken || '', i.status,
        ]),
        filename: 'new-intakes',
      });
    } catch {} finally { setExporting(false); }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end   = Math.min(page * PAGE_SIZE, total);

  const newCount       = intakes.filter(i => i.status === 'NEW').length;
  const completedCount = intakes.filter(i => i.status === 'COMPLETED').length;

  return (
    <DashboardPageWrapper title="New Client Intakes" subtitle="Track and manage new counseling intake requests">

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <ClipboardList size={18} className="text-gray-500" />
          <div>
            <p className="text-xs text-gray-400">Total (page)</p>
            <p className="text-xl font-semibold text-gray-800">{total}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <AlertCircle size={18} className={newCount > 0 ? 'text-blue-500' : 'text-gray-300'} />
          <div>
            <p className="text-xs text-gray-400">New</p>
            <p className={`text-xl font-semibold ${newCount > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{newCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <Users size={18} className="text-[#1a5228]" />
          <div>
            <p className="text-xs text-gray-400">Completed</p>
            <p className="text-xl font-semibold text-[#1a5228]">{completedCount}</p>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Search + filters header */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-b border-gray-100">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, ID, counselor…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none"
            />
          </div>
          <input
            type="month"
            value={month}
            onChange={e => { setMonth(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700 focus:ring-2 focus:ring-[#1a5228]/30 focus:border-[#1a5228] focus:outline-none"
          />
          <button
            onClick={fetchIntakes}
            className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white rounded-lg transition disabled:opacity-50"
            style={{ backgroundColor: '#1a5228' }}
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 mx-5 my-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Table body */}
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
            <p className="text-xs text-gray-400 mt-1">Try a different search or month filter.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-8">#</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">College / Unit</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Service</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Source</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Counselor</th>
                    {CPS_ROLES.includes(userRole) && (
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Wellbeing</th>
                    )}
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Forms</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {intakes.map((intake, i) => {
                    const badgeCls = STATUS_BADGE[intake.status] ?? 'bg-gray-100 text-gray-500 ring-1 ring-gray-200';
                    return (
                      <tr key={intake._id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                        <td className="px-5 py-4 text-gray-400 text-xs">{start + i}.</td>
                        <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">{fmt(intake.created_date)}</td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900 text-sm">{intake.client_name}</p>
                          {intake.client_id_number && (
                            <p className="text-xs text-gray-400 font-mono">{intake.client_id_number}</p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-xs text-gray-700">{intake.college_unit || '—'}</p>
                          {intake.program && <p className="text-xs text-gray-400">{intake.program}</p>}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600 max-w-[150px]">
                          <p className="truncate">{intake.service_requested || '—'}</p>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">{intake.source || '—'}</td>
                        <td className="px-5 py-4 text-sm text-gray-700">{intake.intake_counselor_name || '—'}</td>
                        {CPS_ROLES.includes(userRole) && (
                          <td className="px-5 py-4">
                            <PermaBadge label={intake.mhbot_username ? (permaLabels[intake.mhbot_username] ?? null) : null} />
                          </td>
                        )}
                        <td className="px-5 py-4">
                          {intake.intake_packet_submitted
                            ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700 ring-1 ring-green-200"><FileCheck size={11} /> Ready</span>
                            : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-orange-50 text-orange-600 ring-1 ring-orange-200"><FileX size={11} /> Pending</span>}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${badgeCls}`}>
                            {intake.status?.replace(/_/g, ' ') || '—'}
                          </span>
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
                {total === 0 ? 'No records' : `Showing ${start}–${end} of ${total}`}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-gray-500 px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
