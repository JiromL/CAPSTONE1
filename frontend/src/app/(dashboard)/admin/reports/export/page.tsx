"use client";

import { useState, useEffect, useCallback } from 'react';
import { Download, FileSpreadsheet, Users, ClipboardList, Activity, RefreshCw, Loader2 } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

// ─── types ────────────────────────────────────────────────────────────────────

interface SheetMeta {
  id: 'new-clients' | 'counseling-cases' | 'checkins' | 'appointments';
  label: string;
  desc: string;
  icon: React.ReactNode;
  accent: string;
  columns: string[];
}

interface CpsSummary {
  new_clients:      { total: number; this_month: number };
  counseling_cases: { total: number; active: number };
  checkins:         { total_clients: number; checkins_this_month: number };
}

// ─── sheet definitions (columns match PDF templates) ─────────────────────────

const SHEETS: SheetMeta[] = [
  {
    id: 'new-clients',
    label: 'New Clients',
    desc: 'All service requests — Date, Source, Transaction Type, ID, Name, College, Degree Program, Service, Intake Counselor, CC/CP Assigned, Status',
    icon: <Users size={16} />,
    accent: '#166534',
    columns: [
      'Date of Request', 'Time of Request', 'Source', 'Transaction Type',
      'ID Number', 'Last Name', 'First Name', 'College/Unit', 'Degree Program',
      'Service Requested', 'Intake Counselor', 'Action Taken', 'CC Assigned', 'CP Assigned', 'Status',
    ],
  },
  {
    id: 'counseling-cases',
    label: 'Existing Clients for Counseling',
    desc: 'Active counseling caseload — Counselor, Case Number, ID, Client Name, Target Sessions, Current Sessions, Risk Level, Status',
    icon: <ClipboardList size={16} />,
    accent: '#1d4ed8',
    columns: [
      'Counselor', 'Case Number', 'ID Number', 'Client Name',
      'Target No. of Sessions', 'Current No. of Sessions', 'Risk Level', 'Status',
    ],
  },
  {
    id: 'checkins',
    label: 'Non-Counseling Clients (Check-in)',
    desc: 'Check-in-only clients — Counselor, Case Number, ID, Concern, Check-in Type, Last Check-in, Status',
    icon: <Activity size={16} />,
    accent: '#7c3aed',
    columns: [
      'Counselor', 'Case Number', 'ID Number', 'Client Name',
      'Concern', 'Check-in Type', 'Last Check-in', 'Status',
    ],
  },
  {
    id: 'appointments',
    label: 'Appointment Report',
    desc: 'All appointments with student details, counselor, type, method, and status — useful for semester-end reporting',
    icon: <Download size={16} />,
    accent: '#b45309',
    columns: [
      'Date', 'Time', 'Student ID', 'Student Name', 'College', 'Program',
      'Counselor', 'Counselor Role', 'Type', 'Method', 'Status', 'Concern',
    ],
  },
];

// ─── csv helper ───────────────────────────────────────────────────────────────

function toCSV(rows: Record<string, string>[]): string {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  return [
    keys.join(','),
    ...rows.map(r =>
      keys.map(k => {
        const v = String(r[k] ?? '');
        return `"${v.replace(/"/g, '""')}"`;
      }).join(',')
    ),
  ].join('\n');
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── component ────────────────────────────────────────────────────────────────

export default function ExportDataPage() {
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [month, setMonth]       = useState(defaultMonth);
  const [allTime, setAllTime]   = useState(false);
  const [loading, setLoading]   = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);
  const [preview, setPreview]   = useState<{ sheet: string; rows: Record<string, string>[] } | null>(null);
  const [summary, setSummary]   = useState<CpsSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const token = () => localStorage.getItem('token') ?? '';

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const r = await fetch(api('/api/reports/cps-summary'), {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (r.ok) setSummary(await r.json());
    } catch { /* ignore */ }
    setSummaryLoading(false);
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const exportSheet = async (sheetId: string, label: string) => {
    setLoading(sheetId);
    setError(null);
    setSuccess(null);
    setPreview(null);
    try {
      const monthParam = allTime ? '' : `&month=${month}`;
      const url = sheetId === 'appointments'
        ? api(`/api/reports/appointments-csv?${allTime ? '' : `month=${month}`}`)
        : api(`/api/reports/cps-export?sheet=${sheetId}${monthParam}`);
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Export failed.'); return; }

      const rows: Record<string, string>[] = data.rows ?? [];
      if (!rows.length) {
        setSuccess(`No records found for "${label}"${allTime ? '' : ` in ${month}`}.`);
        return;
      }

      const csv = toCSV(rows);
      const suffix = allTime ? 'all-time' : month;
      downloadCSV(csv, `cps-${sheetId}-${suffix}.csv`);
      setSuccess(`Exported ${rows.length} records from "${label}".`);
      setPreview({ sheet: label, rows: rows.slice(0, 5) });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(null);
      setTimeout(() => setSuccess(null), 5000);
    }
  };

  const exportAll = async () => {
    setLoading('all');
    setError(null);
    setSuccess(null);
    setPreview(null);
    try {
      const monthParam = allTime ? '' : `&month=${month}`;
      const r = await fetch(api(`/api/reports/cps-export?sheet=all${monthParam}`), {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Export failed.'); return; }

      const { data: sheets } = data;
      let totalRows = 0;
      const suffix = allTime ? 'all-time' : month;

      for (const [key, rows] of Object.entries(sheets) as [string, Record<string, string>[]][]) {
        if (rows.length) {
          const label = key.replace(/_/g, '-');
          downloadCSV(toCSV(rows), `cps-${label}-${suffix}.csv`);
          totalRows += rows.length;
        }
      }

      if (totalRows === 0) {
        setSuccess('No records found across any sheet.');
      } else {
        setSuccess(`Exported 3 CSV files with ${totalRows} total records.`);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(null);
      setTimeout(() => setSuccess(null), 5000);
    }
  };

  return (
    <DashboardPageWrapper title="CPS Data Export" subtitle="Download CPS tracking spreadsheets matching the three standard templates">

      {/* ── Summary counts ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {summaryLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 animate-pulse h-20" />
          ))
        ) : summary ? (
          <>
            <SummaryCard
              label="New Client Requests"
              primary={summary.new_clients.total}
              sub={`${summary.new_clients.this_month} this month`}
              accent="#166534"
              icon={<Users size={16} />}
            />
            <SummaryCard
              label="Counseling Cases"
              primary={summary.counseling_cases.active}
              sub={`${summary.counseling_cases.total} total`}
              accent="#1d4ed8"
              icon={<ClipboardList size={16} />}
            />
            <SummaryCard
              label="Check-in Clients"
              primary={summary.checkins.total_clients}
              sub={`${summary.checkins.checkins_this_month} check-ins this month`}
              accent="#7c3aed"
              icon={<Activity size={16} />}
            />
          </>
        ) : null}
      </div>

      {/* ── Feedback banners ──────────────────────────────────────────── */}
      {error   && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>}

      {/* ── Date filter ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-5">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Export Filter</p>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
            <input type="checkbox" checked={allTime} onChange={e => setAllTime(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-green-700 cursor-pointer" />
            Export all-time data
          </label>
          {!allTime && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Month:</label>
              <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
          )}
        </div>
      </div>

      {/* ── Export All ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Export All 3 Sheets</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Downloads New Clients, Counseling Cases, and Check-ins as separate CSV files.
            </p>
          </div>
          <button
            onClick={exportAll}
            disabled={loading === 'all'}
            className="flex items-center gap-2 bg-[#2563eb] hover:bg-[#14401f] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 flex-shrink-0"
          >
            {loading === 'all'
              ? <><Loader2 size={14} className="animate-spin" /> Exporting…</>
              : <><FileSpreadsheet size={14} /> Download All</>}
          </button>
        </div>
      </div>

      {/* ── Individual sheets ──────────────────────────────────────────── */}
      <div className="space-y-3 mb-6">
        {SHEETS.map(sheet => (
          <div key={sheet.id}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: sheet.accent + '1a', color: sheet.accent }}>
                  {sheet.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{sheet.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-lg">{sheet.desc}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {sheet.columns.map(col => (
                      <span key={col}
                        className="px-2 py-0.5 rounded text-xs border"
                        style={{ background: sheet.accent + '0d', borderColor: sheet.accent + '33', color: sheet.accent }}>
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => exportSheet(sheet.id, sheet.label)}
                disabled={!!loading}
                className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 flex-shrink-0"
              >
                {loading === sheet.id
                  ? <><Loader2 size={13} className="animate-spin" /> Exporting…</>
                  : <><Download size={13} /> Export CSV</>}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Preview table ──────────────────────────────────────────────── */}
      {preview && preview.rows.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Preview — {preview.sheet} (first 5 rows)
            </p>
            <button onClick={() => setPreview(null)} className="text-xs text-gray-400 hover:text-gray-600">
              Dismiss
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  {Object.keys(preview.rows[0]).map(col => (
                    <th key={col} className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap border-r border-gray-100 dark:border-gray-800 last:border-0">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap border-r border-gray-100 dark:border-gray-800 last:border-0 max-w-[160px] truncate">
                        {val || <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Privacy notice ─────────────────────────────────────────────── */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Data Privacy Notice</p>
        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
          Exported files contain personally identifiable information. Handle in accordance with the Data Privacy Act of 2012 (RA 10173).
          All export actions are recorded in the system audit log. Access is restricted to ADMIN and DPO roles.
        </p>
      </div>

    </DashboardPageWrapper>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  label, primary, sub, accent, icon,
}: {
  label: string; primary: number; sub: string; accent: string; icon: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: accent + '1a', color: accent }}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{primary}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}
