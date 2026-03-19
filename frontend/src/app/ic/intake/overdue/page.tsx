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
        const response = await fetch(api('/api/intakes?status=overdue'), {
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

  if (loading) return <PageShell title="Overdue Intakes"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></PageShell>;

  return (
    <PageShell title="Overdue Intakes" subtitle={`${intakes.length} overdue - PRIORITY`}>
      <div className="space-y-4">
        {intakes.length === 0 ? (
          <div className="text-center py-8"><AlertCircle className="mx-auto mb-2 text-gray-400" size={32} /><p>No overdue intakes!</p></div>
        ) : (
          intakes.map(intake => (
            <div key={intake._id} className="border rounded p-4 border-red-200 bg-red-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-red-900">{intake.student_name}</h3>
                  <p className="text-sm text-red-700">Due: {new Date(intake.deadline).toLocaleDateString()}</p>
                  <p className="text-sm font-bold text-red-900 mt-1">⚠️ {intake.days_overdue} days overdue</p>
                </div>
                <span className="text-xs bg-red-200 text-red-800 px-3 py-1 rounded font-bold">OVERDUE</span>
              </div>
            </div>
          ))
        )}
      </div>
    </PageShell>
  );
}
