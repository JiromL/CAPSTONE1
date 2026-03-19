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
        const response = await fetch(api('/api/intakes?status=in_progress'), {
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

  if (loading) return <PageShell title="Intakes In Progress"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></PageShell>;

  return (
    <PageShell title="Intakes In Progress" subtitle={`${intakes.length} in progress`}>
      <div className="space-y-4">
        {intakes.length === 0 ? (
          <div className="text-center py-8"><Clock className="mx-auto mb-2 text-gray-400" size={32} /><p>No intakes in progress</p></div>
        ) : (
          intakes.map(intake => (
            <div key={intake._id} className="border rounded p-4 border-blue-200 bg-blue-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{intake.student_name}</h3>
                  <p className="text-sm text-gray-600">Started: {new Date(intake.created_at).toLocaleDateString()}</p>
                  <p className="text-xs text-gray-500 mt-2">Updated: {new Date(intake.last_updated).toLocaleDateString()}</p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded">IN PROGRESS</span>
              </div>
            </div>
          ))
        )}
      </div>
    </PageShell>
  );
}
