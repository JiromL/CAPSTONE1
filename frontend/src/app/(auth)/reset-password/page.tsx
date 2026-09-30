'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/utils/api';
import { AuthFrame } from '@/components/AuthFrame';

const IC = 'input !py-3 !text-[0.9375rem]';
const ICS: React.CSSProperties = {};

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const token = searchParams.get('token') || '';

  useEffect(() => {
    if (!token) setError('Invalid or missing reset link. Please request a new one.');
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    setError('');
    try {
      const r = await fetch(api('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Reset failed'); return; }
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame headline={<>Choose a new password <span style={{ color: '#7BAAF7' }}>and you’re all set.</span></>}>
          {success ? (
            <div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--color-success-surface)' }}>
                <svg className="w-6 h-6" style={{ color: 'var(--color-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="font-display text-3xl mb-3" style={{ color: 'var(--color-text-primary)' }}>Password reset!</h1>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>Redirecting you to login…</p>
              <Link href="/login" className="text-sm hover:underline" style={{ color: 'var(--color-success)' }}>
                Go to login now
              </Link>
            </div>
          ) : (
            <div>
              <h1 className="font-display text-3xl mb-2" style={{ color: 'var(--color-text-primary)' }}>Set new password</h1>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>Must be at least 8 characters.</p>

              {error && (
                <div role="alert" className="mb-5 px-4 py-3 rounded-xl text-sm"
                  style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
                  {error}
                  {!token && (
                    <div className="mt-2">
                      <Link href="/forgot-password" className="font-medium hover:underline" style={{ color: 'var(--color-danger-text)' }}>
                        Request a new reset link
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="field-label">
                    New password
                  </label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    required minLength={8} disabled={!token} className={IC} style={ICS} />
                </div>
                <div>
                  <label className="field-label">
                    Confirm password
                  </label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                    required disabled={!token} className={IC} style={ICS} />
                </div>
                <button type="submit" disabled={loading || !token}
                  className="btn-primary w-full !min-h-12 !text-[0.9375rem]">
                  {loading ? 'Resetting…' : 'Reset password'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="w-8 h-8 rounded-full animate-spin"
          style={{ border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)' }} />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
