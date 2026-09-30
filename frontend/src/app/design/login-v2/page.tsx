'use client';

import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, HeartHandshake, Phone, ArrowRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

/**
 * MOCKUP ONLY — v2, softer "mental health" direction. Same color tokens
 * as production, different shape language + motion. Not wired to auth.
 */
export default function LoginMockupV2() {
  const { theme, toggleTheme } = useTheme();
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
      <style>{`
        @keyframes cps-breathe-soft {
          0%, 100% { transform: scale(1);    opacity: 0.5; }
          50%      { transform: scale(1.6);  opacity: 0.9; }
        }
        @keyframes cps-blob-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-3%, 4%) scale(1.06); }
        }
        .breathe-dot { width: 7px; height: 7px; border-radius: 999px; flex-shrink: 0; background: #7BAAF7; animation: cps-breathe-soft 4.2s ease-in-out infinite; }
        .blob { animation: cps-blob-drift 14s ease-in-out infinite; }
        .pill-btn { transition: transform 220ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 220ms ease; }
        .pill-btn:hover { transform: translateY(-1px) scale(1.015); }
        .pill-btn:active { transform: scale(0.97); }
        .soft-input { transition: border-color 200ms ease, box-shadow 200ms ease, background 200ms ease; }
        @media (prefers-reduced-motion: reduce) { .breathe-dot, .blob { animation: none; } }
      `}</style>

      <div className="fixed top-0 inset-x-0 z-30 flex items-center justify-center gap-2 py-1.5 text-xs font-medium text-white" style={{ background: 'var(--color-text-primary)' }}>
        Mockup v2 — softer direction, same colors. See also <a href="/design/login" className="underline">v1</a> and the real page at <a href="/login" className="underline">/login</a>.
      </div>

      {/* ── Left panel — organic calm canvas ──────────────────── */}
      <div className="hidden lg:flex lg:w-[46%] relative flex-col justify-between overflow-hidden mt-7" style={{ background: 'var(--color-sidebar)' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="blob absolute -top-20 -right-16 w-[420px] h-[420px] rounded-[45%_55%_60%_40%/50%_45%_55%_50%]" style={{ background: 'radial-gradient(circle, rgba(35,82,204,0.16) 0%, transparent 72%)', filter: 'blur(6px)' }} />
          <div className="blob absolute bottom-10 -left-20 w-[340px] h-[340px] rounded-[55%_45%_40%_60%/45%_55%_50%_50%]" style={{ background: 'radial-gradient(circle, rgba(5,150,105,0.12) 0%, transparent 72%)', filter: 'blur(6px)', animationDelay: '3s' }} />
          <div className="blob absolute top-1/3 left-1/4 w-[220px] h-[220px] rounded-[50%_50%_65%_35%/55%_45%_55%_45%]" style={{ background: 'radial-gradient(circle, rgba(69,117,240,0.1) 0%, transparent 72%)', filter: 'blur(4px)', animationDelay: '6s' }} />
        </div>

        <div className="relative flex flex-col justify-between h-full p-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[40%_60%_60%_40%/50%_50%_50%_50%] flex items-center justify-center shadow-lg" style={{ background: 'var(--color-primary)' }}>
              <span className="text-xs font-extrabold text-white tracking-tighter select-none">CPS</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.85)' }}>
              <span className="breathe-dot" /> DLSU CPS
            </span>
          </div>

          <div className="max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-5" style={{ color: 'rgba(69,117,240,0.8)' }}>
              Counseling &amp; Psychological Services
            </p>
            <h1 style={{ fontFamily: 'var(--font-fraunces)', fontStyle: 'italic', fontWeight: 500, fontSize: '2.75rem', lineHeight: 1.22, letterSpacing: '-0.01em', color: 'white', marginBottom: '1.5rem' }}>
              Take a breath.<br />You&apos;re in good hands.
            </h1>
            <p className="text-[0.9375rem] leading-[1.75]" style={{ color: 'rgba(255,255,255,0.72)' }}>
              A confidential, unhurried space to connect with licensed counselors and psychologists — at whatever pace feels right for you.
            </p>

            <div className="mt-9 flex items-start gap-3 px-5 py-4 rounded-[24px]" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <HeartHandshake size={17} className="mt-0.5 flex-shrink-0" style={{ color: '#7BAAF7' }} />
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
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
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>© {new Date().getFullYear()} De La Salle University Manila</p>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ─────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 relative mt-7" style={{ background: 'var(--color-surface)' }}>
        <button onClick={toggleTheme} className="pill-btn absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center border" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
          {theme === 'dark' ? '☀' : '☾'}
        </button>

        <div className="w-full max-w-[420px]">
          <div className="mb-8">
            <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-[35%_65%_65%_35%/55%_45%_55%_45%] mb-6" style={{ background: 'var(--color-primary-surface)' }}>
              <span className="absolute inset-0 rounded-[35%_65%_65%_35%/55%_45%_55%_45%]" style={{ background: 'var(--color-primary)', opacity: 0.12, animation: 'cps-breathe-soft 4.2s ease-in-out infinite' }} />
              <HeartHandshake size={24} style={{ color: 'var(--color-primary)' }} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 500, fontSize: '1.875rem', letterSpacing: '-0.01em', color: 'var(--color-text-primary)' }}>
              Welcome back
            </h1>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Sign in to your CPS account to continue.
            </p>
          </div>

          <form onSubmit={e => e.preventDefault()} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>University Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                <input
                  type="email" placeholder="you@dlsu.edu.ph"
                  className="soft-input w-full pl-11 pr-4 py-3.5 text-sm rounded-full outline-none"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = 'var(--shadow-primary)'; e.currentTarget.style.background = 'var(--color-surface)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'var(--color-bg)'; }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Password</label>
                <span className="text-xs font-medium" style={{ color: 'var(--color-primary-text)' }}>Forgot password?</span>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                <input
                  type={showPw ? 'text' : 'password'} placeholder="Enter your password"
                  className="soft-input w-full pl-11 pr-11 py-3.5 text-sm rounded-full outline-none"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = 'var(--shadow-primary)'; e.currentTarget.style.background = 'var(--color-surface)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'var(--color-bg)'; }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="pill-btn w-full py-3.5 rounded-full text-sm font-semibold text-white mt-1 inline-flex items-center justify-center gap-2"
              style={{ background: 'var(--color-primary)', boxShadow: 'var(--shadow-card-md)' }}
            >
              Sign In <ArrowRight size={14} />
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>or continue with</span>
            <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
          </div>

          <button type="button" className="pill-btn w-full flex items-center justify-center gap-2 py-3 rounded-full text-sm font-medium border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Sign in with Google
          </button>
          <p className="text-center text-[11px] mt-3" style={{ color: 'var(--color-text-muted)' }}>Use your @dlsu.edu.ph Google account</p>

          <div className="mt-8 pt-6 flex items-center justify-between text-xs" style={{ borderTop: '1px solid var(--color-border)' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>
              New student? <span className="font-semibold" style={{ color: 'var(--color-primary-text)' }}>Create an account</span>
            </p>
            <span style={{ color: 'var(--color-text-muted)' }}>Need help?</span>
          </div>
        </div>
      </div>
    </div>
  );
}
