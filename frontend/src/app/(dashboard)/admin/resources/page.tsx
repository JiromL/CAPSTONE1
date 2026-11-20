"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Sharing resources now happens on the Wellness Resources page, for every role that can share
export default function AdminResourcesPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/resources'); }, [router]);
  return null;
}
