"use client";

import { useState, useEffect, useCallback } from 'react';
import { Download, FileSpreadsheet, Users, ClipboardList, Activity, Loader2 } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface SheetMeta {
  id: 'new-clients' | 'counseling-cases' | 'checkins' | 'appointments';
  label: string; desc: string; icon: React.ReactNode; accent: string; columns: string[];
}
interface CpsSummary {
  new_clients:      { total: number; this_month: number };
  counseling_cases: { total: number; active: number };
  checkins:         { total_clients: number; checkins_this_month: number };
}

const SHEETS: SheetMeta[] = [
  {
    id: 'new-clients', label: 'New Clients', accent: '#166534',
    desc: 'All service requests — Date, Source, Transaction Type, ID, Name, College, Degree Program, Service, Intake Counselor, CC/CP Assigned, Status',
    icon: <Users size={16} />,
    columns: ['Date of Request','Time of Request','Source','Transaction Type','ID Number','Last Name','First Name','College/Unit','Degree Program','Service Requested','Intake Counselor','Action Taken','CC Assigned','CP Assigned','Status'],
  },
  {
    id: 'counseling-cases', label: 'Existing Clients for Counseling', accent: '#1d4ed8',
    desc: 'Active counseling caseload — Counselor, Case Number, ID, Client Name, Target Sessions, Current Sessions, Risk Level, Status',
    icon: <ClipboardList size={16} />,
    columns: ['Counselor','Case Number','ID Number','Client Name','Target No. of Sessions','Current No. of Sessions','Risk Level','Status'],
  },
  {
    id: 'checkins', label: 'Non-Counseling Clients (Check-in)', accent: '#7c3aed',
    desc: 'Check-in-only clients — Counselor, Case Number, ID, Concern, Check-in Type, Last Check-in, Status',
    icon: <Activity size={16} />,
    columns: ['Counselor','Case Number','ID Number','Client Name','Concern','Check-in Type','Last Check-in','Status'],
  },
  {
    id: 'appointments', label: 'Appointment Report', accent: '#b45309',
    desc: 'All appointments with student details, counselor, type, method, and status — useful for semester-end reporting',
    icon: <Download size={16} />,
    columns: ['Date','Time','Student ID','Student Name','College','Program','Counselor','Counselor Role','Type','Method','Status','Concern'],
  },
];

function toCSV(rows: Record<string, string>[]): string {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  return [keys.join(','), ...rows.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
}
function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function SummaryCard({ label, primary, sub, accent, icon }: { label: string; primary: number; sub: string; accent: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: accent + '1a', color: accent }}>{icon}</div>
      <div>
        <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
        <p className="text-2xl font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>{primary}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>
      </div>
    </div>
  );
}

export default function ExportDataPage() {
  const today        = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [month, setMonth]               = useState(defaultMonth);
  const [allTime, setAllTime]           = useState(false);
  const [loading, setLoading]           = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [success, setSuccess]           = useState<string | null>(null);
  const [preview, setPreview]           = useState<{ sheet: string; rows: Record<string, string>[] } | null>(null);
  const [summary, setSummary]           = useState<CpsSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const token = () => localStorage.getItem('token') ?? '';

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const r = await fetch(api('/api/reports/cps-summary'), { headers: { Authorization: `Bearer ${token()}` } });
      if (r.ok) setSummary(await r.json());
    } catch { /* ignore */ }
    setSummaryLoading(false);
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const exportSheet = async (sheetId: string, label: string) => {
    setLoading(sheetId); setError(null); setSuccess(null); setPreview(null);
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
        setSuccess(`No records found for "${label}"${allTime ? '' : ` in ${month}`}.`); return;
      }
      downloadCSV(toCSV(rows), `cps-${sheetId}-${allTime ? 'all-time' : month}.csv`);
      setSuccess(`Exported ${rows.length} records from "${label}".`);
      setPreview({ sheet: label, rows: rows.slice(0, 5) });
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(null); setTimeout(() => setSuccess(null), 5000); }
  };

  const exportAll = async () => {
    setLoading('all'); setError(null); setSuccess(null); setPreview(null);
    try {
      const monthParam = allTime ? '' : `&month=${month}`;
      const r = await fetch(api(`/api/reports/cps-export?sheet=all${monthParam}`), { headers: { Authorization: `Bearer ${token()}` } });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Export failed.'); return; }
      const { data: sheets } = data;
      let totalRows = 0;
      const suffix = allTime ? 'all-time' : month;
      for (const [key, rows] of Object.entries(sheets) as [string, Record<string, string>[]][]) {
        if (rows.length) { downloadCSV(toCSV(rows), `cps-${key.replace(/_/g, '-')}-${suffix}.csv`); totalRows += rows.length; }
      }
      setSuccess(totalRows === 0 ? 'No records found across any sheet.' : `Exported 3 CSV files with ${totalRows} total records.`);
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(null); setTimeout(() => setSuccess(null), 5000); }
  };

  return (
    <DashboardPageWrapper title="CPS Data Export" subtitle="Download CPS tracking spreadsheets matching the three standard templates">

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {summaryLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl h-20 animate-pulse" style={{ background: 'var(--color-border)' }} />
            ))
          : summary ? (
            <>
              <SummaryCard label="New Client Requests"  primary={summary.new_clients.total}        sub={`${summary.new_clients.this_month} this month`}             accent="#166534" icon={<Users size={16}/>} />
              <SummaryCard label="Counseling Cases"     primary={summary.counseling_cases.active}  sub={`${summary.counseling_cases.total} total`}                   accent="#1d4ed8" icon={<ClipboardList size={16}/>} />
              <SummaryCard label="Check-in Clients"     primary={summary.checkins.total_clients}   sub={`${summary.checkins.checkins_this_month} check-ins this month`} accent="#7c3aed" icon={<Activity size={16}/>} />
            </>
          ) : null}
      </div>

      {error   && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'var(--color-danger-surface)',  border: '1px solid var(--color-danger)',   color: 'var(--color-danger)'   }}>{error}</div>}
      {success && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)', color: 'var(--color-success)' }}>{success}</div>}

      <div className="rounded-xl p-5 mb-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Export Filter</p>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: 'var(--color-text-secondary)' }}>
            <input type="checkbox" checked={allTime} onChange={e => setAllTime(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer" />
            Export all-time data
          </label>
          {!allTime && (
            <div className="flex items-center gap-2">
              <label className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Month:</label>
              <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg outline-none"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl p-5 mb-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Export All 3 Sheets</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              Downloads New Clients, Counseling Cases, and Check-ins as separate CSV files.
            </p>
          </div>
          <button onClick={exportAll} disabled={loading === 'all'}
            className="flex items-center gap-2 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 flex-shrink-0"
            style={{ background: 'var(--color-primary)' }}>
            {loading === 'all'
              ? <><Loader2 size={14} className="animate-spin" /> Exporting…</>
              : <><FileSpreadsheet size={14} /> Download All</>}
          </button>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {SHEETS.map(sheet => (
          <div key={sheet.id} className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: sheet.accent + '1a', color: sheet.accent }}>
                  {sheet.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{sheet.label}</p>
                  <p className="text-xs mt-0.5 max-w-lg" style={{ color: 'var(--color-text-secondary)' }}>{sheet.desc}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {sheet.columns.map(col => (
                      <span key={col} className="px-2 py-0.5 rounded text-xs"
                        style={{ background: sheet.accent + '0d', border: `1px solid ${sheet.accent}33`, color: sheet.accent }}>
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => exportSheet(sheet.id, sheet.label)} disabled={!!loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 flex-shrink-0"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                {loading === sheet.id
                  ? <><Loader2 size={13} className="animate-spin" /> Exporting…</>
                  : <><Download size={13} /> Export CSV</>}
              </button>
            </div>
          </div>
        ))}
      </div>

      {preview && preview.rows.length > 0 && (
        <div className="rounded-xl overflow-hidden mb-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Preview — {preview.sheet} (first 5 rows)
            </p>
            <button onClick={() => setPreview(null)} className="text-xs hover:underline" style={{ color: 'var(--color-text-muted)' }}>Dismiss</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead style={{ background: 'var(--color-bg)' }}>
                <tr>
                  {Object.keys(preview.rows[0]).map(col => (
                    <th key={col} className="px-3 py-2 text-left font-medium whitespace-nowrap"
                      style={{ color: 'var(--color-text-secondary)', borderRight: '1px solid var(--color-border)' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-3 py-2 whitespace-nowrap max-w-[160px] truncate"
                        style={{ color: 'var(--color-text-secondary)', borderRight: '1px solid var(--color-border)' }}>
                        {val || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-xl p-4"
        style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--color-warning-text)' }}>Data Privacy Notice</p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-warning-text)' }}>
          Exported files contain personally identifiable information. Handle in accordance with the Data Privacy Act of 2012 (RA 10173).
          All export actions are recorded in the system audit log. Access is restricted to ADMIN and DPO roles.
        </p>
      </div>

    </DashboardPageWrapper>
  );
}
