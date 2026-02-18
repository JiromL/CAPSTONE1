"use client"

import React, { useEffect, useState } from 'react'
import PageShell from '@/components/PageShell'

type Reservation = {
  id: string
  user_id: string
  date: string
  time: string
  party_size: number
  status: string
  created_at: string
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ user_id: '', date: '', time: '', party_size: 1 })

  useEffect(() => {
    fetchReservations()
  }, [])

  async function fetchReservations() {
    setLoading(true)
    try {
      const res = await fetch('/api/reservations')
      const data = await res.json()
      setReservations(data.reservations || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function createReservation(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Create failed')
      await fetchReservations()
      setForm({ user_id: '', date: '', time: '', party_size: 1 })
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <PageShell title="Reservations" subtitle="Manage reservations and bookings">
      <div className="bg-white rounded-lg shadow p-6">
        <form className="mb-6 space-y-2 max-w-md" onSubmit={createReservation}>
          <input className="w-full p-2 border rounded" placeholder="User ID" value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })} />
          <input className="w-full p-2 border rounded" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          <input className="w-full p-2 border rounded" type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
          <input className="w-full p-2 border rounded" type="number" min={1} value={form.party_size} onChange={e => setForm({ ...form, party_size: Number(e.target.value) })} />
          <div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded" type="submit">Create</button>
          </div>
        </form>

        <section>
          <h2 className="text-xl font-semibold mb-2">List</h2>
          {loading ? <p>Loading...</p> : (
            <ul className="space-y-2">
              {reservations.map(r => (
                <li key={r.id} className="p-3 border rounded">
                  <div className="font-medium">{r.user_id} — {r.status}</div>
                  <div className="text-sm text-gray-600">{r.date} {r.time} • party {r.party_size}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  )
}
