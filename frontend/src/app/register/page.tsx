"use client"

import React, { useState } from 'react'
import PageShell from '@/components/PageShell'
import { api } from '@/utils/api';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '' })
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMsg('')
    try {
      const res = await fetch(api('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Registration failed')
        return
      }
      setMsg('Registration successful — please log in')
      setForm({ email: '', password: '', first_name: '', last_name: '' })
    } catch (err) {
      setError('Network error')
    }
  }

  return (
    <PageShell title="Register" subtitle="Create a CPS account">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Register</h1>
        <form onSubmit={submit} className="space-y-3">
          <input className="w-full p-2 border rounded" placeholder="First name" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
          <input className="w-full p-2 border rounded" placeholder="Last name" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
          <input className="w-full p-2 border rounded" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <input className="w-full p-2 border rounded" type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <button className="px-4 py-2 bg-green-600 text-white rounded" type="submit">Register</button>
        </form>
        {msg && <p className="mt-4 text-sm text-green-700">{msg}</p>}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </PageShell>
  )
}
