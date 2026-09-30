'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import {
  Loader2, CalendarDays, User, CheckCircle, XCircle, Clock,
  AlertCircle, History, Plus, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

const ROLE_LABEL: Record<string, string> = {
  COUNSELOR:    'Counselor',
  PSYCHOLOGIST: 'Psychologist',
  IC:           'Intake Counselor',
  CASE_MANAGER: 'Case Manager',
};

interface Appointment {
  _id: string;
  status: string;
  purpose?: string;
  preferred_method?: string;
  scheduled_start?: string;
  requested_start?: string;
  counselor_name?: string;
  counselor_role?: string;
  evaluation?: unknown;
}

const PAST_STATUSES = new Set(['COMPLETED', 'FOLLOW_UP', 'NO_SHOW', 'CANCELLED', 'EVALUATION']);

const PURPOSE_LABEL: Record<string, string> = {
  intake_interview:   'Intake Interview',
  individual_session: 'Individual Session',
  group_session:      'Group Session',
  follow_up:          'Follow-up Session',
  crisis:             'Crisis Intervention',
  walk_in:            'Walk-in Session',
  others:             'General Inquiry',
};

const STATUS_CFG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  COMPLETED:  { label: 'Completed',   icon: <CheckCircle size={12} />, color: 'var(--color-success)',  bg: 'var(--color-success-surface)'  },
  FOLLOW_UP:  { label: 'Follow-up',   icon: <ChevronRight size={12}/>, color: '#7C3AED',               bg: '#F5F3FF'                       },
  EVALUATION: { label: 'Rated',       icon: <CheckCircle size={12} />, color: 'var(--color-success)',  bg: 'var(--color-success-surface)'  },
  NO_SHOW:    { label: 'No-show',     icon: <XCircle size={12} />,     color: 'var(--color-danger)',   bg: 'var(--color-danger-surface)'   },
  CANCELLED:  { label: 'Cancelled',   icon: <XCircle size={12} />,     color: 'var(--color-text-muted)', bg: 'var(--color-bg)'             },
};

function fmtDate(d?: string) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-PH', {
      timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return d; }
}

function fmtMethod(m?: string) {
  if (!m) return '';
  if (m === 'in-person' || m === 'in_person') return 'Face to face';
  if (m === 'online' || m === 'zoom') return 'Online';
  return m;
}

export default function CounselingHistoryPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(api('/api/appointments/my-appointments'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(d => {
        const all: Appointment[] = Array.isArray(d) ? d : (d.appointments ?? []);
        const past = all
          .filter(a => PAST_STATUSES.has(a.status))
          .sort((a, b) => {
            const da = new Date(a.scheduled_start || a.requested_start || 0).getTime();
            const db2 = new Date(b.scheduled_start || b.requested_start || 0).getTime();
            return db2 - da;
          });
        setAppointments(past);
      })
      .catch(() => setError('Could not load your session history.'))
      .finally(() => setLoading(false));
  }, []);

  const completed = appointments.filter(a => ['COMPLETED', 'EVALUATION', 'FOLLOW_UP'].includes(a.status));
  const lastSession = completed[0];

  return (
    <DashboardPageWrapper
      title="My Counseling History"
      subtitle="A record of your past sessions with CPS"
      requiredRoles={['STUDENT']}
      actions={
        <Link href="/book-appointment" className="btn-primary !min-h-11 !px-5 !text-sm">
          <Plus size={16} /> Request a new session
        </Link>
      }
    >
      <div className="max-w-3xl space-y-5">

        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Total Sessions</p>
            {loading
              ? <div className="h-6 w-8 rounded animate-pulse" style={{ background: 'var(--color-border)' }} />
              : <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{completed.length}</p>
            }
          </div>
          <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Last Session</p>
            {loading
              ? <div className="h-6 w-28 rounded animate-pulse" style={{ background: 'var(--color-border)' }} />
              : <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {lastSession ? fmtDate(lastSession.scheduled_start || lastSession.requested_start) : '—'}
                </p>
            }
          </div>
        </div>

        {/* Session list */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
            <History size={14} style={{ color: 'var(--color-text-muted)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Session History</h2>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center gap-2 px-4 py-6 text-sm" style={{ color: 'var(--color-danger)' }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {!loading && !error && appointments.length === 0 && (
            <div className="px-4 py-10 text-center space-y-2">
              <CalendarDays size={28} className="mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>No past sessions yet</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Your completed sessions will appear here.</p>
            </div>
          )}

          {!loading && !error && appointments.map((a, i) => {
            const dt = a.scheduled_start || a.requested_start;
            const cfg = STATUS_CFG[a.status] ?? {
              label: a.status, icon: <Clock size={12} />,
              color: 'var(--color-text-muted)', bg: 'var(--color-bg)',
            };
            return (
              <div key={a._id}
                className="flex items-start gap-3 px-4 py-3.5"
                style={{
                  borderBottom: i < appointments.length - 1 ? '1px solid var(--color-border)' : undefined,
                  background: 'var(--color-surface)',
                }}>
                {/* Date column */}
                <div className="w-10 flex-shrink-0 text-center pt-0.5">
                  {dt ? (
                    <>
                      <p className="text-[0.6875rem] font-bold leading-none" style={{ color: 'var(--color-primary)' }}>
                        {new Date(dt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short' }).toUpperCase()}
                      </p>
                      <p className="text-lg font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                        {new Date(dt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', day: 'numeric' })}
                      </p>
                      <p className="text-xs leading-none" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(dt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric' })}
                      </p>
                    </>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>—</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {PURPOSE_LABEL[a.purpose || ''] || a.purpose || 'Session'}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[0.6875rem] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs flex-wrap" style={{ color: 'var(--color-text-muted)' }}>
                    {a.counselor_name && (
                      <span className="flex items-center gap-1">
                        <User size={10} />
                        {a.counselor_name}
                        {a.counselor_role && ROLE_LABEL[a.counselor_role] && (
                          <span className="opacity-60">· {ROLE_LABEL[a.counselor_role]}</span>
                        )}
                      </span>
                    )}
                    {a.preferred_method && (
                      <span>{fmtMethod(a.preferred_method)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs pb-2" style={{ color: 'var(--color-text-muted)' }}>
          Records are managed by CPS staff. Contact the office for corrections.
        </p>
      </div>
    </DashboardPageWrapper>
  );
}
