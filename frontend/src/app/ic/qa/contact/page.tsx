'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function QAContactRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/ic/qa?tab=contact'); }, [router]);
  return null;
}
