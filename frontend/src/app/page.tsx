'use client';

import { useEffect } from 'react';
import PageShell from '@/components/PageShell';

export default function Home() {
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      window.location.href = '/dashboard';
    } else {
      window.location.href = '/login';
    }
  }, []);

  return (
    <PageShell title="Welcome" subtitle="Starting up...">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    </PageShell>
  );
}
