'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminAvailabilityRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/availability');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="animate-spin rounded-full h-12 w-12" style={{ borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent', borderBottomColor: 'var(--color-primary)' }} />
    </div>
  );
}
