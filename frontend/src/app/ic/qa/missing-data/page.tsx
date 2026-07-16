'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function QAMissingDataRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/ic/qa?tab=missing-data'); }, [router]);
  return null;
}
