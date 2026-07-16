'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function QAVerifyRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/ic/qa?tab=verify'); }, [router]);
  return null;
}
