"use client";

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Clock } from 'lucide-react';
import { api } from '@/utils/api';

interface InProgressIntake {
  _id: string;
  student_id: string;
  student_name: string;
  status: string;
  created_at: string;
  last_updated: string;
}

export default function InProgressIntakesPage() {
  const [intakes, setIntakes] = useState<InProgressIntake[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadIntakes = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(api('/api/intake/list?status=in_progress'), {
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
    <PageShell title="Intakes In Progress">
      <div className="animate-spin rounded-full h-8 w-8"
        style={{ borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent', borderBottomColor: 'var(--color-primary)' }} />
    </PageShell>
  );

  return (
    <PageShell title="Intakes In Progress" subtitle={`${intakes.length} in progress`}>
      <div className="space-y-4">
        {intakes.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="mx-auto mb-2" size={32} style={{ color: 'var(--color-text-muted)' }} />
            <p style={{ color: 'var(--color-text-secondary)' }}>No intakes in progress</p>
          </div>
        ) : (
          intakes.map(intake => (
            <div key={intake._id} className="rounded p-4"
              style={{ border: '1px solid var(--color-primary-surface)', background: 'var(--color-primary-surface)' }}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{intake.student_name}</h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Started: {new Date(intake.created_at).toLocaleDateString()}</p>
                  <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>Updated: {new Date(intake.last_updated).toLocaleDateString()}</p>
                </div>
                <span className="text-xs px-3 py-1 rounded font-semibold"
                  style={{ background: 'var(--color-primary-muted)', color: 'var(--color-primary)' }}>
                  IN PROGRESS
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </PageShell>
  );
}
