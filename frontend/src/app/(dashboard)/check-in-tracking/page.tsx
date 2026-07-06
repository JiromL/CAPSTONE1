'use client';

import { useEffect, useState } from 'react';
import { exportToExcel } from '@/utils/export';
import { api } from '@/utils/api';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';

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

export default function CheckInTrackingPage() {
  const [activeTab, setActiveTab] = useState<'counseling' | 'non-counseling'>('counseling');

  // Non-counseling state
  const [ncClients, setNcClients] = useState<NonCounselingClient[]>([]);
  const [ncTotal, setNcTotal] = useState(0);
  const [ncPage, setNcPage] = useState(1);
  const [ncSearch, setNcSearch] = useState('');
  const [ncConcern, setNcConcern] = useState('');
  const [ncStatus, setNcStatus] = useState('');
  const [ncMonth, setNcMonth] = useState('');
  const [ncLoading, setNcLoading] = useState(false);

  // Counseling check-ins state
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
      const res = await fetch(api(`/api/client-tracking/check-ins?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNcClients(data.data || []);
      setNcTotal(data.total || 0);
    } catch { /* silent */ }
    finally { setNcLoading(false); }
  };

  const fetchCounselingCheckIns = async () => {
    setCcLoading(true);
    setCcError('');
    try {
      const res = await fetch(api('/api/check-ins/list'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setCcError('Failed to load counseling check-ins.'); return; }
      const data = await res.json();
      setCcClients(data.check_ins || []);
      setCcOverdue(data.overdue_count || 0);
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
      const res = await fetch(api(`/api/client-tracking/export/check-ins?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const rows = (data.data || []).map((c: NonCounselingClient) => [
        c.case_number, c.client_name, c.client_id_number, c.concern, c.status,
        new Date(c.created_date).toLocaleDateString(),
      ]);
      exportToExcel({
        headers: ['Case Number', 'Client Name', 'ID Number', 'Concern', 'Status', 'Date Created'],
        rows,
        filename: 'non-counseling-check-ins',
      });
    } catch { /* silent */ }
  };

  const tabs = [
    { id: 'counseling' as const, label: 'Counseling (Check-In Status)', count: ccClients.length, overdue: ccOverdue },
    { id: 'non-counseling' as const, label: 'Non-Counseling Clients', count: ncTotal },
  ];

  return (
    <DashboardPageWrapper title="Check-In Tracking" subtitle="All clients requiring periodic check-ins">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}>
                {tab.label}
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {tab.count}
                </span>
                {'overdue' in tab && (tab.overdue ?? 0) > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                    <AlertTriangle size={10} /> {tab.overdue} overdue
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── COUNSELING TAB ── */}
        {activeTab === 'counseling' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Counseling cases with <span className="font-medium">Check-In Only</span> or <span className="font-medium">With MH Check-In</span> status.
              </p>
              <button onClick={fetchCounselingCheckIns} disabled={ccLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition">
                <RefreshCw size={13} className={ccLoading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            {ccError && <p className="text-sm text-red-600 dark:text-red-400">{ccError}</p>}

            {ccLoading ? (
              <div className="py-12 text-center text-sm text-gray-500">Loading…</div>
            ) : ccClients.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">No counseling check-in cases found.</div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Student</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Concern</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Last Check-In</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Next Due</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Days Since</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {ccClients.map((c) => (
                      <tr key={c.case_id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${c.is_overdue ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-50">{c.student_name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            {c.client_status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.primary_concern || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {c.last_check_in_date ? new Date(c.last_check_in_date).toLocaleDateString() : <span className="text-gray-400">Never</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {c.next_check_in_date ? new Date(c.next_check_in_date).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 text-xs font-medium ${c.is_overdue ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
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
            )}
          </div>
        )}

        {/* ── NON-COUNSELING TAB ── */}
        {activeTab === 'non-counseling' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <input type="text" placeholder="Search name or ID…" value={ncSearch}
                  onChange={(e) => { setNcSearch(e.target.value); setNcPage(1); }}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50" />
                <select value={ncConcern} onChange={(e) => { setNcConcern(e.target.value); setNcPage(1); }}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50">
                  <option value="">All Concerns</option>
                  <option value="under accommodation">Under Accommodation</option>
                  <option value="with SDFO case">With SDFO Case</option>
                  <option value="Under LCIDWELL Collab">Under LCIDWELL Collab</option>
                  <option value="with MH but needs check-in only">With MH Check-In Only</option>
                </select>
                <select value={ncStatus} onChange={(e) => { setNcStatus(e.target.value); setNcPage(1); }}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50">
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <input type="month" value={ncMonth} onChange={(e) => { setNcMonth(e.target.value); setNcPage(1); }}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50" />
                <div className="flex gap-2">
                  <button onClick={fetchNonCounseling} disabled={ncLoading}
                    className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition">
                    Refresh
                  </button>
                  <button onClick={handleExportNc}
                    className="flex-1 px-3 py-2 text-sm bg-[#2563eb] hover:bg-blue-700 text-white rounded-lg font-medium transition">
                    Export
                  </button>
                </div>
              </div>
            </div>

            {ncLoading ? (
              <div className="py-12 text-center text-sm text-gray-500">Loading…</div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Case #</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Client Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">ID Number</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Concern</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Date Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {ncClients.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No records found</td></tr>
                    ) : ncClients.map((c) => (
                      <tr key={c._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3 font-medium text-blue-600 dark:text-blue-400">{c.case_number}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-50">{c.client_name}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.client_id_number}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.concern}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            c.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-blue-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {new Date(c.created_date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination */}
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {ncClients.length > 0 ? (ncPage - 1) * 10 + 1 : 0}–{Math.min(ncPage * 10, ncTotal)} of {ncTotal}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setNcPage(Math.max(1, ncPage - 1))} disabled={ncPage === 1}
                      className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Previous</button>
                    <button onClick={() => setNcPage(ncPage + 1)} disabled={ncPage * 10 >= ncTotal}
                      className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Next</button>
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
