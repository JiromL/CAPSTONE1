'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/utils/api';
import { Mail, Lock, Eye, EyeOff, Phone, ShieldCheck, Sun, Moon, Loader2, CalendarPlus, CalendarCheck, NotebookPen, HeartHandshake } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { CpsLogoMark, CPS_LOGO_TILE } from '@/components/CpsLogo';

// CPS office hours (Manila): Mon–Fri, 8:00 AM – 5:00 PM.
function useOfficeStatus() {
  const [status, setStatus] = useState<{ open: boolean; text: string } | null>(null);
  useEffect(() => {
    const compute = () => {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', weekday: 'short', hour: 'numeric', hour12: false }).formatToParts(new Date());
      const day  = parts.find(p => p.type === 'weekday')?.value ?? 'Mon';
      const hour = Number(parts.find(p => p.type === 'hour')?.value ?? 0) % 24;
      const weekday = !['Sat', 'Sun'].includes(day);
      if (weekday && hour >= 8 && hour < 17) return { open: true, text: 'CPS is open now · until 5:00 PM' };
      const opens = weekday && hour < 8 ? 'today' : ['Fri', 'Sat', 'Sun'].includes(day) ? 'Monday' : 'tomorrow';
      return { open: false, text: `CPS office is closed · opens ${opens} at 8:00 AM` };
    };
    setStatus(compute());
    const t = setInterval(() => setStatus(compute()), 60_000);
    return () => clearInterval(t);
  }, []);
  return status;
}

function LoginContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get('expired') === 'true';
  const { theme, toggleTheme } = useTheme();
  const office = useOfficeStatus();

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [googleReady, setGoogleReady]   = useState(false);
  const [googleError, setGoogleError]   = useState('');

  useEffect(() => {
    const loadGoogle = async () => {
      try {
        if ((window as any).google?.accounts?.id) {
          const res = await fetch(api('/api/auth/oauth/google/client-id'));
          if (!res.ok) throw new Error('Failed to fetch Client ID');
          const { client_id } = await res.json();
          (window as any).google.accounts.id.initialize({ client_id, callback: handleGoogle });
          const el = document.getElementById('google-btn');
          if (el && !el.children.length) {
            (window as any).google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', width: '100%' });
            setGoogleReady(true);
          }
          return;
        }
        const res = await fetch(api('/api/auth/oauth/google/client-id'));
        if (!res.ok) throw new Error(`Failed to fetch Client ID: ${res.status}`);
        const { client_id } = await res.json();
        if (!client_id) throw new Error('No Client ID');
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true; script.defer = true;
        script.onload = () => {
          if (!(window as any).google?.accounts?.id) return;
          (window as any).google.accounts.id.initialize({ client_id, callback: handleGoogle });
          const el = document.getElementById('google-btn');
          if (el && !el.children.length) {
            (window as any).google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', width: '100%' });
            setGoogleReady(true);
          }
        };
        script.onerror = () => setGoogleError('Failed to load Google Sign-In');
        document.head.appendChild(script);
      } catch (err) {
        setGoogleError(err instanceof Error ? err.message : String(err));
      }
    };
    loadGoogle();
  }, []);

  const handleGoogle = async (response: any) => {
    if (!response.credential) { setError('Google sign-in failed'); return; }
    setLoading(true); setError('');
    try {
      const r = await fetch(api('/api/auth/oauth/google/callback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(r.status === 403 ? `${d.error || 'Access denied'}${d.email ? ` (${d.email})` : ''}` : d.error || 'Sign-in failed');
        return;
      }
      const d = await r.json();
      localStorage.setItem('token', d.access_token);
      localStorage.setItem('user', JSON.stringify(d));
      router.replace('/dashboard');
    } catch { setError('Google sign-in failed. Please try again or use email and password.'); }
    finally { setLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const r = await fetch(api('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error || "That email and password didn't match. Please try again.");
        return;
      }
      const d = await r.json();
      localStorage.setItem('token', d.access_token);
      localStorage.setItem('user', JSON.stringify(d));
      router.replace('/dashboard');
    } catch { setError('Unable to connect. Check your internet connection and try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row-reverse" style={{ background: 'var(--color-bg)' }}>

      {/* ── Form side — same canvas as the rest of the app ─────── */}
      <main
        className="flex-1 flex flex-col px-5 sm:px-10 py-6"
        style={{ background: 'radial-gradient(1100px 420px at 30% -140px, color-mix(in srgb, var(--color-primary) 16%, transparent), transparent 72%), var(--color-bg)' }}
      >
        <div className="flex items-center justify-between lg:justify-end">
          {/* Brand — mobile only (the navy panel carries it on desktop) */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={CPS_LOGO_TILE}>
              <CpsLogoMark />
            </div>
            <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>DLSU CPS</p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-10 h-10 rounded-xl border transition-colors duration-150 hover:bg-[var(--color-bg)] hover:border-[var(--color-border-strong)]"
            style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-[26rem] animate-fade-up">
            <section className="card p-7 sm:p-8">
              <h1 className="type-display" style={{ color: 'var(--color-text-primary)' }}>Welcome back</h1>
              <p className="type-body mt-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                Sign in with your DLSU account.
              </p>

              {/* Alerts */}
              {sessionExpired && (
                <div role="status" className="mt-5 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in"
                  style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning-text)', border: '1px solid rgba(217,119,6,0.2)' }}>
                  Your session expired. Please sign in again.
                </div>
              )}
              {error && (
                <div role="alert" className="mt-5 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in"
                  style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger-text)', border: '1px solid rgba(220,38,38,0.2)' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="email" className="field-label">University email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} aria-hidden="true" />
                    <input
                      id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@dlsu.edu.ph" required autoComplete="email"
                      className="input !pl-10 !py-3"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="password" className="field-label">Password</label>
                    <Link href="/forgot-password" className="type-caption hover:underline underline-offset-2" style={{ color: 'var(--color-primary-text)' }}>
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} aria-hidden="true" />
                    <input
                      id="password" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password" required autoComplete="current-password"
                      className="input !pl-10 !pr-12 !py-3"
                    />
                    <button
                      type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg flex items-center justify-center transition-colors hover:text-[var(--color-text-secondary)]"
                      style={{ color: 'var(--color-text-muted)' }}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full !min-h-12 !text-[0.9375rem] !mt-2">
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                    : 'Sign in'}
                </button>
              </form>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                <span className="type-caption" style={{ color: 'var(--color-text-muted)' }}>or</span>
                <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
              </div>

              {/* Google */}
              {googleError
                ? <div className="p-3 rounded-xl text-center text-sm" style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger-text)' }}>
                    Google Sign-In is unavailable right now. Use your email and password instead.
                  </div>
                : <div>
                    {!googleReady && (
                      <div className="flex items-center justify-center gap-2 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        <Loader2 size={14} className="animate-spin" /> Loading Google Sign-In…
                      </div>
                    )}
                    <div id="google-btn" className="w-full flex justify-center min-h-[44px]" />
                    {googleReady && (
                      <p className="type-caption text-center mt-2" style={{ color: 'var(--color-text-muted)' }}>Use your @dlsu.edu.ph Google account</p>
                    )}
                  </div>
              }

              <p className="type-body-sm text-center mt-6 pt-5" style={{ color: 'var(--color-text-secondary)', borderTop: '1px solid var(--color-border)' }}>
                First time here?{' '}
                <Link href="/register" className="font-semibold hover:underline underline-offset-2" style={{ color: 'var(--color-primary-text)' }}>Create a student account</Link>
              </p>
            </section>

            <div className="mt-5 flex flex-col items-center gap-1.5 type-caption text-center" style={{ color: 'var(--color-text-muted)' }}>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={13} style={{ color: 'var(--color-success)' }} aria-hidden="true" />
                Protected under RA 10173 (Data Privacy Act)
              </span>
              <a href="mailto:cps@dlsu.edu.ph" className="hover:underline underline-offset-2">Trouble signing in? cps@dlsu.edu.ph</a>
            </div>
          </div>
        </div>
      </main>

      {/* ── Navy panel — mirrors the app sidebar ──────────────── */}
      <aside className="relative lg:w-[42%] xl:w-[38%] flex flex-col justify-between overflow-hidden px-6 sm:px-10 py-8 lg:py-10" style={{ background: 'var(--color-sidebar)' }}>
        <div className="absolute -left-40 -top-40 w-[520px] h-[520px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(35,82,204,0.28) 0%, transparent 65%)' }} aria-hidden="true" />

        {/* Brand — same block as the sidebar */}
        <div className="relative hidden lg:flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={CPS_LOGO_TILE}>
            <CpsLogoMark />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-white">DLSU CPS</p>
            <p className="text-[0.6875rem] text-white/50 mt-0.5">Counseling &amp; Psychological Services</p>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <h2 className="font-display max-w-sm" style={{ fontSize: 'clamp(1.625rem, 2.4vw, 2.125rem)', lineHeight: 1.25, color: 'white' }}>
            Reaching out is the first step. We&apos;ll take the next one with you.
          </h2>

          <p className="mt-9 px-1 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-white/40">What you can do here</p>
          <ul className="mt-2 space-y-0.5">
            {[
              { icon: CalendarPlus,   label: 'Request a session, in person or online' },
              { icon: CalendarCheck,  label: 'Keep track of your appointments' },
              { icon: NotebookPen,    label: 'Write in a private journal' },
              { icon: HeartHandshake, label: 'Browse wellness resources' },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 px-1 h-11 text-sm text-white/75">
                <Icon size={18} strokeWidth={1.75} className="flex-shrink-0 text-white/60" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative space-y-3">
          {office && (
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="relative flex w-2 h-2">
                {office.open && <span className="absolute inset-0 rounded-full animate-ping-dot" style={{ background: 'var(--color-success)' }} />}
                <span className="relative w-2 h-2 rounded-full" style={{ background: office.open ? 'var(--color-success)' : 'rgba(255,255,255,0.4)' }} />
              </span>
              {office.text}
            </span>
          )}

          {/* Crisis card — same treatment as the sidebar */}
          <div className="rounded-xl p-3.5" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}>
            <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: '#FCA5A5' }}>
              <Phone size={12} aria-hidden="true" /> In crisis right now?
            </p>
            <a href="https://ncmh.gov.ph" target="_blank" rel="noopener noreferrer" className="block text-[0.8125rem] mt-1 font-semibold underline underline-offset-2 text-white">
              24/7 Philippine Mental Health Hotline
            </a>
          </div>

          <p className="text-[0.6875rem] text-white/40">© {new Date().getFullYear()} De La Salle University Manila</p>
        </div>
      </aside>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="w-8 h-8 rounded-full animate-spin"
          style={{ border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)' }} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
