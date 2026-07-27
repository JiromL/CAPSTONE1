'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WalkinLegacy() {
  const router = useRouter();
  useEffect(() => { router.replace('/staff/walkin-intake'); }, [router]);
  return null;
}
