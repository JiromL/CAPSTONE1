'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, BellRing, Loader2, ShieldCheck, Users } from 'lucide-react';
import { api } from '@/utils/api';
import { EmaInsights } from './EmaInsights';

// EMA page for admins and the DPO (backend: GET /mhbot/analytics/team + /analytics/insights).
// Totals only: staff are named, students never are (services/ema_access.py).

interface TeamRow { name: string; role: string; open_cases: number; at_risk: number; in_crisis: number; unreviewed: number }
interface Team {
  students_total: number; linked: number; consented: number; at_risk: number; in_crisis: number;
  unreviewed_crises: number; at_risk_without_case: number; students_alerted_30d: number; team: TeamRow[];
}

const ink = { primary: 'var(--color-text-primary)', secondary: 'var(--color-text-secondary)', muted: 'var(--color-text-muted)' };
const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);

function Tile({ icon, label, value, note, alert }: { icon: React.ReactNode; label: string; value: string | number; note: string; alert?: boolean }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1" style={{
      background: alert ? 'var(--color-danger-surface)' : 'var(--color-surface)',
      border: `1px solid ${alert ? 'var(--color-danger)' : 'var(--color-border)'}`,
    }}>
      <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: alert ? 'var(--color-danger-text)' : ink.muted }}>{icon}{label}</p>
      <p className="text-2xl font-semibold leading-tight" style={{ color: ink.primary }}>{value}</p>
      <p className="text-xs" style={{ color: ink.muted }}>{note}</p>
    </div>
  );
}

export function AdminEmaOverview() {
  const [data, setData] = useState<Team | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(api('/api/mhbot/analytics/team'), { headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` } })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Could not load the EMA overview'); return d; })
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div role="alert" className="card p-6 text-sm" style={{ color: 'var(--color-danger-text)' }}>{error}</div>;
  if (!data) return <div role="status" className="flex justify-center py-12"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} aria-hidden="true" /></div>;

  const maxRisk = Math.max(1, ...data.team.map(t => t.at_risk));
  const busiest = data.team.filter(t => t.at_risk > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-xs" style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary-text)' }}>
        <ShieldCheck size={14} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p>Totals only. Students are never named here, as the EMA privacy notice promises them. Each student&apos;s own counselor and the case manager see the details.</p>
      </div>

      <section aria-labelledby="adoption-title" className="space-y-3">
        <h2 id="adoption-title" className="text-sm font-semibold" style={{ color: ink.primary }}>Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile icon={<Users size={13} />} label="Students using EMA" value={`${pct(data.linked, data.students_total)}%`}
            note={`${data.linked} of ${data.students_total} students linked · ${data.consented} with consent recorded`} />
          <Tile icon={<Activity size={13} />} label="At risk now" value={data.at_risk}
            note={`${data.in_crisis} In Crisis · ${data.at_risk - data.in_crisis} Struggling`} />
          <Tile icon={<AlertTriangle size={13} />} label="Crises not yet reviewed" value={data.unreviewed_crises}
            alert={data.unreviewed_crises > 0} note={data.unreviewed_crises ? 'The case manager and counselors are alerted' : 'Every crisis has been reviewed'} />
          <Tile icon={<BellRing size={13} />} label="Crisis alerts, last 30 days" value={data.students_alerted_30d}
            note="Students whose In Crisis result alerted the team" />
        </div>
      </section>

      <section aria-labelledby="team-title" className="card p-5">
        <h2 id="team-title" className="text-sm font-semibold" style={{ color: ink.primary }}>At-risk students per counselor</h2>
        <p className="text-xs mt-0.5 mb-4 max-w-prose" style={{ color: ink.muted }}>
          Students whose EMA triage is Struggling or In Crisis, by the counselor or psychologist on their open case. Use it to spot
          overload and rebalance cases.{data.at_risk_without_case > 0 && <> <strong style={{ color: ink.primary }}>{data.at_risk_without_case}</strong> at-risk {data.at_risk_without_case === 1 ? 'student has' : 'students have'} no open case.</>}
        </p>
        {busiest.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: ink.muted }}>No counselor has an at-risk student right now.</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead><tr className="text-xs" style={{ color: ink.muted, borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left font-medium px-2 py-2">Counselor</th>
                <th className="text-left font-medium px-2 py-2 w-[40%]">At-risk students</th>
                <th className="text-right font-medium px-2 py-2">In Crisis</th>
                <th className="text-right font-medium px-2 py-2">Not reviewed</th>
                <th className="text-right font-medium px-2 py-2">Open cases</th>
              </tr></thead>
              <tbody>
                {busiest.map(t => (
                  <tr key={t.name} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-2 py-2.5">
                      <p className="font-medium" style={{ color: ink.primary }}>{t.name}</p>
                      <p className="text-xs" style={{ color: ink.muted }}>{t.role === 'PSYCHOLOGIST' ? 'Psychologist' : 'Counselor'}</p>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-3 rounded-r-[4px]" style={{ width: `${(t.at_risk / maxRisk) * 80}%`, minWidth: 4, background: 'var(--perma-struggling)' }} aria-hidden="true" />
                        <span className="text-xs font-semibold tabular-nums" style={{ color: ink.primary }}>{t.at_risk}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums" style={{ color: t.in_crisis ? 'var(--color-danger-text)' : ink.secondary }}>{t.in_crisis}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums font-semibold" style={{ color: t.unreviewed ? 'var(--color-danger-text)' : ink.muted }}>{t.unreviewed}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums" style={{ color: ink.secondary }}>{t.open_cases}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <EmaInsights />
    </div>
  );
}
