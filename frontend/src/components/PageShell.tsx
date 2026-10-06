'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { DashboardLayout } from './DashboardLayout';
import { getMenuItemsByRole, getActiveSectionFromPath } from '@/utils/navigation';
import { CpsLogoMark, CPS_LOGO_TILE } from '@/components/CpsLogo';

type Props = {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  hideNav?: boolean;
};

function PageHeader({ title, subtitle, actions }: Pick<Props, 'title' | 'subtitle' | 'actions'>) {
  if (!title && !subtitle && !actions) return null;
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
      <div className="min-w-0">
        {title && <h1 className="type-display" style={{ color: 'var(--color-text-primary)' }}>{title}</h1>}
        {subtitle && <p className="type-body mt-1.5 max-w-2xl" style={{ color: 'var(--color-text-secondary)' }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  );
}

/**
 * Page frame for pages outside the (dashboard) route group.
 * Signed-in users get the same sidebar shell as every dashboard page;
 * public pages (hideNav, or no session) get a centered branded layout.
 */
export default function PageShell({ title, subtitle, actions, children, hideNav = false }: Props) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (hideNav) return;
    try {
      const raw = localStorage.getItem('user');
      if (raw && localStorage.getItem('token')) setUser(JSON.parse(raw));
    } catch {}
  }, [hideNav]);

  if (mounted && user) {
    const handleLogout = () => {
      localStorage.clear();
      window.location.href = '/login';
    };
    return (
      <DashboardLayout
        user={user}
        onLogout={handleLogout}
        menuItems={getMenuItemsByRole(user.role || 'STUDENT')}
        title={title || 'CPS'}
        subtitle={subtitle}
        activeSection={getActiveSectionFromPath(pathname)}
        titleInPage
      >
        <PageHeader title={title} subtitle={subtitle} actions={actions} />
        <div className="space-y-6">{children}</div>
      </DashboardLayout>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <header className="flex items-center justify-between px-6 sm:px-10 h-16 border-b" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <Link href="/login" className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={CPS_LOGO_TILE}>
            <CpsLogoMark />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>DLSU CPS</span>
            <span className="block text-[0.6875rem]" style={{ color: 'var(--color-text-muted)' }}>Counseling &amp; Psychological Services</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Suspense fallback={<div className="w-10 h-10" />}>
            <ThemeToggle />
          </Suspense>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Account pages (hideNav) carry their own card heading, so skip the page title */}
        {!hideNav && <PageHeader title={title} subtitle={subtitle} actions={actions} />}
        <div className="space-y-6">{children}</div>
      </main>
    </div>
  );
}
