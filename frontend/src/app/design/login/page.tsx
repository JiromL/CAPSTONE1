'use client';

import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Phone, ArrowRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

/**
 * MOCKUP ONLY — not wired to auth. Lives under /design for side-by-side
 * review against the real page at /login. Nothing here calls the API.
 */
export default function LoginMockup() {
  const { theme, toggleTheme } = useTheme();
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
      <style>{`
        @keyframes cps-breathe {
          0%, 100% { transform: scale(1);    opacity: 0.55; }
          50%      { transform: scale(1.45); opacity: 1;    }
        }
        .breathe-dot { width: 6px; height: 6px; border-radius: 999px; flex-shrink: 0; background: #7BAAF7; animation: cps-breathe 3.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .breathe-dot { animation: none; opacity: 0.9; } }
      `}</style>

      {/* Mockup banner */}
      <div className="fixed top-0 inset-x-0 z-30 flex items-center justify-center gap-2 py-1.5 text-xs font-medium text-white" style={{ background: 'var(--color-text-primary)' }}>
        Mockup — not wired to sign-in. Compare with the real page at <a href="/login" className="underline">/login</a>.
      </div>

      {/* ── Left panel — brand canvas ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-[46%] relative flex-col justify-between overflow-hidden mt-7" style={{ background: 'var(--color-sidebar)' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full" style={{ background: 'rgba(35,82,204,0.08)', border: '1px solid rgba(35,82,204,0.12)' }} />
          <div className="absolute -bottom-24 -left-24 w-[360px] h-[360px] rounded-full" style={{ background: 'rgba(35,82,204,0.06)' }} />
          <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        <div className="relative flex flex-col justify-between h-full p-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'var(--color-primary)' }}>
              <span className="text-xs font-extrabold text-white tracking-tighter select-none">CPS</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.85)' }}>
              <span className="breathe-dot" /> DLSU CPS
            </span>
          </div>

          <div className="max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-4" style={{ color: 'rgba(69,117,240,0.8)' }}>
              Counseling &amp; Psychological Services
            </p>
            <h1 style={{ fontFamily: 'var(--font-fraunces)', fontStyle: 'italic', fontWeight: 500, fontSize: '2.75rem', lineHeight: 1.12, letterSpacing: '-0.015em', color: 'white', marginBottom: '1.25rem' }}>
              Your well-being<br />comes first.
            </h1>
            <p className="text-[0.9375rem] leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
              A confidential space to connect with licensed counselors and psychologists — on your own terms, at your own pace.
            </p>

            <div className="mt-8 flex items-start gap-3 px-4 py-3.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <ShieldCheck size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#7BAAF7' }} />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.72)' }}>
                Everything you share is <span className="text-white font-semibold">strictly confidential</span> and protected under RA 10173.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Phone size={13} className="flex-shrink-0" style={{ color: '#F87171' }} />
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
                In crisis?{' '}
                <span className="underline underline-offset-2 font-medium" style={{ color: '#F87171' }}>
                  24/7 Philippine Mental Health Hotline
                </span>
              </span>
            </div>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              © {new Date().getFullYear()} De La Salle University Manila
            </p>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ─────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 relative mt-7" style={{ background: 'var(--color-surface)' }}>
        <button
          onClick={toggleTheme}
          className="absolute top-5 right-5 w-8 h-8 rounded-xl flex items-center justify-center border transition"
          style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>

        <div className="w-full max-w-[420px]">
          <div className="mb-7">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-5 shadow-sm" style={{ background: 'var(--color-primary-surface)' }}>
              <ShieldCheck size={22} style={{ color: 'var(--color-primary)' }} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 500, fontSize: '1.875rem', letterSpacing: '-0.01em', color: 'var(--color-text-primary)' }}>
              Welcome back
            </h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Sign in to your CPS account to continue.
            </p>
          </div>

          <form onSubmit={e => e.preventDefault()} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                University Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@dlsu.edu.ph"
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl outline-none transition-all"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = 'var(--shadow-primary)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Password</label>
                <span className="text-xs font-medium" style={{ color: 'var(--color-primary-text)' }}>Forgot password?</span>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-3 text-sm rounded-xl outline-none transition-all"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = 'var(--shadow-primary)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] mt-1 inline-flex items-center justify-center gap-2"
              style={{ background: 'var(--color-primary)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--color-primary-hover)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--color-primary)')}
            >
              Sign In <ArrowRight size={14} />
            </button>
          </form>

          <div className="flex items-center justify-center gap-1.5 mt-3">
            <ShieldCheck size={12} style={{ color: 'var(--color-primary-text)' }} />
            <span className="text-[11px] font-medium" style={{ color: 'var(--color-primary-text)' }}>Secure, encrypted connection</span>
          </div>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>or continue with</span>
            <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
          </div>

          {/* Static Google button mock — no real GSI script loaded on this preview */}
          <button type="button" className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Sign in with Google
          </button>
          <p className="text-center text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>Use your @dlsu.edu.ph Google account</p>

          <div className="mt-7 pt-5 flex items-center justify-between text-xs" style={{ borderTop: '1px solid var(--color-border)' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>
              New student? <span className="font-semibold" style={{ color: 'var(--color-primary-text)' }}>Create an account</span>
            </p>
            <span className="flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>Need help?</span>
          </div>
        </div>
      </div>
    </div>
  );
}
