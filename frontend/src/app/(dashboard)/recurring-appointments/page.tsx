'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { RepeatIcon, Calendar, Clock, User, Video, MapPin, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { todayPH } from '@/utils/dateUtils';

interface Student { _id: string; first_name: string; last_name: string; email: string; student_id?: string; }
interface PreviewSession { session: number; date: string; }

const RECURRENCE_OPTIONS = [
  { value: 'weekly',   label: 'Weekly',    desc: 'Same day every week' },
  { value: 'biweekly', label: 'Bi-weekly', desc: 'Every two weeks' },
];

const METHOD_OPTIONS = [
  { value: 'in_person',   label: 'In-Person',  icon: <MapPin size={14}/> },
  { value: 'zoom',        label: 'Zoom',        icon: <Video size={14}/> },
  { value: 'google_meet', label: 'Google Meet', icon: <Video size={14}/> },
];

const IC = 'input';
const IC_S = (focused: boolean): React.CSSProperties => ({
  background: 'var(--color-bg)',
  border: `1px solid ${focused ? 'var(--color-primary)' : 'var(--color-border)'}`,
  color: 'var(--color-text-primary)',
});

// Defined outside the page so React keeps the same component between renders
// (inputs inside them would otherwise lose focus on every keystroke).
const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="border rounded-xl p-4 shadow-card" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
    {children}
  </div>
);

const SectionLabel = ({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) => (
  <p className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
    {icon}{children}
  </p>
);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{children}</label>
);

export default function RecurringAppointmentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [form, setForm] = useState({
    start_date: '', time: '10:00', recurrence: 'weekly', sessions: '8',
    duration_minutes: '60', purpose: 'Ongoing Counseling', concern: '',
    preferred_method: 'in_person', meeting_link: '', notes: '',
  });
  const [fieldFocus, setFieldFocus] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<PreviewSession[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ count: number; sessions: PreviewSession[] } | null>(null);
  const [error, setError] = useState('');

  const onFIn  = (k: string) => setFieldFocus(f => ({ ...f, [k]: true  }));
  const onFOut = (k: string) => setFieldFocus(f => ({ ...f, [k]: false }));

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(api('/api/users?role=STUDENT&limit=100'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.users) setStudents(d.users); else if (Array.isArray(d)) setStudents(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.start_date || !form.time || !form.sessions) { setPreview([]); return; }
    const count = parseInt(form.sessions);
    if (isNaN(count) || count < 1) { setPreview([]); return; }
    const step = form.recurrence === 'weekly' ? 7 : 14;
    const base = new Date(`${form.start_date}T${form.time}`);
    setPreview(Array.from({ length: count }, (_, i) => {
      const d = new Date(base); d.setDate(d.getDate() + step * i);
      return { session: i + 1, date: d.toLocaleString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) };
    }));
  }, [form.start_date, form.time, form.recurrence, form.sessions]);

  const filteredStudents = students.filter(s =>
    `${s.first_name} ${s.last_name} ${s.email}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent) { setError('Please select a student'); return; }
    setSubmitting(true); setError('');
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
      setSelectedStudent(null); setStudentSearch('');
      setForm(f => ({ ...f, start_date: '', notes: '', meeting_link: '' }));
    } else { setError(data.error || 'Failed to create recurring appointments'); }
  }

  if (success) {
    return (
      <DashboardPageWrapper title="Recurring Appointments" subtitle="Schedule a series of sessions for a student">
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--color-success-surface)' }}>
            <CheckCircle size={28} style={{ color: 'var(--color-success)' }} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            {success.count} Sessions Created
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
            Reminders have been auto-scheduled for each session.
          </p>
          <div className="text-left space-y-1.5 mb-8 rounded-xl p-4" style={{ background: 'var(--color-bg)' }}>
            {success.sessions.map(s => (
              <div key={s.session} className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium flex-shrink-0"
                  style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)' }}>
                  {s.session}
                </span>
                <span>{new Date(s.date).toLocaleString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setSuccess(null)}
            className="px-6 py-2.5 text-white font-medium rounded-lg text-sm transition hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}>
            Schedule Another Series
          </button>
        </div>
      </DashboardPageWrapper>
    );
  }


  return (
    <DashboardPageWrapper title="Recurring Appointments" subtitle="Schedule a series of sessions for a student">
      <div className="max-w-2xl">
        <form onSubmit={submit} className="space-y-5">

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg border text-sm"
              style={{ background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Student */}
          <Card>
            <SectionLabel icon={<User size={12} />}>Student</SectionLabel>
            {selectedStudent ? (
              <div className="flex items-center justify-between p-3 rounded-lg border"
                style={{ background: 'var(--color-success-surface)', borderColor: 'var(--color-success)' }}>
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{selectedStudent.first_name} {selectedStudent.last_name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{selectedStudent.email}</p>
                </div>
                <button type="button" onClick={() => setSelectedStudent(null)} className="text-xs hover:underline" style={{ color: 'var(--color-success)' }}>Change</button>
              </div>
            ) : (
              <div>
                <input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className={IC} style={IC_S(searchFocused)}
                  onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
                {studentSearch && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
                    {filteredStudents.slice(0, 8).map(s => (
                      <button key={s._id} type="button"
                        onClick={() => { setSelectedStudent(s); setStudentSearch(''); }}
                        className="w-full text-left px-3 py-2 transition"
                        style={{ borderBottom: '1px solid var(--color-border)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{s.first_name} {s.last_name}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.email}</p>
                      </button>
                    ))}
                    {filteredStudents.length === 0 && (
                      <p className="px-3 py-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>No students found</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Schedule */}
          <Card>
            <SectionLabel icon={<Calendar size={12} />}>Schedule</SectionLabel>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <FieldLabel>Start Date</FieldLabel>
                <input type="date" value={form.start_date} min={todayPH()} required
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  className={IC} style={IC_S(fieldFocus['date'])}
                  onFocus={() => onFIn('date')} onBlur={() => onFOut('date')} />
              </div>
              <div>
                <FieldLabel>Time</FieldLabel>
                <input type="time" value={form.time} required
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  className={IC} style={IC_S(fieldFocus['time'])}
                  onFocus={() => onFIn('time')} onBlur={() => onFOut('time')} />
              </div>
            </div>

            <div className="mb-4">
              <FieldLabel>Recurrence</FieldLabel>
              <div className="flex gap-2">
                {RECURRENCE_OPTIONS.map(opt => {
                  const active = form.recurrence === opt.value;
                  return (
                    <button key={opt.value} type="button"
                      onClick={() => setForm(f => ({ ...f, recurrence: opt.value }))}
                      className="flex-1 p-3 rounded-lg border text-left transition"
                      style={active
                        ? { borderColor: 'var(--color-primary)', background: 'var(--color-primary-surface)', color: 'var(--color-primary)' }
                        : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Number of Sessions</FieldLabel>
                <select value={form.sessions} onChange={e => setForm(f => ({ ...f, sessions: e.target.value }))}
                  className={IC} style={IC_S(fieldFocus['sessions'])}
                  onFocus={() => onFIn('sessions')} onBlur={() => onFOut('sessions')}>
                  {[2,3,4,5,6,8,10,12,16,20,24].map(n => <option key={n} value={n}>{n} sessions</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Duration</FieldLabel>
                <select value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                  className={IC} style={IC_S(fieldFocus['duration'])}
                  onFocus={() => onFIn('duration')} onBlur={() => onFOut('duration')}>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Session Details */}
          <Card>
            <SectionLabel>Session Details</SectionLabel>
            <div className="space-y-3">
              <div>
                <FieldLabel>Purpose</FieldLabel>
                <input type="text" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                  className={IC} style={IC_S(fieldFocus['purpose'])}
                  onFocus={() => onFIn('purpose')} onBlur={() => onFOut('purpose')} />
              </div>
              <div>
                <FieldLabel>Concern / Focus Area</FieldLabel>
                <input type="text" value={form.concern} placeholder="e.g., Anxiety management, academic stress…"
                  onChange={e => setForm(f => ({ ...f, concern: e.target.value }))}
                  className={IC} style={IC_S(fieldFocus['concern'])}
                  onFocus={() => onFIn('concern')} onBlur={() => onFOut('concern')} />
              </div>

              <div>
                <FieldLabel><Video size={11} className="inline mr-1" />Method</FieldLabel>
                <div className="flex gap-2 flex-wrap">
                  {METHOD_OPTIONS.map(opt => {
                    const active = form.preferred_method === opt.value;
                    return (
                      <button key={opt.value} type="button"
                        onClick={() => setForm(f => ({ ...f, preferred_method: opt.value }))}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition"
                        style={active
                          ? { borderColor: 'var(--color-primary)', background: 'var(--color-primary-surface)', color: 'var(--color-primary)' }
                          : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                        {opt.icon} {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.preferred_method !== 'in_person' && (
                <div>
                  <FieldLabel>Meeting Link</FieldLabel>
                  <input type="url" value={form.meeting_link} placeholder="https://…"
                    onChange={e => setForm(f => ({ ...f, meeting_link: e.target.value }))}
                    className={IC} style={IC_S(fieldFocus['link'])}
                    onFocus={() => onFIn('link')} onBlur={() => onFOut('link')} />
                </div>
              )}

              <div>
                <FieldLabel>Notes</FieldLabel>
                <textarea value={form.notes} rows={2} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className={`${IC} resize-none`} style={IC_S(fieldFocus['notes'])}
                  onFocus={() => onFIn('notes')} onBlur={() => onFOut('notes')} />
              </div>
            </div>
          </Card>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="rounded-xl border p-4" style={{ background: 'var(--color-primary-surface)', borderColor: 'var(--color-primary)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-1.5" style={{ color: 'var(--color-primary)' }}>
                <Clock size={11} /> Session Preview — {preview.length} sessions
              </p>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {preview.map(s => (
                  <div key={s.session} className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-primary)' }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center font-medium flex-shrink-0"
                      style={{ background: 'var(--color-primary)', color: 'white' }}>
                      {s.session}
                    </span>
                    {s.date}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={submitting || !selectedStudent || !form.start_date}
            className="w-full py-3 text-white font-medium rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}>
            {submitting
              ? <><Loader2 size={16} className="animate-spin" /> Creating Sessions…</>
              : <><RepeatIcon size={16} /> Create {form.sessions} Recurring Sessions</>}
          </button>
        </form>
      </div>
    </DashboardPageWrapper>
  );
}
