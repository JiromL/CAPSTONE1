'use client';

import { useState } from 'react';
import {
  Sun, Moon, Search, Mail, Lock, ChevronDown, Check, X, Loader2,
  Plus, Download, ArrowRight, ShieldCheck, Activity, AlertTriangle,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { PermaBadge } from '@/components/PendingStudentsWithPerma';

// ─────────────────────────────────────────────────────────────
// Shared layout primitives
// ─────────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="type-overline flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
      <span className="breathe-dot" aria-hidden="true" />
      {children}
    </p>
  );
}

function Section({
  eyebrow, title, note, children,
}: { eyebrow: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="py-16 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <div className="max-w-[1120px] mx-auto px-6">
        <div className="mb-10 max-w-2xl">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="mt-2" style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.75rem', fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--color-text-primary)' }}>
            {title}
          </h2>
          {note && <p className="type-body mt-2" style={{ color: 'var(--color-text-secondary)' }}>{note}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

function Swatch({ name, varName, hex }: { name: string; varName: string; hex: string }) {
  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
      <div className="h-16" style={{ background: `var(${varName})` }} />
      <div className="p-3" style={{ background: 'var(--color-surface)' }}>
        <p className="type-label" style={{ color: 'var(--color-text-primary)' }}>{name}</p>
        <p className="type-caption mt-0.5 font-mono" style={{ color: 'var(--color-text-muted)' }}>{varName}</p>
        <p className="type-caption font-mono" style={{ color: 'var(--color-text-muted)' }}>{hex}</p>
      </div>
    </div>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 mt-8 text-sm border flex gap-3"
      style={{ background: 'var(--color-warning-surface)', borderColor: 'var(--color-warning)', color: 'var(--color-warning-text)' }}>
      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function DesignSystemPage() {
  const { theme, toggleTheme } = useTheme();
  const [textVal, setTextVal] = useState('');

  return (
    <div style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)', minHeight: '100vh' }}>
      <style>{`
        @keyframes cps-breathe {
          0%, 100% { transform: scale(1);    opacity: 0.55; }
          50%      { transform: scale(1.45); opacity: 1;    }
        }
        .breathe-dot {
          width: 6px; height: 6px; border-radius: 999px; flex-shrink: 0;
          background: var(--color-primary);
          animation: cps-breathe 3.6s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .breathe-dot { animation: none; opacity: 0.9; }
        }
        .ds-hover-lift { transition: transform 180ms ease, box-shadow 180ms ease; }
        .ds-hover-lift:hover { transform: translateY(-2px); box-shadow: var(--shadow-card-lg); }
      `}</style>

      {/* Top bar */}
      <div className="sticky top-0 z-20 backdrop-blur border-b" style={{ borderColor: 'var(--color-border)', background: 'color-mix(in srgb, var(--color-bg) 85%, transparent)' }}>
        <div className="max-w-[1120px] mx-auto px-6 h-14 flex items-center justify-between">
          <span className="type-label" style={{ color: 'var(--color-text-secondary)' }}>DLSU · CPS Design System</span>
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center border transition"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>

      {/* ── Hero ───────────────────────────────────────────── */}
      <header className="max-w-[1120px] mx-auto px-6 pt-20 pb-16">
        <Eyebrow>DLSU · CPS Design System</Eyebrow>
        <h1 className="mt-4 max-w-3xl" style={{ fontFamily: 'var(--font-fraunces)', fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(2.25rem, 5vw, 3.75rem)', lineHeight: 1.08, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
          Steady presence,<br />clinical clarity.
        </h1>
        <p className="type-body mt-6 max-w-lg" style={{ color: 'var(--color-text-secondary)' }}>
          A visual language for a counseling platform that clinicians trust under pressure
          and students find welcoming on their hardest day. Built on the color system already
          in production — refined typography, componentry, and status vocabulary layered on top.
        </p>
        <div className="flex items-center gap-2 mt-8 flex-wrap">
          {(['Excelling', 'Thriving', 'Surviving', 'Struggling', 'In Crisis'] as const).map(l => (
            <PermaBadge key={l} label={l} />
          ))}
        </div>
      </header>

      {/* ── Color ──────────────────────────────────────────── */}
      <Section eyebrow="Color" title="The palette in production" note="Every value below is unchanged from globals.css — this section organizes what already exists, it doesn't propose new hex values.">
        <p className="type-label mb-3" style={{ color: 'var(--color-text-muted)' }}>Brand</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Swatch name="Primary" varName="--color-primary" hex="#2352CC" />
          <Swatch name="Primary hover" varName="--color-primary-hover" hex="#1A3DB0" />
          <Swatch name="Primary surface" varName="--color-primary-surface" hex="#EBF0FF" />
          <Swatch name="Sidebar" varName="--color-sidebar" hex="#0F1729" />
        </div>

        <p className="type-label mb-3 mt-8" style={{ color: 'var(--color-text-muted)' }}>Neutrals</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Swatch name="Background" varName="--color-bg" hex="#F5F7FB" />
          <Swatch name="Surface" varName="--color-surface" hex="#FFFFFF" />
          <Swatch name="Border" varName="--color-border" hex="#E4E7F0" />
          <Swatch name="Border strong" varName="--color-border-strong" hex="#CBD0DC" />
        </div>

        <p className="type-label mb-3 mt-8" style={{ color: 'var(--color-text-muted)' }}>Semantic</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Swatch name="Success" varName="--color-success" hex="#059669" />
          <Swatch name="Warning" varName="--color-warning" hex="#D97706" />
          <Swatch name="Danger" varName="--color-danger" hex="#DC2626" />
          <Swatch name="Info" varName="--color-info" hex="#2563EB" />
        </div>

        <p className="type-label mb-3 mt-8" style={{ color: 'var(--color-text-muted)' }}>Clinical risk codes</p>
        <div className="flex flex-wrap gap-2">
          <span className="badge" style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
            <ShieldCheck size={12} /> Code Green — Low Risk
          </span>
          <span className="badge" style={{ background: '#FEFCE8', color: '#A16207', border: '1px solid #FDE047' }}>
            <Activity size={12} /> Code Yellow — Moderate Risk
          </span>
          <span className="badge" style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger-hover)', border: '1px solid #FECACA' }}>
            <AlertTriangle size={12} /> Code Red — High Risk
          </span>
        </div>

        <Callout>
          <strong>Found while building this:</strong> risk-code colors are currently redefined per page —
          <code className="font-mono"> ic/intake/conduct</code>, <code className="font-mono">ic/intake/pending</code>, and{' '}
          <code className="font-mono">counselor/session</code> each hard-code slightly different hex values
          for the same three codes. Worth consolidating into one shared constant so Code Yellow always
          means the exact same color everywhere in the app.
        </Callout>
      </Section>

      {/* ── Typography ─────────────────────────────────────── */}
      <Section eyebrow="Typography" title="Two voices, one hierarchy" note="Fraunces carries moments that need warmth — hero headlines, empty states, milestone messages. Plus Jakarta Sans, already used everywhere, stays the workhorse for every interface and data surface.">
        <div className="rounded-2xl p-8 border mb-8" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p className="type-caption mb-4" style={{ color: 'var(--color-text-muted)' }}>Display — Fraunces, italic, restrained use only</p>
          <p style={{ fontFamily: 'var(--font-fraunces)', fontStyle: 'italic', fontWeight: 500, fontSize: '2.5rem', lineHeight: 1.15, letterSpacing: '-0.015em' }}>
            You&apos;re not alone in this.
          </p>
          <p className="type-caption mt-4" style={{ color: 'var(--color-text-muted)' }}>Display — Fraunces, upright, section titles</p>
          <p style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 500, fontSize: '1.75rem', letterSpacing: '-0.01em' }}>
            Your wellbeing, tracked with care
          </p>
        </div>

        <div className="rounded-2xl border divide-y" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {[
            { cls: 'type-page-title', label: 'Page title', spec: '20px / 700 / 28px' },
            { cls: 'type-section-title', label: 'Section title', spec: '16px / 600 / 24px' },
            { cls: 'type-card-title', label: 'Card title', spec: '15px / 600 / 22px' },
            { cls: 'type-body', label: 'Body', spec: '15px / 400 / 24px' },
            { cls: 'type-body-sm', label: 'Body small', spec: '14px / 400 / 22px' },
            { cls: 'type-label', label: 'Label', spec: '13px / 500 / 20px' },
            { cls: 'type-caption', label: 'Caption', spec: '12px / 500 / 18px' },
            { cls: 'type-overline', label: 'Overline', spec: '11px / 700 / uppercase' },
          ].map(row => (
            <div key={row.cls} className="flex items-center justify-between gap-6 px-6 py-4" style={{ borderColor: 'var(--color-border)' }}>
              <span className={row.cls} style={{ color: 'var(--color-text-primary)' }}>
                {row.label === 'Overline' ? 'Case status' : 'Riley Tan checked in today'}
              </span>
              <span className="type-caption font-mono flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{row.cls} · {row.spec}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Buttons ────────────────────────────────────────── */}
      <Section eyebrow="Components" title="Buttons" note="Primary and ghost already ship in globals.css. Outline and destructive variants follow the same token pattern for consistency.">
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary"><Plus size={14} /> Book appointment</button>
          <button className="btn-ghost"><Download size={14} /> Export report</button>
          <button className="inline-flex items-center gap-1.5 rounded-[0.625rem] font-semibold text-[0.8125rem] px-4 py-2 border-2 transition"
            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', background: 'transparent' }}>
            View case <ArrowRight size={14} />
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-[0.625rem] font-semibold text-[0.8125rem] px-4 py-2 text-white transition"
            style={{ background: 'var(--color-danger)' }}>
            <X size={14} /> Cancel session
          </button>
          <button disabled className="btn-primary opacity-50 cursor-not-allowed">
            <Loader2 size={14} className="animate-spin" /> Saving…
          </button>
        </div>
      </Section>

      {/* ── Form inputs ────────────────────────────────────── */}
      <Section eyebrow="Components" title="Form inputs">
        <div className="grid sm:grid-cols-2 gap-5 max-w-2xl">
          <div>
            <label className="type-label block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Student email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input className="input pl-9" placeholder="you@dlsu.edu.ph" value={textVal} onChange={e => setTextVal(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="type-label block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input type="password" className="input pl-9" placeholder="••••••••" />
            </div>
          </div>
          <div>
            <label className="type-label block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Case status</label>
            <div className="relative">
              <select className="input appearance-none pr-9">
                <option>Active</option>
                <option>Pending termination</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
            </div>
          </div>
          <div>
            <label className="type-label block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Required field, empty</label>
            <input className="input" placeholder="This field can't be blank"
              style={{ borderColor: 'var(--color-danger)', boxShadow: '0 0 0 3px var(--color-danger-surface)' }} />
            <p className="type-caption mt-1.5" style={{ color: 'var(--color-danger)' }}>Enter a reason before submitting.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="type-label block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Session note</label>
            <textarea className="input" rows={3} placeholder="Subjective, objective, assessment, plan…" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-primary)' }}>
              <Check size={11} color="white" strokeWidth={3} />
            </span>
            <span className="type-body-sm" style={{ color: 'var(--color-text-primary)' }}>Consent captured</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative inline-flex w-9 h-5 rounded-full flex-shrink-0" style={{ background: 'var(--color-primary)' }}>
              <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white" />
            </span>
            <span className="type-body-sm" style={{ color: 'var(--color-text-primary)' }}>Notify by email</span>
          </div>
        </div>
      </Section>

      {/* ── Cards ──────────────────────────────────────────── */}
      <Section eyebrow="Components" title="Cards">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="type-card-title">Today&apos;s sessions</p>
            <p className="type-caption mt-1" style={{ color: 'var(--color-text-muted)' }}>Standard resting card</p>
          </div>
          <div className="card p-5 ds-hover-lift cursor-pointer">
            <p className="type-card-title">Riley Tan — Case #0142</p>
            <p className="type-caption mt-1" style={{ color: 'var(--color-text-muted)' }}>Interactive — hover to lift</p>
          </div>
          <div className="card p-5" style={{ background: 'var(--color-primary-surface)', borderColor: 'transparent' }}>
            <p className="type-card-title" style={{ color: 'var(--color-primary-text)' }}>7 check-ins this week</p>
            <p className="type-caption mt-1" style={{ color: 'var(--color-primary-text)', opacity: 0.75 }}>Accent / stat card</p>
          </div>
        </div>
      </Section>

      {/* ── Status badges ──────────────────────────────────── */}
      <Section eyebrow="Components" title="Status vocabulary" note="The real statuses used across appointments and cases, given one consistent treatment.">
        <p className="type-label mb-3" style={{ color: 'var(--color-text-muted)' }}>Case status</p>
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { label: 'NEW', bg: 'var(--color-info-surface)', color: 'var(--color-info-text)' },
            { label: 'INTAKE_SCHEDULED', bg: 'var(--color-primary-surface)', color: 'var(--color-primary-text)' },
            { label: 'ACTIVE', bg: 'var(--color-success-surface)', color: 'var(--color-success-text)' },
            { label: 'PENDING_TERMINATION', bg: 'var(--color-warning-surface)', color: 'var(--color-warning-text)' },
            { label: 'CLOSED', bg: 'var(--color-bg)', color: 'var(--color-text-muted)' },
            { label: 'CANCELLED', bg: 'var(--color-danger-surface)', color: 'var(--color-danger-text)' },
          ].map(s => (
            <span key={s.label} className="badge font-mono" style={{ background: s.bg, color: s.color }}>{s.label}</span>
          ))}
        </div>

        <p className="type-label mb-3" style={{ color: 'var(--color-text-muted)' }}>Appointment status</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'REQUESTED', bg: 'var(--color-bg)', color: 'var(--color-text-muted)' },
            { label: 'PENDING_APPROVAL', bg: 'var(--color-warning-surface)', color: 'var(--color-warning-text)' },
            { label: 'CONFIRMED', bg: 'var(--color-info-surface)', color: 'var(--color-info-text)' },
            { label: 'COMPLETED', bg: 'var(--color-success-surface)', color: 'var(--color-success-text)' },
            { label: 'NO_SHOW', bg: 'var(--color-danger-surface)', color: 'var(--color-danger-text)' },
            { label: 'CANCELLED', bg: 'var(--color-bg)', color: 'var(--color-text-muted)' },
          ].map(s => (
            <span key={s.label} className="badge font-mono" style={{ background: s.bg, color: s.color }}>{s.label}</span>
          ))}
        </div>
      </Section>

      {/* ── Elevation ──────────────────────────────────────── */}
      <Section eyebrow="Foundations" title="Elevation">
        <div className="grid sm:grid-cols-4 gap-5">
          {[
            { name: 'card', v: 'var(--shadow-card)' },
            { name: 'card-md', v: 'var(--shadow-card-md)' },
            { name: 'card-lg', v: 'var(--shadow-card-lg)' },
            { name: 'modal', v: 'var(--shadow-modal)' },
          ].map(s => (
            <div key={s.name} className="rounded-xl p-5 h-20 flex items-end" style={{ background: 'var(--color-surface)', boxShadow: s.v }}>
              <span className="type-caption font-mono" style={{ color: 'var(--color-text-muted)' }}>--shadow-{s.name}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Motion ─────────────────────────────────────────── */}
      <Section eyebrow="Foundations" title="Motion" note="The breathing dot used throughout this page is the one signature motion element — a literal steady-presence indicator, not decoration. Everything else favors quiet, fast (150–250ms) transitions.">
        <div className="flex items-center gap-10 flex-wrap">
          <div className="flex flex-col items-center gap-3">
            <span className="breathe-dot" style={{ width: 14, height: 14 }} />
            <span className="type-caption" style={{ color: 'var(--color-text-muted)' }}>breathe · 3.6s</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="skeleton w-24 h-8" />
            <span className="type-caption" style={{ color: 'var(--color-text-muted)' }}>skeleton · shimmer</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="card px-4 py-2 animate-fade-up"><span className="type-caption">fade-up</span></div>
            <span className="type-caption" style={{ color: 'var(--color-text-muted)' }}>animate-fade-up</span>
          </div>
        </div>
      </Section>

      <footer className="py-12 text-center">
        <p className="type-caption" style={{ color: 'var(--color-text-muted)' }}>
          Review-only page at /design — not linked from product navigation.
        </p>
      </footer>
    </div>
  );
}
