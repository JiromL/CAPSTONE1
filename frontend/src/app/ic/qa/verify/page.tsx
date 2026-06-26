"use client";

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function VerifyPage() {
  const [intakes, setIntakes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    const fetchIntakes = async () => {
      try {
        const res = await fetch('/api/intakes?status=completed');
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

  const statuses = [
    { value: 'pending', label: 'Pending Verification', count: intakes.filter(i => i.verification_status === 'pending').length },
    { value: 'approved', label: 'Approved', count: intakes.filter(i => i.verification_status === 'approved').length },
    { value: 'rejected', label: 'Rejected', count: intakes.filter(i => i.verification_status === 'rejected').length },
  ];

  return (
    <PageShell title="Verify Intakes" subtitle="QA verification of completed intake forms">
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
        ) : intakes.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <Clock className="mx-auto mb-4 text-gray-400" size={32} />
            <p>No intakes to verify</p>
          </div>
        ) : (
          <div className="space-y-3">
            {intakes.filter(i => i.verification_status === filter).map(intake => (
              <div key={intake._id} className="border rounded-lg p-4 hover:shadow transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{intake.student_name}</h3>
                    <p className="text-sm text-gray-600 mt-1">ID: {intake._id.slice(-8)}</p>
                    <p className="text-xs text-gray-500 mt-1">Completed: {new Date(intake.completed_date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-green-100 text-blue-700 rounded text-sm font-medium hover:bg-green-200 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Approve
                    </button>
                    <button className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200 flex items-center gap-1">
                      <XCircle size={14} /> Reject
                    </button>
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
