'use client';

import { useEffect } from 'react';

export default function DashboardRedirect() {
  useEffect(() => {
    // Redirect to main dashboard
    window.location.href = '/dashboard';
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="animate-spin rounded-full h-12 w-12" style={{ borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent', borderBottomColor: 'var(--color-primary)' }}></div>
    </div>
  );
}
