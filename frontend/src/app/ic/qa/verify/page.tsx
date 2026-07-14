"use client";

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { api } from '@/utils/api';

export default function VerifyPage() {
  const [intakes, setIntakes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const token = () => localStorage.getItem('token');

  useEffect(() => {
    const fetchIntakes = async () => {
      try {
        const res = await fetch(api('/api/intake/list?status=completed'), {
          headers: { Authorization: `Bearer ${token()}` },
        });
        if (res.ok) {
          const data = await res.json();
          setIntakes(Array.isArray(data) ? data : data.intakes || []);
        }
      } catch { setIntakes([]); }
      setLoading(false);
    };
    fetchIntakes();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActioningId(id);
    try {
      const res = await fetch(api(`/api/intake/${id}/verify`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setIntakes(prev => prev.map(i =>
          i._id === id ? { ...i, verification_status: action === 'approve' ? 'approved' : 'rejected' } : i
        ));
      }
    } catch { }
    finally { setActioningId(null); }
  };

  const statuses = [
    { value: 'pending',  label: 'Pending Verification', count: intakes.filter(i => i.verification_status === 'pending').length },
    { value: 'approved', label: 'Approved',              count: intakes.filter(i => i.verification_status === 'approved').length },
    { value: 'rejected', label: 'Rejected',              count: intakes.filter(i => i.verification_status === 'rejected').length },
  ];

  return (
    <PageShell title="Verify Intakes" subtitle="QA verification of completed intake forms">
      <div className="space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {statuses.map(s => (
            <button key={s.value} onClick={() => setFilter(s.value)}
              className="px-4 py-2 rounded-lg whitespace-nowrap transition text-sm font-medium"
              style={filter === s.value
                ? { background: 'var(--color-primary)', color: '#fff' }
                : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => { if (filter !== s.value) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-border)'; }}
              onMouseLeave={e => { if (filter !== s.value) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)'; }}>
              {s.label} <span className="ml-1.5 font-semibold">{s.count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={16} className="animate-spin" /> Loading intakes…
          </div>
        ) : intakes.filter(i => i.verification_status === filter).length === 0 ? (
          <div className="text-center py-12">
            <Clock className="mx-auto mb-4" size={32} style={{ color: 'var(--color-text-muted)' }} />
            <p style={{ color: 'var(--color-text-secondary)' }}>No intakes in this category</p>
          </div>
        ) : (
          <div className="space-y-3">
            {intakes.filter(i => i.verification_status === filter).map(intake => (
              <div key={intake._id} className="rounded-xl p-4 transition"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{intake.student_name}</h3>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>ID: {intake._id.slice(-8)}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      Completed: {intake.completed_date ? new Date(intake.completed_date).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  {filter === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(intake._id, 'approve')}
                        disabled={actioningId === intake._id}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition disabled:opacity-50"
                        style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                        {actioningId === intake._id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(intake._id, 'reject')}
                        disabled={actioningId === intake._id}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition disabled:opacity-50"
                        style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger)' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
