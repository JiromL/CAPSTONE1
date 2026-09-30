'use client';

import Link from 'next/link';
import { Phone, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

/**
 * Frame for the signed-out account pages (forgot / reset password), matching
 * the login page: navy statement panel on the left, form on the right.
 * On mobile the form comes first.
 */
export function AuthFrame({ headline, children }: { headline: React.ReactNode; children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row-reverse" style={{ background: 'var(--color-bg)' }}>
      <main className="flex-1 flex flex-col px-6 sm:px-12 py-8" style={{ background: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
              <span className="text-[10px] font-extrabold text-white tracking-tighter select-none">CPS</span>
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>DLSU CPS</span>
              <span className="block text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Counseling &amp; Psychological Services</span>
            </span>
          </Link>
          <button
            onClick={toggleTheme}
            className="btn-ghost !w-10 !h-10 !min-h-0 !p-0"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-[400px] mx-auto py-12 animate-fade-up">{children}</div>
        </div>
      </main>

      <aside className="relative lg:w-[48%] flex flex-col justify-between overflow-hidden px-6 sm:px-12 py-10 lg:py-12" style={{ background: 'var(--color-sidebar)' }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0 39px, #fff 39px 40px)' }} aria-hidden="true" />
        <div className="absolute -right-40 -top-40 w-[520px] h-[520px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(35,82,204,0.35) 0%, transparent 65%)' }} aria-hidden="true" />
        <div />
        <h2 className="relative font-display max-w-md py-10 lg:py-0" style={{ fontSize: 'clamp(2rem, 3.6vw, 3.25rem)', lineHeight: 1.08, color: 'white' }}>
          {headline}
        </h2>
        <div className="relative space-y-2">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
            <Phone size={14} style={{ color: '#F87171' }} aria-hidden="true" />
            In crisis right now?
            <a href="https://ncmh.gov.ph" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2" style={{ color: '#FCA5A5' }}>
              24/7 Philippine Mental Health Hotline
            </a>
          </p>
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>© {new Date().getFullYear()} De La Salle University Manila</p>
        </div>
      </aside>
    </div>
  );
}
