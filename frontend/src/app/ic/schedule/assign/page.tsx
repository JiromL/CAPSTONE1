"use client";

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Calendar, Clock, Loader2 } from 'lucide-react';
import { api } from '@/utils/api';

const STAT_STYLES: Record<string, React.CSSProperties> = {
  available: { background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' },
  assigned:  { background: 'var(--color-info-surface)',    border: '1px solid var(--color-info)'    },
  pending:   { background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' },
};

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
    { label: 'Available Slots', value: slots.filter(s => s.status === 'available').length, key: 'available' },
    { label: 'Assigned',        value: slots.filter(s => s.status === 'assigned').length,  key: 'assigned'  },
    { label: 'Pending',         value: slots.filter(s => s.status === 'pending').length,   key: 'pending'   },
  ];

  return (
    <PageShell title="Assign Time Slots" subtitle="Manage counselor availability and student appointments">
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {stats.map(stat => (
            <div key={stat.label} className="rounded-xl p-4" style={STAT_STYLES[stat.key]}>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{stat.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pb-2">
          {['available', 'assigned', 'pending'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-lg capitalize text-sm font-medium transition"
              style={filter === f
                ? { background: 'var(--color-primary)', color: '#fff' }
                : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => { if (filter !== f) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-border)'; }}
              onMouseLeave={e => { if (filter !== f) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)'; }}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={16} className="animate-spin" /> Loading slots…
          </div>
        ) : slots.filter(s => s.status === filter).length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto mb-4" size={32} style={{ color: 'var(--color-text-muted)' }} />
            <p style={{ color: 'var(--color-text-secondary)' }}>No {filter} time slots</p>
          </div>
        ) : (
          <div className="space-y-3">
            {slots.filter(s => s.status === filter).map(slot => (
              <div
                key={slot._id}
                className="rounded-xl p-4 transition"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {slot.date ? new Date(slot.date).toLocaleDateString() : '—'} at {slot.time || '—'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{slot.counselor_name} · {slot.duration || 50} min</p>
                    </div>
                  </div>
                  <button
                    className="px-3 py-1.5 text-white rounded-lg text-sm font-medium transition"
                    style={{ background: 'var(--color-primary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary)')}
                  >
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
