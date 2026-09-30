'use client';

/** Time-of-day greeting in Manila time. */
export function greetingFor(d: Date = new Date()): string {
  const h = Number(d.toLocaleString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hour12: false })) % 24;
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Page-top greeting shared by every role dashboard, matching the student
 * dashboard: Figtree headline, one supporting line, optional actions.
 */
export function DashboardGreeting({
  firstName, subtitle, actions,
}: { firstName: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 mb-7 animate-fade-up">
      <div className="min-w-0">
        <h1 className="type-display" style={{ color: 'var(--color-text-primary)' }}>
          {greetingFor()}, {firstName}.
        </h1>
        {subtitle && (
          <p className="type-body mt-1.5" style={{ color: 'var(--color-text-secondary)' }}>{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  );
}
