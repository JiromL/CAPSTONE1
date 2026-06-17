'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CounselingPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/book-appointment'); }, [router]);
  return null;
}
