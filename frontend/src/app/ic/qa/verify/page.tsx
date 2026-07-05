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
      } catch {
        setIntakes([]);
      }
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
    } catch { /* silent — action just won't update locally */ }
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
            <Loader2 size={16} className="animate-spin" /> Loading intakes…
          </div>
        ) : intakes.filter(i => i.verification_status === filter).length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <Clock className="mx-auto mb-4 text-gray-400" size={32} />
            <p>No intakes in this category</p>
          </div>
        ) : (
          <div className="space-y-3">
            {intakes.filter(i => i.verification_status === filter).map(intake => (
              <div key={intake._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{intake.student_name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">ID: {intake._id.slice(-8)}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Completed: {intake.completed_date ? new Date(intake.completed_date).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  {filter === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(intake._id, 'approve')}
                        disabled={actioningId === intake._id}
                        className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 disabled:opacity-50 flex items-center gap-1.5 transition"
                      >
                        {actioningId === intake._id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(intake._id, 'reject')}
                        disabled={actioningId === intake._id}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50 flex items-center gap-1.5 transition"
                      >
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
