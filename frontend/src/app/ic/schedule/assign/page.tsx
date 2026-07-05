"use client";

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Calendar, Clock, Loader2 } from 'lucide-react';
import { api } from '@/utils/api';

export default function AssignSchedulePage() {
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('available');

  const token = () => localStorage.getItem('token');

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await fetch(api('/api/availability'), {
          headers: { Authorization: `Bearer ${token()}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSlots(Array.isArray(data) ? data : data.slots || []);
        }
      } catch {
        setSlots([]);
      }
      setLoading(false);
    };
    fetchSlots();
  }, []);

  const stats = [
    { label: 'Available Slots', value: slots.filter(s => s.status === 'available').length, color: 'bg-green-50 border-green-200' },
    { label: 'Assigned',        value: slots.filter(s => s.status === 'assigned').length,  color: 'bg-blue-50 border-blue-200' },
    { label: 'Pending',         value: slots.filter(s => s.status === 'pending').length,   color: 'bg-amber-50 border-amber-200' },
  ];

  return (
    <PageShell title="Assign Time Slots" subtitle="Manage counselor availability and student appointments">
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {stats.map(stat => (
            <div key={stat.label} className={`${stat.color} border rounded-xl p-4`}>
              <p className="text-sm font-medium text-gray-600">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pb-2">
          {['available', 'assigned', 'pending'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg capitalize transition text-sm font-medium ${
                filter === f
                  ? 'bg-[#2563eb] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-gray-400 text-sm">
            <Loader2 size={16} className="animate-spin" /> Loading slots…
          </div>
        ) : slots.filter(s => s.status === filter).length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <Calendar className="mx-auto mb-4 text-gray-400" size={32} />
            <p>No {filter} time slots</p>
          </div>
        ) : (
          <div className="space-y-3">
            {slots.filter(s => s.status === filter).map(slot => (
              <div key={slot._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {slot.date ? new Date(slot.date).toLocaleDateString() : '—'} at {slot.time || '—'}
                      </p>
                      <p className="text-xs text-gray-500">{slot.counselor_name} · {slot.duration || 50} min</p>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 bg-[#2563eb] text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                    Assign
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
