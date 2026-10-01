'use client';

/**
 * MOCKUP ONLY — Option C · Welcome banner: a navy banner with the headline,
 * the sign-in card overlapping its bottom edge, help and privacy below.
 */
import { CalendarPlus, CalendarCheck, NotebookPen, HeartHandshake } from 'lucide-react';
import { BrandMark, ThemeButton, OfficePill, CrisisLine, PrivacyNote, LoginCard, MockupBanner } from '../login-parts';

const FEATURES = [
  { icon: CalendarPlus,   label: 'Request a session' },
  { icon: CalendarCheck,  label: 'Track appointments' },
  { icon: NotebookPen,    label: 'Private journal' },
  { icon: HeartHandshake, label: 'Wellness resources' },
];

export default function LoginOptionC() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Banner */}
      <div className="relative overflow-hidden pb-40 sm:pb-44" style={{ background: 'var(--color-sidebar)' }}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(1000px 420px at 20% -40px, rgba(35,82,204,0.35), transparent 70%)' }} />
        <header className="relative flex items-center justify-between px-5 sm:px-10 h-20">
          <BrandMark onDark />
          <ThemeButton onDark />
        </header>
        <div className="relative max-w-3xl mx-auto px-5 pt-6 sm:pt-10 text-center">
          <h2 className="font-display text-white" style={{ fontSize: 'clamp(1.625rem, 3vw, 2.25rem)', lineHeight: 1.25 }}>
            Reaching out is the first step.
          </h2>
          <p className="type-body mt-2 text-white/65">We&apos;ll take the next one with you.</p>
          <ul className="mt-7 hidden sm:flex flex-wrap justify-center gap-2">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm text-white/80"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Icon size={15} strokeWidth={1.75} aria-hidden="true" /> {label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Card overlapping the banner */}
      <main className="relative -mt-32 sm:-mt-36 px-5 pb-20">
        <div className="w-full max-w-[26rem] mx-auto animate-fade-up">
          <LoginCard />
        </div>
        <div className="w-full max-w-[26rem] mx-auto mt-6 space-y-4">
          <div className="flex justify-center"><OfficePill /></div>
          <CrisisLine />
          <PrivacyNote />
        </div>
      </main>

      <MockupBanner label="Option C · Welcome banner" />
    </div>
  );
}
