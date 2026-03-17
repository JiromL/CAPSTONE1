'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageShell from '@/components/PageShell';
import { api } from '@/utils/api';

export default function LoginPage() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<'email' | 'oauth'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data));
      
      router.push('/dashboard');
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
        body: JSON.stringify({ email, password }),
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
      
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data));
      
      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="Login" subtitle="Sign in to your CPS account">
      <div className="min-h-[80vh] flex flex-col lg:flex-row">
        {/* Left carousel area */}
        <div className="hidden lg:block lg:w-1/2 relative">
          <div className="h-full w-full overflow-hidden bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
            <span className="text-gray-500 dark:text-gray-400">Image area</span>
          </div>
        </div>

        {/* Right login area */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
          <div className="w-full max-w-md border border-gray-200 dark:border-gray-700 rounded p-6 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-center mb-4">
              <div className="h-10 w-10 bg-gray-300 dark:bg-gray-700 rounded" />
            </div>
            <h1 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-1 text-center">
              Sign In
            </h1>
            <p className="text-center text-gray-600 dark:text-gray-400 text-xs mb-6">Campus Counseling Services</p>

            {/* DLSU Domain Notice */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">DLSU Account Required</p>
              <p>Only @dlsu.edu.ph email addresses are allowed</p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded text-xs">
                {error}
              </div>
            )}

            {/* Login method tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setLoginMethod('email')}
                className={`flex-1 px-3 py-2 rounded text-xs font-medium transition ${
                  loginMethod === 'email'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Email
              </button>
              <button
                onClick={() => setLoginMethod('oauth')}
                className={`flex-1 px-3 py-2 rounded text-xs font-medium transition ${
                  loginMethod === 'oauth'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Google
              </button>
            </div>

            {/* Email/Password Login */}
            {loginMethod === 'email' && (
              <form onSubmit={handleEmailLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@dlsu.edu.ph"
                    className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 bg-white dark:bg-gray-800 text-black dark:text-white text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 bg-white dark:bg-gray-800 text-black dark:text-white text-sm"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 text-white font-medium py-1.5 px-4 rounded disabled:opacity-50 transition text-sm"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            )}

            {/* Google OAuth Login */}
            {loginMethod === 'oauth' && (
              <div className="space-y-3">
                {googleError ? (
                  <div className="text-center py-6 px-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-2">⚠️ Google Sign-In Unavailable</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mb-3">{googleError}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Try using email login instead</p>
                  </div>
                ) : (
                  <div>
                    {!googleReady && (
                      <div className="text-center py-8">
                        <div className="inline-block mb-3">
                          <div className="w-10 h-10 border-4 border-gray-300 dark:border-gray-600 border-t-blue-600 rounded-full animate-spin"></div>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Loading Google Sign-In...
                        </p>
                      </div>
                    )}
                    {googleReady && (
                      <div className="text-center text-xs text-gray-600 dark:text-gray-400 mb-3">
                        Sign in with your DLSU email
                      </div>
                    )}
                    <div
                      id="google-signin-button"
                      className="w-full flex justify-center min-h-[44px] bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600"
                    />
                    {googleReady && (
                      <div className="text-xs text-center text-gray-500 dark:text-gray-500 pt-3 border-t border-gray-200 dark:border-gray-700 mt-3">
                        Secure sign-in powered by Google
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 space-y-3">
              <div className="text-center">
                <Link
                  href="/forgot-password"
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Forgot password?
                </Link>
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  Don't have an account?
                </p>
                <Link
                  href="/register"
                  className="inline-block text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
