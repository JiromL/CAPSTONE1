'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import SessionTimeoutWarning from '@/components/SessionTimeoutWarning';
import { canAccessPage, type UserRole } from '@/utils/roleAccess';

export default function ICLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const routerRef = useRef(router);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');
    if (!token || !userRaw) {
      router.replace('/login');
      return;
    }
    try {
      const user = JSON.parse(userRaw);
      // Same rule as every other page (utils/roleAccess): admins and the DPO may open IC pages too
      const role = (user.role || '').toUpperCase() as UserRole;
      if (!canAccessPage(pathname, role)) {
        router.replace('/dashboard');
      }
    } catch {
      router.replace('/login');
    }
  }, [router, pathname]);

  // Global 401 interceptor — mirrors the (dashboard) layout pattern.
  useEffect(() => {
    let redirecting = false;
    const original = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await original(...args);
      // 422 is how the server answers a missing or malformed login token; the checks below still
      // only redirect when the token really is gone or expired
      if ((res.status === 401 || res.status === 422) && !redirecting) {
        const init = args[1] as RequestInit | undefined;
        const hasAuth = !!(
          init?.headers &&
          (init.headers as Record<string, string>)['Authorization']
        );
        if (hasAuth) {
          redirecting = true;
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          routerRef.current.replace('/login');
        }
      }
      return res;
    };
    return () => { window.fetch = original; };
  }, []);

  return (
    <>
      {children}
      <SessionTimeoutWarning />
    </>
  );
}
