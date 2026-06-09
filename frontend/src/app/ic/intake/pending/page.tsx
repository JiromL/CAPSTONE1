"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageShell from '@/components/PageShell';
import { Clock, ClipboardList, AlertCircle } from 'lucide-react';
import { api } from '@/utils/api';

interface PendingIntake {
  _id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  status: string;
  created_at: string;
  deadline: string;
  concern: string;
  risk_level?: string;
  is_emergency?: boolean;
}

function fmt(d: string) {
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return d; }
}

const RISK_CLS: Record<string, string> = {
  GREEN:    'bg-green-50 text-green-700',
  YELLOW:   'bg-yellow-50 text-yellow-700',
  RED:      'bg-red-50 text-red-700',
  CRITICAL: 'bg-red-100 text-red-800 font-bold',
};

export default function PendingIntakesPage() {
  const router = useRouter();
  const [intakes, setIntakes]   = useState<PendingIntake[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const r = await fetch(api('/api/intake/list?status=pending'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        setIntakes(Array.isArray(d.intakes) ? d.intakes : []);
      } catch {
        setError('Failed to load pending intakes');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return (
    <PageShell title="Pending Intakes">
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a5228]" />
      </div>
    </PageShell>
  );

  return (
    <PageShell title="Pending Intakes" subtitle={`${intakes.length} awaiting intake session`}>
      <div className="space-y-3 max-w-3xl">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {intakes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Clock className="mx-auto mb-2" size={32} />
            <p className="text-sm">No pending intakes</p>
          </div>
        ) : (
          intakes.map(intake => {
            const isOverdue = new Date(intake.deadline) < new Date();
            const risk = (intake.risk_level || 'GREEN').toUpperCase();
            return (
              <div key={intake._id}
                className={`bg-white border rounded-xl p-4 flex items-start justify-between gap-4 shadow-sm
                  ${intake.is_emergency ? 'border-red-300 bg-red-50/30' : 'border-gray-200'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm">{intake.student_name}</p>
                    {intake.is_emergency && (
                      <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase">Emergency</span>
                    )}
                    {risk !== 'GREEN' && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${RISK_CLS[risk] ?? ''}`}>
                        {risk}
                      </span>
                    )}
                  </div>
                  {intake.student_email && (
                    <p className="text-xs text-gray-400 mt-0.5">{intake.student_email}</p>
                  )}
                  {intake.concern && (
                    <p className="text-xs text-gray-600 mt-1 truncate max-w-sm">Concern: {intake.concern}</p>
                  )}
                  <p className={`text-xs mt-1 ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                    {isOverdue ? 'Overdue — ' : 'Due: '}
                    {fmt(intake.deadline)}
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/ic/intake/conduct/${intake._id}`)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1a5228] hover:bg-green-800 text-white text-xs font-semibold rounded-lg transition whitespace-nowrap">
                  <ClipboardList size={13} /> Conduct Intake
                </button>
              </div>
            );
          })
        )}
      </div>
    </PageShell>
  );
}
