'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { Loader2 } from 'lucide-react';

type Referral = {
  referral_id: string;
  referral_type: string;
  status: string;
  reason?: string;
  urgency?: string;
  created_at?: string;
  warm_handoff_completed?: boolean;
  receiving_provider?: string;
  service_type?: string;
  student_name?: string;
  case_number?: string;
  days_pending?: number;
  roi_signed?: boolean;
};

type Summary = {
  total_referrals: number;
  by_type: { CPS: number; EXTERNAL: number; INTERNAL: number };
  pending_warm_handoffs: number;
};

const IC = 'input';
const IC_S: React.CSSProperties = { border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' };
const onFocusIn  = (e: React.FocusEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-surface)'; };
const onFocusOut = (e: React.FocusEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; };

function statusStyle(status: string) {
  switch (status) {
    case 'SUBMITTED':           return { bg: 'var(--color-primary-surface)', text: 'var(--color-primary)', border: 'var(--color-primary)' };
    case 'ACKNOWLEDGED':        return { bg: 'var(--color-warning-surface)', text: 'var(--color-warning)', border: 'var(--color-warning)' };
    case 'IN_PROGRESS':         return { bg: 'var(--color-warning-surface)', text: 'var(--color-warning)', border: 'var(--color-warning)' };
    case 'COMPLETED':           return { bg: 'var(--color-success-surface)', text: 'var(--color-success)', border: 'var(--color-success)' };
    case 'ASSIGNED':            return { bg: '#F5F3FF', text: '#7C3AED', border: '#C4B5FD' };
    case 'UNDER_INVESTIGATION': return { bg: 'var(--color-danger-surface)', text: 'var(--color-danger)', border: 'var(--color-danger)' };
    default:                    return { bg: 'var(--color-bg)', text: 'var(--color-text-muted)', border: 'var(--color-border)' };
  }
}

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
    case_id: '', referral_type: 'EXTERNAL', reason: '', urgency: 'routine', receiving_provider_name: '', service_type: '',
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) { const u = JSON.parse(userData); setUserRole(u.role || ''); }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { setError('Not authenticated'); setLoading(false); return; }
      const [summaryRes, handoffsRes, casesRes] = await Promise.all([
        fetch(api('/api/referrals/summary'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(api('/api/referrals/pending-warm-handoffs'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(api('/api/cases'), { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (handoffsRes.ok) { const h = await handoffsRes.json(); setPendingHandoffs(h.referrals || []); }
      if (casesRes.ok) { const d = await casesRes.json(); setCases(d.cases || []); }
    } catch { setError('Failed to load referrals data'); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!createForm.case_id || !createForm.reason) { setError('Case and reason are required'); return; }
    try {
      setCreating(true);
      const token = localStorage.getItem('token');
      const res = await fetch(api('/api/referrals/initiate'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to create referral'); }
      setCreateSuccess('Referral created successfully');
      setShowCreateModal(false);
      setCreateForm({ case_id: '', referral_type: 'EXTERNAL', reason: '', urgency: 'routine', receiving_provider_name: '', service_type: '' });
      await loadData();
      setTimeout(() => setCreateSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally { setCreating(false); }
  };

  const canCreateReferral = ['COUNSELOR', 'PSYCHOLOGIST', 'IC', 'ADMIN', 'DPO'].includes(userRole);
  const isStudent = userRole === 'STUDENT';
  const [actingId, setActingId] = useState<string | null>(null);

  const doAction = async (referralId: string, path: string, body?: any) => {
    setActingId(referralId);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api(`/api/referrals/${referralId}/${path}`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Action failed'); }
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActingId(null);
    }
  };

  const handleAcknowledge = (id: string) => doAction(id, 'acknowledge');
  const handleRequestRoi = (id: string) => doAction(id, 'roi-request');
  const handleCompleteHandoff = (id: string) => {
    if (!confirm('Confirm the warm handoff was completed — the student was connected to the receiving provider?')) return;
    return doAction(id, 'warm-handoff');
  };

  const handleUploadRoi = async (referralId: string, file: File) => {
    setActingId(referralId);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(api(`/api/referrals/${referralId}/roi-upload`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'ROI upload failed'); }
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <DashboardPageWrapper title="Referrals" subtitle="View and manage service referrals">
        <div className="flex items-center justify-center py-12 gap-2" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper
      title="Referrals"
      subtitle="View and manage service referrals"
      actions={canCreateReferral ? (
        <button onClick={() => setShowCreateModal(true)} className="btn-primary !min-h-11 !px-5 !text-sm">
          <Plus size={16} /> New referral
        </button>
      ) : undefined}
    >
      <div className="space-y-6">
        {error && (
          <div className="flex gap-3 p-4 rounded-lg items-start" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
            <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
            <button onClick={() => setError(null)} className="ml-auto" style={{ color: 'var(--color-danger)' }}>×</button>
          </div>
        )}
        {createSuccess && (
          <div className="p-3 rounded text-sm" style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)', color: 'var(--color-success)' }}>
            {createSuccess}
          </div>
        )}

        {!isStudent && summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Referrals', value: summary.total_referrals },
              { label: 'External', value: summary.by_type.EXTERNAL },
              { label: 'Internal', value: summary.by_type.INTERNAL },
              { label: 'Pending Handoffs', value: summary.pending_warm_handoffs },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border shadow-card p-4 text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{s.value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {!isStudent && (
          <div>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
              Pending Warm Handoffs ({pendingHandoffs.length})
            </h2>
            {pendingHandoffs.length === 0 ? (
              <div className="rounded-2xl border shadow-card p-8 flex flex-col items-center text-center gap-2" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1" style={{ background: 'var(--color-success-surface)' }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>All handoffs complete</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No referrals are awaiting warm handoff confirmation.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingHandoffs.map(r => (
                  <ReferralCard key={r.referral_id} referral={r}
                    canAct={canCreateReferral} busy={actingId === r.referral_id}
                    onAcknowledge={() => handleAcknowledge(r.referral_id)}
                    onRequestRoi={() => handleRequestRoi(r.referral_id)}
                    onUploadRoi={file => handleUploadRoi(r.referral_id, file)}
                    onCompleteHandoff={() => handleCompleteHandoff(r.referral_id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {isStudent && (
          <div className="space-y-4">
            <div className="rounded-2xl border shadow-card p-8 text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p style={{ color: 'var(--color-text-secondary)' }}>No referrals on file.</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Your counselor may create referrals for specialized services as needed.</p>
            </div>
            <div className="rounded-2xl border shadow-card p-6" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>About Referrals</h3>
              <ul className="text-sm space-y-1 list-disc pl-5" style={{ color: 'var(--color-text-secondary)' }}>
                <li>Mental health specialists and psychiatrists</li>
                <li>Group therapy programs</li>
                <li>Crisis intervention services</li>
                <li>Substance abuse treatment</li>
                <li>Academic and disability support</li>
              </ul>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in" style={{ background: 'var(--color-surface)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>New Referral</h3>
                <button onClick={() => setShowCreateModal(false)} className="transition"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Case', field: 'case_id', type: 'select', options: [
                    { value: '', label: 'Select a case…' },
                    ...cases.map(c => ({ value: c._id, label: `${c.case_number || c._id} — ${c.presenting_issue?.slice(0, 40) || 'No issue listed'}` })),
                  ]},
                  { label: 'Referral Type', field: 'referral_type', type: 'select', options: [
                    { value: 'EXTERNAL', label: 'External' }, { value: 'INTERNAL', label: 'Internal' },
                  ]},
                  { label: 'Urgency', field: 'urgency', type: 'select', options: [
                    { value: 'routine', label: 'Routine' }, { value: 'urgent', label: 'Urgent' },
                  ]},
                ].map(({ label, field, type, options }) => (
                  <div key={field}>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>
                    <select value={(createForm as any)[field]} onChange={e => setCreateForm({ ...createForm, [field]: e.target.value })}
                      className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut}>
                      {options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Provider / Service{createForm.referral_type === 'EXTERNAL' ? ' *' : ''}
                  </label>
                  <input type="text" value={createForm.receiving_provider_name} onChange={e => setCreateForm({ ...createForm, receiving_provider_name: e.target.value })}
                    placeholder="Provider name or service" className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Reason</label>
                  <textarea value={createForm.reason} onChange={e => setCreateForm({ ...createForm, reason: e.target.value })}
                    rows={3} placeholder="Clinical reason for referral…" className={IC} style={IC_S} onFocus={onFocusIn} onBlur={onFocusOut} />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleCreate} disabled={creating}
                  className="flex-1 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition hover:opacity-90"
                  style={{ background: 'var(--color-primary)' }}>
                  {creating ? 'Creating…' : 'Create Referral'}
                </button>
                <button onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-sm transition border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
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

function ReferralCard({ referral, canAct, busy, onAcknowledge, onRequestRoi, onUploadRoi, onCompleteHandoff }: {
  referral: Referral;
  canAct?: boolean;
  busy?: boolean;
  onAcknowledge?: () => void;
  onRequestRoi?: () => void;
  onUploadRoi?: (file: File) => void;
  onCompleteHandoff?: () => void;
}) {
  const st = statusStyle(referral.status);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isExternal = referral.referral_type === 'EXTERNAL';
  const needsRoi = isExternal && !referral.roi_signed;
  const canAcknowledge = canAct && referral.status === 'SUBMITTED';
  const canCompleteHandoff = canAct && !referral.warm_handoff_completed && referral.status !== 'SUBMITTED' && !(isExternal && needsRoi);

  const btnStyle: React.CSSProperties = { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' };

  return (
    <div className="rounded-2xl border shadow-card p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {referral.referral_type} Referral{referral.receiving_provider ? ` — ${referral.receiving_provider}` : ''}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {referral.student_name || 'Unknown student'}{referral.case_number ? ` · ${referral.case_number}` : ''}
          </p>
          {referral.reason && <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{referral.reason}</p>}
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0"
          style={{ background: st.bg, color: st.text, borderColor: st.border }}>
          {referral.status}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs mt-2 flex-wrap" style={{ color: 'var(--color-text-muted)' }}>
        {referral.urgency && <span className="capitalize">Urgency: {referral.urgency}</span>}
        {referral.created_at && <span>{new Date(referral.created_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}</span>}
        {typeof referral.days_pending === 'number' && <span>{referral.days_pending}d pending</span>}
        {isExternal && (
          <span className="font-medium" style={{ color: referral.roi_signed ? 'var(--color-success)' : 'var(--color-warning)' }}>
            {referral.roi_signed ? 'ROI signed' : 'ROI not signed'}
          </span>
        )}
        {!referral.warm_handoff_completed && (
          <span className="font-medium" style={{ color: 'var(--color-warning)' }}>Handoff pending</span>
        )}
      </div>

      {canAct && (
        <div className="flex items-center gap-2 mt-3 pt-3 flex-wrap" style={{ borderTop: '1px solid var(--color-border)' }}>
          {canAcknowledge && (
            <button onClick={onAcknowledge} disabled={busy}
              className="px-3 py-1.5 text-xs rounded-lg border transition disabled:opacity-50" style={btnStyle}>
              {busy ? 'Working…' : 'Acknowledge'}
            </button>
          )}
          {isExternal && needsRoi && (
            <>
              <button onClick={onRequestRoi} disabled={busy}
                className="px-3 py-1.5 text-xs rounded-lg border transition disabled:opacity-50" style={btnStyle}>
                Request ROI Signature
              </button>
              <button onClick={() => fileInputRef.current?.click()} disabled={busy}
                className="px-3 py-1.5 text-xs rounded-lg border transition disabled:opacity-50" style={btnStyle}>
                Upload Signed ROI
              </button>
              <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f && onUploadRoi) onUploadRoi(f); e.target.value = ''; }} />
            </>
          )}
          {canCompleteHandoff && (
            <button onClick={onCompleteHandoff} disabled={busy}
              className="px-3 py-1.5 text-xs rounded-lg text-white transition disabled:opacity-50 hover:opacity-90"
              style={{ background: 'var(--color-success)' }}>
              Mark Warm Handoff Complete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
