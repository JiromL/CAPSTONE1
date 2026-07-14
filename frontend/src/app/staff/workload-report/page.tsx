'use client';

import { useState, useEffect } from 'react';
import { Users, AlertCircle } from 'lucide-react';
import { api } from '@/utils/api';
import PageShell from '@/components/PageShell';

// Utilization status — fixed semantic hex for clear clinical/operational meaning
const UTIL_STYLE: Record<string, React.CSSProperties> = {
  full:   { background: '#FEE2E2', color: '#991B1B' },
  high:   { background: '#FFEDD5', color: '#9A3412' },
  medium: { background: '#FEF3C7', color: '#92400E' },
  low:    { background: '#DCFCE7', color: '#15803D' },
};
const UTIL_DOT: Record<string, string> = { full: '#DC2626', high: '#EA580C', medium: '#CA8A04', low: '#16A34A' };

export default function WorkloadReportPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(api('/api/appointments/staff/workload-report'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch workload report');
        setReport(await response.json());
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
          <div className="animate-spin rounded-full h-12 w-12" style={{ borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent', borderBottomColor: 'var(--color-primary)' }} />
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell title="Workload Report" subtitle="Counselor capacity and utilization analysis">
        <div className="rounded-lg p-4 flex gap-2" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
          <AlertCircle size={20} style={{ color: 'var(--color-danger)' }} />
          <span style={{ color: 'var(--color-danger-text)' }}>{error}</span>
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
        {[
          { label: 'Total Counselors', value: counselors.length, bg: 'var(--color-info-surface)', border: 'var(--color-info)', color: 'var(--color-info-text)' },
          { label: 'Total Capacity',  value: totalCapacity,      bg: 'var(--color-primary-surface)', border: 'var(--color-primary-muted)', color: 'var(--color-primary-text)' },
          { label: 'Assigned',        value: totalAssigned,       bg: 'var(--color-warning-surface)', border: 'var(--color-warning)', color: 'var(--color-warning-text)' },
          { label: 'Utilization',     value: `${utilizationRate}%`, bg: 'var(--color-success-surface)', border: 'var(--color-success)', color: 'var(--color-success-text)' },
        ].map(card => (
          <div key={card.label} className="rounded-lg p-4" style={{ background: card.bg, border: `1px solid ${card.border}` }}>
            <p className="text-sm font-medium" style={{ color: card.color }}>{card.label}</p>
            <p className="text-3xl font-bold mt-2" style={{ color: 'var(--color-text-primary)' }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Counselor Details */}
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="text-lg font-semibold flex gap-2 items-center" style={{ color: 'var(--color-text-primary)' }}>
            <Users size={24} /> Counselor Workload Breakdown
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                {['Counselor','Capacity','Assigned','Available','Utilization','Status'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {counselors.map((counselor: any, idx: number) => {
                const util = counselor.capacity > 0 ? Math.round((counselor.assigned_count / counselor.capacity) * 100) : 0;
                const status = util >= 90 ? 'full' : util >= 70 ? 'high' : util >= 50 ? 'medium' : 'low';
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{counselor.name}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{counselor.capacity} sessions</td>
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{counselor.assigned_count}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{counselor.capacity - counselor.assigned_count} slots</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-24 rounded-full h-2 overflow-hidden" style={{ background: 'var(--color-border)' }}>
                          <div className="h-2 rounded-full" style={{ width: `${util}%`, background: 'var(--color-primary)' }} />
                        </div>
                        <span className="font-medium w-10" style={{ color: 'var(--color-text-primary)' }}>{util}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-3 py-1 rounded-full text-xs font-medium" style={UTIL_STYLE[status]}>
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
      <div className="mt-6 rounded-lg p-4" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>Utilization Status Legend:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[['low','#16A34A','Low (0-50%)'],['medium','#CA8A04','Medium (50-70%)'],['high','#EA580C','High (70-90%)'],['full','#DC2626','Full (90%+)']].map(([,dot,label]) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: dot as string }} />
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
