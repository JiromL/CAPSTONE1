"use client";

import { useEffect, useState } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { CheckCircle2, Loader2, User } from 'lucide-react';
import { api } from '@/utils/api';

interface CompletedIntake {
  _id: string;
  student_name: string;
  counselor_name?: string;
  completed_at: string;
}

export default function CompletedIntakesPage() {
  const [intakes, setIntakes] = useState<CompletedIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const r = await fetch(api('/api/intake/list?status=completed'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error(`${r.status}`);
        const data = await r.json();
        setIntakes(Array.isArray(data.intakes) ? data.intakes : []);
      } catch {
        setError('Failed to load completed intakes.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <DashboardPageWrapper
      title="Completed Intakes"
      subtitle={loading ? 'Loading…' : `${intakes.length} completed`}
    >
      <div className="max-w-3xl space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-44 gap-2 text-gray-400 text-sm">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : intakes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 text-center bg-white rounded-xl border border-gray-200">
            <CheckCircle2 size={28} className="text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-600">No completed intakes yet</p>
          </div>
        ) : (
          intakes.map(intake => (
            <div key={intake._id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={18} className="text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{intake.student_name}</p>
                {intake.counselor_name && (
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <User size={10} /> Assigned: {intake.counselor_name}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">Completed</span>
                <p className="text-xs text-gray-400 mt-1">
                  {intake.completed_at ? new Date(intake.completed_at).toLocaleDateString() : '—'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardPageWrapper>
  );
}
