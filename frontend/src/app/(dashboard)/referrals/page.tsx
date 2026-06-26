'use client';

import { useState, useEffect } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

type Referral = {
  referral_id: string;
  referral_type: string;
  status: string;
  reason?: string;
  urgency?: string;
  created_at?: string;
  warm_handoff_completed?: boolean;
  referring_counselor?: string;
  provider_name?: string;
  service_type?: string;
};

type Summary = {
  total_referrals: number;
  by_type: { CPS: number; EXTERNAL: number; INTERNAL: number };
  pending_warm_handoffs: number;
};

export default function ReferralsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [pendingHandoffs, setPendingHandoffs] = useState<Referral[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    case_id: '',
    referral_type: 'EXTERNAL',
    reason: '',
    urgency: 'routine',
    provider_name: '',
    service_type: '',
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const u = JSON.parse(userData);
      setUserRole(u.role || '');
    }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { setError('Not authenticated'); setLoading(false); return; }

      const [summaryRes, handoffsRes] = await Promise.all([
        fetch(api('/api/referrals/summary'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(api('/api/referrals/pending-warm-handoffs'), { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (handoffsRes.ok) {
        const h = await handoffsRes.json();
        setPendingHandoffs(h.referrals || []);
      }

      // Load cases so counselors can pick one when creating a referral
      const casesRes = await fetch(api('/api/cases'), { headers: { Authorization: `Bearer ${token}` } });
      if (casesRes.ok) {
        const d = await casesRes.json();
        setCases(d.cases || []);
      }
    } catch (err) {
      setError('Failed to load referrals data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.case_id || !createForm.reason) {
      setError('Case and reason are required');
      return;
    }
    try {
      setCreating(true);
      const token = localStorage.getItem('token');
      const res = await fetch(api('/api/referrals/initiate'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'Failed to create referral');
      }
      setCreateSuccess('Referral created successfully');
      setShowCreateModal(false);
      setCreateForm({ case_id: '', referral_type: 'EXTERNAL', reason: '', urgency: 'routine', provider_name: '', service_type: '' });
      await loadData();
      setTimeout(() => setCreateSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const canCreateReferral = ['COUNSELOR', 'PSYCHOLOGIST', 'IC', 'ADMIN', 'DPO'].includes(userRole);
  const isStudent = userRole === 'STUDENT';

  if (loading) {
    return (
      <DashboardPageWrapper title="Referrals" subtitle="View and manage service referrals">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-400" />
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Referrals" subtitle="View and manage service referrals">
      <div className="space-y-6">
        {error && (
          <div className="flex gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-500">×</button>
          </div>
        )}
        {createSuccess && (
          <div className="p-3 bg-green-50 dark:bg-blue-900/20 border border-green-200 dark:border-blue-700 rounded text-sm text-blue-700 dark:text-green-300">
            {createSuccess}
          </div>
        )}

        {/* Summary cards — only for staff roles */}
        {!isStudent && summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Referrals', value: summary.total_referrals },
              { label: 'External', value: summary.by_type.EXTERNAL },
              { label: 'Internal', value: summary.by_type.INTERNAL },
              { label: 'Pending Handoffs', value: summary.pending_warm_handoffs },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Create referral (staff only) */}
        {canCreateReferral && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Create Referral</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                <Plus size={14} /> New Referral
              </button>
            </div>
          </div>
        )}

        {/* Pending warm handoffs */}
        {!isStudent && (
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">
              Pending Warm Handoffs ({pendingHandoffs.length})
            </h2>
            {pendingHandoffs.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                <p className="text-sm text-gray-500">No pending warm handoffs.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingHandoffs.map((r) => (
                  <ReferralCard key={r.referral_id} referral={r} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Student view */}
        {isStudent && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">No referrals on file.</p>
              <p className="text-sm text-gray-500 mt-1">Your counselor may create referrals for specialized services as needed.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">About Referrals</h3>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc pl-5">
                <li>Mental health specialists and psychiatrists</li>
                <li>Group therapy programs</li>
                <li>Crisis intervention services</li>
                <li>Substance abuse treatment</li>
                <li>Academic and disability support</li>
              </ul>
            </div>
          </div>
        )}

        {/* Create Referral Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">New Referral</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Case</label>
                  <select
                    value={createForm.case_id}
                    onChange={(e) => setCreateForm({ ...createForm, case_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                  >
                    <option value="">Select a case…</option>
                    {cases.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.case_number || c._id} — {c.presenting_issue?.slice(0, 40) || 'No issue listed'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Referral Type</label>
                  <select
                    value={createForm.referral_type}
                    onChange={(e) => setCreateForm({ ...createForm, referral_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                  >
                    <option value="EXTERNAL">External</option>
                    <option value="INTERNAL">Internal</option>
                    <option value="CPS">CPS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Urgency</label>
                  <select
                    value={createForm.urgency}
                    onChange={(e) => setCreateForm({ ...createForm, urgency: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Provider / Service</label>
                  <input
                    type="text"
                    value={createForm.provider_name}
                    onChange={(e) => setCreateForm({ ...createForm, provider_name: e.target.value })}
                    placeholder="Provider name or service"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                  <textarea
                    value={createForm.reason}
                    onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                    rows={3}
                    placeholder="Clinical reason for referral…"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
                >
                  {creating ? 'Creating…' : 'Create Referral'}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}

function ReferralCard({ referral }: { referral: Referral }) {
  const statusColors: Record<string, string> = {
    SUBMITTED: 'bg-blue-100 text-blue-800',
    ACKNOWLEDGED: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-orange-100 text-orange-800',
    COMPLETED: 'bg-green-100 text-blue-800',
    ASSIGNED: 'bg-purple-100 text-purple-800',
    UNDER_INVESTIGATION: 'bg-red-100 text-red-800',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            {referral.referral_type} Referral
            {referral.provider_name ? ` — ${referral.provider_name}` : ''}
          </p>
          {referral.reason && <p className="text-xs text-gray-500 mt-0.5">{referral.reason}</p>}
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[referral.status] || 'bg-gray-100 text-gray-700'}`}>
          {referral.status}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
        {referral.urgency && <span className="capitalize">Urgency: {referral.urgency}</span>}
        {referral.created_at && <span>{new Date(referral.created_at).toLocaleDateString()}</span>}
        {!referral.warm_handoff_completed && (
          <span className="text-orange-600 font-medium">Handoff pending</span>
        )}
      </div>
    </div>
  );
}
