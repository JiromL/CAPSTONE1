'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import CalendarWeekView, { CalAppt, PersonalEvent } from '@/components/CalendarWeekView';
import { api } from '@/utils/api';
import { X, Loader2, Check, Monitor, MapPin, CalendarOff, Trash2, Plus } from 'lucide-react';

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
  { label: 'Monday',    short: 'Mon', dow: 0 },
  { label: 'Tuesday',   short: 'Tue', dow: 1 },
  { label: 'Wednesday', short: 'Wed', dow: 2 },
  { label: 'Thursday',  short: 'Thu', dow: 3 },
  { label: 'Friday',    short: 'Fri', dow: 4 },
  { label: 'Saturday',  short: 'Sat', dow: 5 },
];

const TIME_OPTIONS: string[] = [];
for (let h = 7; h <= 20; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 20) TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`);
}

function fmt12(t: string) {
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr), m = parseInt(mStr);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

type Block = { start: string; end: string };
type DayConfig = { enabled: boolean; blocks: Block[]; method: 'in-person' | 'online' };
type WeekState = Record<number, DayConfig>;

function makeDefaultWeek(): WeekState {
  const w: WeekState = {};
  for (let d = 0; d <= 5; d++) w[d] = { enabled: false, blocks: [{ start: '09:00', end: '17:00' }], method: 'in-person' };
  return w;
}

function scheduleToWeek(schedule: any[]): WeekState {
  const w = makeDefaultWeek();
  for (const e of schedule) {
    const dow = e.day_of_week;
    if (dow < 0 || dow > 5) continue;
    if (!w[dow].enabled) { w[dow].enabled = true; w[dow].blocks = []; }
    w[dow].blocks.push({ start: e.start_time, end: e.end_time });
    if (e.session_method) w[dow].method = e.session_method;
  }
  return w;
}

function weekToSchedule(w: WeekState): any[] {
  const result: any[] = [];
  for (let dow = 0; dow <= 5; dow++) {
    if (!w[dow].enabled) continue;
    for (const b of w[dow].blocks) {
      result.push({ day_of_week: dow, start_time: b.start, end_time: b.end, session_method: w[dow].method });
    }
  }
  return result;
}

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
  const [week, setWeek]               = useState<WeekState>(() => makeDefaultWeek());
  const [availLoading, setAvailLoading] = useState(false);
  const [availSaving, setAvailSaving]   = useState(false);
  const [availLoaded, setAvailLoaded]   = useState(false);
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null);

  // ── Leave state ──
  const [leaves, setLeaves]             = useState<{ id: string; date: string; reason: string }[]>([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [newLeaveDate, setNewLeaveDate] = useState('');
  const [newLeaveReason, setNewLeaveReason] = useState('');
  const [leaveSaving, setLeaveSaving]   = useState(false);

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
        if (data.schedule?.length) setWeek(scheduleToWeek(data.schedule));
      })
      .catch(() => {})
      .finally(() => { setAvailLoading(false); setAvailLoaded(true); });
  }, [availLoaded]);

  const fetchLeaves = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLeavesLoading(true);
    try {
      const r = await fetch(api('/api/availability/leave'), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setLeaves(d.leaves ?? []); }
    } catch {}
    finally { setLeavesLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'availability' && AVAIL_ROLES.includes(role.toUpperCase())) {
      fetchAvail();
      fetchLeaves();
    }
  }, [activeTab, role, fetchAvail, fetchLeaves]);

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
    const schedule = weekToSchedule(week);
    const enabledDays = Object.values(week).filter(d => d.enabled).length;
    try {
      const r = await fetch(api('/api/availability/weekly'), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule, session_method: 'in-person' }),
      });
      const d = await r.json();
      if (r.ok) showToast(`Saved — ${schedule.length} block${schedule.length !== 1 ? 's' : ''} across ${enabledDays} day${enabledDays !== 1 ? 's' : ''}`, true);
      else showToast(d.error ?? 'Failed to save', false);
    } catch {
      showToast('Network error', false);
    } finally {
      setAvailSaving(false);
    }
  };

  // ── Week state helpers ──
  function toggleDay(dow: number) {
    setWeek(w => ({ ...w, [dow]: { ...w[dow], enabled: !w[dow].enabled } }));
  }
  function setBlock(dow: number, bi: number, field: 'start' | 'end', val: string) {
    setWeek(w => {
      const blocks = w[dow].blocks.map((b, i) => i === bi ? { ...b, [field]: val } : b);
      return { ...w, [dow]: { ...w[dow], blocks } };
    });
  }
  function addBlock(dow: number) {
    setWeek(w => {
      const last = w[dow].blocks[w[dow].blocks.length - 1];
      const [h] = (last?.end ?? '14:00').split(':').map(Number);
      const newStart = last?.end ?? '14:00';
      const newEnd = `${String(Math.min(h + 1, 20)).padStart(2, '0')}:00`;
      return { ...w, [dow]: { ...w[dow], blocks: [...w[dow].blocks, { start: newStart, end: newEnd }] } };
    });
  }
  function removeBlock(dow: number, bi: number) {
    setWeek(w => {
      const blocks = w[dow].blocks.filter((_, i) => i !== bi);
      // removing the last block disables the day (keeps default for next enable)
      if (!blocks.length) return { ...w, [dow]: { ...w[dow], enabled: false, blocks: [{ start: '09:00', end: '17:00' }] } };
      return { ...w, [dow]: { ...w[dow], blocks } };
    });
  }
  function copyDay(dow: number) {
    setWeek(w => {
      const src = w[dow].blocks;
      const next = { ...w };
      for (let d = 0; d <= 5; d++) {
        if (d !== dow && next[d].enabled) next[d] = { ...next[d], blocks: src.map(b => ({ ...b })) };
      }
      return next;
    });
  }
  function setMethod(dow: number, method: 'in-person' | 'online') {
    setWeek(w => ({ ...w, [dow]: { ...w[dow], method } }));
  }

  const addLeave = async () => {
    if (!newLeaveDate) { showToast('Select a date first', false); return; }
    const token = localStorage.getItem('token');
    setLeaveSaving(true);
    try {
      const r = await fetch(api('/api/availability/leave'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newLeaveDate, reason: newLeaveReason.trim() }),
      });
      const d = await r.json();
      if (r.ok) {
        setNewLeaveDate(''); setNewLeaveReason('');
        fetchLeaves();
        // Check if any created block has a conflict warning
        const warnings: string[] = (d.created ?? []).flatMap((c: any) => c.warning ? [c.warning] : []);
        if (warnings.length > 0) {
          showToast(warnings[0], false); // show as caution (non-ok toast)
        } else {
          showToast('Leave date blocked', true);
        }
      } else {
        showToast(d.error ?? 'Failed to add leave', false);
      }
    } catch { showToast('Network error', false); }
    finally { setLeaveSaving(false); }
  };

  const removeLeave = async (id: string) => {
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/availability/leave/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) { setLeaves(prev => prev.filter(l => l.id !== id)); showToast('Leave removed', true); }
      else { const d = await r.json(); showToast(d.error ?? 'Failed', false); }
    } catch { showToast('Network error', false); }
  };

  // ── Derived ──
  const upperRole = role.toUpperCase();
  const isStaff   = ['STAFF', 'ADMIN', 'DPO'].includes(upperRole);
  const hasAvail  = AVAIL_ROLES.includes(upperRole);

  const calTitle    = isStaff ? 'CPS Calendar' : 'My Schedule';
  const calSubtitle = isStaff ? 'All counselor appointments across the CPS this week' : 'Your upcoming sessions for the week';
  const pageTitle   = hasAvail ? 'Schedule & Availability' : calTitle;
  const pageSubtitle = hasAvail ? 'View your calendar and manage your booking availability' : calSubtitle;

  const enabledDays = Object.values(week).filter(d => d.enabled).length;

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
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>

            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Weekly hours</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Set when you are typically available for sessions
                </p>
              </div>
              <button onClick={saveAvail} disabled={availSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                {availSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {availSaving ? 'Saving…' : 'Save'}
              </button>
            </div>

            {/* Day rows */}
            {availLoading ? (
              <div className="p-10 flex items-center justify-center gap-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
              </div>
            ) : (
              <div>
                {DAYS.map(({ short, label, dow }, di) => {
                  const day = week[dow];
                  return (
                    <div key={dow} className="px-6 py-4 flex items-start gap-5"
                      style={{ borderTop: di > 0 ? '1px solid var(--color-border)' : 'none' }}>

                      {/* Day circle — acts as enable/disable toggle */}
                      <button
                        onClick={() => toggleDay(dow)}
                        aria-label={`${day.enabled ? 'Disable' : 'Enable'} ${label}`}
                        aria-pressed={day.enabled}
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all"
                        style={{
                          cursor: 'pointer',
                          marginTop: 2,
                          ...(day.enabled
                            ? { background: 'var(--color-primary)', color: '#fff' }
                            : { background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1.5px solid var(--color-border)' }),
                        }}>
                        {short[0]}
                      </button>

                      {/* Content */}
                      {day.enabled ? (
                        <div className="flex-1 space-y-2.5 min-w-0">
                          {day.blocks.map((block, bi) => (
                            <div key={bi} className="flex items-center gap-2 flex-wrap">

                              {/* Start time */}
                              <select
                                aria-label={`${label} start time, block ${bi + 1}`}
                                value={block.start}
                                onChange={e => setBlock(dow, bi, 'start', e.target.value)}
                                className="h-9 px-3 text-sm rounded-lg outline-none transition"
                                style={{ cursor: 'pointer', minWidth: 110, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}>
                                {TIME_OPTIONS.map(t => <option key={t} value={t}>{fmt12(t)}</option>)}
                              </select>

                              <span className="text-sm select-none" style={{ color: 'var(--color-text-muted)' }}>–</span>

                              {/* End time */}
                              <select
                                aria-label={`${label} end time, block ${bi + 1}`}
                                value={block.end}
                                onChange={e => setBlock(dow, bi, 'end', e.target.value)}
                                className="h-9 px-3 text-sm rounded-lg outline-none transition"
                                style={{ cursor: 'pointer', minWidth: 110, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}>
                                {TIME_OPTIONS.map(t => <option key={t} value={t}>{fmt12(t)}</option>)}
                              </select>

                              {/* Remove block — removing last block disables the day */}
                              <button
                                onClick={() => removeBlock(dow, bi)}
                                aria-label={`Remove ${label} time block ${bi + 1}`}
                                className="w-8 h-8 flex items-center justify-center rounded-lg transition flex-shrink-0"
                                style={{ cursor: 'pointer', color: 'var(--color-text-muted)' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg)'; e.currentTarget.style.color = 'var(--color-danger)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                                <X size={15} />
                              </button>

                              {/* Add block + Copy — first row only */}
                              {bi === 0 && (
                                <>
                                  <button
                                    onClick={() => addBlock(dow)}
                                    aria-label={`Add another time block for ${label}`}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg transition flex-shrink-0"
                                    style={{ cursor: 'pointer', color: 'var(--color-text-muted)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                    <Plus size={16} />
                                  </button>
                                  {enabledDays > 1 && (
                                    <button
                                      onClick={() => copyDay(dow)}
                                      aria-label={`Copy ${label} schedule to all other active days`}
                                      className="w-8 h-8 flex items-center justify-center rounded-lg transition flex-shrink-0"
                                      style={{ cursor: 'pointer', color: 'var(--color-text-muted)' }}
                                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                      </svg>
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          ))}

                          {/* Session type toggle */}
                          <div className="flex gap-1.5 pt-0.5">
                            {(['in-person', 'online'] as const).map(v => {
                              const isActive = day.method === v;
                              return (
                                <button key={v}
                                  onClick={() => setMethod(dow, v)}
                                  aria-label={v === 'in-person' ? 'Face to face sessions' : 'Online sessions'}
                                  aria-pressed={isActive}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
                                  style={{
                                    cursor: 'pointer',
                                    ...(isActive
                                      ? { background: 'var(--color-primary)', color: '#fff' }
                                      : { background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }),
                                  }}>
                                  {v === 'in-person' ? <MapPin size={11} /> : <Monitor size={11} />}
                                  {v === 'in-person' ? 'Face to face' : 'Online'}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        /* Unavailable — clicking the circle (above) enables; row just shows label */
                        <div className="flex-1 flex items-center" style={{ minHeight: 40 }}>
                          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Unavailable</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Leave / Date Blocking */}
          <div className="rounded-2xl overflow-hidden mt-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <CalendarOff size={15} style={{ color: 'var(--color-text-muted)' }} />
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Leave / Blocked Dates</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Students won't see slots on these dates</p>
              </div>
            </div>

            {/* Add new leave */}
            <div className="px-6 py-4 flex items-end gap-3 flex-wrap" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Date</label>
                <input type="date" value={newLeaveDate} onChange={e => setNewLeaveDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Reason (optional)</label>
                <input type="text" value={newLeaveReason} onChange={e => setNewLeaveReason(e.target.value)}
                  placeholder="e.g. Sick leave, Conference…"
                  className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
              </div>
              <button onClick={addLeave} disabled={leaveSaving || !newLeaveDate}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition hover:opacity-90 flex-shrink-0"
                style={{ background: 'var(--color-primary)' }}>
                {leaveSaving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Block Date
              </button>
            </div>

            {/* Leave list */}
            {leavesLoading ? (
              <div className="px-6 py-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading…</div>
            ) : leaves.length === 0 ? (
              <div className="px-6 py-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>No blocked dates — you're available on all scheduled days.</div>
            ) : (
              <div>
                {leaves.map((l, i) => (
                  <div key={l.id} className="px-6 py-3 flex items-center gap-3"
                    style={{ borderBottom: i < leaves.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {new Date(l.date + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {l.reason && (
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>— {l.reason}</span>
                    )}
                    <button onClick={() => removeLeave(l.id)} className="ml-auto p-1.5 rounded-lg transition"
                      title="Remove block"
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-danger-surface)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <Trash2 size={13} style={{ color: 'var(--color-danger)' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
