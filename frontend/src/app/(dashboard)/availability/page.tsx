'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AvailabilityRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/schedule?tab=availability'); }, [router]);
  return null;
}
