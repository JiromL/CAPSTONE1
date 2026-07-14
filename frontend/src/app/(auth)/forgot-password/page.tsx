'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';

const IC = 'w-full px-3.5 py-2.5 text-sm rounded-lg outline-none transition disabled:opacity-50';
const ICS: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

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
      await fetch(api('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10" style={{ background: 'var(--color-primary)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <span className="text-white text-sm font-bold">CPS</span>
          </div>
          <span className="text-white font-semibold text-lg">CPS System</span>
        </div>
        <div>
          <h2 className="text-white text-3xl font-bold leading-snug mb-4">Reset your password</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Enter your DLSU email and we'll send you a link to reset your password.
          </p>
        </div>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
          © {new Date().getFullYear()} DLSU Counseling & Psychological Services
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
              <span className="text-white text-xs font-bold">CPS</span>
            </div>
            <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>CPS System</span>
          </div>

          {submitted ? (
            <div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--color-success-surface)' }}>
                <svg className="w-6 h-6" style={{ color: 'var(--color-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Check your email</h1>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                If <strong>{email}</strong> is registered, you'll receive a password reset link shortly.
              </p>
              <p className="text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
                Didn't get it? Check your spam folder or{' '}
                <button onClick={() => setSubmitted(false)} className="hover:underline" style={{ color: 'var(--color-primary)' }}>
                  try again
                </button>.
              </p>
              <Link href="/login"
                className="block w-full text-center py-2.5 text-white text-sm font-medium rounded-lg transition-colors"
                style={{ background: 'var(--color-primary)' }}>
                Back to login
              </Link>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Forgot password?</h1>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                Enter your DLSU email and we'll send a reset link.
              </p>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-lg text-sm"
                  style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@dlsu.edu.ph"
                    required
                    autoComplete="email"
                    className={IC}
                    style={ICS}
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                  style={{ background: 'var(--color-primary)' }}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login" className="text-sm hover:underline" style={{ color: 'var(--color-primary)' }}>
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
