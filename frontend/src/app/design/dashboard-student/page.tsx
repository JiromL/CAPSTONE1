'use client';

import {
  LayoutDashboard, CalendarPlus, CalendarCheck, History, NotebookPen,
  HeartHandshake, User, Bell, Search, ChevronRight, CalendarDays, Clock,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

/**
 * MOCKUP ONLY — static, no auth/API calls. Lives under /design for
 * side-by-side review against the real student dashboard at /dashboard.
 */

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Request a Session', icon: CalendarPlus },
  { label: 'My Appointments', icon: CalendarCheck },
  { label: 'Session History', icon: History },
  { label: 'Journal', icon: NotebookPen },
  { label: 'Wellness Resources', icon: HeartHandshake },
  { label: 'Profile', icon: User },
];

export default function StudentDashboardMockup() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
      {/* Mockup banner */}
      <div className="fixed top-0 inset-x-0 z-30 flex items-center justify-center gap-2 py-1.5 text-xs font-medium text-white" style={{ background: 'var(--color-text-primary)' }}>
        Mockup — not wired to data. Compare with the real page at <a href="/dashboard" className="underline">/dashboard</a>.
      </div>

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col mt-7" style={{ background: 'var(--color-sidebar)' }}>
        <div className="flex items-center gap-2.5 px-5 h-16 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-primary)' }}>
            <span className="text-[10px] font-extrabold text-white tracking-tighter">CPS</span>
          </div>
          <span className="text-sm font-bold" style={{ color: 'white' }}>DLSU CPS</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(item => (
            <div key={item.label}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition"
              style={item.active
                ? { background: 'rgba(35,82,204,0.18)', color: 'white' }
                : { color: 'rgba(255,255,255,0.55)' }}>
              <item.icon size={16} />
              {item.label}
            </div>
          ))}
        </nav>

        <div className="p-4 flex items-center gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: '#2352CC' }}>RT</div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: 'white' }}>Riley Tan</p>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Student</p>
          </div>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col mt-7 min-w-0">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-6 flex-shrink-0 border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 500, fontSize: '1.375rem', letterSpacing: '-0.01em', color: 'var(--color-text-primary)' }}>Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-lg flex items-center justify-center border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
              <Search size={15} />
            </button>
            <button className="w-9 h-9 rounded-lg flex items-center justify-center border relative" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
              <Bell size={15} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-danger)' }} />
            </button>
            <button onClick={toggleTheme} className="w-9 h-9 rounded-lg flex items-center justify-center border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="flex flex-col xl:flex-row gap-6 max-w-6xl">

            {/* Left column */}
            <div className="flex-1 space-y-5 min-w-0">

              {/* Hero */}
              <div className="relative overflow-hidden rounded-2xl p-7 text-white" style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #1A3DB0 100%)', boxShadow: 'var(--shadow-card-lg)' }}>
                <div className="pointer-events-none absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
                <div className="relative z-10">
                  <p className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>Welcome to CPS</p>
                  <h2 style={{ fontFamily: 'var(--font-fraunces)', fontStyle: 'italic', fontWeight: 500, fontSize: '1.625rem', lineHeight: 1.25, letterSpacing: '-0.01em', color: 'white', marginBottom: '0.75rem' }}>
                    You don&apos;t have to figure this out alone, Riley.
                  </h2>
                  <p className="text-sm mb-6 leading-relaxed max-w-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    Free, confidential counseling for all DLSU students. In-person or online — on your own terms, at your own pace.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {['Free', 'Confidential', 'In-person & Online'].map(t => (
                      <span key={t} className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: 'rgba(255,255,255,0.18)', color: 'white' }}>{t}</span>
                    ))}
                  </div>
                  <button className="px-5 py-2.5 text-sm font-bold rounded-xl" style={{ background: 'white', color: 'var(--color-primary)' }}>
                    Talk to Someone →
                  </button>
                </div>
              </div>

              {/* Announcements */}
              <div className="rounded-2xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>CPS Updates &amp; Events</p>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>View All →</span>
                </div>
                <div className="space-y-1">
                  {[
                    { label: 'Webinar', accent: '#3B82F6', title: 'Managing Exam Season Anxiety', time: '2d ago' },
                    { label: 'Notice', accent: '#F59E0B', title: 'CPS office closed on Nov 1 (holiday)', time: '4d ago' },
                    { label: 'Event', accent: '#10B981', title: 'Mental Health Awareness Week', time: '1w ago' },
                  ].map(a => (
                    <div key={a.title} className="w-full text-left px-3 py-3 rounded-xl flex items-center gap-3 cursor-pointer transition" style={{ background: 'transparent' }}>
                      <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: a.accent }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold tracking-wide uppercase" style={{ color: a.accent }}>{a.label}</span>
                        <p className="text-sm font-semibold leading-snug truncate" style={{ color: 'var(--color-text-primary)' }}>{a.title}</p>
                        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{a.time}</span>
                      </div>
                      <ChevronRight size={14} className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Crisis strip */}
              <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', borderLeftWidth: 3 }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-danger)' }}>Need support right now?</p>
                  <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--color-danger)' }}>
                    CPS: <span className="font-bold underline underline-offset-2">09XX-XXX-XXXX</span> · Hopeline: <span className="font-bold underline underline-offset-2">1553</span> · NCMH: <span className="font-bold underline underline-offset-2">0917-899-8727</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="w-full xl:w-72 flex-shrink-0 space-y-5">
              <div className="rounded-2xl border p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Your Case</p>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)' }}>Active</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-muted)' }}>Assigned Counselor</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>Dr. Rose Tan</p>
                  </div>
                  <p className="text-xs font-mono pt-1" style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' }}>Case #0142</p>
                </div>
              </div>

              <div className="rounded-2xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
                <p className="text-sm font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Your next sessions</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer" style={{ background: 'var(--color-primary-surface)' }}>
                    <div className="flex-shrink-0 w-10 text-center rounded-xl py-1.5" style={{ background: 'var(--color-primary)', color: 'white' }}>
                      <p className="text-xs font-medium leading-none mb-0.5">Wed</p>
                      <p className="text-base font-bold leading-none">8</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>Dr. Rose Tan</p>
                      <p className="text-xs truncate flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                        <Clock size={11} /> 2:00 – 3:00 PM
                      </p>
                    </div>
                    <ChevronRight size={13} style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center" style={{ background: 'var(--color-warning-surface)', borderColor: 'var(--color-warning)' }}>
                      <CalendarDays size={14} style={{ color: 'var(--color-warning)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>Follow-up</p>
                      <p className="text-xs font-medium" style={{ color: 'var(--color-warning)' }}>Pending review</p>
                    </div>
                    <ChevronRight size={13} style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
