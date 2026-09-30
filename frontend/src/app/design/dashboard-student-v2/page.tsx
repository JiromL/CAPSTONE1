'use client';

import { useState } from 'react';
import {
  LayoutDashboard, CalendarPlus, CalendarCheck, History, NotebookPen,
  HeartHandshake, User, Bell, Search, ChevronRight, Clock, Wind,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

/**
 * MOCKUP ONLY — v2, softer "mental health" direction. Same color tokens
 * as production. Not wired to auth/API. Static.
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

const MOODS = [
  { label: 'Great', color: 'var(--color-success)', surface: 'var(--color-success-surface)' },
  { label: 'Okay', color: '#0F766E', surface: '#F0FDFA' },
  { label: 'Meh', color: 'var(--color-warning)', surface: 'var(--color-warning-surface)' },
  { label: 'Low', color: '#C2410C', surface: '#FFF7ED' },
  { label: 'Struggling', color: 'var(--color-danger)', surface: 'var(--color-danger-surface)' },
];

export default function StudentDashboardMockupV2() {
  const { theme, toggleTheme } = useTheme();
  const [mood, setMood] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
      <style>{`
        @keyframes cps-breathe-soft { 0%,100% { transform: scale(1); opacity: .5; } 50% { transform: scale(1.6); opacity: .9; } }
        .breathe-dot { width: 7px; height: 7px; border-radius: 999px; flex-shrink: 0; background: #7BAAF7; animation: cps-breathe-soft 4.2s ease-in-out infinite; }
        .pill-btn { transition: transform 220ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 220ms ease, background 180ms ease; }
        .pill-btn:hover { transform: translateY(-1px) scale(1.015); }
        .pill-btn:active { transform: scale(0.96); }
        .soft-card { transition: transform 220ms ease, box-shadow 220ms ease; }
        .soft-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-card-lg); }
        .mood-pill { transition: transform 200ms cubic-bezier(0.34,1.56,0.64,1), background 180ms ease, border-color 180ms ease; }
        .mood-pill:hover { transform: translateY(-2px) scale(1.04); }
        .mood-pill:active { transform: scale(0.95); }
        @media (prefers-reduced-motion: reduce) { .breathe-dot { animation: none; } }
      `}</style>

      <div className="fixed top-0 inset-x-0 z-30 flex items-center justify-center gap-2 py-1.5 text-xs font-medium text-white" style={{ background: 'var(--color-text-primary)' }}>
        Mockup v2 — softer direction, same colors. See also <a href="/design/dashboard-student" className="underline">v1</a> and the real page at <a href="/dashboard" className="underline">/dashboard</a>.
      </div>

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col mt-7" style={{ background: 'var(--color-sidebar)' }}>
        <div className="flex items-center gap-2.5 px-5 h-16 flex-shrink-0">
          <div className="w-8 h-8 rounded-[40%_60%_60%_40%/50%_50%_50%_50%] flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-primary)' }}>
            <span className="text-[10px] font-extrabold text-white tracking-tighter">CPS</span>
          </div>
          <span className="text-sm font-bold flex items-center gap-2" style={{ color: 'white' }}>
            DLSU CPS <span className="breathe-dot" />
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1.5">
          {NAV.map(item => (
            <div key={item.label}
              className="pill-btn flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium cursor-pointer"
              style={item.active ? { background: 'var(--color-primary)', color: 'white' } : { color: 'rgba(255,255,255,0.55)' }}>
              <item.icon size={16} />
              {item.label}
            </div>
          ))}
        </nav>

        <div className="p-4 flex items-center gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-9 h-9 rounded-[40%_60%_60%_40%/50%_50%_50%_50%] flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: '#2352CC' }}>RT</div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: 'white' }}>Riley Tan</p>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Student</p>
          </div>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col mt-7 min-w-0">
        <header className="h-16 flex items-center justify-between px-6 flex-shrink-0 border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <h1 style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 500, fontSize: '1.375rem', letterSpacing: '-0.01em', color: 'var(--color-text-primary)' }}>Dashboard</h1>
          <div className="flex items-center gap-3">
            <button className="pill-btn w-9 h-9 rounded-full flex items-center justify-center border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}><Search size={15} /></button>
            <button className="pill-btn w-9 h-9 rounded-full flex items-center justify-center border relative" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
              <Bell size={15} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-danger)' }} />
            </button>
            <button onClick={toggleTheme} className="pill-btn w-9 h-9 rounded-full flex items-center justify-center border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <div className="flex flex-col xl:flex-row gap-6 max-w-6xl">

            <div className="flex-1 space-y-5 min-w-0">

              {/* Hero */}
              <div className="relative overflow-hidden rounded-[28px] p-8 text-white" style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #1A3DB0 100%)', boxShadow: 'var(--shadow-card-lg)' }}>
                <div className="pointer-events-none absolute -top-10 -right-10 w-56 h-56 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)', filter: 'blur(4px)' }} />
                <div className="pointer-events-none absolute bottom-0 left-1/3 w-72 h-28 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
                <div className="relative z-10">
                  <p className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>Welcome back</p>
                  <h2 style={{ fontFamily: 'var(--font-fraunces)', fontStyle: 'italic', fontWeight: 500, fontSize: '1.75rem', lineHeight: 1.3, letterSpacing: '-0.01em', color: 'white', marginBottom: '0.875rem' }}>
                    Take it one gentle step at a time, Riley.
                  </h2>
                  <p className="text-sm mb-7 leading-[1.7] max-w-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    Free, confidential counseling for all DLSU students — in-person or online, whenever you&apos;re ready.
                  </p>
                  <button className="pill-btn px-6 py-3 text-sm font-bold rounded-full" style={{ background: 'white', color: 'var(--color-primary)' }}>
                    Talk to Someone →
                  </button>
                </div>
              </div>

              {/* Mood check-in — new authentic pattern */}
              <div className="soft-card rounded-[28px] border p-6" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Wind size={15} style={{ color: 'var(--color-primary)' }} />
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>How are you feeling today?</p>
                </div>
                <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>A quick, private check-in — takes 5 seconds, helps your counselor understand your week.</p>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map(m => {
                    const selected = mood === m.label;
                    return (
                      <button key={m.label} onClick={() => setMood(m.label)}
                        className="mood-pill px-4 py-2 rounded-full text-sm font-semibold border-2"
                        style={selected
                          ? { background: m.surface, borderColor: m.color, color: m.color }
                          : { background: 'var(--color-bg)', borderColor: 'transparent', color: 'var(--color-text-secondary)' }}>
                        {m.label}
                      </button>
                    );
                  })}
                </div>
                {mood && (
                  <p className="text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
                    Thanks for sharing. Logged privately — only visible to your care team.
                  </p>
                )}
              </div>

              {/* Announcements */}
              <div className="soft-card rounded-[28px] border p-6" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
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
                    <div key={a.title} className="w-full text-left px-3 py-3 rounded-2xl flex items-center gap-3 cursor-pointer">
                      <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: a.accent }} />
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
              <div className="rounded-[20px] px-5 py-4 flex items-center gap-3" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', borderLeftWidth: 4 }}>
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
              <div className="soft-card rounded-[24px] border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Your Case</p>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)' }}>Active</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-muted)' }}>Assigned Counselor</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>Dr. Rose Tan</p>
                  </div>
                  <p className="text-xs font-mono pt-2" style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' }}>Case #0142</p>
                </div>
              </div>

              {/* Breathing break quick action — new authentic pattern */}
              <div className="soft-card rounded-[24px] p-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F766E 0%, #059669 100%)' }}>
                <div className="pointer-events-none absolute -bottom-6 -right-6 w-28 h-28 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
                <div className="relative z-10 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.18)' }}>
                    <Wind size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold mb-1">Feeling overwhelmed?</p>
                    <p className="text-xs leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.85)' }}>Try a 60-second guided breathing break.</p>
                    <button className="pill-btn text-xs font-bold px-4 py-2 rounded-full" style={{ background: 'white', color: '#0F766E' }}>Start breathing →</button>
                  </div>
                </div>
              </div>

              <div className="soft-card rounded-[24px] border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
                <p className="text-sm font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Your next sessions</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer" style={{ background: 'var(--color-primary-surface)' }}>
                    <div className="flex-shrink-0 w-10 text-center rounded-2xl py-1.5" style={{ background: 'var(--color-primary)', color: 'white' }}>
                      <p className="text-xs font-medium leading-none mb-0.5">Wed</p>
                      <p className="text-base font-bold leading-none">8</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>Dr. Rose Tan</p>
                      <p className="text-xs truncate flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}><Clock size={11} /> 2:00 – 3:00 PM</p>
                    </div>
                    <ChevronRight size={13} style={{ color: 'var(--color-primary)' }} />
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
