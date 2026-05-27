'use client';

import { useState, useEffect } from 'react';
import { Clock, FileText, CheckCircle, AlertCircle, UserCheck } from 'lucide-react';
import { api } from '@/utils/api';

interface Appointment {
  appointment_id: string;
  student_name: string;
  student_email: string;
  counselor_name: string;
  status: string;
  purpose: string;
  concern: string;
  preferred_date: string;
  preferred_time?: string;
  method: string;
  created_at: string;
}

interface DashboardData {
  role: string;
  user_name: string;
  appointments?: Appointment[];
  summary?: any;
  can_edit?: boolean;
  can_approve?: boolean;
  can_assign_counselor?: boolean;
}

export default function AppointmentsDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counselors, setCounselors] = useState<any[]>([]);

  // Per-row assign state
  const [assignMap, setAssignMap] = useState<Record<string, { counselorId: string; date: string; time: string }>>({});
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignMsg, setAssignMsg] = useState<{ id: string; type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(api('/api/appointments/dashboard/role-view'), {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch dashboard');
      const data = await response.json();
      setDashboard(data);
      if (data.can_assign_counselor) fetchCounselors(token!);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCounselors = async (token: string) => {
    try {
      const r = await fetch(api('/api/users?role=COUNSELOR'), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setCounselors(d.users || []); }
    } catch {}
  };

  const setAssignField = (id: string, field: 'counselorId' | 'date' | 'time', value: string) => {
    setAssignMap(prev => {
      const current = prev[id] ?? { counselorId: '', date: '', time: '' };
      return { ...prev, [id]: { ...current, [field]: value } };
    });
  };

  const handleAssign = async (aptId: string) => {
    const token = localStorage.getItem('token');
    const row = assignMap[aptId] || {};
    if (!row.counselorId || !row.date || !row.time) {
      setAssignMsg({ id: aptId, type: 'err', text: 'Select counselor, date, and time.' });
      return;
    }
    setAssigningId(aptId);
    setAssignMsg(null);
    try {
      const start = new Date(`${row.date}T${row.time}:00`);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const r = await fetch(api(`/api/appointments/${aptId}/match-counselor`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ counselor_id: row.counselorId, scheduled_start: start.toISOString(), scheduled_end: end.toISOString() }),
      });
      if (r.ok) {
        setAssignMsg({ id: aptId, type: 'ok', text: 'Assigned & confirmed.' });
        setTimeout(() => fetchDashboard(), 800);
      } else {
        const e = await r.json();
        setAssignMsg({ id: aptId, type: 'err', text: e.error || 'Failed to assign.' });
      }
    } finally {
      setAssigningId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REQUESTED': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'PENDING_APPROVAL': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'CONFIRMED': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'APPROVED': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'CANCELLED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateString; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <p className="text-red-700">Error: {error || 'No data available'}</p>
      </div>
    );
  }

  const pendingCount = dashboard.appointments?.filter(a => a.status === 'REQUESTED').length || 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {dashboard.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {dashboard.summary.total != null && <SummaryCard title="Total" value={dashboard.summary.total} />}
          {dashboard.summary.total_appointments != null && <SummaryCard title="All Appointments" value={dashboard.summary.total_appointments} />}
          {dashboard.summary.unassigned_requests != null && <SummaryCard title="Unassigned" value={dashboard.summary.unassigned_requests} color="yellow" />}
          {dashboard.summary.awaiting_approval != null && <SummaryCard title="Awaiting Approval" value={dashboard.summary.awaiting_approval} color="blue" />}
          {pendingCount > 0 && dashboard.can_assign_counselor && <SummaryCard title="Need Assignment" value={pendingCount} color="red" />}
        </div>
      )}

      {/* Pending assignment alert */}
      {dashboard.can_assign_counselor && pendingCount > 0 && (
        <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl px-4 py-2.5 text-sm text-yellow-800 dark:text-yellow-300">
          <AlertCircle size={15} />
          <span><strong>{pendingCount}</strong> appointment{pendingCount !== 1 ? 's' : ''} waiting to be assigned. Use the controls in the table below.</span>
        </div>
      )}

      {/* Appointments Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Appointments</h2>
          {dashboard.can_assign_counselor && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <UserCheck size={12} /> Assign counselors to REQUESTED rows below
            </span>
          )}
        </div>

        {dashboard.appointments && dashboard.appointments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Student</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Counselor</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Purpose</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Preferred Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Method</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Status</th>
                  {dashboard.can_assign_counselor && (
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Assign</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {dashboard.appointments.map((apt) => (
                  <tr key={apt.appointment_id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${apt.status === 'REQUESTED' ? 'bg-yellow-50/40 dark:bg-yellow-900/10' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{apt.student_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{apt.student_email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {apt.counselor_name || <span className="text-gray-400 italic text-xs">Not Assigned</span>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{apt.purpose ? apt.purpose.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'N/A'}</p>
                      {apt.concern && <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">{apt.concern}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(apt.preferred_date)}
                      {apt.preferred_time && <span className="text-xs text-gray-400 block">{apt.preferred_time}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs capitalize">
                        {apt.method?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusColor(apt.status)}`}>
                        {apt.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Assign column */}
                    {dashboard.can_assign_counselor && (
                      <td className="px-4 py-3">
                        {apt.status === 'REQUESTED' ? (
                          <div className="space-y-1.5 min-w-[260px]">
                            <select
                              value={assignMap[apt.appointment_id]?.counselorId || ''}
                              onChange={e => setAssignField(apt.appointment_id, 'counselorId', e.target.value)}
                              className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                            >
                              <option value="">Select counselor…</option>
                              {counselors.map(c => (
                                <option key={c._id} value={c._id}>{c.first_name} {c.last_name}</option>
                              ))}
                            </select>
                            <div className="flex gap-1">
                              <input
                                type="date"
                                value={assignMap[apt.appointment_id]?.date || (apt.preferred_date ? apt.preferred_date.split('T')[0] : '')}
                                onChange={e => setAssignField(apt.appointment_id, 'date', e.target.value)}
                                className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                              />
                              <input
                                type="time"
                                value={assignMap[apt.appointment_id]?.time || (apt.preferred_time || '')}
                                onChange={e => setAssignField(apt.appointment_id, 'time', e.target.value)}
                                className="w-24 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                              />
                            </div>
                            <button
                              onClick={() => handleAssign(apt.appointment_id)}
                              disabled={assigningId === apt.appointment_id || !assignMap[apt.appointment_id]?.counselorId}
                              className={`w-full py-1.5 rounded text-xs font-semibold transition ${
                                assigningId === apt.appointment_id || !assignMap[apt.appointment_id]?.counselorId
                                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                            >
                              {assigningId === apt.appointment_id ? 'Assigning…' : 'Assign & Confirm'}
                            </button>
                            {assignMsg?.id === apt.appointment_id && (
                              <p className={`text-xs ${assignMsg.type === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {assignMsg.text}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">No appointments found</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: number | string;
  color?: 'yellow' | 'blue' | 'red' | 'green';
}

function SummaryCard({ title, value, color }: SummaryCardProps) {
  const accent = color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400'
    : color === 'blue' ? 'text-blue-600 dark:text-blue-400'
    : color === 'red' ? 'text-red-600 dark:text-red-400'
    : color === 'green' ? 'text-green-600 dark:text-green-400'
    : 'text-gray-900 dark:text-gray-100';
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3">
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{title}</p>
      <p className={`text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}
