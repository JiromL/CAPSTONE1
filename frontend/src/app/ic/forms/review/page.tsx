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
    { value: 'all',          label: 'All',           count: forms.length },
    { value: 'pending',      label: 'Pending Review', count: forms.filter(f => f.status === 'pending').length },
    { value: 'approved',     label: 'Approved',       count: forms.filter(f => f.status === 'approved').length },
    { value: 'needs_revision', label: 'Needs Revision', count: forms.filter(f => f.status === 'revision').length },
  ];

  return (
    <PageShell title="Review Forms" subtitle="Review student submitted assessments">
      <div className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2">
          {statuses.map(s => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition text-sm font-medium ${
                filter === s.value
                  ? 'bg-[#2563eb] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s.label} <span className="ml-1.5 font-semibold">{s.count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-gray-400 text-sm">
            <Loader2 size={16} className="animate-spin" /> Loading forms…
          </div>
        ) : forms.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <CheckCircle2 className="mx-auto mb-4 text-gray-400" size={32} />
            <p>No forms to review</p>
          </div>
        ) : (
          <div className="space-y-3">
            {forms.filter(f => filter === 'all' || f.status === filter).map(form => (
              <div key={form._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{form.student_name || 'Student'}</h3>
                    <p className="text-sm text-gray-600 mt-0.5">{form.form_type || 'Assessment'}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Submitted: {form.submitted_date ? new Date(form.submitted_date).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  {form.status !== 'approved' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(form._id, 'approve')}
                        disabled={actioningId === form._id}
                        className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 disabled:opacity-50 flex items-center gap-1.5 transition"
                      >
                        {actioningId === form._id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(form._id, 'revise')}
                        disabled={actioningId === form._id}
                        className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 disabled:opacity-50 transition"
                      >
                        Revise
                      </button>
                    </div>
                  )}
                  {form.status === 'approved' && (
                    <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full font-medium">Approved</span>
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
