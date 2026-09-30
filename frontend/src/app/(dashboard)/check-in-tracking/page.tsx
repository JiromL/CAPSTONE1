'use client';

import { useEffect, useState } from 'react';
import { exportToExcel } from '@/utils/export';
import { api } from '@/utils/api';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';

interface NonCounselingClient {
  _id: string;
  case_number: string;
  client_name: string;
  client_id_number: string;
  concern: string;
  counselor_id: string;
  status: string;
  created_date: string;
}

interface CounselingCheckIn {
  case_id: string;
  student_name: string;
  student_id: string;
  client_status: string;
  primary_concern: string;
  days_since_last_check_in: number | null;
  is_overdue: boolean;
  last_check_in_date: string | null;
  next_check_in_date: string | null;
}

const IC = 'input';
const IC_S: React.CSSProperties = { border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' };
const onFIn  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-surface)'; };
const onFOut = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; };

export default function CheckInTrackingPage() {
  const [activeTab, setActiveTab] = useState<'counseling' | 'non-counseling'>('counseling');

  const [ncClients, setNcClients] = useState<NonCounselingClient[]>([]);
  const [ncTotal, setNcTotal] = useState(0);
  const [ncPage, setNcPage] = useState(1);
  const [ncSearch, setNcSearch] = useState('');
  const [ncConcern, setNcConcern] = useState('');
  const [ncStatus, setNcStatus] = useState('');
  const [ncMonth, setNcMonth] = useState('');
  const [ncLoading, setNcLoading] = useState(false);

  const [ccClients, setCcClients] = useState<CounselingCheckIn[]>([]);
  const [ccOverdue, setCcOverdue] = useState(0);
  const [ccLoading, setCcLoading] = useState(false);
  const [ccError, setCcError] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => { fetchNonCounseling(); }, [ncSearch, ncConcern, ncStatus, ncMonth, ncPage]);
  useEffect(() => { fetchCounselingCheckIns(); }, []);

  const fetchNonCounseling = async () => {
    setNcLoading(true);
    try {
      const params = new URLSearchParams({ page: ncPage.toString(), limit: '10' });
      if (ncSearch) params.append('search', ncSearch);
      if (ncMonth) params.append('month', ncMonth);
      if (ncConcern) params.append('concern', ncConcern);
      if (ncStatus) params.append('status', ncStatus);
      const res = await fetch(api(`/api/client-tracking/check-ins?${params}`), { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setNcClients(data.data || []); setNcTotal(data.total || 0);
    } catch {}
    finally { setNcLoading(false); }
  };

  const fetchCounselingCheckIns = async () => {
    setCcLoading(true); setCcError('');
    try {
      const res = await fetch(api('/api/check-ins/list'), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { setCcError('Failed to load counseling check-ins.'); return; }
      const data = await res.json();
      setCcClients(data.check_ins || []); setCcOverdue(data.overdue_count || 0);
    } catch { setCcError('Network error loading counseling check-ins.'); }
    finally { setCcLoading(false); }
  };

  const handleExportNc = async () => {
    try {
      const params = new URLSearchParams();
      if (ncSearch) params.append('search', ncSearch);
      if (ncMonth) params.append('month', ncMonth);
      if (ncConcern) params.append('concern', ncConcern);
      if (ncStatus) params.append('status', ncStatus);
      const res = await fetch(api(`/api/client-tracking/export/check-ins?${params}`), { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const rows = (data.data || []).map((c: NonCounselingClient) => [
        c.case_number, c.client_name, c.client_id_number, c.concern, c.status,
        new Date(c.created_date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }),
      ]);
      exportToExcel({ headers: ['Case Number', 'Client Name', 'ID Number', 'Concern', 'Status', 'Date Created'], rows, filename: 'non-counseling-check-ins' });
    } catch {}
  };

  const tabs = [
    { id: 'counseling' as const,    label: 'Counseling (Check-In Status)', count: ccClients.length, overdue: ccOverdue },
    { id: 'non-counseling' as const, label: 'Non-Counseling Clients',       count: ncTotal },
  ];

  const TH = ({ children }: { children: React.ReactNode }) => (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{children}</th>
  );

  return (
    <DashboardPageWrapper title="Check-In Tracking" subtitle="All clients requiring periodic check-ins">
      <div className="space-y-4">

        {/* Tabs */}
        <div style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition"
                  style={active
                    ? { borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }
                    : { borderColor: 'transparent', color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                  {tab.label}
                  <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                    {tab.count}
                  </span>
                  {'overdue' in tab && (tab.overdue ?? 0) > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border"
                      style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
                      <AlertTriangle size={10} /> {tab.overdue} overdue
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── COUNSELING TAB ── */}
        {activeTab === 'counseling' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Counseling cases with <span className="font-medium">Check-In Only</span> or <span className="font-medium">With MH Check-In</span> status.
              </p>
              <button onClick={fetchCounselingCheckIns} disabled={ccLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 transition"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <RefreshCw size={13} className={ccLoading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            {ccError && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{ccError}</p>}

            {ccLoading ? (
              <div className="py-12 text-center text-sm flex items-center justify-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
              </div>
            ) : ccClients.length === 0 ? (
              <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No counseling check-in cases found.</div>
            ) : (
              <div className="border rounded-2xl shadow-card overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                      <tr>
                        <TH>Student</TH><TH>Status</TH><TH>Concern</TH><TH>Last Check-In</TH><TH>Next Due</TH><TH>Days Since</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {ccClients.map((c, i) => (
                        <tr key={c.case_id}
                          style={{
                            background: c.is_overdue ? 'rgba(239,68,68,0.04)' : 'transparent',
                            borderBottom: i < ccClients.length - 1 ? '1px solid var(--color-border)' : 'none',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = c.is_overdue ? 'rgba(239,68,68,0.08)' : 'var(--color-bg)')}
                          onMouseLeave={e => (e.currentTarget.style.background = c.is_overdue ? 'rgba(239,68,68,0.04)' : 'transparent')}>
                          <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{c.student_name}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium border"
                              style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
                              {c.client_status?.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{c.primary_concern || '—'}</td>
                          <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                            {c.last_check_in_date ? new Date(c.last_check_in_date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }) : <span style={{ color: 'var(--color-text-muted)' }}>Never</span>}
                          </td>
                          <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                            {c.next_check_in_date ? new Date(c.next_check_in_date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1 text-xs font-medium"
                              style={{ color: c.is_overdue ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                              {c.is_overdue && <AlertTriangle size={12} />}
                              {c.days_since_last_check_in != null ? `${c.days_since_last_check_in}d` : '—'}
                              {c.is_overdue && ' overdue'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── NON-COUNSELING TAB ── */}
        {activeTab === 'non-counseling' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="border rounded-2xl shadow-card p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <input type="text" placeholder="Search name or ID…" value={ncSearch}
                  onChange={e => { setNcSearch(e.target.value); setNcPage(1); }}
                  className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
                <select value={ncConcern} onChange={e => { setNcConcern(e.target.value); setNcPage(1); }}
                  className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut}>
                  <option value="">All Concerns</option>
                  <option value="under accommodation">Under Accommodation</option>
                  <option value="with SDFO case">With SDFO Case</option>
                  <option value="Under LCIDWELL Collab">Under LCIDWELL Collab</option>
                  <option value="with MH but needs check-in only">With MH Check-In Only</option>
                </select>
                <select value={ncStatus} onChange={e => { setNcStatus(e.target.value); setNcPage(1); }}
                  className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut}>
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <input type="month" value={ncMonth} onChange={e => { setNcMonth(e.target.value); setNcPage(1); }}
                  className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
                <div className="flex gap-2">
                  <button onClick={fetchNonCounseling} disabled={ncLoading}
                    className="flex-1 px-3 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-50 transition hover:opacity-90"
                    style={{ background: 'var(--color-primary)' }}>
                    Refresh
                  </button>
                  <button onClick={handleExportNc}
                    className="flex-1 px-3 py-2 text-sm text-white rounded-lg font-medium transition hover:opacity-90"
                    style={{ background: 'var(--color-text-secondary)' }}>
                    Export
                  </button>
                </div>
              </div>
            </div>

            {ncLoading ? (
              <div className="py-12 text-center text-sm flex items-center justify-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
              </div>
            ) : (
              <div className="border rounded-2xl shadow-card overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                      <tr>
                        <TH>Case #</TH><TH>Client Name</TH><TH>ID Number</TH><TH>Concern</TH><TH>Status</TH><TH>Date Created</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {ncClients.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>No records found</td></tr>
                      ) : ncClients.map((c, i) => (
                        <tr key={c._id}
                          style={{ borderBottom: i < ncClients.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-primary)' }}>{c.case_number}</td>
                          <td className="px-4 py-3" style={{ color: 'var(--color-text-primary)' }}>{c.client_name}</td>
                          <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{c.client_id_number}</td>
                          <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{c.concern}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium border"
                              style={c.status === 'Active'
                                ? { background: 'var(--color-success-surface)', color: 'var(--color-success)', borderColor: 'var(--color-success)' }
                                : { background: 'var(--color-bg)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                            {new Date(c.created_date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {ncClients.length > 0 ? (ncPage - 1) * 10 + 1 : 0}–{Math.min(ncPage * 10, ncTotal)} of {ncTotal}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setNcPage(Math.max(1, ncPage - 1))} disabled={ncPage === 1}
                      className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-50 transition"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>Previous</button>
                    <button onClick={() => setNcPage(ncPage + 1)} disabled={ncPage * 10 >= ncTotal}
                      className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-50 transition"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>Next</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
