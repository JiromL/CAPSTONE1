'use client';

import { useState, useEffect } from 'react';
import { Loader2, CalendarDays, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { api } from '@/utils/api';

interface PendingSession {
  appointment_id: string;
  counselor_id: string;
  counselor_name: string;
  counselor_role: string;
  source: string;
}

interface Props {
  onScheduled: () => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function buildCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(first).fill(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  return cells;
}

export function ScheduleSessionCard({ onScheduled }: Props) {
  const [session, setSession]         = useState<PendingSession | null>(null);
  const [loading, setLoading]         = useState(true);
  const [viewDate, setViewDate]       = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots]             = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [done, setDone]               = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(api('/api/appointments/pending-session'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.pending_session) setSession(d.pending_session); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedDate || !session) { setSlots([]); setSelectedTime(''); return; }
    setLoadingSlots(true);
    setSelectedTime('');
    const token = localStorage.getItem('token');
    fetch(api(`/api/appointments/counselor-slots?counselor_id=${session.counselor_id}&date=${selectedDate}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : { slots: [] })
      .then(d => setSlots(d.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, session]);

  async function handleConfirm() {
    if (!session || !selectedDate || !selectedTime) return;
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api(`/api/appointments/${session.appointment_id}/student-pick-slot`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, time: selectedTime }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Failed to schedule. Please try again.'); return; }
      setDone(true);
      setTimeout(onScheduled, 2000);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !session) return null;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const cells = buildCalendarDays(viewDate.y, viewDate.m);
  const roleLabel = session.counselor_role === 'PSYCHOLOGIST' ? 'Psychologist' : 'Counselor';

  function dateStr(day: number) {
    return `${viewDate.y}-${String(viewDate.m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }
  function isPast(day: number) { return dateStr(day) < todayStr; }

  function prevMonth() {
    setViewDate(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 });
    setSelectedDate(''); setSlots([]);
  }
  function nextMonth() {
    setViewDate(v => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 });
    setSelectedDate(''); setSlots([]);
  }

  function fmtTime(t: string) {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2,'0')} ${ampm}`;
  }

  if (done) {
    return (
      <div className="rounded-2xl p-6 flex items-center gap-4"
        style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>
        <CheckCircle2 size={28} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--color-success)' }}>Session scheduled!</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-success)' }}>
            {selectedDate} at {fmtTime(selectedTime)} with {session.counselor_name}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-card"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>

      {/* Header */}
      <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--color-warning)' }} />
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-warning)' }}>
            Action Required
          </p>
        </div>
        <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Schedule your session with {session.counselor_name}
        </h3>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {session.source === 'follow_up_pending'
            ? 'Your counselor is ready for your next session. Pick a date and time that works for you.'
            : 'Your intake interview is complete. Pick a date and time that works for you.'}
        </p>
      </div>

      <div className="p-6 space-y-5">

        {/* Mini calendar */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition"
              style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg)' }}>‹</button>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {MONTHS[viewDate.m]} {viewDate.y}
            </p>
            <button onClick={nextMonth} className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition"
              style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg)' }}>›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold py-1" style={{ color: 'var(--color-text-muted)' }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const ds = dateStr(day);
              const past = isPast(day);
              const selected = ds === selectedDate;
              return (
                <button
                  key={i}
                  disabled={past}
                  onClick={() => { setSelectedDate(ds); setSelectedTime(''); }}
                  className="aspect-square rounded-xl text-xs font-medium transition-all flex items-center justify-center"
                  style={{
                    background: selected ? 'var(--color-primary)' : 'transparent',
                    color: selected ? '#fff' : past ? 'var(--color-border-strong)' : 'var(--color-text-primary)',
                    cursor: past ? 'default' : 'pointer',
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        {selectedDate && (
          <div>
            <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              <Clock size={12} /> Available times on {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            {loadingSlots ? (
              <div className="flex items-center gap-2 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <Loader2 size={13} className="animate-spin" /> Checking availability…
              </div>
            ) : slots.length === 0 ? (
              <p className="text-xs py-3" style={{ color: 'var(--color-text-muted)' }}>
                No available slots on this day. Try another date.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map(t => (
                  <button
                    key={t}
                    onClick={() => setSelectedTime(t)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: selectedTime === t ? 'var(--color-primary)' : 'var(--color-bg)',
                      color: selectedTime === t ? '#fff' : 'var(--color-text-primary)',
                      border: `1px solid ${selectedTime === t ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    }}
                  >
                    {fmtTime(t)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger)' }}>
            {error}
          </p>
        )}

        {/* Confirm */}
        <button
          onClick={handleConfirm}
          disabled={!selectedDate || !selectedTime || saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
          style={{ background: 'var(--color-primary)' }}
        >
          {saving ? <><Loader2 size={14} className="animate-spin" />Confirming…</> : <>Confirm Session <ChevronRight size={14} /></>}
        </button>

        <p className="text-[11px] text-center" style={{ color: 'var(--color-text-muted)' }}>
          You'll be meeting with {session.counselor_name} ({roleLabel}) · 1-hour session
        </p>
      </div>
    </div>
  );
}
