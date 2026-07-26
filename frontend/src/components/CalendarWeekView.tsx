'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, Video, User } from 'lucide-react';
import { createPortal } from 'react-dom';

// ─── Time grid constants ──────────────────────────────────────
const START_HOUR = 7;
const END_HOUR   = 20;
const TOTAL_MIN  = (END_HOUR - START_HOUR) * 60;
const PX_PER_MIN = 1.3;
const GRID_H     = TOTAL_MIN * PX_PER_MIN;
const HOUR_H     = 60 * PX_PER_MIN;

const DAYS_SHORT  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_LONG   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Color maps ───────────────────────────────────────────────
const STATUS_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  REQUESTED:                { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  PENDING_APPROVAL:         { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  PENDING_STUDENT_APPROVAL: { bg: '#fef9c3', border: '#eab308', text: '#713f12' },
  CONFIRMED:                { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  APPROVED:                 { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  MATCHED:                  { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  CHECKED_IN:               { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
  EVALUATION:               { bg: '#ede9fe', border: '#8b5cf6', text: '#4c1d95' },
  FOLLOW_UP:                { bg: '#ccfbf1', border: '#14b8a6', text: '#134e4a' },
  RESCHEDULE_REQUESTED:     { bg: '#ffedd5', border: '#f97316', text: '#7c2d12' },
  REFERRAL:                 { bg: '#f3e8ff', border: '#a855f7', text: '#581c87' },
  COMPLETED:                { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' },
  NO_SHOW:                  { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
};

const COUNSELOR_PALETTE = [
  { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
  { bg: '#ede9fe', border: '#8b5cf6', text: '#4c1d95' },
  { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  { bg: '#ccfbf1', border: '#14b8a6', text: '#134e4a' },
  { bg: '#fce7f3', border: '#ec4899', text: '#831843' },
  { bg: '#ffedd5', border: '#f97316', text: '#7c2d12' },
  { bg: '#f0fdf4', border: '#22c55e', text: '#14532d' },
];

// ─── Types ────────────────────────────────────────────────────
export interface CalAppt {
  id: string;
  student_name: string;
  counselor_name: string;
  counselor_id: string;
  counselor_role?: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  purpose: string;
  method: string;
  meeting_link?: string;
  office?: string;
}

export interface PersonalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  note?: string;
  color?: string;
}

interface Props {
  appointments: CalAppt[];
  loading?: boolean;
  colorBy: 'status' | 'counselor';
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  personalEvents?: PersonalEvent[];
  onGridClick?: (date: Date, hour: number, minute: number) => void;
  onDeletePersonalEvent?: (id: string) => void;
}

interface PositionedAppt extends CalAppt {
  col: number;
  totalCols: number;
}

// ─── Helpers ──────────────────────────────────────────────────
function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

function minuteOfDay(dt: Date) {
  return dt.getHours() * 60 + dt.getMinutes();
}

function fmt12(h: number) {
  if (h === 12) return '12 PM';
  if (h === 0)  return '12 AM';
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true });
}

function fmtStatus(s: string) {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function layoutDay(appts: CalAppt[]): PositionedAppt[] {
  const sorted = [...appts].sort(
    (a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
  );
  const cols: number[] = [];
  const placed = sorted.map(apt => {
    const start = new Date(apt.scheduled_start).getTime();
    const end   = new Date(apt.scheduled_end).getTime();
    let col = cols.findIndex(endMs => endMs <= start);
    if (col === -1) col = cols.length;
    cols[col] = end;
    return { ...apt, col, totalCols: 0 };
  });
  const totalCols = Math.max(cols.length, 1);
  return placed.map(p => ({ ...p, totalCols }));
}

function calcTop(isoStart: string) {
  const min = minuteOfDay(new Date(isoStart));
  return Math.max(0, (min - START_HOUR * 60) * PX_PER_MIN);
}

function calcHeight(isoStart: string, isoEnd: string) {
  const dur = (new Date(isoEnd).getTime() - new Date(isoStart).getTime()) / 60000;
  return Math.max(20, dur * PX_PER_MIN);
}

// ─── Detail popover ───────────────────────────────────────────
function DetailPopover({ appt, onClose, colorBy, counselorColor }: {
  appt: CalAppt;
  onClose: () => void;
  colorBy: 'status' | 'counselor';
  counselorColor?: { bg: string; border: string; text: string };
}) {
  const color = colorBy === 'counselor' && counselorColor
    ? counselorColor
    : (STATUS_COLOR[appt.status] ?? { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' });
  const isOnline = /online|zoom|teams/i.test(appt.method ?? '');

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
        style={{ background: 'var(--color-surface)', border: `1.5px solid ${color.border}` }}
        onClick={e => e.stopPropagation()}>
        <div className="h-1.5" style={{ background: color.border }} />
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                {appt.student_name}
              </p>
              <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
                style={{ background: color.bg, color: color.text }}>
                {fmtStatus(appt.status)}
              </span>
            </div>
            <button onClick={onClose}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-lg leading-none"
              style={{ color: 'var(--color-text-muted)' }}>
              ×
            </button>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">
          <DRow icon={<Clock size={13} />} label="Time">
            {fmtTime(appt.scheduled_start)} – {fmtTime(appt.scheduled_end)}
          </DRow>
          <DRow icon={<User size={13} />} label="Counselor">
            {appt.counselor_name}
            {appt.counselor_role && (
              <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>
                {appt.counselor_role}
              </span>
            )}
          </DRow>
          {isOnline && appt.meeting_link ? (
            <DRow icon={<Video size={13} />} label="Link">
              <a href={appt.meeting_link} target="_blank" rel="noreferrer"
                className="underline" style={{ color: 'var(--color-primary)' }}>
                Join session
              </a>
            </DRow>
          ) : appt.office ? (
            <DRow icon={<MapPin size={13} />} label="Office">{appt.office}</DRow>
          ) : null}
          {appt.purpose && (
            <DRow icon={null} label="Purpose">
              {appt.purpose === 'intake_interview' ? 'Intake Interview' : 'Counseling'}
            </DRow>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function DRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-xs uppercase tracking-wide font-semibold block"
          style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{children}</span>
      </div>
    </div>
  );
}

// ─── Single appointment column ────────────────────────────────
function ApptColumn({
  laid, isToday, ctTop, getColor, colorBy, dayView, onSelect,
  day, personalEvents, onGridClick, onDeletePersonalEvent,
}: {
  laid: PositionedAppt[];
  isToday: boolean;
  ctTop: number;
  getColor: (apt: CalAppt) => { bg: string; border: string; text: string };
  colorBy: 'status' | 'counselor';
  dayView: boolean;
  onSelect: (apt: CalAppt) => void;
  day: Date;
  personalEvents: PersonalEvent[];
  onGridClick?: (date: Date, hour: number, minute: number) => void;
  onDeletePersonalEvent?: (id: string) => void;
}) {
  const hoursList = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onGridClick) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top + e.currentTarget.scrollTop;
    const totalMin = START_HOUR * 60 + Math.floor(y / PX_PER_MIN);
    const hour = Math.min(Math.floor(totalMin / 60), END_HOUR - 1);
    const minute = Math.round((totalMin % 60) / 15) * 15 % 60;
    onGridClick(day, hour, minute);
  }

  return (
    <div className="border-l relative" style={{ borderColor: 'var(--color-border)', height: GRID_H, cursor: onGridClick ? 'crosshair' : 'default' }}
      onClick={handleColumnClick}>
      {hoursList.map(h => (
        <div key={h}
          style={{ position: 'absolute', top: (h - START_HOUR) * HOUR_H, left: 0, right: 0, height: 1, background: 'var(--color-border)', opacity: 0.6 }} />
      ))}
      {hoursList.map(h => (
        <div key={`hh${h}`}
          style={{ position: 'absolute', top: (h - START_HOUR) * HOUR_H + HOUR_H / 2, left: 0, right: 0, height: 1, background: 'var(--color-border)', opacity: 0.22 }} />
      ))}
      {isToday && (
        <div style={{ position: 'absolute', inset: 0, background: 'var(--color-primary)', opacity: 0.03, pointerEvents: 'none' }} />
      )}
      {isToday && ctTop >= 0 && ctTop <= GRID_H && (
        <>
          <div style={{ position: 'absolute', top: ctTop, left: 0, right: 0, height: 2, background: '#ef4444', zIndex: 5, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: ctTop - 4, left: -4, width: 10, height: 10, borderRadius: '50%', background: '#ef4444', zIndex: 5, pointerEvents: 'none' }} />
        </>
      )}
      {laid.map(apt => {
        if (!apt.scheduled_start || !apt.scheduled_end) return null;
        const color  = getColor(apt);
        const top    = calcTop(apt.scheduled_start);
        const height = calcHeight(apt.scheduled_start, apt.scheduled_end);
        const colW   = 1 / apt.totalCols;
        return (
          <button key={apt.id} onClick={() => onSelect(apt)}
            style={{
              position: 'absolute', top, height,
              left:  `calc(${apt.col * colW * 100}% + 2px)`,
              width: `calc(${colW * 100}% - 4px)`,
              background: color.bg,
              borderLeft: `3px solid ${color.border}`,
              borderRadius: 4,
              overflow: 'hidden',
              cursor: 'pointer',
              zIndex: 2,
              textAlign: 'left',
              padding: dayView ? '4px 8px' : '2px 4px',
              transition: 'filter 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.93)')}
            onMouseLeave={e => (e.currentTarget.style.filter = 'none')}>
            <p className="font-bold leading-tight truncate"
              style={{ color: color.text, fontSize: dayView ? 12 : 10 }}>
              {apt.student_name}
            </p>
            {height >= 32 && (
              <p className="leading-tight truncate mt-0.5"
                style={{ color: color.border, fontSize: dayView ? 11 : 9 }}>
                {fmtTime(apt.scheduled_start)}
                {dayView && ` – ${fmtTime(apt.scheduled_end)}`}
              </p>
            )}
            {height >= 44 && colorBy === 'counselor' && apt.counselor_name && (
              <p className="leading-tight truncate mt-0.5"
                style={{ color: color.text, opacity: 0.75, fontSize: dayView ? 10 : 9 }}>
                {apt.counselor_name}
              </p>
            )}
            {height >= 56 && colorBy === 'counselor' && apt.counselor_role && (
              <p className="leading-tight truncate mt-0.5"
                style={{ color: color.border, fontSize: 8, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', opacity: 0.85 }}>
                {apt.counselor_role === 'PSYCHOLOGIST' ? 'Psychologist' : 'Counselor'}
              </p>
            )}
            {dayView && height >= 72 && (
              <p className="leading-tight truncate mt-0.5"
                style={{ color: color.text, opacity: 0.6, fontSize: 10 }}>
                {apt.purpose === 'intake_interview' ? 'Intake' : 'Counseling'} · {/online|zoom/i.test(apt.method) ? 'Online' : 'In-Person'}
              </p>
            )}
          </button>
        );
      })}

      {/* Personal events */}
      {personalEvents.map(ev => {
        if (!ev.start || !ev.end) return null;
        const top    = calcTop(ev.start);
        const height = calcHeight(ev.start, ev.end);
        const hex    = ev.color || '#64748b';
        const bgHex  = hex + '22';
        return (
          <div key={ev.id}
            style={{
              position: 'absolute', top, height,
              left: 2, right: 2,
              background: bgHex,
              border: `1.5px dashed ${hex}`,
              borderRadius: 4,
              overflow: 'hidden',
              zIndex: 1,
              padding: dayView ? '3px 6px' : '2px 4px',
            }}>
            <p className="font-semibold leading-tight truncate"
              style={{ color: hex, fontSize: dayView ? 11 : 9 }}>
              {ev.title}
            </p>
            {height >= 28 && (
              <p className="leading-tight truncate"
                style={{ color: hex, opacity: 0.75, fontSize: 9 }}>
                {fmtTime(ev.start)}{dayView ? ` – ${fmtTime(ev.end)}` : ''}
              </p>
            )}
            {onDeletePersonalEvent && (
              <button
                onClick={e => { e.stopPropagation(); onDeletePersonalEvent(ev.id); }}
                style={{
                  position: 'absolute', top: 2, right: 2,
                  width: 14, height: 14, borderRadius: '50%',
                  background: hex, color: 'white',
                  fontSize: 9, lineHeight: '14px', textAlign: 'center',
                  cursor: 'pointer', border: 'none', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────
function Legend({ colorBy, counselorColorMap, appointments }: {
  colorBy: 'status' | 'counselor';
  counselorColorMap: Record<string, { bg: string; border: string; text: string }>;
  appointments: CalAppt[];
}) {
  if (colorBy === 'status') {
    const pairs: [string, string][] = [
      ['CONFIRMED', 'Confirmed'],
      ['REQUESTED', 'Pending'],
      ['EVALUATION', 'Evaluation'],
      ['FOLLOW_UP', 'Follow-Up'],
      ['RESCHEDULE_REQUESTED', 'Reschedule req.'],
      ['COMPLETED', 'Completed'],
    ];
    return (
      <div className="px-4 py-2 border-t flex flex-wrap gap-x-4 gap-y-1.5" style={{ borderColor: 'var(--color-border)' }}>
        {pairs.map(([key, label]) => {
          const c = STATUS_COLOR[key];
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: c.border }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div className="px-4 py-2 border-t flex flex-wrap gap-x-4 gap-y-1.5" style={{ borderColor: 'var(--color-border)' }}>
      {Object.entries(counselorColorMap).map(([id, c]) => {
        const name = appointments.find(a => a.counselor_id === id)?.counselor_name ?? id;
        return (
          <div key={id} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: c.border }} />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{name}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────
export default function CalendarWeekView({
  appointments,
  loading,
  colorBy,
  weekStart,
  onPrevWeek,
  onNextWeek,
  onToday,
  personalEvents = [],
  onGridClick,
  onDeletePersonalEvent,
}: Props) {
  const [view, setView]               = useState<'week' | 'day'>('week');
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  });
  const [selected, setSelected] = useState<CalAppt | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const now = new Date();

  const counselorColorMap = useMemo(() => {
    const ids = [...new Set(appointments.map(a => a.counselor_id).filter(Boolean))];
    return Object.fromEntries(ids.map((id, i) => [id, COUNSELOR_PALETTE[i % COUNSELOR_PALETTE.length]]));
  }, [appointments]);

  const hours = useMemo(() => Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i), []);
  const days  = useMemo(() => getWeekDays(weekStart), [weekStart]);

  // Keep selectedDay within the current week when week changes
  useEffect(() => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    if (selectedDay < weekStart || selectedDay >= weekEnd) {
      setSelectedDay(new Date(weekStart));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  // Scroll to 8 AM on view/week change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, (8 - START_HOUR) * HOUR_H - 24);
    }
  }, [weekStart, view, selectedDay]);

  const apptsByDay = useMemo(() => {
    const map = new Map<string, CalAppt[]>();
    days.forEach(d => map.set(d.toDateString(), []));
    if (!map.has(selectedDay.toDateString())) map.set(selectedDay.toDateString(), []);
    appointments.forEach(apt => {
      if (!apt.scheduled_start) return;
      const key = new Date(apt.scheduled_start).toDateString();
      if (map.has(key)) map.get(key)!.push(apt);
    });
    return map;
  }, [appointments, days, selectedDay]);

  const personalByDay = useMemo(() => {
    const map = new Map<string, PersonalEvent[]>();
    days.forEach(d => map.set(d.toDateString(), []));
    if (!map.has(selectedDay.toDateString())) map.set(selectedDay.toDateString(), []);
    personalEvents.forEach(ev => {
      if (!ev.start) return;
      const key = new Date(ev.start).toDateString();
      if (map.has(key)) map.get(key)!.push(ev);
    });
    return map;
  }, [personalEvents, days, selectedDay]);

  const layoutByDay = useMemo(() => {
    const map = new Map<string, PositionedAppt[]>();
    apptsByDay.forEach((apts, key) => map.set(key, layoutDay(apts)));
    return map;
  }, [apptsByDay]);

  function getColor(apt: CalAppt) {
    if (colorBy === 'counselor') return counselorColorMap[apt.counselor_id] ?? COUNSELOR_PALETTE[0];
    return STATUS_COLOR[apt.status] ?? { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' };
  }

  function handlePrev() {
    if (view === 'week') {
      onPrevWeek();
    } else {
      const newDay = new Date(selectedDay);
      newDay.setDate(newDay.getDate() - 1);
      setSelectedDay(newDay);
      if (newDay < weekStart) onPrevWeek();
    }
  }

  function handleNext() {
    if (view === 'week') {
      onNextWeek();
    } else {
      const newDay = new Date(selectedDay);
      newDay.setDate(newDay.getDate() + 1);
      setSelectedDay(newDay);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      if (newDay >= weekEnd) onNextWeek();
    }
  }

  function handleToday() {
    onToday();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    setSelectedDay(today);
  }

  function handleSelectDay(d: Date) {
    const nd = new Date(d); nd.setHours(0, 0, 0, 0);
    setSelectedDay(nd);
    setView('day');
  }

  // Toolbar label
  const weekLabel = (() => {
    const s = days[0], e = days[6];
    if (s.getMonth() === e.getMonth())
      return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`;
    return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
  })();
  const dayLabel = `${DAYS_LONG[selectedDay.getDay()]}, ${MONTHS[selectedDay.getMonth()]} ${selectedDay.getDate()}, ${selectedDay.getFullYear()}`;

  const thisWeekStart = (() => {
    const d = new Date(now);
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); // go to Monday
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const isThisWeek = isSameDay(days[0], thisWeekStart);
  const isToday    = isSameDay(selectedDay, now);
  const showToday  = view === 'week' ? !isThisWeek : !isToday;

  const viewCount = view === 'week'
    ? appointments.length
    : (apptsByDay.get(selectedDay.toDateString()) ?? []).length;

  const ctTop = (minuteOfDay(now) - START_HOUR * 60) * PX_PER_MIN;

  // In day view, the time grid shows 1 column; week view shows 7
  const gridCols    = view === 'day' ? 1 : 7;
  const visibleCols = view === 'day' ? [selectedDay] : days;

  return (
    <div className="rounded-2xl overflow-hidden border"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <button onClick={handlePrev}
            className="w-7 h-7 flex items-center justify-center rounded-lg"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)', minWidth: 220 }}>
            {view === 'week' ? weekLabel : dayLabel}
          </span>
          <button onClick={handleNext}
            className="w-7 h-7 flex items-center justify-center rounded-lg"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <ChevronRight size={15} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {loading ? 'Loading…' : `${viewCount} session${viewCount !== 1 ? 's' : ''}`}
          </span>
          {showToday && (
            <button onClick={handleToday}
              className="px-3 py-1 text-xs font-semibold rounded-lg"
              style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary-text)' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              Today
            </button>
          )}
          {/* Day / Week toggle */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
            {(['day', 'week'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className="px-3 py-1 text-xs font-semibold capitalize"
                style={view === v
                  ? { background: 'var(--color-primary)', color: 'white' }
                  : { background: 'transparent', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => { if (view !== v) e.currentTarget.style.background = 'var(--color-bg)'; }}
                onMouseLeave={e => { if (view !== v) e.currentTarget.style.background = 'transparent'; }}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Day header (always 7 days; click any day to switch to day view) ── */}
      <div className="grid select-none border-b"
        style={{ gridTemplateColumns: '52px repeat(7, 1fr)', borderColor: 'var(--color-border)' }}>
        <div />
        {days.map((day, i) => {
          const isDayToday = isSameDay(day, now);
          const isSelected = view === 'day' && isSameDay(day, selectedDay);
          return (
            <button key={i}
              onClick={() => handleSelectDay(day)}
              className="text-center py-2 border-l"
              style={{
                borderColor: 'var(--color-border)',
                background: isSelected ? 'var(--color-primary-surface)' : 'transparent',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = isSelected ? 'var(--color-primary-surface)' : 'var(--color-bg)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'var(--color-primary-surface)' : 'transparent'; }}>
              <p className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: isDayToday ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                {DAYS_SHORT[day.getDay()]}
              </p>
              <p style={{
                color: isDayToday ? 'white' : isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)',
                background: isDayToday ? 'var(--color-primary)' : 'transparent',
                borderRadius: '50%',
                width: 28, height: 28,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14,
                fontWeight: (isDayToday || isSelected) ? 700 : 600,
                margin: '2px auto 0',
              }}>
                {day.getDate()}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── Scrollable time grid ── */}
      <div ref={scrollRef} style={{ height: 580, overflowY: 'auto', overflowX: 'hidden' }}>
        <div className="grid" style={{ gridTemplateColumns: `52px repeat(${gridCols}, 1fr)`, height: GRID_H }}>
          {/* Time labels */}
          <div className="relative select-none">
            {hours.map(h => (
              <div key={h} style={{ position: 'absolute', top: (h - START_HOUR) * HOUR_H - 7, right: 6, lineHeight: 1 }}>
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  {fmt12(h)}
                </span>
              </div>
            ))}
          </div>

          {/* Columns: 7 in week view, 1 in day view */}
          {visibleCols.map((day, di) => (
            <ApptColumn
              key={di}
              laid={layoutByDay.get(day.toDateString()) ?? []}
              isToday={isSameDay(day, now)}
              ctTop={ctTop}
              getColor={getColor}
              colorBy={colorBy}
              dayView={view === 'day'}
              onSelect={setSelected}
              day={day}
              personalEvents={personalByDay.get(day.toDateString()) ?? []}
              onGridClick={onGridClick}
              onDeletePersonalEvent={onDeletePersonalEvent}
            />
          ))}
        </div>
      </div>

      {/* ── Legend ── */}
      <Legend colorBy={colorBy} counselorColorMap={counselorColorMap} appointments={appointments} />

      {/* ── Detail popover ── */}
      {selected && (
        <DetailPopover
          appt={selected}
          onClose={() => setSelected(null)}
          colorBy={colorBy}
          counselorColor={counselorColorMap[selected.counselor_id]}
        />
      )}
    </div>
  );
}
