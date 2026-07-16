'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function QAFollowUpRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/ic/qa?tab=follow-up'); }, [router]);
  return null;
}
