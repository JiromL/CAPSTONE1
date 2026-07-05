'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { Clock, ClipboardList, AlertCircle, FileCheck, FileX, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
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
  intake_packet_submitted?: boolean;
}

function fmt(d: string) {
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return d; }
}

function fmtRelative(d: string) {
  try {
    const diff = new Date(d).getTime() - Date.now();
    const days = Math.ceil(diff / 86400000);
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days}d`;
  } catch { return ''; }
}

const RISK_COLOR: Record<string, { bar: string; badge: string; label: string }> = {
  GREEN:    { bar: 'bg-green-400',  badge: 'bg-green-50 text-green-700 ring-1 ring-green-200',   label: 'Low Risk' },
  YELLOW:   { bar: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',   label: 'Moderate' },
  RED:      { bar: 'bg-red-400',    badge: 'bg-red-50 text-red-700 ring-1 ring-red-200',         label: 'High Risk' },
  CRITICAL: { bar: 'bg-red-600',    badge: 'bg-red-100 text-red-800 ring-1 ring-red-300',        label: 'Critical' },
};

export default function PendingIntakesPage() {
  const router = useRouter();
  const [intakes, setIntakes]   = useState<PendingIntake[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api('/api/intake/list?status=pending'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      setIntakes(Array.isArray(d.intakes) ? d.intakes : []);
    } catch {
      setError('Failed to load pending intakes.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const emergency = intakes.filter(i => i.is_emergency);
  const overdue   = intakes.filter(i => !i.is_emergency && new Date(i.deadline) < new Date());
  const regular   = intakes.filter(i => !i.is_emergency && new Date(i.deadline) >= new Date());

  const renderCard = (intake: PendingIntake) => {
    const isOverdue = new Date(intake.deadline) < new Date();
    const risk = (intake.risk_level || 'GREEN').toUpperCase();
    const riskCfg = RISK_COLOR[risk] ?? RISK_COLOR.GREEN;
    const initial = intake.student_name?.charAt(0)?.toUpperCase() ?? '?';

    return (
      <div key={intake._id}
        className={`bg-white rounded-xl border shadow-sm overflow-hidden transition hover:shadow-md
          ${intake.is_emergency ? 'border-red-300' : isOverdue ? 'border-amber-300' : 'border-gray-200'}`}>
        {/* Risk bar */}
        <div className={`h-1 ${riskCfg.bar}`} />

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0
              ${intake.is_emergency ? 'bg-red-500' : 'bg-[#2563eb]'}`}>
              {initial}
            </div>

            <div className="flex-1 min-w-0">
              {/* Name + badges */}
              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                <span className="font-semibold text-gray-900 text-sm">{intake.student_name}</span>
                {intake.is_emergency && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                    <AlertTriangle size={9} /> Emergency
                  </span>
                )}
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase ${riskCfg.badge}`}>
                  {riskCfg.label}
                </span>
              </div>

              {intake.student_email && (
                <p className="text-xs text-gray-400">{intake.student_email}</p>
              )}
              {intake.concern && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-1 italic">"{intake.concern}"</p>
              )}
            </div>

            {/* Forms badge */}
            <div className="flex-shrink-0">
              {intake.intake_packet_submitted
                ? <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-green-50 text-green-700 ring-1 ring-green-200"><FileCheck size={9} /> Forms ready</span>
                : <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-orange-50 text-orange-600 ring-1 ring-orange-200"><FileX size={9} /> No forms</span>}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1 text-xs">
              <Clock size={11} className={isOverdue ? 'text-red-400' : 'text-gray-400'} />
              <span className={isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}>
                {fmtRelative(intake.deadline)} &middot; Due {fmt(intake.deadline)}
              </span>
            </div>
            <button
              onClick={() => router.push(`/ic/intake/conduct/${intake._id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition"
              style={{ backgroundColor: '#2563eb' }}>
              <ClipboardList size={12} /> Conduct Intake
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardPageWrapper
      title="Pending Intakes"
      subtitle={loading ? 'Loading…' : `${intakes.length} intake${intakes.length !== 1 ? 's' : ''} awaiting session`}
    >
      <div className="max-w-3xl space-y-5">

        {/* Actions bar */}
        <div className="flex justify-end">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition disabled:opacity-40">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-44 gap-2 text-gray-400 text-sm">
            <Loader2 size={16} className="animate-spin" /> Loading intakes…
          </div>
        )}

        {/* Empty */}
        {!loading && !error && intakes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-44 text-center bg-white rounded-xl border border-gray-200">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-3">
              <ClipboardList size={18} className="text-[#2563eb]" />
            </div>
            <p className="text-sm font-medium text-gray-600">No pending intakes</p>
            <p className="text-xs text-gray-400 mt-1">All caught up — no sessions waiting.</p>
          </div>
        )}

        {/* Emergency group */}
        {!loading && emergency.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-red-600 uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle size={11} /> Emergency
            </p>
            {emergency.map(renderCard)}
          </div>
        )}

        {/* Overdue group */}
        {!loading && overdue.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide flex items-center gap-1">
              <Clock size={11} /> Overdue
            </p>
            {overdue.map(renderCard)}
          </div>
        )}

        {/* Regular */}
        {!loading && regular.length > 0 && (
          <div className="space-y-2">
            {(emergency.length > 0 || overdue.length > 0) && (
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Upcoming</p>
            )}
            {regular.map(renderCard)}
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
