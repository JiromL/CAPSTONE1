'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { DashboardCalendar } from './Calendar';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Loader2, ExternalLink, X, ChevronRight } from 'lucide-react';

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

export function StudentDashboard({ user, onLogout }: DashboardProps) {
  const [appointments, setAppointments]   = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [openAnnouncement, setOpenAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading]             = useState(true);
  const [isCheckInOnly, setIsCheckInOnly] = useState(false);
  const [resourceCount, setResourceCount] = useState(0);
  const [selectedDate, setSelectedDate]   = useState<Date | null>(null);
  const [mounted, setMounted]             = useState(false);

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

  const upcoming  = appointments
    .filter(a => ['pending','requested','scheduled','confirmed','matched'].includes((a.status||'').toLowerCase()))
    .sort((a, b) => new Date(a.requested_start||0).getTime() - new Date(b.requested_start||0).getTime());

  const nextAppt  = upcoming[0];
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Student';

  const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}); } catch { return s; } };
  const fmtTime = (s: string) => { try { return new Date(s).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true}); } catch { return ''; } };

  const menuItems = getMenuItemsByRole(user.role).map(item =>
    item.id === 'resources' ? { ...item, badge: resourceCount } : item
  );

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="" activeSection="dashboard">

      {/* Greeting */}
      <div className="mb-6 pb-5 border-b border-gray-200">
        <p className="text-xs text-gray-400 mb-0.5">{todayStr}</p>
        <h2 className="text-xl font-semibold text-gray-900">Good day, {firstName}.</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">

            {/* Next appointment */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Next Appointment</p>
              {nextAppt ? (
                <div>
                  <p className="text-base font-semibold text-gray-900">{fmtDate(nextAppt.requested_start)}</p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: '#1a5228' }}>{fmtTime(nextAppt.requested_start)}</p>
                  <p className="text-sm text-gray-500 mt-1">{nextAppt.counselor_name || 'Assigned Counselor'}</p>
                  <span className="inline-block mt-3 px-2.5 py-1 text-xs rounded-full bg-green-50 text-green-700 font-medium border border-green-100">
                    {nextAppt.status}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No upcoming appointments.</p>
              )}
              {!isCheckInOnly && (
                <Link href="/book-appointment">
                  <button className="mt-4 w-full py-2 text-sm font-medium text-white rounded-lg transition-colors"
                    style={{ backgroundColor: '#1a5228' }}>
                    Book an Appointment
                  </button>
                </Link>
              )}
            </div>

            {/* CPS Announcements */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">CPS Updates & Events</p>

              {announcements.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No announcements at this time.</p>
              ) : (
                <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto pr-1">
                  {announcements.map(a => {
                    const style = TYPE_STYLES[a.event_type] || TYPE_STYLES.info;
                    return (
                      <button
                        key={a.id}
                        onClick={() => setOpenAnnouncement(a)}
                        className="w-full text-left py-3.5 hover:bg-gray-50 -mx-1 px-1 rounded-lg transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                                {style.label}
                              </span>
                              {a.pinned && <span className="text-xs text-gray-400">📌</span>}
                            </div>
                            <p className="text-sm font-medium text-gray-800 leading-snug">{a.title}</p>
                            {a.event_date && (
                              <p className="text-xs text-gray-400 mt-1">📅 {fmtEventDate(a.event_date)}</p>
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

          {/* Calendar */}
          <div>
            <DashboardCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              title="Appointment Schedule"
              showAppointments={true}
              appointments={appointments.map((a: any) => ({
                date: new Date(a.requested_start || new Date()),
                title: 'Counseling Session',
                time: a.status || 'Scheduled',
              }))}
            />
          </div>
        </div>
      )}
      {/* Announcement modal */}
      {openAnnouncement && (() => {
        const a     = openAnnouncement;
        const style = TYPE_STYLES[a.event_type] || TYPE_STYLES.info;
        const typeLabel = style.label;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpenAnnouncement(null)} />

            {/* Panel */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              {/* Top color strip */}
              <div className="h-1.5 w-full" style={{ backgroundColor:
                a.event_type === 'webinar' ? '#3b82f6' :
                a.event_type === 'event'   ? '#1a5228' :
                a.event_type === 'notice'  ? '#f97316' : '#9ca3af'
              }} />

              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                        {typeLabel}
                      </span>
                      {a.pinned && <span className="text-xs text-gray-400">📌 Pinned</span>}
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 leading-snug">{a.title}</h3>
                  </div>
                  <button onClick={() => setOpenAnnouncement(null)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition flex-shrink-0 mt-0.5">
                    <X size={16} className="text-gray-400" />
                  </button>
                </div>

                {/* Body */}
                {a.body && (
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">{a.body}</p>
                )}

                {/* Event date */}
                {a.event_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <span>📅</span>
                    <span>{fmtEventDate(a.event_date)}</span>
                  </div>
                )}

                {/* Link button */}
                {a.link ? (
                  <a href={a.link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-white rounded-lg transition"
                    style={{ backgroundColor: '#1a5228' }}>
                    <ExternalLink size={14} /> Open Link
                  </a>
                ) : (
                  <button onClick={() => setOpenAnnouncement(null)}
                    className="w-full py-2.5 text-sm font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition">
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
