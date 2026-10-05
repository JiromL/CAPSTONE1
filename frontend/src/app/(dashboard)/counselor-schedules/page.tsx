'use client';

import { useState, useEffect } from 'react';
import { Users, Clock, CheckCircle, AlertCircle, Calendar, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface UpcomingAppt {
  appointment_id: string;
  student_name: string;
  scheduled_start?: string;
  requested_start?: string;
  status: string;
  purpose?: string;
  preferred_method?: string;
}

interface CounselorRow {
  counselor_id: string;
  name: string;
  confirmed: number;
  pending: number;
  thisWeek: number;
  total: number;
  upcomingAppts: UpcomingAppt[];
}

function formatDt(dt: string | undefined) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true });
}

function aptStatusStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'CONFIRMED': return { background: 'var(--color-success-surface)', color: 'var(--color-success)' };
    case 'REQUESTED':
    case 'PENDING_APPROVAL': return { background: 'var(--color-warning-surface)', color: 'var(--color-warning)' };
    case 'MATCHED':  return { background: 'var(--color-primary-surface)', color: 'var(--color-primary)' };
    case 'CANCELLED': return { background: 'var(--color-danger-surface)', color: 'var(--color-danger)' };
    default:         return { background: 'var(--color-bg)', color: 'var(--color-text-muted)' };
  }
}

export default function CounselorSchedulesPage() {
  const [rows, setRows] = useState<CounselorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'load' | 'thisWeek'>('thisWeek');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setError('Not authenticated'); setLoading(false); return; }

    fetch(api('/api/appointments/dashboard/role-view'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject('Failed to fetch'))
      .then(data => {
        const appointments: any[] = data.appointments || [];
        const now = new Date();
        const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const map = new Map<string, CounselorRow>();

        appointments.forEach(apt => {
          if (!apt.counselor_id || !apt.counselor_name || apt.counselor_name === 'Not Assigned') return;
          const id = apt.counselor_id;
          if (!map.has(id)) map.set(id, { counselor_id: id, name: apt.counselor_name, confirmed: 0, pending: 0, thisWeek: 0, total: 0, upcomingAppts: [] });
          const row = map.get(id)!;
          row.total++;
          const s = (apt.status || '').toUpperCase();
          if (s === 'CONFIRMED') row.confirmed++;
          if (s === 'REQUESTED' || s === 'PENDING_APPROVAL' || s === 'MATCHED') row.pending++;
          const dt = apt.scheduled_start || apt.preferred_date;
          if (dt) {
            const d = new Date(dt);
            if (d >= now && d <= weekEnd) row.thisWeek++;
            if (d >= now) row.upcomingAppts.push({ appointment_id: apt.appointment_id, student_name: apt.student_name, scheduled_start: apt.scheduled_start, requested_start: apt.preferred_date, status: apt.status, purpose: apt.purpose, preferred_method: apt.method });
          }
        });

        map.forEach(row => row.upcomingAppts.sort((a, b) => new Date(a.scheduled_start || a.requested_start || 0).getTime() - new Date(b.scheduled_start || b.requested_start || 0).getTime()));

        const sorted = Array.from(map.values());
        if (sortBy === 'load') sorted.sort((a, b) => b.total - a.total);
        else if (sortBy === 'thisWeek') sorted.sort((a, b) => b.thisWeek - a.thisWeek);
        else sorted.sort((a, b) => a.name.localeCompare(b.name));
        setRows(sorted);
      })
      .catch(e => setError(typeof e === 'string' ? e : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [sortBy]);

  const toggleExpand = (id: string) => setExpanded(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  const totalCounselors = rows.length;
  const totalThisWeek   = rows.reduce((s, r) => s + r.thisWeek, 0);
  const avgLoad         = totalCounselors > 0 ? Math.round(rows.reduce((s, r) => s + r.total, 0) / totalCounselors) : 0;
  const lightestCounselor = rows.length > 0 ? [...rows].sort((a, b) => a.thisWeek - b.thisWeek)[0] : null;

  return (
    <DashboardPageWrapper title="Counselor Schedules" subtitle="View counselor workload and upcoming sessions to make informed assignments">
      <div className="space-y-5">

        {error && (
          <div className="flex gap-2 p-4 rounded-xl border text-sm"
            style={{ background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Counselors',        value: totalCounselors,  color: 'var(--color-text-primary)' },
            { label: 'Sessions This Week', value: totalThisWeek,   color: 'var(--color-primary)' },
            { label: 'Avg Load',           value: avgLoad,          color: 'var(--color-text-primary)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="border rounded-2xl shadow-card p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
              <p className="text-2xl font-semibold" style={{ color }}>{value}</p>
            </div>
          ))}
          <div className="border rounded-2xl shadow-card p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Most Available</p>
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-success)' }}>{lightestCounselor?.name ?? '—'}</p>
          </div>
        </div>

        {/* Sort */}
        <div className="flex gap-2">
          {(['thisWeek', 'load', 'name'] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
              style={sortBy === s
                ? { background: 'var(--color-primary)', color: 'white' }
                : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => { if (sortBy !== s) e.currentTarget.style.background = 'var(--color-border)'; }}
              onMouseLeave={e => { if (sortBy !== s) e.currentTarget.style.background = 'var(--color-bg)'; }}>
              {s === 'thisWeek' ? 'This Week' : s === 'load' ? 'Total Load' : 'Name'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16">
            <Users size={32} className="mx-auto mb-3" style={{ color: 'var(--color-border)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No assigned counselors found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map(row => {
              const isExpanded = expanded.has(row.counselor_id);
              const isHeavy = row.thisWeek > avgLoad + 2;
              const isLight = row.thisWeek <= 1;
              return (
                <div key={row.counselor_id} className="border rounded-2xl shadow-card overflow-hidden"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <div className="px-5 py-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                      style={{ background: 'var(--color-primary)' }}>
                      {row.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{row.name}</p>
                        {isHeavy && <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger)' }}>Heavy load</span>}
                        {isLight && <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)' }}>Light load</span>}
                      </div>
                      <div className="flex gap-4 mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        <span className="flex items-center gap-1"><Calendar size={11} /> {row.thisWeek} this week</span>
                        <span className="flex items-center gap-1"><CheckCircle size={11} /> {row.confirmed} confirmed</span>
                        <span className="flex items-center gap-1"><Clock size={11} /> {row.pending} pending</span>
                      </div>
                    </div>
                    <button onClick={() => toggleExpand(row.counselor_id)}
                      className="text-xs flex items-center gap-1 transition flex-shrink-0"
                      style={{ color: 'var(--color-text-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                      {isExpanded ? <><ChevronUp size={14} /> Hide</> : <><ChevronDown size={14} /> {row.upcomingAppts.length} upcoming</>}
                    </button>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--color-border)' }}>
                      {row.upcomingAppts.length === 0 ? (
                        <p className="px-5 py-4 text-sm italic" style={{ color: 'var(--color-text-muted)' }}>No upcoming appointments</p>
                      ) : (
                        row.upcomingAppts.slice(0, 10).map((apt, i) => (
                          <div key={apt.appointment_id} className="px-5 py-3 flex items-center gap-4"
                            style={{ borderBottom: i < Math.min(row.upcomingAppts.length, 10) - 1 ? '1px solid var(--color-border)' : 'none', background: 'var(--color-bg)' }}>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{apt.student_name}</p>
                              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                {formatDt(apt.scheduled_start || apt.requested_start)}
                                {apt.purpose ? ` · ${apt.purpose.replace(/_/g, ' ')}` : ''}
                                {apt.preferred_method ? ` · ${apt.preferred_method.replace('_', ' ')}` : ''}
                              </p>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded font-medium" style={aptStatusStyle(apt.status)}>
                              {apt.status.replace('_', ' ')}
                            </span>
                          </div>
                        ))
                      )}
                      {row.upcomingAppts.length > 10 && (
                        <p className="px-5 py-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          +{row.upcomingAppts.length - 10} more upcoming
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
