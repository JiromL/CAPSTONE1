'use client';

import { useEffect, useState } from 'react';
import { exportToExcel } from '@/utils/export';
import { api } from '@/utils/api';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';

interface CheckInClient {
  _id: string;
  case_number: string;
  client_name: string;
  client_id_number: string;
  concern: string;
  counselor_id: string;
  status: string;
  created_date: string;
}

export default function CheckInClientsPage() {
  const [clients, setClients] = useState<CheckInClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [concern, setConcern] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchCheckInClients();
  }, [search, month, concern, status, page]);

  const fetchCheckInClients = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (search) params.append('search', search);
      if (month) params.append('month', month);
      if (concern) params.append('concern', concern);
      if (status) params.append('status', status);

      const res = await fetch(api(`/api/client-tracking/check-ins?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setClients(data.data || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch check-in clients:', error);
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
      if (concern) params.append('concern', concern);
      if (status) params.append('status', status);

      const res = await fetch(api(`/api/client-tracking/export/check-ins?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      const rows = (data.data || []).map((client: CheckInClient) => [
        client.case_number,
        client.client_name,
        client.client_id_number,
        client.concern,
        client.status,
        new Date(client.created_date).toLocaleDateString(),
      ]);

      exportToExcel({
        headers: ['Case Number', 'Client Name', 'ID Number', 'Concern', 'Status', 'Date Created'],
        rows,
        filename: 'check-in-tracking',
      });
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  return (
    <DashboardPageWrapper title="Check-In Tracking" subtitle="Track students requiring periodic check-ins only">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Non-Counseling Clients (Check-ins)</h1>
          <p className="text-slate-600 mt-2">Track students requiring periodic check-ins only</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Name or ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Concern</label>
              <select
                value={concern}
                onChange={(e) => {
                  setConcern(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Concerns</option>
                <option value="under accommodation">Under accommodation</option>
                <option value="with SDFO case">With SDFO case</option>
                <option value="Under LCIDWELL Collab">Under LCIDWELL Collab</option>
                <option value="with MH but needs check-in only">With MH but needs check-in only</option>
              </select>
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
                onClick={fetchCheckInClients}
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
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Concern</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Date Created</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-slate-600">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    clients.map((client) => (
                      <tr key={client._id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm font-medium text-blue-600">{client.case_number}</td>
                        <td className="px-6 py-3 text-sm text-slate-900">{client.client_name}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{client.client_id_number}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{client.concern}</td>
                        <td className="px-6 py-3 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              client.status === 'Active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {client.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-600">
                          {new Date(client.created_date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Showing {clients.length > 0 ? (page - 1) * 10 + 1 : 0} to {Math.min(page * 10, total)} of {total}
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
    </DashboardPageWrapper>
  );
}
