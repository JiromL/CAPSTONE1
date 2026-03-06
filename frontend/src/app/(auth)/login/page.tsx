'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageShell from '@/components/PageShell';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:5001';
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Invalid credentials');
      }

      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data));
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="Login" subtitle="Sign in to your CPS account">
      <div className="min-h-[80vh] flex flex-col lg:flex-row">
        {/* left carousel area for large screens */}
        <div className="hidden lg:block lg:w-1/2 relative">
          <div className="h-full w-full overflow-hidden bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
            {/* placeholder for carousel image */}
            <span className="text-gray-500 dark:text-gray-400">Image area</span>
          </div>
        </div>

        {/* right login area */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
          <div className="w-full max-w-md border border-gray-200 dark:border-gray-700 rounded p-6 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-center mb-4">
              {/* logo placeholder */}
              <div className="h-10 w-10 bg-gray-300 dark:bg-gray-700 rounded" />
            </div>
            <h1 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-1 text-center">
              Sign In
            </h1>
            <p className="text-center text-gray-600 dark:text-gray-400 text-xs mb-4">Campus Counseling Services</p>

            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-gray-800 text-black dark:text-white text-sm"
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
                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-gray-800 text-black dark:text-white text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-400 dark:bg-gray-600 hover:bg-gray-500 dark:hover:bg-gray-700 text-white font-medium py-1.5 px-4 rounded disabled:opacity-50 transition text-sm"
              >
                {loading ? 'Logging in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-3 text-center">
              <Link
                href="/forgot-password"
                className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Forgot password?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
