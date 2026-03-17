'use client';

import { useState, useEffect } from 'react';
import { Users, TrendingUp, AlertCircle, Briefcase, Clock, CheckCircle } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface CounselorStats {
  name: string;
  totalAppointments: number;
  confirmedAppointments: number;
  pendingAppointments: number;
  upcomingWeek: number;
  lastUpdated?: string;
}

export default function CounselorsAvailabilityPage() {
  const [counselorStats, setCounselorStats] = useState<CounselorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'load' | 'pending'>('name');

  useEffect(() => {
    const loadCounselorsData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found');
          setLoading(false);
          return;
        }

        const response = await fetch(api('/api/appointments'), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch appointments');
        const data = await response.json();
        const appointments = Array.isArray(data) ? data : data.appointments || [];

        // Group by counselor and calculate stats
        const statsMap = new Map<string, CounselorStats>();
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        appointments.forEach((apt: any) => {
          const counselor = apt.counselor_name || 'Unassigned';
          if (!statsMap.has(counselor)) {
            statsMap.set(counselor, {
              name: counselor,
              totalAppointments: 0,
              confirmedAppointments: 0,
              pendingAppointments: 0,
              upcomingWeek: 0,
              lastUpdated: new Date().toISOString(),
            });
          }

          const stats = statsMap.get(counselor)!;
          stats.totalAppointments++;

          if (apt.status === 'confirmed') stats.confirmedAppointments++;
          if (apt.status === 'pending') stats.pendingAppointments++;

          const aptDate = new Date(apt.scheduled_start || apt.requested_start);
          if (aptDate >= now && aptDate <= nextWeek) {
            stats.upcomingWeek++;
          }
        });

        const stats = Array.from(statsMap.values());

        // Sort
        if (sortBy === 'load') {
          stats.sort((a, b) => b.totalAppointments - a.totalAppointments);
        } else if (sortBy === 'pending') {
          stats.sort((a, b) => b.pendingAppointments - a.pendingAppointments);
        } else {
          stats.sort((a, b) => a.name.localeCompare(b.name));
        }

        setCounselorStats(stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load counselor data');
      } finally {
        setLoading(false);
      }
    };

    loadCounselorsData();
  }, [sortBy]);

  const totalAppointments = counselorStats.reduce((sum, c) => sum + c.totalAppointments, 0);
  const avgLoad = counselorStats.length > 0 ? Math.round(totalAppointments / counselorStats.length) : 0;
  const totalPending = counselorStats.reduce((sum, c) => sum + c.pendingAppointments, 0);

  if (loading) {
    return (
      <DashboardPageWrapper title="Counselor Availability" subtitle="View all counselor workload and availability">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Counselor Availability" subtitle="View all counselor workload and availability">
      <div className="space-y-6">
        {error && (
          <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg p-4 flex gap-3">
            <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Counselors</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">{counselorStats.length}</p>
              </div>
              <Users className="text-blue-600 dark:text-blue-400" size={32} />
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Appointments</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">{totalAppointments}</p>
              </div>
              <Briefcase className="text-green-600 dark:text-green-400" size={32} />
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 border border-yellow-200 dark:border-yellow-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">{totalPending}</p>
              </div>
              <Clock className="text-yellow-600 dark:text-yellow-400" size={32} />
            </div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Load</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">{avgLoad}</p>
              </div>
              <TrendingUp className="text-purple-600 dark:text-purple-400" size={32} />
            </div>
          </div>
        </div>

        {/* Sort Options */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700 flex gap-2">
          <button
            onClick={() => setSortBy('name')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              sortBy === 'name'
                ? 'bg-blue-600 dark:bg-blue-700 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-50 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Sort by Name
          </button>
          <button
            onClick={() => setSortBy('load')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              sortBy === 'load'
                ? 'bg-blue-600 dark:bg-blue-700 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-50 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Sort by Load
          </button>
          <button
            onClick={() => setSortBy('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              sortBy === 'pending'
                ? 'bg-blue-600 dark:bg-blue-700 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-50 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Sort by Pending
          </button>
        </div>

        {/* Counselor List */}
        <div className="space-y-4">
          {counselorStats.length > 0 ? (
            counselorStats.map((counselor) => {
              const loadPercent = Math.round((counselor.totalAppointments / totalAppointments) * 100) || 0;
              const isOverloaded = counselor.totalAppointments > avgLoad + 3;
              const isUnderloaded = counselor.totalAppointments < avgLoad - 2 && counselor.totalAppointments > 0;

              return (
                <div
                  key={counselor.name}
                  className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">{counselor.name}</h3>
                      <div className="flex gap-2">
                        {isOverloaded && (
                          <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-medium">
                            ⚠️ Overloaded
                          </span>
                        )}
                        {isUnderloaded && (
                          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                            ✓ Available
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{counselor.totalAppointments}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Confirmed</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{counselor.confirmedAppointments}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{counselor.pendingAppointments}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Next 7 Days</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{counselor.upcomingWeek}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Workload Distribution</p>
                        <p className="text-xs font-bold text-gray-900 dark:text-gray-50">{loadPercent}%</p>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOverloaded
                              ? 'bg-red-500'
                              : isUnderloaded
                                ? 'bg-green-500'
                                : 'bg-blue-500'
                          }`}
                          style={{ width: `${loadPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <button className="flex-1 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg font-medium text-sm transition">
                        View Schedule
                      </button>
                      <button className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm transition">
                        Assign Case
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-12 text-center border border-gray-200 dark:border-gray-700">
              <Users className="mx-auto mb-3 text-gray-400" size={32} />
              <p className="text-gray-600 dark:text-gray-400">No counselor data available</p>
            </div>
          )}
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
