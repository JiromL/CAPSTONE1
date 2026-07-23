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
  try { return new Date(d).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }); }
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

const RISK_COLOR: Record<string, { barColor: string; badgeBg: string; badgeColor: string; label: string }> = {
  GREEN:    { barColor: '#4ADE80', badgeBg: '#F0FDF4', badgeColor: '#15803D', label: 'Low Risk'  },
  YELLOW:   { barColor: '#FBBF24', badgeBg: '#FFFBEB', badgeColor: '#B45309', label: 'Moderate'  },
  RED:      { barColor: '#F87171', badgeBg: '#FEF2F2', badgeColor: '#B91C1C', label: 'High Risk' },
  CRITICAL: { barColor: '#DC2626', badgeBg: '#FEE2E2', badgeColor: '#7F1D1D', label: 'Critical'  },
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
    const borderColor = intake.is_emergency ? 'var(--color-danger)' : isOverdue ? 'var(--color-warning)' : 'var(--color-border)';

    return (
      <div key={intake._id} className="rounded-xl overflow-hidden transition"
        style={{ background: 'var(--color-surface)', border: `1px solid ${borderColor}`, boxShadow: 'var(--shadow-card)' }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card-md)')}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}>
        {/* Risk bar */}
        <div className="h-1" style={{ background: riskCfg.barColor }} />

        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: intake.is_emergency ? 'var(--color-danger)' : 'var(--color-primary)' }}>
              {initial}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{intake.student_name}</span>
                {intake.is_emergency && (
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                    style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger)' }}>
                    <AlertTriangle size={9} /> Emergency
                  </span>
                )}
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full uppercase"
                  style={{ background: riskCfg.badgeBg, color: riskCfg.badgeColor }}>
                  {riskCfg.label}
                </span>
              </div>

              {intake.student_email && (
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{intake.student_email}</p>
              )}
              {intake.concern && (
                <p className="text-xs mt-1 line-clamp-1 italic" style={{ color: 'var(--color-text-secondary)' }}>"{intake.concern}"</p>
              )}
            </div>

            <div className="flex-shrink-0">
              {intake.intake_packet_submitted
                ? <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-semibold"
                    style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)', outline: '1px solid var(--color-success)' }}>
                    <FileCheck size={9} /> Forms ready
                  </span>
                : <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-semibold"
                    style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning-text)', outline: '1px solid var(--color-warning)' }}>
                    <FileX size={9} /> No forms
                  </span>}
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-1 text-xs">
              <Clock size={11} style={{ color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-muted)' }} />
              <span style={{ color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-muted)', fontWeight: isOverdue ? 600 : 400 }}>
                {fmtRelative(intake.deadline)} &middot; Due {fmt(intake.deadline)}
              </span>
            </div>
            <button
              onClick={() => router.push(`/ic/intake/conduct/${intake._id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition"
              style={{ background: 'var(--color-primary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary)')}>
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

        <div className="flex justify-end">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition disabled:opacity-40"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-44 gap-2 text-sm"
            style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={16} className="animate-spin" /> Loading intakes…
          </div>
        )}

        {!loading && !error && intakes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-44 text-center rounded-xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
              style={{ background: 'var(--color-primary-surface)' }}>
              <ClipboardList size={18} style={{ color: 'var(--color-primary)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>No pending intakes</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>All caught up — no sessions waiting.</p>
          </div>
        )}

        {!loading && emergency.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide flex items-center gap-1"
              style={{ color: 'var(--color-danger)' }}>
              <AlertTriangle size={11} /> Emergency
            </p>
            {emergency.map(renderCard)}
          </div>
        )}

        {!loading && overdue.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide flex items-center gap-1"
              style={{ color: 'var(--color-warning-text)' }}>
              <Clock size={11} /> Overdue
            </p>
            {overdue.map(renderCard)}
          </div>
        )}

        {!loading && regular.length > 0 && (
          <div className="space-y-2">
            {(emergency.length > 0 || overdue.length > 0) && (
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Upcoming</p>
            )}
            {regular.map(renderCard)}
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
