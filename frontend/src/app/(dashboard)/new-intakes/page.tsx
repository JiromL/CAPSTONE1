'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { exportToExcel } from '@/utils/export';

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
}

export default function NewIntakesPage() {
  const [intakes, setIntakes] = useState<NewClientIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchIntakes();
  }, [search, month, page]);

  const fetchIntakes = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (search) params.append('search', search);
      if (month) params.append('month', month);

      const res = await fetch(`http://localhost:5001/api/client-tracking/new-intakes?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setIntakes(data.data || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch intakes:', error);
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

      const res = await fetch(`http://localhost:5001/api/client-tracking/export/new-intakes?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      const rows = (data.data || []).map((intake: NewClientIntake) => [
        new Date(intake.created_date).toLocaleDateString(),
        intake.client_name,
        intake.client_id_number,
        intake.college_unit,
        intake.program || '',
        intake.service_requested,
        intake.source,
        intake.intake_counselor_name,
        intake.action_taken || '',
        intake.status,
      ]);

      exportToExcel({
        headers: [
          'Date',
          'Client Name',
          'ID Number',
          'College/Unit',
          'Program',
          'Service',
          'Source',
          'Counselor',
          'Action Taken',
          'Status',
        ],
        rows,
        filename: 'new-intakes',
      });
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">New Client Intakes</h1>
          <p className="text-slate-600 mt-2">Manage new client intake requests and processing</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Name, ID, or Email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                onClick={fetchIntakes}
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
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Client Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">ID Number</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">College/Unit</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Service</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Source</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Counselor</th>
                  </tr>
                </thead>
                <tbody>
                  {intakes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-slate-600">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    intakes.map((intake) => (
                      <tr key={intake._id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm text-slate-900">
                          {new Date(intake.created_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-900">{intake.client_name}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{intake.client_id_number}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{intake.college_unit}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{intake.service_requested}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{intake.source}</td>
                        <td className="px-6 py-3 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              intake.status === 'NEW'
                                ? 'bg-blue-100 text-blue-800'
                                : intake.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {intake.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-600">{intake.intake_counselor_name}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Showing {intakes.length > 0 ? (page - 1) * 10 + 1 : 0} to {Math.min(page * 10, total)} of {total}
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
