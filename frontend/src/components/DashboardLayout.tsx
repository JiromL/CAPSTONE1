'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Power, Menu, Bell, X, ChevronRight, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
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

// Items that show a right chevron (have sub-sections)
const HAS_CHEVRON = new Set(['profile', 'services', 'cases', 'counseling-cases', 'admin']);

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
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [reminderCount, setReminderCount] = useState(0);
  const [lastLogin, setLastLogin]     = useState<string>('');
  const pathname = usePathname();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

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

    // Last login — store on each visit
    const stored = localStorage.getItem('last_login_display');
    if (stored) {
      setLastLogin(stored);
    }
    const now = new Date().toLocaleDateString('en-US', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
    localStorage.setItem('last_login_display', now);
  }, []);

  const fullName = (() => {
    if (!user) return '';
    const fn = user.first_name || '';
    const ln = user.last_name  || '';
    if (fn && ln) return `${fn} ${ln}`;
    return user.name || user.email || '';
  })();

  const idNumber = user?.id_number || user?.student_id || '';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-200 flex-shrink-0">
        <Image src="/dlsu-seal.svg" alt="DLSU" width={40} height={40} className="flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-blue-600 leading-tight">DLSU</p>
          <p className="text-[10px] text-gray-500 leading-tight">Counseling &amp; Psychology</p>
        </div>
        {/* Mobile close */}
        <button onClick={() => setMobileOpen(false)} aria-label="Close menu"
          className="lg:hidden ml-auto p-1 text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {menuItems.map((item, index) => {
          const isActive = activeSection && item.id && activeSection === item.id;
          const icon = item.icon || (item.id ? getMenuIcon(item.id) : null);
          const hasChevron = item.id ? HAS_CHEVRON.has(item.id) : false;

          const content = (
            <div className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
              isActive
                ? 'text-blue-600 font-semibold bg-blue-50 border-r-[3px] border-blue-600'
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
            }`}>
              {icon && (
                <span className={`flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                  {icon}
                </span>
              )}
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                  {item.badge}
                </span>
              )}
              {hasChevron && !item.badge && (
                <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
              )}
            </div>
          );

          if (item.id && onMenuClick) {
            return (
              <button key={index} onClick={() => { onMenuClick(item.id!); setMobileOpen(false); }} className="w-full text-left">
                {content}
              </button>
            );
          }
          return (
            <Link key={index} href={item.href || '#'} className="block">
              {content}
            </Link>
          );
        })}
      </nav>

      {/* Last login + logout */}
      <div className="border-t border-gray-200 px-5 py-4 flex-shrink-0">
        {lastLogin && (
          <p className="text-[11px] text-gray-400 mb-3">
            Last login: <span className="font-medium text-gray-500">{lastLogin}</span>
          </p>
        )}
        <button onClick={onLogout}
          className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors">
          <Power size={15} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex">

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-screen z-30 w-60
        bg-white border-r border-gray-200
        transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-60">

        {/* Top header */}
        <header className="sticky top-0 z-20 h-14 flex items-center justify-between px-5 bg-white border-b border-gray-200">
          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu"
            className="lg:hidden p-2 -ml-1 rounded text-gray-500 hover:bg-gray-100 transition-colors">
            <Menu size={20} />
          </button>

          {/* Page title */}
          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {subtitle && <p className="text-xs text-gray-400 leading-tight">{subtitle}</p>}
          </div>

          {/* Right: bells + user */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Notification bell */}
            <Link href="/reminders" title="Reminders"
              aria-label={reminderCount > 0 ? `Reminders (${reminderCount} unread)` : 'Reminders'}
              className="relative p-1 rounded text-gray-500 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600 transition-colors">
              <Bell size={20} />
              {reminderCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {reminderCount}
                </span>
              )}
            </Link>

            {/* Calendar */}
            <Link href="/appointments" title="Appointments" aria-label="Appointments"
              className="p-1 rounded text-gray-500 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600 transition-colors">
              <Calendar size={20} />
            </Link>

            {/* User info */}
            <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
              <div className="text-right leading-tight">
                <p className="text-sm font-semibold text-gray-900">{fullName}</p>
                {idNumber && <p className="text-xs text-gray-500">{idNumber}</p>}
                {!idNumber && (
                  <p className="text-xs text-gray-500">
                    {({
                      IC: 'Intake Counselor',
                      COUNSELOR: 'Counselor',
                      PSYCHOLOGIST: 'Psychologist',
                      CASE_MANAGER: 'Case Manager',
                      STAFF: 'Office Assistant',
                      ADMIN: 'Administrator',
                      DPO: 'Data Privacy Officer',
                      STUDENT: 'Student',
                    } as Record<string,string>)[user?.role] ?? user?.role}
                  </p>
                )}
              </div>
              <div aria-hidden="true" className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {fullName.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-5 lg:p-8">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
