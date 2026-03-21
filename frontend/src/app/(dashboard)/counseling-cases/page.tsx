'use client';

import { useEffect, useState } from 'react';
import { exportToExcel } from '@/utils/export';

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

export default function CounselingCasesPage() {
  const [cases, setCases] = useState<CounselingCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchCounselingCases();
  }, [search, month, status, page]);

  const fetchCounselingCases = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (search) params.append('search', search);
      if (month) params.append('month', month);
      if (status) params.append('status', status);

      const res = await fetch(`http://localhost:5001/api/client-tracking/counseling-cases?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCases(data.data || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch counseling cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (month) params.append('month', month);
      if (status) params.append('status', status);

      const res = await fetch(`http://localhost:5001/api/client-tracking/export/counseling-cases?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      const rows = (data.data || []).map((counselingCase: CounselingCase) => [
        counselingCase.case_number,
        counselingCase.client_name,
        counselingCase.client_id_number,
        counselingCase.target_sessions,
        counselingCase.current_sessions,
        counselingCase.status,
        new Date(counselingCase.created_date).toLocaleDateString(),
      ]);

      exportToExcel({
        headers: [
          'Case Number',
          'Client Name',
          'ID Number',
          'Target Sessions',
          'Current Sessions',
          'Status',
          'Date Created',
        ],
        rows,
        filename: 'counseling-cases',
      });
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    if (target === 0) return 0;
    return Math.round((current / target) * 100);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Counseling Cases</h1>
          <p className="text-slate-600 mt-2">Track existing clients for ongoing counseling with session metrics</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Name, ID, or Case #..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="for Termination">For Termination</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Month</label>
              <input
                type="month"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={fetchCounselingCases}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Refresh
              </button>
              <button
                onClick={handleExport}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-slate-600">Loading...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Case Number</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Client Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">ID Number</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Sessions</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Progress</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Date Created</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-slate-600">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    cases.map((counselingCase) => {
                      const progress = getProgressPercentage(
                        counselingCase.current_sessions,
                        counselingCase.target_sessions
                      );
                      return (
                        <tr key={counselingCase._id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="px-6 py-3 text-sm font-medium text-blue-600">{counselingCase.case_number}</td>
                          <td className="px-6 py-3 text-sm text-slate-900">{counselingCase.client_name}</td>
                          <td className="px-6 py-3 text-sm text-slate-600">{counselingCase.client_id_number}</td>
                          <td className="px-6 py-3 text-sm text-slate-600">
                            {counselingCase.current_sessions} / {counselingCase.target_sessions}
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-slate-600 w-8">{progress}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-sm">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                counselingCase.status === 'Active'
                                  ? 'bg-green-100 text-green-800'
                                  : counselingCase.status === 'for Termination'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {counselingCase.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-600">
                            {new Date(counselingCase.created_date).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Showing {cases.length > 0 ? (page - 1) * 10 + 1 : 0} to {Math.min(page * 10, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page * 10 >= total}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
