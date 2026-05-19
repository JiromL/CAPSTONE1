"use client"

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PageShell from '@/components/PageShell'
import { api } from '@/utils/api';

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [autoVerifying, setAutoVerifying] = useState(false)

  useEffect(() => {
    const emailParam = searchParams.get('email')
    const userIdParam = searchParams.get('user_id')
    const tokenParam = searchParams.get('token')

    if (emailParam) setEmail(emailParam)
    if (userIdParam) setUserId(userIdParam)

    // Auto-verify when arriving from the email button link
    if (tokenParam) {
      setAutoVerifying(true)
      fetch(api(`/api/auth/verify-email-link?token=${tokenParam}`))
        .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
        .then(({ ok, data }) => {
          if (ok) {
            setMsg('Email verified! Redirecting to login…')
            setTimeout(() => router.push('/login'), 2000)
          } else {
            setError(data.error || 'Verification failed')
          }
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
    e.preventDefault()
    setError('')
    setMsg('')
    setLoading(true)

    try {
      const res = await fetch(api('/api/auth/verify-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Verification failed')
        setLoading(false)
        return
      }

      setMsg('Email verified successfully! Redirecting to login...')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err) {
      setError('Network error')
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    setMsg('')
    setResending(true)

    try {
      const res = await fetch(api('/api/auth/resend-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to resend code')
        setResending(false)
        return
      }

      setMsg('Verification code sent to your email!')
      setCode('')
      setResendCooldown(60)
      setResending(false)
    } catch (err) {
      setError('Network error')
      setResending(false)
    }
  }

  if (autoVerifying) {
    return (
      <PageShell title="Verify Email" subtitle="Confirm your DLSU email address" hideNav>
        <div className="max-w-md mx-auto bg-white dark:bg-gray-900 rounded-lg shadow dark:shadow-gray-800 p-10 text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">Verifying your email…</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Verify Email" subtitle="Confirm your DLSU email address" hideNav>
      <div className="max-w-md mx-auto bg-white dark:bg-gray-900 rounded-lg shadow dark:shadow-gray-800 p-6">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-50">Verify Your Email</h1>

        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            We sent a verification code to <strong>{email || 'your email'}</strong>. Click the button in the email or enter the code below.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter Verification Code
            </label>
            <input
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400 text-center text-2xl tracking-widest"
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">6-digit code</p>
          </div>

          <button
            className="w-full px-4 py-2 bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-800 text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={loading || code.length !== 6}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Didn't receive the code?
          </p>
          <button
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
          >
            {resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : resending
              ? 'Sending...'
              : 'Resend Code'}
          </button>
        </div>

        {msg && (
          <p className="mt-4 text-sm text-green-700 dark:text-green-400 p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded">
            {msg}
          </p>
        )}
        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded">
            {error}
          </p>
        )}

        <hr className="my-6" />

        <p className="text-center text-xs text-gray-600 dark:text-gray-400">
          Already verified?{' '}
          <a href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
            Go to login
          </a>
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