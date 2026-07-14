"use client"

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PageShell from '@/components/PageShell'
import { api } from '@/utils/api';

const IC = 'w-full p-3 rounded outline-none text-center text-2xl tracking-widest';
const ICS: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [autoVerifying, setAutoVerifying] = useState(false)

  useEffect(() => {
    const emailParam = searchParams.get('email')
    const tokenParam = searchParams.get('token')
    if (emailParam) setEmail(emailParam)
    if (tokenParam) {
      setAutoVerifying(true)
      fetch(api(`/api/auth/verify-email-link?token=${tokenParam}`))
        .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
        .then(({ ok, data }) => {
          if (ok) { setMsg('Email verified! Redirecting to login…'); setTimeout(() => router.push('/login'), 2000); }
          else { setError(data.error || 'Verification failed'); }
        })
        .catch(() => setError('Network error'))
        .finally(() => setAutoVerifying(false))
    }
  }, [searchParams])

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault(); setError(''); setMsg(''); setLoading(true)
    try {
      const res = await fetch(api('/api/auth/verify-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Verification failed'); setLoading(false); return; }
      setMsg('Email verified successfully! Redirecting to login...')
      setTimeout(() => { router.push('/login') }, 2000)
    } catch { setError('Network error'); setLoading(false); }
  }

  async function handleResend() {
    setError(''); setMsg(''); setResending(true)
    try {
      const res = await fetch(api('/api/auth/resend-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to resend code'); setResending(false); return; }
      setMsg('Verification code sent to your email!')
      setCode(''); setResendCooldown(60); setResending(false)
    } catch { setError('Network error'); setResending(false); }
  }

  if (autoVerifying) {
    return (
      <PageShell title="Verify Email" subtitle="Confirm your DLSU email address" hideNav>
        <div className="max-w-md mx-auto rounded-lg p-10 text-center" style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div className="w-12 h-12 rounded-full animate-spin mx-auto mb-4"
            style={{ border: '4px solid var(--color-success-surface)', borderTopColor: 'var(--color-success)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Verifying your email…</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Verify Email" subtitle="Confirm your DLSU email address" hideNav>
      <div className="max-w-md mx-auto rounded-lg p-6" style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
        <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Verify Your Email</h1>

        <div className="mb-4 p-3 rounded" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary-muted)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            We sent a verification code to <strong>{email || 'your email'}</strong>. Click the button in the email or enter the code below.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Enter Verification Code
            </label>
            <input className={IC} style={ICS}
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6} required disabled={loading} />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>6-digit code</p>
          </div>

          <button className="w-full px-4 py-2 text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-primary)' }}
            type="submit" disabled={loading || code.length !== 6}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}>
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>Didn't receive the code?</p>
          <button className="text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ color: 'var(--color-primary)' }}
            onClick={handleResend} disabled={resending || resendCooldown > 0}>
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : resending ? 'Sending...' : 'Resend Code'}
          </button>
        </div>

        {msg && (
          <p className="mt-4 text-sm p-3 rounded" style={{ color: 'var(--color-success-text)', background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>{msg}</p>
        )}
        {error && (
          <p className="mt-4 text-sm p-3 rounded" style={{ color: 'var(--color-danger-text)', background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>{error}</p>
        )}

        <hr className="my-6" style={{ borderColor: 'var(--color-border)' }} />

        <p className="text-center text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Already verified?{' '}
          <a href="/login" className="hover:underline" style={{ color: 'var(--color-primary)' }}>Go to login</a>
        </p>
      </div>
    </PageShell>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
