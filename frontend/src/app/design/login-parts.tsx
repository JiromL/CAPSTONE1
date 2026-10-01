'use client';

/**
 * MOCKUP ONLY — shared pieces for the /design/login-a|b|c layout options.
 * Static: nothing here calls the API. Same tokens, fonts, inputs and buttons
 * as the real app so only the layout differs between options.
 */
import { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, Phone, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export function BrandMark({ onDark = false, compact = false }: { onDark?: boolean; compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
        <span className="text-[0.625rem] font-extrabold text-white tracking-tighter select-none">CPS</span>
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold" style={{ color: onDark ? '#fff' : 'var(--color-text-primary)' }}>DLSU CPS</p>
        {!compact && (
          <p className="text-[0.6875rem] mt-0.5" style={{ color: onDark ? 'rgba(255,255,255,0.5)' : 'var(--color-text-muted)' }}>
            Counseling &amp; Psychological Services
          </p>
        )}
      </div>
    </div>
  );
}

export function ThemeButton({ onDark = false }: { onDark?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex items-center justify-center w-10 h-10 rounded-xl border transition-colors"
      style={onDark
        ? { color: 'rgba(255,255,255,0.75)', borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }
        : { color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

export function OfficePill({ onDark = false }: { onDark?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
      style={onDark
        ? { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.08)' }
        : { background: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-success)' }} />
      CPS is open now · until 5:00 PM
    </span>
  );
}

export function CrisisLine({ onDark = false }: { onDark?: boolean }) {
  return onDark ? (
    <div className="rounded-xl p-3.5" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}>
      <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: '#FCA5A5' }}>
        <Phone size={12} aria-hidden="true" /> In crisis right now?
      </p>
      <a href="https://ncmh.gov.ph" target="_blank" rel="noopener noreferrer" className="block text-[0.8125rem] mt-1 font-semibold underline underline-offset-2 text-white">
        24/7 Philippine Mental Health Hotline
      </a>
    </div>
  ) : (
    <div className="rounded-xl px-4 py-3 flex items-center gap-2.5" style={{ background: 'var(--color-danger-surface)', border: '1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)' }}>
      <Phone size={15} className="flex-shrink-0" style={{ color: 'var(--color-danger)' }} aria-hidden="true" />
      <p className="type-body-sm" style={{ color: 'var(--color-danger-text)' }}>
        In crisis right now?{' '}
        <a href="https://ncmh.gov.ph" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">24/7 Philippine Mental Health Hotline</a>
      </p>
    </div>
  );
}

export function PrivacyNote({ onDark = false }: { onDark?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5 type-caption text-center" style={{ color: onDark ? 'rgba(255,255,255,0.55)' : 'var(--color-text-muted)' }}>
      <span className="inline-flex items-center gap-1.5">
        <ShieldCheck size={13} style={{ color: 'var(--color-success)' }} aria-hidden="true" />
        Protected under RA 10173 (Data Privacy Act)
      </span>
      <span>Trouble signing in? cps@dlsu.edu.ph</span>
    </div>
  );
}

/** The sign-in card — identical in every option. */
export function LoginCard({ title = 'Welcome back', subtitle = 'Sign in with your DLSU account.' }: { title?: string; subtitle?: string }) {
  const [showPw, setShowPw] = useState(false);
  return (
    <section className="card p-7 sm:p-8" style={{ boxShadow: 'var(--shadow-card-lg)' }}>
      <h1 className="type-display" style={{ color: 'var(--color-text-primary)' }}>{title}</h1>
      <p className="type-body mt-1.5" style={{ color: 'var(--color-text-secondary)' }}>{subtitle}</p>

      <form onSubmit={e => e.preventDefault()} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="field-label">University email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} aria-hidden="true" />
            <input id="email" type="email" placeholder="you@dlsu.edu.ph" autoComplete="email" className="input !pl-10 !py-3" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className="field-label">Password</label>
            <Link href="/forgot-password" className="type-caption hover:underline underline-offset-2" style={{ color: 'var(--color-primary-text)' }}>Forgot password?</Link>
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} aria-hidden="true" />
            <input id="password" type={showPw ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" className="input !pl-10 !pr-12 !py-3" />
            <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <button type="submit" className="btn-primary w-full !min-h-12 !text-[0.9375rem] !mt-2">Sign in</button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
        <span className="type-caption" style={{ color: 'var(--color-text-muted)' }}>or</span>
        <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
      </div>

      <button type="button" className="btn-ghost w-full !min-h-11">
        <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Sign in with Google
      </button>

      <p className="type-body-sm text-center mt-6 pt-5" style={{ color: 'var(--color-text-secondary)', borderTop: '1px solid var(--color-border)' }}>
        First time here?{' '}
        <Link href="/register" className="font-semibold hover:underline underline-offset-2" style={{ color: 'var(--color-primary-text)' }}>Create a student account</Link>
      </p>
    </section>
  );
}

export function MockupBanner({ label }: { label: string }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full px-4 py-2 text-xs font-medium text-white shadow-lg" style={{ background: 'var(--color-sidebar)', border: '1px solid rgba(255,255,255,0.12)' }}>
      {label}
      <span className="text-white/40">·</span>
      <Link href="/design/login-a" className="underline underline-offset-2">A</Link>
      <Link href="/design/login-b" className="underline underline-offset-2">B</Link>
      <Link href="/design/login-c" className="underline underline-offset-2">C</Link>
      <Link href="/login" className="underline underline-offset-2">Current</Link>
    </div>
  );
}
