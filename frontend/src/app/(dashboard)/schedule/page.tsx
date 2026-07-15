'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import CalendarWeekView, { CalAppt, PersonalEvent } from '@/components/CalendarWeekView';
import { api } from '@/utils/api';
import { X, Loader2 } from 'lucide-react';

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toLocalISO(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const IC = 'w-full px-3 py-2 text-sm rounded-lg outline-none transition';
const IC_S: React.CSSProperties = { border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' };
const onFIn  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-surface)'; };
const onFOut = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; };

const EVENT_COLORS = [
  { label: 'Slate',  value: '#64748b' },
  { label: 'Blue',   value: '#3b82f6' },
  { label: 'Teal',   value: '#14b8a6' },
  { label: 'Green',  value: '#22c55e' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Pink',   value: '#ec4899' },
  { label: 'Purple', value: '#a855f7' },
];

export default function SchedulePage() {
  const [weekStart, setWeekStart]           = useState<Date>(() => getMondayOf(new Date()));
  const [appointments, setAppointments]     = useState<CalAppt[]>([]);
  const [personalEvents, setPersonalEvents] = useState<PersonalEvent[]>([]);
  const [loading, setLoading]               = useState(true);
  const [role, setRole]                     = useState<string>('');

  // Add-event modal state
  const [modal, setModal]       = useState(false);
  const [evTitle, setEvTitle]   = useState('');
  const [evDate, setEvDate]     = useState('');
  const [evStart, setEvStart]   = useState('');
  const [evEnd, setEvEnd]       = useState('');
  const [evNote, setEvNote]     = useState('');
  const [evColor, setEvColor]   = useState('#64748b');
  const [saving, setSaving]     = useState(false);
  const [saveErr, setSaveErr]   = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) { try { setRole(JSON.parse(raw).role ?? ''); } catch {} }
  }, []);

  const fetchAppts = useCallback(async (start: Date) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    try {
      const from = start.toISOString();
      const end  = new Date(start); end.setDate(end.getDate() + 7);
      const to   = end.toISOString();
      const [r1, r2] = await Promise.all([
        fetch(api(`/api/appointments/dashboard/calendar?from=${from}&to=${to}`), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(api(`/api/calendar/personal-events?from=${from}&to=${to}`),        { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (r1.ok) { const d = await r1.json(); setAppointments(d.appointments ?? []); } else setAppointments([]);
      if (r2.ok) { setPersonalEvents(await r2.json()); } else setPersonalEvents([]);
    } catch { setAppointments([]); setPersonalEvents([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAppts(weekStart); }, [weekStart, fetchAppts]);

  function prevWeek() { setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; }); }
  function nextWeek() { setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; }); }
  function goToday()  { setWeekStart(getMondayOf(new Date())); }

  function openModal(date?: Date, hour?: number, minute?: number) {
    setEvTitle(''); setEvNote(''); setSaveErr(''); setEvColor('#64748b');
    if (date) {
      const d = new Date(date);
      const pad = (n: number) => String(n).padStart(2, '0');
      setEvDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      const h  = hour  ?? 9;
      const m  = minute ?? 0;
      const h2 = Math.min(h + 1, 20);
      setEvStart(`${pad(h)}:${pad(m)}`);
      setEvEnd(`${pad(h2)}:${pad(m)}`);
    } else {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      setEvDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
      setEvStart('09:00');
      setEvEnd('10:00');
    }
    setModal(true);
  }

  async function saveEvent() {
    if (!evTitle.trim()) { setSaveErr('Title is required.'); return; }
    if (!evDate || !evStart || !evEnd) { setSaveErr('Date, start, and end time are required.'); return; }
    const start = new Date(`${evDate}T${evStart}:00`);
    const end   = new Date(`${evDate}T${evEnd}:00`);
    if (end <= start) { setSaveErr('End time must be after start time.'); return; }
    setSaving(true); setSaveErr('');
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api('/api/calendar/personal-events'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: evTitle.trim(), start: start.toISOString(), end: end.toISOString(), note: evNote, color: evColor }),
      });
      if (r.ok) {
        setModal(false);
        fetchAppts(weekStart);
      } else {
        const e = await r.json();
        setSaveErr(e.error || 'Failed to save.');
      }
    } finally { setSaving(false); }
  }

  async function deleteEvent(id: string) {
    const token = localStorage.getItem('token');
    const r = await fetch(api(`/api/calendar/personal-events/${id}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) setPersonalEvents(prev => prev.filter(e => e.id !== id));
  }

  const isStaff  = ['STAFF', 'ADMIN', 'DPO'].includes(role.toUpperCase());
  const title    = isStaff ? 'CPS Calendar' : 'My Schedule';
  const subtitle = isStaff ? 'All counselor appointments across the CPS this week' : 'Your upcoming sessions for the week';

  return (
    <DashboardPageWrapper title={title} subtitle={subtitle}>
      {!isStaff && (
        <div className="flex justify-end mb-3">
          <button onClick={() => openModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition hover:opacity-90"
            style={{ background: 'var(--color-primary)', color: 'white' }}>
            + Add Personal Event
          </button>
        </div>
      )}

      <CalendarWeekView
        appointments={appointments}
        loading={loading}
        colorBy={isStaff ? 'counselor' : 'status'}
        weekStart={weekStart}
        onPrevWeek={prevWeek}
        onNextWeek={nextWeek}
        onToday={goToday}
        personalEvents={isStaff ? [] : personalEvents}
        onGridClick={isStaff ? undefined : (date, hour, minute) => openModal(date, hour, minute)}
        onDeletePersonalEvent={isStaff ? undefined : deleteEvent}
      />

      {/* Add event modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" style={{ background: 'var(--color-surface)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Add Personal Event</h3>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg transition"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X size={14} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Title <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input type="text" value={evTitle} onChange={e => setEvTitle(e.target.value)}
                  placeholder="e.g. Lunch, Faculty Meeting, Out of office…"
                  className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Date <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input type="date" value={evDate} onChange={e => setEvDate(e.target.value)}
                  className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Start <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <input type="time" value={evStart} onChange={e => setEvStart(e.target.value)}
                    className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    End <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <input type="time" value={evEnd} onChange={e => setEvEnd(e.target.value)}
                    className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Color</label>
                <div className="flex gap-2">
                  {EVENT_COLORS.map(c => (
                    <button key={c.value} title={c.label}
                      onClick={() => setEvColor(c.value)}
                      style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: c.value,
                        border: evColor === c.value ? `2px solid var(--color-text-primary)` : '2px solid transparent',
                        outline: evColor === c.value ? '2px solid var(--color-primary)' : 'none',
                        cursor: 'pointer',
                      }} />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Note <span className="font-normal normal-case" style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
                </label>
                <textarea value={evNote} onChange={e => setEvNote(e.target.value)}
                  rows={2} placeholder="Any details…"
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none transition resize-none"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                  onFocus={onFIn} onBlur={onFOut} />
              </div>

              {saveErr && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{saveErr}</p>}
            </div>

            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setModal(false)}
                className="flex-1 px-4 py-2 border text-sm rounded-lg transition"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                Cancel
              </button>
              <button onClick={saveEvent} disabled={saving}
                className="flex-1 px-4 py-2 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                {saving && <Loader2 size={13} className="animate-spin" />}
                Save Event
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardPageWrapper>
  );
}
