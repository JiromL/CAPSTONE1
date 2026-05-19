'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/utils/api';

export default function LoginPage() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<'email' | 'oauth'>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState('');

  // Initialize Google Sign-In
  useEffect(() => {
    // Only run when OAuth tab is selected
    if (loginMethod !== 'oauth') return;

    const loadGoogleScript = async () => {
      try {
        console.log('[Google OAuth] Starting initialization...');
        
        // If script already loaded, just reinitialize
        if ((window as any).google?.accounts?.id) {
          console.log('[Google OAuth] Google already loaded, reinitializing...');
          
          // Fetch fresh Client ID
          const clientIdResponse = await fetch(api('/api/auth/oauth/google/client-id'));
          if (!clientIdResponse.ok) throw new Error('Failed to fetch Client ID');
          
          const { client_id } = await clientIdResponse.json();
          
          (window as any).google.accounts.id.initialize({
            client_id,
            callback: handleGoogleSignIn,
          });
          
          // Render button to container
          const container = document.getElementById('google-signin-button');
          if (container && container.children.length === 0) {
            (window as any).google.accounts.id.renderButton(container, {
              theme: 'outline',
              size: 'large',
              width: '100%',
            });
            setGoogleReady(true);
            console.log('[Google OAuth] ✅ Button rendered');
          }
          return;
        }

        // Fetch Client ID from backend
        console.log('[Google OAuth] Fetching Client ID from:', api('/api/auth/oauth/google/client-id'));
        const clientIdResponse = await fetch(api('/api/auth/oauth/google/client-id'));
        
        if (!clientIdResponse.ok) {
          throw new Error(`Failed to fetch Client ID: ${clientIdResponse.status}`);
        }

        const { client_id } = await clientIdResponse.json();
        console.log('[Google OAuth] Got Client ID:', client_id?.substring(0, 20) + '...');

        if (!client_id) {
          throw new Error('No Client ID in response');
        }

        // Load Google Sign-In script
        console.log('[Google OAuth] Loading Google script...');
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;

        script.onload = () => {
          console.log('[Google OAuth] Script loaded, initializing...');
          if (!(window as any).google?.accounts?.id) {
            throw new Error('google.accounts.id not available after script load');
          }

          (window as any).google.accounts.id.initialize({
            client_id,
            callback: handleGoogleSignIn,
          });

          console.log('[Google OAuth] Looking for container...');
          const container = document.getElementById('google-signin-button');
          
          if (!container) {
            console.error('[Google OAuth] Container #google-signin-button not found in DOM');
            setGoogleError('Container initialization failed');
            return;
          }

          console.log('[Google OAuth] Container found, rendering button...');
          if (container.children.length === 0) {
            try {
              (window as any).google.accounts.id.renderButton(container, {
                theme: 'outline',
                size: 'large',
                width: '100%',
              });
              setGoogleReady(true);
              console.log('[Google OAuth] ✅ Button rendered successfully');
            } catch (renderErr) {
              console.error('[Google OAuth] Render error:', renderErr);
              setGoogleError('Failed to render button');
            }
          } else {
            setGoogleReady(true);
            console.log('[Google OAuth] Container already has children');
          }
        };

        script.onerror = (err) => {
          console.error('[Google OAuth] Script load error:', err);
          setGoogleError('Failed to load Google script');
        };

        document.head.appendChild(script);
        console.log('[Google OAuth] Script appended to head');

      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[Google OAuth] Fatal error:', message);
        setGoogleError(message);
      }
    };

    // Load when OAuth is selected and not already ready
    if (!googleReady && !googleError) {
      loadGoogleScript();
    }

  }, [loginMethod]);

  const handleGoogleSignIn = async (response: any) => {
    if (!response.credential) {
      setError('Google sign-in failed');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = api('/api/auth/oauth/google/callback');
      const backendResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential }),
      });

      if (!backendResponse.ok) {
        const data = await backendResponse.json().catch(() => ({}));
        const errorMsg = data.error || 'Sign-in failed';
        
        if (backendResponse.status === 403) {
          setError(`${errorMsg} ${data.email ? `(${data.email})` : ''}`);
        } else {
          setError(errorMsg);
        }
        return;
      }

      const data = await backendResponse.json();
      
      // Store data immediately
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data));
      
      // Use replace to avoid back button issues
      router.replace('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = api('/api/auth/login');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errorMsg = data.error || 'Login failed';
        
        if (response.status === 403) {
          setError(`${errorMsg}`);
        } else {
          setError(errorMsg);
        }
        return;
      }

      const data = await response.json();
      
      // Store data immediately
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data));
      
      // Use replace to avoid back button issues
      router.replace('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-indigo-600 flex-col justify-between p-10">
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
          <p className="text-indigo-200 text-sm leading-relaxed">
            De La Salle University's integrated counseling and psychological services platform — connecting students with care.
          </p>
        </div>
        <p className="text-indigo-300 text-xs">© {new Date().getFullYear()} DLSU Counseling & Psychological Services</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">CPS</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">CPS System</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Welcome back</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Sign in to your DLSU CPS account</p>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-5 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {(['email', 'oauth'] as const).map((method) => (
              <button
                key={method}
                onClick={() => setLoginMethod(method)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                  loginMethod === method
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {method === 'email' ? 'Email / ID' : 'Google'}
              </button>
            ))}
          </div>

          {/* Email form */}
          {loginMethod === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email or Student ID</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@dlsu.edu.ph or 8-digit ID"
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
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
                <Link href="/forgot-password" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Forgot password?</Link>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}

          {/* Google OAuth */}
          {loginMethod === 'oauth' && (
            <div>
              {googleError ? (
                <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-center">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Google Sign-In Unavailable</p>
                  <p className="text-xs text-red-500 dark:text-red-500">{googleError}</p>
                </div>
              ) : (
                <div>
                  {!googleReady && (
                    <div className="flex flex-col items-center gap-3 py-8">
                      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">Loading Google Sign-In…</p>
                    </div>
                  )}
                  <div id="google-signin-button" className="w-full flex justify-center min-h-[44px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" />
                  {googleReady && (
                    <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-3">Use your @dlsu.edu.ph Google account</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No account?{' '}
              <Link href="/register" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Create one</Link>
            </p>
          </div>

          <p className="mt-8 text-xs text-center text-gray-400 dark:text-gray-600">
            Only @dlsu.edu.ph accounts are permitted
          </p>
        </div>
      </div>
    </div>
  );
}
