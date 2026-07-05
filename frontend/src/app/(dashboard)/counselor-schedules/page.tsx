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
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    CONFIRMED: 'bg-green-100 text-green-700 dark:bg-blue-900/30 dark:text-green-400',
    REQUESTED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    PENDING_APPROVAL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    MATCHED: 'bg-green-100 text-green-700 dark:bg-blue-900/30 dark:text-green-400',
    COMPLETED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    CANCELLED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };
  const cls = map[status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  return <span className={`text-xs px-2 py-0.5 rounded font-medium ${cls}`}>{status.replace('_', ' ')}</span>;
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
          if (!map.has(id)) {
            map.set(id, { counselor_id: id, name: apt.counselor_name, confirmed: 0, pending: 0, thisWeek: 0, total: 0, upcomingAppts: [] });
          }
          const row = map.get(id)!;
          row.total++;
          const s = (apt.status || '').toUpperCase();
          if (s === 'CONFIRMED') row.confirmed++;
          if (s === 'REQUESTED' || s === 'PENDING_APPROVAL' || s === 'MATCHED') row.pending++;

          const dt = apt.scheduled_start || apt.preferred_date;
          if (dt) {
            const d = new Date(dt);
            if (d >= now && d <= weekEnd) row.thisWeek++;
            if (d >= now) {
              row.upcomingAppts.push({
                appointment_id: apt.appointment_id,
                student_name: apt.student_name,
                scheduled_start: apt.scheduled_start,
                requested_start: apt.preferred_date,
                status: apt.status,
                purpose: apt.purpose,
                preferred_method: apt.method,
              });
            }
          }
        });

        // Sort upcoming per counselor by date
        map.forEach(row => row.upcomingAppts.sort((a, b) => {
          const da = new Date(a.scheduled_start || a.requested_start || 0).getTime();
          const db2 = new Date(b.scheduled_start || b.requested_start || 0).getTime();
          return da - db2;
        }));

        let sorted = Array.from(map.values());
        if (sortBy === 'load') sorted.sort((a, b) => b.total - a.total);
        else if (sortBy === 'thisWeek') sorted.sort((a, b) => b.thisWeek - a.thisWeek);
        else sorted.sort((a, b) => a.name.localeCompare(b.name));

        setRows(sorted);
      })
      .catch(e => setError(typeof e === 'string' ? e : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [sortBy]);

  const toggleExpand = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const totalCounselors = rows.length;
  const totalThisWeek = rows.reduce((s, r) => s + r.thisWeek, 0);
  const avgLoad = totalCounselors > 0 ? Math.round(rows.reduce((s, r) => s + r.total, 0) / totalCounselors) : 0;
  const lightestCounselor = rows.length > 0 ? [...rows].sort((a, b) => a.thisWeek - b.thisWeek)[0] : null;

  return (
    <DashboardPageWrapper title="Counselor Schedules" subtitle="View counselor workload and upcoming sessions to make informed assignments">
      <div className="space-y-5">

        {error && (
          <div className="flex gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Counselors</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{totalCounselors}</p>
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sessions This Week</p>
            <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{totalThisWeek}</p>
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Load</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{avgLoad}</p>
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Most Available</p>
            <p className="text-sm font-semibold text-green-600 dark:text-green-400 truncate">{lightestCounselor?.name ?? '—'}</p>
          </div>
        </div>

        {/* Sort */}
        <div className="flex gap-2">
          {(['thisWeek', 'load', 'name'] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${sortBy === s ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
              {s === 'thisWeek' ? 'This Week' : s === 'load' ? 'Total Load' : 'Name'}
            </button>
          ))}
        </div>

        {/* Counselor rows */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={24} className="animate-spin mr-2" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16">
            <Users size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No assigned counselors found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map(row => {
              const isExpanded = expanded.has(row.counselor_id);
              const isHeavy = row.thisWeek > avgLoad + 2;
              const isLight = row.thisWeek <= 1;
              return (
                <div key={row.counselor_id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  {/* Header row */}
                  <div className="px-5 py-4 flex items-center gap-4 bg-white dark:bg-gray-900">
                    <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-blue-900/40 flex items-center justify-center text-green-700 dark:text-green-300 font-semibold text-sm flex-shrink-0">
                      {row.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{row.name}</p>
                        {isHeavy && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-medium">Heavy load</span>}
                        {isLight && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-blue-900/30 dark:text-green-400 font-medium">Light load</span>}
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1"><Calendar size={11} /> {row.thisWeek} this week</span>
                        <span className="flex items-center gap-1"><CheckCircle size={11} /> {row.confirmed} confirmed</span>
                        <span className="flex items-center gap-1"><Clock size={11} /> {row.pending} pending</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleExpand(row.counselor_id)}
                      className="text-xs flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition flex-shrink-0"
                    >
                      {isExpanded ? <><ChevronUp size={14} /> Hide</> : <><ChevronDown size={14} /> {row.upcomingAppts.length} upcoming</>}
                    </button>
                  </div>

                  {/* Upcoming appointments */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                      {row.upcomingAppts.length === 0 ? (
                        <p className="px-5 py-4 text-sm text-gray-400 dark:text-gray-500 italic">No upcoming appointments</p>
                      ) : (
                        row.upcomingAppts.slice(0, 10).map(apt => (
                          <div key={apt.appointment_id} className="px-5 py-3 flex items-center gap-4 bg-gray-50/50 dark:bg-gray-800/30">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{apt.student_name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {formatDt(apt.scheduled_start || apt.requested_start)}
                                {apt.purpose ? ` · ${apt.purpose.replace(/_/g, ' ')}` : ''}
                                {apt.preferred_method ? ` · ${apt.preferred_method.replace('_', ' ')}` : ''}
                              </p>
                            </div>
                            {statusBadge(apt.status)}
                          </div>
                        ))
                      )}
                      {row.upcomingAppts.length > 10 && (
                        <p className="px-5 py-2 text-xs text-gray-400 dark:text-gray-500">+{row.upcomingAppts.length - 10} more upcoming</p>
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
