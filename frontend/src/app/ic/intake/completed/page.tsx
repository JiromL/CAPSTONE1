"use client";

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { CheckCircle } from 'lucide-react';
import { api } from '@/utils/api';

interface CompletedIntake {
  _id: string;
  student_id: string;
  student_name: string;
  status: string;
  completed_at: string;
  counselor_name?: string;
}

export default function CompletedIntakesPage() {
  const [intakes, setIntakes] = useState<CompletedIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadIntakes = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(api('/api/intakes?status=completed'), {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        setIntakes(Array.isArray(data.intakes) ? data.intakes : []);
      } catch (err) {
        setError('Failed to load completed intakes');
      } finally {
        setLoading(false);
      }
    };
    loadIntakes();
  }, []);

  if (loading) return <PageShell title="Completed Intakes"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></PageShell>;

  return (
    <PageShell title="Completed Intakes" subtitle={`${intakes.length} completed`}>
      <div className="space-y-4">
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}
        {intakes.length === 0 ? (
          <div className="text-center py-8"><CheckCircle className="mx-auto mb-2 text-gray-400" size={32} /><p>No completed intakes</p></div>
        ) : (
          intakes.map(intake => (
            <div key={intake._id} className="border rounded p-4 border-green-200 bg-green-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{intake.student_name}</h3>
                  <p className="text-sm text-gray-600">{intake.counselor_name && `Assigned: ${intake.counselor_name}`}</p>
                  <p className="text-xs text-gray-500 mt-2">Completed: {new Date(intake.completed_at).toLocaleDateString()}</p>
                </div>
                <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded">✓ COMPLETED</span>
              </div>
            </div>
          ))
        )}
      </div>
    </PageShell>
  );
}
