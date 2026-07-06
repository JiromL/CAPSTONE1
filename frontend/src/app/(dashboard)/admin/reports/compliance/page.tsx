"use client";

import { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface IntakeConversion {
  intake_started: number;
  intake_completed: number;
  cases_created: number;
  intake_completion_rate: number;
  case_creation_rate: number;
}

interface AppointmentStats {
  total: number;
  completed: number;
  cancelled: number;
  no_show: number;
  completion_rate: number;
}

export default function ComplianceReportPage() {
  const [intake, setIntake] = useState<IntakeConversion | null>(null);
  const [appointments, setAppointments] = useState<AppointmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [intakeRes, apptRes] = await Promise.all([
        fetch(api('/api/analytics/intake/conversion'), { headers }),
        fetch(api('/api/analytics/appointments/statistics'), { headers }),
      ]);

      if (intakeRes.ok) {
        const d = await intakeRes.json();
        setIntake(d);
      }

      if (apptRes.ok) {
        const d = await apptRes.json();
        // Compute from monthly or statistics data
        const total = d.total_appointments ?? ((d.completed ?? 0) + (d.cancelled ?? 0) + (d.no_show ?? 0));
        const completed = d.completed_appointments ?? d.completed ?? 0;
        const cancelled = d.cancelled_appointments ?? d.cancelled ?? 0;
        const no_show = d.no_show_appointments ?? d.no_show ?? 0;
        const completion_rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        setAppointments({ total, completed, cancelled, no_show, completion_rate });
      }

      if (!intakeRes.ok && !apptRes.ok) {
        throw new Error('Unable to load compliance data from the server');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const RateBar = ({ pct, color }: { pct: number; color: string }) => (
    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
      <div className="h-2.5 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
    </div>
  );

  return (
    <DashboardPageWrapper title="Compliance Report" subtitle="Intake completion rates and appointment compliance overview">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Compliance metrics from the CPS system</p>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading && !intake && !appointments ? (
          <div className="py-20 text-center text-sm text-gray-400">Loading compliance data…</div>
        ) : (
          <div className="space-y-6">
            {/* Intake Funnel */}
            {intake && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <CheckCircle size={16} style={{ color: '#2563eb' }} />
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Intake Form Compliance</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{intake.intake_started}</p>
                    <p className="text-xs text-gray-500 mt-1">Intakes Started</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{intake.intake_completed}</p>
                    <p className="text-xs text-gray-500 mt-1">Intakes Completed</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{intake.cases_created}</p>
                    <p className="text-xs text-gray-500 mt-1">Cases Created</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1.5">
                      <span>Intake Completion Rate</span>
                      <span className="font-semibold">{intake.intake_completion_rate}%</span>
                    </div>
                    <RateBar pct={intake.intake_completion_rate} color="#2563eb" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1.5">
                      <span>Case Creation Rate (from completed intakes)</span>
                      <span className="font-semibold">{intake.case_creation_rate}%</span>
                    </div>
                    <RateBar pct={intake.case_creation_rate} color="#2563eb" />
                  </div>
                </div>
              </div>
            )}

            {/* Appointment Compliance */}
            {appointments && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <CheckCircle size={16} style={{ color: '#2563eb' }} />
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Appointment Compliance</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        {['Metric', 'Count', 'Rate'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">Total Appointments</td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-50">{appointments.total}</td>
                        <td className="px-4 py-3 text-gray-500">—</td>
                      </tr>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">Completed</td>
                        <td className="px-4 py-3 font-semibold text-blue-700">{appointments.completed}</td>
                        <td className="px-4 py-3">
                          <span className="text-blue-700 font-medium">{appointments.completion_rate}%</span>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">Cancelled</td>
                        <td className="px-4 py-3 font-semibold text-yellow-700">{appointments.cancelled}</td>
                        <td className="px-4 py-3 text-yellow-700">
                          {appointments.total > 0 ? `${Math.round((appointments.cancelled / appointments.total) * 100)}%` : '—'}
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">No-Show</td>
                        <td className="px-4 py-3 font-semibold text-red-700">{appointments.no_show}</td>
                        <td className="px-4 py-3 text-red-700">
                          {appointments.total > 0 ? `${Math.round((appointments.no_show / appointments.total) * 100)}%` : '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1.5">
                    <span>Appointment Completion Rate</span>
                    <span className="font-semibold">{appointments.completion_rate}%</span>
                  </div>
                  <RateBar pct={appointments.completion_rate} color="#2563eb" />
                </div>
              </div>
            )}

            {!intake && !appointments && !loading && (
              <div className="py-12 text-center text-sm text-gray-400">No compliance data available.</div>
            )}
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
