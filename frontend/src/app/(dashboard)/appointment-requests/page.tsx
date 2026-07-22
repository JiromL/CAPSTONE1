'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import AppointmentsDashboard from '@/components/AppointmentsDashboard';
import { api } from '@/utils/api';
import { Users } from 'lucide-react';

interface CapacityData {
  confirmed_today: number;
  max_capacity: number;
  has_capacity: boolean;
  slots_remaining: number;
}

export default function AppointmentsRequestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [capacity, setCapacity] = useState<CapacityData | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      router.push('/login');
      return;
    }

    setLoading(false);

    // Fetch today's overall walk-in capacity
    fetch(api('/api/appointments/walkin-capacity'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCapacity(d); })
      .catch(() => {});
  }, [router]);

  if (loading) {
    return (
      <DashboardPageWrapper title="Appointments" subtitle="View appointment requests">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper
      title="Appointment Requests"
      subtitle="Review new requests, assign counselors, and track session outcomes"
    >
      {/* Walk-in capacity indicator */}
      {capacity !== null && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4 text-sm border"
          style={capacity.has_capacity
            ? { background: 'var(--color-success-surface)', borderColor: 'var(--color-success)' }
            : { background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)' }}>
          <Users size={14} className="flex-shrink-0"
            style={{ color: capacity.has_capacity ? 'var(--color-success)' : 'var(--color-danger)' }} />
          <span className="font-medium"
            style={{ color: capacity.has_capacity ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {capacity.has_capacity
              ? `Walk-in capacity available — ${capacity.slots_remaining} slot${capacity.slots_remaining !== 1 ? 's' : ''} remaining today (${capacity.confirmed_today}/${capacity.max_capacity} confirmed)`
              : `Walk-in capacity full — ${capacity.confirmed_today}/${capacity.max_capacity} sessions confirmed today. New walk-ins should be queued.`}
          </span>
        </div>
      )}

      <AppointmentsDashboard />
    </DashboardPageWrapper>
  );
}
