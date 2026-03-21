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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 shadow dark:shadow-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              CPS System
            </Link>
            {!hideNav && (
              <nav className="flex items-center gap-6 text-sm">
                <Link href="/dashboard" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 transition">
                  Dashboard
                </Link>
                <Link href="/tasks" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 transition">
                  My Tasks
                </Link>
                <Link href="/intake" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 transition">
                  Intake Form
                </Link>
                <Link href="/book-appointment" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 transition">
                  Book Appointment
                </Link>
                <Link href="/resources" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 transition">
                  Wellness Resources
                </Link>
                <Link href="/profile" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 transition">
                  Profile
                </Link>
              </nav>
            )}
            {title && !hideNav && <div className="text-sm text-gray-600 dark:text-gray-400">{title}</div>}
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
        {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{subtitle}</p>}
        <div className="space-y-6">{children}</div>
      </main>
    </div>
  );
}
