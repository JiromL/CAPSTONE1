"use client";

import { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface IntakeConversion {
  intake_started: number; intake_completed: number; cases_created: number;
  intake_completion_rate: number; case_creation_rate: number;
}
interface AppointmentStats {
  total: number; completed: number; cancelled: number; no_show: number; completion_rate: number;
}

function RateBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full rounded-full h-2.5 overflow-hidden" style={{ background: 'var(--color-border)' }}>
      <div className="h-2.5 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
    </div>
  );
}

const TH = ({ children }: { children: React.ReactNode }) => (
  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
    style={{ color: 'var(--color-text-muted)' }}>{children}</th>
);

export default function ComplianceReportPage() {
  const [intake, setIntake]             = useState<IntakeConversion | null>(null);
  const [appointments, setAppointments] = useState<AppointmentStats | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const [intakeRes, apptRes] = await Promise.all([
        fetch(api('/api/analytics/intake/conversion'), { headers }),
        fetch(api('/api/analytics/appointments/statistics'), { headers }),
      ]);
      if (intakeRes.ok) setIntake(await intakeRes.json());
      if (apptRes.ok) {
        const d = await apptRes.json();
        const total       = d.total_appointments ?? ((d.completed ?? 0) + (d.cancelled ?? 0) + (d.no_show ?? 0));
        const completed   = d.completed_appointments ?? d.completed ?? 0;
        const cancelled   = d.cancelled_appointments ?? d.cancelled ?? 0;
        const no_show     = d.no_shows ?? d.no_show_appointments ?? d.no_show ?? 0;
        const completion_rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        setAppointments({ total, completed, cancelled, no_show, completion_rate });
      }
      if (!intakeRes.ok && !apptRes.ok) throw new Error('Unable to load compliance data from the server');
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load compliance data');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <DashboardPageWrapper title="Compliance Report" subtitle="Intake completion rates and appointment compliance overview">
      <div className="max-w-5xl space-y-8">

        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Compliance metrics from the CPS system</p>
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition disabled:opacity-50"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg text-sm"
            style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}

        {loading && !intake && !appointments ? (
          <div className="py-20 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading compliance data…</div>
        ) : (
          <div className="space-y-6">

            {intake && (
              <div className="rounded-2xl p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-2 mb-5">
                  <CheckCircle size={16} style={{ color: 'var(--color-primary)' }} />
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Intake Form Compliance</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Intakes Started',   value: intake.intake_started   },
                    { label: 'Intakes Completed',  value: intake.intake_completed },
                    { label: 'Cases Created',      value: intake.cases_created    },
                  ].map(s => (
                    <div key={s.label} className="text-center p-4 rounded-lg" style={{ background: 'var(--color-bg)' }}>
                      <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{s.value}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Intake Completion Rate',                    pct: intake.intake_completion_rate },
                    { label: 'Case Creation Rate (from completed intakes)', pct: intake.case_creation_rate   },
                  ].map(r => (
                    <div key={r.label}>
                      <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                        <span>{r.label}</span>
                        <span className="font-semibold">{r.pct}%</span>
                      </div>
                      <RateBar pct={r.pct} color="var(--color-primary)" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {appointments && (
              <div className="rounded-2xl p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-2 mb-5">
                  <CheckCircle size={16} style={{ color: 'var(--color-primary)' }} />
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Appointment Compliance</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead style={{ background: 'var(--color-bg)' }}>
                      <tr>{['Metric', 'Count', 'Rate'].map(h => <TH key={h}>{h}</TH>)}</tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Total Appointments', count: appointments.total,     rate: '—',     color: 'var(--color-text-primary)' },
                        { label: 'Completed',           count: appointments.completed, rate: `${appointments.completion_rate}%`, color: 'var(--color-primary)' },
                        { label: 'Cancelled',           count: appointments.cancelled, rate: appointments.total > 0 ? `${Math.round((appointments.cancelled / appointments.total) * 100)}%` : '—', color: 'var(--color-warning-text)' },
                        { label: 'No-Show',             count: appointments.no_show,   rate: appointments.total > 0 ? `${Math.round((appointments.no_show   / appointments.total) * 100)}%` : '—', color: 'var(--color-danger)' },
                      ].map(row => (
                        <tr key={row.label} className="transition" style={{ borderTop: '1px solid var(--color-border)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{row.label}</td>
                          <td className="px-4 py-3 font-semibold" style={{ color: row.color }}>{row.count}</td>
                          <td className="px-4 py-3 font-medium" style={{ color: row.color }}>{row.rate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>Appointment Completion Rate</span>
                    <span className="font-semibold">{appointments.completion_rate}%</span>
                  </div>
                  <RateBar pct={appointments.completion_rate} color="var(--color-primary)" />
                </div>
              </div>
            )}

            {!intake && !appointments && !loading && (
              <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No compliance data available.</div>
            )}
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
