'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { ThemeToggle } from './ThemeToggle';

type Props = {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  hideNav?: boolean;
};

export default function PageShell({ title, subtitle, actions, children, hideNav = false }: Props) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <header style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              CPS System
            </Link>
            {!hideNav && (
              <nav className="flex items-center gap-6 text-sm">
                <Link href="/dashboard" className="transition" style={{ color: 'var(--color-text-secondary)' }}>Dashboard</Link>
                <Link href="/tasks" className="transition" style={{ color: 'var(--color-text-secondary)' }}>My Tasks</Link>
                <Link href="/intake" className="transition" style={{ color: 'var(--color-text-secondary)' }}>Intake Form</Link>
                <Link href="/book-appointment" className="transition" style={{ color: 'var(--color-text-secondary)' }}>Book Appointment</Link>
                <Link href="/resources" className="transition" style={{ color: 'var(--color-text-secondary)' }}>Wellness Resources</Link>
                <Link href="/profile" className="transition" style={{ color: 'var(--color-text-secondary)' }}>Profile</Link>
              </nav>
            )}
            {title && !hideNav && <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{title}</div>}
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
        {subtitle && <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>{subtitle}</p>}
        <div className="space-y-6">{children}</div>
      </main>
    </div>
  );
}
