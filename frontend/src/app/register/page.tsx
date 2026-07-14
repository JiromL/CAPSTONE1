"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'
import { api } from '@/utils/api';

const IC = 'w-full px-3.5 py-2.5 text-sm rounded-lg outline-none transition';
const ICS: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: '',       color: '#E5E7EB' },
    { label: 'Weak',   color: '#F87171' },
    { label: 'Fair',   color: '#FBBF24' },
    { label: 'Good',   color: '#FACC15' },
    { label: 'Strong', color: '#22C55E' },
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
    if (form.password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    if (!form.email.endsWith('@dlsu.edu.ph')) { setError('Only @dlsu.edu.ph email addresses are allowed.'); return; }
    setError(''); setMsg(''); setLoading(true)
    try {
      const res = await fetch(api('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Registration failed'); setLoading(false); return; }
      setMsg('Account created! Check your email to verify your account.')
      router.push(`/verify-email?email=${encodeURIComponent(form.email)}&user_id=${data.user_id}`)
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <PageShell title="Register" subtitle="Create a CPS account" hideNav>
      <div className="max-w-md mx-auto rounded-xl p-6" style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Create your account</h1>
        <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>DLSU Counseling & Psychological Services</p>

        <div className="mb-5 px-3.5 py-3 rounded-lg" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary-muted)' }}>
          <p className="text-sm" style={{ color: 'var(--color-primary-text)' }}>
            Only <strong>@dlsu.edu.ph</strong> email addresses are permitted.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>First name</label>
              <input className={IC} style={ICS} placeholder="Juan" value={form.first_name}
                onChange={e => setForm({ ...form, first_name: e.target.value })} required />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Last name</label>
              <input className={IC} style={ICS} placeholder="dela Cruz" value={form.last_name}
                onChange={e => setForm({ ...form, last_name: e.target.value })} required />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>DLSU Email</label>
            <input className={IC} style={ICS} placeholder="you@dlsu.edu.ph" type="email"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required autoComplete="email" />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Password</label>
            <div className="relative">
              <input className={IC + ' pr-10'} style={ICS} type={showPw ? 'text' : 'password'}
                placeholder="At least 8 characters" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} required autoComplete="new-password" />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs transition"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
            {form.password.length > 0 && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex gap-0.5 flex-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-1 flex-1 rounded-full transition-colors"
                      style={{ background: i <= pwStrength.score ? pwStrength.color : 'var(--color-border)' }} />
                  ))}
                </div>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{pwStrength.label}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Confirm password</label>
            <input className={IC}
              style={pwMismatch ? { ...ICS, border: '1px solid var(--color-danger)' } : ICS}
              type={showPw ? 'text' : 'password'} placeholder="Re-enter password"
              value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" />
            {pwMismatch && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>Passwords do not match.</p>}
          </div>

          {error && (
            <div className="px-3.5 py-3 rounded-lg text-sm" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger-text)' }}>
              {error}
            </div>
          )}

          <button className="w-full py-2.5 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-primary)' }}
            type="submit" disabled={loading || pwMismatch}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        {msg && <p className="mt-4 text-sm" style={{ color: 'var(--color-primary-text)' }}>{msg}</p>}

        <div className="mt-5 pt-4 text-center" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Prefer Google? <a href="/login" className="hover:underline" style={{ color: 'var(--color-primary)' }}>Use Google Sign-In on the login page</a>
          </p>
          <p className="text-sm mt-3" style={{ color: 'var(--color-text-secondary)' }}>
            Already have an account? <a href="/login" className="font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>Sign in</a>
          </p>
        </div>
      </div>
    </PageShell>
  )
}
