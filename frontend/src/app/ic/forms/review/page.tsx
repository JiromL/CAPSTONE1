"use client";

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/utils/api';

export default function ReviewFormsPage() {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const token = () => localStorage.getItem('token');

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const res = await fetch(api('/api/forms?status=pending_review'), {
          headers: { Authorization: `Bearer ${token()}` },
        });
        if (res.ok) {
          const data = await res.json();
          setForms(Array.isArray(data) ? data : data.forms || []);
        }
      } catch {
        setForms([]);
      }
      setLoading(false);
    };
    fetchForms();
  }, []);

  const handleAction = async (formId: string, action: 'approve' | 'revise') => {
    setActioningId(formId);
    setError('');
    try {
      const res = await fetch(api(`/api/forms/${formId}/${action}`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setForms(prev => prev.map(f =>
          f._id === formId ? { ...f, status: action === 'approve' ? 'approved' : 'revision' } : f
        ));
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || `Failed to ${action} form.`);
      }
    } catch {
      setError(`Network error when trying to ${action}.`);
    } finally {
      setActioningId(null);
    }
  };

  const statuses = [
    { value: 'all',           label: 'All',            count: forms.length },
    { value: 'pending',       label: 'Pending Review', count: forms.filter(f => f.status === 'pending').length },
    { value: 'approved',      label: 'Approved',       count: forms.filter(f => f.status === 'approved').length },
    { value: 'needs_revision',label: 'Needs Revision', count: forms.filter(f => f.status === 'revision').length },
  ];

  return (
    <PageShell title="Review Forms" subtitle="Review student submitted assessments">
      <div className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
            style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

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
          <div className="flex items-center justify-center py-12 gap-2 text-sm"
            style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={16} className="animate-spin" /> Loading forms…
          </div>
        ) : forms.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="mx-auto mb-4" size={32} style={{ color: 'var(--color-text-muted)' }} />
            <p style={{ color: 'var(--color-text-secondary)' }}>No forms to review</p>
          </div>
        ) : (
          <div className="space-y-3">
            {forms.filter(f => filter === 'all' || f.status === filter).map(form => (
              <div key={form._id} className="rounded-xl p-4 transition"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{form.student_name || 'Student'}</h3>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{form.form_type || 'Assessment'}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      Submitted: {form.submitted_date ? new Date(form.submitted_date).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  {form.status !== 'approved' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(form._id, 'approve')}
                        disabled={actioningId === form._id}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition disabled:opacity-50"
                        style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                        {actioningId === form._id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(form._id, 'revise')}
                        disabled={actioningId === form._id}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
                        style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning-text)' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                        Revise
                      </button>
                    </div>
                  )}
                  {form.status === 'approved' && (
                    <span className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)' }}>
                      Approved
                    </span>
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
