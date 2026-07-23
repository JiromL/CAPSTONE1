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
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between overflow-hidden" style={{ background: 'var(--color-sidebar)' }}>
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
              <pattern id="dots-fp" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots-fp)" />
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
              <span className="text-xs font-extrabold text-white tracking-tighter select-none">CPS</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.85)' }}>
              DLSU CPS
            </span>
          </div>

          {/* Main copy */}
          <div>
            <h2 className="text-3xl font-extrabold leading-snug mb-4" style={{ color: 'white' }}>Reset your<br />password</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
              Enter your DLSU email and we'll send you a link to reset your password.
            </p>
          </div>

          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            © {new Date().getFullYear()} De La Salle University Manila
          </p>
        </div>
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
