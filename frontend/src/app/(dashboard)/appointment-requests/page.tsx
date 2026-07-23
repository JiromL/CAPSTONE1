'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import AppointmentsDashboard from '@/components/AppointmentsDashboard';

export default function AppointmentsRequestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userData || !token) { router.push('/login'); return; }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <DashboardPageWrapper title="Appointments" subtitle="View appointment requests">
        <div className="flex items-center justify-center p-8">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper
      title="Appointment Requests"
      subtitle="Review new requests, assign counselors, and track session outcomes"
    >
      <AppointmentsDashboard />
    </DashboardPageWrapper>
  );
}
