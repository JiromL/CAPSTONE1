"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'
import { api } from '@/utils/api';

const INPUT_CLS = "w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: '', color: 'bg-gray-200' },
    { label: 'Weak', color: 'bg-red-400' },
    { label: 'Fair', color: 'bg-amber-400' },
    { label: 'Good', color: 'bg-yellow-400' },
    { label: 'Strong', color: 'bg-green-500' },
  ];
  return { score, ...levels[score] };
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '' })
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const pwStrength = passwordStrength(form.password)
  const pwMismatch = confirm.length > 0 && form.password !== confirm

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!form.email.endsWith('@dlsu.edu.ph')) { setError('Only @dlsu.edu.ph email addresses are allowed.'); return; }
    setError('')
    setMsg('')
    setLoading(true)

    try {
      const res = await fetch(api('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed')
        setLoading(false)
        return
      }

      setMsg('Account created! Check your email to verify your account.')
      router.push(`/verify-email?email=${encodeURIComponent(form.email)}&user_id=${data.user_id}`)

    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <PageShell title="Register" subtitle="Create a CPS account" hideNav>
      <div className="max-w-md mx-auto bg-white dark:bg-gray-900 rounded-xl shadow dark:shadow-gray-800 p-6">
        <h1 className="text-2xl font-bold mb-1 text-gray-900 dark:text-gray-50">Create your account</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">DLSU Counseling & Psychological Services</p>

        <div className="mb-5 px-3.5 py-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Only <strong>@dlsu.edu.ph</strong> email addresses are permitted.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">First name</label>
              <input className={INPUT_CLS} placeholder="Juan" value={form.first_name}
                onChange={e => setForm({ ...form, first_name: e.target.value })} required />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Last name</label>
              <input className={INPUT_CLS} placeholder="dela Cruz" value={form.last_name}
                onChange={e => setForm({ ...form, last_name: e.target.value })} required />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">DLSU Email</label>
            <input className={INPUT_CLS} placeholder="you@dlsu.edu.ph" type="email"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required autoComplete="email" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Password</label>
            <div className="relative">
              <input className={INPUT_CLS + ' pr-10'} type={showPw ? 'text' : 'password'}
                placeholder="At least 8 characters" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} required autoComplete="new-password" />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
            {form.password.length > 0 && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex gap-0.5 flex-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= pwStrength.score ? pwStrength.color : 'bg-gray-200 dark:bg-gray-700'}`} />
                  ))}
                </div>
                <span className="text-xs text-gray-400">{pwStrength.label}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Confirm password</label>
            <input className={INPUT_CLS + (pwMismatch ? ' border-red-400 focus:ring-red-400' : '')}
              type={showPw ? 'text' : 'password'} placeholder="Re-enter password"
              value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" />
            {pwMismatch && <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>}
          </div>

          {error && (
            <div className="px-3.5 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            className="w-full py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit" disabled={loading || pwMismatch}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        {msg && <p className="mt-4 text-sm text-blue-700 dark:text-blue-400">{msg}</p>}

        <div className="mt-5 border-t border-gray-200 dark:border-gray-700 pt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Prefer Google? <a href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Use Google Sign-In on the login page</a></p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
            Already have an account? <a href="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Sign in</a>
          </p>
        </div>
      </div>
    </PageShell>
  )
}
