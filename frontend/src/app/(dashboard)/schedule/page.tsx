'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
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

const GRID_DAYS = [
  { label: 'Mon', dow: 0 },
  { label: 'Tue', dow: 1 },
  { label: 'Wed', dow: 2 },
  { label: 'Thu', dow: 3 },
  { label: 'Fri', dow: 4 },
  { label: 'Sat', dow: 5 },
];

const GRID_HOURS: string[] = [];
for (let h = 7; h < 20; h++) {
  GRID_HOURS.push(`${String(h).padStart(2, '0')}:00`);
}

function fmt12(t: string) {
  const [h] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12} ${ampm}`;
}

function cellKey(dow: number, time: string) { return `${dow}-${time}`; }

function nextHour(time: string): string {
  const h = parseInt(time.split(':')[0]) + 1;
  return `${String(h).padStart(2, '0')}:00`;
}

function scheduleToState(schedule: any[]): { cells: Set<string>; methods: Record<number, 'in-person' | 'online'> } {
  const cells = new Set<string>();
  const methods: Record<number, 'in-person' | 'online'> = {};
  for (const entry of schedule) {
    const dow = entry.day_of_week;
    if (entry.session_method) methods[dow] = entry.session_method;
    const sh = parseInt(entry.start_time.split(':')[0]);
    const eh = parseInt(entry.end_time.split(':')[0]);
    for (let h = sh; h < eh; h++) {
      cells.add(cellKey(dow, `${String(h).padStart(2, '0')}:00`));
    }
  }
  return { cells, methods };
}

function cellsToSchedule(cells: Set<string>, methods: Record<number, 'in-person' | 'online'>): any[] {
  const result: any[] = [];
  for (const dow of [0, 1, 2, 3, 4, 5]) {
    const method = methods[dow] ?? 'in-person';
    const indices = GRID_HOURS
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => cells.has(cellKey(dow, h)))
      .map(({ i }) => i);
    if (!indices.length) continue;
    let start = indices[0], prev = indices[0];
    for (let k = 1; k <= indices.length; k++) {
      if (k < indices.length && indices[k] === prev + 1) {
        prev = indices[k];
      } else {
        result.push({ day_of_week: dow, start_time: GRID_HOURS[start], end_time: nextHour(GRID_HOURS[prev]), session_method: method });
        if (k < indices.length) { start = indices[k]; prev = indices[k]; }
      }
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
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [dayMethods, setDayMethods]       = useState<Record<number, 'in-person' | 'online'>>({});
  const [availLoading, setAvailLoading]   = useState(false);
  const [availSaving, setAvailSaving]     = useState(false);
  const [availLoaded, setAvailLoaded]     = useState(false);
  const [toast, setToast]                 = useState<{ msg: string; ok: boolean } | null>(null);
  // Drag-to-select state
  const [dragVersion, setDragVersion]     = useState(0);
  const isDragging   = useRef(false);
  const dragAnchor   = useRef<{ dow: number; ti: number } | null>(null);
  const dragCurrent  = useRef<{ dow: number; ti: number } | null>(null);
  const dragAction   = useRef<'add' | 'remove'>('add');

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
        if (data.schedule?.length) {
          const { cells, methods } = scheduleToState(data.schedule);
          setSelectedCells(cells);
          setDayMethods(methods);
        }
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
    const schedule = cellsToSchedule(selectedCells, dayMethods);
    try {
      const r = await fetch(api('/api/availability/weekly'), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule, session_method: 'in-person' }),
      });
      const d = await r.json();
      if (r.ok) showToast(`Saved — ${schedule.length} block${schedule.length !== 1 ? 's' : ''} across ${activeDays} day${activeDays !== 1 ? 's' : ''}`, true);
      else showToast(d.error ?? 'Failed to save', false);
    } catch {
      showToast('Network error', false);
    } finally {
      setAvailSaving(false);
    }
  };

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

  // ── Drag helpers ──
  function inDragRect(dow: number, ti: number): boolean {
    if (!isDragging.current || !dragAnchor.current || !dragCurrent.current) return false;
    const { dow: aDow, ti: aTi } = dragAnchor.current;
    const { dow: cDow, ti: cTi } = dragCurrent.current;
    return dow >= Math.min(aDow, cDow) && dow <= Math.max(aDow, cDow)
        && ti  >= Math.min(aTi, cTi)  && ti  <= Math.max(aTi, cTi);
  }

  // Commit drag selection on mouseup anywhere
  useEffect(() => {
    function onUp() {
      if (!isDragging.current) return;
      const anchor = dragAnchor.current;
      const current = dragCurrent.current;
      if (anchor && current) {
        const minDow = Math.min(anchor.dow, current.dow);
        const maxDow = Math.max(anchor.dow, current.dow);
        const minTi  = Math.min(anchor.ti,  current.ti);
        const maxTi  = Math.max(anchor.ti,  current.ti);
        const action = dragAction.current;
        setSelectedCells(prev => {
          const next = new Set(prev);
          for (let d = minDow; d <= maxDow; d++) {
            for (let t = minTi; t <= maxTi; t++) {
              const key = cellKey(d, GRID_HOURS[t]);
              if (action === 'add') next.add(key); else next.delete(key);
            }
          }
          return next;
        });
      }
      isDragging.current = false;
      dragAnchor.current = null;
      dragCurrent.current = null;
      setDragVersion(v => v + 1);
    }
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived ──
  const upperRole = role.toUpperCase();
  const isStaff   = ['STAFF', 'ADMIN', 'DPO'].includes(upperRole);
  const hasAvail  = AVAIL_ROLES.includes(upperRole);

  const calTitle    = isStaff ? 'CPS Calendar' : 'My Schedule';
  const calSubtitle = isStaff ? 'All counselor appointments across the CPS this week' : 'Your upcoming sessions for the week';
  const pageTitle   = hasAvail ? 'Schedule & Availability' : calTitle;
  const pageSubtitle = hasAvail ? 'View your calendar and manage your booking availability' : calSubtitle;

  const activeDays = GRID_DAYS.filter(({ dow }) => GRID_HOURS.some(h => selectedCells.has(cellKey(dow, h)))).length;
  const totalSlots = selectedCells.size;
  // dragVersion read to trigger re-render during drag; suppress unused lint
  void dragVersion;

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
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Weekly Availability</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {activeDays} day{activeDays !== 1 ? 's' : ''} · {totalSlots} hour{totalSlots !== 1 ? 's' : ''} per week
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <span className="w-3 h-3 rounded" style={{ background: 'var(--color-primary)', opacity: 0.8 }} />
                  Available
                </span>
                <button onClick={saveAvail} disabled={availSaving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition hover:opacity-90"
                  style={{ background: 'var(--color-primary)' }}>
                  {availSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {availSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            {/* Grid */}
            {availLoading ? (
              <div className="p-10 flex items-center justify-center gap-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
              </div>
            ) : (
              <div className="overflow-x-auto px-4 pt-4 pb-3"
                style={{ WebkitUserSelect: 'none', userSelect: 'none', cursor: 'default' }}>
                <div style={{ minWidth: 360 }}>

                  {/* Column headers — day names + F2F/Online toggle */}
                  <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(6, 1fr)', gap: 3, marginBottom: 6 }}>
                    <div /> {/* time label column spacer */}
                    {GRID_DAYS.map(({ label, dow }) => (
                      <div key={dow} className="text-center">
                        <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
                        <div className="flex gap-0.5 justify-center">
                          {(['in-person', 'online'] as const).map(v => {
                            const active = (dayMethods[dow] ?? 'in-person') === v;
                            return (
                              <button key={v}
                                onMouseDown={e => e.stopPropagation()}
                                onClick={() => setDayMethods(m => ({ ...m, [dow]: v }))}
                                title={v === 'in-person' ? 'Face to Face' : 'Online'}
                                className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-semibold transition-all"
                                style={active
                                  ? { background: 'var(--color-primary)', color: '#fff' }
                                  : { background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                                {v === 'in-person' ? <MapPin size={8} /> : <Monitor size={8} />}
                                {v === 'in-person' ? 'F2F' : 'Net'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Time rows */}
                  {GRID_HOURS.map((time, ti) => (
                    <div key={time} style={{ display: 'grid', gridTemplateColumns: '48px repeat(6, 1fr)', gap: 3, marginBottom: 3 }}>
                      {/* Time label */}
                      <div className="flex items-center justify-end pr-2.5 flex-shrink-0">
                        <span className="text-[10px] font-medium tabular-nums leading-none" style={{ color: 'var(--color-text-muted)' }}>
                          {fmt12(time)}
                        </span>
                      </div>
                      {/* Day cells */}
                      {GRID_DAYS.map(({ dow }) => {
                        const key = cellKey(dow, time);
                        const isSelected = selectedCells.has(key);
                        const inDrag = inDragRect(dow, ti);
                        const adding = dragAction.current === 'add';
                        const willAdd = inDrag && adding;
                        const willRemove = inDrag && !adding;
                        const active = (isSelected && !willRemove) || (willAdd && !isSelected);
                        const preview = willRemove && isSelected;

                        return (
                          <div key={dow}
                            className="rounded transition-colors"
                            style={{
                              height: 26,
                              cursor: 'pointer',
                              background: active
                                ? 'var(--color-primary)'
                                : preview
                                ? 'var(--color-danger-surface)'
                                : isSelected
                                ? 'var(--color-primary)'
                                : 'var(--color-bg)',
                              border: (active || isSelected) && !preview
                                ? 'none'
                                : preview
                                ? '1px solid var(--color-danger)'
                                : '1px solid var(--color-border)',
                              opacity: (active || (isSelected && !preview)) ? 0.82 : 1,
                            }}
                            onMouseDown={e => {
                              e.preventDefault();
                              isDragging.current = true;
                              dragAnchor.current = { dow, ti };
                              dragCurrent.current = { dow, ti };
                              dragAction.current = !isSelected ? 'add' : 'remove';
                              setDragVersion(v => v + 1);
                            }}
                            onMouseEnter={() => {
                              if (!isDragging.current) return;
                              dragCurrent.current = { dow, ti };
                              setDragVersion(v => v + 1);
                            }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-5 py-2.5" style={{ background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Click or drag to mark available hours. Each cell = 1 hour. You can leave gaps (e.g. skip lunch). Confirmed appointments are automatically blocked.
              </p>
            </div>
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
