'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { getMenuItemsByRole, getActiveSectionFromPath } from '@/utils/navigation';
import { canAccessPage } from '@/utils/roleAccess';

interface DashboardPageWrapperProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  requiredRoles?: string[];
}

function FullPageLoader() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Animated mark */}
        <div className="relative">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'var(--color-primary)' }}
          >
            <span className="text-[11px] font-extrabold text-white tracking-tighter select-none">CPS</span>
          </div>
          {/* Spinning ring */}
          <svg
            className="absolute -inset-2 w-16 h-16 animate-spin"
            style={{ animationDuration: '1.4s' }}
            viewBox="0 0 64 64"
            fill="none"
          >
            <circle
              cx="32" cy="32" r="28"
              stroke="var(--color-primary)"
              strokeOpacity="0.15"
              strokeWidth="3"
            />
            <path
              d="M32 4 A28 28 0 0 1 60 32"
              stroke="var(--color-primary)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Loading…
        </p>
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6 animate-scale-in">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--color-danger-surface)' }}
        >
          <AlertCircle size={28} style={{ color: 'var(--color-danger)' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            Access Restricted
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            You don't have permission to view this page.
          </p>
          <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
            Redirecting you to your dashboard…
          </p>
        </div>
      </div>
    </div>
  );
}

export function DashboardPageWrapper({ children, title, subtitle, requiredRoles }: DashboardPageWrapperProps) {
  const [user, setUser]               = useState<any>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const pathname                      = usePathname();
  const router                        = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token    = localStorage.getItem('token');

    if (!userData || !token) {
      window.location.href = '/login';
      return;
    }

    const parsedUser = JSON.parse(userData);

    if (!canAccessPage(pathname, parsedUser.role)) {
      setAccessDenied(true);
      setTimeout(() => router.push('/dashboard'), 2000);
      return;
    }

    setUser(parsedUser);
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  if (!user && !accessDenied) return <FullPageLoader />;
  if (accessDenied)            return <AccessDenied />;

  const menuItems     = getMenuItemsByRole(user.role);
  const activeSection = getActiveSectionFromPath(pathname);

  return (
    <DashboardLayout
      user={user}
      onLogout={handleLogout}
      menuItems={menuItems}
      title={title}
      subtitle={subtitle}
      activeSection={activeSection}
    >
      {children}
    </DashboardLayout>
  );
}
