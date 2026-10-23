'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EmaRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/mhbot'); }, [router]);
  return null;
}
