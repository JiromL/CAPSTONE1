'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { getMenuItemsByRole } from '@/utils/navigation';

type Props = {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  hideNav?: boolean;
};

export default function PageShell({ title, subtitle, actions, children, hideNav = false }: Props) {
  const [menuItems, setMenuItems] = useState(getMenuItemsByRole('STUDENT'));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        setMenuItems(getMenuItemsByRole(u.role || 'STUDENT'));
      }
    } catch {}
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <header style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-semibold flex-shrink-0" style={{ color: 'var(--color-text-primary)' }}>
              CPS System
            </Link>
            {!hideNav && mounted && (
              <nav className="flex items-center gap-5 text-sm overflow-x-auto">
                {menuItems.map(item => (
                  <Link
                    key={item.id}
                    href={item.href ?? '#'}
                    className="whitespace-nowrap transition-colors hover:opacity-80"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Suspense fallback={<div className="p-2 w-10 h-10" />}>
              <ThemeToggle />
            </Suspense>
            {actions}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(title || subtitle) && (
          <div className="mb-6">
            {title && (
              <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{title}</h1>
            )}
            {subtitle && (
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{subtitle}</p>
            )}
          </div>
        )}
        <div className="space-y-6">{children}</div>
      </main>
    </div>
  );
}
