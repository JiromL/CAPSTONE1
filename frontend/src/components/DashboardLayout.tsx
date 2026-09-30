'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Power, Menu, Bell, X, CheckCheck, ChevronRight, ChevronLeft, PanelLeftClose } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
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

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sidebar-collapsed');
      if (stored !== null) setSidebarCollapsed(stored === 'true');
    } catch {}
  }, []);

  const toggleSidebar = () => {
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

    const inner = (
      <div className={`
        relative flex items-center gap-3 px-3 h-11 rounded-xl mx-2 cursor-pointer
        transition-colors duration-150
        ${isActive
          ? 'bg-[rgba(35,82,204,0.28)] text-white'
          : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
        }
      `}>
        {/* Active indicator rail */}
        {isActive && (
          <span className="absolute -left-2 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-[#7BAAF7]" />
        )}

        {/* Icon */}
        <span className={`flex-shrink-0 flex items-center justify-center w-[18px] h-[18px] ${
          isActive ? 'text-white' : 'text-white/60'
        }`}>
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
        <button key={index} onClick={() => { onMenuClick(item.id!); setMobileOpen(false); }} className="w-full text-left">
          {inner}
        </button>
      );
    }
    return (
      <Link key={index} href={item.href || '#'} className="block">
        {inner}
      </Link>
    );
  };

  /* ── Sidebar content ────────────────────────────────────── */
  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className="flex items-center gap-3 px-3 h-16 flex-shrink-0">
        {/* Mark — clicking it expands the sidebar when collapsed */}
        <div
          onClick={!mobileOpen && sidebarCollapsed ? toggleSidebar : undefined}
          className={`flex-shrink-0 w-9 h-9 rounded-xl bg-[var(--color-primary)] flex items-center justify-center select-none transition-opacity ${!mobileOpen && sidebarCollapsed ? 'cursor-pointer hover:opacity-80' : ''}`}
        >
          <span className="text-[10px] font-extrabold text-white tracking-tighter">CPS</span>
        </div>

        {/* Wordmark — removed from layout flow when collapsed so toggle button stays visible */}
        <div className={`
          overflow-hidden transition-all duration-200 whitespace-nowrap
          ${(mobileOpen || !sidebarCollapsed) ? 'max-w-[200px] opacity-100 flex-1 min-w-0' : 'max-w-0 opacity-0 flex-none w-0'}
        `}>
          <p className="text-sm font-bold text-white leading-tight">DLSU CPS</p>
          <p className="text-[11px] text-white/50 leading-tight mt-0.5">{roleLabel}</p>
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
      <div className="mx-4 h-px bg-white/[0.06] mb-3 flex-shrink-0" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-1 space-y-0.5">
        {menuItems.map((item, i) => item.divider
          ? <div key={i} className="mx-4 my-1.5 h-px bg-white/[0.06]" />
          : <NavItem key={i} item={item} index={i} />
        )}
      </nav>

      {/* Crisis line — students only, always one glance away */}
      {user?.role === 'STUDENT' && (mobileOpen || !sidebarCollapsed) && (
        <div className="mx-3 mb-3 rounded-xl p-3.5 flex-shrink-0" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}>
          <p className="text-xs font-semibold" style={{ color: '#FCA5A5' }}>Need help right now?</p>
          <p className="text-[11px] mt-1 leading-relaxed text-white/70">
            NCMH <a href="tel:1553" className="font-semibold underline underline-offset-2 text-white">1553</a> · open 24/7
          </p>
        </div>
      )}

      {/* Bottom section */}
      <div className="flex-shrink-0 pb-3">
        <div className="mx-4 h-px bg-white/[0.06] mb-3" />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={`
            flex items-center gap-3 w-full px-3 py-2.5 mx-2 rounded-xl
            text-white/40 hover:text-white/70 hover:bg-white/[0.07]
            transition-all duration-150
            ${mobileOpen ? 'w-[calc(100%-16px)]' : 'w-[calc(100%-16px)]'}
          `}
          style={{ width: 'calc(100% - 16px)' }}
        >
          <span className="flex-shrink-0 w-[18px] h-[18px] flex items-center justify-center">
            {theme === 'dark'
              ? <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              : <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </span>
          <span className={`
            text-sm font-medium whitespace-nowrap transition-opacity duration-150
            ${(mobileOpen || !sidebarCollapsed) ? 'opacity-100' : 'opacity-0'}
          `}>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </span>
        </button>

        {/* User card */}
        <div className="flex items-center gap-3 px-3 py-2.5 mx-2 mt-0.5 rounded-xl hover:bg-white/[0.05] transition-colors cursor-default">
          {/* Avatar */}
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white/10"
            style={{ background: roleColor }}
          >
            {initials || 'U'}
          </div>

          {/* Name + role */}
          <div className={`
            flex-1 min-w-0 overflow-hidden transition-opacity duration-150
            ${(mobileOpen || !sidebarCollapsed) ? 'opacity-100' : 'opacity-0'}
          `}>
            <p className="text-xs font-semibold text-white/90 truncate leading-tight">{fullName}</p>
            <p className="text-[11px] text-white/40 truncate leading-tight mt-0.5">{roleLabel}</p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={onLogout}
          className="flex items-center gap-3 mt-0.5 px-3 py-2.5 mx-2 rounded-xl transition-all duration-150"
          style={{ width: 'calc(100% - 16px)', color: 'rgba(255,255,255,0.3)' }}
          onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = '#F87171'; b.style.background = 'rgba(239,68,68,0.1)'; }}
          onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = 'rgba(255,255,255,0.3)'; b.style.background = 'transparent'; }}
        >
          <span className="flex-shrink-0 w-[18px] h-[18px] flex items-center justify-center">
            <Power size={14} />
          </span>
          <span className={`
            text-sm font-medium whitespace-nowrap transition-opacity duration-150
            ${(mobileOpen || !sidebarCollapsed) ? 'opacity-100' : 'opacity-0'}
          `}>
            Sign out
          </span>
        </button>
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
        transition-[width,transform] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]
        border-r border-white/[0.04]
        w-72
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-60'}
      `}
      style={{ background: 'var(--color-sidebar)' }}
      >
        <SidebarContent />
      </aside>

      {/* ── Main area ────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-h-screen transition-[margin] duration-200 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>

        {/* Top header */}
        <header
          className="sticky top-0 z-20 h-16 flex items-center gap-3 px-4 lg:px-8 border-b"
          style={{
            background: 'color-mix(in srgb, var(--color-surface) 92%, transparent)',
            borderColor: 'var(--color-border)',
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
            <p className="text-[0.9375rem] font-semibold leading-tight truncate" style={{ color: 'var(--color-text-primary)' }}>
              {title}
            </p>
            <p className="text-xs leading-tight mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
              {subtitle || todayLabel}
            </p>
          </div>

          {/* Page title — mobile (centered) */}
          <div className="lg:hidden flex-1 text-center">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto lg:ml-0">

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
        <main id="main-content" className="flex-1 px-4 py-6 lg:px-8 lg:py-8" tabIndex={-1}>
          <div className="max-w-[1200px] mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {user?.role === 'STUDENT' && <EmaFloatingChat />}
    </div>
  );
}
