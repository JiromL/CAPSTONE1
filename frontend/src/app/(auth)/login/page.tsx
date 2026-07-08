'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/utils/api';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get('expired') === 'true';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState('');

  useEffect(() => {
    const loadGoogleScript = async () => {
      try {
        if ((window as any).google?.accounts?.id) {
          const clientIdResponse = await fetch(api('/api/auth/oauth/google/client-id'));
          if (!clientIdResponse.ok) throw new Error('Failed to fetch Client ID');
          const { client_id } = await clientIdResponse.json();
          (window as any).google.accounts.id.initialize({ client_id, callback: handleGoogleSignIn });
          const container = document.getElementById('google-signin-button');
          if (container && container.children.length === 0) {
            (window as any).google.accounts.id.renderButton(container, { theme: 'outline', size: 'large', width: '100%' });
            setGoogleReady(true);
          }
          return;
        }
        const clientIdResponse = await fetch(api('/api/auth/oauth/google/client-id'));
        if (!clientIdResponse.ok) throw new Error(`Failed to fetch Client ID: ${clientIdResponse.status}`);
        const { client_id } = await clientIdResponse.json();
        if (!client_id) throw new Error('No Client ID in response');
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (!(window as any).google?.accounts?.id) return;
          (window as any).google.accounts.id.initialize({ client_id, callback: handleGoogleSignIn });
          const container = document.getElementById('google-signin-button');
          if (container && container.children.length === 0) {
            (window as any).google.accounts.id.renderButton(container, { theme: 'outline', size: 'large', width: '100%' });
            setGoogleReady(true);
          }
        };
        script.onerror = () => setGoogleError('Failed to load Google Sign-In');
        document.head.appendChild(script);
      } catch (err) {
        setGoogleError(err instanceof Error ? err.message : String(err));
      }
    };
    loadGoogleScript();
  }, []);

  const handleGoogleSignIn = async (response: any) => {
    if (!response.credential) { setError('Google sign-in failed'); return; }
    setLoading(true);
    setError('');
    try {
      const r = await fetch(api('/api/auth/oauth/google/callback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setError(r.status === 403 ? `${data.error || 'Access denied'} ${data.email ? `(${data.email})` : ''}` : data.error || 'Sign-in failed');
        return;
      }
      const data = await r.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data));
      router.replace('/dashboard');
    } catch {
      setError('Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const r = await fetch(api('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setError(data.error || 'Login failed');
        return;
      }
      const data = await r.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data));
      router.replace('/dashboard');
    } catch {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f0f6ff] dark:bg-gray-950">

      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-12 overflow-hidden bg-[#eef4ff] dark:bg-[#0d1525]">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#2563eb]/10 dark:bg-[#2563eb]/8 blur-sm" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 rounded-full bg-[#2563eb]/8 dark:bg-[#2563eb]/6" />
        <div className="absolute -bottom-20 left-24 w-72 h-72 rounded-full bg-[#2563eb]/12 dark:bg-[#2563eb]/8 blur-sm" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#2563eb] flex items-center justify-center shadow-md">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <span className="text-[#1e3a6e] dark:text-blue-200 font-semibold text-base tracking-wide uppercase text-xs">DLSU CPS</span>
        </div>

        {/* Main copy */}
        <div className="relative max-w-md">
          <h1 className="text-[#0f2952] dark:text-white font-serif text-4xl font-bold leading-tight mb-5">
            Counseling &<br />Psychological<br />Services
          </h1>
          <p className="text-[#3d5a8a] dark:text-blue-200/80 text-base leading-relaxed mb-8">
            A confidential space to connect with someone who cares. Our licensed counselors and psychologists are here to support you — at your pace.
          </p>

          {/* Confidentiality card */}
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-sm border border-[#2563eb]/15 dark:border-blue-400/10 rounded-2xl px-5 py-4 flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-[#2563eb] dark:text-blue-400" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="text-sm text-[#3d5a8a] dark:text-blue-200/70 leading-relaxed">
              Everything you share is <strong className="text-[#0f2952] dark:text-white font-semibold">strictly confidential</strong> and protected under university privacy policy. Your well-being always comes first.
            </p>
          </div>
        </div>

        {/* Bottom */}
        <div className="relative space-y-3">
          <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-sm text-[#3d5a8a] dark:text-blue-200/60">
              In crisis right now?{' '}
              <span className="text-[#2563eb] dark:text-blue-400 font-medium underline underline-offset-2 cursor-pointer">
                Call the 24/7 Support Line
              </span>
            </span>
          </div>
          <p className="text-xs text-[#7a9bc4] dark:text-blue-400/40">
            © {new Date().getFullYear()} De La Salle University · Counseling & Psychological Services
          </p>
        </div>
      </div>

      {/* ── Right login panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        {/* Mobile logo */}
        <div className="absolute top-5 left-5 flex items-center gap-2 lg:hidden">
          <div className="w-7 h-7 rounded-lg bg-[#2563eb] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-white" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <span className="font-semibold text-sm text-gray-800 dark:text-white">DLSU CPS</span>
        </div>

        {/* Login card */}
        <div className="w-full max-w-[460px] bg-white dark:bg-gray-900 rounded-2xl shadow-xl dark:shadow-none dark:border dark:border-gray-800 px-10 py-12">

          {/* Card icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-[#2563eb] dark:text-blue-400" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-1.5">Welcome Back</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-7">
            Sign in to your confidential CPS account to continue.
          </p>

          {sessionExpired && (
            <div className="mb-4 px-4 py-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-400">
              Your session has expired. Please sign in again.
            </div>
          )}

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                University Email
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
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
                  className="w-full pl-10 pr-3.5 py-3.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 focus:border-[#2563eb] dark:focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Password</label>
                <Link href="/forgot-password" className="text-xs text-[#2563eb] dark:text-blue-400 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-3.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 focus:border-[#2563eb] dark:focus:border-blue-500 transition"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2563eb] hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl text-base transition-colors shadow-sm shadow-blue-200 dark:shadow-none"
            >
              {loading ? 'Signing in…' : 'Log In'}
            </button>
          </form>

          {/* Secure note */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <svg className="w-3.5 h-3.5 text-[#2563eb] dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-xs text-[#2563eb] dark:text-blue-400 font-medium">Secure, encrypted connection</span>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
            <span className="text-xs text-gray-400 dark:text-gray-500">or continue with</span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
          </div>

          {/* Google Sign-In */}
          {googleError ? (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-center">
              <p className="text-xs text-red-600 dark:text-red-400">Google Sign-In unavailable: {googleError}</p>
            </div>
          ) : (
            <div>
              {!googleReady && (
                <div className="flex items-center justify-center gap-2 py-2.5 text-xs text-gray-400 dark:text-gray-500">
                  <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                  Loading Google Sign-In…
                </div>
              )}
              <div id="google-signin-button" className="w-full flex justify-center min-h-[44px]" />
              {googleReady && (
                <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-2">
                  Use your @dlsu.edu.ph Google account
                </p>
              )}
            </div>
          )}

          {/* Footer links */}
          <div className="mt-6 flex items-center justify-between text-xs">
            <p className="text-gray-500 dark:text-gray-400">
              New student?{' '}
              <Link href="/register" className="text-[#2563eb] dark:text-blue-400 font-semibold hover:underline">
                Create an account
              </Link>
            </p>
            <Link href="/forgot-password" className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Need help?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
