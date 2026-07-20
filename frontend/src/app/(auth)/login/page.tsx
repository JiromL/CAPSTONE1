'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/utils/api';
import { useTheme } from '@/context/ThemeContext';

export default function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get('expired') === 'true';
  const { theme, toggleTheme } = useTheme();

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
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>

      {/* ── Left panel — deep navy brand canvas ─────────────── */}
      <div
        className="hidden lg:flex lg:w-[46%] relative flex-col justify-between overflow-hidden"
        style={{ background: 'var(--color-sidebar)' }}
      >
        {/* Background geometry */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Large circle — top right */}
          <div
            className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full"
            style={{ background: 'rgba(35,82,204,0.08)', border: '1px solid rgba(35,82,204,0.12)' }}
          />
          {/* Medium circle — bottom left */}
          <div
            className="absolute -bottom-24 -left-24 w-[360px] h-[360px] rounded-full"
            style={{ background: 'rgba(35,82,204,0.06)' }}
          />
          {/* Dot grid */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
          {/* Diagonal accent line */}
          <div
            className="absolute top-0 right-0 w-px h-full opacity-10"
            style={{ background: 'linear-gradient(to bottom, transparent, white 30%, white 70%, transparent)' }}
          />
        </div>

        {/* Content */}
        <div className="relative flex flex-col justify-between h-full p-10">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'var(--color-primary)' }}
            >
              <span className="text-[10px] font-extrabold text-white tracking-tighter select-none">CPS</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.85)' }}>
              DLSU CPS
            </span>
          </div>

          {/* Main copy */}
          <div className="max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-4" style={{ color: 'rgba(69,117,240,0.8)' }}>
              Counseling &amp; Psychological Services
            </p>
            <h1 className="text-[2.6rem] font-extrabold leading-[1.1] tracking-tight mb-5" style={{ color: 'white' }}>
              Your well-being<br />comes first.
            </h1>
            <p className="text-[0.9375rem] leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
              A confidential space to connect with licensed counselors and psychologists — on your own terms, at your own pace.
            </p>

            {/* Confidentiality indicator */}
            <div
              className="mt-8 flex items-start gap-3 px-4 py-3.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 mt-0.5 flex-shrink-0" stroke="#7BAAF7" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.72)' }}>
                Everything you share is{' '}
                <span className="text-white font-semibold">strictly confidential</span>
                {' '}and protected under RA 10173.
              </p>
            </div>
          </div>

          {/* Bottom */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 flex-shrink-0" stroke="#F87171" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
                In crisis?{' '}
                <a
                  href="https://ncmh.gov.ph"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 font-medium transition-opacity hover:opacity-80"
                  style={{ color: '#F87171' }}
                >
                  24/7 Philippine Mental Health Hotline
                </a>
              </span>
            </div>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              © {new Date().getFullYear()} De La Salle University Manila
            </p>
          </div>
        </div>
      </div>

      {/* ── Right panel — login form ─────────────────────────── */}
      <div
        className="flex-1 flex items-center justify-center p-6 relative"
        style={{ background: 'var(--color-surface)' }}
      >
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="absolute top-5 right-5 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150"
          style={{
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark'
            ? <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            : <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          }
        </button>

        {/* Mobile logo */}
        <div className="absolute top-5 left-5 flex items-center gap-2 lg:hidden">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
            <span className="text-[8px] font-extrabold text-white tracking-tighter">CPS</span>
          </div>
          <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>DLSU CPS</span>
        </div>

        {/* Form card */}
        <div className="w-full max-w-[420px] animate-fade-up">

          {/* Heading */}
          <div className="mb-7">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-5 shadow-sm"
              style={{ background: 'var(--color-primary-surface)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="var(--color-primary)" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              Welcome back
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              Sign in to your CPS account to continue.
            </p>
          </div>

          {/* Alerts */}
          {sessionExpired && (
            <div
              className="mb-5 px-4 py-3 rounded-xl text-xs font-medium animate-fade-in"
              style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning-text)', border: '1px solid rgba(217,119,6,0.2)' }}
            >
              Your session expired. Please sign in again.
            </div>
          )}
          {error && (
            <div
              className="mb-5 px-4 py-3 rounded-xl text-xs font-medium animate-fade-in"
              style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger-text)', border: '1px solid rgba(220,38,38,0.2)' }}
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                University Email
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@dlsu.edu.ph"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl outline-none transition-all duration-150"
                  style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-primary)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-primary-text)' }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-3 text-sm rounded-xl outline-none transition-all duration-150"
                  style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-primary)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-150"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                >
                  {showPw
                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98] disabled:opacity-60 mt-1"
              style={{ background: 'var(--color-primary)' }}
              onMouseEnter={e => !loading && ((e.currentTarget as HTMLElement).style.background = 'var(--color-primary-hover)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--color-primary)')}
            >
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    Signing in…
                  </span>
                : 'Sign In'
              }
            </button>
          </form>

          {/* Secure note */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="var(--color-primary-text)" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-[11px] font-medium" style={{ color: 'var(--color-primary-text)' }}>
              Secure, encrypted connection
            </span>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>or continue with</span>
            <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
          </div>

          {/* Google */}
          {googleError
            ? <div
                className="p-3 rounded-xl text-center text-xs"
                style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger-text)' }}
              >
                Google Sign-In unavailable
              </div>
            : <div>
                {!googleReady && (
                  <div className="flex items-center justify-center gap-2 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Loading Google Sign-In…
                  </div>
                )}
                <div id="google-btn" className="w-full flex justify-center min-h-[44px]" />
                {googleReady && (
                  <p className="text-center text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
                    Use your @dlsu.edu.ph Google account
                  </p>
                )}
              </div>
          }

          {/* Footer */}
          <div className="mt-7 pt-5 flex items-center justify-between text-xs" style={{ borderTop: '1px solid var(--color-border)' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>
              New student?{' '}
              <Link href="/register" className="font-semibold transition-opacity hover:opacity-70" style={{ color: 'var(--color-primary-text)' }}>
                Create an account
              </Link>
            </p>
            <a
              href="mailto:cps@dlsu.edu.ph"
              className="flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Need help?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
