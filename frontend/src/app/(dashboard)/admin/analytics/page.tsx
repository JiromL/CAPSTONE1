'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, AlertTriangle, Calendar, FileText, BarChart3, Loader } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface AnalyticsSummary {
  total_cases: number;
  active_cases: number;
  closed_cases: number;
  high_risk_cases: number;
  total_students: number;
  total_counselors: number;
  total_psychologists: number;
  week_appointments: number;
  month_assessments: number;
}

interface StaffWorkload {
  staff_id: string;
  name: string;
  role: string;
  active_cases: number;
  total_appointments: number;
  week_completed: number;
}

interface AppointmentStats {
  completion_rate: number;
  no_show_rate: number;
  avg_wait_days: number;
  total_appointments: number;
  completed: number;
  no_shows: number;
  cancelled: number;
}

interface ReferralSummary {
  total_referrals: number;
  pending: number;
  completed: number;
  referral_types: Array<{ type: string; count: number }>;
}

export default function DashboardAnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [staffWorkload, setStaffWorkload] = useState<StaffWorkload[]>([]);
  const [appointments, setAppointments] = useState<AppointmentStats | null>(null);
  const [referrals, setReferrals] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Get all analytics in parallel
      const [summaryRes, workloadRes, appointmentsRes, referralsRes] = await Promise.all([
        fetch(api('/api/analytics/summary'), { headers }),
        fetch(api('/api/analytics/staff/workload'), { headers }),
        fetch(api('/api/analytics/appointments/statistics'), { headers }),
        fetch(api('/api/analytics/referrals/summary'), { headers }),
      ]);

      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (workloadRes.ok) {
        const data = await workloadRes.json();
        setStaffWorkload(data.staff_workload || []);
      }
      if (appointmentsRes.ok) setAppointments(await appointmentsRes.json());
      if (referralsRes.ok) setReferrals(await referralsRes.json());

      setError(null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardPageWrapper title="Analytics">
        <div className="flex items-center justify-center h-96">
          <Loader size={32} className="animate-spin text-gray-400" />
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Analytics Dashboard">
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Key Metrics Grid */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <MetricCard
            label="Active Cases"
            value={summary.active_cases.toString()}
            icon={<FileText size={20} />}
            color="blue"
          />
          <MetricCard
            label="High Risk"
            value={summary.high_risk_cases.toString()}
            icon={<AlertTriangle size={20} />}
            color="red"
          />
          <MetricCard
            label="Total Students"
            value={summary.total_students.toString()}
            icon={<Users size={20} />}
            color="gray"
          />
          <MetricCard
            label="Staff"
            value={(summary.total_counselors + summary.total_psychologists).toString()}
            icon={<Users size={20} />}
            color="gray"
          />
        </div>
      )}

      {/* Appointment Statistics */}
      {appointments && (
        <div className="border border-gray-200 dark:border-gray-700 rounded p-4 mb-6 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-gray-600 dark:text-gray-400" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-50">Appointment Performance</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatBox
              label="Completion Rate"
              value={`${appointments.completion_rate}%`}
              subtext={`${appointments.completed} completed`}
            />
            <StatBox
              label="No-Show Rate"
              value={`${appointments.no_show_rate}%`}
              subtext={`${appointments.no_shows} no-shows`}
            />
            <StatBox
              label="Avg Wait Time"
              value={`${appointments.avg_wait_days}d`}
              subtext="days"
            />
            <StatBox
              label="Total Appts"
              value={appointments.total_appointments.toString()}
              subtext="this month"
            />
            <StatBox
              label="Cancelled"
              value={appointments.cancelled.toString()}
              subtext="appointments"
            />
          </div>
        </div>
      )}

      {/* Staff Workload */}
      {staffWorkload.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded p-4 mb-6 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-gray-600 dark:text-gray-400" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-50">Staff Workload</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-2 text-gray-700 dark:text-gray-300 font-medium">Name</th>
                  <th className="text-right py-2 px-2 text-gray-700 dark:text-gray-300 font-medium">Role</th>
                  <th className="text-right py-2 px-2 text-gray-700 dark:text-gray-300 font-medium">Active Cases</th>
                  <th className="text-right py-2 px-2 text-gray-700 dark:text-gray-300 font-medium">Completed (7d)</th>
                </tr>
              </thead>
              <tbody>
                {staffWorkload.map((staff) => (
                  <tr key={staff.staff_id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-2 text-gray-900 dark:text-gray-100">{staff.name}</td>
                    <td className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 text-xs">{staff.role}</td>
                    <td className="text-right py-3 px-2">
                      <span className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs font-medium">
                        {staff.active_cases}
                      </span>
                    </td>
                    <td className="text-right py-3 px-2 text-gray-600 dark:text-gray-400">{staff.week_completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Referral Summary */}
      {referrals && (
        <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-gray-600 dark:text-gray-400" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-50">Referral Summary</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <StatBox label="Total Referrals" value={referrals.total_referrals.toString()} />
            <StatBox label="Pending" value={referrals.pending.toString()} />
            <StatBox label="Completed" value={referrals.completed.toString()} />
          </div>
          {referrals.referral_types.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Referral Types</h3>
              <div className="space-y-2">
                {referrals.referral_types.map((type) => (
                  <div key={type.type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{type.type}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{type.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardPageWrapper>
  );
}

// Metric Card Component
interface MetricCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'red' | 'gray' | 'green';
}

function MetricCard({ label, value, icon, color = 'gray' }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    gray: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  };

  const textClasses = {
    blue: 'text-blue-700 dark:text-blue-300',
    red: 'text-red-700 dark:text-red-300',
    gray: 'text-gray-700 dark:text-gray-300',
    green: 'text-green-700 dark:text-green-300',
  };

  return (
    <div className={`border rounded p-4 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-medium ${textClasses[color]}`}>{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50 mt-1">{value}</p>
        </div>
        {icon && <div className={textClasses[color]}>{icon}</div>}
      </div>
    </div>
  );
}

// Stat Box Component
interface StatBoxProps {
  label: string;
  value: string;
  subtext?: string;
}

function StatBox({ label, value, subtext }: StatBoxProps) {
  return (
    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-100 dark:border-gray-700">
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
      {subtext && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtext}</p>}
    </div>
  );
}
