'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, CalendarPlus, CalendarCheck, History, NotebookPen,
  HeartHandshake, User, Bell, Sun, Moon, Menu, X, Video, Clock, CalendarDays,
  ArrowRight, ArrowUpRight, Check, Phone, ChevronRight, LogOut, Pin,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

/**
 * MOCKUP ONLY — v3, "appointment slip" direction. Production color tokens
 * unchanged. Static sample data (dates are relative to today so the page
 * always reads as current). Not wired to auth or the API.
 */

const NAV = [
  { label: 'Dashboard',          icon: LayoutDashboard, href: '/dashboard', active: true },
  { label: 'Request a Session',  icon: CalendarPlus,    href: '/book-appointment' },
  { label: 'My Appointments',    icon: CalendarCheck,   href: '/my-appointments' },
  { label: 'Session History',    icon: History,         href: '/counseling' },
  { label: 'Journal',            icon: NotebookPen,     href: '/journal' },
  { label: 'Wellness Resources', icon: HeartHandshake,  href: '/resources', badge: 3 },
  { label: 'Profile',            icon: User,            href: '/profile' },
];

const ANNOUNCEMENTS = [
  { type: 'Webinar', accent: 'var(--color-info)',    title: 'Sleep, stress, and finals week: a 45-minute primer', when: 'Thu, Oct 9 · 3:00 PM', pinned: true },
  { type: 'Event',   accent: 'var(--color-success)', title: 'Mental Health Month walk around the Henry Sy grounds', when: 'Sat, Oct 11 · 7:00 AM' },
  { type: 'Notice',  accent: 'var(--color-warning)', title: 'CPS office closed on Oct 31 for All Saints’ Day', when: 'Posted 2d ago' },
];

const REQUEST_STEPS = ['Requested', 'Under review', 'Confirmed'] as const;

const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-PH', o);

function greeting(h: number) {
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function Card({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <section className={`rounded-2xl border ${className}`} style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-card)', ...style }}>
      {children}
    </section>
  );
}

function CardHead({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-3">
      <h3 className="type-section-title" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
      {action}
    </div>
  );
}

export default function StudentDashboardMockupV3() {
  const { theme, toggleTheme } = useTheme();
  const [now, setNow] = useState<Date | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => { setNow(new Date()); }, []);
  if (!now) return <div className="min-h-screen" style={{ background: 'var(--color-bg)' }} />;

  // Sample data, relative to today
  const session = addDays(now, 2); session.setHours(14, 0, 0, 0);
  const journalDays = [addDays(now, -3), addDays(now, -1), now].map(d => d.toDateString());
  const weekStart = addDays(now, -((now.getDay() + 6) % 7)); // Monday
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const daysAway = Math.round((new Date(session).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86_400_000);
  const requestStep = 1; // 0 Requested · 1 Under review · 2 Confirmed

  const Sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 h-16 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
          <span className="text-[10px] font-extrabold text-white tracking-tighter select-none">CPS</span>
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">DLSU CPS</p>
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Student</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Main">
        {NAV.map(item => (
          <Link
            key={item.label} href={item.href}
            aria-current={item.active ? 'page' : undefined}
            className="v3-nav relative flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-medium"
            data-active={item.active || undefined}
          >
            <item.icon size={17} aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="text-[11px] font-bold rounded-full px-2 py-0.5" style={{ background: 'var(--color-primary)', color: 'white' }} aria-label={`${item.badge} new`}>
                {item.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>

      <div className="mx-3 mb-3 rounded-xl p-3.5" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}>
        <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: '#FCA5A5' }}>
          <Phone size={12} aria-hidden="true" /> Need help right now?
        </p>
        <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
          NCMH <a href="tel:1553" className="font-semibold underline underline-offset-2 text-white">1553</a> · open 24/7
        </p>
      </div>

      <div className="px-4 py-4 flex items-center gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: 'var(--color-primary)' }}>RT</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate text-white">Riley Tan</p>
          <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>riley_tan@dlsu.edu.ph</p>
        </div>
        <button className="w-9 h-9 rounded-lg flex items-center justify-center v3-side-icon" aria-label="Sign out">
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <style>{`
        .v3-display { font-family: var(--font-fraunces), Georgia, serif; font-variation-settings: 'SOFT' 100, 'opsz' 144; font-weight: 420; letter-spacing: -0.025em; }
        .v3-nav { color: rgba(255,255,255,0.62); transition: background 150ms ease, color 150ms ease; }
        .v3-nav:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .v3-nav[data-active] { background: rgba(35,82,204,0.28); color: #fff; }
        .v3-nav[data-active]::before { content: ''; position: absolute; left: -12px; top: 10px; bottom: 10px; width: 3px; border-radius: 0 3px 3px 0; background: #7BAAF7; }
        .v3-side-icon { color: rgba(255,255,255,0.55); transition: background 150ms, color 150ms; }
        .v3-side-icon:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .v3-icon-btn { color: var(--color-text-secondary); border: 1px solid var(--color-border); background: var(--color-surface); transition: background 150ms, border-color 150ms; }
        .v3-icon-btn:hover { background: var(--color-bg); border-color: var(--color-border-strong); }
        .v3-row { transition: background 150ms ease; }
        .v3-row:hover { background: var(--color-bg); }
        .v3-row:hover .chev { transform: translateX(2px); }
        .v3-row .chev { transition: transform 150ms ease; }
        .v3-slip-in { animation: v3-slip 600ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes v3-slip { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .v3-slip-in { animation: none; } }
      `}</style>

      <div className="flex items-center justify-center gap-2 py-1.5 px-4 text-xs font-medium text-white text-center" style={{ background: 'var(--color-sidebar)' }}>
        Mockup v3 · same colors, sample data.
        <Link href="/design/login-v3" className="underline underline-offset-2">See login v3</Link>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:block w-64 flex-shrink-0" style={{ background: 'var(--color-sidebar)' }}>
          <div className="sticky top-0 h-screen">{Sidebar}</div>
        </aside>

        {/* Sidebar — mobile drawer */}
        {navOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div className="absolute inset-0 animate-fade-in" style={{ background: 'rgba(13,21,38,0.5)' }} onClick={() => setNavOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 animate-slide-in-left" style={{ background: 'var(--color-sidebar)' }}>
              <button onClick={() => setNavOpen(false)} className="absolute top-3.5 right-3 w-9 h-9 rounded-lg flex items-center justify-center v3-side-icon" aria-label="Close menu">
                <X size={18} />
              </button>
              {Sidebar}
            </aside>
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Top bar */}
          <header className="flex items-center gap-3 px-4 sm:px-8 h-16 border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            <button onClick={() => setNavOpen(true)} className="lg:hidden v3-icon-btn w-10 h-10 rounded-xl flex items-center justify-center" aria-label="Open menu">
              <Menu size={18} />
            </button>
            <p className="type-label flex-1" style={{ color: 'var(--color-text-muted)' }}>
              {fmt(now, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <button className="v3-icon-btn relative w-10 h-10 rounded-xl flex items-center justify-center" aria-label="Notifications, 2 unread">
              <Bell size={17} />
              <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full" style={{ background: 'var(--color-danger)', boxShadow: '0 0 0 2px var(--color-surface)' }} />
            </button>
            <button onClick={toggleTheme} className="v3-icon-btn w-10 h-10 rounded-xl flex items-center justify-center" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </header>

          <main className="px-4 sm:px-8 py-8 max-w-[1200px] mx-auto">
            {/* Greeting */}
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8 animate-fade-up">
              <div>
                <h1 className="v3-display" style={{ fontSize: 'clamp(1.875rem, 3.2vw, 2.5rem)', lineHeight: 1.1, color: 'var(--color-text-primary)' }}>
                  {greeting(now.getHours())}, Riley.
                </h1>
                <p className="type-body mt-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Your next session is {daysAway === 1 ? 'tomorrow' : `in ${daysAway} days`}. Here&apos;s everything in one place.
                </p>
              </div>
              <Link href="/book-appointment" className="btn-primary h-11 !px-5 !text-sm">
                <CalendarPlus size={16} /> Request a session
              </Link>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* ── Left column ──────────────────────────────── */}
              <div className="xl:col-span-8 space-y-6 min-w-0">

                {/* Signature: next-session slip */}
                <article className="v3-slip-in relative flex flex-col sm:flex-row rounded-2xl" style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card-lg)', border: '1px solid var(--color-border)' }} aria-label="Next session">
                  <div className="sm:w-40 flex-shrink-0 flex sm:flex-col items-center sm:justify-center gap-4 sm:gap-0 px-6 py-5 sm:py-7 rounded-t-2xl sm:rounded-tr-none sm:rounded-l-2xl text-white" style={{ background: 'var(--color-primary)' }}>
                    <span className="text-xs font-bold tracking-[0.16em] uppercase" style={{ color: 'rgba(255,255,255,0.75)' }}>{fmt(session, { weekday: 'short' })}</span>
                    <span className="v3-display text-6xl leading-none sm:my-1.5" style={{ color: 'white' }}>{session.getDate()}</span>
                    <span className="text-xs font-bold tracking-[0.16em] uppercase" style={{ color: 'rgba(255,255,255,0.75)' }}>{fmt(session, { month: 'short' })}</span>
                    <span className="sm:mt-4 ml-auto sm:ml-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.16)' }}>
                      <Clock size={12} aria-hidden="true" /> 2:00 PM
                    </span>
                  </div>

                  {/* perforation */}
                  <div className="relative hidden sm:block w-0 border-l-2 border-dashed" style={{ borderColor: 'var(--color-border)' }} aria-hidden="true">
                    <span className="absolute -top-[11px] -left-[11px] w-5 h-5 rounded-full" style={{ background: 'var(--color-bg)', boxShadow: 'inset 0 -1px 0 var(--color-border)' }} />
                    <span className="absolute -bottom-[11px] -left-[11px] w-5 h-5 rounded-full" style={{ background: 'var(--color-bg)', boxShadow: 'inset 0 1px 0 var(--color-border)' }} />
                  </div>

                  <div className="flex-1 p-6 sm:p-7 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="type-overline" style={{ color: 'var(--color-text-muted)' }}>Next session</span>
                      <span className="badge" style={{ background: 'var(--color-success-surface)', color: 'var(--color-success-text)' }}>
                        <Check size={12} strokeWidth={3} aria-hidden="true" /> Confirmed
                      </span>
                    </div>
                    <h2 className="text-xl font-bold mt-2 leading-snug" style={{ color: 'var(--color-text-primary)' }}>Follow-up counseling session</h2>

                    <dl className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary-text)' }}>MR</div>
                        <div className="min-w-0">
                          <dt className="type-caption" style={{ color: 'var(--color-text-muted)' }}>Counselor</dt>
                          <dd className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>Ms. Marga Reyes</dd>
                        </div>
                      </div>
                      <div>
                        <dt className="type-caption" style={{ color: 'var(--color-text-muted)' }}>Where</dt>
                        <dd className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}><Video size={14} aria-hidden="true" style={{ color: 'var(--color-primary-text)' }} />Google Meet</dd>
                      </div>
                      <div>
                        <dt className="type-caption" style={{ color: 'var(--color-text-muted)' }}>Length</dt>
                        <dd className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>50 minutes</dd>
                      </div>
                    </dl>

                    <div className="flex flex-wrap items-center gap-2.5 mt-6 pt-5 border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <button disabled className="btn-primary h-10 !px-4 opacity-50 cursor-not-allowed" aria-describedby="join-hint">
                        <Video size={15} /> Join session
                      </button>
                      <button className="btn-ghost h-10">Reschedule</button>
                      <button className="btn-ghost h-10"><CalendarDays size={14} /> Add to calendar</button>
                      <span id="join-hint" className="type-caption w-full sm:w-auto sm:ml-auto" style={{ color: 'var(--color-text-muted)' }}>Link opens 10 minutes before</span>
                    </div>
                  </div>
                </article>

                {/* This week ribbon */}
                <Card>
                  <CardHead
                    title="This week"
                    action={
                      <div className="flex items-center gap-4 type-caption" style={{ color: 'var(--color-text-muted)' }}>
                        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)' }} />Session</span>
                        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full border-2" style={{ borderColor: 'var(--color-success)' }} />Journal entry</span>
                      </div>
                    }
                  />
                  <ol className="grid grid-cols-7 gap-1.5 sm:gap-2 px-5 pb-5">
                    {week.map(d => {
                      const isToday = sameDay(d, now);
                      const hasSession = sameDay(d, session);
                      const hasJournal = journalDays.includes(d.toDateString());
                      const past = d < now && !isToday;
                      const label = [fmt(d, { weekday: 'long', month: 'short', day: 'numeric' }), isToday && 'today', hasSession && 'session at 2:00 PM', hasJournal && 'journal entry'].filter(Boolean).join(', ');
                      return (
                        <li
                          key={d.toISOString()} aria-label={label}
                          className="rounded-xl flex flex-col items-center py-3 gap-1"
                          style={{
                            background: hasSession ? 'var(--color-primary-surface)' : 'transparent',
                            border: isToday ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                            opacity: past ? 0.6 : 1,
                          }}
                        >
                          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{fmt(d, { weekday: 'narrow' })}</span>
                          <span className="text-base sm:text-lg font-bold tabular-nums" style={{ color: hasSession ? 'var(--color-primary-text)' : 'var(--color-text-primary)' }}>{d.getDate()}</span>
                          <span className="flex items-center gap-1 h-2">
                            {hasSession && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)' }} />}
                            {hasJournal && <span className="w-2 h-2 rounded-full border-2" style={{ borderColor: 'var(--color-success)' }} />}
                          </span>
                          {isToday && <span className="text-[10px] font-bold uppercase tracking-wide hidden sm:block" style={{ color: 'var(--color-primary-text)' }}>Today</span>}
                        </li>
                      );
                    })}
                  </ol>
                </Card>

                {/* Pending request tracker */}
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="type-section-title" style={{ color: 'var(--color-text-primary)' }}>Group session request</h3>
                      <p className="type-body-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Sent {fmt(addDays(now, -1), { month: 'short', day: 'numeric' })} · We usually reply within 1–2 business days.</p>
                    </div>
                    <span className="badge" style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning-text)' }}>Under review</span>
                  </div>
                  <ol className="flex items-center mt-5" aria-label="Request progress">
                    {REQUEST_STEPS.map((step, i) => {
                      const done = i < requestStep, current = i === requestStep;
                      return (
                        <li key={step} className={`flex items-center ${i < REQUEST_STEPS.length - 1 ? 'flex-1' : ''}`} aria-current={current ? 'step' : undefined}>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={done
                                ? { background: 'var(--color-primary)', color: 'white' }
                                : current
                                  ? { background: 'var(--color-primary-surface)', color: 'var(--color-primary-text)', boxShadow: '0 0 0 2px var(--color-primary)' }
                                  : { background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                            >
                              {done ? <Check size={14} strokeWidth={3} /> : i + 1}
                            </span>
                            <span className="text-xs sm:text-sm font-semibold whitespace-nowrap" style={{ color: done || current ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>{step}</span>
                          </div>
                          {i < REQUEST_STEPS.length - 1 && (
                            <span className="flex-1 h-0.5 mx-3 rounded-full" style={{ background: done ? 'var(--color-primary)' : 'var(--color-border)' }} />
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </Card>

                {/* Announcements */}
                <Card>
                  <CardHead title="CPS updates & events" action={<Link href="/announcements" className="type-label hover:underline underline-offset-2" style={{ color: 'var(--color-primary-text)' }}>View all</Link>} />
                  <ul className="px-2 pb-2">
                    {ANNOUNCEMENTS.map(a => (
                      <li key={a.title}>
                        <button className="v3-row w-full text-left flex items-center gap-4 px-3 py-3 rounded-xl">
                          <span className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: a.accent }} aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                              {a.type}
                              {a.pinned && <span className="inline-flex items-center gap-1 normal-case tracking-normal font-medium"><Pin size={11} aria-hidden="true" />Pinned</span>}
                            </p>
                            <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--color-text-primary)' }}>{a.title}</p>
                            <p className="type-caption mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{a.when}</p>
                          </div>
                          <ChevronRight size={16} className="chev flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>

              {/* ── Right column ─────────────────────────────── */}
              <div className="xl:col-span-4 space-y-6 min-w-0">
                {/* Case */}
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="type-section-title" style={{ color: 'var(--color-text-primary)' }}>Your case</h3>
                    <span className="badge" style={{ background: 'var(--color-success-surface)', color: 'var(--color-success-text)' }}>Active</span>
                  </div>
                  <dl className="mt-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="type-body-sm" style={{ color: 'var(--color-text-muted)' }}>Counselor</dt>
                      <dd className="type-body-sm font-semibold text-right" style={{ color: 'var(--color-text-primary)' }}>Ms. Marga Reyes</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="type-body-sm" style={{ color: 'var(--color-text-muted)' }}>Sessions so far</dt>
                      <dd className="type-body-sm font-semibold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>4</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="type-body-sm" style={{ color: 'var(--color-text-muted)' }}>Case no.</dt>
                      <dd className="type-body-sm font-mono" style={{ color: 'var(--color-text-secondary)' }}>CPS-2026-0142</dd>
                    </div>
                  </dl>
                  <Link href="/counseling" className="mt-5 flex items-center justify-between rounded-xl px-4 h-11 type-label v3-row" style={{ color: 'var(--color-primary-text)', background: 'var(--color-primary-surface)' }}>
                    View session history <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </Card>

                {/* Journal prompt */}
                <Card className="p-5">
                  <div className="relative">
                    <p className="type-overline flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}><NotebookPen size={12} aria-hidden="true" /> Journal</p>
                    <p className="v3-display text-2xl mt-3 leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                      What&apos;s one thing you want to bring up on {fmt(session, { weekday: 'long' })}?
                    </p>
                    <p className="type-caption mt-2" style={{ color: 'var(--color-text-muted)' }}>Private to you unless you choose to share it.</p>
                    <Link href="/journal" className="btn-ghost h-10 mt-5 !bg-[var(--color-surface)]">Write an entry <ArrowRight size={14} /></Link>
                  </div>
                </Card>

                {/* Resources */}
                <Card>
                  <CardHead title="For you" action={<span className="badge" style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary-text)' }}>3 new</span>} />
                  <ul className="px-2 pb-2">
                    {[
                      { t: 'Box breathing, in 4 minutes', m: 'Audio · 4 min' },
                      { t: 'When deadlines pile up', m: 'Guide · 6 min read' },
                      { t: 'Talking to family about therapy', m: 'Article · 5 min read' },
                    ].map(r => (
                      <li key={r.t}>
                        <Link href="/resources" className="v3-row flex items-center gap-3 px-3 py-3 rounded-xl">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{r.t}</p>
                            <p className="type-caption" style={{ color: 'var(--color-text-muted)' }}>{r.m}</p>
                          </div>
                          <ArrowUpRight size={15} className="chev flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* Crisis — always visible, also on mobile where the sidebar is hidden */}
                <div className="rounded-2xl p-4 flex gap-3 lg:hidden" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
                  <Phone size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} aria-hidden="true" />
                  <p className="type-body-sm" style={{ color: 'var(--color-danger-text)' }}>
                    <span className="font-semibold">Need help right now?</span> Call NCMH <a href="tel:1553" className="font-bold underline underline-offset-2">1553</a>, open 24/7.
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
