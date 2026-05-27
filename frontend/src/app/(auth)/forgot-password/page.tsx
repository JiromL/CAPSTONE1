'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const r = await fetch(api('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Always show success to avoid user enumeration
      setSubmitted(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-green-600 flex-col justify-between p-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="text-white text-sm font-bold">CPS</span>
          </div>
          <span className="text-white font-semibold text-lg">CPS System</span>
        </div>
        <div>
          <h2 className="text-white text-3xl font-bold leading-snug mb-4">
            Reset your password
          </h2>
          <p className="text-green-200 text-sm leading-relaxed">
            Enter your DLSU email and we'll send you a link to reset your password.
          </p>
        </div>
        <p className="text-green-300 text-xs">© {new Date().getFullYear()} DLSU Counseling & Psychological Services</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">CPS</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">CPS System</span>
          </div>

          {submitted ? (
            <div>
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Check your email</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                If <strong>{email}</strong> is registered, you'll receive a password reset link shortly.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
                Didn't get it? Check your spam folder or{' '}
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-green-600 dark:text-green-400 hover:underline"
                >
                  try again
                </button>.
              </p>
              <Link
                href="/login"
                className="block w-full text-center py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Forgot password?</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Enter your DLSU email and we'll send a reset link.
              </p>

              {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@dlsu.edu.ph"
                    required
                    autoComplete="email"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login" className="text-sm text-green-600 dark:text-green-400 hover:underline">
                  Back to login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
