'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { ClinicalExportModal } from '@/components/ClinicalExportModal';
import {
  Loader2, AlertCircle, RefreshCw, Search, CheckCircle2,
  ClipboardList, CalendarDays, FileCheck, PenLine, Clock,
  FileText, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, UserCheck,
} from 'lucide-react';

interface IntakeAppointment {
  appointment_id: string;
  student_name: string;
  student_email: string;
  purpose: string;
  status: string;
  preferred_date?: string;
  preferred_time?: string;
  counselor_id?: string;
  concern?: string;
}

interface IntakeRecord {
  _id: string;
  appointment_id?: string;
  client_name: string;
  client_id_number: string;
  college_unit: string;
  program: string;
  service_requested: string;
  status: string;
  created_date: string;
  intake_packet_submitted?: boolean;
  case_id?: string;
  is_minor?: boolean;
  referred_to_name?: string;
  referred_to_role?: string;
}

type StageKey = 'awaiting' | 'scheduled' | 'write' | 'done';

const STAGES: {
  key: StageKey;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  accent: string;
  emptyMsg: string;
}[] = [
  {
    key: 'awaiting', label: 'Awaiting Confirmation', sublabel: "Confirm the student's slot",
    icon: Clock, accent: 'var(--color-warning)',
    emptyMsg: 'No pending confirmations — all intake slots are confirmed.',
  },
  {
    key: 'scheduled', label: 'Session Scheduled', sublabel: 'Conduct the intake interview',
    icon: CalendarDays, accent: 'var(--color-primary)',
    emptyMsg: 'No sessions scheduled yet. Confirmed intakes will appear here.',
  },
  {
    key: 'write', label: 'Complete IC Report', sublabel: 'Write clinical notes & endorsement',
    icon: PenLine, accent: '#7C3AED',
    emptyMsg: 'No reports pending. Conducted intakes waiting for clinical documentation will appear here.',
  },
  {
    key: 'done', label: 'Completed', sublabel: 'View completed intake records',
    icon: CheckCircle2, accent: 'var(--color-success)',
    emptyMsg: 'No completed intakes yet.',
  },
];

const SERVICE_LABELS: Record<string, string> = {
  personal_counseling:   'Personal Counseling',
  career_counseling:     'Career Counseling',
  group_counseling:      'Group Counseling',
  psychological_testing: 'Psychological Testing',
  consultation:          'Consultation',
};

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return d; }
}

function fmtTime(t?: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return ` · ${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtService(v?: string) {
  if (!v) return '—';
  return SERVICE_LABELS[v] ?? v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function AwaitingCard({ apt, onConfirm, confirming, msg }: {
  apt: IntakeAppointment;
  onConfirm: () => void;
  confirming: boolean;
  msg: { type: 'ok' | 'err'; text: string } | null;
}) {
  const hasTime      = !!apt.preferred_time;
  const hasAssigned  = !!apt.counselor_id;
  const canConfirm   = hasTime;
  const isClaim      = hasTime && !hasAssigned;
  return (
    <div className="rounded-xl border p-4 flex items-start justify-between gap-4"
      style={{ background: 'var(--color-warning-surface)', borderColor: 'var(--color-warning)' }}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{apt.student_name}</p>
          {isClaim && (
            <span className="flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--color-warning)', color: 'white' }}>
              Unassigned
            </span>
          )}
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{apt.student_email}</p>
        {apt.preferred_date && (
          <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
            <CalendarDays size={11} />
            Requested: {fmtDate(apt.preferred_date)}{fmtTime(apt.preferred_time)}
          </p>
        )}
        {msg && (
          <p className="text-xs mt-1.5 font-medium" style={{ color: msg.type === 'ok' ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {msg.text}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">
        {canConfirm ? (
          <button onClick={onConfirm} disabled={confirming || !!msg}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg disabled:opacity-50 transition hover:opacity-90 whitespace-nowrap"
            style={{ background: isClaim ? 'var(--color-warning)' : 'var(--color-primary)' }}>
            {confirming ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
            {isClaim ? 'Claim & Confirm' : 'Confirm Slot'}
          </button>
        ) : (
          <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--color-warning)' }}>No slot selected</span>
        )}
      </div>
    </div>
  );
}

function ScheduledCard({ apt }: { apt: IntakeAppointment }) {
  return (
    <div className="rounded-xl border p-4 flex items-start justify-between gap-4"
      style={{ background: 'var(--color-primary-surface)', borderColor: 'var(--color-primary)' }}>
      <div className="min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{apt.student_name}</p>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{apt.student_email}</p>
        {apt.preferred_date && (
          <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
            <CalendarDays size={11} />
            {fmtDate(apt.preferred_date)}{fmtTime(apt.preferred_time)}
          </p>
        )}
      </div>
      <Link href={`/ic/intake/conduct/${apt.appointment_id}`} className="flex-shrink-0">
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition hover:opacity-90 whitespace-nowrap"
          style={{ background: 'var(--color-primary)' }}>
          <ClipboardList size={11} /> Start Intake
        </button>
      </Link>
    </div>
  );
}

function WriteCard({ intake, onExport }: { intake: IntakeRecord; onExport: () => void }) {
  return (
    <div className="rounded-xl border p-4 flex items-start justify-between gap-4"
      style={{ background: 'rgba(124,58,237,0.06)', borderColor: 'rgba(124,58,237,0.25)' }}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{intake.client_name}</p>
          {intake.is_minor && <span className="flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: 'var(--color-warning-text)', border: '1px solid #FDE68A' }}>Minor</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {intake.client_id_number && <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{intake.client_id_number}</span>}
          {intake.college_unit && <span className="text-xs truncate max-w-[140px]" style={{ color: 'var(--color-text-muted)' }}>{intake.college_unit}</span>}
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{fmtService(intake.service_requested)}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Intake date: {fmtDate(intake.created_date)}</p>
        {intake.intake_packet_submitted ? (
          <span className="inline-flex items-center gap-1 mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium border"
            style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)', borderColor: 'var(--color-success)' }}>
            <FileCheck size={10} /> Student packet ready
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium border"
            style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}>
            Packet pending
          </span>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <Link href={`/cases/${intake.case_id}?tab=intake-summary`}>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition hover:opacity-90 whitespace-nowrap"
            style={{ background: '#7C3AED' }}>
            <PenLine size={11} /> Complete Report
          </button>
        </Link>
        {intake.intake_packet_submitted && (
          <button onClick={onExport}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition whitespace-nowrap"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.6)'; e.currentTarget.style.color = '#7C3AED'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
            <FileText size={11} /> Export
          </button>
        )}
      </div>
    </div>
  );
}

function DoneCard({ intake, onExport }: { intake: IntakeRecord; onExport: () => void }) {
  return (
    <div className="rounded-xl border p-4 flex items-start justify-between gap-4"
      style={{ background: 'var(--color-success-surface)', borderColor: 'var(--color-success)' }}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{intake.client_name}</p>
          {intake.is_minor && <span className="flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: 'var(--color-warning-text)', border: '1px solid #FDE68A' }}>Minor</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {intake.client_id_number && <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{intake.client_id_number}</span>}
          {intake.college_unit && <span className="text-xs truncate max-w-[140px]" style={{ color: 'var(--color-text-muted)' }}>{intake.college_unit}</span>}
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{fmtService(intake.service_requested)}</p>
        {intake.referred_to_name && (
          <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
            <UserCheck size={10} />
            Referred to: {intake.referred_to_name}
            {intake.referred_to_role && (
              <span style={{ color: 'var(--color-text-muted)' }}>
                ({intake.referred_to_role === 'COUNSELOR' ? 'Counselor' : intake.referred_to_role === 'PSYCHOLOGIST' ? 'Psychologist' : intake.referred_to_role})
              </span>
            )}
          </p>
        )}
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Completed: {fmtDate(intake.created_date)}</p>
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <Link href={`/cases/${intake.case_id}?tab=intake-summary`}>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition border hover:opacity-90 whitespace-nowrap"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-success)', color: 'var(--color-success)' }}>
            <FileCheck size={11} /> View Summary
          </button>
        </Link>
        <button onClick={onExport}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition whitespace-nowrap"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-success)'; e.currentTarget.style.color = 'var(--color-success)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
          <FileText size={11} /> Export
        </button>
      </div>
    </div>
  );
}

// ─── Mini schedule helpers ───────────────────────────────────────────────────

interface SchedAppt {
  id: string;
  student_name: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

const SCHED_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function fmtApptTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function MiniSchedulePanel({ requestedDates }: { requestedDates: string[] }) {
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()));
  const [appts, setAppts]         = useState<SchedAppt[]>([]);
  const [loading, setLoading]     = useState(false);
  const [open, setOpen]           = useState(true);

  const fetchWeek = useCallback(async (start: Date) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    try {
      const from = start.toISOString();
      const end  = new Date(start); end.setDate(end.getDate() + 7);
      const r = await fetch(
        api(`/api/appointments/dashboard/calendar?from=${from}&to=${end.toISOString()}`),
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (r.ok) { const d = await r.json(); setAppts(d.appointments ?? []); }
      else setAppts([]);
    } catch { setAppts([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWeek(weekStart); }, [weekStart, fetchWeek]);

  function prevWeek() { setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; }); }
  function nextWeek() { setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; }); }

  // Dates (YYYY-MM-DD local) that students in awaiting list have requested, limited to this week
  const wEnd = new Date(weekStart); wEnd.setDate(wEnd.getDate() + 7);
  const requestedSet = new Set<string>();
  requestedDates.forEach(iso => {
    if (!iso) return;
    const d = new Date(iso);
    if (d >= weekStart && d < wEnd) {
      requestedSet.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    }
  });

  // Group appointments by day index 0-6 (Mon=0)
  const byDay: SchedAppt[][] = Array.from({ length: 7 }, () => []);
  appts.forEach(a => {
    const d    = new Date(a.scheduled_start);
    const diff = Math.floor((d.getTime() - weekStart.getTime()) / 86400000);
    if (diff >= 0 && diff < 7) byDay[diff].push(a);
  });

  const endDate    = new Date(weekStart); endDate.setDate(endDate.getDate() + 6);
  const todayKey   = new Date().toISOString().slice(0, 10);
  const weekLabel  = `${weekStart.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month:'short', day:'numeric' })} – ${endDate.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month:'short', day:'numeric' })}`;

  return (
    <div className="rounded-2xl border overflow-hidden mb-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

      {/* Header — collapse toggle and week nav are SEPARATE, never nested */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: open ? '1px solid var(--color-border)' : 'none' }}>

        {/* Collapse button */}
        <button onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 flex-1 text-left min-w-0"
          title={open ? 'Hide schedule' : 'Show schedule'}>
          <CalendarDays size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <span className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>My Schedule This Week</span>
          {requestedSet.size > 0 && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning)' }}>
              {requestedSet.size} day{requestedSet.size !== 1 ? 's' : ''} requested
            </span>
          )}
          {open
            ? <ChevronUp size={13} className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
            : <ChevronDown size={13} className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />}
        </button>

        {/* Week navigation — fully independent of collapse toggle */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={prevWeek} title="Previous week"
            className="w-6 h-6 flex items-center justify-center rounded transition"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <ChevronLeft size={13} />
          </button>
          <span className="text-xs px-1" style={{ color: 'var(--color-text-secondary)', minWidth: 120, textAlign: 'center' }}>{weekLabel}</span>
          <button onClick={nextWeek} title="Next week"
            className="w-6 h-6 flex items-center justify-center rounded transition"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <ChevronRight size={13} />
          </button>
          <Link href="/schedule"
            className="text-xs font-semibold px-2 py-1 rounded-lg ml-1 transition"
            style={{ color: 'var(--color-primary)', background: 'var(--color-primary-surface)' }}>
            Full ↗
          </Link>
        </div>
      </div>

      {/* Body */}
      {open && (
        loading ? (
          <div className="flex items-center justify-center py-5 gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading schedule…
          </div>
        ) : (
          /* 7-column day grid */
          <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', borderTop: 'none' }}>
            {SCHED_DAYS.map((label, idx) => {
              const dayDate    = new Date(weekStart); dayDate.setDate(dayDate.getDate() + idx);
              const dateKey    = `${dayDate.getFullYear()}-${String(dayDate.getMonth()+1).padStart(2,'0')}-${String(dayDate.getDate()).padStart(2,'0')}`;
              const isToday    = dateKey === todayKey;
              const isRequested = requestedSet.has(dateKey);
              const dayAppts   = byDay[idx];
              const hasBoth    = isRequested && dayAppts.length > 0;

              return (
                <div key={idx} className="flex flex-col"
                  style={{
                    borderRight: idx < 6 ? '1px solid var(--color-border)' : 'none',
                    background: isRequested ? 'var(--color-warning-surface)' : 'transparent',
                  }}>
                  {/* Column header */}
                  <div className="px-2 pt-2.5 pb-1.5 text-center"
                    style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <p className="text-xs font-bold uppercase tracking-wide"
                      style={{ color: isToday ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                      {label}
                    </p>
                    <p className="text-xs font-semibold mt-0.5"
                      style={{
                        color: isToday ? 'white' : 'var(--color-text-secondary)',
                        background: isToday ? 'var(--color-primary)' : 'transparent',
                        borderRadius: '50%', width: 22, height: 22,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                      {dayDate.getDate()}
                    </p>
                    {isRequested && (
                      <p className="text-xs font-bold mt-0.5 uppercase tracking-wide"
                        style={{ color: 'var(--color-warning)' }}>
                        ↑ Requested
                      </p>
                    )}
                  </div>

                  {/* Appointments */}
                  <div className="px-1.5 py-2 space-y-1 flex-1">
                    {dayAppts.length === 0 ? (
                      <p className="text-xs text-center py-1"
                        style={{ color: isRequested ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                        {isRequested ? '✓ Free' : '—'}
                      </p>
                    ) : (
                      <>
                        {dayAppts.map(a => (
                          <div key={a.id} className="rounded px-1.5 py-1 text-xs leading-tight"
                            style={{
                              background: hasBoth ? 'var(--color-warning)' : 'var(--color-primary-surface)',
                              color: hasBoth ? 'white' : 'var(--color-primary)',
                            }}>
                            <p className="font-semibold">{fmtApptTime(a.scheduled_start)}</p>
                            <p className="truncate opacity-80">{a.student_name.split(' ')[0]}</p>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Legend */}
      {open && !loading && (
        <div className="px-4 py-2 flex items-center gap-4 flex-wrap"
          style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: 'var(--color-primary)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Existing appointment</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: 'var(--color-warning)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Conflict — student requesting this day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold" style={{ color: 'var(--color-success)' }}>✓ Free</span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Student requested, you&apos;re available</span>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ msg, icon: Icon }: { msg: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--color-bg)' }}>
        <Icon size={18} style={{ color: 'var(--color-text-muted)' }} />
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>All clear</p>
      <p className="text-xs mt-1 max-w-xs" style={{ color: 'var(--color-text-muted)' }}>{msg}</p>
    </div>
  );
}

export default function IntakeManagementPage() {
  const [appointments, setAppointments] = useState<IntakeAppointment[]>([]);
  const [intakes, setIntakes]           = useState<IntakeRecord[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [activeStage, setActiveStage]   = useState<StageKey>('awaiting');
  const [search, setSearch]             = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg]       = useState<{ id: string; type: 'ok' | 'err'; text: string } | null>(null);
  const [exportTarget, setExportTarget] = useState<{ intakeId: string; appointmentId: string | null } | null>(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem('token');
      const h = { Authorization: `Bearer ${token}` };
      const [aptRes, intakeRes] = await Promise.all([
        fetch(api('/api/appointments/dashboard/role-view'), { headers: h }),
        fetch(api('/api/client-tracking/new-intakes?page=1&limit=500&mine=true'), { headers: h }),
      ]);
      if (aptRes.status === 401 || aptRes.status === 422) {
        ['token', 'user'].forEach(k => localStorage.removeItem(k));
        window.location.href = '/login';
        return;
      }
      if (!aptRes.ok) throw new Error('Failed to load appointments');
      const aptData = await aptRes.json();
      const intakeData = intakeRes.ok ? await intakeRes.json() : { data: [] };
      const intakeApts: IntakeAppointment[] = (aptData.appointments || []).filter((a: IntakeAppointment) => a.purpose === 'intake_interview');
      setAppointments(intakeApts);
      setIntakes(intakeData.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally { setLoading(false); }
  }

  async function confirmSlot(aptId: string) {
    setConfirmingId(aptId);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/appointments/${aptId}/confirm-intake`), {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (r.ok) {
        setActionMsg({ id: aptId, type: 'ok', text: 'Confirmed — student notified.' });
        setTimeout(() => { setActionMsg(null); fetchAll(); }, 1500);
      } else {
        const e = await r.json();
        setActionMsg({ id: aptId, type: 'err', text: e.error || 'Failed to confirm.' });
        setTimeout(() => setActionMsg(null), 3000);
      }
    } finally { setConfirmingId(null); }
  }

  const awaiting  = appointments.filter(a => ['REQUESTED', 'PENDING_APPROVAL'].includes(a.status));
  const scheduled = appointments.filter(a => ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN'].includes(a.status));
  const write     = intakes.filter(i => i.case_id && i.status !== 'COMPLETED');
  const done      = intakes.filter(i => i.status === 'COMPLETED');

  const stageCounts: Record<StageKey, number> = {
    awaiting: awaiting.length, scheduled: scheduled.length, write: write.length, done: done.length,
  };

  const q = search.toLowerCase();
  function filterApts(list: IntakeAppointment[]) {
    if (!q) return list;
    return list.filter(a => a.student_name?.toLowerCase().includes(q) || a.student_email?.toLowerCase().includes(q));
  }
  function filterIntakes(list: IntakeRecord[]) {
    if (!q) return list;
    return list.filter(i => i.client_name?.toLowerCase().includes(q) || i.client_id_number?.toLowerCase().includes(q) || i.college_unit?.toLowerCase().includes(q));
  }

  const visible = {
    awaiting:  filterApts(awaiting),
    scheduled: filterApts(scheduled),
    write:     filterIntakes(write),
    done:      filterIntakes(done),
  };

  const currentStage = STAGES.find(s => s.key === activeStage)!;

  if (loading) {
    return (
      <DashboardPageWrapper title="Intake Management" subtitle="Track your intake interviews from booking to completion">
        <div className="flex items-center justify-center h-48 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
        </div>
      </DashboardPageWrapper>
    );
  }

  if (error) {
    return (
      <DashboardPageWrapper title="Intake Management" subtitle="Track your intake interviews from booking to completion">
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
          <AlertCircle size={14} /> {error}
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <>
      <DashboardPageWrapper title="Intake Management" subtitle="Track your intake interviews from booking to completion">

        {/* Pipeline strip — desktop */}
        <div className="hidden sm:flex rounded-2xl overflow-hidden mb-6"
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          {STAGES.map((s, idx) => {
            const isActive = activeStage === s.key;
            const count = stageCounts[s.key];
            const hasItems = count > 0;
            return (
              <button key={s.key} type="button" onClick={() => setActiveStage(s.key)}
                className="relative flex-1 flex flex-col px-4 pt-4 pb-3 text-left transition"
                style={{
                  borderLeft: idx > 0 ? '1px solid var(--color-border)' : 'none',
                  borderBottom: isActive ? `3px solid ${s.accent}` : '3px solid transparent',
                  background: isActive ? `${s.accent}09` : 'transparent',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                {/* Flow connector arrow */}
                {idx > 0 && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 flex items-center justify-center"
                    style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--color-border)', }}>
                    <ChevronRight size={10} style={{ color: 'var(--color-text-muted)' }} />
                  </span>
                )}
                {/* Top row: step badge + count */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold tracking-widest px-1.5 py-0.5 rounded-md"
                    style={{
                      background: isActive ? `${s.accent}18` : 'var(--color-bg)',
                      color: isActive ? s.accent : 'var(--color-text-muted)',
                    }}>
                    STEP {idx + 1}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <s.icon size={13} style={{ color: hasItems || isActive ? s.accent : 'var(--color-border-strong)' }} />
                    <span className="text-xl font-bold tabular-nums" style={{ color: hasItems || isActive ? s.accent : 'var(--color-border-strong)' }}>
                      {count}
                    </span>
                  </div>
                </div>
                <p className="text-xs font-semibold leading-tight"
                  style={{ color: isActive ? s.accent : 'var(--color-text-primary)' }}>
                  {s.label}
                </p>
                <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--color-text-muted)' }}>
                  {s.sublabel}
                </p>
              </button>
            );
          })}
        </div>

        {/* Pipeline strip — mobile (2-col grid) */}
        <div className="sm:hidden grid grid-cols-2 gap-2 mb-4">
          {STAGES.map((s, idx) => {
            const isActive = activeStage === s.key;
            const count = stageCounts[s.key];
            const hasItems = count > 0;
            return (
              <button key={s.key} type="button" onClick={() => setActiveStage(s.key)}
                className="flex flex-col rounded-xl border px-3 py-3 text-left transition"
                style={isActive
                  ? { background: `${s.accent}10`, borderColor: s.accent, borderBottomWidth: 3 }
                  : { background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <span className="text-xs font-bold tracking-widest mb-1.5"
                  style={{ color: isActive ? s.accent : 'var(--color-text-muted)' }}>
                  STEP {idx + 1}
                </span>
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon size={13} style={{ color: hasItems || isActive ? s.accent : 'var(--color-border)' }} />
                  <span className="text-lg font-bold tabular-nums" style={{ color: hasItems || isActive ? s.accent : 'var(--color-border)' }}>
                    {count}
                  </span>
                </div>
                <p className="text-xs font-semibold leading-tight" style={{ color: isActive ? s.accent : 'var(--color-text-primary)' }}>
                  {s.label}
                </p>
                <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--color-text-muted)' }}>
                  {s.sublabel}
                </p>
              </button>
            );
          })}
        </div>

        {/* Mini schedule panel */}
        <MiniSchedulePanel requestedDates={awaiting.map(a => a.preferred_date ?? '')} />

        {/* List card */}
        <div className="rounded-2xl border shadow-card overflow-hidden animate-fade-up" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

          {/* Card header */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{currentStage.label}</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{currentStage.sublabel}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search student…"
                  className="pl-7 pr-3 py-1.5 text-xs rounded-lg outline-none transition w-40"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px var(--color-primary-surface)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <button onClick={fetchAll} title="Refresh"
                className="p-1.5 rounded-lg transition border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {/* Stage content */}
          <div className="p-4 space-y-3">
            {activeStage === 'awaiting' && (
              visible.awaiting.length === 0
                ? <EmptyState msg={currentStage.emptyMsg} icon={currentStage.icon} />
                : visible.awaiting.map(apt => (
                    <AwaitingCard key={apt.appointment_id} apt={apt}
                      onConfirm={() => confirmSlot(apt.appointment_id)}
                      confirming={confirmingId === apt.appointment_id}
                      msg={actionMsg?.id === apt.appointment_id ? { type: actionMsg.type, text: actionMsg.text } : null} />
                  ))
            )}
            {activeStage === 'scheduled' && (
              visible.scheduled.length === 0
                ? <EmptyState msg={currentStage.emptyMsg} icon={currentStage.icon} />
                : visible.scheduled.map(apt => <ScheduledCard key={apt.appointment_id} apt={apt} />)
            )}
            {activeStage === 'write' && (
              visible.write.length === 0
                ? <EmptyState msg={currentStage.emptyMsg} icon={currentStage.icon} />
                : visible.write.map(intake => (
                    <WriteCard key={intake._id} intake={intake}
                      onExport={() => setExportTarget({ intakeId: intake._id, appointmentId: intake.appointment_id ?? null })} />
                  ))
            )}
            {activeStage === 'done' && (
              visible.done.length === 0
                ? <EmptyState msg={currentStage.emptyMsg} icon={currentStage.icon} />
                : visible.done.map(intake => (
                    <DoneCard key={intake._id} intake={intake}
                      onExport={() => setExportTarget({ intakeId: intake._id, appointmentId: intake.appointment_id ?? null })} />
                  ))
            )}
          </div>

          {/* Footer count */}
          {visible[activeStage].length > 0 && (
            <div className="px-5 py-3" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Showing <strong style={{ color: 'var(--color-text-secondary)' }}>{visible[activeStage].length}</strong> record{visible[activeStage].length !== 1 ? 's' : ''}
                {search && <span> matching <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>"{search}"</span></span>}
              </p>
            </div>
          )}
        </div>


      </DashboardPageWrapper>

      {exportTarget && (
        <ClinicalExportModal
          intakeId={exportTarget.intakeId}
          appointmentId={exportTarget.appointmentId}
          onClose={() => setExportTarget(null)}
        />
      )}
    </>
  );
}
