'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/utils/api';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Phone, ShieldCheck, Sun, Moon, Loader2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

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

export default function LoginPage() {
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
      <style>{`
        .login-field { background: var(--color-bg); border: 1px solid var(--color-border); transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease; }
        .login-field:focus-within { background: var(--color-surface); border-color: var(--color-primary); box-shadow: var(--shadow-primary); }
        .login-field input { width: 100%; background: transparent; outline: none; padding: 0.875rem 1rem 0.875rem 2.75rem; font-size: 0.9375rem; color: var(--color-text-primary); }
        .login-field input::placeholder { color: var(--color-text-muted); }
        .login-submit .arrow { transition: transform 180ms ease; }
        .login-submit:hover .arrow { transform: translateX(3px); }
        @keyframes login-slip-in { from { opacity: 0; transform: translateY(28px) rotate(-5deg); } to { opacity: 1; transform: translateY(0) rotate(-2.5deg); } }
        .login-slip  { transform: rotate(-2.5deg); animation: login-slip-in 700ms cubic-bezier(0.22, 1, 0.36, 1) 150ms both; }
        @media (prefers-reduced-motion: reduce) { .login-slip { animation: none; } }
      `}</style>

      {/* ── Form side ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col px-6 sm:px-12 py-8" style={{ background: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
              <span className="text-[0.625rem] font-extrabold text-white tracking-tighter select-none">CPS</span>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>DLSU CPS</p>
              <p className="text-[0.6875rem]" style={{ color: 'var(--color-text-muted)' }}>Counseling &amp; Psychological Services</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="btn-ghost !w-10 !h-10 !min-h-0 !p-0"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full max-w-[25rem] mx-auto py-12 animate-fade-up">
            <h1 className="font-display" style={{ fontSize: 'clamp(1.875rem, 3vw, 2.25rem)', lineHeight: 1.15, color: 'var(--color-text-primary)' }}>
              Welcome back.
            </h1>
            <p className="type-body mt-3" style={{ color: 'var(--color-text-secondary)' }}>
              Sign in with your DLSU account to see your sessions, journal, and resources.
            </p>

            {/* Alerts */}
            {sessionExpired && (
              <div role="status" className="mt-6 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in"
                style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning-text)', border: '1px solid rgba(217,119,6,0.2)' }}>
                Your session expired. Please sign in again.
              </div>
            )}
            {error && (
              <div role="alert" className="mt-6 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in"
                style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger-text)', border: '1px solid rgba(220,38,38,0.2)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="field-label">University email</label>
                <div className="login-field relative flex items-center rounded-xl">
                  <Mail size={16} className="absolute left-4 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} aria-hidden="true" />
                  <input
                    id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@dlsu.edu.ph" required autoComplete="email"
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
                <div className="login-field relative flex items-center rounded-xl">
                  <Lock size={16} className="absolute left-4 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} aria-hidden="true" />
                  <input
                    id="password" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password" required autoComplete="current-password" style={{ paddingRight: '3rem' }}
                  />
                  <button
                    type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-1.5 w-10 h-10 rounded-lg flex items-center justify-center transition-colors hover:text-[var(--color-text-secondary)]"
                    style={{ color: 'var(--color-text-muted)' }}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="login-submit btn-primary w-full !min-h-12 !text-[0.9375rem]">
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                  : <>Sign in <ArrowRight size={16} className="arrow" /></>}
              </button>
            </form>

            <div className="flex items-center gap-3 my-6">
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
                    <p className="type-caption text-center mt-2.5" style={{ color: 'var(--color-text-muted)' }}>Use your @dlsu.edu.ph Google account</p>
                  )}
                </div>
            }

            <p className="type-body-sm mt-10" style={{ color: 'var(--color-text-secondary)' }}>
              First time here?{' '}
              <Link href="/register" className="font-semibold hover:underline underline-offset-2" style={{ color: 'var(--color-primary-text)' }}>Create a student account</Link>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 type-caption" style={{ color: 'var(--color-text-muted)' }}>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={13} style={{ color: 'var(--color-success)' }} aria-hidden="true" />
            Protected under RA 10173 (Data Privacy Act)
          </span>
          <a href="mailto:cps@dlsu.edu.ph" className="hover:underline underline-offset-2">Trouble signing in? cps@dlsu.edu.ph</a>
        </div>
      </main>

      {/* ── Navy panel with the slip ──────────────────────────── */}
      <aside className="relative lg:w-[48%] flex flex-col justify-between overflow-hidden px-6 sm:px-12 py-10 lg:py-12" style={{ background: 'var(--color-sidebar)' }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0 39px, #fff 39px 40px)' }} aria-hidden="true" />
        <div className="absolute -right-40 -top-40 w-[520px] h-[520px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(35,82,204,0.35) 0%, transparent 65%)' }} aria-hidden="true" />

        <div className="relative">
          {office && (
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="relative flex w-2 h-2">
                {office.open && <span className="absolute inset-0 rounded-full animate-ping-dot" style={{ background: 'var(--color-success)' }} />}
                <span className="relative w-2 h-2 rounded-full" style={{ background: office.open ? 'var(--color-success)' : 'rgba(255,255,255,0.4)' }} />
              </span>
              {office.text}
            </span>
          )}
        </div>

        <div className="relative py-12 lg:py-0">
          <h2 className="font-display max-w-md" style={{ fontSize: 'clamp(1.75rem, 2.8vw, 2.5rem)', lineHeight: 1.2, color: 'white' }}>
            Reaching out is <span style={{ color: '#7BAAF7' }}>the first step.</span> We&apos;ll take the next one with you.
          </h2>

          <div className="login-slip relative mt-12 max-w-[26rem] rounded-2xl flex" style={{ background: 'var(--color-surface)', boxShadow: '0 30px 60px -20px rgba(0,0,0,0.55)' }}>
            <div className="w-[104px] flex-shrink-0 rounded-l-2xl flex flex-col items-center justify-center py-5 text-white" style={{ background: 'var(--color-primary)' }}>
              <span className="text-[0.625rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>Step</span>
              <span className="font-display text-4xl leading-none mt-1" style={{ color: 'white' }}>1</span>
            </div>
            <div className="relative w-0 border-l-2 border-dashed" style={{ borderColor: 'var(--color-border-strong)' }} aria-hidden="true">
              <span className="absolute -top-2.5 -left-[11px] w-5 h-5 rounded-full" style={{ background: 'var(--color-sidebar)' }} />
              <span className="absolute -bottom-2.5 -left-[11px] w-5 h-5 rounded-full" style={{ background: 'var(--color-sidebar)' }} />
            </div>
            <div className="flex-1 p-5 min-w-0">
              <p className="type-overline" style={{ color: 'var(--color-text-muted)' }}>Counseling request</p>
              <p className="text-lg font-bold mt-1 leading-snug" style={{ color: 'var(--color-text-primary)' }}>Talk to someone</p>
              <dl className="mt-3 grid grid-cols-1 gap-y-2 text-xs">
                <div><dt style={{ color: 'var(--color-text-muted)' }}>Mode</dt><dd className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>In-person or online</dd></div>
                <div><dt style={{ color: 'var(--color-text-muted)' }}>Who sees it</dt><dd className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Only you and your CPS counselor</dd></div>
              </dl>
            </div>
          </div>
        </div>

        <div className="relative space-y-2">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
            <Phone size={14} style={{ color: '#F87171' }} aria-hidden="true" />
            In crisis right now?
            <a href="https://ncmh.gov.ph" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2" style={{ color: '#FCA5A5' }}>
              24/7 Philippine Mental Health Hotline
            </a>
          </p>
          <p className="text-[0.6875rem]" style={{ color: 'rgba(255,255,255,0.45)' }}>© {new Date().getFullYear()} De La Salle University Manila</p>
        </div>
      </aside>
    </div>
  );
}
