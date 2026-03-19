"use client";

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Clock } from 'lucide-react';
import { api } from '@/utils/api';

interface PendingIntake {
  _id: string;
  student_id: string;
  student_name: string;
  status: string;
  created_at: string;
  deadline: string;
  concern: string;
}

export default function PendingIntakesPage() {
  const [intakes, setIntakes] = useState<PendingIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadIntakes = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(api('/api/intakes?status=pending'), {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        setIntakes(Array.isArray(data.intakes) ? data.intakes : []);
      } catch (err) {
        setError('Failed to load pending intakes');
      } finally {
        setLoading(false);
      }
    };
    loadIntakes();
  }, []);

  if (loading) return <PageShell title="Pending Intakes"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></PageShell>;

  return (
    <PageShell title="Pending Intakes" subtitle={`${intakes.length} pending`}>
      <div className="space-y-4">
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}
        {intakes.length === 0 ? (
          <div className="text-center py-8"><Clock className="mx-auto mb-2 text-gray-400" size={32} /><p>No pending intakes</p></div>
        ) : (
          intakes.map(intake => (
            <div key={intake._id} className="border rounded p-4 hover:shadow transition">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{intake.student_name}</h3>
                  <p className="text-sm text-gray-600">{intake.concern}</p>
                  <p className="text-xs text-gray-500 mt-2">Due: {new Date(intake.deadline).toLocaleDateString()}</p>
                </div>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded">PENDING</span>
              </div>
            </div>
          ))
        )}
      </div>
    </PageShell>
  );
}
