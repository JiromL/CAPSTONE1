'use client';

import { useEffect } from 'react';

export default function DashboardRedirect() {
  useEffect(() => {
    // Redirect to main dashboard
    window.location.href = '/dashboard/dashboard';
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );
}
