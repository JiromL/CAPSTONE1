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
          <div className="px-4 py-3 rounded-xl text-sm"
            style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
            {error}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-44 gap-2 text-sm"
            style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : intakes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 text-center rounded-xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <CheckCircle2 size={28} className="mb-3" style={{ color: 'var(--color-border-strong)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>No completed intakes yet</p>
          </div>
        ) : (
          intakes.map(intake => (
            <div key={intake._id} className="rounded-xl p-4 flex items-center gap-3"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--color-success-surface)' }}>
                <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{intake.student_name}</p>
                {intake.counselor_name && (
                  <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                    <User size={10} /> Assigned: {intake.counselor_name}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)' }}>
                  Completed
                </span>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
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
