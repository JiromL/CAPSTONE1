'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// The CM Queue now lives at /mhbot (EMA and counselor risk flags in one list). Old links and
// bookmarks to /case-manager/queue land there.
export default function CaseManagerQueueRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/mhbot'); }, [router]);
  return null;
}
