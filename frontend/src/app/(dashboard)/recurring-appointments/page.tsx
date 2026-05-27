'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { RepeatIcon, Calendar, Clock, User, Video, MapPin, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface Student {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
  student_id?: string;
}

interface PreviewSession {
  session: number;
  date: string;
}

const RECURRENCE_OPTIONS = [
  { value: 'weekly',   label: 'Weekly',    desc: 'Same day every week' },
  { value: 'biweekly', label: 'Bi-weekly', desc: 'Every two weeks' },
];

const METHOD_OPTIONS = [
  { value: 'in_person',   label: 'In-Person',   icon: <MapPin size={14}/> },
  { value: 'zoom',        label: 'Zoom',         icon: <Video size={14}/> },
  { value: 'google_meet', label: 'Google Meet',  icon: <Video size={14}/> },
];

export default function RecurringAppointmentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [form, setForm] = useState({
    start_date: '',
    time: '10:00',
    recurrence: 'weekly',
    sessions: '8',
    duration_minutes: '60',
    purpose: 'Ongoing Counseling',
    concern: '',
    preferred_method: 'in_person',
    meeting_link: '',
    notes: '',
  });
  const [preview, setPreview] = useState<PreviewSession[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ count: number; sessions: PreviewSession[] } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(api('/api/users?role=STUDENT&limit=100'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.users) setStudents(data.users);
        else if (Array.isArray(data)) setStudents(data);
      })
      .catch(() => {});
  }, []);

  // Build preview dates when form changes
  useEffect(() => {
    if (!form.start_date || !form.time || !form.sessions) { setPreview([]); return; }
    const count = parseInt(form.sessions);
    if (isNaN(count) || count < 1) { setPreview([]); return; }
    const step = form.recurrence === 'weekly' ? 7 : 14;
    const sessions: PreviewSession[] = [];
    const base = new Date(`${form.start_date}T${form.time}`);
    for (let i = 0; i < count; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + step * i);
      sessions.push({
        session: i + 1,
        date: d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
      });
    }
    setPreview(sessions);
  }, [form.start_date, form.time, form.recurrence, form.sessions]);

  const filteredStudents = students.filter(s =>
    `${s.first_name} ${s.last_name} ${s.email}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent) { setError('Please select a student'); return; }
    setSubmitting(true);
    setError('');

    const token = localStorage.getItem('token');
    const res = await fetch(api('/api/appointments/recurring'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, student_id: selectedStudent._id }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (res.ok) {
      setSuccess({ count: data.appointments?.length ?? 0, sessions: data.appointments ?? [] });
      setSelectedStudent(null);
      setStudentSearch('');
      setForm(f => ({ ...f, start_date: '', notes: '', meeting_link: '' }));
    } else {
      setError(data.error || 'Failed to create recurring appointments');
    }
  }

  if (success) {
    return (
      <DashboardPageWrapper title="Recurring Appointments">
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {success.count} Sessions Created
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Reminders have been auto-scheduled for each session.
          </p>
          <div className="text-left space-y-1.5 mb-8 bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            {success.sessions.map(s => (
              <div key={s.session} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 text-xs flex items-center justify-center font-medium">{s.session}</span>
                <span>{new Date(s.date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-sm transition-colors"
          >
            Schedule Another Series
          </button>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Recurring Appointments" subtitle="Schedule a series of sessions for a student">
      <div className="max-w-2xl mx-auto">
        <form onSubmit={submit} className="space-y-5">

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Student selector */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              <User size={12} className="inline mr-1" /> Student
            </label>
            {selectedStudent ? (
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{selectedStudent.email}</p>
                </div>
                <button type="button" onClick={() => setSelectedStudent(null)} className="text-xs text-green-600 dark:text-green-400 hover:underline">Change</button>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {studentSearch && (
                  <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredStudents.slice(0, 8).map(s => (
                      <button
                        key={s._id}
                        type="button"
                        onClick={() => { setSelectedStudent(s); setStudentSearch(''); }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <p className="text-sm text-gray-900 dark:text-white">{s.first_name} {s.last_name}</p>
                        <p className="text-xs text-gray-400">{s.email}</p>
                      </button>
                    ))}
                    {filteredStudents.length === 0 && (
                      <p className="px-3 py-2 text-sm text-gray-400">No students found</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <Calendar size={12} className="inline mr-1" /> Schedule
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={form.start_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Time</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Recurrence */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Recurrence</label>
              <div className="flex gap-2">
                {RECURRENCE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, recurrence: opt.value }))}
                    className={`flex-1 p-3 rounded-lg border text-left transition-colors ${
                      form.recurrence === opt.value
                        ? 'border-green-500 bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Number of Sessions</label>
                <select
                  value={form.sessions}
                  onChange={e => setForm(f => ({ ...f, sessions: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {[2,3,4,5,6,8,10,12,16,20,24].map(n => (
                    <option key={n} value={n}>{n} sessions</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Duration</label>
                <select
                  value={form.duration_minutes}
                  onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                </select>
              </div>
            </div>
          </div>

          {/* Session Details */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Session Details</label>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Purpose</label>
              <input
                type="text"
                value={form.purpose}
                onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Concern / Focus Area</label>
              <input
                type="text"
                value={form.concern}
                onChange={e => setForm(f => ({ ...f, concern: e.target.value }))}
                placeholder="e.g., Anxiety management, academic stress…"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Method */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">
                <Video size={11} className="inline mr-1" /> Method
              </label>
              <div className="flex gap-2">
                {METHOD_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, preferred_method: opt.value }))}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
                      form.preferred_method === opt.value
                        ? 'border-green-500 bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {form.preferred_method !== 'in_person' && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Meeting Link</label>
                <input
                  type="url"
                  value={form.meeting_link}
                  onChange={e => setForm(f => ({ ...f, meeting_link: e.target.value }))}
                  placeholder="https://…"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide mb-3">
                <Clock size={11} className="inline mr-1" /> Session Preview — {preview.length} sessions
              </p>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {preview.map(s => (
                  <div key={s.session} className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
                    <span className="w-4 h-4 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center font-medium text-green-800 dark:text-green-200 flex-shrink-0">{s.session}</span>
                    {s.date}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !selectedStudent || !form.start_date}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting
              ? <><Loader2 size={16} className="animate-spin" /> Creating Sessions…</>
              : <><RepeatIcon size={16} /> Create {form.sessions} Recurring Sessions</>
            }
          </button>
        </form>
      </div>
    </DashboardPageWrapper>
  );
}
