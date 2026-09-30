'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Phone, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

/**
 * MOCKUP ONLY — v3, "appointment slip" direction. Uses the production color
 * tokens from globals.css unchanged. Not wired to auth; nothing calls the API.
 *
 * Signature: the right-hand navy panel holds a perforated counseling slip —
 * the same object that anchors the v3 student dashboard, so the first thing a
 * student sees after signing in is the "filled-in" version of this slip.
 */

// CPS office hours (Manila). Mon–Fri, 8:00 AM – 5:00 PM.
function useOfficeStatus() {
  const [status, setStatus] = useState<{ open: boolean; text: string } | null>(null);
  useEffect(() => {
    const compute = () => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila', weekday: 'short', hour: 'numeric', hour12: false,
      }).formatToParts(new Date());
      const day  = parts.find(p => p.type === 'weekday')?.value ?? 'Mon';
      const hour = Number(parts.find(p => p.type === 'hour')?.value ?? 0) % 24;
      const weekday = !['Sat', 'Sun'].includes(day);
      if (weekday && hour >= 8 && hour < 17) return { open: true, text: 'CPS is open now · until 5:00 PM' };
      const opensTomorrow = weekday && hour < 8 ? 'today' : (day === 'Fri' || day === 'Sat' || day === 'Sun') ? 'Monday' : 'tomorrow';
      return { open: false, text: `CPS office is closed · opens ${opensTomorrow} at 8:00 AM` };
    };
    setStatus(compute());
    const t = setInterval(() => setStatus(compute()), 60_000);
    return () => clearInterval(t);
  }, []);
  return status;
}

function Field({
  id, label, icon: Icon, aside, children,
}: { id: string; label: string; icon: typeof Mail; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label htmlFor={id} className="type-label" style={{ color: 'var(--color-text-primary)' }}>{label}</label>
        {aside}
      </div>
      <div className="v3-field relative flex items-center rounded-xl">
        <Icon size={16} className="absolute left-4 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

export default function LoginMockupV3() {
  const { theme, toggleTheme } = useTheme();
  const office = useOfficeStatus();
  const [showPw, setShowPw]   = useState(false);
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 1400); // mock only
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <style>{`
        .v3-display { font-family: var(--font-fraunces), Georgia, serif; font-variation-settings: 'SOFT' 100, 'opsz' 144; font-weight: 420; letter-spacing: -0.025em; }
        .v3-field { background: var(--color-bg); border: 1px solid var(--color-border); transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease; }
        .v3-field:focus-within { background: var(--color-surface); border-color: var(--color-primary); box-shadow: var(--shadow-primary); }
        .v3-field input { width: 100%; background: transparent; outline: none; padding: 0.875rem 1rem 0.875rem 2.75rem; font-size: 0.9375rem; color: var(--color-text-primary); }
        .v3-field input::placeholder { color: var(--color-text-muted); }
        .v3-btn { transition: background 150ms ease, box-shadow 150ms ease, transform 100ms ease; }
        .v3-btn:hover:not(:disabled) { background: var(--color-primary-hover); box-shadow: var(--shadow-primary); }
        .v3-btn:active:not(:disabled) { transform: scale(0.985); }
        .v3-btn .arrow { transition: transform 180ms ease; }
        .v3-btn:hover .arrow { transform: translateX(3px); }
        .v3-outline { transition: background 150ms ease, border-color 150ms ease; }
        .v3-outline:hover { background: var(--color-bg); border-color: var(--color-border-strong); }

        /* Signature: the slip settles onto the desk */
        @keyframes v3-slip-in {
          from { opacity: 0; transform: translateY(28px) rotate(-5deg); }
          to   { opacity: 1; transform: translateY(0) rotate(-2.5deg); }
        }
        @keyframes v3-stamp {
          0%   { opacity: 0; transform: scale(1.35) rotate(-14deg); }
          60%  { opacity: 1; transform: scale(0.96) rotate(-8deg); }
          100% { opacity: 1; transform: scale(1) rotate(-8deg); }
        }
        .v3-slip  { transform: rotate(-2.5deg); animation: v3-slip-in 700ms cubic-bezier(0.22, 1, 0.36, 1) 150ms both; }
        .v3-stamp { transform: rotate(-8deg); animation: v3-stamp 420ms cubic-bezier(0.34, 1.4, 0.64, 1) 900ms both; }
        .v3-rise  { animation: fade-up 400ms ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .v3-slip, .v3-stamp, .v3-rise { animation: none; }
        }
      `}</style>

      <div className="flex items-center justify-center gap-2 py-1.5 px-4 text-xs font-medium text-white text-center" style={{ background: 'var(--color-sidebar)' }}>
        Mockup v3 · same colors, new layout.
        <Link href="/login" className="underline underline-offset-2">Compare with /login</Link>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">

        {/* ── Form side ─────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col px-6 sm:px-12 py-8" style={{ background: 'var(--color-surface)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
                <span className="text-[10px] font-extrabold text-white tracking-tighter select-none">CPS</span>
              </div>
              <div className="leading-tight">
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>DLSU CPS</p>
                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Counseling &amp; Psychological Services</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="v3-outline w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          <div className="flex-1 flex items-center">
            <div className="w-full max-w-[400px] mx-auto py-12 v3-rise">
              <h1 className="v3-display" style={{ fontSize: 'clamp(2.25rem, 4vw, 2.875rem)', lineHeight: 1.05, color: 'var(--color-text-primary)' }}>
                Welcome back.
              </h1>
              <p className="type-body mt-3" style={{ color: 'var(--color-text-secondary)' }}>
                Sign in with your DLSU account to see your sessions, journal, and resources.
              </p>

              <form onSubmit={onSubmit} className="mt-9 space-y-5">
                <Field id="email" label="University email" icon={Mail}>
                  <input
                    id="email" type="email" autoComplete="email" required
                    placeholder="you@dlsu.edu.ph"
                    value={email} onChange={e => setEmail(e.target.value)}
                  />
                </Field>

                <Field
                  id="password" label="Password" icon={Lock}
                  aside={<Link href="/forgot-password" className="type-caption hover:underline underline-offset-2" style={{ color: 'var(--color-primary-text)' }}>Forgot password?</Link>}
                >
                  <input
                    id="password" type={showPw ? 'text' : 'password'} autoComplete="current-password" required
                    placeholder="Enter your password" style={{ paddingRight: '3rem' }}
                    value={password} onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-1.5 w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ color: 'var(--color-text-muted)' }}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </Field>

                <button
                  type="submit" disabled={loading}
                  className="v3-btn w-full h-12 rounded-xl text-[0.9375rem] font-semibold text-white inline-flex items-center justify-center gap-2 disabled:opacity-70"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {loading ? 'Signing in…' : <>Sign in <ArrowRight size={16} className="arrow" /></>}
                </button>
              </form>

              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                <span className="type-caption" style={{ color: 'var(--color-text-muted)' }}>or</span>
                <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
              </div>

              <button
                type="button"
                className="v3-outline w-full h-12 rounded-xl border inline-flex items-center justify-center gap-2.5 text-[0.9375rem] font-medium"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', background: 'var(--color-surface)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>
              <p className="type-caption text-center mt-2.5" style={{ color: 'var(--color-text-muted)' }}>Use your @dlsu.edu.ph Google account</p>

              <p className="type-body-sm mt-10" style={{ color: 'var(--color-text-secondary)' }}>
                First time here?{' '}
                <Link href="/register" className="font-semibold hover:underline underline-offset-2" style={{ color: 'var(--color-primary-text)' }}>Create a student account</Link>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 type-caption" style={{ color: 'var(--color-text-muted)' }}>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={13} style={{ color: 'var(--color-success)' }} aria-hidden="true" />
              Confidential under RA 10173 (Data Privacy Act)
            </span>
            <a href="mailto:cps@dlsu.edu.ph" className="hover:underline underline-offset-2">Trouble signing in? cps@dlsu.edu.ph</a>
          </div>
        </main>

        {/* ── Navy panel with the slip ──────────────────────────── */}
        <aside
          className="relative lg:w-[48%] flex flex-col justify-between overflow-hidden px-6 sm:px-12 py-10 lg:py-12"
          style={{ background: 'var(--color-sidebar)' }}
        >
          {/* Faint ruled lines — the counseling notepad */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.05]"
            style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0 39px, #fff 39px 40px)' }}
            aria-hidden="true"
          />
          <div
            className="absolute -right-40 -top-40 w-[520px] h-[520px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(35,82,204,0.35) 0%, transparent 65%)' }}
            aria-hidden="true"
          />

          <div className="relative">
            {office && (
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <span className="relative flex w-2 h-2">
                  {office.open && <span className="absolute inset-0 rounded-full animate-ping-dot" style={{ background: 'var(--color-success)' }} />}
                  <span className="relative w-2 h-2 rounded-full" style={{ background: office.open ? 'var(--color-success)' : 'rgba(255,255,255,0.4)' }} />
                </span>
                {office.text}
              </span>
            )}
          </div>

          <div className="relative py-12 lg:py-0">
            <h2 className="v3-display max-w-md" style={{ fontSize: 'clamp(2rem, 3.6vw, 3.25rem)', lineHeight: 1.08, color: 'white' }}>
              Reaching out is <span style={{ color: '#7BAAF7' }}>the first step.</span> We&apos;ll take the next one with you.
            </h2>

            {/* The slip */}
            <div className="v3-slip relative mt-12 max-w-[420px] rounded-2xl flex overflow-visible" style={{ background: 'var(--color-surface)', boxShadow: '0 30px 60px -20px rgba(0,0,0,0.55)' }}>
              <div className="w-[104px] flex-shrink-0 rounded-l-2xl flex flex-col items-center justify-center py-5 text-white" style={{ background: 'var(--color-primary)' }}>
                <span className="text-[10px] font-bold tracking-[0.16em] uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>Step</span>
                <span className="v3-display text-5xl leading-none mt-1" style={{ color: 'white' }}>1</span>
              </div>
              {/* perforation */}
              <div className="relative w-0 border-l-2 border-dashed" style={{ borderColor: 'var(--color-border-strong)' }}>
                <span className="absolute -top-2.5 -left-[11px] w-5 h-5 rounded-full" style={{ background: 'var(--color-sidebar)' }} />
                <span className="absolute -bottom-2.5 -left-[11px] w-5 h-5 rounded-full" style={{ background: 'var(--color-sidebar)' }} />
              </div>
              <div className="flex-1 p-5 min-w-0">
                <p className="type-overline" style={{ color: 'var(--color-text-muted)' }}>Counseling request</p>
                <p className="text-lg font-bold mt-1 leading-snug" style={{ color: 'var(--color-text-primary)' }}>Talk to someone</p>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div><dt style={{ color: 'var(--color-text-muted)' }}>Cost</dt><dd className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Free</dd></div>
                  <div><dt style={{ color: 'var(--color-text-muted)' }}>Mode</dt><dd className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>In-person or online</dd></div>
                  <div className="col-span-2"><dt style={{ color: 'var(--color-text-muted)' }}>Who sees it</dt><dd className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Only you and your CPS counselor</dd></div>
                </dl>
              </div>
              <span
                className="v3-stamp absolute -top-4 -right-3 rounded-lg px-2.5 py-1 text-[10px] font-extrabold tracking-[0.14em] uppercase"
                style={{ color: 'var(--color-success)', border: '2px solid var(--color-success)', background: 'var(--color-success-surface)' }}
              >
                Confidential
              </span>
            </div>
          </div>

          <div className="relative space-y-2">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
              <Phone size={14} style={{ color: '#F87171' }} aria-hidden="true" />
              In crisis right now? Call
              <a href="tel:1553" className="font-semibold underline underline-offset-2" style={{ color: '#FCA5A5' }}>NCMH 1553</a>
              — open 24/7.
            </p>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>© {new Date().getFullYear()} De La Salle University Manila</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
