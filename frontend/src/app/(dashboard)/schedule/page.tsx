'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import CalendarWeekView, { CalAppt, PersonalEvent } from '@/components/CalendarWeekView';
import { api } from '@/utils/api';
import { X, Loader2, Check, Monitor, MapPin } from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
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

// ─── Availability helpers ────────────────────────────────────────────────────

const DAYS = [
  { label: 'Monday',    dow: 0 },
  { label: 'Tuesday',   dow: 1 },
  { label: 'Wednesday', dow: 2 },
  { label: 'Thursday',  dow: 3 },
  { label: 'Friday',    dow: 4 },
  { label: 'Saturday',  dow: 5 },
  { label: 'Sunday',    dow: 6 },
];

const TIME_OPTIONS: string[] = [];
for (let h = 7; h <= 20; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 20) TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`);
}

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

interface DayEntry {
  enabled: boolean;
  start_time: string;
  end_time: string;
  session_method: 'in-person' | 'online';
}

type WeekState = Record<number, DayEntry>;

const DEFAULT_WEEK: WeekState = Object.fromEntries(
  DAYS.map(({ dow }) => [dow, { enabled: dow < 5, start_time: '09:00', end_time: '17:00', session_method: 'in-person' as const }])
);

const SEL_S: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
  borderRadius: '0.5rem',
  padding: '0.375rem 0.625rem',
  fontSize: '0.875rem',
  outline: 'none',
};

const AVAIL_ROLES = ['IC', 'COUNSELOR', 'PSYCHOLOGIST'];

// ─── Inner page (needs useSearchParams) ─────────────────────────────────────

function ScheduleInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const activeTab    = (searchParams.get('tab') ?? 'calendar') as 'calendar' | 'availability';

  const [role, setRole] = useState('');

  // ── Calendar state ──
  const [weekStart, setWeekStart]           = useState<Date>(() => getMondayOf(new Date()));
  const [appointments, setAppointments]     = useState<CalAppt[]>([]);
  const [personalEvents, setPersonalEvents] = useState<PersonalEvent[]>([]);
  const [calLoading, setCalLoading]         = useState(true);

  const [modal, setModal]     = useState(false);
  const [evTitle, setEvTitle] = useState('');
  const [evDate, setEvDate]   = useState('');
  const [evStart, setEvStart] = useState('');
  const [evEnd, setEvEnd]     = useState('');
  const [evNote, setEvNote]   = useState('');
  const [evColor, setEvColor] = useState('#64748b');
  const [saving, setSaving]   = useState(false);
  const [saveErr, setSaveErr] = useState('');

  // ── Availability state ──
  const [week, setWeek]                   = useState<WeekState>(DEFAULT_WEEK);
  const [sessionMethod, setSessionMethod] = useState<'in-person' | 'online'>('in-person');
  const [availLoading, setAvailLoading]   = useState(false);
  const [availSaving, setAvailSaving]     = useState(false);
  const [availLoaded, setAvailLoaded]     = useState(false);
  const [toast, setToast]                 = useState<{ msg: string; ok: boolean } | null>(null);

  // ── Role ──
  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) { try { setRole(JSON.parse(raw).role ?? ''); } catch {} }
  }, []);

  // ── Calendar fetch ──
  const fetchAppts = useCallback(async (start: Date) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setCalLoading(true);
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
    finally { setCalLoading(false); }
  }, []);

  useEffect(() => { fetchAppts(weekStart); }, [weekStart, fetchAppts]);

  // ── Availability fetch (lazy — only when tab first opened) ──
  const fetchAvail = useCallback(async () => {
    if (availLoaded) return;
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/login'; return; }
    setAvailLoading(true);
    fetch(api('/api/availability/weekly'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.session_method) setSessionMethod(data.session_method);
        if (data.schedule?.length) {
          const globalMethod = data.session_method || 'in-person';
          const loaded: WeekState = { ...DEFAULT_WEEK };
          DAYS.forEach(({ dow }) => { loaded[dow] = { ...loaded[dow], enabled: false }; });
          data.schedule.forEach((e: any) => {
            loaded[e.day_of_week] = {
              enabled: true,
              start_time: e.start_time,
              end_time: e.end_time,
              session_method: e.session_method || globalMethod,
            };
          });
          setWeek(loaded);
        }
      })
      .catch(() => {})
      .finally(() => { setAvailLoading(false); setAvailLoaded(true); });
  }, [availLoaded]);

  useEffect(() => {
    if (activeTab === 'availability' && AVAIL_ROLES.includes(role.toUpperCase())) {
      fetchAvail();
    }
  }, [activeTab, role, fetchAvail]);

  // ── Calendar helpers ──
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

  // ── Availability helpers ──
  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const saveAvail = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setAvailSaving(true);
    const schedule = DAYS.filter(({ dow }) => week[dow].enabled).map(({ dow }) => ({
      day_of_week: dow,
      start_time: week[dow].start_time,
      end_time: week[dow].end_time,
      session_method: week[dow].session_method,
    }));
    try {
      const r = await fetch(api('/api/availability/weekly'), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule, session_method: sessionMethod }),
      });
      const d = await r.json();
      if (r.ok) showToast(d.message ?? 'Saved', true);
      else showToast(d.error ?? 'Failed to save', false);
    } catch {
      showToast('Network error', false);
    } finally {
      setAvailSaving(false);
    }
  };

  // ── Derived ──
  const upperRole = role.toUpperCase();
  const isStaff   = ['STAFF', 'ADMIN', 'DPO'].includes(upperRole);
  const hasAvail  = AVAIL_ROLES.includes(upperRole);

  const calTitle    = isStaff ? 'CPS Calendar' : 'My Schedule';
  const calSubtitle = isStaff ? 'All counselor appointments across the CPS this week' : 'Your upcoming sessions for the week';
  const pageTitle   = hasAvail ? 'Schedule & Availability' : calTitle;
  const pageSubtitle = hasAvail ? 'View your calendar and manage your booking availability' : calSubtitle;

  const activeDays = DAYS.filter(({ dow }) => week[dow].enabled).length;

  function setTab(tab: 'calendar' | 'availability') {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/schedule?${params.toString()}`);
  }

  return (
    <DashboardPageWrapper title={pageTitle} subtitle={pageSubtitle}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium"
          style={toast.ok
            ? { background: 'var(--color-success-surface)', color: 'var(--color-success)', border: '1px solid var(--color-success)' }
            : { background: 'var(--color-danger-surface)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>
          {toast.ok && <Check size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Tabs (only for roles that have availability) */}
      {hasAvail && (
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit"
          style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
          {(['calendar', 'availability'] as const).map(tab => (
            <button key={tab} onClick={() => setTab(tab)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition"
              style={activeTab === tab
                ? { background: 'var(--color-surface)', color: 'var(--color-text-primary)', boxShadow: 'var(--shadow-card)' }
                : { color: 'var(--color-text-muted)' }}>
              {tab === 'calendar' ? 'Calendar' : 'My Availability'}
            </button>
          ))}
        </div>
      )}

      {/* ── Calendar Tab ── */}
      {activeTab === 'calendar' && (
        <>
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
            loading={calLoading}
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
        </>
      )}

      {/* ── Availability Tab ── */}
      {activeTab === 'availability' && hasAvail && (
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-card"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>

            <div className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Weekly Schedule</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{activeDays} day{activeDays !== 1 ? 's' : ''} active · 1-hour slots</p>
              </div>
              <button onClick={saveAvail} disabled={availSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                {availSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {availSaving ? 'Saving…' : 'Save'}
              </button>
            </div>

            {availLoading ? (
              <div className="p-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading schedule…</div>
            ) : (
              <div>
                {DAYS.map(({ label, dow }, idx) => {
                  const entry = week[dow];
                  return (
                    <div key={dow} className={`px-6 py-4 flex items-center gap-4 transition-opacity ${entry.enabled ? '' : 'opacity-50'}`}
                      style={{ borderBottom: idx < DAYS.length - 1 ? '1px solid var(--color-border)' : 'none' }}>

                      <button onClick={() => setWeek(w => ({
                        ...w,
                        [dow]: { ...w[dow], enabled: !w[dow].enabled, session_method: w[dow].enabled ? w[dow].session_method : sessionMethod },
                      }))}
                        className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0 overflow-hidden"
                        style={{ background: entry.enabled ? 'var(--color-primary)' : 'var(--color-border)' }}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${entry.enabled ? 'translate-x-[1.375rem]' : 'translate-x-0.5'}`} />
                      </button>

                      <span className="w-24 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</span>

                      {entry.enabled ? (
                        <div className="flex items-center gap-2 flex-1 flex-wrap">
                          <select value={entry.start_time}
                            onChange={e => setWeek(w => ({ ...w, [dow]: { ...w[dow], start_time: e.target.value } }))}
                            style={SEL_S}>
                            {TIME_OPTIONS.map(t => <option key={t} value={t}>{fmt12(t)}</option>)}
                          </select>
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>to</span>
                          <select value={entry.end_time}
                            onChange={e => setWeek(w => ({ ...w, [dow]: { ...w[dow], end_time: e.target.value } }))}
                            style={SEL_S}>
                            {TIME_OPTIONS.filter(t => t > entry.start_time).map(t => <option key={t} value={t}>{fmt12(t)}</option>)}
                          </select>

                          <div className="flex gap-1 ml-auto">
                            {(['in-person', 'online'] as const).map(v => (
                              <button key={v} onClick={() => setWeek(w => ({ ...w, [dow]: { ...w[dow], session_method: v } }))}
                                title={v === 'in-person' ? 'Face to Face' : 'Online'}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition"
                                style={entry.session_method === v
                                  ? { background: 'var(--color-primary-surface)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }
                                  : { background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                                {v === 'in-person' ? <MapPin size={10} /> : <Monitor size={10} />}
                                {v === 'in-person' ? 'F2F' : 'Online'}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>Unavailable</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="px-6 py-3" style={{ background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Students see your free 1-hour slots with the method you set per day (F2F or Online). Confirmed sessions are automatically excluded.
              </p>
            </div>
          </div>
        </div>
      )}
    </DashboardPageWrapper>
  );
}

// ─── Page export wrapped in Suspense for useSearchParams ────────────────────

export default function SchedulePage() {
  return (
    <Suspense fallback={null}>
      <ScheduleInner />
    </Suspense>
  );
}
