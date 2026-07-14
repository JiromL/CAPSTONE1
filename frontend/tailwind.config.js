/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          'var(--font-jakarta)',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      fontSize: {
        xs:   ['0.75rem',    { lineHeight: '1rem' }],
        sm:   ['0.8125rem',  { lineHeight: '1.25rem' }],
        base: ['0.9375rem',  { lineHeight: '1.5rem' }],
        lg:   ['1rem',       { lineHeight: '1.5rem' }],
        xl:   ['1.125rem',   { lineHeight: '1.75rem' }],
        '2xl':['1.25rem',    { lineHeight: '1.75rem' }],
        '3xl':['1.5rem',     { lineHeight: '2rem' }],
        '4xl':['1.875rem',   { lineHeight: '2.25rem' }],
        '5xl':['2.25rem',    { lineHeight: '2.5rem' }],
      },
      colors: {
        // Design token aliases — all reference CSS vars so dark mode is automatic
        primary: {
          DEFAULT:  'var(--color-primary)',
          hover:    'var(--color-primary-hover)',
          surface:  'var(--color-primary-surface)',
          text:     'var(--color-primary-text)',
        },
        cps: {
          bg:       'var(--color-bg)',
          surface:  'var(--color-surface)',
          sidebar:  'var(--color-sidebar)',
          border:   'var(--color-border)',
        },
      },
      boxShadow: {
        'card':      '0 1px 3px 0 rgba(13,21,38,0.06), 0 1px 2px -1px rgba(13,21,38,0.04)',
        'card-md':   '0 4px 6px -1px rgba(13,21,38,0.07), 0 2px 4px -2px rgba(13,21,38,0.05)',
        'card-lg':   '0 10px 15px -3px rgba(13,21,38,0.08), 0 4px 6px -4px rgba(13,21,38,0.05)',
        'primary':   '0 0 0 3px rgba(35,82,204,0.15)',
        'primary-md':'0 4px 14px 0 rgba(35,82,204,0.25)',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'scale-in-fast': {
          '0%':   { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-left': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-right': {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-up': {
          '0%':   { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'bounce-in': {
          '0%':   { opacity: '0', transform: 'scale(0.3)' },
          '50%':  { opacity: '1', transform: 'scale(1.05)' },
          '70%':  { transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up':       'fade-up 0.25s ease-out both',
        'fade-in':       'fade-in 0.2s ease-out both',
        'scale-in':      'scale-in 0.2s ease-out both',
        'scale-in-fast': 'scale-in-fast 0.15s ease-out both',
        'slide-in-left': 'slide-in-left 0.25s ease-out',
        'slide-in-right':'slide-in-right 0.25s ease-out',
        'slide-up':      'slide-up 0.3s ease-out',
        'pulse-dot':     'pulse-dot 1.5s ease-in-out infinite',
        'shimmer':       'shimmer 2s linear infinite',
        'bounce-in':     'bounce-in 0.4s ease-out both',
      },
      transitionProperty: {
        'width':         'width',
        'sidebar':       'width, transform',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
