'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { DashboardCalendar } from './Calendar';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Calendar, BookOpen, CheckCircle, Heart, ChevronRight } from 'lucide-react';

interface DashboardProps { user: any; onLogout: () => void; }

function KpiCard({ label, value, sub, iconBg, icon }: any) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ActionCard({ href, label, desc, iconBg, icon }: any) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 rounded-xl hover:border-green-300 dark:hover:border-green-700 transition-colors cursor-pointer group">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
          {desc && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{desc}</p>}
        </div>
        <ChevronRight size={13} className="text-gray-400 group-hover:text-green-500 flex-shrink-0" />
      </div>
    </Link>
  );
}

export function StudentDashboard({ user, onLogout }: DashboardProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [isCheckInOnly, setIsCheckInOnly] = useState(false);
  const [resourceCount, setResourceCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [mounted, setMounted]           = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    (async () => {
      try {
        const [apptRes, caseRes, resRes] = await Promise.all([
          fetch(api('/api/appointments'), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(api('/api/cases/my-current'), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(api('/api/resources/student'), { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (apptRes.ok) { const d = await apptRes.json(); if (Array.isArray(d.appointments)) setAppointments(d.appointments); }
        if (caseRes.ok) { const d = await caseRes.json(); if (['CHECK_IN_ONLY','WITH_MH_CHECK_IN','UNDER_ACCOMMODATION'].includes(d.client_status)) setIsCheckInOnly(true); }
        if (resRes.ok)  { const d = await resRes.json(); setResourceCount(d.resources_count || 0); }
      } finally { setLoading(false); }
    })();
  }, [mounted]);

  const upcoming = appointments
    .filter(a => ['pending','requested','scheduled','confirmed','matched'].includes((a.status||'').toLowerCase()))
    .sort((a, b) => new Date(a.requested_start||0).getTime() - new Date(b.requested_start||0).getTime());

  const nextAppt   = upcoming[0];
  const firstName  = user.first_name || user.name?.split(' ')[0] || 'Student';
  const completed  = appointments.filter(a => (a.status||'').toUpperCase() === 'COMPLETED').length;

  const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}); } catch { return s; } };
  const fmtTime = (s: string) => { try { return new Date(s).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true}); } catch { return ''; } };

  const menuItems = getMenuItemsByRole(user.role).map(item =>
    item.id === 'resources' ? { ...item, badge: resourceCount } : item
  );

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="Your wellness overview" activeSection="dashboard">

      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Welcome back, {firstName}!</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Here's your wellness summary.</p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-7 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 h-40" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <KpiCard label="Upcoming"   value={upcoming.length} sub="appointments" iconBg="bg-green-50 dark:bg-green-900/30" icon={<Calendar size={16} className="text-green-600 dark:text-green-400"/>} />
            <KpiCard label="Completed"  value={completed} sub="sessions" iconBg="bg-green-50 dark:bg-green-900/30" icon={<CheckCircle size={16} className="text-green-600 dark:text-green-400"/>} />
            <KpiCard label="Resources"  value={resourceCount} sub="available" iconBg="bg-teal-50 dark:bg-teal-900/30" icon={<BookOpen size={16} className="text-teal-600 dark:text-teal-400"/>} />
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">In Crisis?</p>
              <p className="text-lg font-bold text-red-800 dark:text-red-200">Call 988</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Campus Security: Ext. 911</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Next Appointment */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Next Appointment</p>
              {nextAppt ? (
                <>
                  <p className="text-base font-bold text-gray-900 dark:text-white">{fmtDate(nextAppt.requested_start)}</p>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">{fmtTime(nextAppt.requested_start)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{nextAppt.counselor_name || 'Assigned Counselor'}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-medium border border-green-100 dark:border-green-800">
                    {nextAppt.status}
                  </span>
                </>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">No upcoming appointments yet.</p>
              )}
              {!isCheckInOnly && (
                <Link href="/book-appointment">
                  <button className="mt-3 w-full py-2 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                    Book Appointment
                  </button>
                </Link>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Quick Actions</p>
              <div className="space-y-2">
                {!isCheckInOnly && <>
                  <ActionCard href="/book-appointment" label="Book Appointment" desc="Schedule a new session" iconBg="bg-green-50 dark:bg-green-900/30" icon={<Calendar size={14} className="text-green-600 dark:text-green-400"/>} />
                  <ActionCard href="/my-appointments" label="My Appointments" desc="View and manage" iconBg="bg-blue-50 dark:bg-blue-900/30" icon={<CheckCircle size={14} className="text-blue-600 dark:text-blue-400"/>} />
                </>}
                <ActionCard href="/check-ins-student" label="Wellness Check-In" desc="How are you doing today?" iconBg="bg-green-50 dark:bg-green-900/30" icon={<Heart size={14} className="text-green-600 dark:text-green-400"/>} />
                <ActionCard href="/journal" label="Journal" desc="Write a new entry" iconBg="bg-purple-50 dark:bg-purple-900/30" icon={<BookOpen size={14} className="text-purple-600 dark:text-purple-400"/>} />
                <ActionCard href="/resources" label="Wellness Resources" desc="Guides, articles & more" iconBg="bg-teal-50 dark:bg-teal-900/30" icon={<BookOpen size={14} className="text-teal-600 dark:text-teal-400"/>} />
              </div>
            </div>

            {/* Calendar */}
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
        </>
      )}
    </DashboardLayout>
  );
}
