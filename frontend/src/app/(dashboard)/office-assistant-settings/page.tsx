'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function OfficeAssistantSettingsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/staff-settings'); }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 size={48} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
    </div>
  );
}
