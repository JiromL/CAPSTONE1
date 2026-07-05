"use client";

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function ReviewFormsPage() {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const res = await fetch('/api/forms?status=pending_review');
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

  const statuses = [
    { value: 'all', label: 'All', count: forms.length },
    { value: 'pending', label: 'Pending Review', count: forms.filter(f => f.status === 'pending').length },
    { value: 'approved', label: 'Approved', count: forms.filter(f => f.status === 'approved').length },
    { value: 'needs_revision', label: 'Needs Revision', count: forms.filter(f => f.status === 'revision').length },
  ];

  return (
    <PageShell title="Review Forms" subtitle="Review student submitted assessments">
      <div className="space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {statuses.map(s => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`px-4 py-2 rounded whitespace-nowrap transition ${
                filter === s.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s.label} <span className="ml-2 font-semibold">{s.count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        ) : forms.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <AlertCircle className="mx-auto mb-4 text-gray-400" size={32} />
            <p>No forms to review</p>
          </div>
        ) : (
          <div className="space-y-3">
            {forms.filter(f => filter === 'all' || f.status === filter).map(form => (
              <div key={form._id} className="border rounded-lg p-4 hover:shadow transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{form.student_name || 'Student'}</h3>
                    <p className="text-sm text-gray-600 mt-1">{form.form_type || 'Assessment'}</p>
                    <p className="text-xs text-gray-500 mt-1">Submitted: {new Date(form.submitted_date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-medium hover:bg-green-200">Approve</button>
                    <button className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm font-medium hover:bg-yellow-200">Revise</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
