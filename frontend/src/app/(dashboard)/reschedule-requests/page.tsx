'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RescheduleRequestsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/appointments'); }, [router]);
  return null;
}
