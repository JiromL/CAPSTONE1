'use client';

import { useState, useEffect } from 'react';
import { Clock, FileText, CheckCircle, AlertCircle, UserCheck, MessageSquare, ChevronDown, ChevronUp, Plus, X, Search, Loader2 } from 'lucide-react';
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

  // Per-row check-in expansion
  const [checkinRow, setCheckinRow] = useState<string | null>(null);
  const [checkinData, setCheckinData] = useState<Record<string, any[]>>({});

  // Schedule-for-student modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [schedPurpose, setSchedPurpose] = useState('personal');
  const [schedConcern, setSchedConcern] = useState('');
  const [schedMethod, setSchedMethod] = useState('in-person');
  const [schedCounselor, setSchedCounselor] = useState('');
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');
  const [submittingSchedule, setSubmittingSchedule] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

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

  const searchStudents = async (q: string) => {
    setStudentQuery(q);
    if (q.trim().length < 2) { setStudentResults([]); return; }
    setSearchingStudents(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/users?role=STUDENT&q=${encodeURIComponent(q)}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) { const d = await r.json(); setStudentResults(d.users || []); }
    } finally { setSearchingStudents(false); }
  };

  const handleScheduleSubmit = async () => {
    if (!selectedStudent) { setScheduleMsg({ type: 'err', text: 'Select a student first.' }); return; }
    setSubmittingSchedule(true);
    setScheduleMsg(null);
    try {
      const token = localStorage.getItem('token');
      const body: any = {
        student_id: selectedStudent._id,
        purpose: schedPurpose,
        concern: schedConcern,
        preferred_method: schedMethod,
      };
      if (schedCounselor) body.counselor_id = schedCounselor;
      if (schedDate) body.preferred_date = schedDate;
      if (schedTime) body.preferred_time = schedTime;
      const r = await fetch(api('/api/appointments/staff/schedule-for-student'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (r.ok) {
        setScheduleMsg({ type: 'ok', text: `Appointment created (${d.status}).` });
        setTimeout(() => { setShowScheduleModal(false); resetScheduleForm(); fetchDashboard(); }, 1200);
      } else {
        setScheduleMsg({ type: 'err', text: d.error || 'Failed to create appointment.' });
      }
    } finally { setSubmittingSchedule(false); }
  };

  const resetScheduleForm = () => {
    setSelectedStudent(null); setStudentQuery(''); setStudentResults([]);
    setSchedPurpose('personal'); setSchedConcern(''); setSchedMethod('in-person');
    setSchedCounselor(''); setSchedDate(''); setSchedTime(''); setScheduleMsg(null);
  };

  const toggleCheckins = async (aptId: string) => {
    if (checkinRow === aptId) { setCheckinRow(null); return; }
    setCheckinRow(aptId);
    if (!checkinData[aptId]) {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/check-ins/for-appointment/${aptId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = r.ok ? await r.json() : { check_ins: [] };
      setCheckinData(prev => ({ ...prev, [aptId]: d.check_ins || [] }));
    }
  };

  const STATUS_LABEL: Record<string, string> = {
    REQUESTED: 'New Request',
    PENDING_APPROVAL: 'Pending Approval',
    CONFIRMED: 'Confirmed',
    APPROVED: 'Confirmed',
    MATCHED: 'Confirmed',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    DENIED: 'Denied',
    NO_SHOW: 'No Show',
    RESCHEDULE_REQUESTED: 'Reschedule Pending',
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REQUESTED':
      case 'PENDING_APPROVAL':
      case 'RESCHEDULE_REQUESTED':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'CONFIRMED':
      case 'APPROVED':
      case 'MATCHED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'CANCELLED':
      case 'DENIED':
      case 'NO_SHOW':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'COMPLETED':
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getRowPriority = (status: string) => {
    if (status === 'REQUESTED') return 0;
    if (status === 'PENDING_APPROVAL') return 1;
    if (status === 'CONFIRMED' || status === 'APPROVED' || status === 'MATCHED') return 2;
    return 3;
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
  const pendingReschedules = dashboard.summary?.pending_reschedules ?? 0;
  const sortedAppointments = [...(dashboard.appointments || [])].sort(
    (a, b) => getRowPriority(a.status) - getRowPriority(b.status)
  );

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {dashboard.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {dashboard.summary.total_appointments != null && <SummaryCard title="Total" value={dashboard.summary.total_appointments} />}
          {dashboard.summary.unassigned_requests != null && <SummaryCard title="New Requests" value={dashboard.summary.unassigned_requests} color="yellow" />}
          {dashboard.summary.awaiting_approval != null && <SummaryCard title="Awaiting Approval" value={dashboard.summary.awaiting_approval} color="yellow" />}
          {pendingReschedules > 0 && <SummaryCard title="Reschedule Pending" value={pendingReschedules} color="yellow" />}
        </div>
      )}

      {/* Action banners */}
      {dashboard.can_assign_counselor && pendingCount > 0 && (
        <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl px-4 py-2.5 text-sm text-yellow-800 dark:text-yellow-300">
          <AlertCircle size={15} />
          <span><strong>{pendingCount}</strong> new appointment{pendingCount !== 1 ? 's' : ''} need a counselor assigned — shown at the top of the table.</span>
        </div>
      )}
      {pendingReschedules > 0 && (
        <a href="/reschedule-requests" className="flex items-center justify-between gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl px-4 py-2.5 text-sm text-yellow-800 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors">
          <span className="flex items-center gap-2">
            <AlertCircle size={15} />
            <strong>{pendingReschedules}</strong> student{pendingReschedules !== 1 ? 's' : ''} requested to reschedule an existing appointment.
          </span>
          <span className="text-xs font-semibold underline underline-offset-2">Review →</span>
        </a>
      )}

      {/* Appointments Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Appointments</h2>
            {dashboard.can_assign_counselor && pendingCount > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">New requests are shown first — assign a counselor using the inline controls.</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {dashboard.can_assign_counselor && (
              <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                <UserCheck size={12} /> {pendingCount} need assignment
              </span>
            )}
            <button
              onClick={() => { resetScheduleForm(); setShowScheduleModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Plus size={13} /> Schedule for Student
            </button>
          </div>
        </div>

        {sortedAppointments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Student</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Counselor</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Purpose</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date / Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Mode</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Check-ins</th>
                  {dashboard.can_assign_counselor && (
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Assign Counselor</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {sortedAppointments.map((apt) => (
                  <>
                  <tr key={apt.appointment_id} className={`transition-colors ${
                    apt.status === 'REQUESTED'
                      ? 'bg-yellow-50/50 dark:bg-yellow-900/10 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                  }`}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">{apt.student_name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{apt.student_email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {apt.counselor_name && apt.counselor_name !== 'Not Assigned'
                        ? apt.counselor_name
                        : <span className="text-xs text-gray-400 italic">Unassigned</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900 dark:text-gray-100">{apt.purpose ? apt.purpose.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—'}</p>
                      {apt.concern && <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[160px] mt-0.5">"{apt.concern}"</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      <p>{formatDate(apt.preferred_date)}</p>
                      {apt.preferred_time && <p className="text-xs text-gray-400">{apt.preferred_time}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs capitalize">
                        {apt.method?.replace(/_/g, ' ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(apt.status)}`}>
                        {STATUS_LABEL[apt.status] ?? apt.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Check-ins column */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleCheckins(apt.appointment_id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                      >
                        <MessageSquare size={11} />
                        {checkinRow === apt.appointment_id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        {checkinData[apt.appointment_id] ? `${checkinData[apt.appointment_id].length}` : 'View'}
                      </button>
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
                  {checkinRow === apt.appointment_id && (
                    <tr key={`${apt.appointment_id}-checkins`} className="bg-green-50/50 dark:bg-green-950/20">
                      <td colSpan={dashboard.can_assign_counselor ? 8 : 7} className="px-6 py-3">
                        {!checkinData[apt.appointment_id] ? (
                          <p className="text-xs text-gray-400">Loading…</p>
                        ) : checkinData[apt.appointment_id].length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No check-ins submitted yet.</p>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Student Check-ins</p>
                            {checkinData[apt.appointment_id].map((c: any) => {
                              const statusEmoji: Record<string, string> = { DOING_WELL: '😊', MANAGING: '😐', STRUGGLING: '😔', IN_CRISIS: '😰' };
                              return (
                                <div key={c._id} className="flex items-start gap-3 text-xs bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-700">
                                  <span>{statusEmoji[c.status] ?? '📝'}</span>
                                  <div className="flex-1">
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{c.status?.replace(/_/g, ' ')}</span>
                                    {c.wellness_rating && <span className="text-gray-400 ml-2">· {c.wellness_rating}/10</span>}
                                    {c.notes && <p className="text-gray-500 dark:text-gray-400 mt-0.5">{c.notes}</p>}
                                  </div>
                                  <span className="text-gray-400 whitespace-nowrap">{c.submitted_at ? new Date(c.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  </>
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

      {/* Schedule for Student Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Schedule Appointment for Existing Student</h3>
              <button onClick={() => { setShowScheduleModal(false); resetScheduleForm(); }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                <X size={15} className="text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Student Search */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Student</label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{selectedStudent.email}</p>
                    </div>
                    <button onClick={() => { setSelectedStudent(null); setStudentQuery(''); setStudentResults([]); }}
                      className="text-xs text-red-500 hover:text-red-700 transition">
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-green-500">
                      <Search size={13} className="text-gray-400 flex-shrink-0" />
                      <input
                        value={studentQuery}
                        onChange={e => searchStudents(e.target.value)}
                        placeholder="Search by name or email…"
                        className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
                      />
                      {searchingStudents && <Loader2 size={13} className="animate-spin text-gray-400" />}
                    </div>
                    {studentResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                        {studentResults.map(s => (
                          <button
                            key={s._id}
                            onClick={() => { setSelectedStudent(s); setStudentResults([]); setStudentQuery(''); }}
                            className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                          >
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{s.first_name} {s.last_name}</p>
                            <p className="text-xs text-gray-400">{s.email}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {studentQuery.length >= 2 && !searchingStudents && studentResults.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1 px-1">No students found.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Purpose */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Purpose</label>
                <select value={schedPurpose} onChange={e => setSchedPurpose(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none">
                  <option value="personal">Personal / Mental Health</option>
                  <option value="academic">Academic Concerns</option>
                  <option value="career">Career Counseling</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Concern */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Concern / Notes</label>
                <textarea value={schedConcern} onChange={e => setSchedConcern(e.target.value)}
                  placeholder="Brief description of the concern…"
                  rows={2}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:outline-none resize-none" />
              </div>

              {/* Method */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Mode</label>
                <select value={schedMethod} onChange={e => setSchedMethod(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none">
                  <option value="in-person">In Person</option>
                  <option value="google-meet">Google Meet</option>
                  <option value="zoom">Zoom</option>
                </select>
              </div>

              {/* Optional: Counselor + Date/Time */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Optional — assign a counselor and/or set a time now, or leave blank to assign later.</p>
                <div className="space-y-2">
                  <select value={schedCounselor} onChange={e => setSchedCounselor(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none">
                    <option value="">Assign counselor later…</option>
                    {counselors.map(c => (
                      <option key={c._id} value={c._id}>{c.first_name} {c.last_name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)}
                      className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none" />
                    <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)}
                      className="w-28 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none" />
                  </div>
                </div>
              </div>

              {scheduleMsg && (
                <p className={`text-xs px-3 py-2 rounded-lg ${scheduleMsg.type === 'ok' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
                  {scheduleMsg.text}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={() => { setShowScheduleModal(false); resetScheduleForm(); }}
                  className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  Cancel
                </button>
                <button onClick={handleScheduleSubmit} disabled={submittingSchedule || !selectedStudent}
                  className="flex-1 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors">
                  {submittingSchedule && <Loader2 size={13} className="animate-spin" />}
                  Create Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: number | string;
  color?: 'yellow' | 'red';
}

function SummaryCard({ title, value, color }: SummaryCardProps) {
  const valueColor = color === 'yellow' ? 'text-yellow-700 dark:text-yellow-400'
    : color === 'red' ? 'text-red-600 dark:text-red-400'
    : 'text-gray-900 dark:text-gray-100';
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{title}</p>
      <p className={`text-2xl font-semibold ${valueColor}`}>{value}</p>
    </div>
  );
}
