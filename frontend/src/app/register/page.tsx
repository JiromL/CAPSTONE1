"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'
import { api } from '@/utils/api';

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '' })
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
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
      
      // Redirect to verification page
      setMsg('Account created! Redirecting to verification page...')
      setTimeout(() => {
        router.push(`/verify-email?email=${encodeURIComponent(form.email)}&user_id=${data.user_id}`)
      }, 1500)
      
    } catch (err) {
      setError('Network error')
      setLoading(false)
    }
  }

  return (
    <PageShell title="Register" subtitle="Create a CPS account">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-900 rounded-lg shadow dark:shadow-gray-800 p-6">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-50">Register</h1>
        
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Only DLSU email addresses (@dlsu.edu.ph) are allowed
          </p>
        </div>
        
        <form onSubmit={submit} className="space-y-3">
          <input 
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400" 
            placeholder="First name" 
            value={form.first_name} 
            onChange={e => setForm({ ...form, first_name: e.target.value })} 
            required
          />
          
          <input 
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400" 
            placeholder="Last name" 
            value={form.last_name} 
            onChange={e => setForm({ ...form, last_name: e.target.value })} 
            required
          />
          
          <input 
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400" 
            placeholder="Email (must be @dlsu.edu.ph)" 
            type="email"
            value={form.email} 
            onChange={e => setForm({ ...form, email: e.target.value })} 
            required
          />
          
          <input 
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400" 
            type="password" 
            placeholder="Password" 
            value={form.password} 
            onChange={e => setForm({ ...form, password: e.target.value })} 
            required
          />
          
          <button 
            className="w-full px-4 py-2 bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-800 text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed" 
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        
        {msg && <p className="mt-4 text-sm text-green-700 dark:text-green-400">{msg}</p>}
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        
        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="text-center text-xs text-gray-600 dark:text-gray-400 mb-3">
            Or sign up with Google
          </p>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mb-3">
            Go to <a href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">login page</a> and use the Google option
          </p>
        </div>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
          Already have an account? <a href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Login</a>
        </p>
      </div>
    </PageShell>
  )
}
