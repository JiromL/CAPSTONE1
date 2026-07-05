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
    <div className="min-h-screen flex bg-white dark:bg-gray-950">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#2563eb] flex-col justify-between p-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="text-white text-sm font-bold">CPS</span>
          </div>
          <span className="text-white font-semibold text-lg">CPS System</span>
        </div>
        <div>
          <h2 className="text-white text-3xl font-bold leading-snug mb-4">
            Supporting student wellness, one session at a time.
          </h2>
          <p className="text-green-200 text-sm leading-relaxed">
            De La Salle University's integrated counseling and psychological services platform — connecting students with care.
          </p>
        </div>
        <p className="text-green-300 text-xs">© {new Date().getFullYear()} DLSU Counseling & Psychological Services</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-[#2563eb] flex items-center justify-center">
              <span className="text-white text-xs font-bold">CPS</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">CPS System</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Welcome back</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Sign in to your DLSU CPS account</p>

          {sessionExpired && (
            <div className="mb-4 px-4 py-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
              Your session has expired. Please sign in again to continue.
            </div>
          )}

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Email / Password form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@dlsu.edu.ph"
                required
                autoComplete="email"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-[#2563eb] hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400 dark:text-gray-500">or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Google Sign-In */}
          {googleError ? (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-center">
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
              <div
                id="google-signin-button"
                className="w-full flex justify-center min-h-[44px]"
              />
              {googleReady && (
                <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-2">
                  Use your @dlsu.edu.ph Google account
                </p>
              )}
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No account?{' '}
              <Link href="/register" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                Register your account
              </Link>
            </p>
          </div>

          <p className="mt-6 text-xs text-center text-gray-400 dark:text-gray-600">
            Only @dlsu.edu.ph accounts are permitted
          </p>
        </div>
      </div>
    </div>
  );
}
