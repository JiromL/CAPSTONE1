'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Loader2, ExternalLink, X, ChevronRight, CalendarDays, Video, MapPin, Clock, CheckCircle, CalendarPlus, ArrowRight, NotebookPen, Pin } from 'lucide-react';

import { OnboardingModal } from './OnboardingModal';
import { ScheduleSessionCard } from './ScheduleSessionCard';

interface DashboardProps { user: any; onLogout: () => void; }

interface Announcement {
  id: string;
  title: string;
  body?: string;
  event_type: 'webinar' | 'event' | 'notice' | 'info';
  event_date?: string;
  link?: string;
  pinned?: boolean;
  created_at: string;
}

const TYPE_META: Record<string, { label: string; accent: string }> = {
  webinar: { label: 'Webinar', accent: '#3B82F6' },
  event:   { label: 'Event',   accent: '#10B981' },
  notice:  { label: 'Notice',  accent: '#F59E0B' },
  info:    { label: 'Info',    accent: '#6B7280' },
};

function fmtEventDate(s: string) {
  return new Date(s).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila',
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function timeAgo(s: string): string {
  const diff = Date.now() - new Date(s).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days}d ago`;
  return new Date(s).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' });
}

function getSessionTitle(appt: any): string {
  const p = (appt.purpose || '').toLowerCase();
  if (p === 'intake_interview')       return 'Intake Interview';
  if (p === 'follow_up_counselling')  return 'Follow-up Counseling Session';
  if (p === 'group_session')          return 'Group Counseling Session';
  if (p === 'counseling')             return 'Individual Counseling Session';
  return 'Counseling Session';
}

function getMethodLabel(appt: any): string {
  const m = (appt.preferred_method || appt.mode || '').toLowerCase();
  const p = (appt.preferred_platform || '').toLowerCase();
  if (m === 'online' || m === 'video') {
    if (p === 'google-meet' || p === 'google_meet') return 'Google Meet';
    if (p === 'zoom') return 'Zoom';
    return 'Online';
  }
  if (m === 'in-person' || m === 'onsite' || m === 'in_person' || m === 'face_to_face') return 'In-person';
  if (m === 'google-meet' || m === 'google_meet') return 'Google Meet';
  if (m === 'zoom') return 'Zoom';
  return '';
}

function fmtApptDate(s: string): string {
  try { return new Date(s).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' }); }
  catch { return ''; }
}

function greetingFor(d: Date): string {
  const h = Number(d.toLocaleString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hour12: false })) % 24;
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function relativeDay(s: string): string {
  const key = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const days = Math.round((new Date(key(new Date(s))).getTime() - new Date(key(new Date())).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 7) return `in ${days} days`;
  return `on ${fmtApptDate(s)}`;
}

function isProfileIncomplete(u: any) {
  return !u?.college || !u?.phone || !u?.emergency_contact || !u?.emergency_phone;
}

export function StudentDashboard({ user, onLogout }: DashboardProps) {
  const [currentUser, setCurrentUser]           = useState<any>(user);
  const [showOnboarding, setShowOnboarding]     = useState(false);
  const [appointments, setAppointments]         = useState<any[]>([]);
  const [announcements, setAnnouncements]       = useState<Announcement[]>([]);
  const [openAnnouncement, setOpenAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [isCheckInOnly, setIsCheckInOnly]       = useState(false);
  const [activeCase, setActiveCase]             = useState<any>(null);
  const [resourceCount, setResourceCount]       = useState(0);
  const [hasPendingSession, setHasPendingSession] = useState(false);
  const [mounted, setMounted]                   = useState(false);

  const [showConsent, setShowConsent]           = useState(false);
  const [consentChecks, setConsentChecks]       = useState({ counseling: false, privacy: false });
  const [savingConsent, setSavingConsent]       = useState(false);
  const [consentError, setConsentError]         = useState<string | null>(null);
  const [consentSuccess, setConsentSuccess]     = useState(false);

  const [reschedTarget, setReschedTarget]             = useState<any | null>(null);
  const [reschedDate, setReschedDate]                 = useState('');
  const [reschedTime, setReschedTime]                 = useState('');
  const [reschedReason, setReschedReason]             = useState('');
  const [rescheduling, setRescheduling]               = useState(false);
  const [reschedError, setReschedError]               = useState('');
  const [rescheduleSlots, setRescheduleSlots]         = useState<{ time: string }[]>([]);
  const [rescheduleLoadingSlots, setRescheduleLoadingSlots] = useState(false);
  const [rescheduleNextDate, setRescheduleNextDate]   = useState<string | null>(null);
  const [reschedSuccess, setReschedSuccess]           = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
      setShowOnboarding(isProfileIncomplete(user));
    }
  }, [user]);

  useEffect(() => {
    if (!reschedDate || !reschedTarget) { setRescheduleSlots([]); setRescheduleNextDate(null); return; }
    setRescheduleLoadingSlots(true);
    setReschedTime('');
    setRescheduleSlots([]);
    setRescheduleNextDate(null);
    const token = localStorage.getItem('token');
    const cid = (reschedTarget as any)?.counselor_id;
    const url = cid
      ? `/api/appointments/counselor-slots?counselor_id=${cid}&date=${reschedDate}`
      : `/api/availability/open-slots?date=${reschedDate}`;
    fetch(api(url), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        const raw: any[] = d.slots || [];
        setRescheduleSlots(raw.map(s => typeof s === 'string' ? { time: s } : { time: s.time ?? s }));
        setRescheduleNextDate(d.next_available_date || null);
      })
      .catch(() => setRescheduleSlots([]))
      .finally(() => setRescheduleLoadingSlots(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reschedDate, reschedTarget]);

  const handleReschedule = async () => {
    if (!reschedTarget || !reschedDate || !reschedTime) { setReschedError('Please select a date and time.'); return; }
    setRescheduling(true); setReschedError('');
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/appointments/${reschedTarget._id}/reschedule`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requested_start: `${reschedDate}T${reschedTime}:00`, reason: reschedReason }),
      });
      if (r.ok) {
        setReschedSuccess(true);
        setAppointments(prev => prev.map(a => a._id === reschedTarget._id ? { ...a, status: 'RESCHEDULE_REQUESTED' } : a));
        setTimeout(() => { setReschedTarget(null); setReschedSuccess(false); setReschedDate(''); setReschedTime(''); setReschedReason(''); }, 1800);
      } else {
        const d = await r.json(); setReschedError(d.error || 'Failed to request reschedule.');
      }
    } catch { setReschedError('Network error.'); }
    finally { setRescheduling(false); }
  };

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    (async () => {
      try {
        const [apptRes, caseRes, resRes, annoRes, consentRes, pendingRes] = await Promise.all([
          fetch(api('/api/appointments'), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(api('/api/cases/my-current'), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(api('/api/resources/student'), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(api('/api/announcements?limit=10'), { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
          fetch(api('/api/consent/status'), { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
          fetch(api('/api/appointments/pending-session'), { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        ]);
        if (apptRes.ok) { const d = await apptRes.json(); if (Array.isArray(d.appointments)) setAppointments(d.appointments); }
        if (caseRes.ok) {
          const d = await caseRes.json();
          if (d.case) setActiveCase(d.case);
          if (['CHECK_IN_ONLY','WITH_MH_CHECK_IN','UNDER_ACCOMMODATION'].includes(d.client_status)) setIsCheckInOnly(true);
        }
        if (resRes.ok)  { const d = await resRes.json(); setResourceCount(d.resources_count || 0); }
        if (annoRes?.ok) { const d = await annoRes.json(); setAnnouncements(d.announcements || []); }
        if (consentRes?.ok) { const d = await consentRes.json(); if (!d.consent_given) setShowConsent(true); }
        if (pendingRes?.ok) { const d = await pendingRes.json(); if (d.pending_session) setHasPendingSession(true); }
      } finally { setLoading(false); }
    })();
  }, [mounted]);

  const now = Date.now();
  const upcoming = appointments
    .filter(a => ['scheduled','confirmed','matched'].includes((a.status||'').toLowerCase()) && a.requested_start && new Date(a.requested_start).getTime() > now)
    .sort((a, b) => new Date(a.requested_start||0).getTime() - new Date(b.requested_start||0).getTime());
  const pendingRequests = appointments
    .filter(a => ['pending','requested'].includes((a.status||'').toLowerCase()));

  const nextAppt  = upcoming[0];
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Student';

  const fmtTime = (s: string) => { try { return new Date(s).toLocaleTimeString('en-PH',{ timeZone: 'Asia/Manila',hour:'numeric',minute:'2-digit',hour12:true}); } catch { return ''; } };
  const apptDay = (s: string) => { try { return new Date(s).toLocaleDateString('en-PH',{ timeZone: 'Asia/Manila',weekday:'short'}); } catch { return ''; } };
  const apptNum = (s: string) => { try { return new Date(s).getDate(); } catch { return ''; } };

  const menuItems = getMenuItemsByRole(user.role).map(item =>
    item.id === 'resources' ? { ...item, badge: resourceCount } : item
  );
  const monthYear = new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'long', year: 'numeric' });

  return (
    <>
    {showOnboarding && (
      <OnboardingModal
        user={currentUser}
        onComplete={(updated) => {
          const merged = { ...currentUser, ...updated };
          setCurrentUser(merged);
          try {
            const stored = localStorage.getItem('user');
            const base = stored ? JSON.parse(stored) : {};
            localStorage.setItem('user', JSON.stringify({ ...base, ...updated }));
          } catch {}
          setShowOnboarding(false);
        }}
      />
    )}
    <DashboardLayout user={currentUser} onLogout={onLogout} menuItems={menuItems} title="Dashboard" activeSection="dashboard">
      {loading ? (
        <div className="flex items-center justify-center h-48 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          Loading…
        </div>
      ) : (
        <div className="animate-fade-up">

          {/* Greeting */}
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="type-display" style={{ color: 'var(--color-text-primary)' }}>
                {greetingFor(new Date())}, {firstName}.
              </h1>
              <p className="type-body mt-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                {nextAppt
                  ? `Your next session is ${relativeDay(nextAppt.requested_start)}.`
                  : pendingRequests.length > 0
                    ? `You have ${pendingRequests.length} request${pendingRequests.length !== 1 ? 's' : ''} under review.`
                    : 'Counseling support is here whenever you need it.'}
              </p>
            </div>
            {!isCheckInOnly && (
              <Link href="/book-appointment" className="btn-primary !min-h-11 !px-5 !text-sm">
                <CalendarPlus size={16} /> Request a session
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* Left column */}
          <div className="xl:col-span-8 space-y-6 min-w-0">

            {/* Schedule session card — shown when IC has endorsed but student hasn't picked a time yet */}
            {hasPendingSession && (
              <ScheduleSessionCard onScheduled={() => {
                setHasPendingSession(false);
                const token = localStorage.getItem('token');
                if (!token) return;
                fetch(api('/api/appointments'), { headers: { Authorization: `Bearer ${token}` } })
                  .then(r => r.ok ? r.json() : null)
                  .then(d => { if (d?.appointments) setAppointments(d.appointments); })
                  .catch(() => {});
              }} />
            )}

            {/* Next session slip */}
            {nextAppt ? (() => {
              const title       = getSessionTitle(nextAppt);
              const method      = getMethodLabel(nextAppt);
              const timeStr     = fmtTime(nextAppt.requested_start);
              const counselor   = nextAppt.counselor_name || 'CPS Counselor';
              const isOnline    = ['online','video'].includes((nextAppt.preferred_method || '').toLowerCase());
              const meetingLink = nextAppt.meeting_link;
              const d           = new Date(nextAppt.requested_start);
              const initials    = counselor.split(' ').filter(Boolean).slice(-2).map((w: string) => w[0]).join('').toUpperCase();
              return (
                <article className="relative flex flex-col sm:flex-row rounded-2xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-card-lg)' }} aria-label="Next session">
                  <div className="sm:w-40 flex-shrink-0 flex sm:flex-col items-center sm:justify-center gap-4 sm:gap-0 px-6 py-5 sm:py-7 rounded-t-2xl sm:rounded-tr-none sm:rounded-l-2xl text-white" style={{ background: 'var(--color-primary)' }}>
                    <span className="text-xs font-bold tracking-[0.16em] uppercase" style={{ color: 'rgba(255,255,255,0.75)' }}>{d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short' })}</span>
                    <span className="font-display text-6xl leading-none sm:my-1.5" style={{ color: 'white' }}>{d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', day: 'numeric' })}</span>
                    <span className="text-xs font-bold tracking-[0.16em] uppercase" style={{ color: 'rgba(255,255,255,0.75)' }}>{d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short' })}</span>
                    {timeStr && (
                      <span className="sm:mt-4 ml-auto sm:ml-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.16)' }}>
                        <Clock size={12} aria-hidden="true" /> {timeStr}
                      </span>
                    )}
                  </div>

                  {/* perforation */}
                  <div className="relative hidden sm:block w-0 border-l-2 border-dashed" style={{ borderColor: 'var(--color-border)' }} aria-hidden="true">
                    <span className="absolute -top-[11px] -left-[11px] w-5 h-5 rounded-full" style={{ background: 'var(--color-bg)' }} />
                    <span className="absolute -bottom-[11px] -left-[11px] w-5 h-5 rounded-full" style={{ background: 'var(--color-bg)' }} />
                  </div>

                  <div className="flex-1 p-6 sm:p-7 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="type-overline" style={{ color: 'var(--color-text-muted)' }}>Next session</span>
                      <span className="badge" style={{ background: 'var(--color-success-surface)', color: 'var(--color-success-text)' }}>
                        <CheckCircle size={12} aria-hidden="true" /> Confirmed
                      </span>
                    </div>
                    <h2 className="text-xl font-bold mt-2 leading-snug" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>

                    <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary-text)' }}>{initials || 'C'}</div>
                        <div className="min-w-0">
                          <dt className="type-caption" style={{ color: 'var(--color-text-muted)' }}>Counselor</dt>
                          <dd className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{counselor}</dd>
                        </div>
                      </div>
                      {method && (
                        <div>
                          <dt className="type-caption" style={{ color: 'var(--color-text-muted)' }}>Where</dt>
                          <dd className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
                            {isOnline ? <Video size={14} aria-hidden="true" style={{ color: 'var(--color-primary-text)' }} /> : <MapPin size={14} aria-hidden="true" style={{ color: 'var(--color-primary-text)' }} />}
                            {method}
                          </dd>
                        </div>
                      )}
                    </dl>

                    <div className="flex flex-wrap items-center gap-2.5 mt-6 pt-5 border-t" style={{ borderColor: 'var(--color-border)' }}>
                      {isOnline && meetingLink ? (
                        <a href={meetingLink} target="_blank" rel="noopener noreferrer" className="btn-primary">
                          <Video size={15} /> Join session
                        </a>
                      ) : (
                        <Link href="/my-appointments" className="btn-primary">
                          View details <ArrowRight size={14} />
                        </Link>
                      )}
                      <button
                        onClick={() => { setReschedTarget(nextAppt); setReschedDate(''); setReschedTime(''); setReschedReason(''); setReschedError(''); setReschedSuccess(false); }}
                        className="btn-ghost">
                        Reschedule
                      </button>
                    </div>
                  </div>
                </article>
              );
            })() : (
              <section className="relative overflow-hidden rounded-2xl p-7 sm:p-8" style={{ background: 'var(--color-sidebar)', boxShadow: 'var(--shadow-card-lg)' }}>
                <div className="pointer-events-none absolute -right-32 -top-32 w-[420px] h-[420px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(35,82,204,0.35) 0%, transparent 65%)' }} aria-hidden="true" />
                <div className="relative max-w-lg">
                  {upcoming.length === 0 && pendingRequests.length === 0 && !isCheckInOnly ? (
                    <>
                      <p className="type-overline" style={{ color: '#7BAAF7' }}>Welcome to CPS</p>
                      <h2 className="font-display text-3xl leading-tight mt-3" style={{ color: 'white' }}>
                        You don&apos;t have to figure this out alone, {firstName}.
                      </h2>
                      <p className="text-sm mt-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
                        Counseling for all DLSU students, in person or online — on your own terms, at your own pace.
                      </p>
                      <Link href="/book-appointment" className="btn-primary mt-6 !min-h-11 !px-5 !text-sm">
                        Talk to someone <ArrowRight size={15} />
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="type-overline" style={{ color: '#7BAAF7' }}>Your counseling journey</p>
                      <h2 className="font-display text-3xl leading-tight mt-3" style={{ color: 'white' }}>
                        Reaching out was a brave first step, {firstName}.
                      </h2>
                      <p className="text-sm mt-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
                        {`You have ${pendingRequests.length} pending request${pendingRequests.length !== 1 ? 's' : ''} under review. We'll be in touch within 1–2 business days.`}
                      </p>
                      {!isCheckInOnly && (
                        <Link href="/book-appointment" className="btn-primary mt-6 !min-h-11 !px-5 !text-sm">
                          Book another session <ArrowRight size={15} />
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}

            {/* This week */}
            {(() => {
              const today = new Date();
              const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7)); monday.setHours(0,0,0,0);
              const week = Array.from({ length: 7 }, (_, i) => { const x = new Date(monday); x.setDate(monday.getDate() + i); return x; });
              const sessionsOn = (d: Date) => appointments.filter(a =>
                a.requested_start && ['scheduled','confirmed','matched','completed'].includes((a.status||'').toLowerCase()) &&
                new Date(a.requested_start).toDateString() === d.toDateString());
              return (
                <section className="card">
                  <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <h3 className="type-section-title" style={{ color: 'var(--color-text-primary)' }}>This week</h3>
                    <span className="inline-flex items-center gap-1.5 type-caption" style={{ color: 'var(--color-text-muted)' }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)' }} />Session
                    </span>
                  </div>
                  <ol className="grid grid-cols-7 gap-1.5 sm:gap-2 px-5 pb-5">
                    {week.map(d => {
                      const isToday = d.toDateString() === today.toDateString();
                      const count = sessionsOn(d).length;
                      const past = d < today && !isToday;
                      const label = [d.toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' }), isToday && 'today', count > 0 && `${count} session${count > 1 ? 's' : ''}`].filter(Boolean).join(', ');
                      return (
                        <li key={d.toISOString()} aria-label={label}
                          className="rounded-xl flex flex-col items-center py-3 gap-1"
                          style={{
                            background: count > 0 ? 'var(--color-primary-surface)' : 'transparent',
                            border: isToday ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                            opacity: past ? 0.6 : 1,
                          }}>
                          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{d.toLocaleDateString('en-PH', { weekday: 'narrow' })}</span>
                          <span className="text-base sm:text-lg font-bold tabular-nums" style={{ color: count > 0 ? 'var(--color-primary-text)' : 'var(--color-text-primary)' }}>{d.getDate()}</span>
                          <span className="flex items-center gap-1 h-2">
                            {Array.from({ length: Math.min(count, 3) }).map((_, k) => (
                              <span key={k} className="w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)' }} />
                            ))}
                          </span>
                          {isToday && <span className="text-[10px] font-bold uppercase tracking-wide hidden sm:block" style={{ color: 'var(--color-primary-text)' }}>Today</span>}
                        </li>
                      );
                    })}
                  </ol>
                </section>
              );
            })()}

            {/* Pending requests */}
            {pendingRequests.length > 0 && (
              <section className="card p-5">
                <div className="flex items-center justify-between">
                  <h3 className="type-section-title" style={{ color: 'var(--color-text-primary)' }}>Requests under review</h3>
                  <Link href="/my-appointments" className="type-label hover:underline underline-offset-2" style={{ color: 'var(--color-primary-text)' }}>View all</Link>
                </div>
                <p className="type-body-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>We usually reply within 1–2 business days.</p>
                <ul className="mt-4 space-y-4">
                  {pendingRequests.slice(0, 3).map((appt, i) => (
                    <li key={appt.id || appt._id || i} className="rounded-xl p-4" style={{ background: 'var(--color-bg)' }}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {appt.purpose === 'intake_interview' ? 'Intake Interview' :
                           appt.purpose === 'counseling' ? 'Counseling' :
                           appt.purpose === 'follow_up_counselling' ? 'Follow-up' : 'Session Request'}
                        </p>
                        <span className="badge" style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning-text)' }}>Under review</span>
                      </div>
                      <ol className="flex items-center mt-4" aria-label="Request progress">
                        {(['Requested', 'Under review', 'Confirmed'] as const).map((step, s) => {
                          const done = s < 1, current = s === 1;
                          return (
                            <li key={step} className={`flex items-center ${s < 2 ? 'flex-1' : ''}`} aria-current={current ? 'step' : undefined}>
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                                  style={done
                                    ? { background: 'var(--color-primary)', color: 'white' }
                                    : current
                                      ? { background: 'var(--color-primary-surface)', color: 'var(--color-primary-text)', boxShadow: '0 0 0 2px var(--color-primary)' }
                                      : { background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                                  {done ? <CheckCircle size={13} /> : s + 1}
                                </span>
                                <span className="text-xs font-semibold whitespace-nowrap" style={{ color: done || current ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>{step}</span>
                              </div>
                              {s < 2 && <span className="flex-1 h-0.5 mx-3 rounded-full" style={{ background: done ? 'var(--color-primary)' : 'var(--color-border)' }} />}
                            </li>
                          );
                        })}
                      </ol>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Announcements */}
            <section className="card">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h3 className="type-section-title" style={{ color: 'var(--color-text-primary)' }}>CPS updates &amp; events</h3>
                {announcements.length > 3 && (
                  <a href="/announcements" className="type-label hover:underline underline-offset-2" style={{ color: 'var(--color-primary-text)' }}>View all</a>
                )}
              </div>
              {announcements.length === 0 ? (
                <p className="type-body-sm text-center pb-8 pt-3" style={{ color: 'var(--color-text-muted)' }}>No announcements right now. Check back later for webinars and events.</p>
              ) : (
                <ul className="px-2 pb-2">
                  {announcements.slice(0, 3).map(a => {
                    const meta = TYPE_META[a.event_type] || TYPE_META.info;
                    return (
                      <li key={a.id}>
                        <button onClick={() => setOpenAnnouncement(a)} className="group w-full text-left flex items-center gap-4 px-3 py-3 rounded-xl transition-colors hover:bg-[var(--color-bg)]">
                          <span className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: meta.accent }} aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                              {meta.label}
                              {a.pinned && <span className="inline-flex items-center gap-1 normal-case tracking-normal font-medium"><Pin size={11} aria-hidden="true" />Pinned</span>}
                            </p>
                            <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--color-text-primary)' }}>{a.title}</p>
                            <p className="type-caption mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                              {a.event_date ? fmtEventDate(a.event_date) : a.created_at ? timeAgo(a.created_at) : ''}
                            </p>
                          </div>
                          <ChevronRight size={16} className="flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--color-text-muted)' }} aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* Right column */}
          <div className="xl:col-span-4 space-y-6 min-w-0">

            {/* Active case */}
            {activeCase && (() => {
              const raw = (activeCase.status || activeCase.case_status || '');
              const caseStatus = raw.replace(/_/g,' ').toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase());
              const isActive = ['ACTIVE','NEW','INTAKE_SCHEDULED'].includes(raw.toUpperCase());
              return (
                <section className="card p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="type-section-title" style={{ color: 'var(--color-text-primary)' }}>Your case</h3>
                    <span className="badge" style={isActive
                      ? { background: 'var(--color-success-surface)', color: 'var(--color-success-text)' }
                      : { background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>
                      {caseStatus}
                    </span>
                  </div>
                  <dl className="mt-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="type-body-sm" style={{ color: 'var(--color-text-muted)' }}>Counselor</dt>
                      <dd className="type-body-sm font-semibold text-right" style={{ color: activeCase.counselor_name ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                        {activeCase.counselor_name || 'Not yet assigned'}
                      </dd>
                    </div>
                    {activeCase.case_number && (
                      <div className="flex items-center justify-between gap-3">
                        <dt className="type-body-sm" style={{ color: 'var(--color-text-muted)' }}>Case no.</dt>
                        <dd className="type-body-sm font-mono" style={{ color: 'var(--color-text-secondary)' }}>{activeCase.case_number}</dd>
                      </div>
                    )}
                  </dl>
                  <Link href="/counseling" className="mt-5 flex items-center justify-between rounded-xl px-4 h-11 type-label transition-opacity hover:opacity-80" style={{ color: 'var(--color-primary-text)', background: 'var(--color-primary-surface)' }}>
                    View session history <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </section>
              );
            })()}

            {/* Upcoming sessions */}
            <section className="card">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h3 className="type-section-title" style={{ color: 'var(--color-text-primary)' }}>Upcoming sessions</h3>
                {upcoming.length > 0 && (
                  <Link href="/my-appointments" className="type-label hover:underline underline-offset-2" style={{ color: 'var(--color-primary-text)' }}>
                    {upcoming.length > 5 ? `All ${upcoming.length}` : 'View all'}
                  </Link>
                )}
              </div>
              {upcoming.length === 0 ? (
                <div className="text-center px-5 pb-6 pt-2">
                  <div className="w-11 h-11 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
                    <CalendarDays size={20} style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>No sessions booked yet</p>
                  <p className="type-caption mt-1" style={{ color: 'var(--color-text-muted)' }}>Confirmed sessions will show up here. Everything is private.</p>
                </div>
              ) : (
                <ul className="px-2 pb-2">
                  {upcoming.slice(0, 5).map((appt, i) => (
                    <li key={appt.id || appt._id || i}>
                      <Link href="/my-appointments" className="group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-[var(--color-bg)]">
                        <div className="flex-shrink-0 w-11 text-center rounded-xl py-1.5"
                          style={i === 0
                            ? { background: 'var(--color-primary)', color: 'white' }
                            : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
                          <p className="text-[11px] font-semibold leading-none mb-0.5 uppercase">{apptDay(appt.requested_start)}</p>
                          <p className="text-base font-bold leading-none">{apptNum(appt.requested_start)}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{appt.counselor_name || 'CPS Counselor'}</p>
                          <p className="type-caption truncate" style={{ color: 'var(--color-text-muted)' }}>
                            {fmtTime(appt.requested_start)}{appt.requested_end ? ` – ${fmtTime(appt.requested_end)}` : ''}
                          </p>
                        </div>
                        <ChevronRight size={15} className="flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--color-text-muted)' }} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Journal prompt */}
            <section className="card p-5">
              <p className="type-overline flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}><NotebookPen size={12} aria-hidden="true" /> Journal</p>
              <p className="font-display text-2xl mt-3 leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                {nextAppt
                  ? `What's one thing you want to bring up on ${new Date(nextAppt.requested_start).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long' })}?`
                  : 'How are you doing today, really?'}
              </p>
              <p className="type-caption mt-2" style={{ color: 'var(--color-text-muted)' }}>Private to you unless you choose to share it.</p>
              <Link href="/journal" className="btn-ghost mt-5">Write an entry <ArrowRight size={14} /></Link>
            </section>

            {/* Crisis — on mobile the sidebar card is hidden, so show it inline */}
            <div className="lg:hidden rounded-2xl p-4" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-danger-text)' }}>Need support right now?</p>
              <p className="type-body-sm mt-1" style={{ color: 'var(--color-danger-text)' }}>
                CPS: <a href="tel:09XXXXXXXXX" className="font-bold underline underline-offset-2">09XX-XXX-XXXX</a>
                {' '}· Hopeline: <a href="tel:1553" className="font-bold underline underline-offset-2">1553</a>
                {' '}· NCMH: <a href="tel:028928922" className="font-bold underline underline-offset-2">0917-899-8727</a>
              </p>
            </div>
          </div>

          </div>
        </div>
      )}

      {/* Announcement modal */}
      {openAnnouncement && (() => {
        const a    = openAnnouncement;
        const meta = TYPE_META[a.event_type] || TYPE_META.info;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpenAnnouncement(null)} />
            <div className="relative rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in" style={{ background: 'var(--color-surface)' }}>
              <div className="h-1 w-full" style={{ background: meta.accent }} />
              <div className="p-7">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full tracking-wide uppercase" style={{ background: `${meta.accent}18`, color: meta.accent }}>
                        {meta.label}
                      </span>
                      {a.pinned && <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Pinned</span>}
                    </div>
                    <h3 className="text-lg font-bold leading-snug" style={{ color: 'var(--color-text-primary)' }}>{a.title}</h3>
                  </div>
                  <button onClick={() => setOpenAnnouncement(null)}
                    className="p-2 rounded-xl transition-colors flex-shrink-0"
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <X size={16} style={{ color: 'var(--color-text-muted)' }} />
                  </button>
                </div>
                {a.body && <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--color-text-secondary)' }}>{a.body}</p>}
                {a.event_date && (
                  <div className="text-sm mb-5 rounded-xl px-4 py-3 font-medium" style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
                    {fmtEventDate(a.event_date)}
                  </div>
                )}
                {a.link ? (
                  <a href={a.link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-white rounded-xl transition-all hover:opacity-90"
                    style={{ background: 'var(--color-primary)' }}>
                    <ExternalLink size={15} /> Open Link
                  </a>
                ) : (
                  <button onClick={() => setOpenAnnouncement(null)}
                    className="w-full py-3 text-sm font-medium rounded-xl transition-colors"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reschedule Modal */}
      {reschedTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in" style={{ background: 'var(--color-surface)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Request Reschedule</h3>
              <button onClick={() => setReschedTarget(null)}
                className="p-1.5 rounded-lg transition-colors"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X size={14} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>

            {reschedSuccess ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--color-success-surface)' }}>
                  <CalendarDays size={22} style={{ color: 'var(--color-success)' }} />
                </div>
                <p className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Reschedule request sent!</p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Your counselor will confirm the new time shortly.</p>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold tracking-wide uppercase block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>New Preferred Date</label>
                  <input type="date" value={reschedDate} onChange={e => setReschedDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-all"
                    style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px var(--color-primary-surface)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold tracking-wide uppercase block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>New Preferred Time</label>
                  {!reschedDate ? (
                    <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>Select a date to see available slots.</p>
                  ) : rescheduleLoadingSlots ? (
                    <div className="flex items-center gap-2 text-xs py-2" style={{ color: 'var(--color-text-muted)' }}>
                      <Loader2 size={13} className="animate-spin" /> Checking availability…
                    </div>
                  ) : rescheduleSlots.length === 0 ? (
                    <div className="text-xs py-1" style={{ color: 'var(--color-text-secondary)' }}>
                      No slots available on this date.
                      {rescheduleNextDate && (
                        <span className="ml-1 font-medium" style={{ color: 'var(--color-primary)' }}>
                          Next available: <button type="button" onClick={() => setReschedDate(rescheduleNextDate)} className="underline underline-offset-2">{rescheduleNextDate}</button>
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {rescheduleSlots.map((s, i) => {
                        const [h, m] = s.time.split(':').map(Number);
                        const label = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
                        const selected = reschedTime === s.time;
                        return (
                          <button key={i} type="button" onClick={() => setReschedTime(s.time)}
                            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all"
                            style={{
                              border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                              background: selected ? 'var(--color-primary-surface)' : 'var(--color-surface)',
                              color: selected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            }}>
                            <Clock size={13} style={{ color: selected ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
                            <span className="font-bold tabular-nums">{label}</span>
                            {selected && <span className="ml-auto text-xs font-bold">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold tracking-wide uppercase block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Reason <span className="font-normal normal-case" style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
                  </label>
                  <textarea value={reschedReason} onChange={e => setReschedReason(e.target.value)}
                    placeholder="Why do you need to reschedule?"
                    rows={2}
                    className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-all resize-none"
                    style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px var(--color-primary-surface)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                {reschedError && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{reschedError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setReschedTarget(null)}
                    className="flex-1 px-4 py-2 text-sm rounded-lg transition-colors"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    Cancel
                  </button>
                  <button onClick={handleReschedule} disabled={rescheduling}
                    className="flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: 'var(--color-primary)' }}
                    onMouseEnter={e => { if (!rescheduling) e.currentTarget.style.background = 'var(--color-primary-hover)'; }}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary)')}>
                    {rescheduling && <Loader2 size={13} className="animate-spin" />}
                    Request New Time
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Consent Modal */}
      {showConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in" style={{ background: 'var(--color-surface)' }}>
            <div className="px-6 py-5" style={{ background: 'var(--color-primary)' }}>
              <h2 className="text-base font-bold" style={{ color: 'white' }}>A quick note before we begin</h2>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>We want to make sure you know how your information is kept safe.</p>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <div>
                <p className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Your sessions are confidential</p>
                <p className="text-xs leading-relaxed">Everything you share with your counselor stays between you and your care team. The only exceptions are situations involving immediate risk to your safety or others — and we'll always tell you when that applies.</p>
              </div>
              <div>
                <p className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Your data is protected</p>
                <p className="text-xs leading-relaxed">Your mental health records are treated as sensitive personal information under RA 10173 (Data Privacy Act). We only collect what's needed to provide you with care.</p>
              </div>
              <div className="space-y-3 pt-2">
                {([
                  { k: 'counseling' as const, t: 'I have read and understood the nature of counseling services, confidentiality, and its exceptions. I voluntarily consent to receive counseling and psychological services from DLSU CPS.' },
                  { k: 'privacy'    as const, t: 'I have read and understood how my personal and sensitive data will be collected, processed, and stored. I consent to data processing in accordance with RA 10173 (Data Privacy Act of 2012).' },
                ] as const).map(item => (
                  <label key={item.k} className="flex gap-3 cursor-pointer">
                    <input type="checkbox" checked={consentChecks[item.k]}
                      onChange={e => setConsentChecks(c => ({ ...c, [item.k]: e.target.checked }))}
                      className="w-4 h-4 mt-0.5 flex-shrink-0"
                      style={{ accentColor: 'var(--color-primary)' }} />
                    <span className="text-xs leading-relaxed">{item.t}</span>
                  </label>
                ))}
              </div>
              {consentError && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{consentError}</p>}
            </div>
            <div className="px-6 py-4 space-y-2" style={{ borderTop: '1px solid var(--color-border)' }}>
              {consentSuccess ? (
                <div className="flex items-center justify-center gap-2 py-2 text-sm" style={{ color: 'var(--color-success)' }}>
                  <CheckCircle size={16} /> Consent recorded. Thank you.
                </div>
              ) : (
                <>
                  <button
                    disabled={savingConsent || !consentChecks.counseling || !consentChecks.privacy}
                    onClick={async () => {
                      setSavingConsent(true); setConsentError(null);
                      try {
                        const token = localStorage.getItem('token');
                        const r = await fetch(api('/api/consent/submit'), {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                          body: JSON.stringify({ consent_types: ['counseling_services', 'data_privacy'] }),
                        });
                        if (r.ok) { setConsentSuccess(true); setTimeout(() => setShowConsent(false), 2000); }
                        else { setConsentError('Failed to record consent. Please try again.'); }
                      } catch { setConsentError('Network error. Please try again.'); }
                      finally { setSavingConsent(false); }
                    }}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: 'var(--color-primary)' }}
                    onMouseEnter={e => { const btn = e.currentTarget; if (!btn.disabled) btn.style.background = 'var(--color-primary-hover)'; }}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary)')}>
                    {savingConsent && <Loader2 size={14} className="animate-spin" />}
                    I Understand and Consent
                  </button>
                  <button
                    onClick={onLogout}
                    className="w-full py-2 text-xs transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                    I'm not ready — Log out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
    </>
  );
}
