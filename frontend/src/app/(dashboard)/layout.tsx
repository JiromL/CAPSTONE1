'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const routerRef = useRef(router);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Global 401 interceptor — redirect to login when session expires.
  // Registered once on mount (empty deps) so navigation doesn't reset the
  // `redirecting` flag or create stacked interceptors.
  useEffect(() => {
    let redirecting = false;
    const original = window.fetch;

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await original(...args);

      if (res.status === 401 && !redirecting) {
        const init = args[1] as RequestInit | undefined;
        const hasAuthHeader = !!(
          init?.headers &&
          (init.headers as Record<string, string>)['Authorization']
        );

        if (hasAuthHeader) {
          // Only treat as session expiry if the token is genuinely gone/expired
          const token = localStorage.getItem('token');
          if (!token) {
            redirecting = true;
            routerRef.current.replace('/login?expired=true');
            return res;
          }
          // Decode the JWT exp claim to confirm it's actually expired
          try {
            const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (payload.exp * 1000 < Date.now()) {
              redirecting = true;
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              routerRef.current.replace('/login?expired=true');
            }
          } catch {
            // Malformed token — treat as expired
            redirecting = true;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            routerRef.current.replace('/login?expired=true');
          }
        }
      }

      return res;
    };

    return () => {
      window.fetch = original;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}
