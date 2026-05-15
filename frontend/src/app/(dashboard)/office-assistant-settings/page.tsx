'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OfficeAssistantSettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/staff-settings');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );
}
