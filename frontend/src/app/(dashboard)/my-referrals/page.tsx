'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, CheckCircle, Clock, AlertCircle, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface PoolReferral {
  referral_id: string;
  case_id: string | null;
  student_name: string | null;
  student_id: string | null;
  referred_by: string | null;
  reason: string | null;
  urgency: string;
  assigned_to_role: string;
  created_at: string | null;
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const u = (urgency || 'routine').toLowerCase();
  if (u === 'urgent') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger)' }}>
      <AlertCircle size={10} /> Urgent
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)' }}>
      <Clock size={10} /> Routine
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return iso; }
}

export default function MyReferralsPage() {
  const router = useRouter();
  const [referrals, setReferrals] = useState<PoolReferral[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [accepting, setAccepting] = useState<string | null>(null);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());

  const loadReferrals = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(api('/api/referrals/pool'), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Failed to load referrals'); return;
      }
      setReferrals((await res.json()).referrals || []);
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { loadReferrals(); }, [loadReferrals]);

  const handleAccept = async (ref: PoolReferral) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setAccepting(ref.referral_id);
    try {
      const res = await fetch(api(`/api/referrals/${ref.referral_id}/accept`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setAcceptedIds(prev => new Set([...prev, ref.referral_id]));
        setTimeout(() => {
          setReferrals(prev => prev.filter(r => r.referral_id !== ref.referral_id));
          setAcceptedIds(prev => { const n = new Set(prev); n.delete(ref.referral_id); return n; });
        }, 1500);
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || 'Failed to accept referral');
      }
    } catch { alert('Network error. Please try again.'); }
    finally { setAccepting(null); }
  };

  return (
    <DashboardPageWrapper title="My Referrals" subtitle="Pool referrals assigned to your role"
      requiredRoles={['COUNSELOR', 'PSYCHOLOGIST']}>
      <div className="max-w-4xl mx-auto space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>My Referrals</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Cases referred to your role pool — accept to take ownership
            </p>
          </div>
          <button onClick={loadReferrals} disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition disabled:opacity-50"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
            style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48 gap-2" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : referrals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3" style={{ color: 'var(--color-text-muted)' }}>
            <Users size={40} strokeWidth={1.5} />
            <p className="text-sm">No pending pool referrals for your role</p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map(ref => {
              const isAccepted  = acceptedIds.has(ref.referral_id);
              const isAccepting = accepting === ref.referral_id;
              return (
                <div key={ref.referral_id} className="rounded-2xl p-5 shadow-card"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {ref.student_name || 'Unknown Student'}
                        </span>
                        {ref.student_id && (
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>ID: {ref.student_id}</span>
                        )}
                        <UrgencyBadge urgency={ref.urgency} />
                      </div>
                      {ref.reason && (
                        <p className="text-sm mb-2 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>{ref.reason}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs flex-wrap" style={{ color: 'var(--color-text-muted)' }}>
                        {ref.referred_by && (
                          <span>Referred by: <span style={{ color: 'var(--color-text-secondary)' }}>{ref.referred_by}</span></span>
                        )}
                        <span>Received: {formatDate(ref.created_at)}</span>
                        <span className="capitalize">Role: {ref.assigned_to_role?.toLowerCase()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {ref.case_id && (
                        <button onClick={() => router.push(`/cases/${ref.case_id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <ExternalLink size={12} /> View Case
                        </button>
                      )}

                      {isAccepted ? (
                        <span className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg"
                          style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)', color: 'var(--color-success)' }}>
                          <CheckCircle size={12} /> Accepted
                        </span>
                      ) : (
                        <button onClick={() => handleAccept(ref)} disabled={!!accepting}
                          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white rounded-lg transition hover:opacity-90 disabled:opacity-50"
                          style={{ background: 'var(--color-primary)' }}>
                          {isAccepting
                            ? <Loader2 size={12} className="animate-spin" />
                            : <CheckCircle size={12} />}
                          Accept
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
