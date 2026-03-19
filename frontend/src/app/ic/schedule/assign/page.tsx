"use client";

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

export default function AssignSchedulePage() {
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('available');

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await fetch('/api/availability');
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
    { label: 'Available Slots', value: slots.filter(s => s.status === 'available').length, color: 'bg-green-100' },
    { label: 'Assigned', value: slots.filter(s => s.status === 'assigned').length, color: 'bg-blue-100' },
    { label: 'Pending', value: slots.filter(s => s.status === 'pending').length, color: 'bg-yellow-100' },
  ];

  return (
    <PageShell title="Assign Time Slots" subtitle="Manage counselor availability and student appointments">
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {stats.map(stat => (
            <div key={stat.label} className={`${stat.color} rounded-lg p-4`}>
              <p className="text-sm font-medium text-gray-700">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pb-2">
          {['available', 'assigned', 'pending'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded capitalize transition ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        ) : slots.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <Calendar className="mx-auto mb-4 text-gray-400" size={32} />
            <p>No time slots available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {slots.filter(s => s.status === filter).map(slot => (
              <div key={slot._id} className="border rounded-lg p-4 hover:shadow transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="text-gray-500" />
                    <div>
                      <p className="font-semibold text-gray-900">{new Date(slot.date).toLocaleDateString()} at {slot.time}</p>
                      <p className="text-sm text-gray-600">{slot.counselor_name} - {slot.duration || 50} min</p>
                    </div>
                  </div>
                  <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium hover:bg-blue-200">Assign</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
