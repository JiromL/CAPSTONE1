'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import AppointmentsDashboard from '@/components/AppointmentsDashboard';

export default function AppointmentsRequestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      router.push('/login');
      return;
    }

    setLoading(false);
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
      <AppointmentsDashboard />
    </DashboardPageWrapper>
  );
}
