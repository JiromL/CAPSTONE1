'use client';

import { useTheme } from '@/context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg transition-colors"
      style={{ color: 'var(--color-text-secondary)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-primary)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)'; }}
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
    </button>
  );
}
