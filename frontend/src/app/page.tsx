'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    </PageShell>
  );
}
