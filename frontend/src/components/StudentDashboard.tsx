'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Loader2, ExternalLink, X, ChevronRight, CalendarDays, Video, MapPin, Clock } from 'lucide-react';

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

const TYPE_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  webinar: { label: 'Webinar',    bg: 'bg-blue-50',   text: 'text-blue-600' },
  event:   { label: 'Event',      bg: 'bg-green-50',  text: 'text-green-700' },
  notice:  { label: 'Notice',     bg: 'bg-orange-50', text: 'text-orange-600' },
  info:    { label: 'Info',       bg: 'bg-gray-100',  text: 'text-gray-600' },
};

function fmtEventDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
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
  if (m === 'online' || m === 'video') return 'Video';
  if (m === 'onsite' || m === 'in_person' || m === 'face_to_face') return 'In-person';
  return '';
}

function fmtApptDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return ''; }
}

export function StudentDashboard({ user, onLogout }: DashboardProps) {
  const [appointments, setAppointments]         = useState<any[]>([]);
  const [announcements, setAnnouncements]       = useState<Announcement[]>([]);
  const [openAnnouncement, setOpenAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [isCheckInOnly, setIsCheckInOnly]       = useState(false);
  const [resourceCount, setResourceCount]       = useState(0);
  const [mounted, setMounted]                   = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    (async () => {
      try {
        const [apptRes, caseRes, resRes, annoRes] = await Promise.all([
          fetch(api('/api/appointments'), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(api('/api/cases/my-current'), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(api('/api/resources/student'), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(api('/api/announcements?limit=10'), { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        ]);
        if (apptRes.ok) { const d = await apptRes.json(); if (Array.isArray(d.appointments)) setAppointments(d.appointments); }
        if (caseRes.ok) { const d = await caseRes.json(); if (['CHECK_IN_ONLY','WITH_MH_CHECK_IN','UNDER_ACCOMMODATION'].includes(d.client_status)) setIsCheckInOnly(true); }
        if (resRes.ok)  { const d = await resRes.json(); setResourceCount(d.resources_count || 0); }
        if (annoRes?.ok) { const d = await annoRes.json(); setAnnouncements(d.announcements || []); }
      } finally { setLoading(false); }
    })();
  }, [mounted]);

  // Only show appointments with a confirmed date/time slot that haven't passed
  const now = Date.now();
  const upcoming = appointments
    .filter(a => ['scheduled','confirmed','matched'].includes((a.status||'').toLowerCase()) && a.requested_start && new Date(a.requested_start).getTime() > now)
    .sort((a, b) => new Date(a.requested_start||0).getTime() - new Date(b.requested_start||0).getTime());

  // Unconfirmed requests (no slot yet) shown separately
  const pendingRequests = appointments
    .filter(a => ['pending','requested'].includes((a.status||'').toLowerCase()));

  const nextAppt  = upcoming[0];
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Student';

  const fmtTime = (s: string) => { try { return new Date(s).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true}); } catch { return ''; } };
  const apptDay = (s: string) => { try { return new Date(s).toLocaleDateString('en-US',{weekday:'short'}); } catch { return ''; } };
  const apptNum = (s: string) => { try { return new Date(s).getDate(); } catch { return ''; } };
  const apptMon = (s: string) => { try { return new Date(s).toLocaleDateString('en-US',{month:'short',year:'numeric'}); } catch { return ''; } };

  const menuItems = getMenuItemsByRole(user.role).map(item =>
    item.id === 'resources' ? { ...item, badge: resourceCount } : item
  );

  const monthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" activeSection="dashboard">

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : (
        <div className="flex flex-col xl:flex-row gap-6">

          {/* ── Left column ─────────────────────────────────────────── */}
          <div className="flex-1 space-y-5 min-w-0">

            {/* Hero banner */}
            {nextAppt ? (() => {
              const title      = getSessionTitle(nextAppt);
              const method     = getMethodLabel(nextAppt);
              const dateStr    = fmtApptDate(nextAppt.requested_start);
              const timeStr    = fmtTime(nextAppt.requested_start);
              const counselor  = nextAppt.counselor_name || 'CPS Counselor';
              const isOnline   = ['online','video'].includes((nextAppt.preferred_method || '').toLowerCase());
              const meetingLink = nextAppt.meeting_link;
              return (
                <div className="relative overflow-hidden rounded-2xl bg-[#2563eb] p-7 text-white shadow-lg">
                  <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
                  <div className="absolute -right-4 -bottom-12 w-56 h-56 rounded-full bg-white/5" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">
                        Upcoming Appointment
                      </p>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-white text-[11px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                        Confirmed
                      </span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 leading-snug">{title}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-blue-100 mb-6">
                      <span className="font-medium text-white">with {counselor}</span>
                      {dateStr && (
                        <span className="flex items-center gap-1.5">
                          <CalendarDays size={13} className="text-blue-300" />{dateStr}
                        </span>
                      )}
                      {timeStr && (
                        <span className="flex items-center gap-1.5">
                          <Clock size={13} className="text-blue-300" />{timeStr}
                        </span>
                      )}
                      {method && (
                        <span className="flex items-center gap-1.5">
                          {isOnline
                            ? <Video size={13} className="text-blue-300" />
                            : <MapPin size={13} className="text-blue-300" />}
                          {method} session
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      {isOnline && meetingLink ? (
                        <a href={meetingLink} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#2563eb] text-sm font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-sm">
                          <Video size={15} />Join Session
                        </a>
                      ) : (
                        <Link href="/my-appointments">
                          <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#2563eb] text-sm font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-sm">
                            <CalendarDays size={15} />View Session
                          </button>
                        </Link>
                      )}
                      <Link href="/my-appointments">
                        <button className="px-5 py-2.5 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold rounded-xl transition-colors">
                          Reschedule
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })() : upcoming.length === 0 && pendingRequests.length === 0 && !isCheckInOnly ? (
              <div className="relative overflow-hidden rounded-2xl bg-[#2563eb] p-7 text-white shadow-lg">
                <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
                <div className="absolute -right-4 -bottom-12 w-56 h-56 rounded-full bg-white/5" />
                <div className="relative z-10">
                  <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest mb-3">Welcome to CPS</p>
                  <h3 className="text-xl font-bold mb-2 leading-snug">
                    No need to wait, {firstName}.<br />Book your session online.
                  </h3>
                  <p className="text-sm text-blue-100 mb-6 leading-relaxed max-w-sm">
                    Confidential, free counseling for all DLSU students. Book an appointment, attend your intake, and get matched with a counselor.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {['In-person', 'Online', 'Confidential'].map(t => (
                      <span key={t} className="text-xs bg-white/20 text-white px-3 py-1 rounded-full font-medium">{t}</span>
                    ))}
                  </div>
                  <Link href="/book-appointment">
                    <button className="px-5 py-2.5 bg-white text-[#2563eb] text-sm font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-sm">
                      Book an Appointment →
                    </button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl bg-[#2563eb] p-7 text-white shadow-lg">
                <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
                <div className="absolute -right-4 -bottom-12 w-56 h-56 rounded-full bg-white/5" />
                <div className="relative z-10">
                  <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest mb-3">Your counseling journey</p>
                  <h3 className="text-xl font-bold mb-2">Keep going, {firstName}.</h3>
                  <p className="text-sm text-blue-100 mb-6 leading-relaxed max-w-sm">
                    {`You have ${pendingRequests.length} pending request${pendingRequests.length !== 1 ? 's' : ''} under review.`}
                  </p>
                  {!isCheckInOnly && (
                    <Link href="/book-appointment">
                      <button className="px-5 py-2.5 bg-white text-[#2563eb] text-sm font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-sm">
                        Book Another Appointment →
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* CPS Announcements */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-gray-900">CPS Updates &amp; Events</p>
                {announcements.length > 3 && (
                  <a href="/announcements" className="text-xs text-[#2563eb] hover:underline font-medium">
                    View All →
                  </a>
                )}
              </div>

              {announcements.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No announcements at this time.</p>
              ) : (
                <div className="space-y-1">
                  {announcements.slice(0, 3).map(a => {
                    const style = TYPE_STYLES[a.event_type] || TYPE_STYLES.info;
                    return (
                      <button
                        key={a.id}
                        onClick={() => setOpenAnnouncement(a)}
                        className="w-full text-left px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                                {style.label}
                              </span>
                              {a.pinned && <span className="text-[10px] text-gray-400 font-medium">Pinned</span>}
                            </div>
                            <p className="text-sm font-medium text-gray-800 leading-snug truncate">{a.title}</p>
                            {a.event_date && (
                              <p className="text-xs text-gray-400 mt-0.5">{fmtEventDate(a.event_date)}</p>
                            )}
                          </div>
                          <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Right column — Upcoming appointments ────────────────── */}
          <div className="w-full xl:w-72 flex-shrink-0 space-y-5">

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-gray-900">Upcoming Sessions</p>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <CalendarDays size={13} />
                  <span>{monthYear}</span>
                </div>
              </div>

              {/* Confirmed upcoming sessions */}
              {upcoming.length === 0 && pendingRequests.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays size={32} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400">No upcoming sessions.</p>
                  {!isCheckInOnly && (
                    <Link href="/book-appointment">
                      <button className="mt-3 text-xs text-[#2563eb] hover:underline font-medium">
                        Book one now →
                      </button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {upcoming.slice(0, 5).map((appt, i) => (
                    <Link key={appt.id || appt._id || i} href="/my-appointments">
                      <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
                        i === 0 ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                      }`}>
                        <div className={`flex-shrink-0 w-10 text-center rounded-xl py-1.5 ${
                          i === 0 ? 'bg-[#2563eb] text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          <p className="text-[10px] font-medium leading-none mb-0.5">{apptDay(appt.requested_start)}</p>
                          <p className="text-base font-bold leading-none">{apptNum(appt.requested_start)}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">
                            {appt.counselor_name || 'CPS Counselor'}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">
                            {fmtTime(appt.requested_start)}
                            {appt.requested_end ? ` – ${fmtTime(appt.requested_end)}` : ''}
                          </p>
                        </div>
                        <ChevronRight size={13} className={i === 0 ? 'text-blue-300' : 'text-gray-300'} />
                      </div>
                    </Link>
                  ))}

                  {/* Pending requests — shown below confirmed sessions */}
                  {pendingRequests.length > 0 && (
                    <>
                      {upcoming.length > 0 && <div className="h-px bg-gray-100 my-1" />}
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1 pt-1">
                        Pending Requests
                      </p>
                      {pendingRequests.slice(0, 3).map((appt, i) => (
                        <Link key={appt.id || appt._id || i} href="/my-appointments">
                          <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                              <CalendarDays size={14} className="text-amber-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-700 truncate">
                                {appt.purpose === 'intake_interview' ? 'Intake Interview' :
                                 appt.purpose === 'counseling' ? 'Counseling' :
                                 appt.purpose === 'follow_up_counselling' ? 'Follow-up' : 'Session Request'}
                              </p>
                              <p className="text-[10px] text-amber-600 font-medium">Pending review</p>
                            </div>
                            <ChevronRight size={13} className="text-gray-300" />
                          </div>
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              )}

              {upcoming.length > 5 && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                  <Link href="/my-appointments">
                    <span className="text-xs text-[#2563eb] hover:underline font-medium">
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
        const a     = openAnnouncement;
        const style = TYPE_STYLES[a.event_type] || TYPE_STYLES.info;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpenAnnouncement(null)} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
              <div className="h-1.5 w-full" style={{ backgroundColor:
                a.event_type === 'webinar' ? '#3b82f6' :
                a.event_type === 'event'   ? '#2563eb' :
                a.event_type === 'notice'  ? '#f97316' : '#9ca3af'
              }} />
              <div className="p-7">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-sm font-semibold px-3 py-1 rounded-full ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                      {a.pinned && <span className="text-sm text-gray-400 font-medium">Pinned</span>}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 leading-snug">{a.title}</h3>
                  </div>
                  <button onClick={() => setOpenAnnouncement(null)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition flex-shrink-0">
                    <X size={18} className="text-gray-400" />
                  </button>
                </div>
                {a.body && <p className="text-base text-gray-600 leading-relaxed mb-5">{a.body}</p>}
                {a.event_date && (
                  <div className="text-sm text-gray-500 mb-5 bg-gray-50 rounded-xl px-4 py-3 font-medium">
                    {fmtEventDate(a.event_date)}
                  </div>
                )}
                {a.link ? (
                  <a href={a.link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-white rounded-xl transition"
                    style={{ backgroundColor: '#2563eb' }}>
                    <ExternalLink size={15} /> Open Link
                  </a>
                ) : (
                  <button onClick={() => setOpenAnnouncement(null)}
                    className="w-full py-3 text-sm font-medium border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </DashboardLayout>
  );
}
