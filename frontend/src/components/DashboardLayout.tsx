'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Power, Menu, Bell, X, CheckCheck, ChevronRight, ChevronLeft, PanelLeftClose, Sun, Moon } from 'lucide-react';
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { getMenuIcon } from '@/utils/dashboard-icons';
import { api } from '@/utils/api';
import { EmaFloatingChat } from './EmaFloatingChat';
import { useTheme } from '@/context/ThemeContext';

interface MenuItem {
  label?: string;
  href?: string;
  id?: string;
  icon?: React.ReactNode;
  badge?: number;
  divider?: boolean;
  heading?: string;
}

interface DashboardLayoutProps {
  user: any;
  onLogout: () => void;
  menuItems: MenuItem[];
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  activeSection?: string;
  onMenuClick?: (id: string) => void;
  /** The page renders its own large title, so the top bar shows the date instead. */
  titleInPage?: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  IC:           'Intake Counselor',
  COUNSELOR:    'Counselor',
  PSYCHOLOGIST: 'Psychologist',
  CASE_MANAGER: 'Case Manager',
  STAFF:        'Office Assistant',
  ADMIN:        'Administrator',
  DPO:          'Data Privacy Officer',
  STUDENT:      'Student',
};

const ROLE_COLOR: Record<string, string> = {
  IC:           '#6366F1',
  COUNSELOR:    '#2352CC',
  PSYCHOLOGIST: '#7C3AED',
  CASE_MANAGER: '#0891B2',
  STAFF:        '#059669',
  ADMIN:        '#DC2626',
  DPO:          '#D97706',
  STUDENT:      '#2352CC',
};

export function DashboardLayout({
  user,
  onLogout,
  menuItems,
  children,
  title,
  subtitle,
  activeSection,
  onMenuClick,
  titleInPage = false,
}: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [reminderCount, setReminderCount] = useState(0);
  const [reminders, setReminders]         = useState<any[]>([]);
  const [bellOpen, setBellOpen]           = useState(false);
  const bellRef                           = useRef<HTMLDivElement>(null);
  const pathname                          = usePathname();
  const { theme, toggleTheme }            = useTheme();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Read the saved collapse state before the first paint so a new page never
  // flashes the full-width sidebar; width transitions stay off until then.
  const [sidebarReady, setSidebarReady] = useState(false);
  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem('sidebar-collapsed');
      if (stored !== null) setSidebarCollapsed(stored === 'true');
    } catch {}
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setSidebarReady(true)));
    return () => cancelAnimationFrame(id);
  }, []);

  /* ── Sidebar motion ─────────────────────────────────────────
     The active highlight is one element that glides to the current page.
     The layout remounts on every page, so the last position is kept in
     sessionStorage and the highlight animates from there.            */
  const navListRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ top: number; height: number; animate: boolean } | null>(null);
  const [navTip, setNavTip] = useState<{ label: string; top: number } | null>(null);
  const [navIntro] = useState(() => {
    try { return typeof window !== 'undefined' && !sessionStorage.getItem('nav-intro-played'); } catch { return false; }
  });

  useEffect(() => {
    if (navIntro) { try { sessionStorage.setItem('nav-intro-played', '1'); } catch {} }
  }, [navIntro]);

  useLayoutEffect(() => {
    const el = navListRef.current?.querySelector<HTMLElement>('[data-nav-active="true"]');
    if (!el) { setIndicator(null); return; }
    const next = { top: el.offsetTop, height: el.offsetHeight };
    let prev: number | null = null;
    try { const v = sessionStorage.getItem('nav-indicator-top'); prev = v === null ? null : Number(v); } catch {}
    try { sessionStorage.setItem('nav-indicator-top', String(next.top)); } catch {}

    setIndicator(cur => {
      if (cur) return { ...next, animate: true };              // same mount: glide
      if (prev !== null && prev !== next.top) return { top: prev, height: next.height, animate: false };
      return { ...next, animate: false };
    });
    if (prev !== null && prev !== next.top) {
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setIndicator({ ...next, animate: true })));
      return () => cancelAnimationFrame(id);
    }
  }, [activeSection, pathname, menuItems.length]);

  const showNavTip = (label: string | undefined, target: HTMLElement) => {
    if (!label || mobileOpen || !sidebarCollapsed) return;
    const r = target.getBoundingClientRect();
    setNavTip({ label, top: r.top + r.height / 2 });
  };

  const toggleSidebar = () => {
    setNavTip(null);
    setSidebarCollapsed(v => {
      const next = !v;
      try { localStorage.setItem('sidebar-collapsed', String(next)); } catch {}
      return next;
    });
  };

  const fetchReminders = useCallback((force = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!force) {
      try {
        const last = parseInt(localStorage.getItem('reminders_last_fetch') || '0', 10);
        if (Date.now() - last < 5 * 60 * 1000) return;
      } catch {}
    }
    fetch(api('/api/reminders/'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const list: any[] = Array.isArray(d.reminders) ? d.reminders : Array.isArray(d) ? d : [];
        setReminderCount(list.filter((r: any) => !r.is_read && !r.acknowledged).length);
        setReminders(list.slice(0, 8));
        try { localStorage.setItem('reminders_last_fetch', String(Date.now())); } catch {}
      })
      .catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(api('/api/reminders/mark-all-read'), { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      .then(() => {
        setReminderCount(0);
        setReminders(prev => prev.map((r: any) => ({ ...r, is_read: true, acknowledged: true })));
        try { localStorage.removeItem('reminders_last_fetch'); } catch {}
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchReminders(true);
    localStorage.setItem('last_login_display', new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    }));
    const id = setInterval(() => fetchReminders(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchReminders]);

  useEffect(() => {
    if (!bellOpen) return;
    const handle = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [bellOpen]);

  const firstName = user?.first_name || user?.name?.split(' ')[0] || 'User';
  const lastName  = user?.last_name  || '';
  const fullName  = `${firstName} ${lastName}`.trim();
  const initials  = (firstName[0] || '').toUpperCase() + (lastName[0] || '').toUpperCase();
  const roleLabel = ROLE_LABEL[user?.role] ?? (user?.role || 'User');
  const roleColor = ROLE_COLOR[user?.role] ?? '#2352CC';
  const todayLabel = new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric' });

  /* ── Sidebar nav item renderer ─────────────────────────── */
  const NavItem = ({ item, index }: { item: MenuItem; index: number }) => {
    const isActive = (activeSection && item.id && activeSection === item.id)
      || (!activeSection && item.href && pathname === item.href);
    const icon = item.icon || (item.id ? getMenuIcon(item.id) : null);

    const collapsedDesktop = !mobileOpen && sidebarCollapsed;
    const inner = (
      <div
        data-nav-active={isActive ? 'true' : undefined}
        className={`
          group relative flex items-center gap-3 px-3 h-11 rounded-xl mx-2 cursor-pointer
          transition-[color,background-color,transform] duration-150 active:scale-[0.98]
          ${navIntro ? 'animate-fade-up' : ''}
          ${isActive
            ? 'text-white'
            : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
          }
          ${isActive && !indicator ? 'bg-[rgba(35,82,204,0.28)]' : ''}
        `}
        style={navIntro ? { animationDelay: `${60 + index * 30}ms` } : undefined}
      >
        {/* Icon — nudges toward the label on hover */}
        <span className={`flex-shrink-0 flex items-center justify-center w-[18px] h-[18px] transition-transform duration-200 ease-out ${
          collapsedDesktop ? '' : 'group-hover:translate-x-0.5'
        } ${isActive ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
          {icon}
        </span>

        {/* Label — hidden when sidebar is collapsed on desktop */}
        <span className={`
          flex-1 text-sm font-medium whitespace-nowrap overflow-hidden leading-none
          transition-opacity duration-150
          ${(mobileOpen || !sidebarCollapsed) ? 'opacity-100' : 'opacity-0'}
        `}>
          {item.label}
        </span>

        {/* Badge */}
        {item.badge != null && item.badge > 0 && (
          <span className={`
            flex-shrink-0 text-xs min-w-[18px] h-[18px] px-1.5
            flex items-center justify-center rounded-full font-bold
            transition-opacity duration-150
            ${(mobileOpen || !sidebarCollapsed) ? 'opacity-100' : 'opacity-0'}
            bg-[var(--color-primary)] text-white
          `}>
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </div>
    );

    if (item.id && onMenuClick) {
      return (
        <button
          key={index}
          onClick={() => { onMenuClick(item.id!); setMobileOpen(false); }}
          className="w-full text-left"
          aria-label={collapsedDesktop ? item.label : undefined}
          aria-current={isActive ? 'page' : undefined}
          onMouseEnter={e => showNavTip(item.label, e.currentTarget)}
          onMouseLeave={() => setNavTip(null)}
          onFocus={e => showNavTip(item.label, e.currentTarget)}
          onBlur={() => setNavTip(null)}
        >
          {inner}
        </button>
      );
    }
    return (
      <Link
        key={index}
        href={item.href || '#'}
        className="block"
        aria-label={collapsedDesktop ? item.label : undefined}
        aria-current={isActive ? 'page' : undefined}
        onMouseEnter={e => showNavTip(item.label, e.currentTarget)}
        onMouseLeave={() => setNavTip(null)}
        onFocus={e => showNavTip(item.label, e.currentTarget)}
        onBlur={() => setNavTip(null)}
      >
        {inner}
      </Link>
    );
  };

  /* ── Sidebar content ────────────────────────────────────── */
  const SidebarContent = () => (
    <div className="relative flex flex-col h-full">

      {/* Logo */}
      <div className="relative flex items-center gap-3 px-3 h-16 flex-shrink-0">
        {/* Mark — clicking it expands the sidebar when collapsed */}
        <div
          onClick={!mobileOpen && sidebarCollapsed ? toggleSidebar : undefined}
          className={`flex-shrink-0 w-9 h-9 rounded-xl bg-[var(--color-primary)] flex items-center justify-center select-none transition-opacity ${!mobileOpen && sidebarCollapsed ? 'cursor-pointer hover:opacity-80' : ''}`}
        >
          <span className="text-[0.625rem] font-extrabold text-white tracking-tighter">CPS</span>
        </div>

        {/* Wordmark — removed from layout flow when collapsed so toggle button stays visible */}
        <div className={`
          overflow-hidden transition-all duration-200 whitespace-nowrap
          ${(mobileOpen || !sidebarCollapsed) ? 'max-w-[200px] opacity-100 flex-1 min-w-0' : 'max-w-0 opacity-0 flex-none w-0'}
        `}>
          <p className="text-sm font-bold text-white leading-tight">DLSU CPS</p>
          <p className="text-[0.6875rem] text-white/50 leading-tight mt-0.5">{roleLabel}</p>
        </div>

        {/* Desktop collapse toggle */}
        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:flex ml-auto flex-shrink-0 items-center justify-center w-7 h-7 rounded-lg text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
          className="lg:hidden flex-shrink-0 p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Divider */}
      <div className="relative mx-4 h-px bg-white/[0.08] mb-1 flex-shrink-0" />

      {/* Nav */}
      <nav className="relative flex-1 overflow-y-auto overflow-x-hidden py-1" aria-label="Main">
        <div ref={navListRef} className="relative space-y-0.5">
          {indicator && (
            <span
              aria-hidden="true"
              className="absolute left-2 right-2 top-0 rounded-xl pointer-events-none bg-[rgba(35,82,204,0.28)]"
              style={{
                height: indicator.height,
                transform: `translateY(${indicator.top}px)`,
                transition: indicator.animate ? 'transform 340ms cubic-bezier(0.34, 1.25, 0.64, 1)' : 'none',
              }}
            >
              <span className="absolute -left-2 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-[#7BAAF7]" />
            </span>
          )}
          {menuItems.map((item, i) => {
            if (item.heading) {
              return (mobileOpen || !sidebarCollapsed)
                ? <p key={i} className="px-5 pt-4 pb-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-white/35 select-none">{item.heading}</p>
                : <div key={i} className="mx-4 my-3 h-px bg-white/[0.08]" aria-hidden="true" />;
            }
            if (item.divider) return <div key={i} className="mx-4 my-1.5 h-px bg-white/[0.06]" />;
            return <div key={i}>{NavItem({ item, index: i })}</div>;
          })}
        </div>
      </nav>

      {/* Crisis line — students only, always one glance away */}
      {user?.role === 'STUDENT' && (mobileOpen || !sidebarCollapsed) && (
        <div className="relative mx-3 mb-3 rounded-xl p-3.5 flex-shrink-0" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}>
          <p className="text-xs font-semibold" style={{ color: '#FCA5A5' }}>Need help right now?</p>
          <p className="text-[0.6875rem] mt-1 leading-relaxed text-white/70">
            NCMH <a href="tel:1553" className="font-semibold underline underline-offset-2 text-white">1553</a> · open 24/7
          </p>
        </div>
      )}

      {/* Account card — who is signed in, theme and sign-out in one place */}
      <div className="relative flex-shrink-0 px-3 pb-3 pt-1">
        <div
          className={`rounded-xl border border-white/[0.08] bg-white/[0.04] ${(mobileOpen || !sidebarCollapsed) ? 'flex items-center gap-2.5 p-2.5' : 'flex flex-col items-center gap-1.5 py-2'}`}
        >
          <div
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white/10"
            style={{ background: roleColor }}
            title={`${fullName} · ${roleLabel}`}
          >
            {initials || 'U'}
          </div>
          {(mobileOpen || !sidebarCollapsed) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-snug line-clamp-2 break-words" title={fullName}>{fullName}</p>
              <p className="text-xs text-white/50 truncate leading-tight mt-0.5">{roleLabel}</p>
            </div>
          )}
          <button
            onClick={onLogout}
            aria-label="Sign out"
            title="Sign out"
            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white/55 hover:text-[#FCA5A5] hover:bg-[rgba(239,68,68,0.12)] transition-colors"
          >
            <Power size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>

      {/* Skip-to-content — visible only on focus (keyboard users) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[9999] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:rounded-xl focus:outline-none"
        style={{ background: 'var(--color-primary)', color: '#fff' }}
      >
        Skip to main content
      </a>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden backdrop-blur-sm animate-fade-in"
          style={{ background: 'rgba(7,11,20,0.65)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className={`
        fixed left-0 top-0 h-screen z-30 flex-col flex
        overflow-hidden
        ${sidebarReady ? 'transition-[width,transform] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]' : ''}
        border-r border-white/[0.06]
        w-72
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-60'}
      `}
      style={{ background: 'var(--color-sidebar)' }}
      >
        {SidebarContent()}
      </aside>

      {/* Collapsed-sidebar label */}
      {navTip && (
        <div
          role="tooltip"
          className="hidden lg:block fixed z-40 left-[4.5rem] -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap pointer-events-none animate-fade-in"
          style={{ top: navTip.top, background: 'var(--color-sidebar)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'var(--shadow-card-lg)' }}
        >
          {navTip.label}
        </div>
      )}

      {/* ── Main area ────────────────────────────────────── */}
      <div style={{ background: 'radial-gradient(1200px 420px at 15% -120px, color-mix(in srgb, var(--color-primary) 16%, transparent), transparent 72%), var(--color-bg)' }} className={`flex-1 flex flex-col min-h-screen ${sidebarReady ? 'transition-[margin] duration-200' : ''} ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>

        {/* Top header */}
        <header
          className="sticky top-0 z-20 h-16 flex items-center gap-3 px-4 lg:px-8 border-b"
          style={{
            background: 'color-mix(in srgb, var(--color-bg) 72%, transparent)',
            borderColor: 'color-mix(in srgb, var(--color-border) 70%, transparent)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-border)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Menu size={18} />
          </button>

          {/* Page title — desktop */}
          <div className="hidden lg:block flex-1 min-w-0">
            {titleInPage ? (
              <p className="type-label truncate" style={{ color: 'var(--color-text-muted)' }}>{todayLabel}</p>
            ) : (
              <>
                <p className="text-[0.9375rem] font-semibold leading-tight truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {title}
                </p>
                <p className="text-xs leading-tight mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                  {subtitle || todayLabel}
                </p>
              </>
            )}
          </div>

          {/* Page title — mobile (centered) */}
          <div className="lg:hidden flex-1 text-center">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto lg:ml-0">

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              className="flex items-center justify-center w-10 h-10 rounded-xl border transition-colors duration-150 hover:bg-[var(--color-bg)] hover:border-[var(--color-border-strong)]"
              style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Notification bell */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellOpen(v => { if (!v) setReminderCount(0); return !v; })}
                aria-label={reminderCount > 0 ? `Notifications (${reminderCount} new)` : 'Notifications'}
                className="relative flex items-center justify-center w-10 h-10 rounded-xl border transition-colors duration-150 hover:bg-[var(--color-bg)] hover:border-[var(--color-border-strong)]"
                style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
              >
                <Bell size={17} />
                {reminderCount > 0 && (
                  <span
                    className="absolute top-2 right-2.5 w-2 h-2 rounded-full ring-2"
                    style={{ background: 'var(--color-danger)', '--tw-ring-color': 'var(--color-surface)' } as React.CSSProperties}
                  />
                )}
              </button>

              {/* Dropdown */}
              {bellOpen && (
                <div
                  role="dialog"
                  aria-label="Notifications"
                  className="absolute right-0 top-12 w-80 rounded-2xl overflow-hidden z-50 animate-scale-in-fast"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-card-lg)',
                  }}
                >
                  {/* Header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 border-b"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                      Notifications
                    </p>
                    {reminderCount > 0 ? (
                      <button
                        onClick={markAllRead}
                        className="text-xs font-medium transition-opacity hover:opacity-70"
                        style={{ color: 'var(--color-primary-text)' }}
                      >
                        Mark all read
                      </button>
                    ) : null}
                  </div>

                  {/* Items */}
                  {reminders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <CheckCheck size={20} style={{ color: 'var(--color-border-strong)' }} />
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>All caught up</p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {reminders.map((r: any, i: number) => {
                        const isUnread = !r.is_read && !r.acknowledged;
                        return (
                          <div
                            key={i}
                            className="px-4 py-3 border-b last:border-0 transition-colors duration-100"
                            style={{
                              borderColor: 'var(--color-border)',
                              background: isUnread ? 'var(--color-primary-muted)' : 'transparent',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                            onMouseLeave={e => (e.currentTarget.style.background = isUnread ? 'var(--color-primary-muted)' : 'transparent')}
                          >
                            <p
                              className="text-xs leading-snug"
                              style={{
                                color: isUnread ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                                fontWeight: isUnread ? 600 : 400,
                              }}
                            >
                              {r.message || r.title || 'Notification'}
                            </p>
                            {r.created_at && (
                              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                {new Date(r.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila',
                                  month: 'short', day: 'numeric',
                                  hour: 'numeric', minute: '2-digit',
                                })}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="px-4 py-2.5 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <Link
                      href="/reminders"
                      onClick={() => setBellOpen(false)}
                      className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
                      style={{ color: 'var(--color-primary-text)' }}
                    >
                      View all notifications
                      <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User avatar — desktop only */}
            <div
              className="hidden lg:flex items-center justify-center w-10 h-10 rounded-full text-white text-xs font-bold ring-1 ring-white/20 cursor-default select-none"
              style={{ background: roleColor }}
              title={`${fullName} · ${roleLabel}`}
            >
              {initials || 'U'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className={`flex-1 px-4 pt-6 lg:px-8 lg:pt-8 ${user?.role === 'STUDENT' ? 'pb-28' : 'pb-6 lg:pb-8'}`} tabIndex={-1}>
          <div className="max-w-[75rem] mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {user?.role === 'STUDENT' && <EmaFloatingChat />}
    </div>
  );
}
