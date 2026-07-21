"use client";

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { AlertCircle } from 'lucide-react';
import { api } from '@/utils/api';

interface OverdueIntake {
  _id: string;
  student_id: string;
  student_name: string;
  deadline: string;
  days_overdue: number;
}

export default function OverdueIntakesPage() {
  const [intakes, setIntakes] = useState<OverdueIntake[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadIntakes = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(api('/api/intake/list?status=overdue'), {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        setIntakes(Array.isArray(data.intakes) ? data.intakes : []);
      } finally {
        setLoading(false);
      }
    };
    loadIntakes();
  }, []);

  if (loading) return (
    <PageShell title="Overdue Intakes">
      <div className="animate-spin rounded-full h-8 w-8"
        style={{ borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent', borderBottomColor: 'var(--color-primary)' }} />
    </PageShell>
  );

  return (
    <PageShell title="Overdue Intakes" subtitle={`${intakes.length} overdue - PRIORITY`}>
      <div className="space-y-4">
        {intakes.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto mb-2" size={32} style={{ color: 'var(--color-text-muted)' }} />
            <p style={{ color: 'var(--color-text-secondary)' }}>No overdue intakes!</p>
          </div>
        ) : (
          intakes.map(intake => (
            <div key={intake._id} className="rounded p-4"
              style={{ border: '1px solid var(--color-danger)', background: 'var(--color-danger-surface)' }}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--color-danger-text)' }}>{intake.student_name}</h3>
                  <p className="text-sm" style={{ color: 'var(--color-danger)' }}>Due: {new Date(intake.deadline).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}</p>
                  <p className="text-sm font-bold mt-1" style={{ color: 'var(--color-danger-text)' }}>⚠️ {intake.days_overdue} days overdue</p>
                </div>
                <span className="text-xs px-3 py-1 rounded font-bold"
                  style={{ background: 'var(--color-danger)', color: '#fff' }}>
                  OVERDUE
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </PageShell>
  );
}
