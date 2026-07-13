'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, CheckCircle, Clock, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
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

export default function MyReferralsPage() {
  const router = useRouter();
  const [referrals, setReferrals] = useState<PoolReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState<string | null>(null);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());

  const loadReferrals = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(api('/api/referrals/pool'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Failed to load referrals');
        return;
      }
      const data = await res.json();
      setReferrals(data.referrals || []);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadReferrals(); }, [loadReferrals]);

  const handleAccept = async (referral: PoolReferral) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setAccepting(referral.referral_id);
    try {
      const res = await fetch(api(`/api/referrals/${referral.referral_id}/accept`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setAcceptedIds(prev => new Set([...prev, referral.referral_id]));
        // Remove from list after short delay
        setTimeout(() => {
          setReferrals(prev => prev.filter(r => r.referral_id !== referral.referral_id));
          setAcceptedIds(prev => { const n = new Set(prev); n.delete(referral.referral_id); return n; });
        }, 1500);
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || 'Failed to accept referral');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setAccepting(null);
    }
  };

  const urgencyBadge = (urgency: string) => {
    const u = (urgency || 'routine').toLowerCase();
    if (u === 'urgent') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <AlertCircle size={10} /> Urgent
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
        <Clock size={10} /> Routine
      </span>
    );
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return iso; }
  };

  return (
    <DashboardPageWrapper
      title="My Referrals"
      subtitle="Pool referrals assigned to your role"
      requiredRoles={['COUNSELOR', 'PSYCHOLOGIST']}
    >
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">My Referrals</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Cases referred to your role pool — accept to take ownership
            </p>
          </div>
          <button
            onClick={loadReferrals}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm border border-red-100 dark:border-red-800">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb]" />
          </div>
        ) : referrals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400 dark:text-gray-600">
            <Users size={40} strokeWidth={1.5} />
            <p className="text-sm">No pending pool referrals for your role</p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map(ref => {
              const isAccepted = acceptedIds.has(ref.referral_id);
              const isAccepting = accepting === ref.referral_id;
              return (
                <div
                  key={ref.referral_id}
                  className="rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-gray-900 dark:text-gray-50">
                          {ref.student_name || 'Unknown Student'}
                        </span>
                        {ref.student_id && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            ID: {ref.student_id}
                          </span>
                        )}
                        {urgencyBadge(ref.urgency)}
                      </div>

                      {ref.reason && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                          {ref.reason}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
                        {ref.referred_by && (
                          <span>Referred by: <span className="text-gray-600 dark:text-gray-400">{ref.referred_by}</span></span>
                        )}
                        <span>Received: {formatDate(ref.created_at)}</span>
                        <span className="capitalize">Role: {ref.assigned_to_role?.toLowerCase()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {ref.case_id && (
                        <button
                          onClick={() => router.push(`/cases/${ref.case_id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <ExternalLink size={12} />
                          View Case
                        </button>
                      )}
                      {isAccepted ? (
                        <span className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <CheckCircle size={12} />
                          Accepted
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAccept(ref)}
                          disabled={!!accepting}
                          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 rounded-lg transition-colors"
                        >
                          {isAccepting ? (
                            <span className="animate-spin rounded-full h-3 w-3 border-b border-white" />
                          ) : (
                            <CheckCircle size={12} />
                          )}
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
