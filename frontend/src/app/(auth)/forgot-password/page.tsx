'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { AuthFrame } from '@/components/AuthFrame';

const IC = 'input !py-3 !text-[0.9375rem]';
const ICS: React.CSSProperties = {};

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
    <AuthFrame headline={<>Locked out? <span style={{ color: '#7BAAF7' }}>We’ll get you back in.</span></>}>
          {submitted ? (
            <div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--color-success-surface)' }}>
                <svg className="w-6 h-6" style={{ color: 'var(--color-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="font-display text-3xl mb-3" style={{ color: 'var(--color-text-primary)' }}>Check your email</h1>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                If <strong>{email}</strong> is registered, you'll receive a password reset link shortly.
              </p>
              <p className="text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
                Didn't get it? Check your spam folder or{' '}
                <button onClick={() => setSubmitted(false)} className="hover:underline" style={{ color: 'var(--color-primary)' }}>
                  try again
                </button>.
              </p>
              <Link href="/login" className="btn-primary w-full !min-h-12 !text-[0.9375rem]">
                Back to login
              </Link>
            </div>
          ) : (
            <div>
              <h1 className="font-display text-3xl mb-2" style={{ color: 'var(--color-text-primary)' }}>Forgot password?</h1>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                Enter your DLSU email and we'll send a reset link.
              </p>

              {error && (
                <div role="alert" className="mb-5 px-4 py-3 rounded-xl text-sm"
                  style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="field-label">
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
                  className="btn-primary w-full !min-h-12 !text-[0.9375rem]">
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
    </AuthFrame>
  );
}
