'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import CalendarWeekView, { CalAppt } from '@/components/CalendarWeekView';
import { api } from '@/utils/api';
import {
  Loader2, Eye, Video, RotateCcw, Star, ExternalLink, RefreshCw,
  Archive, CheckCircle, History, X, AlertCircle, AlertTriangle, CalendarDays,
  Search, ArrowUpDown, NotebookPen, ChevronLeft, ChevronRight, ArrowRight, Check, Clock,
  LayoutList, CalendarRange, ChevronUp, ChevronDown,
} from 'lucide-react';

function getMondayOf(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day));
  r.setHours(0, 0, 0, 0);
  return r;
}

interface Appointment {
  appointment_id: string;
  case_id?: string;
  student_name: string;
  student_email: string;
  student_id_number?: string;
  counselor_name?: string;
  status: string;
  purpose?: string;
  concern?: string;
  method?: string;
  preferred_date?: string;
  preferred_time?: string;
  scheduled_start?: string;
  meeting_link?: string;
  risk_level?: string;
  consecutive_no_shows?: number;
}

interface DashboardData {
  role: string;
  user_name: string;
  appointments?: Appointment[];
  summary?: Record<string, number>;
  can_manage_sessions?: boolean;
  can_assign_counselor?: boolean;
}

interface ReschedRequest {
  _id: string;
  appointment_id: string;
  student_name?: string;
  current_time?: string;
  requested_start: string;
  requested_end?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  appointment_type?: string;
}

const TABS = [
  { key: 'requests',   label: 'Requests',     icon: Clock },
  { key: 'active',     label: 'Active',       icon: CheckCircle },
  { key: 'reschedule', label: 'Reschedule',   icon: RotateCcw },
  { key: 'evaluation', label: 'Post-Session', icon: Star },
  { key: 'past',       label: 'Completed',    icon: History },
  { key: 'cancelled',  label: 'Cancelled',    icon: X },
] as const;
type TabKey = typeof TABS[number]['key'];

const COUNSELOR_STAGES: {
  key: TabKey;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  accent: string;
  emptyMsg: string;
}[] = [
  { key: 'requests',   label: 'Requests',     sublabel: 'New session requests',     icon: Clock,       accent: 'var(--color-primary)',        emptyMsg: 'No new session requests. Students who book appointments will appear here.' },
  { key: 'active',     label: 'Active',       sublabel: 'Confirmed sessions',        icon: CheckCircle, accent: 'var(--color-success)',        emptyMsg: 'No confirmed sessions yet.' },
  { key: 'reschedule', label: 'Reschedule',   sublabel: 'Reschedule requests',       icon: RotateCcw,   accent: 'var(--color-warning)',        emptyMsg: 'No reschedule requests pending.' },
  { key: 'evaluation', label: 'Post-Session', sublabel: 'Follow-up or close',        icon: Star,        accent: '#F59E0B',                     emptyMsg: 'No sessions awaiting a follow-up decision.' },
  { key: 'past',       label: 'Completed',    sublabel: 'Past session records',      icon: History,     accent: 'var(--color-text-secondary)', emptyMsg: 'No completed sessions yet.' },
  { key: 'cancelled',  label: 'Cancelled',    sublabel: 'Cancelled & no-shows',      icon: X,           accent: 'var(--color-danger)',         emptyMsg: 'No cancelled sessions.' },
];

const TAB_STATUSES: Record<TabKey, string[]> = {
  requests:   ['REQUESTED'],
  active:     ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN', 'PENDING_APPROVAL'],
  reschedule: ['RESCHEDULE_REQUESTED', 'PENDING_STUDENT_APPROVAL'],
  evaluation: ['EVALUATION'],
  past:       ['COMPLETED', 'FOLLOW_UP', 'REFERRAL'],
  cancelled:  ['CANCELLED', 'DENIED', 'NO_SHOW'],
};

const PURPOSE_LABEL: Record<string, string> = {
  intake_interview: 'Initial Consultation', follow_up: 'Follow-up Session',
  follow_up_counselling: 'Follow-up Session', counseling: 'Counseling Session', others: 'General Session',
};

const STATUS_STYLE: Record<string, { label: string; bg: string; text: string; border: string }> = {
  REQUESTED:                { label: 'New Request',           bg: 'var(--color-primary-surface)', text: 'var(--color-primary)', border: 'var(--color-primary)' },
  PENDING_APPROVAL:         { label: 'Under Review',          bg: 'var(--color-warning-surface)', text: 'var(--color-warning)',  border: 'var(--color-warning)' },
  APPROVED:                 { label: 'Confirmed',              bg: 'var(--color-success-surface)', text: 'var(--color-success)',  border: 'var(--color-success)' },
  MATCHED:                  { label: 'Confirmed',              bg: 'var(--color-success-surface)', text: 'var(--color-success)',  border: 'var(--color-success)' },
  CONFIRMED:                { label: 'Confirmed',              bg: 'var(--color-success-surface)', text: 'var(--color-success)',  border: 'var(--color-success)' },
  CHECKED_IN:               { label: 'Checked In',             bg: 'var(--color-primary-surface)', text: 'var(--color-primary)', border: 'var(--color-primary)' },
  RESCHEDULE_REQUESTED:     { label: 'Reschedule Pending',     bg: 'var(--color-warning-surface)', text: 'var(--color-warning)',  border: 'var(--color-warning)' },
  PENDING_STUDENT_APPROVAL: { label: 'Awaiting Confirmation',  bg: 'var(--color-primary-surface)', text: 'var(--color-primary)', border: 'var(--color-primary)' },
  EVALUATION:               { label: 'Post-Session',           bg: 'var(--color-warning-surface)', text: 'var(--color-warning)',  border: 'var(--color-warning)' },
  FOLLOW_UP:                { label: 'Follow-Up',              bg: '#EEF2FF', text: '#4F46E5', border: '#A5B4FC' },
  REFERRAL:                 { label: 'Referral',               bg: '#F5F3FF', text: '#7C3AED', border: '#C4B5FD' },
  COMPLETED:                { label: 'Completed',              bg: 'var(--color-bg)', text: 'var(--color-text-muted)', border: 'var(--color-border)' },
  CANCELLED:                { label: 'Cancelled',              bg: 'var(--color-danger-surface)', text: 'var(--color-danger)', border: 'var(--color-danger)' },
  DENIED:                   { label: 'Denied',                 bg: 'var(--color-danger-surface)', text: 'var(--color-danger)', border: 'var(--color-danger)' },
  NO_SHOW:                  { label: 'No Show',                bg: 'var(--color-danger-surface)', text: 'var(--color-danger)', border: 'var(--color-danger)' },
};

function riskStyle(level: string): React.CSSProperties {
  switch (level.toUpperCase()) {
    case 'GREEN':    return { background: 'var(--color-success-surface)', color: 'var(--color-success)' };
    case 'YELLOW':   return { background: 'var(--color-warning-surface)', color: 'var(--color-warning)' };
    case 'RED':      return { background: 'var(--color-danger-surface)',  color: 'var(--color-danger)' };
    case 'CRITICAL': return { background: 'var(--color-danger-surface)',  color: 'var(--color-danger)', fontWeight: 700 };
    default:         return { background: 'var(--color-bg)', color: 'var(--color-text-muted)' };
  }
}

function fmtDate(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtTime(d?: string, t?: string) {
  if (t) return t;
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true });
}
function fmtPurpose(p?: string) {
  if (!p) return '—';
  return PURPOSE_LABEL[p] ?? p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function effDate(a: { scheduled_start?: string; preferred_date?: string }): string | undefined {
  return a.scheduled_start || a.preferred_date;
}
function fmtMethod(m?: string) {
  if (!m) return '—';
  if (m === 'in-person' || m === 'in_person') return 'Face to Face';
  if (m === 'google-meet' || m === 'google_meet') return 'Google Meet';
  return m.charAt(0).toUpperCase() + m.slice(1);
}

// ─── Counselor Stage Cards ────────────────────────────────────────────────────

function EmptyStageMsg({ msg, icon: Icon }: { msg: string; icon: React.ElementType }) {
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

function RequestCard({ apt, actioningId, actionMsg, onView, onAction }: {
  apt: Appointment; actioningId: string | null;
  actionMsg: { id: string; type: 'ok' | 'err'; text: string } | null;
  onView: () => void; onAction: (id: string, ep: string, b?: object) => void;
}) {
  const aptId = apt.appointment_id;
  return (
    <div className="rounded-xl border p-4 flex items-start justify-between gap-4"
      style={{ background: 'var(--color-primary-surface)', borderColor: 'var(--color-primary)' }}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{apt.student_name}</p>
          {apt.risk_level && !['GREEN', ''].includes(apt.risk_level.toUpperCase()) && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ ...riskStyle(apt.risk_level), border: 'none' }}>⚠ {apt.risk_level}</span>
          )}
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{apt.student_email}</p>
        {apt.concern && <p className="text-xs mt-1.5 italic" style={{ color: 'var(--color-text-secondary)' }}>"{apt.concern}"</p>}
        {effDate(apt) && (
          <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
            <CalendarDays size={11} />
            Requested: {fmtDate(effDate(apt))} {fmtTime(effDate(apt))} · {fmtMethod(apt.method)}
          </p>
        )}
        {actionMsg?.id === aptId && (
          <p className="text-xs mt-1.5 font-medium" style={{ color: actionMsg.type === 'ok' ? 'var(--color-success)' : 'var(--color-danger)' }}>{actionMsg.text}</p>
        )}
      </div>
      <div className="flex flex-col gap-2 flex-shrink-0">
        <button onClick={() => onAction(aptId, 'confirm')} disabled={actioningId === aptId}
          className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition hover:opacity-90 whitespace-nowrap"
          style={{ background: 'var(--color-success)' }}>
          {actioningId === aptId ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Accept
        </button>
        <button onClick={() => onAction(aptId, 'deny')} disabled={actioningId === aptId}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border disabled:opacity-50 transition whitespace-nowrap"
          style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-danger-surface)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          {actioningId === aptId ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />} Decline
        </button>
        <button onClick={onView}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Eye size={11} /> Details
        </button>
      </div>
    </div>
  );
}

function ActiveCard({ apt, actioningId, actionMsg, onView, onAction, onNoShow, onSchedule }: {
  apt: Appointment; actioningId: string | null;
  actionMsg: { id: string; type: 'ok' | 'err'; text: string } | null;
  onView: () => void; onAction: (id: string, ep: string, b?: object) => void;
  onNoShow: () => void; onSchedule: () => void;
}) {
  const aptId = apt.appointment_id;
  const isPending = apt.status === 'PENDING_STUDENT_APPROVAL';
  const isConfirmed = ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN'].includes(apt.status);
  return (
    <div className="rounded-xl border p-4 flex items-start justify-between gap-4"
      style={{ background: 'var(--color-success-surface)', borderColor: 'var(--color-success)' }}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{apt.student_name}</p>
          {apt.risk_level && !['GREEN', ''].includes(apt.risk_level.toUpperCase()) && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ ...riskStyle(apt.risk_level), border: 'none' }}>⚠ {apt.risk_level}</span>
          )}
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{apt.student_email}</p>
        {effDate(apt) ? (
          <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
            <CalendarDays size={11} /> {fmtDate(effDate(apt))} {fmtTime(effDate(apt))} · {fmtMethod(apt.method)}
          </p>
        ) : (
          <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--color-warning)' }}>No time scheduled yet</p>
        )}
        {apt.concern && <p className="text-xs mt-1 italic" style={{ color: 'var(--color-text-muted)' }}>"{apt.concern}"</p>}
        {actionMsg?.id === aptId && (
          <p className="text-xs mt-1.5 font-medium" style={{ color: actionMsg.type === 'ok' ? 'var(--color-success)' : 'var(--color-danger)' }}>{actionMsg.text}</p>
        )}
      </div>
      <div className="flex flex-col gap-2 flex-shrink-0 items-end">
        {isPending ? (
          <span className="text-xs font-medium flex items-center gap-1 whitespace-nowrap" style={{ color: 'var(--color-primary)' }}>
            <CheckCircle size={11} /> Awaiting student
          </span>
        ) : isConfirmed && !effDate(apt) ? (
          <button onClick={onSchedule}
            className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-lg transition hover:opacity-90 whitespace-nowrap"
            style={{ background: 'var(--color-primary)' }}>
            <CalendarDays size={11} /> Set Schedule
          </button>
        ) : (
          <a href={`/counselor/session/${aptId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-lg transition hover:opacity-90 whitespace-nowrap"
            style={{ background: 'var(--color-primary)' }}>
            <NotebookPen size={11} /> Conduct Session
          </a>
        )}
        {apt.meeting_link && isConfirmed && (
          <a href={apt.meeting_link} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition font-semibold whitespace-nowrap"
            style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)', borderColor: 'var(--color-success)' }}>
            <Video size={11} /> Join
          </a>
        )}
        {isConfirmed && !isPending && (
          <button onClick={() => onAction(aptId, 'complete')} disabled={actioningId === aptId}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border transition whitespace-nowrap disabled:opacity-50"
            style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-success-surface)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            {actioningId === aptId ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />} Session Done
          </button>
        )}
        {isConfirmed && !isPending && (
          <button onClick={onNoShow}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border transition whitespace-nowrap"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-danger)'; e.currentTarget.style.color = 'var(--color-danger)'; e.currentTarget.style.background = 'var(--color-danger-surface)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent'; }}>
            No Show
          </button>
        )}
        <button onClick={onView}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Eye size={11} /> View
        </button>
      </div>
    </div>
  );
}

function PostSessionCard({ apt, actioningId, actionMsg, pendingAction, setPendingAction, onView, onAction, onFollowUp }: {
  apt: Appointment; actioningId: string | null;
  actionMsg: { id: string; type: 'ok' | 'err'; text: string } | null;
  pendingAction: { aptId: string; action: 'referral'; notes: string } | null;
  setPendingAction: (v: any) => void;
  onView: () => void; onAction: (id: string, ep: string, b?: object) => void; onFollowUp: () => void;
}) {
  const aptId = apt.appointment_id;
  return (
    <div className="rounded-xl border p-4" style={{ background: '#FFFBEB', borderColor: '#F59E0B' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{apt.student_name}</p>
            {apt.risk_level && !['GREEN', ''].includes(apt.risk_level.toUpperCase()) && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ ...riskStyle(apt.risk_level), border: 'none' }}>⚠ {apt.risk_level}</span>
            )}
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{apt.student_email}</p>
          {effDate(apt) && (
            <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
              <CalendarDays size={11} /> Session held: {fmtDate(effDate(apt))} · {fmtMethod(apt.method)}
            </p>
          )}
          {actionMsg?.id === aptId && !pendingAction && (
            <p className="text-xs mt-1.5 font-medium" style={{ color: actionMsg.type === 'ok' ? 'var(--color-success)' : 'var(--color-danger)' }}>{actionMsg.text}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0 items-end">
          {apt.case_id && (
            <a href={`/cases/${apt.case_id}?tab=session-notes`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition whitespace-nowrap"
              style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
              <NotebookPen size={11} /> Write Note
            </a>
          )}
          <button onClick={onView}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Eye size={11} /> View
          </button>
        </div>
      </div>
      <div className="mt-3 pt-3 flex items-center gap-2 flex-wrap" style={{ borderTop: '1px solid rgba(245,158,11,0.25)' }}>
        {pendingAction?.aptId === aptId ? (
          <>
            <div className="flex-1 min-w-[160px]">
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Referral Notes</p>
              <textarea rows={1} value={pendingAction.notes}
                onChange={e => setPendingAction({ ...pendingAction, notes: e.target.value })}
                placeholder="Optional notes…"
                className="w-full rounded-lg px-2 py-1 text-xs resize-none outline-none"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }} />
            </div>
            <button onClick={() => onAction(aptId, 'set-referral', { notes: pendingAction.notes })} disabled={actioningId === aptId}
              className="px-3 py-1.5 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 hover:opacity-90 whitespace-nowrap"
              style={{ background: 'var(--color-primary)' }}>
              {actioningId === aptId ? <Loader2 size={11} className="animate-spin" /> : 'Confirm Referral'}
            </button>
            <button onClick={() => setPendingAction(null)}
              className="px-2.5 py-1.5 border text-xs rounded-lg transition"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>Cancel</button>
          </>
        ) : (
          <>
            <button onClick={onFollowUp}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition"
              style={{ background: '#EEF2FF', color: '#4F46E5', borderColor: '#A5B4FC' }}>
              <RefreshCw size={11} /> Schedule Follow-Up
            </button>
            <button onClick={() => setPendingAction({ aptId, action: 'referral', notes: '' })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition"
              style={{ background: '#F5F3FF', color: '#7C3AED', borderColor: '#C4B5FD' }}>
              <ExternalLink size={11} /> Referral
            </button>
            <button onClick={() => onAction(aptId, 'complete')} disabled={actioningId === aptId}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition disabled:opacity-50"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              {actioningId === aptId ? <Loader2 size={11} className="animate-spin" /> : <Archive size={11} />}
              Complete & Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function CompletedCard({ apt, onView }: { apt: Appointment; onView: () => void }) {
  const cfg = STATUS_STYLE[apt.status] ?? STATUS_STYLE.COMPLETED;
  return (
    <div className="rounded-xl border p-4 flex items-center gap-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{apt.student_name}</p>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full border" style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}>{cfg.label}</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{apt.student_email}</p>
        {effDate(apt) && <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}><CalendarDays size={11} /> {fmtDate(effDate(apt))}</p>}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {apt.case_id && (
          <a href={`/cases/${apt.case_id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition whitespace-nowrap"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-surface)')}>
            View Case
          </a>
        )}
        <button onClick={onView}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Eye size={11} /> View
        </button>
      </div>
    </div>
  );
}

function CancelledCard({ apt, onView }: { apt: Appointment; onView: () => void }) {
  const cfg = STATUS_STYLE[apt.status] ?? STATUS_STYLE.CANCELLED;
  return (
    <div className="rounded-xl border p-4 flex items-center gap-4" style={{ background: 'var(--color-danger-surface)', borderColor: 'rgba(239,68,68,0.25)' }}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{apt.student_name}</p>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full border" style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}>{cfg.label}</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{apt.student_email}</p>
        {effDate(apt) && <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}><CalendarDays size={11} /> {fmtDate(effDate(apt))}</p>}
      </div>
      <button onClick={onView}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition flex-shrink-0 whitespace-nowrap"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <Eye size={11} /> View
      </button>
    </div>
  );
}

// ─── Mini Schedule Panel ──────────────────────────────────────────────────────

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface MiniAppt {
  id: string;
  student_name: string;
  scheduled_start: string;
  status: string;
}

function apptPillStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'CONFIRMED':
    case 'APPROVED':
    case 'MATCHED':
    case 'CHECKED_IN':  return { background: '#dbeafe', color: '#1e40af' };
    case 'EVALUATION':  return { background: '#ede9fe', color: '#4c1d95' };
    case 'FOLLOW_UP':   return { background: '#d1fae5', color: '#065f46' };
    case 'REFERRAL':    return { background: '#f3e8ff', color: '#581c87' };
    case 'REQUESTED':
    case 'PENDING_APPROVAL': return { background: '#fef3c7', color: '#92400e' };
    default:            return { background: 'var(--color-bg)', color: 'var(--color-text-muted)' };
  }
}

function MiniSchedulePanel() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()));
  const [appts, setAppts]         = useState<MiniAppt[]>([]);
  const [loading, setLoading]     = useState(false);
  const [open, setOpen]           = useState(true);

  const fetchWeek = useCallback(async (start: Date) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    try {
      const from = start.toISOString();
      const to   = new Date(new Date(start).setDate(start.getDate() + 7)).toISOString();
      const r    = await fetch(api(`/api/appointments/dashboard/calendar?from=${from}&to=${to}`), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setAppts(d.appointments ?? []); }
      else setAppts([]);
    } catch { setAppts([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWeek(weekStart); }, [weekStart, fetchWeek]);

  function prevWeek() { setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; }); }
  function nextWeek() { setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; }); }

  // Group by day index (Mon=0)
  const byDay: MiniAppt[][] = Array.from({ length: 7 }, () => []);
  appts.forEach(a => {
    const diff = Math.floor((new Date(a.scheduled_start).getTime() - weekStart.getTime()) / 86400000);
    if (diff >= 0 && diff < 7) byDay[diff].push(a);
  });

  const todayKey = new Date().toISOString().slice(0, 10);
  const endDate  = new Date(weekStart); endDate.setDate(endDate.getDate() + 6);
  const weekLabel = `${weekStart.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' })}`;
  const totalThisWeek = appts.filter(a => ['CONFIRMED','APPROVED','MATCHED','CHECKED_IN'].includes(a.status)).length;

  return (
    <div className="rounded-xl border overflow-hidden mb-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: open ? '1px solid var(--color-border)' : 'none', background: 'var(--color-primary-surface)' }}>
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 text-left min-w-0" title={open ? 'Hide' : 'Show'}>
          <CalendarDays size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>My Week</span>
          {totalThisWeek > 0 && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: 'var(--color-primary)', color: '#fff' }}>
              {totalThisWeek} confirmed
            </span>
          )}
          {open
            ? <ChevronUp size={13} className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
            : <ChevronDown size={13} className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />}
        </button>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={prevWeek} title="Previous week"
            className="w-6 h-6 flex items-center justify-center rounded transition"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <ChevronLeft size={13} />
          </button>
          <span className="text-xs px-1 font-medium" style={{ color: 'var(--color-text-secondary)', minWidth: 120, textAlign: 'center' }}>{weekLabel}</span>
          <button onClick={nextWeek} title="Next week"
            className="w-6 h-6 flex items-center justify-center rounded transition"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <ChevronRight size={13} />
          </button>
          <a href="/schedule"
            className="text-xs font-semibold px-2 py-1 rounded-lg ml-1 transition"
            style={{ color: 'var(--color-primary)', background: 'var(--color-bg)' }}>
            Full ↗
          </a>
        </div>
      </div>

      {/* Grid body */}
      {open && (
        loading ? (
          <div className="flex items-center justify-center py-5 gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {WEEK_DAYS.map((label, idx) => {
              const dayDate = new Date(weekStart); dayDate.setDate(dayDate.getDate() + idx);
              const dateKey = dayDate.toISOString().slice(0, 10);
              const isToday = dateKey === todayKey;
              const dayAppts = byDay[idx];

              return (
                <div key={idx} className="flex flex-col" style={{ borderRight: idx < 6 ? '1px solid var(--color-border)' : 'none', background: isToday ? 'var(--color-primary-surface)' : 'transparent' }}>
                  {/* Day header */}
                  <div className="px-1.5 pt-2.5 pb-1.5 text-center" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: isToday ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{label}</p>
                    <span className="text-xs font-semibold mt-0.5 inline-flex items-center justify-center"
                      style={{
                        color: isToday ? '#fff' : 'var(--color-text-secondary)',
                        background: isToday ? 'var(--color-primary)' : 'transparent',
                        borderRadius: '50%', width: 22, height: 22,
                      }}>
                      {dayDate.getDate()}
                    </span>
                  </div>

                  {/* Appointments */}
                  <div className="px-1 py-1.5 space-y-1 flex-1 min-h-[56px]">
                    {dayAppts.length === 0 ? (
                      <p className="text-xs text-center pt-1" style={{ color: 'var(--color-text-muted)' }}>—</p>
                    ) : (
                      dayAppts.map(a => (
                        <div key={a.id} className="rounded px-1.5 py-1 text-xs leading-tight" style={apptPillStyle(a.status)}>
                          <p className="font-semibold">
                            {new Date(a.scheduled_start).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true })}
                          </p>
                          <p className="truncate opacity-80">{a.student_name.split(' ')[0]}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

const IC = 'w-full px-3 py-2 text-sm rounded-lg outline-none transition';
const IC_S: React.CSSProperties = { border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' };
const onFIn  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-surface)'; };
const onFOut = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; };

export default function AppointmentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ id: string; type: 'ok' | 'err'; text: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<{ aptId: string; action: 'referral'; notes: string } | null>(null);
  const [followUpTarget, setFollowUpTarget] = useState<Appointment | null>(null);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [followUpSlots, setFollowUpSlots] = useState<string[]>([]);
  const [followUpLoadingSlots, setFollowUpLoadingSlots] = useState(false);
  const [followUpOffice, setFollowUpOffice] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpMsg, setFollowUpMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);
  const [noShowTarget, setNoShowTarget] = useState<Appointment | null>(null);
  const [noShowReason, setNoShowReason] = useState('');
  const [submittingNoShow, setSubmittingNoShow] = useState(false);
  const [noShowTermAlert, setNoShowTermAlert] = useState<{ caseId: string | null; studentName: string } | null>(null);
  const [noShowRebookPrompt, setNoShowRebookPrompt] = useState<{ appointmentId: string; studentName: string; consecutiveNoShows: number } | null>(null);
  const [submittingRebook, setSubmittingRebook] = useState(false);
  const [rebookResult, setRebookResult] = useState<{ deadline: string; days: number } | null>(null);
  const [schedTarget, setSchedTarget] = useState<Appointment | null>(null);
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');
  const [schedOffice, setSchedOffice] = useState('');
  const [schedMethod, setSchedMethod] = useState('in_person');
  const [schedMsg, setSchedMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [submittingSched, setSubmittingSched] = useState(false);
  const [schedMode, setSchedMode] = useState<'slots' | 'manual'>('slots');
  const [schedMySlots, setSchedMySlots] = useState<{ time: string; method: string }[]>([]);
  const [loadingMySlots, setLoadingMySlots] = useState(false);
  const [intakeSummary, setIntakeSummary] = useState<any>(null);
  const [intakePacket, setIntakePacket] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'risk'>('date-asc');
  const [riskFilter, setRiskFilter] = useState<'all' | 'high'>('all');
  const [mineOnly, setMineOnly] = useState(false);
  const [apptPage, setApptPage] = useState(1);
  const [apptPageInput, setApptPageInput] = useState('1');
  const [reschedReqs, setReschedReqs] = useState<ReschedRequest[]>([]);
  const [reschedLoading, setReschedLoading] = useState(false);
  const [reschedTab, setReschedTab] = useState<'pending' | 'approved' | 'denied'>('pending');
  const [reschedSelected, setReschedSelected] = useState<ReschedRequest | null>(null);
  const [reschedActioning, setReschedActioning] = useState(false);
  const [reschedActionMsg, setReschedActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // ── Calendar view state ────────────────────────────────────────────────────
  const [viewMode, setViewMode]     = useState<'list' | 'calendar'>('list');
  const [calWeekStart, setCalWeekStart] = useState<Date>(() => getMondayOf(new Date()));
  const [calAppts, setCalAppts]     = useState<CalAppt[]>([]);
  const [calLoading, setCalLoading] = useState(false);

  const fetchCalAppts = useCallback(async (start: Date) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setCalLoading(true);
    try {
      const from = start.toISOString();
      const to   = new Date(new Date(start).setDate(start.getDate() + 7)).toISOString();
      const r = await fetch(api(`/api/appointments/dashboard/calendar?from=${from}&to=${to}`), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setCalAppts(d.appointments ?? []); }
    } catch { setCalAppts([]); }
    finally { setCalLoading(false); }
  }, []);

  useEffect(() => { if (viewMode === 'calendar') fetchCalAppts(calWeekStart); }, [viewMode, calWeekStart, fetchCalAppts]);

  function calPrevWeek() { setCalWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; }); }
  function calNextWeek() { setCalWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; }); }
  function calToday()    { setCalWeekStart(getMondayOf(new Date())); }

  useEffect(() => { setApptPage(1); }, [activeTab, search, riskFilter, mineOnly, sortBy]);
  useEffect(() => { setApptPageInput(String(apptPage)); }, [apptPage]);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api('/api/appointments/dashboard/role-view'), { headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 401) { router.replace('/login'); return; }
      if (r.ok) setDashboard(await r.json());
    } finally { setLoading(false); }
  };

  const loadReschedReqs = async () => {
    setReschedLoading(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api('/api/appointments/reschedule-requests'), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setReschedReqs((await r.json()).requests ?? []);
    } catch {} finally { setReschedLoading(false); }
  };

  const doReschedAction = async (id: string, action: 'approve' | 'deny') => {
    setReschedActioning(true); setReschedActionMsg(null);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/appointments/reschedule-requests/${id}/${action}`), {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`Failed to ${action}`);
      setReschedActionMsg({ type: 'ok', text: action === 'approve' ? 'Request approved.' : 'Request denied.' });
      setTimeout(() => { setReschedSelected(null); setReschedActionMsg(null); loadReschedReqs(); load(); }, 900);
    } catch (e: any) {
      setReschedActionMsg({ type: 'err', text: e.message ?? 'Action failed.' });
    } finally { setReschedActioning(false); }
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userData || !token) { router.replace('/login'); return; }
    setUser(JSON.parse(userData));
    load();
  }, []);

  useEffect(() => {
    if (!user) return;
    const role = user.role?.toUpperCase();
    if (['STAFF', 'ADMIN', 'IC'].includes(role)) router.replace('/appointment-requests');
    // CASE_MANAGER defaults to the reschedule tab
    if (role === 'CASE_MANAGER') setActiveTab('reschedule');
  }, [user]);

  // Load reschedule requests whenever the reschedule tab is active
  useEffect(() => {
    if (activeTab === 'reschedule') loadReschedReqs();
  }, [activeTab]);

  // Fetch counselor's own available slots when follow-up date is picked
  useEffect(() => {
    if (!followUpDate || !user?._id) { setFollowUpSlots([]); setFollowUpTime(''); return; }
    setFollowUpLoadingSlots(true);
    setFollowUpTime('');
    const token = localStorage.getItem('token');
    fetch(api(`/api/appointments/counselor-slots?counselor_id=${user._id}&date=${followUpDate}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : { slots: [] })
      .then(d => setFollowUpSlots(d.slots || []))
      .catch(() => setFollowUpSlots([]))
      .finally(() => setFollowUpLoadingSlots(false));
  }, [followUpDate, user]);

  useEffect(() => {
    if (!detailAppt) { setIntakeSummary(null); setIntakePacket(null); return; }
    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };
    const id = detailAppt.appointment_id;
    Promise.all([
      fetch(api(`/api/intake/${id}`), { headers: h }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(api(`/api/intake/packet/${id}`), { headers: h }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([s, p]) => { setIntakeSummary(s); setIntakePacket(p); });
  }, [detailAppt]);

  const APPT_PER_PAGE = 10;
  const apts = Array.isArray(dashboard?.appointments) ? dashboard!.appointments! : [];
  const counts = Object.fromEntries(TABS.map(t => [t.key, apts.filter(a => TAB_STATUSES[t.key as TabKey].includes(a.status)).length])) as Record<TabKey, number>;
  const visibleTabs = TABS.filter(tab => tab.key !== 'reschedule' || counts.reschedule > 0);
  const displayTab = (activeTab === 'reschedule' && counts.reschedule === 0) ? 'active' : activeTab;
  const filtered = apts.filter(a => TAB_STATUSES[displayTab].includes(a.status));
  const canManage = dashboard?.can_manage_sessions ?? false;
  const isCounselorView = ['COUNSELOR', 'PSYCHOLOGIST'].includes(user?.role?.toUpperCase() ?? '');

  const RISK_ORDER: Record<string, number> = { CRITICAL: 0, RED: 1, YELLOW: 2, GREEN: 3 };
  const displayed = filtered
    .filter(a => {
      if (search && !a.student_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (riskFilter === 'high' && !['RED', 'CRITICAL'].includes((a.risk_level ?? '').toUpperCase())) return false;
      if (mineOnly && a.counselor_name && dashboard?.user_name && !a.counselor_name.toLowerCase().includes(dashboard.user_name.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'risk') {
        const ra = RISK_ORDER[(a.risk_level ?? '').toUpperCase()] ?? 4;
        const rb = RISK_ORDER[(b.risk_level ?? '').toUpperCase()] ?? 4;
        return ra - rb;
      }
      const da = effDate(a) ? new Date(effDate(a)!).getTime() : (sortBy === 'date-asc' ? Infinity : -Infinity);
      const db2 = effDate(b) ? new Date(effDate(b)!).getTime() : (sortBy === 'date-asc' ? Infinity : -Infinity);
      return sortBy === 'date-asc' ? da - db2 : db2 - da;
    });

  const totalApptPages = Math.ceil(displayed.length / APPT_PER_PAGE);
  const paginatedApts = displayed.slice((apptPage - 1) * APPT_PER_PAGE, apptPage * APPT_PER_PAGE);

  const goToApptPage = (val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= totalApptPages) setApptPage(n);
    else setApptPageInput(String(apptPage));
  };

  const doAction = async (aptId: string, endpoint: string, body?: object) => {
    setActioningId(aptId); setActionMsg(null);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/appointments/${aptId}/${endpoint}`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (r.ok) {
        const msgs: Record<string, string> = {
          'set-evaluation': 'Session marked done.', 'set-follow-up': 'Marked as Follow-Up.',
          'set-referral': 'Marked as Referral.', 'complete': 'Marked as Completed.', 'mark-no-show': 'Marked as No Show.',
        };
        setActionMsg({ id: aptId, type: 'ok', text: msgs[endpoint] ?? 'Done.' });
        setPendingAction(null);
        setTimeout(() => load(), 900);
      } else {
        const e = await r.json();
        setActionMsg({ id: aptId, type: 'err', text: e.error || 'Failed.' });
      }
    } finally { setActioningId(null); }
  };

  const doFollowUp = async () => {
    if (!followUpTarget || !followUpDate || !followUpTime) return;
    setSubmittingFollowUp(true); setFollowUpMsg(null);
    try {
      const token = localStorage.getItem('token');
      const scheduledStart = new Date(`${followUpDate}T${followUpTime}:00`).toISOString();
      const r = await fetch(api(`/api/appointments/${followUpTarget.appointment_id}/set-follow-up`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_start: scheduledStart, office: followUpOffice, notes: followUpNotes }),
      });
      if (r.ok) { setFollowUpMsg({ type: 'ok', text: 'Follow-up session scheduled.' }); setTimeout(() => { setFollowUpTarget(null); load(); }, 1200); }
      else { const e = await r.json(); setFollowUpMsg({ type: 'err', text: e.error || 'Failed to schedule follow-up.' }); }
    } finally { setSubmittingFollowUp(false); }
  };

  const loadMySlots = async (date: string) => {
    if (!date) return;
    setLoadingMySlots(true); setSchedMySlots([]);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/availability/my-slots?date=${date}`), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setSchedMySlots(d.slots || []); }
    } finally { setLoadingMySlots(false); }
  };

  const doSchedule = async () => {
    if (!schedTarget || !schedDate || !schedTime) return;
    setSubmittingSched(true); setSchedMsg(null);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/appointments/${schedTarget.appointment_id}/schedule`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: schedDate, time: schedTime, office: schedOffice, method: schedMethod }),
      });
      if (r.ok) { setSchedMsg({ type: 'ok', text: 'Session scheduled.' }); setTimeout(() => { setSchedTarget(null); load(); }, 1200); }
      else { const e = await r.json(); setSchedMsg({ type: 'err', text: e.error || 'Failed to schedule.' }); }
    } finally { setSubmittingSched(false); }
  };

  if (loading) {
    return (
      <DashboardPageWrapper title="My Appointments" subtitle="Sessions assigned to you">
        <div className="flex items-center justify-center h-52 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="My Appointments" subtitle="Sessions assigned to you">

      {/* Summary strip — non-counselor only */}
      {!isCounselorView && dashboard?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total',        value: dashboard.summary.total_appointments ?? apts.length, color: 'var(--color-text-primary)' },
            { label: 'Confirmed',    value: dashboard.summary.confirmed ?? 0,                    color: 'var(--color-primary)' },
            { label: 'Post-Session', value: dashboard.summary.awaiting_evaluation ?? 0,          color: 'var(--color-warning)' },
            { label: 'Follow-Up',    value: (dashboard.summary.follow_up ?? 0) + (dashboard.summary.referral ?? 0), color: '#4F46E5' },
          ].map(c => (
            <div key={c.label} className="rounded-2xl border shadow-card px-4 py-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{c.label}</p>
              <p className="text-2xl font-semibold" style={{ color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Stage pipeline strip — counselor view */}
      {isCounselorView && (
        <>
          {/* Desktop: horizontal strip */}
          <div className="hidden sm:flex rounded-2xl overflow-hidden mb-6"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
            {COUNSELOR_STAGES.map((s, idx) => {
              const isActive = activeTab === s.key;
              const stageCount = s.key === 'reschedule' ? reschedReqs.filter(r => r.status === 'pending').length : counts[s.key];
              const hasItems = stageCount > 0;
              return (
                <button key={s.key} type="button" onClick={() => setActiveTab(s.key)}
                  className="relative flex-1 flex flex-col px-4 pt-4 pb-3 text-left transition"
                  style={{
                    borderLeft: idx > 0 ? '1px solid var(--color-border)' : 'none',
                    borderBottom: isActive ? `3px solid ${s.accent}` : '3px solid transparent',
                    background: isActive ? `${s.accent}09` : 'transparent',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg)'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  {idx > 0 && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 flex items-center justify-center"
                      style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--color-border)' }}>
                      <ChevronRight size={10} style={{ color: 'var(--color-text-muted)' }} />
                    </span>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold tracking-widest px-1.5 py-0.5 rounded-md"
                      style={{ background: isActive ? `${s.accent}18` : 'var(--color-bg)', color: isActive ? s.accent : 'var(--color-text-muted)' }}>
                      STEP {idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <s.icon size={13} style={{ color: hasItems || isActive ? s.accent : 'var(--color-border-strong)' }} />
                      <span className="text-xl font-bold tabular-nums" style={{ color: hasItems || isActive ? s.accent : 'var(--color-border-strong)' }}>
                        {stageCount}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs font-semibold leading-tight" style={{ color: isActive ? s.accent : 'var(--color-text-primary)' }}>{s.label}</p>
                  <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--color-text-muted)' }}>{s.sublabel}</p>
                </button>
              );
            })}
          </div>

          {/* Mobile: 2-col grid */}
          <div className="sm:hidden grid grid-cols-2 gap-2 mb-4">
            {COUNSELOR_STAGES.map((s, idx) => {
              const isActive = activeTab === s.key;
              const stageCount = s.key === 'reschedule' ? reschedReqs.filter(r => r.status === 'pending').length : counts[s.key];
              const hasItems = stageCount > 0;
              return (
                <button key={s.key} type="button" onClick={() => setActiveTab(s.key)}
                  className="flex flex-col rounded-xl border px-3 py-3 text-left transition"
                  style={isActive ? { background: `${s.accent}10`, borderColor: s.accent, borderBottomWidth: 3 } : { background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <span className="text-xs font-bold tracking-widest mb-1.5" style={{ color: isActive ? s.accent : 'var(--color-text-muted)' }}>STEP {idx + 1}</span>
                  <div className="flex items-center gap-1.5 mb-1">
                    <s.icon size={13} style={{ color: hasItems || isActive ? s.accent : 'var(--color-border)' }} />
                    <span className="text-lg font-bold tabular-nums" style={{ color: hasItems || isActive ? s.accent : 'var(--color-border)' }}>{stageCount}</span>
                  </div>
                  <p className="text-xs font-semibold leading-tight" style={{ color: isActive ? s.accent : 'var(--color-text-primary)' }}>{s.label}</p>
                  <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--color-text-muted)' }}>{s.sublabel}</p>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Mini week schedule — COUNSELOR / PSYCHOLOGIST only */}
      {isCounselorView && <MiniSchedulePanel />}

      {/* Post-session banner — non-counselor view only */}
      {!isCounselorView && counts.evaluation > 0 && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4 text-sm border"
          style={{ background: 'var(--color-warning-surface)', borderColor: 'var(--color-warning)' }}>
          <Star size={15} className="flex-shrink-0" style={{ color: 'var(--color-warning)' }} />
          <span className="font-medium" style={{ color: 'var(--color-warning)' }}>
            {counts.evaluation} session{counts.evaluation > 1 ? 's' : ''} waiting for your decision — set Follow-Up, Referral, or Complete.
          </span>
          <button onClick={() => setActiveTab('evaluation')}
            className="ml-auto text-xs font-semibold underline underline-offset-2 transition hover:opacity-70"
            style={{ color: 'var(--color-warning)' }}>
            Review
          </button>
        </div>
      )}

      {/* Today's Sessions panel — counselors only */}
      {(() => {
        const todayPH = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); // YYYY-MM-DD
        const todaySessions = apts.filter(a => {
          if (!['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN'].includes(a.status)) return false;
          const d = effDate(a);
          if (!d) return false;
          const dateStr = new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
          return dateStr === todayPH;
        });
        if (todaySessions.length === 0) return null;
        return (
          <div className="rounded-xl border mb-4 overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-primary-surface)' }}>
              <CalendarDays size={14} style={{ color: 'var(--color-primary)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
                Today's Sessions · {todaySessions.length} scheduled
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {todaySessions.map(a => {
                const style = STATUS_STYLE[a.status] ?? STATUS_STYLE.CONFIRMED;
                return (
                  <div key={a.appointment_id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-medium w-20 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                      {fmtTime(effDate(a))}
                    </span>
                    <span className="text-sm font-semibold flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {a.student_name}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: style.bg, color: style.text }}>
                      {style.label}
                    </span>
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                      {fmtMethod(a.method)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Counselor Stage Card ── */}
      {isCounselorView && (() => {
        const currentStage = COUNSELOR_STAGES.find(s => s.key === activeTab)!;
        const stageFiltered = apts
          .filter(a => TAB_STATUSES[activeTab as TabKey].includes(a.status))
          .filter(a => !search || a.student_name.toLowerCase().includes(search.toLowerCase()))
          .sort((a, b) => {
            const da = effDate(a) ? new Date(effDate(a)!).getTime() : Infinity;
            const db = effDate(b) ? new Date(effDate(b)!).getTime() : Infinity;
            return da - db;
          });
        function fmtRD(s?: string) { if (!s) return '—'; try { return new Date(s).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }); } catch { return '—'; } }
        function fmtRT(s?: string) { if (!s) return ''; try { return new Date(s).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }); } catch { return ''; } }
        function fmtAgo(s?: string) { if (!s) return ''; try { const h = Math.floor((Date.now() - new Date(s).getTime()) / 3600000); if (h < 1) return 'just now'; if (h < 24) return `${h}h ago`; return `${Math.floor(h/24)}d ago`; } catch { return ''; } }
        return (
          <div className="rounded-2xl border shadow-card overflow-hidden animate-fade-up" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{currentStage.label}</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{currentStage.sublabel}</p>
              </div>
              <div className="flex items-center gap-2">
                {activeTab !== 'reschedule' && (
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student…"
                      className="pl-7 pr-3 py-1.5 text-xs rounded-lg outline-none transition w-40"
                      style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                      onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px var(--color-primary-surface)'; }}
                      onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }} />
                  </div>
                )}
                <button onClick={load} title="Refresh" className="p-1.5 rounded-lg transition border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>

            {/* Stage content */}
            <div className="p-4 space-y-3">
              {activeTab === 'requests' && (
                stageFiltered.length === 0
                  ? <EmptyStageMsg msg={currentStage.emptyMsg} icon={currentStage.icon} />
                  : stageFiltered.map(apt => (
                      <RequestCard key={apt.appointment_id} apt={apt}
                        actioningId={actioningId} actionMsg={actionMsg}
                        onView={() => apt.case_id && router.push(`/cases/${apt.case_id}`)}
                        onAction={doAction} />
                    ))
              )}
              {activeTab === 'active' && (
                stageFiltered.length === 0
                  ? <EmptyStageMsg msg={currentStage.emptyMsg} icon={currentStage.icon} />
                  : stageFiltered.map(apt => (
                      <ActiveCard key={apt.appointment_id} apt={apt}
                        actioningId={actioningId} actionMsg={actionMsg}
                        onView={() => apt.case_id && router.push(`/cases/${apt.case_id}`)}
                        onAction={doAction}
                        onNoShow={() => { setNoShowTarget(apt); setNoShowReason(''); }}
                        onSchedule={() => { setSchedTarget(apt); setSchedDate(''); setSchedTime(''); setSchedOffice(''); setSchedMethod('in_person'); setSchedMsg(null); setSchedMode('slots'); setSchedMySlots([]); }} />
                    ))
              )}
              {activeTab === 'reschedule' && (() => {
                const reschedCounts = { pending: reschedReqs.filter(r => r.status === 'pending').length, approved: reschedReqs.filter(r => r.status === 'approved').length, denied: reschedReqs.filter(r => r.status === 'denied').length };
                const reschedFiltered = reschedReqs.filter(r => r.status === reschedTab);
                return (
                  <div className="-mx-4 -my-3">
                    <div className="flex items-center px-2 pt-1 gap-0.5" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                      {(['pending', 'approved', 'denied'] as const).map(t => {
                        const isAct = reschedTab === t;
                        const cnt = reschedCounts[t];
                        return (
                          <button key={t} onClick={() => setReschedTab(t)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition whitespace-nowrap capitalize"
                            style={isAct ? { background: 'var(--color-primary-surface)', color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)' } : { color: 'var(--color-text-muted)' }}
                            onMouseEnter={e => { if (!isAct) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                            onMouseLeave={e => { if (!isAct) e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                            {t}
                            {cnt > 0 && <span className="text-xs font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-1" style={isAct ? { background: 'var(--color-primary)', color: 'white' } : { background: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>{cnt}</span>}
                          </button>
                        );
                      })}
                      <button onClick={loadReschedReqs} className="ml-auto mr-2 mb-1.5 flex items-center gap-1 text-xs transition" style={{ color: 'var(--color-text-muted)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                        <RefreshCw size={12} /> Refresh
                      </button>
                    </div>
                    {reschedLoading ? (
                      <div className="flex items-center justify-center h-40 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
                      </div>
                    ) : reschedFiltered.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--color-bg)' }}><RotateCcw size={18} style={{ color: 'var(--color-text-muted)' }} /></div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>All clear</p>
                        <p className="text-xs mt-1 max-w-xs" style={{ color: 'var(--color-text-muted)' }}>{reschedTab === 'pending' ? 'No pending reschedule requests.' : `No ${reschedTab} reschedule requests.`}</p>
                      </div>
                    ) : (
                      reschedFiltered.map((req, i) => (
                        <button key={req._id} onClick={() => { setReschedSelected(req); setReschedActionMsg(null); }}
                          className="w-full text-left px-5 py-4 transition"
                          style={{ borderBottom: i < reschedFiltered.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <div className="flex items-start gap-4">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold mt-0.5" style={{ background: 'var(--color-primary)' }}>
                              {(req.student_name || 'S').charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>{req.student_name || 'Unknown Student'}</p>
                              <div className="flex items-center gap-2 text-xs flex-wrap">
                                <span className="px-2 py-1 rounded-lg" style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                                  {fmtRD(req.current_time)} {fmtRT(req.current_time)}
                                </span>
                                <ArrowRight size={12} style={{ color: 'var(--color-border)' }} />
                                <span className="px-2 py-1 rounded-lg font-medium"
                                  style={req.status === 'pending' ? { background: 'var(--color-warning-surface)', color: 'var(--color-warning)' }
                                    : req.status === 'approved' ? { background: 'var(--color-success-surface)', color: 'var(--color-success)' }
                                    : { background: 'var(--color-bg)', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                                  {fmtRD(req.requested_start)} {fmtRT(req.requested_start)}
                                </span>
                              </div>
                              {req.reason && <p className="text-xs mt-1.5 truncate max-w-xs" style={{ color: 'var(--color-text-muted)' }}>"{req.reason}"</p>}
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border capitalize"
                                style={req.status === 'pending' ? { background: 'var(--color-warning-surface)', color: 'var(--color-warning)', borderColor: 'var(--color-warning)' }
                                  : req.status === 'approved' ? { background: 'var(--color-success-surface)', color: 'var(--color-success)', borderColor: 'var(--color-success)' }
                                  : { background: 'var(--color-bg)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                                {req.status}
                              </span>
                              <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{fmtAgo(req.created_at)}</span>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                );
              })()}
              {activeTab === 'evaluation' && (
                stageFiltered.length === 0
                  ? <EmptyStageMsg msg={currentStage.emptyMsg} icon={currentStage.icon} />
                  : stageFiltered.map(apt => (
                      <PostSessionCard key={apt.appointment_id} apt={apt}
                        actioningId={actioningId} actionMsg={actionMsg}
                        pendingAction={pendingAction} setPendingAction={setPendingAction}
                        onView={() => apt.case_id && router.push(`/cases/${apt.case_id}`)}
                        onAction={doAction}
                        onFollowUp={() => { setFollowUpTarget(apt); setFollowUpDate(''); setFollowUpTime(''); setFollowUpOffice(''); setFollowUpNotes(''); setFollowUpMsg(null); }} />
                    ))
              )}
              {activeTab === 'past' && (
                stageFiltered.length === 0
                  ? <EmptyStageMsg msg={currentStage.emptyMsg} icon={currentStage.icon} />
                  : stageFiltered.map(apt => (
                      <CompletedCard key={apt.appointment_id} apt={apt}
                        onView={() => apt.case_id && router.push(`/cases/${apt.case_id}`)} />
                    ))
              )}
              {activeTab === 'cancelled' && (
                stageFiltered.length === 0
                  ? <EmptyStageMsg msg={currentStage.emptyMsg} icon={currentStage.icon} />
                  : stageFiltered.map(apt => (
                      <CancelledCard key={apt.appointment_id} apt={apt}
                        onView={() => apt.case_id && router.push(`/cases/${apt.case_id}`)} />
                    ))
              )}
            </div>
          </div>
        );
      })()}

      {/* Card panel — non-counselor view */}
      {!isCounselorView && <div className="rounded-xl shadow-card border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

        {/* Tabs */}
        <div className="flex items-end overflow-x-auto px-2 pt-1.5 gap-0.5 scrollbar-hide" style={{ borderBottom: '1px solid var(--color-border)' }}>
          {visibleTabs.map(tab => {
            const isActive = displayTab === tab.key;
            const cnt = counts[tab.key];
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium rounded-t-lg transition-all whitespace-nowrap flex-shrink-0"
                style={isActive
                  ? { background: 'var(--color-primary-surface)', color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)' }
                  : { color: 'var(--color-text-muted)' }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                {tab.label}
                {cnt > 0 && (
                  <span className="text-xs font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-1"
                    style={isActive
                      ? { background: 'var(--color-primary)', color: 'white' }
                      : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Reschedule Requests panel (replaces card list when on reschedule tab) ── */}
        {displayTab === 'reschedule' && (() => {
          const reschedCounts = { pending: reschedReqs.filter(r => r.status === 'pending').length, approved: reschedReqs.filter(r => r.status === 'approved').length, denied: reschedReqs.filter(r => r.status === 'denied').length };
          const reschedFiltered = reschedReqs.filter(r => r.status === reschedTab);
          function fmtRD(s?: string) { if (!s) return '—'; try { return new Date(s).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }); } catch { return '—'; } }
          function fmtRT(s?: string) { if (!s) return ''; try { return new Date(s).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }); } catch { return ''; } }
          function fmtAgo(s?: string) { if (!s) return ''; try { const h = Math.floor((Date.now() - new Date(s).getTime()) / 3600000); if (h < 1) return 'just now'; if (h < 24) return `${h}h ago`; return `${Math.floor(h/24)}d ago`; } catch { return ''; } }
          return (
            <div>
              {/* Sub-tabs: Pending / Approved / Denied */}
              <div className="flex items-end px-2 pt-1 gap-0.5" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                {(['pending', 'approved', 'denied'] as const).map(t => {
                  const isAct = reschedTab === t;
                  const cnt = reschedCounts[t];
                  return (
                    <button key={t} onClick={() => setReschedTab(t)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition whitespace-nowrap capitalize"
                      style={isAct ? { background: 'var(--color-primary-surface)', color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)' } : { color: 'var(--color-text-muted)' }}
                      onMouseEnter={e => { if (!isAct) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                      onMouseLeave={e => { if (!isAct) e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                      {t}
                      {cnt > 0 && <span className="text-xs font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-1" style={isAct ? { background: 'var(--color-primary)', color: 'white' } : { background: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>{cnt}</span>}
                    </button>
                  );
                })}
                <button onClick={loadReschedReqs} aria-label="Refresh" className="ml-auto mr-2 mb-1.5 flex items-center gap-1 text-xs transition" style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>
              {reschedLoading ? (
                <div className="flex items-center justify-center h-40 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
                </div>
              ) : reschedFiltered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-44 text-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--color-bg)' }}><CalendarDays size={18} style={{ color: 'var(--color-text-muted)' }} /></div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{reschedTab === 'pending' ? 'No pending requests' : `No ${reschedTab} requests`}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>All caught up!</p>
                </div>
              ) : (
                <div>
                  {reschedFiltered.map((req, i) => (
                    <button key={req._id} onClick={() => { setReschedSelected(req); setReschedActionMsg(null); }}
                      className="w-full text-left px-5 py-4 transition"
                      style={{ borderBottom: i < reschedFiltered.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div className="flex items-start gap-4">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold mt-0.5" style={{ background: 'var(--color-primary)' }}>
                          {(req.student_name || 'S').charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>{req.student_name || 'Unknown Student'}</p>
                          <div className="flex items-center gap-2 text-xs flex-wrap">
                            <span className="px-2 py-1 rounded-lg" style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                              {fmtRD(req.current_time)} {fmtRT(req.current_time)}
                            </span>
                            <ArrowRight size={12} style={{ color: 'var(--color-border)' }} />
                            <span className="px-2 py-1 rounded-lg font-medium"
                              style={req.status === 'pending' ? { background: 'var(--color-warning-surface)', color: 'var(--color-warning)' }
                                : req.status === 'approved' ? { background: 'var(--color-success-surface)', color: 'var(--color-success)' }
                                : { background: 'var(--color-bg)', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                              {fmtRD(req.requested_start)} {fmtRT(req.requested_start)}
                            </span>
                          </div>
                          {req.reason && <p className="text-xs mt-1.5 truncate max-w-xs" style={{ color: 'var(--color-text-muted)' }}>"{req.reason}"</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border capitalize"
                            style={req.status === 'pending' ? { background: 'var(--color-warning-surface)', color: 'var(--color-warning)', borderColor: 'var(--color-warning)' }
                              : req.status === 'approved' ? { background: 'var(--color-success-surface)', color: 'var(--color-success)', borderColor: 'var(--color-success)' }
                              : { background: 'var(--color-bg)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                            {req.status}
                          </span>
                          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{fmtAgo(req.created_at)}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                  <div className="px-5 py-3" style={{ background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)' }}>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      <strong style={{ color: 'var(--color-text-secondary)' }}>{reschedFiltered.length}</strong> {reschedTab} request{reschedFiltered.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Filter bar — hidden on reschedule tab */}
        {displayTab !== 'reschedule' && <div className="flex items-center gap-2 px-3 py-2.5 flex-wrap" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
          <div className="relative flex-1 min-w-[140px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search student…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg outline-none"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
            />
          </div>
          <div className="relative flex items-center">
            <ArrowUpDown size={11} className="absolute left-2.5 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="pl-7 pr-2 py-1.5 text-xs rounded-lg outline-none appearance-none cursor-pointer"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>
              <option value="date-asc">Soonest first</option>
              <option value="date-desc">Latest first</option>
              <option value="risk">Risk level</option>
            </select>
          </div>
          <button onClick={() => setRiskFilter(r => r === 'all' ? 'high' : 'all')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition whitespace-nowrap"
            style={riskFilter === 'high'
              ? { background: 'var(--color-danger-surface)', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }
              : { background: 'var(--color-surface)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
            <AlertTriangle size={11} /> High Risk
          </button>
          {!['COUNSELOR', 'PSYCHOLOGIST'].includes(user?.role?.toUpperCase()) && (
            <button onClick={() => setMineOnly(v => !v)}
              aria-label={mineOnly ? 'Show all appointments' : 'Show only my appointments'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition whitespace-nowrap"
              style={mineOnly
                ? { background: 'var(--color-primary-surface)', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }
                : { background: 'var(--color-surface)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
              Mine only
            </button>
          )}
          {['COUNSELOR', 'PSYCHOLOGIST'].includes(user?.role?.toUpperCase()) && (
            <div className="flex items-center rounded-lg border overflow-hidden ml-1" style={{ borderColor: 'var(--color-border)' }}>
              <button onClick={() => setViewMode('list')} title="List view"
                className="flex items-center justify-center w-7 h-7 transition"
                style={viewMode === 'list'
                  ? { background: 'var(--color-primary)', color: '#fff' }
                  : { background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>
                <LayoutList size={13} />
              </button>
              <button onClick={() => setViewMode('calendar')} title="Calendar view"
                className="flex items-center justify-center w-7 h-7 transition"
                style={viewMode === 'calendar'
                  ? { background: 'var(--color-primary)', color: '#fff' }
                  : { background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>
                <CalendarRange size={13} />
              </button>
            </div>
          )}
        </div>}

        {/* ── Calendar view ───────────────────────────────────────────────── */}
        {viewMode === 'calendar' && displayTab !== 'reschedule' && (
          <div className="p-4">
            <CalendarWeekView
              appointments={calAppts}
              loading={calLoading}
              colorBy="status"
              weekStart={calWeekStart}
              onPrevWeek={calPrevWeek}
              onNextWeek={calNextWeek}
              onToday={calToday}
            />
          </div>
        )}

        {viewMode === 'list' && displayTab !== 'reschedule' && (displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 text-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--color-bg)' }}>
              <CalendarDays size={18} style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {filtered.length === 0 ? 'No sessions here' : 'No matches'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {filtered.length === 0
                ? (activeTab === 'active' ? 'No confirmed sessions at the moment.' : activeTab === 'requests' ? 'No pending appointment requests.' : `No ${TABS.find(t => t.key === activeTab)?.label.toLowerCase()} sessions.`)
                : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          <>
            <div className="p-4 space-y-3">
              {paginatedApts.map((apt) => {
                const cfg = STATUS_STYLE[apt.status] ?? { label: apt.status, bg: 'var(--color-bg)', text: 'var(--color-text-muted)', border: 'var(--color-border)' };
                const isEval = apt.status === 'EVALUATION';
                const isConfirmed = ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN'].includes(apt.status);
                const isPendingStudentApproval = apt.status === 'PENDING_STUDENT_APPROVAL';
                const isHighRisk = apt.risk_level && ['RED', 'CRITICAL'].includes(apt.risk_level.toUpperCase());
                const aptId = apt.appointment_id;

                const cardBorderColor = isHighRisk ? 'var(--color-danger)'
                  : isEval ? 'var(--color-warning)'
                  : isPendingStudentApproval ? 'var(--color-primary)'
                  : isConfirmed ? 'var(--color-success)'
                  : 'var(--color-border)';
                const cardBg = isHighRisk ? 'rgba(239,68,68,0.04)'
                  : isEval ? 'rgba(245,158,11,0.04)'
                  : isPendingStudentApproval ? 'var(--color-primary-surface)'
                  : 'var(--color-surface)';

                return (
                  <div key={aptId} className="rounded-xl border p-4 transition-colors"
                    style={{ border: `1px solid ${cardBorderColor}`, background: cardBg }}>
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium border"
                            style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}>
                            {cfg.label}
                          </span>
                          {apt.risk_level && apt.risk_level !== 'GREEN' && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold border"
                              style={{ ...riskStyle(apt.risk_level), borderColor: 'transparent' }}>
                              ⚠ {apt.risk_level}
                            </span>
                          )}
                        </div>

                        <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{apt.student_name}</p>

                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                          {fmtPurpose(apt.purpose)}
                          {apt.concern && <span style={{ color: 'var(--color-text-muted)' }}> · &ldquo;{apt.concern}&rdquo;</span>}
                        </p>

                        {effDate(apt) && (
                          <div className="flex items-center gap-3 mt-1 text-xs flex-wrap" style={{ color: 'var(--color-text-secondary)' }}>
                            <span className="flex items-center gap-1">
                              <CalendarDays size={11} />
                              {apt.scheduled_start
                                ? fmtDate(apt.scheduled_start) + ' ' + fmtTime(apt.scheduled_start)
                                : fmtDate(apt.preferred_date) + (apt.preferred_time ? ` ${fmtTime(apt.preferred_date, apt.preferred_time)}` : '')}
                            </span>
                            <span>{fmtMethod(apt.method)}</span>
                          </div>
                        )}

                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {apt.student_email}
                          {apt.student_id_number && <span className="ml-2">· {apt.student_id_number}</span>}
                        </p>

                        {canManage && (
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <button onClick={() => setDetailAppt(apt)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition"
                              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              <Eye size={11} /> View
                            </button>

                            {apt.status === 'REQUESTED' && (
                              <>
                                <button onClick={() => doAction(aptId, 'confirm')} disabled={actioningId === aptId}
                                  className="flex items-center gap-1 px-2.5 py-1 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 hover:opacity-90"
                                  style={{ background: 'var(--color-success)' }}>
                                  {actioningId === aptId ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                                  Accept
                                </button>
                                <button onClick={() => doAction(aptId, 'deny')} disabled={actioningId === aptId}
                                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition disabled:opacity-50"
                                  style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-danger-surface)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                  {actioningId === aptId ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                                  Decline
                                </button>
                              </>
                            )}

                            {isConfirmed && !effDate(apt) && (
                              <button onClick={() => { setSchedTarget(apt); setSchedDate(''); setSchedTime(''); setSchedOffice(''); setSchedMethod('in_person'); setSchedMsg(null); setSchedMode('slots'); setSchedMySlots([]); }}
                                className="flex items-center gap-1 px-2.5 py-1 text-white text-xs font-semibold rounded-lg transition hover:opacity-90"
                                style={{ background: 'var(--color-primary)' }}>
                                <CalendarDays size={11} /> Set Schedule
                              </button>
                            )}

                            {isPendingStudentApproval && (
                              <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
                                <CheckCircle size={11} /> Schedule proposed — waiting for student
                              </span>
                            )}

                            {apt.meeting_link && isConfirmed && (
                              <a href={apt.meeting_link} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition font-semibold"
                                style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)', borderColor: 'var(--color-success)' }}>
                                <Video size={11} /> Join
                              </a>
                            )}

                            {isConfirmed && !isPendingStudentApproval && (
                              <>
                                {['COUNSELOR', 'PSYCHOLOGIST'].includes(user?.role?.toUpperCase()) && (
                                  <a href={`/counselor/session/${aptId}`}
                                    className="flex items-center gap-1 px-2.5 py-1 text-white text-xs font-semibold rounded-lg transition hover:opacity-90"
                                    style={{ background: 'var(--color-primary)' }}>
                                    <NotebookPen size={11} /> Conduct Session
                                  </a>
                                )}
                                {apt.case_id && !['COUNSELOR', 'PSYCHOLOGIST'].includes(user?.role?.toUpperCase()) && (
                                  <a href={`/cases/${apt.case_id}?tab=session-notes`}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition"
                                    style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
                                    <NotebookPen size={11} /> Session Notes
                                  </a>
                                )}
                                {!['COUNSELOR', 'PSYCHOLOGIST'].includes(user?.role?.toUpperCase()) && (
                                <button onClick={() => doAction(aptId, 'set-evaluation')} disabled={actioningId === aptId}
                                  className="flex items-center gap-1 px-2.5 py-1 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 hover:opacity-90"
                                  style={{ background: 'var(--color-warning)' }}>
                                  {actioningId === aptId ? <Loader2 size={11} className="animate-spin" /> : <Star size={11} />}
                                  Session Done
                                </button>
                                )}
                                <button onClick={() => { setNoShowTarget(apt); setNoShowReason(''); }}
                                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition"
                                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-danger)'; e.currentTarget.style.color = 'var(--color-danger)'; e.currentTarget.style.background = 'var(--color-danger-surface)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent'; }}>
                                  No Show
                                </button>
                              </>
                            )}

                            {isEval && apt.case_id && (
                              <a href={`/cases/${apt.case_id}?tab=session-notes`}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition"
                                style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
                                <NotebookPen size={11} /> Write Note
                              </a>
                            )}

                            {isEval && (
                              pendingAction?.aptId === aptId ? (
                                <div className="flex items-end gap-2">
                                  <div>
                                    <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>Referral Notes</p>
                                    <textarea rows={1} value={pendingAction.notes}
                                      onChange={e => setPendingAction(p => p ? { ...p, notes: e.target.value } : p)}
                                      placeholder="Optional notes…"
                                      className="w-40 rounded-lg px-2 py-1 text-xs resize-none outline-none"
                                      style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }} />
                                  </div>
                                  <button onClick={() => doAction(aptId, 'set-referral', { notes: pendingAction.notes })} disabled={actioningId === aptId}
                                    className="px-2.5 py-1 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 hover:opacity-90"
                                    style={{ background: 'var(--color-primary)' }}>
                                    {actioningId === aptId ? <Loader2 size={11} className="animate-spin" /> : 'Confirm'}
                                  </button>
                                  <button onClick={() => setPendingAction(null)}
                                    className="px-2.5 py-1 border text-xs rounded-lg transition"
                                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>Cancel</button>
                                </div>
                              ) : (
                                <>
                                  <button onClick={() => { setFollowUpTarget(apt); setFollowUpDate(''); setFollowUpTime(''); setFollowUpOffice(''); setFollowUpNotes(''); setFollowUpMsg(null); }}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition"
                                    style={{ background: '#EEF2FF', color: '#4F46E5', borderColor: '#A5B4FC' }}>
                                    <RefreshCw size={11} /> Schedule Follow-Up
                                  </button>
                                  <button onClick={() => setPendingAction({ aptId, action: 'referral', notes: '' })}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition"
                                    style={{ background: '#F5F3FF', color: '#7C3AED', borderColor: '#C4B5FD' }}>
                                    <ExternalLink size={11} /> Referral
                                  </button>
                                  <button onClick={() => doAction(aptId, 'complete')} disabled={actioningId === aptId}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition disabled:opacity-50"
                                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                    {actioningId === aptId ? <Loader2 size={11} className="animate-spin" /> : <Archive size={11} />}
                                    Complete & Close
                                  </button>
                                </>
                              )
                            )}

                            {actionMsg?.id === aptId && !pendingAction && (
                              <p className="text-xs" style={{ color: actionMsg.type === 'ok' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                {actionMsg.text}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3.5 flex items-center justify-between gap-4" style={{ background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Showing <strong style={{ color: 'var(--color-text-secondary)' }}>
                  {displayed.length === 0 ? 0 : (apptPage - 1) * APPT_PER_PAGE + 1}–{Math.min(apptPage * APPT_PER_PAGE, displayed.length)}
                </strong> of <strong style={{ color: 'var(--color-text-secondary)' }}>{displayed.length}</strong> session{displayed.length !== 1 ? 's' : ''}
                {displayed.length !== filtered.length && <span style={{ color: 'var(--color-text-muted)' }}> (filtered from {filtered.length})</span>}
              </p>
              {totalApptPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={apptPage <= 1}
                    onClick={() => setApptPage(p => p - 1)}
                    className="p-1.5 rounded-lg transition text-xs"
                    style={{ color: apptPage <= 1 ? 'var(--color-text-muted)' : 'var(--color-text-primary)', background: 'transparent', cursor: apptPage <= 1 ? 'not-allowed' : 'pointer' }}
                    aria-label="Previous page">
                    <ChevronLeft size={14} />
                  </button>
                  <div className="flex items-center gap-1 text-xs tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                    <input
                      type="number" min={1} max={totalApptPages}
                      value={apptPageInput}
                      onChange={e => setApptPageInput(e.target.value)}
                      onBlur={() => goToApptPage(apptPageInput)}
                      onKeyDown={e => { if (e.key === 'Enter') goToApptPage(apptPageInput); }}
                      className="text-center rounded-lg outline-none tabular-nums"
                      style={{ width: '2.5rem', padding: '2px 4px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: '0.75rem' }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                      onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                    />
                    <span style={{ color: 'var(--color-text-muted)' }}>/ {totalApptPages}</span>
                  </div>
                  <button
                    disabled={apptPage >= totalApptPages}
                    onClick={() => setApptPage(p => p + 1)}
                    className="p-1.5 rounded-lg transition text-xs"
                    style={{ color: apptPage >= totalApptPages ? 'var(--color-text-muted)' : 'var(--color-text-primary)', background: 'transparent', cursor: apptPage >= totalApptPages ? 'not-allowed' : 'pointer' }}
                    aria-label="Next page">
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </>
        ))}
      </div>}

      {/* ── Reschedule detail modal ── */}
      {reschedSelected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setReschedSelected(null)} />
          <div className="relative rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in" style={{ background: 'var(--color-surface)' }}>
            <div className="h-1.5 w-full" style={{ background: reschedSelected.status === 'pending' ? 'var(--color-warning)' : reschedSelected.status === 'approved' ? 'var(--color-success)' : 'var(--color-border)' }} />
            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Reschedule Request</p>
                  <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{reschedSelected.student_name || 'Unknown Student'}</h3>
                  {reschedSelected.appointment_type && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{reschedSelected.appointment_type.replace(/_/g, ' ')}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border capitalize"
                    style={reschedSelected.status === 'pending' ? { background: 'var(--color-warning-surface)', color: 'var(--color-warning)', borderColor: 'var(--color-warning)' }
                      : reschedSelected.status === 'approved' ? { background: 'var(--color-success-surface)', color: 'var(--color-success)', borderColor: 'var(--color-success)' }
                      : { background: 'var(--color-bg)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                    {reschedSelected.status}
                  </span>
                  <button onClick={() => setReschedSelected(null)} aria-label="Close" className="p-1.5 rounded-lg transition"
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <X size={16} style={{ color: 'var(--color-text-muted)' }} />
                  </button>
                </div>
              </div>
              <div className="rounded-xl p-4 mb-5" style={{ background: 'var(--color-bg)' }}>
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>Schedule Change</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-lg px-3 py-2.5 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>Current</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{reschedSelected.current_time ? new Date(reschedSelected.current_time).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{reschedSelected.current_time ? new Date(reschedSelected.current_time).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }) : ''}</p>
                  </div>
                  <ArrowRight size={16} style={{ color: 'var(--color-border)', flexShrink: 0 }} />
                  <div className="flex-1 rounded-lg px-3 py-2.5 border"
                    style={reschedSelected.status === 'approved' ? { background: 'var(--color-success-surface)', borderColor: 'var(--color-success)' }
                      : reschedSelected.status === 'denied' ? { background: 'var(--color-bg)', borderColor: 'var(--color-border)' }
                      : { background: 'var(--color-warning-surface)', borderColor: 'var(--color-warning)' }}>
                    <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>Requested</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{new Date(reschedSelected.requested_start).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{new Date(reschedSelected.requested_start).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                  </div>
                </div>
              </div>
              {reschedSelected.reason && (
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Reason</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>"{reschedSelected.reason}"</p>
                </div>
              )}
              {reschedActionMsg && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm mb-4 border"
                  style={reschedActionMsg.type === 'ok' ? { background: 'var(--color-success-surface)', color: 'var(--color-success)', borderColor: 'var(--color-success)' } : { background: 'var(--color-danger-surface)', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
                  {reschedActionMsg.type === 'ok' ? <Check size={14} /> : <X size={14} />} {reschedActionMsg.text}
                </div>
              )}
              {reschedSelected.status === 'pending' ? (
                <div className="flex gap-2">
                  <button onClick={() => doReschedAction(reschedSelected._id, 'deny')} disabled={reschedActioning}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl transition disabled:opacity-40 border"
                    style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-danger-surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    {reschedActioning ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Deny
                  </button>
                  <button onClick={() => doReschedAction(reschedSelected._id, 'approve')} disabled={reschedActioning}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition disabled:opacity-40 hover:opacity-90"
                    style={{ background: 'var(--color-primary)' }}>
                    {reschedActioning ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve
                  </button>
                </div>
              ) : (
                <button onClick={() => setReschedSelected(null)}
                  className="w-full px-4 py-2.5 text-sm font-medium rounded-xl transition border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {detailAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in" style={{ background: 'var(--color-surface)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Session Details</h3>
              <button onClick={() => setDetailAppt(null)} className="p-1.5 rounded-lg transition"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X size={14} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg p-3" style={{ background: 'var(--color-bg)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Student</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{detailAppt.student_name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{detailAppt.student_email}</p>
                  {detailAppt.student_id_number && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{detailAppt.student_id_number}</p>}
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--color-bg)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Status</p>
                  {(() => { const s = STATUS_STYLE[detailAppt.status] ?? { label: detailAppt.status, bg: 'var(--color-bg)', text: 'var(--color-text-muted)', border: 'var(--color-border)' }; return (
                    <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-medium border" style={{ background: s.bg, color: s.text, borderColor: s.border }}>{s.label}</span>
                  ); })()}
                </div>
              </div>
              {[
                { title: 'Date & Time', content: detailAppt.scheduled_start ? `${fmtDate(detailAppt.scheduled_start)} ${fmtTime(detailAppt.scheduled_start)}` : `${fmtDate(detailAppt.preferred_date)} ${fmtTime(detailAppt.preferred_date, detailAppt.preferred_time)}` },
              ].map(({ title, content }) => (
                <div key={title} className="rounded-lg p-3" style={{ background: 'var(--color-bg)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>{title}</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{content}</p>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg p-3" style={{ background: 'var(--color-bg)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Session Type</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{fmtPurpose(detailAppt.purpose)}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--color-bg)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Mode</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{fmtMethod(detailAppt.method)}</p>
                </div>
              </div>
              {detailAppt.concern && (
                <div className="rounded-lg p-3" style={{ background: 'var(--color-bg)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Concern</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{detailAppt.concern}</p>
                </div>
              )}
              {detailAppt.risk_level && detailAppt.risk_level !== 'GREEN' && (
                <div className="rounded-lg px-3 py-2 flex items-center gap-2 border" style={{ ...riskStyle(detailAppt.risk_level), borderColor: 'transparent' }}>
                  <AlertCircle size={14} />
                  <span className="text-xs font-semibold">Risk Level: {detailAppt.risk_level}</span>
                </div>
              )}
              {detailAppt.meeting_link && (
                <a href={detailAppt.meeting_link} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition border"
                  style={{ background: 'var(--color-success-surface)', borderColor: 'var(--color-success)', color: 'var(--color-success)' }}>
                  <Video size={14} /> Join Session
                </a>
              )}

              {/* IC Triage Summary */}
              {intakeSummary && (intakeSummary.phq9_score != null || intakeSummary.gad7_score != null || intakeSummary.triage_decision) && (
                <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide" style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                    IC Triage Summary
                  </p>
                  <div className="p-3 space-y-2">
                    {(intakeSummary.phq9_score != null || intakeSummary.gad7_score != null) && (
                      <div className="grid grid-cols-2 gap-2">
                        {intakeSummary.phq9_score != null && (
                          <div className="rounded-lg p-2 text-center" style={{ background: 'var(--color-bg)' }}>
                            <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>PHQ-9</p>
                            <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{intakeSummary.phq9_score}<span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>/27</span></p>
                          </div>
                        )}
                        {intakeSummary.gad7_score != null && (
                          <div className="rounded-lg p-2 text-center" style={{ background: 'var(--color-bg)' }}>
                            <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>GAD-7</p>
                            <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{intakeSummary.gad7_score}<span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>/21</span></p>
                          </div>
                        )}
                      </div>
                    )}
                    {intakeSummary.triage_decision && (
                      <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        <span className="font-semibold" style={{ color: 'var(--color-text-muted)' }}>Decision: </span>
                        {intakeSummary.triage_decision === 'ENDORSE_CC' && 'Endorsed to Counselor (CC)'}
                        {intakeSummary.triage_decision === 'ENDORSE_CP' && 'Endorsed to Psychologist (CP)'}
                        {intakeSummary.triage_decision === 'CLOSE_AT_INTAKE' && 'Closed at Intake'}
                      </div>
                    )}
                    {intakeSummary.endorsement_notes && (
                      <div className="rounded-lg p-2" style={{ background: 'var(--color-bg)' }}>
                        <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>IC Notes</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{intakeSummary.endorsement_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PHQ-4 Pre-Screen */}
              {intakePacket?.phq4_summary && (
                <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide" style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                    PHQ-4 Pre-Screen
                  </p>
                  <div className="grid grid-cols-3 gap-2 p-3">
                    {[
                      { l: 'PHQ-2', s: intakePacket.phq4_summary.phq2_score, max: 6,  risk: intakePacket.phq4_summary.phq2_at_risk },
                      { l: 'GAD-2', s: intakePacket.phq4_summary.gad2_score, max: 6,  risk: intakePacket.phq4_summary.gad2_at_risk },
                      { l: 'Total', s: intakePacket.phq4_summary.total_score, max: 12, risk: intakePacket.phq4_summary.total_score >= 6 },
                    ].map(x => (
                      <div key={x.l} className="rounded-lg p-2 text-center"
                        style={{ background: x.risk ? 'var(--color-danger-surface)' : 'var(--color-success-surface)' }}>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{x.l}</p>
                        <p className="text-base font-bold" style={{ color: x.risk ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                          {x.s}<span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>/{x.max}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {intakePacket?.icf?.presenting_concern && (
                <div className="rounded-lg p-3" style={{ background: 'var(--color-bg)' }}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Presenting Concern (ICF)</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{intakePacket.icf.presenting_concern}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 flex justify-end" style={{ borderTop: '1px solid var(--color-border)' }}>
              <button onClick={() => setDetailAppt(null)}
                className="px-4 py-2 text-sm rounded-lg border transition"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── No Show Modal ── */}
      {noShowTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in" style={{ background: 'var(--color-surface)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Mark as No Show</h3>
              <button onClick={() => setNoShowTarget(null)} className="p-1.5 rounded-lg transition"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X size={14} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Confirm that <strong>{noShowTarget.student_name}</strong> did not attend this session.
              </p>
              {(noShowTarget.consecutive_no_shows ?? 0) >= 2 && (
                <div className="rounded-xl px-3 py-2.5 text-xs leading-relaxed flex items-start gap-2" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger-text)' }}>
                  <AlertCircle size={13} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
                  <span><strong>This will be their 3rd consecutive no-show.</strong> Confirming will automatically terminate the case per CPS protocol.</span>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Remarks <span className="font-normal normal-case" style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
                </label>
                <textarea value={noShowReason} onChange={e => setNoShowReason(e.target.value)}
                  rows={2} placeholder="Any notes about this no-show…"
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none transition resize-none"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                  onFocus={onFIn} onBlur={onFOut} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setNoShowTarget(null)}
                  className="flex-1 px-4 py-2 border text-sm rounded-lg transition"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  Cancel
                </button>
                <button disabled={submittingNoShow}
                  onClick={async () => {
                    setSubmittingNoShow(true);
                    const token = localStorage.getItem('token');
                    const r = await fetch(api(`/api/appointments/${noShowTarget.appointment_id}/mark-no-show`), {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ reason: noShowReason }),
                    });
                    if (r.ok) {
                      const d = await r.json();
                      setActionMsg({ id: noShowTarget.appointment_id, type: 'ok', text: 'Marked as No Show.' });
                      setPendingAction(null);
                      const capturedTarget = noShowTarget;
                      setNoShowTarget(null); setNoShowReason(''); setSubmittingNoShow(false);
                      if (d.auto_terminated) {
                        setNoShowTermAlert({ caseId: capturedTarget.case_id ?? null, studentName: capturedTarget.student_name ?? 'Student' });
                      } else {
                        setNoShowRebookPrompt({
                          appointmentId: capturedTarget.appointment_id,
                          studentName: capturedTarget.student_name ?? 'Student',
                          consecutiveNoShows: d.consecutive_no_shows ?? 1,
                        });
                      }
                      setTimeout(() => load(), 900);
                      return;
                    } else {
                      const e = await r.json();
                      setActionMsg({ id: noShowTarget.appointment_id, type: 'err', text: e.error || 'Failed.' });
                    }
                    setNoShowTarget(null); setNoShowReason(''); setSubmittingNoShow(false);
                  }}
                  className="flex-1 px-4 py-2 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90"
                  style={{ background: 'var(--color-danger)' }}>
                  {submittingNoShow && <Loader2 size={13} className="animate-spin" />}
                  Confirm No Show
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── No-Show Termination Alert ── */}
      {noShowTermAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in" style={{ background: 'var(--color-surface)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-danger)', background: 'var(--color-danger-surface)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-danger)' }}>Case Flagged for Termination</h3>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <strong>{noShowTermAlert.studentName}</strong> has now missed 3 consecutive sessions.
                Per CPS protocol, this case has been flagged for administrative termination.
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Go to the case page to review and confirm the closure. The student will be notified when you confirm.
              </p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setNoShowTermAlert(null)}
                  className="flex-1 px-4 py-2 border text-sm rounded-lg transition"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  Dismiss
                </button>
                {noShowTermAlert.caseId && (
                  <a href={`/cases/${noShowTermAlert.caseId}`} onClick={() => setNoShowTermAlert(null)}
                    className="flex-1 px-4 py-2 text-white text-sm font-medium rounded-lg transition text-center hover:opacity-90"
                    style={{ background: 'var(--color-danger)' }}>
                    View Case
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── No-Show Rebook Prompt ── */}
      {noShowRebookPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in" style={{ background: 'var(--color-surface)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Notify Student to Rebook</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{noShowRebookPrompt.studentName}</p>
              </div>
              <button onClick={() => { setNoShowRebookPrompt(null); setRebookResult(null); }} className="p-1.5 rounded-lg transition"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X size={14} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {rebookResult ? (
                <>
                  <div className="rounded-xl p-4 text-center" style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-success)' }}>Notification sent</p>
                    <p className="text-xs" style={{ color: 'var(--color-success)' }}>
                      {noShowRebookPrompt.studentName} must rebook within {rebookResult.days} day{rebookResult.days !== 1 ? 's' : ''} — by {new Date(rebookResult.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                    </p>
                  </div>
                  <button onClick={() => { setNoShowRebookPrompt(null); setRebookResult(null); }}
                    className="w-full px-4 py-2 text-sm font-medium rounded-lg transition hover:opacity-90"
                    style={{ background: 'var(--color-primary)', color: '#fff' }}>
                    Done
                  </button>
                </>
              ) : (
                <>
                  <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)', color: 'var(--color-warning)' }}>
                    {noShowRebookPrompt.consecutiveNoShows > 1
                      ? `This is ${noShowRebookPrompt.studentName}'s ${noShowRebookPrompt.consecutiveNoShows}${noShowRebookPrompt.consecutiveNoShows === 2 ? 'nd' : 'rd'} consecutive no-show.`
                      : `${noShowRebookPrompt.studentName} missed today's session.`}
                    {' '}Sending a rebook notification lets them book a new slot within the allowed window.
                  </div>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    The student will receive a notification with a deadline to rebook — <strong>7 days</strong> for HIGH/CRITICAL risk cases, <strong>14 days</strong> for all others.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => { setNoShowRebookPrompt(null); setRebookResult(null); }}
                      className="flex-1 px-4 py-2 border text-sm rounded-lg transition"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      Skip
                    </button>
                    <button disabled={submittingRebook}
                      onClick={async () => {
                        setSubmittingRebook(true);
                        const token = localStorage.getItem('token');
                        const r = await fetch(api(`/api/appointments/${noShowRebookPrompt.appointmentId}/rebook-after-noshow`), {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        });
                        if (r.ok) {
                          const d = await r.json();
                          setRebookResult({ deadline: d.rebook_deadline, days: d.days });
                        } else {
                          setNoShowRebookPrompt(null);
                        }
                        setSubmittingRebook(false);
                      }}
                      className="flex-1 px-4 py-2 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90"
                      style={{ background: 'var(--color-primary)' }}>
                      {submittingRebook && <Loader2 size={13} className="animate-spin" />}
                      Notify Student
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Follow-Up Modal ── */}
      {followUpTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in" style={{ background: 'var(--color-surface)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Schedule Follow-Up Session</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{followUpTarget.student_name}</p>
              </div>
              <button onClick={() => setFollowUpTarget(null)} className="p-1.5 rounded-lg transition"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X size={14} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs rounded-lg px-3 py-2 border" style={{ color: '#4F46E5', background: '#EEF2FF', borderColor: '#A5B4FC' }}>
                A new confirmed session will be created and linked to the same case. The student will see it in their upcoming sessions.
              </p>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Date <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input type="date" value={followUpDate} onChange={e => { setFollowUpDate(e.target.value); setFollowUpTime(''); }} className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
              </div>
              {followUpDate && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Time <span style={{ color: 'var(--color-danger)' }}>*</span>
                    {followUpLoadingSlots && <span className="font-normal normal-case ml-1" style={{ color: 'var(--color-text-muted)' }}>Loading…</span>}
                  </label>
                  {!followUpLoadingSlots && followUpSlots.length === 0 && (
                    <p className="text-xs py-2" style={{ color: 'var(--color-text-muted)' }}>No available slots on this date. Check your availability settings or pick another day.</p>
                  )}
                  {!followUpLoadingSlots && followUpSlots.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {followUpSlots.map(t => {
                        const [h, m] = t.split(':').map(Number);
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        const hr = h % 12 || 12;
                        const label = `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
                        return (
                          <button key={t} type="button" onClick={() => setFollowUpTime(t)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                            style={{
                              background: followUpTime === t ? 'var(--color-primary)' : 'var(--color-bg)',
                              color: followUpTime === t ? '#fff' : 'var(--color-text-primary)',
                              border: `1px solid ${followUpTime === t ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            }}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Office / Location <span className="font-normal normal-case" style={{ color: 'var(--color-text-muted)' }}>(optional)</span></label>
                <input type="text" value={followUpOffice} onChange={e => setFollowUpOffice(e.target.value)}
                  placeholder="e.g. Room 203, CPS Office" className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Notes <span className="font-normal normal-case" style={{ color: 'var(--color-text-muted)' }}>(optional)</span></label>
                <textarea value={followUpNotes} onChange={e => setFollowUpNotes(e.target.value)}
                  rows={2} placeholder="Session notes or focus areas…"
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none transition resize-none"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                  onFocus={onFIn} onBlur={onFOut} />
              </div>
              {followUpMsg && (
                <p className="text-xs" style={{ color: followUpMsg.type === 'ok' ? 'var(--color-success)' : 'var(--color-danger)' }}>{followUpMsg.text}</p>
              )}
              <div className="flex gap-2">
                <button onClick={() => setFollowUpTarget(null)}
                  className="flex-1 px-4 py-2 border text-sm rounded-lg transition"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  Cancel
                </button>
                <button onClick={doFollowUp} disabled={submittingFollowUp || !followUpDate || !followUpTime}
                  className="flex-1 px-4 py-2 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90"
                  style={{ background: '#4F46E5' }}>
                  {submittingFollowUp && <Loader2 size={13} className="animate-spin" />}
                  Schedule Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Set Schedule Modal ── */}
      {schedTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in" style={{ background: 'var(--color-surface)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Set Session Schedule</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{schedTarget.student_name}</p>
              </div>
              <button onClick={() => setSchedTarget(null)} className="p-1.5 rounded-lg transition"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X size={14} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>

            {/* Mode toggle */}
            <div className="flex" style={{ borderBottom: '1px solid var(--color-border)' }}>
              {(['slots', 'manual'] as const).map(m => {
                const active = schedMode === m;
                return (
                  <button key={m} onClick={() => setSchedMode(m)}
                    className="flex-1 py-2.5 text-xs font-semibold transition"
                    style={active
                      ? { color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)', background: 'var(--color-primary-surface)' }
                      : { color: 'var(--color-text-muted)' }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                    {m === 'slots' ? 'My Available Slots' : 'Manual Entry'}
                  </button>
                );
              })}
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Endorsed session for {schedTarget.student_name}. Proposing a schedule will notify the student for confirmation.
              </p>

              {schedMode === 'slots' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Pick a date</label>
                    <input type="date" value={schedDate}
                      onChange={e => { setSchedDate(e.target.value); setSchedTime(''); loadMySlots(e.target.value); }}
                      min={new Date().toISOString().split('T')[0]}
                      className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
                  </div>
                  {schedDate && (
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Available slots</label>
                      {loadingMySlots ? (
                        <div className="flex items-center gap-2 text-xs py-3" style={{ color: 'var(--color-text-muted)' }}>
                          <Loader2 size={12} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading your slots…
                        </div>
                      ) : schedMySlots.length === 0 ? (
                        <p className="text-xs py-2" style={{ color: 'var(--color-text-muted)' }}>No available slots on this day. Try another date or use Manual Entry.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {schedMySlots.map(s => {
                            const sel = schedTime === s.time;
                            return (
                              <button key={s.time}
                                onClick={() => { setSchedTime(s.time); if (s.method) setSchedMethod(s.method === 'online' ? 'google_meet' : 'in_person'); }}
                                className="py-2 rounded-lg text-xs font-medium border transition"
                                style={sel
                                  ? { background: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)' }
                                  : { background: 'var(--color-surface)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}
                                onMouseEnter={e => { if (!sel) e.currentTarget.style.borderColor = 'var(--color-success)'; }}
                                onMouseLeave={e => { if (!sel) e.currentTarget.style.borderColor = 'var(--color-border)'; }}>
                                {s.time}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Date</label>
                    <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Time</label>
                    <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Method</label>
                <select value={schedMethod} onChange={e => setSchedMethod(e.target.value)} className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut}>
                  <option value="in_person">Face to Face</option>
                  <option value="google_meet">Google Meet</option>
                  <option value="zoom">Zoom</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Room / Office <span style={{ color: 'var(--color-text-muted)' }}>(optional)</span></label>
                <input type="text" value={schedOffice} onChange={e => setSchedOffice(e.target.value)}
                  placeholder="e.g. CPS Room 301" className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
              </div>
              {schedMsg && (
                <p className="text-xs" style={{ color: schedMsg.type === 'ok' ? 'var(--color-success)' : 'var(--color-danger)' }}>{schedMsg.text}</p>
              )}
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => setSchedTarget(null)}
                className="flex-1 px-4 py-2 border text-sm rounded-lg transition"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                Cancel
              </button>
              <button onClick={doSchedule} disabled={submittingSched || !schedDate || !schedTime}
                className="flex-1 px-4 py-2 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                {submittingSched && <Loader2 size={13} className="animate-spin" />}
                Propose Schedule
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardPageWrapper>
  );
}
