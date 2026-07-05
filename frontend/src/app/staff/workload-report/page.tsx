'use client';

import { useState, useEffect } from 'react';
import { Users, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '@/utils/api';
import PageShell from '@/components/PageShell';

export default function WorkloadReportPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(api('/api/appointments/staff/workload-report'), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error('Failed to fetch workload report');
        const data = await response.json();
        setReport(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, []);

  if (loading) {
    return (
      <PageShell title="Workload Report" subtitle="Counselor capacity and utilization analysis">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell title="Workload Report" subtitle="Counselor capacity and utilization analysis">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-2">
          <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
          <span className="text-red-800 dark:text-red-300">{error}</span>
        </div>
      </PageShell>
    );
  }

  const counselors = report?.counselors || [];
  const totalCapacity = counselors.reduce((sum: number, c: any) => sum + (c.capacity || 0), 0);
  const totalAssigned = counselors.reduce((sum: number, c: any) => sum + (c.assigned_count || 0), 0);
  const utilizationRate = totalCapacity > 0 ? Math.round((totalAssigned / totalCapacity) * 100) : 0;

  return (
    <PageShell title="Workload Report" subtitle="Counselor capacity and utilization analysis">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
          <p className="text-green-700 dark:text-green-300 text-sm font-medium">Total Counselors</p>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-2">{counselors.length}</p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
          <p className="text-purple-700 dark:text-purple-300 text-sm font-medium">Total Capacity</p>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-2">{totalCapacity}</p>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 p-4">
          <p className="text-orange-700 dark:text-orange-300 text-sm font-medium">Assigned</p>
          <p className="text-3xl font-bold text-orange-900 dark:text-orange-100 mt-2">{totalAssigned}</p>
        </div>

        <div className="bg-green-50 dark:bg-blue-900/20 rounded-lg border border-green-200 dark:border-blue-800 p-4">
          <p className="text-green-700 dark:text-green-300 text-sm font-medium">Utilization</p>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-2">{utilizationRate}%</p>
        </div>
      </div>

      {/* Counselor Details */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 flex gap-2 items-center">
            <Users size={24} />
            Counselor Workload Breakdown
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">
                  Counselor
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">
                  Assigned
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">
                  Available
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">
                  Utilization
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {counselors.map((counselor: any, idx: number) => {
                const util = counselor.capacity > 0 ? Math.round((counselor.assigned_count / counselor.capacity) * 100) : 0;
                const status =
                  util >= 90 ? 'full' : util >= 70 ? 'high' : util >= 50 ? 'medium' : 'low';
                const statusColors: Record<string, string> = {
                  full: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
                  high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
                  medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
                  low: 'bg-green-100 dark:bg-blue-900/30 text-green-800 dark:text-green-300',
                };

                return (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-50 font-medium">
                      {counselor.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {counselor.capacity} sessions
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">{counselor.assigned_count}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {counselor.capacity - counselor.assigned_count} slots
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${util}%` }}
                          />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-50 w-10">{util}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Utilization Status Legend:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Low (0-50%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Medium (50-70%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">High (70-90%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Full (90%+)</span>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
