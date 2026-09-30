'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { exportToExcel } from '@/utils/export';
import { api } from '@/utils/api';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { Search, Download, RefreshCw, Loader2, FolderOpen, ChevronLeft, ChevronRight } from 'lucide-react';

interface CounselingCase {
  _id: string;
  case_number: string;
  client_name: string;
  client_id_number: string;
  counselor_id: string;
  target_sessions: number;
  current_sessions: number;
  status: string;
  created_date: string;
}

function caseStatusStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'Active':           return { background: 'var(--color-success-surface)', color: 'var(--color-success)', border: '1px solid var(--color-success)' };
    case 'for Termination':  return { background: 'var(--color-danger-surface)',  color: 'var(--color-danger)',  border: '1px solid var(--color-danger)' };
    default:                 return { background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' };
  }
}

const IC = 'input';
const IC_S = (f: boolean): React.CSSProperties => ({
  background: 'var(--color-bg)',
  border: `1px solid ${f ? 'var(--color-primary)' : 'var(--color-border)'}`,
  color: 'var(--color-text-primary)',
});

export default function CounselingCasesPage() {
  const router = useRouter();
  const [cases, setCases]   = useState<CounselingCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [month, setMonth]   = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage]     = useState(1);
  const [total, setTotal]   = useState(0);
  const [fSearch, setFSearch] = useState(false);
  const [pageInput, setPageInput] = useState('1');

  useEffect(() => { fetchCounselingCases(); }, [search, month, status, page]);
  useEffect(() => { setPageInput(String(page)); }, [page]);

  const fetchCounselingCases = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ page: page.toString(), limit: '10' });
      if (search) params.append('search', search);
      if (month)  params.append('month', month);
      if (status) params.append('status', status);
      const r = await fetch(api(`/api/client-tracking/counseling-cases?${params}`), { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setCases(d.data || []); setTotal(d.total || 0);
    } catch {} finally { setLoading(false); }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (month)  params.append('month', month);
      if (status) params.append('status', status);
      const r = await fetch(api(`/api/client-tracking/export/counseling-cases?${params}`), { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      exportToExcel({
        headers: ['Case Number','Client Name','ID Number','Target Sessions','Current Sessions','Status','Date Created'],
        rows: (d.data || []).map((c: CounselingCase) => [c.case_number, c.client_name, c.client_id_number, c.target_sessions, c.current_sessions, c.status, new Date(c.created_date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })]),
        filename: 'counseling-cases',
      });
    } catch {}
  };

  const TH = ({ children }: { children: React.ReactNode }) => (
    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{children}</th>
  );

  const totalPages = Math.max(1, Math.ceil(total / 10));
  const start = total === 0 ? 0 : (page - 1) * 10 + 1;
  const end   = Math.min(page * 10, total);

  const goToPage = (val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) setPage(n);
    else setPageInput(String(page));
  };

  return (
    <DashboardPageWrapper title="Counseling Cases" subtitle="Track existing clients for ongoing counseling with session metrics">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Filters */}
        <div className="border rounded-xl shadow-card p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="field-label">Search</label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                <input type="text" placeholder="Name, ID, or Case #…" value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg outline-none transition"
                  style={{ background: 'var(--color-bg)', border: `1px solid ${fSearch ? 'var(--color-primary)' : 'var(--color-border)'}`, color: 'var(--color-text-primary)' }}
                  onFocus={() => setFSearch(true)} onBlur={() => setFSearch(false)} />
              </div>
            </div>
            <div>
              <label className="field-label">Status</label>
              <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
                className={IC} style={IC_S(false)}>
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="for Termination">For Termination</option>
              </select>
            </div>
            <div>
              <label className="field-label">Month</label>
              <input type="month" value={month} onChange={e => { setMonth(e.target.value); setPage(1); }}
                className={IC} style={IC_S(false)} />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={fetchCounselingCases}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-white rounded-lg transition hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                <RefreshCw size={13} /> Refresh
              </button>
              <button onClick={handleExport}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-white rounded-lg transition hover:opacity-90"
                style={{ background: 'var(--color-success)' }}>
                <Download size={13} /> Export
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-44 gap-2" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
          </div>
        ) : (
          <div className="border rounded-xl shadow-card overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                  <tr>
                    <TH>Case Number</TH><TH>Client Name</TH><TH>ID Number</TH>
                    <TH>Sessions</TH><TH>Progress</TH><TH>Status</TH><TH>Date Created</TH>
                  </tr>
                </thead>
                <tbody>
                  {cases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <FolderOpen size={28} className="mx-auto mb-3" style={{ color: 'var(--color-border)' }} />
                        <p style={{ color: 'var(--color-text-muted)' }}>No records found</p>
                      </td>
                    </tr>
                  ) : cases.map(c => {
                    const pct = c.target_sessions > 0 ? Math.round((c.current_sessions / c.target_sessions) * 100) : 0;
                    return (
                      <tr key={c._id} className="cursor-pointer transition"
                        style={{ borderBottom: '1px solid var(--color-border)' }}
                        onClick={() => router.push(`/cases/${c._id}`)}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td className="px-6 py-3 font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>{c.case_number}</td>
                        <td className="px-6 py-3" style={{ color: 'var(--color-text-primary)' }}>{c.client_name}</td>
                        <td className="px-6 py-3" style={{ color: 'var(--color-text-secondary)' }}>{c.client_id_number}</td>
                        <td className="px-6 py-3" style={{ color: 'var(--color-text-secondary)' }}>{c.current_sessions} / {c.target_sessions}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                              <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: 'var(--color-primary)' }} />
                            </div>
                            <span className="text-xs font-medium w-8" style={{ color: 'var(--color-text-muted)' }}>{pct}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="px-3 py-1 rounded-full text-xs font-medium" style={caseStatusStyle(c.status)}>{c.status}</span>
                        </td>
                        <td className="px-6 py-3" style={{ color: 'var(--color-text-secondary)' }}>{new Date(c.created_date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {total === 0 ? 'No records' : `Showing ${start}–${end} of ${total}`}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="p-1.5 rounded-lg border transition disabled:opacity-50"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => { if (page > 1) e.currentTarget.style.background = 'var(--color-bg)'; }}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <ChevronLeft size={14} />
                </button>
                <div className="flex items-center gap-1 text-xs tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                  <input
                    type="number" min={1} max={totalPages}
                    value={pageInput}
                    onChange={e => setPageInput(e.target.value)}
                    onBlur={() => goToPage(pageInput)}
                    onKeyDown={e => { if (e.key === 'Enter') goToPage(pageInput); }}
                    className="text-center rounded-lg outline-none tabular-nums"
                    style={{ width: '2.5rem', padding: '2px 4px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: '0.75rem' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                    onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                  />
                  <span style={{ color: 'var(--color-text-muted)' }}>/ {totalPages}</span>
                </div>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border transition disabled:opacity-50"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => { if (page < totalPages) e.currentTarget.style.background = 'var(--color-bg)'; }}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
