'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface C2CReferral {
  _id: string;
  case_id: string;
  client_id: string;
  referring_counselor_id: string;
  target_counselor_id: string;
  specialty_required: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'accepted' | 'completed' | 'declined';
  notes?: string;
  created_at?: string;
}

function urgencyStyle(u: string): React.CSSProperties {
  switch (u) {
    case 'critical': return { background: 'var(--color-danger-surface)',  color: 'var(--color-danger)',  border: '1px solid var(--color-danger)' };
    case 'high':     return { background: 'var(--color-warning-surface)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)' };
    case 'medium':   return { background: 'var(--color-warning-surface)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)', opacity: 0.8 };
    default:         return { background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' };
  }
}

function statusStyle(s: string): React.CSSProperties {
  switch (s) {
    case 'pending':   return { background: 'var(--color-warning-surface)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)' };
    case 'accepted':
    case 'completed': return { background: 'var(--color-success-surface)', color: 'var(--color-success)', border: '1px solid var(--color-success)' };
    case 'declined':  return { background: 'var(--color-danger-surface)',  color: 'var(--color-danger)',  border: '1px solid var(--color-danger)' };
    default:          return { background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' };
  }
}

export default function C2CReferralsPage() {
  const [referrals, setReferrals] = useState<C2CReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true); setError('');
    const token = localStorage.getItem('token');
    fetch(api('/api/counselor-referrals/'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setReferrals(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load referrals'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const TH = ({ children }: { children: React.ReactNode }) => (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{children}</th>
  );

  return (
    <DashboardPageWrapper title="C2C Referrals" subtitle="Counselor-to-counselor case handoffs and transfers">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {referrals.length} referral{referrals.length !== 1 ? 's' : ''} found
          </p>
          <button onClick={load} className="flex items-center gap-2 text-sm transition"
            style={{ color: 'var(--color-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg border text-sm"
            style={{ background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
            <AlertCircle size={14} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
            <ArrowRight size={28} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>No C2C referrals found</p>
            <p className="text-sm mt-1">Counselor-to-counselor transfers will appear here</p>
          </div>
        ) : (
          <div className="border rounded-2xl shadow-card overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                  <tr>
                    <TH>Case</TH><TH>Client</TH><TH>From</TH><TH>To</TH><TH>Specialty</TH><TH>Urgency</TH><TH>Status</TH>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r, i) => (
                    <tr key={r._id}
                      style={{ borderBottom: i < referrals.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{r.case_id}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{r.client_id}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{r.referring_counselor_id}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{r.target_counselor_id}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{r.specialty_required || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                          style={urgencyStyle(r.urgency)}>
                          {r.urgency}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                          style={statusStyle(r.status)}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
