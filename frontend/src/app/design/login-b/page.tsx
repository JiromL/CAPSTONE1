'use client';

/** MOCKUP ONLY — Option B · Night: full navy (sidebar colour) with a centered card. */
import { BrandMark, ThemeButton, OfficePill, CrisisLine, PrivacyNote, LoginCard, MockupBanner } from '../login-parts';

export default function LoginOptionB() {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: 'var(--color-sidebar)' }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(900px 520px at 50% 0%, rgba(35,82,204,0.38), transparent 70%), radial-gradient(700px 420px at 50% 110%, rgba(35,82,204,0.16), transparent 70%)' }} />

      <header className="relative flex items-center justify-between px-5 sm:px-10 h-20">
        <BrandMark onDark />
        <ThemeButton onDark />
      </header>

      <main className="relative flex-1 flex items-start sm:items-center justify-center px-5 pb-16">
        <div className="w-full max-w-[26rem] animate-fade-up">
          <p className="text-center font-display text-white/90 mb-6" style={{ fontSize: '1.25rem', lineHeight: 1.4 }}>
            Reaching out is the first step.<br />
            <span className="text-white/55">We&apos;ll take the next one with you.</span>
          </p>
          <LoginCard />
          <div className="mt-6 space-y-4">
            <div className="flex justify-center"><OfficePill onDark /></div>
            <CrisisLine onDark />
            <PrivacyNote onDark />
          </div>
        </div>
      </main>

      <MockupBanner label="Option B · Night" />
    </div>
  );
}
