'use client';

/** MOCKUP ONLY — Option A · Quiet card: one centered card on the app canvas. */
import { BrandMark, ThemeButton, OfficePill, CrisisLine, PrivacyNote, LoginCard, MockupBanner } from '../login-parts';

export default function LoginOptionA() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(1200px 480px at 50% -160px, color-mix(in srgb, var(--color-primary) 18%, transparent), transparent 72%), var(--color-bg)' }}
    >
      <header className="flex items-center justify-between px-5 sm:px-10 h-20">
        <BrandMark />
        <ThemeButton />
      </header>

      <main className="flex-1 flex items-start sm:items-center justify-center px-5 pb-16">
        <div className="w-full max-w-[26rem] space-y-5 animate-fade-up">
          <div className="flex justify-center"><OfficePill /></div>
          <LoginCard subtitle="Sign in to your sessions, journal, and resources." />
          <CrisisLine />
          <PrivacyNote />
        </div>
      </main>

      <MockupBanner label="Option A · Quiet card" />
    </div>
  );
}
