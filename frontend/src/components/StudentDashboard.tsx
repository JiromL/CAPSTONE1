'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Loader2, ExternalLink, X, ChevronRight, CalendarDays, Video, MapPin, Clock, CheckCircle } from 'lucide-react';

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
        <div className="flex flex-col xl:flex-row gap-6 animate-fade-up">

          {/* Left column */}
          <div className="flex-1 space-y-5 min-w-0">

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

            {/* Hero banner */}
            {nextAppt ? (() => {
              const title       = getSessionTitle(nextAppt);
              const method      = getMethodLabel(nextAppt);
              const dateStr     = fmtApptDate(nextAppt.requested_start);
              const timeStr     = fmtTime(nextAppt.requested_start);
              const counselor   = nextAppt.counselor_name || 'CPS Counselor';
              const isOnline    = ['online','video'].includes((nextAppt.preferred_method || '').toLowerCase());
              const meetingLink = nextAppt.meeting_link;
              return (
                <div
                  className="relative overflow-hidden rounded-2xl p-7 text-white shadow-card-lg"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #1A3DB0 100%)' }}
                >
                  <div className="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
                  <div className="pointer-events-none absolute bottom-0 left-1/2 w-64 h-24 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        Upcoming Appointment
                      </p>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: 'rgba(255,255,255,0.15)' }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--color-success)', animation: 'pulse-dot 2s ease-in-out infinite' }} />
                        Confirmed
                      </span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 leading-snug" style={{ color: 'white' }}>{title}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-6" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      <span className="font-semibold text-white">with {counselor}</span>
                      {dateStr && (
                        <span className="flex items-center gap-1.5">
                          <CalendarDays size={13} style={{ color: 'rgba(255,255,255,0.5)' }} />{dateStr}
                        </span>
                      )}
                      {timeStr && (
                        <span className="flex items-center gap-1.5">
                          <Clock size={13} style={{ color: 'rgba(255,255,255,0.5)' }} />{timeStr}
                        </span>
                      )}
                      {method && (
                        <span className="flex items-center gap-1.5">
                          {isOnline
                            ? <Video size={13} style={{ color: 'rgba(255,255,255,0.5)' }} />
                            : <MapPin size={13} style={{ color: 'rgba(255,255,255,0.5)' }} />}
                          {method} session
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      {isOnline && meetingLink ? (
                        <a href={meetingLink} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5"
                          style={{ background: 'white', color: 'var(--color-primary)' }}>
                          <Video size={15} />Join Session
                        </a>
                      ) : (
                        <Link href="/my-appointments">
                          <button className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5"
                            style={{ background: 'white', color: 'var(--color-primary)' }}>
                            <Video size={15} />View Details
                          </button>
                        </Link>
                      )}
                      <button
                        onClick={() => { setReschedTarget(nextAppt); setReschedDate(''); setReschedTime(''); setReschedReason(''); setReschedError(''); setReschedSuccess(false); }}
                        className="px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors"
                        style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}>
                        Reschedule
                      </button>
                    </div>
                  </div>
                </div>
              );
            })() : upcoming.length === 0 && pendingRequests.length === 0 && !isCheckInOnly ? (
              <div
                className="relative overflow-hidden rounded-2xl p-7 text-white shadow-card-lg"
                style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #1A3DB0 100%)' }}
              >
                <div className="pointer-events-none absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
                <div className="relative z-10">
                  <p className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>Welcome to CPS</p>
                  <h3 className="text-xl font-bold mb-2 leading-snug" style={{ color: 'white' }}>
                    You don't have to figure this out alone, {firstName}.
                  </h3>
                  <p className="text-sm mb-6 leading-relaxed max-w-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    Free, confidential counseling for all DLSU students. In-person or online — on your own terms, at your own pace.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {['Free', 'Confidential', 'In-person & Online'].map(t => (
                      <span key={t} className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: 'rgba(255,255,255,0.18)', color: 'white' }}>{t}</span>
                    ))}
                  </div>
                  <Link href="/book-appointment">
                    <button className="px-5 py-2.5 text-sm font-bold rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5"
                      style={{ background: 'white', color: 'var(--color-primary)' }}>
                      Talk to Someone →
                    </button>
                  </Link>
                </div>
              </div>
            ) : (
              <div
                className="relative overflow-hidden rounded-2xl p-7 text-white shadow-card-lg"
                style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #1A3DB0 100%)' }}
              >
                <div className="pointer-events-none absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
                <div className="relative z-10">
                  <p className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>Your counseling journey</p>
                  <h3 className="text-xl font-bold mb-2" style={{ color: 'white' }}>Reaching out was a brave first step, {firstName}.</h3>
                  <p className="text-sm mb-6 leading-relaxed max-w-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    {`You have ${pendingRequests.length} pending request${pendingRequests.length !== 1 ? 's' : ''} under review. We'll be in touch within 1–2 business days.`}
                  </p>
                  {!isCheckInOnly && (
                    <Link href="/book-appointment">
                      <button className="px-5 py-2.5 text-sm font-bold rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5"
                        style={{ background: 'white', color: 'var(--color-primary)' }}>
                        Book Another Session →
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Announcements */}
            <div className="rounded-2xl border p-5 shadow-card" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>CPS Updates &amp; Events</p>
                {announcements.length > 3 && (
                  <a href="/announcements" className="text-xs font-medium transition-opacity hover:opacity-75" style={{ color: 'var(--color-primary)' }}>
                    View All →
                  </a>
                )}
              </div>
              {announcements.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No announcements at this time.</p>
              ) : (
                <div className="space-y-1">
                  {announcements.slice(0, 3).map((a, i) => {
                    const meta = TYPE_META[a.event_type] || TYPE_META.info;
                    return (
                      <button
                        key={a.id}
                        onClick={() => setOpenAnnouncement(a)}
                        className="w-full text-left px-3 py-3 rounded-xl transition-colors group"
                        style={{ animationDelay: `${i * 50}ms` }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: meta.accent }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-bold tracking-wide uppercase" style={{ color: meta.accent }}>{meta.label}</span>
                              {a.pinned && <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>· Pinned</span>}
                            </div>
                            <p className="text-sm font-semibold leading-snug truncate" style={{ color: 'var(--color-text-primary)' }}>{a.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {a.event_date && (
                                <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{fmtEventDate(a.event_date)}</span>
                              )}
                              {a.created_at && (
                                <span className="text-[11px]" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>· {timeAgo(a.created_at)}</span>
                              )}
                            </div>
                          </div>
                          <ChevronRight size={14} className="flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--color-text-muted)' }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Crisis support strip */}
            <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', borderLeftWidth: 3 }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold" style={{ color: 'var(--color-danger)' }}>Need support right now?</p>
                <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--color-danger)' }}>
                  CPS:{' '}
                  <a href="tel:09XXXXXXXXX" className="font-bold underline underline-offset-2">09XX-XXX-XXXX</a>
                  {' '}· Hopeline:{' '}
                  <a href="tel:1553" className="font-bold underline underline-offset-2">1553</a>
                  {' '}· NCMH:{' '}
                  <a href="tel:028928922" className="font-bold underline underline-offset-2">0917-899-8727</a>
                </p>
              </div>
            </div>
          </div>

          {/* Right column — Upcoming Sessions */}
          <div className="w-full xl:w-72 flex-shrink-0 space-y-5">

            {/* H-03: Active case status card */}
            {activeCase && (() => {
              const caseStatus = (activeCase.status || activeCase.case_status || '').replace(/_/g,' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
              const isActive = ['ACTIVE','NEW','INTAKE_SCHEDULED'].includes((activeCase.status || activeCase.case_status || '').toUpperCase());
              return (
                <div className="rounded-2xl border p-4 shadow-card" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Your Case</p>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={isActive
                        ? { background: 'var(--color-success-surface)', color: 'var(--color-success)' }
                        : { background: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                    >
                      {caseStatus}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {activeCase.counselor_name ? (
                      <div>
                        <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-muted)' }}>Assigned Counselor</p>
                        <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{activeCase.counselor_name}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-muted)' }}>Counselor</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Not yet assigned</p>
                      </div>
                    )}
                    {activeCase.case_number && (
                      <p className="text-xs font-mono pt-1" style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' }}>
                        Case #{activeCase.case_number}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="rounded-2xl border p-5 shadow-card" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Your next sessions</p>
              </div>

              {upcoming.length === 0 && pendingRequests.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
                    <CalendarDays size={22} style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>No sessions yet.</p>
                  <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>When you book a session, it'll appear here. Everything is private.</p>
                  {!isCheckInOnly && (
                    <Link href="/book-appointment">
                      <button className="mt-1 text-xs font-semibold px-4 py-2 rounded-xl transition-all hover:opacity-90"
                        style={{ background: 'var(--color-primary)', color: 'white' }}>
                        Talk to Someone →
                      </button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {upcoming.slice(0, 5).map((appt, i) => (
                    <Link key={appt.id || appt._id || i} href="/my-appointments">
                      <div
                        className="flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer"
                        style={i === 0 ? { background: 'var(--color-primary-surface)' } : {}}
                        onMouseEnter={e => { if (i !== 0) e.currentTarget.style.background = 'var(--color-bg)'; }}
                        onMouseLeave={e => { if (i !== 0) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div
                          className="flex-shrink-0 w-10 text-center rounded-xl py-1.5"
                          style={i === 0
                            ? { background: 'var(--color-primary)', color: 'white' }
                            : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}
                        >
                          <p className="text-xs font-medium leading-none mb-0.5">{apptDay(appt.requested_start)}</p>
                          <p className="text-base font-bold leading-none">{apptNum(appt.requested_start)}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {appt.counselor_name || 'CPS Counselor'}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                            {fmtTime(appt.requested_start)}
                            {appt.requested_end ? ` – ${fmtTime(appt.requested_end)}` : ''}
                          </p>
                        </div>
                        <ChevronRight size={13} style={{ color: i === 0 ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
                      </div>
                    </Link>
                  ))}

                  {pendingRequests.length > 0 && (
                    <>
                      {upcoming.length > 0 && <div className="h-px my-1" style={{ background: 'var(--color-border)' }} />}
                      <p className="text-xs font-bold tracking-widest uppercase px-1 pt-1" style={{ color: 'var(--color-text-muted)' }}>
                        Pending Requests
                      </p>
                      {pendingRequests.slice(0, 3).map((appt, i) => (
                        <Link key={appt.id || appt._id || i} href="/my-appointments">
                          <div
                            className="flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer"
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center" style={{ background: 'var(--color-warning-surface)', borderColor: 'var(--color-warning)' }}>
                              <CalendarDays size={14} style={{ color: 'var(--color-warning)' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                                {appt.purpose === 'intake_interview' ? 'Intake Interview' :
                                 appt.purpose === 'counseling' ? 'Counseling' :
                                 appt.purpose === 'follow_up_counselling' ? 'Follow-up' : 'Session Request'}
                              </p>
                              <p className="text-xs font-medium" style={{ color: 'var(--color-warning)' }}>Pending review</p>
                            </div>
                            <ChevronRight size={13} style={{ color: 'var(--color-text-muted)' }} />
                          </div>
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              )}

              {upcoming.length > 5 && (
                <div className="mt-3 pt-3 text-center" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <Link href="/my-appointments">
                    <span className="text-xs font-medium transition-opacity hover:opacity-75" style={{ color: 'var(--color-primary)' }}>
                      View all {upcoming.length} sessions →
                    </span>
                  </Link>
                </div>
              )}
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
