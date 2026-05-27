'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, ChevronLeft, Bell, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { getMenuIcon } from '@/utils/dashboard-icons';
import { api } from '@/utils/api';

interface MenuItem {
  label: string;
  href?: string;
  id?: string;
  icon?: React.ReactNode;
  badge?: number;
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
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reminderCount, setReminderCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem('sidebarOpen');
    if (saved !== null) setDesktopCollapsed(!JSON.parse(saved));
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Fetch pending reminder count
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(api('/api/reminders'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const reminders = d.reminders || d || [];
        const pending = Array.isArray(reminders)
          ? reminders.filter((r: any) => !r.is_read && !r.acknowledged).length
          : 0;
        setReminderCount(pending);
      })
      .catch(() => {});
  }, [pathname]);

  const handleToggleDesktop = () => {
    const next = !desktopCollapsed;
    setDesktopCollapsed(next);
    localStorage.setItem('sidebarOpen', JSON.stringify(!next));
  };

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'U';

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 ${desktopCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!desktopCollapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">CPS</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-none">CPS System</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Counseling Services</p>
            </div>
          </div>
        )}
        {desktopCollapsed && (
          <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">C</span>
          </div>
        )}
        {/* Desktop collapse toggle */}
        <button
          onClick={handleToggleDesktop}
          className="hidden lg:flex p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {desktopCollapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
        </button>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {menuItems.map((item, index) => {
          const isActive = activeSection && item.id && activeSection === item.id;
          const icon = item.icon || (item.id ? getMenuIcon(item.id) : null);

          const content = (
            <div
              title={desktopCollapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
              } ${desktopCollapsed ? 'lg:justify-center' : ''}`}
            >
              {icon && (
                <span className={`flex-shrink-0 ${isActive ? 'text-green-600 dark:text-green-400' : ''}`}>
                  {icon}
                </span>
              )}
              <span className={`flex-1 truncate ${desktopCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className={`bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium ${desktopCollapsed ? 'lg:hidden' : ''}`}>
                  {item.badge}
                </span>
              )}
            </div>
          );

          if (item.id && onMenuClick) {
            return (
              <button key={index} onClick={() => { onMenuClick(item.id!); setMobileOpen(false); }} className="w-full text-left mb-0.5">
                {content}
              </button>
            );
          }
          return (
            <Link key={index} href={item.href || '#'} className="block mb-0.5">
              {content}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-3 space-y-1 flex-shrink-0">
        <div className={`flex items-center gap-3 px-2 py-2 rounded-lg ${desktopCollapsed ? 'lg:justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className={`flex-1 min-w-0 ${desktopCollapsed ? 'lg:hidden' : ''}`}>
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name || user?.email}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate capitalize">{user?.role?.replace(/_/g, ' ').toLowerCase()}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          title={desktopCollapsed ? 'Logout' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors ${desktopCollapsed ? 'lg:justify-center' : ''}`}
        >
          <LogOut size={16} className="flex-shrink-0" />
          <span className={desktopCollapsed ? 'lg:hidden' : ''}>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop: always visible, collapsible; mobile: overlay */}
      <aside className={`
        fixed left-0 top-0 h-screen z-30 flex flex-col
        bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
        transition-all duration-300 ease-in-out
        w-64
        lg:${desktopCollapsed ? 'w-[70px]' : 'w-64'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ml-0 ${desktopCollapsed ? 'lg:ml-[70px]' : 'lg:ml-64'}`}>

        {/* Header */}
        <header className="sticky top-0 z-20 h-16 flex items-center justify-between px-4 lg:px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-1 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white truncate">{title}</h1>
              {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* Notification bell */}
            <Link
              href="/reminders"
              className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Bell size={18} />
              {reminderCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900" />
              )}
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 bg-gray-50 dark:bg-gray-950">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
